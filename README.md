<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.svg" alt="Blinkr Logo" width="80" height="80">
  <h1 align="center">Blinkr</h1>
  <p align="center">
    <strong>The Premium, Serverless Real-Time Chat Platform</strong>
    <br />
    Connect. Chat. Repeat. Instantly.
    <br />
    <a href="https://blinkr.lavbytes.in"><strong>Live Demo »</strong></a>
  </p>

  <p align="center">
    <a href="https://blinkr.lavbytes.in"><img src="https://img.shields.io/badge/Status-Live-00E676?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Status"></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Styling-Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind"></a>
  </p>
</div>

---

**Blinkr** is a high-performance, anonymous real-time matching platform designed to replace legacy systems like Omegle. Built entirely on a **Serverless Architecture**, it leverages **Supabase Realtime** for blazing-fast atomic matchmaking and WebRTC for zero-latency peer-to-peer video streams.

Wrapped in a stunning, deep-AMOLED glassmorphic interface, Blinkr delivers a truly premium user experience.

> [!NOTE]  
> 🌐 **Try it now**: [blinkr.lavbytes.in](https://blinkr.lavbytes.in)

---

## 💎 Premium Feature Set

| Feature | Description |
| :--- | :--- |
| 🎭 **True Anonymity** | No accounts, logins, or tracking. Peer-to-peer connections mean zero data retention. |
| 📹 **Cinema Video Chat** | High-definition, low-latency face-to-face conversations powered by raw WebRTC. |
| 💬 **Kinetic Text Chat** | Fluid, spring-animated messaging bubbles with live typing indicators and read receipts. |
| 🎯 **Smart Interests** | Precise matchmaking filtering. Only connect with people who share your specific passions. |
| 🛡️ **Anti-Spam Engine** | Built-in request rate-limiting, strict garbage collection boundaries, and ghost-sweeping. |
| 📱 **Native Mobile Feel** | Engineered with `100dvh` precision. The input bar will *never* break on iOS/Android keyboards. |
| 🎨 **AMOLED Aesthetics** | Deep contrast layers, dynamic glassmorphism, and Apple-grade `.spring()` physics animations. |

---

## 🏗️ Technical Architecture (100% Serverless)

Blinkr discards the traditional Node.js/Socket.io backend, opting instead for an entirely Edge-compatible serverless architecture.

### 1. Atomic Matchmaking Matrix
Instead of an expensive persistent server, Blinkr uses a **Supabase Waiting Room**. The matching logic is strictly atomic:
- Users query the queue and attempt to "Claim" a dormant row using Postgres transaction constraints.
- This entirely eliminates race conditions and ensures lightning-fast, unique pairings.

### 2. The Broadcast Handshake
WebRTC signaling (SDP Offers, Answers, ICE Candidates) is relayed via **Supabase Realtime Channels**. We implemented a custom **Binary Handshake Protocol**:
- Peers only initiate the WebRTC `offer` once both clients have successfully subscribed to the private channel.

### 3. Ghost Cleanup & Rate Limiting
Client-side debounce systems (1s for matching, 250ms for messages) protect the database from abuse, while a 3-minute Garbage Collector routine automatically sweeps the database of any browser crashes or ghosted users.

---

## 🛠️ The Tech Stack

- **Core**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS v4 + `clsx` (for dynamic class merging)
- **Animations**: Framer Motion
- **Database & Realtime**: Supabase (Postgres & Channels)
- **Networking**: `simple-peer` (WebRTC P2P Streams)
- **Icons**: Lucide React
- **Deployment**: Vercel

---

## 🚀 Getting Started

Deploy your own anonymous chat network in literally 60 seconds.

### 1. Clone & Install
```bash
git clone https://github.com/LavSarkari/blinkr.git
cd blinkr
npm install
```

### 2. Configure Supabase
Create a `.env` file in the root directory. You will need a completely free Supabase project to obtain these keys.
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

> **Database Setup**: Run the `supabase_setup.sql` file in your Supabase SQL Editor to rapidly generate the required `waiting_room` tables governing the matchmaking.

### 3. Run Locally
```bash
npm run dev
```

---

<div align="center">
  <i>Built with ❤️ for a lightning fast web.</i>
</div>
