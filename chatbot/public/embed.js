// // // (function () {
// // //   const CHATBOT_URL = "https://chatbot.aicte-india.org/chatbot/";
// // //   const CHATBOT_ORIGIN = "https://chatbot.aicte-india.org";
// // //   const IFRAME_ID = "aicte-chatbot";
// // //   const DEFAULT_DOC_ID = "chatbot.aicte-india.org"; // fallback

// // //   // 🚫 Avoid multiple embeddings
// // //   if (document.getElementById(IFRAME_ID)) return;

// // //   // 🪟 Create iframe dynamically
// // //   const iframe = document.createElement("iframe");
// // //   iframe.src = CHATBOT_URL;
// // //   iframe.id = IFRAME_ID;
// // //   iframe.allow = "microphone; clipboard-read; clipboard-write; camera";
// // //   Object.assign(iframe.style, {
// // //     position: "fixed",
// // //     bottom: "20px",
// // //     right: "20px",
// // //     width: "500px",
// // //     height: "700px",
// // //     border: "none",
// // //     borderRadius: "16px",
// // //     zIndex: "9999",
// // //     transition: "all 0.3s ease",
// // //     pointerEvents: "auto",
// // //   });

// // //   document.body.appendChild(iframe);

// // //   // ✅ functions to hide/show without blocking page clicks
// // //   function minimizeChatbot() {
// // //     iframe.style.width = "60px";
// // //     iframe.style.height = "60px";
// // //     iframe.style.pointerEvents = "none"; // ✅ allow clicking website
// // //   }

// // //   function openChatbot() {
// // //     iframe.style.width = "500px";
// // //     iframe.style.height = "700px";
// // //     iframe.style.pointerEvents = "auto"; // ✅ block website when open
// // //   }

// // //   // 🕒 Listen for messages from chatbot
// // //   window.addEventListener("message", function (event) {
// // //     if (!event.origin.includes("aicte-india.org")) return;

// // //     const data = event.data || {};

// // //     if (data.type === "CHATBOT_READY") {
// // //       try {
// // //         const parentUrl = window.location.href;
// // //         const host = window.location.hostname;

// // //         const docId = host && host.length > 0 ? host : DEFAULT_DOC_ID;

// // //         iframe.contentWindow.postMessage(
// // //           {
// // //             type: "INIT_PARENT_INFO",
// // //             parentUrl,
// // //             docId,
// // //           },
// // //           CHATBOT_ORIGIN
// // //         );

// // //         console.log("📤 Sent INIT_PARENT_INFO to chatbot:", docId);
// // //       } catch (error) {
// // //         console.error("❌ Failed to initialize chatbot doc_id:", error);

// // //         iframe.contentWindow.postMessage(
// // //           {
// // //             type: "INIT_PARENT_INFO",
// // //             parentUrl: CHATBOT_URL,
// // //             docId: DEFAULT_DOC_ID,
// // //           },
// // //           CHATBOT_ORIGIN
// // //         );

// // //         console.log("📤 Sent fallback INIT_PARENT_INFO with doc_id:", DEFAULT_DOC_ID);
// // //       }
// // //     }

// // //     // ✅ Minimize on close event
// // //     if (data.type === "CHATBOT_CLOSE") {
// // //       minimizeChatbot();
// // //     }

// // //     // ✅ Expand on open event (bubble click)
// // //     if (data.type === "CHATBOT_OPEN") {
// // //       openChatbot();
// // //     }

// // //     // Optional debugging ACK
// // //     if (data.type === "DOC_ID_ACK") {
// // //       console.log("✅ Chatbot acknowledged doc_id:", data.docId);
// // //     }
// // //   });
// // // })();


// // (function () {
// //   const CHATBOT_URL = "https://chatbot.aicte-india.org/chatbot/";
// //   const CHATBOT_ORIGIN = "https://chatbot.aicte-india.org";
// //   const IFRAME_ID = "aicte-chatbot";
// //   const DEFAULT_DOC_ID = "chatbot.aicte-india.org"; // fallback

// //   // 🚫 Prevent multiple instances
// //   if (document.getElementById(IFRAME_ID)) return;

// //   // 🪟 Create iframe dynamically
// //   const iframe = document.createElement("iframe");
// //   iframe.src = CHATBOT_URL;
// //   iframe.id = IFRAME_ID;
// //   iframe.allow = "microphone; clipboard-read; clipboard-write; camera";
// //   Object.assign(iframe.style, {
// //     position: "fixed",
// //     bottom: "20px",
// //     right: "20px",
// //     width: "500px",
// //     height: "700px",
// //     border: "none",
// //     borderRadius: "16px",
// //     zIndex: "9999",
// //     transition: "all 0.3s ease",
// //     pointerEvents: "auto",
// //   });

// //   document.body.appendChild(iframe);

// //   // ----------------------------------------------------
// //   // 🌐 Minimize / Open Controls
// //   // ----------------------------------------------------
// //   function minimizeChatbot() {
// //     iframe.style.width = "60px";
// //     iframe.style.height = "60px";
// //     iframe.style.pointerEvents = "none";
// //   }

// //   function openChatbot() {
// //     iframe.style.width = "500px";
// //     iframe.style.height = "700px";
// //     iframe.style.pointerEvents = "auto";
// //   }

// //   // ----------------------------------------------------
// //   // 📩 Listen for chatbot messages
// //   // ----------------------------------------------------
// //   window.addEventListener("message", function (event) {
// //     const data = event.data || {};

// //     if (data.type === "CHATBOT_READY") {
// //       try {
// //         const parentUrl = window.location.href;
// //         const host = window.location.hostname;
// //         const docId = host && host.length > 0 ? host : DEFAULT_DOC_ID;

// //         // 💾 Save parent info to localStorage
// //         localStorage.setItem("parentDomain", docId);
// //         localStorage.setItem("parentUrl", parentUrl);

// //         // 📤 Send INIT_PARENT_INFO to chatbot iframe
// //         iframe.contentWindow.postMessage(
// //           {
// //             type: "INIT_PARENT_INFO",
// //             parentUrl,
// //             docId,
// //           },
// //           CHATBOT_ORIGIN
// //         );

// //         console.log("📤 Sent INIT_PARENT_INFO to chatbot:", docId);
// //       } catch (error) {
// //         console.error("❌ Failed to initialize chatbot doc_id:", error);

// //         iframe.contentWindow.postMessage(
// //           {
// //             type: "INIT_PARENT_INFO",
// //             parentUrl: CHATBOT_URL,
// //             docId: DEFAULT_DOC_ID,
// //           },
// //           CHATBOT_ORIGIN
// //         );
// //       }
// //     }

// //     // 🔄 Minimize / Open Chatbot
// //     if (data.type === "CHATBOT_CLOSE") {
// //       minimizeChatbot();
// //     }

// //     if (data.type === "CHATBOT_OPEN") {
// //       openChatbot();
// //     }

// //     // 🛠 Debug Acknowledgement
// //     if (data.type === "DOC_ID_ACK") {
// //       console.log("✅ Chatbot acknowledged doc_id:", data.docId);
// //     }
// //   });
// // })();



// (function () {
//   const CHATBOT_URL = "https://chatbot.aicte-india.org/chatbot/";
//   const CHATBOT_ORIGIN = "https://chatbot.aicte-india.org";
//   const IFRAME_ID = "aicte-chatbot";
//   const DEFAULT_DOC_ID = "chatbot.aicte-india.org"; // fallback

//   // 🚫 Avoid multiple embeddings
//   if (document.getElementById(IFRAME_ID)) return;

//   // 🪟 Create iframe dynamically
//   const iframe = document.createElement("iframe");
//   iframe.src = CHATBOT_URL;
//   iframe.id = IFRAME_ID;
//   iframe.allow = "microphone; clipboard-read; clipboard-write; camera";
//   Object.assign(iframe.style, {
//     position: "fixed",
//     bottom: "20px",
//     right: "20px",
//     width: "500px",
//     height: "700px",
//     border: "none",
//     borderRadius: "16px",
//     zIndex: "9999",
//     transition: "all 0.3s ease",
//     pointerEvents: "auto",
//   });

//   document.body.appendChild(iframe);

//   // ✅ functions to hide/show without blocking page clicks
//   function minimizeChatbot() {
//     iframe.style.width = "60px";
//     iframe.style.height = "60px";
//     iframe.style.pointerEvents = "none"; // ✅ allow clicking website
//   }

//   function openChatbot() {
//     iframe.style.width = "500px";
//     iframe.style.height = "700px";
//     iframe.style.pointerEvents = "auto"; // ✅ block website when open
//   }

//   // 🕒 Listen for messages from chatbot
//   window.addEventListener("message", function (event) {
//     if (!event.origin.includes("aicte-india.org")) return;

//     const data = event.data || {};

//     if (data.type === "CHATBOT_READY") {
//       try {
//         const parentUrl = window.location.href;
//         const host = window.location.hostname;

//         const docId = host && host.length > 0 ? host : DEFAULT_DOC_ID;

//         iframe.contentWindow.postMessage(
//           {
//             type: "INIT_PARENT_INFO",
//             parentUrl,
//             docId,
//           },
//           CHATBOT_ORIGIN
//         );

//         console.log("📤 Sent INIT_PARENT_INFO to chatbot:", docId);
//       } catch (error) {
//         console.error("❌ Failed to initialize chatbot doc_id:", error);

//         iframe.contentWindow.postMessage(
//           {
//             type: "INIT_PARENT_INFO",
//             parentUrl: CHATBOT_URL,
//             docId: DEFAULT_DOC_ID,
//           },
//           CHATBOT_ORIGIN
//         );

//         console.log(
//           "📤 Sent fallback INIT_PARENT_INFO with doc_id:",
//           DEFAULT_DOC_ID
//         );
//       }
//     }

//     // ✅ Minimize on close event
//     if (data.type === "CHATBOT_CLOSE") {
//       minimizeChatbot();
//     }

//     // ✅ Expand on open event (bubble click)
//     if (data.type === "CHATBOT_OPEN") {
//       openChatbot();
//     }

//     // Optional debugging ACK
//     if (data.type === "DOC_ID_ACK") {
//       console.log("✅ Chatbot acknowledged doc_id:", data.docId);
//     }
//     // 🆕 NEW BLOCK — Resend INIT_PARENT_INFO when chatbot requests it
//     if (data.type === "REQUEST_PARENT_INFO") {
//       const parentUrl = window.location.href;
//       const host = window.location.hostname;

//       const docId = host && host.length > 0 ? host : DEFAULT_DOC_ID;

//       iframe.contentWindow.postMessage(
//         {
//           type: "INIT_PARENT_INFO",
//           parentUrl,
//           docId,
//         },
//         CHATBOT_ORIGIN
//       );

//       console.log("📤 Resent INIT_PARENT_INFO to chatbot:", docId);
//     }
//   });
// })();

(function () {
  const CHATBOT_URL = "https://chatbot.aicte-india.org/chatbot/";
  const CHATBOT_ORIGIN = "https://chatbot.aicte-india.org";
  const IFRAME_ID = "aicte-chatbot";

  const currentScript = document.currentScript;
  const jwtToken = currentScript
    ? new URL(currentScript.src).searchParams.get("token")
    : null;

  if (!jwtToken) {
    console.error("❌ [EMBED] Missing JWT token in embed.js URL");
    return;
  }

  if (document.getElementById(IFRAME_ID)) return;

  // ✅ Inject critical CSS to ensure proper pointer-events behavior
  const style = document.createElement("style");
  style.textContent = `
    #${IFRAME_ID} {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 150px !important;
      height: 120px !important;
      border: none !important;
      border-radius: 50% !important;
      z-index: 9999 !important;
      transition: all 0.3s ease !important;
      pointer-events: auto !important;
      box-shadow: none !important;
      overflow: visible !important;
      background: transparent !important;
      outline: none !important;
    }
    
    #${IFRAME_ID}.chatbot-open {
      width: 440px !important;
      height: 680px !important;
      bottom: 80px !important;
      border-radius: 12px !important;
      box-shadow: none !important;
      overflow: hidden !important;
      background: transparent !important;
    }
    
    /* Ensure parent website remains clickable when chatbot is minimized */
    body {
      pointer-events: auto !important;
    }
    
    @media (max-width: 768px) {
      #${IFRAME_ID}.chatbot-open {
        width: calc(100vw - 30px) !important;
        height: 80vh !important;
        bottom: 80px !important;
        right: 15px !important;
      }
    }
  `;
  document.head.appendChild(style);

  const iframe = document.createElement("iframe");
  iframe.src = `${CHATBOT_URL}?token=${encodeURIComponent(jwtToken)}`;
  iframe.id = IFRAME_ID;
  iframe.allow = "microphone; clipboard-read; clipboard-write; camera";
  iframe.setAttribute("aria-label", "AI Chatbot Assistant");
  iframe.setAttribute("frameborder", "0");
  iframe.style.border = "none";
  iframe.style.background = "transparent";

  document.body.appendChild(iframe);

  function minimizeChatbot() {
    iframe.classList.remove("chatbot-open");
    iframe.style.width = "150px";
    iframe.style.height = "120px";
    iframe.style.bottom = "20px";
    iframe.style.borderRadius = "50%";
    iframe.style.overflow = "visible";
    iframe.style.boxShadow = "none";
    iframe.style.background = "transparent";
    iframe.style.border = "none";
    // ✅ Allow clicking website when minimized
    document.body.style.pointerEvents = "auto";
  }

  function openChatbot() {
    iframe.classList.add("chatbot-open");
    iframe.style.width = "440px";
    iframe.style.height = "680px";
    iframe.style.bottom = "80px";
    iframe.style.borderRadius = "12px";
    iframe.style.overflow = "hidden";
    iframe.style.boxShadow = "none";
    iframe.style.background = "transparent";
    iframe.style.border = "none";
    // ✅ Keep website clickable even when open (only iframe blocks)
    document.body.style.pointerEvents = "auto";
  }

  window.addEventListener("message", function (event) {
    if (!event.origin.includes("aicte-india.org")) return;

    const data = event.data || {};

    if (data.type === "CHATBOT_READY" || data.type === "REQUEST_PARENT_INFO") {
      const parentUrl = window.location.href;
      const docId = window.location.hostname; // ✅ ALWAYS REAL SITE

      iframe.contentWindow.postMessage(
        {
          type: "INIT_PARENT_INFO",
          parentUrl,
          docId,
          token: jwtToken,
        },
        CHATBOT_ORIGIN
      );

      console.log("📤 [EMBED] Sent INIT_PARENT_INFO + JWT:", docId);
    }

    if (data.type === "CHATBOT_CLOSE") {
      minimizeChatbot();
    }

    if (data.type === "CHATBOT_OPEN") {
      openChatbot();
    }

    if (data.type === "DOC_ID_ACK") {
      console.log("✅ [EMBED] Chatbot acknowledged doc_id:", data.docId);
    }
  });
})();
