/* Central model registry for the Cocrea AI extension.
 * You can add/remove entries here without touching the main extension code.
 * name: short label shown in dropdown; id: the exact backend model id.
 */

const AI_MODELS = {
  // ===== Local (built-in) =====
  // The local model is meant to be packaged with your project (no downloads).
  // Keep it under ~400-500 MB by using an int4 quantized Phi-3 Mini.
  // Place files under ./models/local-phi3-mini/ (example layout below in main code).
  local: [
    { name: "Smart (Local) – Phi-3 Mini", id: "local-phi3-mini" }
    // Add more local builds later if you bundle them.
  ],

  // ===== WebLLM (downloaded + cached in-browser; fastest with WebGPU) =====
  // These ids must exist in WebLLM's prebuilt list. Names are short & friendly.
  webllm: [
    { name: "Fast – Gemma-2B (WebLLM)",    id: "gemma-2b-it-q4f16_1-MLC" },
    { name: "Fast – Phi-3 Mini (WebLLM)",  id: "phi-3-mini-4k-instruct-q4f16_1-MLC" },

    { name: "Balanced – Phi-3 Small (WebLLM)", id: "phi-3-small-8k-instruct-q4f16_1-MLC" },
    { name: "Balanced – Gemma-7B (WebLLM)",    id: "gemma-7b-it-q4f16_1-MLC" },

    { name: "Smart – Llama-3 8B (WebLLM)",     id: "llama-3-8b-instruct-q4f16_1-MLC" },
    { name: "Smart – Mistral-7B (WebLLM)",     id: "mistral-7b-instruct-v0.2-q4f16_1-MLC" }
  ],

  // ===== Transformers.js (Hugging Face in-browser) =====
  // These models download the first time, then cache in IndexedDB.
  // (Large downloads; fine for strong machines.)
  transformers: [
    { name: "Fast – TinyLlama-1.1B (HF)",   id: "Xenova/TinyLlama-1.1B-Chat-v1.0" },
    { name: "Balanced – Mistral-7B-Instruct (HF)", id: "Xenova/mistral-7b-instruct-v0.2" },
    { name: "Smart – Llama-3-8B-Instruct (HF)",    id: "Xenova/Llama-3-8B-Instruct" }
  ],

  // ===== Vision helpers (Transformers.js) =====
  // We do image understanding by: caption (image→text) + feed to LLM.
  // This keeps the VLM budget small vs. running a huge multi-modal model.
  vision: [
    { name: "Caption – ViT-GPT2 (HF)", id: "Xenova/vit-gpt2-image-captioning" }
  ]
};

// Expose in global scope for the extension to read.
self.AI_MODELS = AI_MODELS;
