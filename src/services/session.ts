import { nanoid } from "nanoid";
import type { Session } from "../types";

const COLORS = [
  "#5865F2", // Discord Blue
  "#3BA55D", // Discord Green
  "#FAA81A", // Discord Yellow
  "#ED4245", // Discord Red
  "#EB459E", // Pink
  "#9B59B6", // Purple
];

const ADJECTIVES = ["Silent", "Swift", "Bright", "Dark", "Neon", "Cyber", "Ghost", "Echo"];
const NOUNS = ["Signal", "Pulse", "Wave", "Node", "Link", "Core", "Void", "Spark"];

export function getSession(): Session {
  const stored = localStorage.getItem("signal_session");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // Ignore
    }
  }

  const session: Session = {
    id: nanoid(),
    name: `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    avatarSeed: nanoid(),
  };

  localStorage.setItem("signal_session", JSON.stringify(session));
  return session;
}
