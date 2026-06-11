// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.tsx'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )
// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import App from "./App";
import "./index.css";

let reactRoot: Root | null = null;
let currentContainer: HTMLElement | null = null;

/**
 * Mount the chatbot into the page.
 * - targetId: id of the container element to mount into (defaults to 'chatbot-root').
 */
export function mountChatbot(targetId = "chatbot-root") {
  if (reactRoot) {
    // already mounted
    return;
  }

  let container = document.getElementById(targetId) as HTMLElement | null;
  if (!container) {
    container = document.createElement("div");
    container.id = targetId;
    // ensure the container floats above host content with inline styles
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    container.style.pointerEvents = "auto";
    document.body.appendChild(container);
  }

  currentContainer = container;
  reactRoot = createRoot(container);
  reactRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

/**
 * Unmount the chatbot and remove injected container.
 */
export function unmountChatbot() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (currentContainer && currentContainer.parentElement) {
    currentContainer.parentElement.removeChild(currentContainer);
    currentContainer = null;
  }
}

// Dev convenience: auto-mount into #root when running dev server
// so `npm run dev` behaves like before (no extra manual mounting required)
if (import.meta.env.DEV) {
  // if there's a #root in dev index.html, mount there (keeps previous dev behavior)
  const devRoot = document.getElementById("root");
  if (devRoot) {
    mountChatbot("root");
  } else {
    // otherwise mount to default float container
    mountChatbot("chatbot-root");
  }
}
