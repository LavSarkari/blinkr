# 🏗️ Blinkr Architecture

Blinkr is a serverless, real-time communication platform designed for high scalability and low latency. This document outlines the core architectural components and technical decisions.

## 🚀 Overview

The system is built on a **Serverless-First** paradigm, moving away from persistent Node.js servers to a distributed architecture using Vercel (Frontend/Edge) and Supabase (Real-time Backend).

## 🧩 Components

### 1. Matchmaking Engine (The "Waiting Room")
Instead of an in-memory queue, Blinkr uses a Postgres-backed **Atomic Matching** system:
- **Table**: `waiting_room` (stores `socket_id`, `interests`, `chat_mode`).
- **Logic**: When a user clicks 'Start Chat', they look for an existing row that matches their criteria.
- **Atomicity**: We use a `claimed` status and `tabId` verification to ensure a room is never shared by more than two people.
- **Cleanup**: When a user disconnects, their `waiting_room` entry is automatically purged.

### 2. Real-time Signaling & Messaging
We use **Supabase Channels** for all real-time events:
- **Lobby Channel**: Tracking global user presence and online counts.
- **Personal Channels**: Notifying specific users when a match is found.
- **Room Channels**: Private broadcast layers created for every match.
- **Handshake Protocol**: A custom signaling handshake ensures WebRTC offers are only sent once both peers are actively listening.

### 3. P2P Video (WebRTC)
Video chat is established peer-to-peer using the **simple-peer** library:
- **Signaling**: Relayed via Supabase Broadcast.
- **STUN/TURN**: Utilizing Google's public STUN servers for reliable NAT traversal.
- **Fallbacks**: Automated graceful degradation to text-only mode if media access or signaling fails.

---

## 🔒 Security & Privacy

Privacy is the foundational tenet of Blinkr:
- **Zero Data Retention**: No chat history, no logs, and no user profiles.
- **Encryption**: All signaling and text communication happens over TLS-encrypted channels.
- **Anonymity**: No registration required. Temporary session IDs are generated client-side and discarded immediately.

---

## ⚡ Performance Optimization

- **PWA**: Using `vite-plugin-pwa` for offline caching and instant loading.
- **Edge Regions**: Leveraging Supabase's global availability for low-latency broadcasts.
- **Responsive Animations**: Framer Motion is used with GPU-accelerated transitions to maintain 60fps even on low-end mobile devices.

---

*Blinkr — The Future of Anonymous Real-time Chat.* 🥂🥂🥂
