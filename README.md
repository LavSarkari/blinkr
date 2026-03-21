# Blinkr

**Talk to someone. Instantly.**

Blinkr is an anonymous, real-time chat platform with text and video chat. No profiles, no history — just pure conversation with people around the world.

![Blinkr](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-private-gray)

---

## Features

- 🔒 **Zero data retention** — messages are never stored
- 🎭 **Fully anonymous** — no accounts, no tracking
- 💬 **Text Chat** — instant text conversations with strangers
- 📹 **Video Chat** — face-to-face via WebRTC
- 🔍 **Interest matching** — find people who share your interests
- 🕵️ **Spy Mode** — watch two strangers discuss a question you ask
- ⚡ **Instant matching** — swipe-style UX with preloaded sessions
- 📱 **PWA** — installable on mobile devices
- 🌙 **AMOLED dark theme** — premium black UI with blue accents

---

## Tech Stack

| Layer       | Technology                              |
| ----------- | --------------------------------------- |
| Frontend    | React 19, TypeScript, Tailwind CSS v4   |
| Animations  | Framer Motion                           |
| Real-time   | Socket.IO                               |
| Video       | WebRTC (simple-peer)                    |
| Server      | Express, Node.js                        |
| Build       | Vite 6                                  |
| PWA         | vite-plugin-pwa                         |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000) with HMR.

### Production Build

```bash
npm run build
```

### Production Start

```bash
# Linux / macOS
npm start

# Windows
npm run start:win
```

---

## Project Structure

```
blinkr/
├── index.html          # Entry HTML with SEO meta tags
├── server.ts           # Express + Socket.IO server
├── vite.config.ts      # Vite build configuration
├── public/
│   ├── favicon.svg     # App icon
│   ├── manifest.json   # PWA manifest
│   ├── robots.txt      # Search engine directives
│   └── sitemap.xml     # Sitemap
└── src/
    ├── main.tsx        # React entry point
    ├── App.tsx         # Main application component
    ├── index.css       # Global styles & animations
    ├── polyfills.ts    # Browser polyfills
    ├── types.ts        # TypeScript type definitions
    └── services/
        ├── session.ts  # Session management
        └── socket.ts   # Socket.IO client
```

---

## Environment Variables

| Variable   | Default | Description               |
| ---------- | ------- | ------------------------- |
| `PORT`     | `3000`  | Server port               |
| `NODE_ENV` | —       | Set to `production` for prod |

---

## Security

- End-to-end encrypted transit (TLS/WSS)
- Zero data retention — no messages stored
- Security headers (HSTS, X-Frame-Options, CSP)
- Rate limiting (30 events/min per IP)
- Input validation and sanitization
- No third-party tracking or analytics

---

## License

Private. All rights reserved.
