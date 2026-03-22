import { io } from "socket.io-client";

// In production, we connect to the same host. 
// Added transports for maximum compatibility (some hosts block pure websockets).
const socket = io(window.location.origin, {
  transports: ["polling", "websocket"],
  secure: window.location.protocol === 'https:',
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
