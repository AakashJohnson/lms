import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs/promises";
import path from "path";

export default defineConfig({
  // ✅ Ensures widget runs correctly under https://chatbot.aicte-india.org/chatbot/
  base: "/chatbot/",

  plugins: [
    react(),

    // ✅ Auto-generate dist/index.html for your chatbot iframe
    {
      name: "generate-index-for-widget",
      apply: "build",
      async writeBundle(_, bundle) {
        const outDir = "dist";
        const files = Object.values(bundle);
        const jsFile = files.find((f: any) => f.fileName.endsWith(".js"))?.fileName;
        const cssFile = files.find((f: any) => f.fileName.endsWith(".css"))?.fileName;

        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Chatbot Widget</title>
    ${cssFile ? `<link rel="stylesheet" href="./${cssFile}">` : ""}
  </head>
  <body>
    <div id="chatbot-root"></div>
    <script src="./${jsFile}"></script>
  </body>
</html>`;

        await fs.writeFile(path.join(outDir, "index.html"), html);
        // console.log("✅ Auto-generated index.html for widget");
      },
    },
  ],

  define: {
    "process.env": {},
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "src/widget.tsx",
      name: "ChatbotWidget",
      fileName: () => "chatbot-widget.js",
      formats: ["iife"],
    },
  },

  server: {
    host: true,
    port: 5174,

    // ✅ Only your trusted domains — removed ngrok
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "chatbot.aicte-india.org",
      "coupon-hub-chi.vercel.app",
    ],

    // ✅ Hot reload works even when testing via local dev
    hmr: {
      protocol: "ws",
      host: "chatbot.aicte-india.org",
      port: 5174,
    },
  },
});
