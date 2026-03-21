import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import type { Session } from "./src/types";

const PORT = parseInt(process.env.PORT || "3000", 10);
const isProd = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();

  // Security headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (isProd) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
  });

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: isProd ? false : "*",
    },
    pingTimeout: 20000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max message size
  });

  // -- Rate limiting --
  const connectionAttempts = new Map<string, { count: number; lastReset: number }>();

  const checkRateLimit = (ip: string): boolean => {
    const now = Date.now();
    const entry = connectionAttempts.get(ip);
    if (!entry || now - entry.lastReset > 60000) {
      connectionAttempts.set(ip, { count: 1, lastReset: now });
      return true;
    }
    entry.count++;
    return entry.count <= 30; // Max 30 events per minute per IP
  };

  // Clean up rate limit entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of connectionAttempts.entries()) {
      if (now - entry.lastReset > 300000) {
        connectionAttempts.delete(ip);
      }
    }
  }, 300000);

  // Ephemeral storage
  const waitingQueue: { socketId: string; interests: string[]; chatMode: 'text' | 'video'; question?: string }[] = []; 
  const activeMatches = new Map<string, string>(); // socketId -> partnerSocketId
  const userSessions = new Map<string, { session: any; blockedIds: Set<string> }>(); // socketId -> sessionData

  const broadcastOnlineCount = () => {
    io.emit("online_count", io.engine.clientsCount);
  };

  // Clean up stale queue entries every 30 seconds
  setInterval(() => {
    for (let i = waitingQueue.length - 1; i >= 0; i--) {
      const entry = waitingQueue[i];
      const socket = io.sockets.sockets.get(entry.socketId);
      if (!socket || !socket.connected) {
        waitingQueue.splice(i, 1);
      }
    }
  }, 30000);

  io.on("connection", (socket) => {
    const clientIp = socket.handshake.headers["x-forwarded-for"] as string || socket.handshake.address;
    
    if (!checkRateLimit(clientIp)) {
      socket.emit("error", { message: "Rate limit exceeded. Please try again later." });
      socket.disconnect(true);
      return;
    }

    if (!isProd) {
      console.log("User connected:", socket.id);
    }
    broadcastOnlineCount();

    socket.on("find_match", (data: { session: any; interests: string[]; chatMode: 'text' | 'video'; question?: string }) => {
      if (!checkRateLimit(clientIp)) return;
      
      const { session: sessionData, interests = [], chatMode = 'text', question } = data;

      // Validate input
      if (interests.length > 5) return;
      if (question && question.length > 500) return;
      
      if (!userSessions.has(socket.id)) {
        userSessions.set(socket.id, { session: sessionData, blockedIds: new Set() });
      } else {
        const existing = userSessions.get(socket.id)!;
        existing.session = sessionData;
      }

      const myData = userSessions.get(socket.id)!;
      
      // Remove from queue if already there
      const existingIndex = waitingQueue.findIndex(q => q.socketId === socket.id);
      if (existingIndex > -1) {
        waitingQueue.splice(existingIndex, 1);
      }

      // Try to find a match with common interests first
      if (interests.length > 0 && !question) {
        for (let i = 0; i < waitingQueue.length; i++) {
          const potentialPartner = waitingQueue[i];
          
          if (potentialPartner.chatMode !== chatMode || potentialPartner.question) continue;

          const partnerData = userSessions.get(potentialPartner.socketId);
          if (partnerData) {
            if (myData.blockedIds.has(partnerData.session.id) || partnerData.blockedIds.has(myData.session.id)) {
              continue;
            }
          }

          const commonInterests = potentialPartner.interests.filter(interest => 
            interests.includes(interest)
          );

          if (commonInterests.length > 0) {
            const partnerSocketId = potentialPartner.socketId;
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);

            if (partnerSocket && partnerSocket.connected) {
              waitingQueue.splice(i, 1);
              const roomId = `room_${nanoid()}`;
              socket.join(roomId);
              partnerSocket.join(roomId);

              activeMatches.set(socket.id, partnerSocketId);
              activeMatches.set(partnerSocketId, socket.id);

              io.to(roomId).emit("match_found", { 
                roomId, 
                commonInterests,
                users: [
                  { id: socket.id, session: myData.session },
                  { id: partnerSocketId, session: partnerData?.session }
                ] 
              });
              return;
            }
          }
        }
      }

      // Question Mode Matching
      if (question) {
        for (let i = 0; i < waitingQueue.length; i++) {
          const potentialPartner = waitingQueue[i];
          if (potentialPartner.chatMode === chatMode && potentialPartner.question) {
            const partnerSocketId = potentialPartner.socketId;
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            const partnerData = userSessions.get(partnerSocketId);

            if (partnerSocket && partnerSocket.connected) {
              waitingQueue.splice(i, 1);
              const roomId = `room_${nanoid()}`;
              socket.join(roomId);
              partnerSocket.join(roomId);

              activeMatches.set(socket.id, partnerSocketId);
              activeMatches.set(partnerSocketId, socket.id);

              const finalQuestion = potentialPartner.question || question;

              io.to(roomId).emit("match_found", { 
                roomId, 
                question: finalQuestion,
                users: [
                  { id: socket.id, session: myData.session },
                  { id: partnerSocketId, session: partnerData?.session }
                ] 
              });
              return;
            }
          }
        }
      }

      // Standard Match
      for (let i = 0; i < waitingQueue.length; i++) {
        const potentialPartner = waitingQueue[i];
        if (potentialPartner.chatMode === chatMode && !potentialPartner.question && !question) {
          const partnerSocketId = potentialPartner.socketId;
          const partnerSocket = io.sockets.sockets.get(partnerSocketId);
          const partnerData = userSessions.get(partnerSocketId);

          if (partnerData) {
            if (myData.blockedIds.has(partnerData.session.id) || partnerData.blockedIds.has(myData.session.id)) {
              continue;
            }
          }

          if (partnerSocket && partnerSocket.connected) {
            waitingQueue.splice(i, 1);
            const roomId = `room_${nanoid()}`;
            socket.join(roomId);
            partnerSocket.join(roomId);

            activeMatches.set(socket.id, partnerSocketId);
            activeMatches.set(partnerSocketId, socket.id);

            io.to(roomId).emit("match_found", { 
              roomId, 
              users: [
                { id: socket.id, session: myData.session },
                { id: partnerSocketId, session: partnerData?.session }
              ] 
            });
            return;
          }
        }
      }
      
      waitingQueue.push({ socketId: socket.id, interests, chatMode, question });
    });

    socket.on("report_user", (data: { roomId: string }) => {
      const partnerId = activeMatches.get(socket.id);
      if (partnerId) {
        const myData = userSessions.get(socket.id);
        const partnerData = userSessions.get(partnerId);
        if (myData && partnerData) {
          myData.blockedIds.add(partnerData.session.id);
        }
      }
    });

    socket.on("cancel_search", () => {
      const qIndex = waitingQueue.findIndex(q => q.socketId === socket.id);
      if (qIndex > -1) waitingQueue.splice(qIndex, 1);
    });

    socket.on("send_match_msg", (data: { roomId: string; content: string; senderId: string }) => {
      // Validate message content
      if (!data.content || data.content.length > 2000) return;
      if (!data.roomId || !data.senderId) return;
      
      io.to(data.roomId).emit("match_msg", {
        ...data,
        id: nanoid(),
        createdAt: Date.now()
      });
    });

    socket.on("typing", (data: { roomId: string; isTyping: boolean }) => {
      socket.to(data.roomId).emit("partner_typing", { isTyping: data.isTyping });
    });

    // WebRTC Signaling
    socket.on("webrtc_signal", (data: { roomId: string; signal: any }) => {
      socket.to(data.roomId).emit("webrtc_signal", { signal: data.signal });
    });

    socket.on("leave_match", (roomId: string) => {
      const partnerId = activeMatches.get(socket.id);
      if (partnerId) {
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.leave(roomId);
          partnerSocket.emit("partner_left");
        }
        activeMatches.delete(socket.id);
        activeMatches.delete(partnerId);
      }
      socket.leave(roomId);
    });

    socket.on("disconnect", () => {
      // Remove from queue
      const qIndex = waitingQueue.findIndex(q => q.socketId === socket.id);
      if (qIndex > -1) waitingQueue.splice(qIndex, 1);

      // Notify partner if in match
      const partnerId = activeMatches.get(socket.id);
      if (partnerId) {
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.emit("partner_left");
        }
        activeMatches.delete(socket.id);
        activeMatches.delete(partnerId);
      }
      
      userSessions.delete(socket.id);
      broadcastOnlineCount();
    });
  });

  // Vite middleware for development
  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server: httpServer }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.includes('.') && !req.originalUrl.endsWith('.html')) {
        return next();
      }
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.hot.send({ type: 'error', err: e as any });
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static assets with long cache
    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
      immutable: true,
      index: false,
    }));
    
    // SPA fallback
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Blinkr ${isProd ? '(production)' : '(development)'} running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
