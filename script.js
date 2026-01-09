document.addEventListener("DOMContentLoaded", () => {
  console.log("JS loaded");

  const promptInput = document.getElementById("prompt");
  const submitBtn = document.getElementById("submit");
  const chatContainer = document.querySelector(".chat-container");

  if (!promptInput || !submitBtn || !chatContainer) {
    alert("DOM elements not found");
    return;
  }

  /* ================= INPUT VISUAL ================= */

  const ORIGINAL_BG = "black";
  const ORIGINAL_TEXT = "white";
  const ACTIVE_BG = "white";
  const ACTIVE_TEXT = "black";

  function resetInputStyle() {
    promptInput.style.backgroundColor = ORIGINAL_BG;
    promptInput.style.color = ORIGINAL_TEXT;
  }

  promptInput.addEventListener("input", () => {
    if (promptInput.value.length > 0) {
      promptInput.style.backgroundColor = ACTIVE_BG;
      promptInput.style.color = ACTIVE_TEXT;
    } else {
      resetInputStyle();
    }
  });

  /* ================= GROQ CONFIG ================= */

  const GROQ_API_KEY = "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";
  const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

  /* ================= STATE ================= */

  let controller = null;
  let isGenerating = false;
  let stopTyping = false;
  let autoScrollEnabled = true;

  /* ================= SCROLL LOGIC ================= */

  function isUserNearBottom() {
    const threshold = 120;
    return (
      chatContainer.scrollHeight -
        chatContainer.scrollTop -
        chatContainer.clientHeight <
      threshold
    );
  }

  chatContainer.addEventListener("scroll", () => {
    autoScrollEnabled = isUserNearBottom();
  });

  function scrollToBottomSmooth() {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth"
    });
  }

  /* ================= HELPERS ================= */

  function createChatBox(html, className) {
    const div = document.createElement("div");
    div.className = className;
    div.innerHTML = html;
    return div;
  }

  function addUserMessage(text) {
    const box = createChatBox(
      `
        <div class="user-chat-area">${text}</div>
        <img src="user.png" alt="User" />
      `,
      "user-chat-box"
    );
    chatContainer.appendChild(box);
  }

  function addAITyping() {
    const box = createChatBox(
      `
        <img src="ai.png" alt="AI" />
        <div class="ai-chat-area ai-typing-animate">
          <i class="fa-solid fa-ellipsis"></i>
        </div>
      `,
      "ai-chat-box"
    );
    chatContainer.appendChild(box);

    if (autoScrollEnabled) scrollToBottomSmooth();

    return box.querySelector(".ai-chat-area");
  }

  /* ================= EVENTS ================= */

  submitBtn.addEventListener("click", () => {
    if (isGenerating) {
      stopGeneration();
    } else {
      handleChat();
    }
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      isGenerating ? stopGeneration() : handleChat();
    }
  });

  /* ================= CHAT FLOW ================= */

  async function handleChat() {
    const message = promptInput.value.trim();
    if (!message) return;

    promptInput.value = "";
    resetInputStyle();

    addUserMessage(message);
    if (autoScrollEnabled) scrollToBottomSmooth();

    const aiTextEl = addAITyping();

    isGenerating = true;
    stopTyping = false;
    controller = new AbortController();

    await sendToGroq(message, aiTextEl);
  }

  function stopGeneration() {
    if (!isGenerating) return;

    stopTyping = true;
    controller?.abort();
    isGenerating = false;
  }

  /* ================= TYPE EFFECT ================= */

  function typeText(el, text, speed = 22) {
    el.textContent = "";
    let i = 0;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (stopTyping) {
          clearInterval(interval);
          resolve();
          return;
        }

        el.textContent += text.charAt(i);
        i++;

        if (autoScrollEnabled) scrollToBottomSmooth();

        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  /* ================= GROQ API ================= */

  async function sendToGroq(userMessage, aiTextEl) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7
        }),
        signal: controller.signal
      });

      const data = await res.json();

      if (!res.ok) {
        aiTextEl.textContent = data?.error?.message || "API error";
        return;
      }

      const reply =
        data?.choices?.[0]?.message?.content || "No response";

      await new Promise(r => setTimeout(r, 500));
      await typeText(aiTextEl, reply);

    } catch (err) {
      if (err.name !== "AbortError") {
        aiTextEl.textContent = "Network error";
        console.error(err);
      }
    } finally {
      isGenerating = false;
    }
  }

  resetInputStyle();
});
