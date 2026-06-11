// src/widget.tsx
import { mountChatbot, unmountChatbot } from "./main";

/* Expose functions for host page to call */
declare global {
  interface Window {
    mountChatbot?: (targetId?: string) => void;
    unmountChatbot?: () => void;
  }
}

window.mountChatbot = mountChatbot;
window.unmountChatbot = unmountChatbot;

/* Auto-mount when script is loaded (DOMContentLoaded or already ready) */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    mountChatbot("chatbot-root");
  });
} else {
  mountChatbot("chatbot-root");
}
