# ⚡ Blinkr | The Premium Omegle Alternative

**Connect. Chat. Repeat. Instantly.**

Blinkr is a high-performance, anonymous, real-time chat platform built for the modern web. It features seamless text and video chat, interest-based matching, and a privacy-first architecture — all wrapped in a stunning, AMOLED-ready interface.

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://blinkr.lavbytes.in)
[![Supabase Backend](https://img.shields.io/badge/Backend-Supabase-emerald?logo=supabase)](https://supabase.com)
[![Vite 6](https://img.shields.io/badge/Build-Vite%206-646CFF?logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 💎 Premium Features

- 🎭 **Absolute Anonymity** — No accounts, no profiles, no tracking. Just talk.
- 📹 **Cinema Video Chat** — High-quality, low-latency face-to-face via WebRTC.
- 💬 **Dynamic Text Chat** — Fluid, animated messaging with typing indicators.
- 🎯 **Interest Matching** — Precise matchmaking based on shared topics.
- 🕵️ **Spy Mode** — Ask a question and watch two strangers discuss it live.
- 🔒 **Zero Data Retention** — Messages exist only in transit. We store nothing.
- 📱 **PWA Support** — Install Blinkr on your device for a native mobile experience.
- 🎨 **Premium UI** — Deep AMOLED blacks, vibrant gradients, and fluid micro-animations.

---

## 🏗️ Technical Architecture (Serverless Realtime)

Blinkr is uniquely architected to run **entirely serverless** on Vercel, utilizing **Supabase** as the real-time backbone.

### 1. Atomic Matchmaking
Instead of a persistent Node.js server, Blinkr uses a **Supabase Waiting Room** table. The matching logic is atomic:
- Users "Claim" matches using Postgres transactions and Presence tracking.
- This prevents race conditions and ensures unique, high-speed pairings.

### 2. High-Speed Signaling
WebRTC signaling is relayed via **Supabase Broadcast Channels**. We implemented a custom **Signaling Handshake** protocol to ensure reliable p2p connections even in high-latency environments.

### 3. Presence & Analytics
Global online counts and user availability are tracked using **Supabase Presence**, providing a live, vibrant feel to the "Scanning Network" experience.

---

## 🧠 Key Learnings & Engineering Challenges

### 🚀 From Socket.io to Supabase
Migrating from a stateful Node.js server to a serverless architecture required reimagining the "Matching" problem. We learned that **Postgres-backed Presence** can be just as fast as in-memory WebSockets while being significantly easier to scale.

### 🤝 The Signaling Handshake
One of the biggest challenges was ensuring the WebRTC initiator signal reached the recipient before they joined the channel. We solved this by implementing a **Binary Handshake**:
- Peers only initiate the WebRTC `offer` once both have verified "Ready" status in the channel.

### 📊 Atomic Table Claims
Designing a matchmaking system that doesn't duplicate pairs in a high-concurrency environment. We utilized Supabase's `.select().limit(1).eq('claimed', false)` pattern with `tabId` verification to ensure atomic "ownership" of a room.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Real-time**: [Supabase Realtime](https://supabase.com/realtime)
- **Networking**: [simple-peer](https://github.com/feross/simple-peer) (WebRTC)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/LavSarkari/blinkr.git
cd blinkr
npm install
```

### 2. Configure Environment
Create a `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run Locally
```bash
npm run dev
```

---

## 🤝 Contributing & Support

Blinkr is an open-source project. We welcome contributions, feature requests, and bug reports! 

If you like the project, give it a ⭐️ and share it with the world!

---

*Built with ❤️ by [LavBytes](https://lavbytes.in)*
