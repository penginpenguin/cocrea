/* Cocrea AI Chat — Ultimate Local + WebLLM + Transformers.js
 * - No API key required
 * - Local built-in model (under 500MB) + WebLLM + Transformers.js
 * - Internet tools: fetch URL text, caption image URL
 * - Separate “Ask AI” blocks with text inputs for each backend
 */

(function (Scratch) {
  'use strict';

  const iconDataURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

  // --- state ---
  class State {
    constructor() {
      // ui
      this.temperature = Number(localStorage.getItem('cocrea.ai.temp') ?? 0.7);
      this.systemPrompt = localStorage.getItem('cocrea.ai.system')
        || "You are a helpful assistant for Scratch/Cocrea projects. Be concise, step-by-step when needed.";

      // selections
      this.localModel = localStorage.getItem('cocrea.ai.local') || 'local-phi3-mini';
      this.webllmModel = localStorage.getItem('cocrea.ai.webllm') || 'phi-3-mini-4k-instruct-q4f16_1-MLC';
      this.hfModel = localStorage.getItem('cocrea.ai.hf') || 'Xenova/mistral-7b-instruct-v0.2';
      this.visionModel = localStorage.getItem('cocrea.ai.vision') || 'Xenova/vit-gpt2-image-captioning';

      // chat history
      this.localHistory = [{ role: 'system', content: this.systemPrompt }];
      this.webllmHistory = [{ role: 'system', content: this.systemPrompt }];
      this.hfHistory = [{ role: 'system', content: this.systemPrompt }];

      // engines
      this.webllm = null;
      this.webllmEngine = null;

      this.tfjs = null;
      this.hfPipeline = null;      // text-generation pipeline
      this.captionPipeline = null; // image-to-text pipeline

      // for local model
      this.localRunner = null; // lightweight runner that uses ONNX+ORT web OR gguf with web-llm style
      this.localReady = false;

      this.webllmReady = false;
      this.hfReady = false;

      this.loadProgress = 0;
      this.lastUsage = '';
    }

    save() {
      localStorage.setItem('cocrea.ai.temp', String(this.temperature));
      localStorage.setItem('cocrea.ai.system', this.systemPrompt);
      localStorage.setItem('cocrea.ai.local', this.localModel);
      localStorage.setItem('cocrea.ai.webllm', this.webllmModel);
      localStorage.setItem('cocrea.ai.hf', this.hfModel);
      localStorage.setItem('cocrea.ai.vision', this.visionModel);
    }
  }
  const S = new State();

  // Build menus from AI_MODELS (loaded by ai-models.js)
  function menuFrom(listKey) {
    const items = (self.AI_MODELS?.[listKey] || []).map(m => ({ text: m.name, value: m.id }));
    return items.length ? items : [{ text: 'Not loaded — include ai-models.js', value: '' }];
  }

  class CocreaAI {
    getInfo() {
      return {
        id: 'cocreaUltimateAI',
        name: 'AI (Local / WebLLM / HF)',
        menuIconURI: iconDataURI,
        blockIconURI: iconDataURI,
        color1: '#6c5ce7',
        color2: '#5f27cd',
        docsURI: 'https://webllm.mlc.ai',
        blocks: [
          // ----- Global controls -----
          { opcode: 'setSystem', blockType: Scratch.BlockType.COMMAND, text: 'set system prompt [TEXT]', arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Be helpful and concise." } } },
          { opcode: 'setTemp',   blockType: Scratch.BlockType.COMMAND, text: 'set temperature [TEMP]', arguments: { TEMP: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.7 } } },

          // ----- Local (built-in) -----
          { opcode: 'setLocalModel', blockType: Scratch.BlockType.COMMAND, text: 'Local: use model [MODEL]', arguments: { MODEL: { type: Scratch.ArgumentType.STRING, menu: 'localModels' } } },
          { opcode: 'loadLocal', blockType: Scratch.BlockType.COMMAND, text: 'Local: load model' },
          { opcode: 'isLocalReady', blockType: Scratch.BlockType.BOOLEAN, text: 'Local: ready?' },
          { opcode: 'askLocal', blockType: Scratch.BlockType.REPORTER, text: 'Local: ask [PROMPT]', arguments: { PROMPT: { type: Scratch.ArgumentType.STRING, defaultValue: "Explain gravity like I am 10." } } },

          // ----- WebLLM -----
          { opcode: 'setWModel', blockType: Scratch.BlockType.COMMAND, text: 'WebLLM: use model [MODEL]', arguments: { MODEL: { type: Scratch.ArgumentType.STRING, menu: 'webllmModels' } } },
          { opcode: 'loadWebLLM', blockType: Scratch.BlockType.COMMAND, text: 'WebLLM: load model' },
          { opcode: 'isWebLLMReady', blockType: Scratch.BlockType.BOOLEAN, text: 'WebLLM: ready?' },
          { opcode: 'askWebLLM', blockType: Scratch.BlockType.REPORTER, text: 'WebLLM: ask [PROMPT]', arguments: { PROMPT: { type: Scratch.ArgumentType.STRING, defaultValue: "Give me 3 Roblox PvP ideas." } } },

          // ----- Transformers.js (HF) -----
          { opcode: 'setHFModel', blockType: Scratch.BlockType.COMMAND, text: 'HF: use model [MODEL]', arguments: { MODEL: { type: Scratch.ArgumentType.STRING, menu: 'hfModels' } } },
          { opcode: 'loadHF', blockType: Scratch.BlockType.COMMAND, text: 'HF: load model' },
          { opcode: 'isHFReady', blockType: Scratch.BlockType.BOOLEAN, text: 'HF: ready?' },
          { opcode: 'askHF', blockType: Scratch.BlockType.REPORTER, text: 'HF: ask [PROMPT]', arguments: { PROMPT: { type: Scratch.ArgumentType.STRING, defaultValue: "Outline a science fair project for Year 1." } } },

          // ----- Internet tools -----
          { opcode: 'fetchURL', blockType: Scratch.BlockType.REPORTER, text: 'fetch URL text [URL]', arguments: { URL: { type: Scratch.ArgumentType.STRING, defaultValue: "https://example.com" } } },
          { opcode: 'captionImage', blockType: Scratch.BlockType.REPORTER, text: 'image caption from URL [IMG]', arguments: { IMG: { type: Scratch.ArgumentType.STRING, defaultValue: "https://picsum.photos/seed/cat/512" } } },

          // status
          { opcode: 'loadProgress', blockType: Scratch.BlockType.REPORTER, text: 'load progress %' },
          { opcode: 'lastUsage',    blockType: Scratch.BlockType.REPORTER, text: 'last token usage' },
          { opcode: 'clearAll',     blockType: Scratch.BlockType.COMMAND, text: 'clear all chats' },
        ],
        menus: {
          localModels: { acceptReporters: true, items: () => menuFrom('local') },
          webllmModels: { acceptReporters: true, items: () => menuFrom('webllm') },
          hfModels: { acceptReporters: true, items: () => menuFrom('transformers') }
        }
      };
    }

    // ---------- global ----------
    setSystem({ TEXT }) {
      S.systemPrompt = String(TEXT ?? '');
      S.localHistory = [{ role: 'system', content: S.systemPrompt }];
      S.webllmHistory = [{ role: 'system', content: S.systemPrompt }];
      S.hfHistory = [{ role: 'system', content: S.systemPrompt }];
      S.save();
    }
    setTemp({ TEMP }) {
      let t = Number(TEMP);
      if (!Number.isFinite(t)) t = 0.7;
      S.temperature = Math.max(0, Math.min(2, t));
      S.save();
    }
    loadProgress() { return String(S.loadProgress || 0); }
    lastUsage() { return S.lastUsage || ''; }
    clearAll() {
      S.localHistory = [{ role: 'system', content: S.systemPrompt }];
      S.webllmHistory = [{ role: 'system', content: S.systemPrompt }];
      S.hfHistory = [{ role: 'system', content: S.systemPrompt }];
      S.lastUsage = '';
    }

    // ---------- Local (built-in) ----------
    setLocalModel({ MODEL }) {
      if (MODEL) S.localModel = MODEL;
      S.save();
    }
    async loadLocal() {
      // Example local runner using Transformers.js + ONNXRuntime Web from local files.
      if (!S.tfjs) {
        S.tfjs = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.0');
      }

      // Configure to prefer local paths (no internet required for the local model).
      S.tfjs.env.useBrowserCache = true;
      S.tfjs.env.remoteModels = false; // don’t hit the hub for local runner

      // The local model id maps to a folder under ./models/
      // Expect layout (example for Phi-3 Mini int4):
      // ./models/local-phi3-mini/
      //   config.json, tokenizer.json, tokenizer_config.json, generation_config.json
      //   model.onnx (or shard files), model.quant.json, etc.
      const base = `./models/${S.localModel}`;
      // Register a custom local repository mapping.
      S.tfjs.env.localModelPath = (repo, file) => {
        // repo == S.localModel here
        return `${base}/${file}`;
      };

      // Create a pipeline; for local, we use text-generation
      S.hfPipeline = await S.tfjs.pipeline('text-generation', S.localModel, {
        device: 'auto',
        dtype: 'q4', // hint for quant; real usage depends on your files
        progress_callback: p => {
          const pct = p?.progress != null ? (p.progress * 100) : 0;
          S.loadProgress = Math.round(pct);
        }
      });

      S.localRunner = S.hfPipeline;
      S.localReady = true;
      S.hfReady = !!S.hfPipeline; // HF is initialized for local too
    }
    isLocalReady() { return S.localReady; }
    async askLocal({ PROMPT }) {
      if (!S.localRunner) return '…local model not loaded…';
      const input = String(PROMPT ?? '');
      const prompt = renderChat(S.localHistory, input, S.systemPrompt);
      const out = await S.localRunner(prompt, {
        max_new_tokens: 300,
        temperature: S.temperature,
        top_p: 0.95,
        repetition_penalty: 1.05
      });
      const text = Array.isArray(out) ? out[0]?.generated_text ?? '' : String(out?.generated_text ?? out?.[0]?.generated_text ?? '');
      pushTurn(S.localHistory, input, text);
      return stripPrompt(text, prompt);
    }

    // ---------- WebLLM ----------
    setWModel({ MODEL }) { if (MODEL) { S.webllmModel = MODEL; S.save(); } }
    async loadWebLLM() {
      if (!S.webllm) S.webllm = await import('https://esm.run/@mlc-ai/web-llm');
      const { CreateMLCEngine } = S.webllm;
      S.webllmReady = false;
      S.loadProgress = 0;

      const initProgressCallback = (p) => {
        const pct = (typeof p?.progress === 'number') ? p.progress * 100 :
          (p?.loaded && p?.total) ? (p.loaded / p.total) * 100 : 0;
        S.loadProgress = Math.round(Math.max(0, Math.min(100, pct)));
      };
      if (!S.webllmEngine) {
        S.webllmEngine = await CreateMLCEngine(S.webllmModel, { initProgressCallback });
      } else {
        await S.webllmEngine.reload(S.webllmModel, { initProgressCallback });
      }
      S.webllmReady = true;
    }
    isWebLLMReady() { return S.webllmReady; }
    async askWebLLM({ PROMPT }) {
      if (!S.webllmEngine) return '…WebLLM model not loaded…';
      const input = String(PROMPT ?? '');
      const history = trimHistory(S.webllmHistory);
      const reply = await S.webllmEngine.chat.completions.create({
        messages: history.concat([{ role: 'user', content: input }]),
        temperature: S.temperature
      });
      const msg = reply?.choices?.[0]?.message;
      const content = typeof msg === 'string' ? msg : (msg?.content ?? '');
      S.lastUsage = usageString(reply?.usage);
      pushTurn(S.webllmHistory, input, content);
      return content || '';
    }

    // ---------- Transformers.js (HF) ----------
    setHFModel({ MODEL }) { if (MODEL) { S.hfModel = MODEL; S.save(); } }
    async loadHF() {
      if (!S.tfjs) {
        S.tfjs = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.0');
      }
      S.tfjs.env.useBrowserCache = true;
      S.tfjs.env.remoteModels = true; // allow hub download for HF models
      S.tfjs.env.allowLocalModels = false;

      S.hfPipeline = await S.tfjs.pipeline('text-generation', S.hfModel, {
        device: 'auto',
        progress_callback: p => {
          const pct = p?.progress != null ? (p.progress * 100) : 0;
          S.loadProgress = Math.round(pct);
        }
      });
      S.hfReady = true;
    }
    isHFReady() { return S.hfReady; }
    async askHF({ PROMPT }) {
      if (!S.hfPipeline) return '…HF model not loaded…';
      const input = String(PROMPT ?? '');
      const prompt = renderChat(S.hfHistory, input, S.systemPrompt);
      const out = await S.hfPipeline(prompt, {
        max_new_tokens: 300,
        temperature: S.temperature,
        top_p: 0.95,
        repetition_penalty: 1.05
      });
      const text = Array.isArray(out) ? out[0]?.generated_text ?? '' : String(out?.generated_text ?? out?.[0]?.generated_text ?? '');
      pushTurn(S.hfHistory, input, text);
      return stripPrompt(text, prompt);
    }

    // ---------- Internet tools ----------
    async fetchURL({ URL }) {
      try {
        const res = await fetch(String(URL || ''), { mode: 'cors' });
        const txt = await res.text();
        // return a trimmed chunk to avoid massive strings in Scratch
        return txt.slice(0, 4000);
      } catch (e) {
        return 'fetch error: ' + (e?.message || String(e));
      }
    }

    async captionImage({ IMG }) {
      try {
        if (!S.tfjs) S.tfjs = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.0');
        if (!S.captionPipeline) {
          S.captionPipeline = await S.tfjs.pipeline('image-to-text', S.visionModel, {
            device: 'auto',
            progress_callback: p => {
              const pct = p?.progress != null ? (p.progress * 100) : 0;
              S.loadProgress = Math.round(pct);
            }
          });
        }
        const out = await S.captionPipeline(String(IMG || ''));
        const text = Array.isArray(out) ? out[0]?.generated_text ?? '' : String(out?.generated_text ?? '');
        return text || '';
      } catch (e) {
        return 'caption error: ' + (e?.message || String(e));
      }
    }
  }

  // ---------- helpers ----------
  function usageString(u) {
    if (!u) return '';
    const parts = [];
    if (u.prompt_tokens != null) parts.push(`prompt:${u.prompt_tokens}`);
    if (u.completion_tokens != null) parts.push(`completion:${u.completion_tokens}`);
    if (u.total_tokens != null) parts.push(`total:${u.total_tokens}`);
    return parts.join(', ');
  }
  function trimHistory(history, maxPairs = 8) {
    // keep system + last N pairs
    return history.slice(-1 - maxPairs * 2);
  }
  function pushTurn(history, userText, assistantText) {
    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: assistantText || '' });
  }
  function renderChat(history, newUserText, systemPrompt) {
    const h = trimHistory(history);
    // simple OpenAI-style transcript
    const lines = [];
    const sys = systemPrompt || 'You are a helpful assistant.';
    lines.push(`<|system|>\n${sys}\n`);
    for (const m of h) {
      if (m.role === 'user') lines.push(`<|user|>\n${m.content}\n`);
      if (m.role === 'assistant') lines.push(`<|assistant|>\n${m.content}\n`);
    }
    lines.push(`<|user|>\n${newUserText}\n<|assistant|>\n`);
    return lines.join('');
  }
  function stripPrompt(full, usedPrompt) {
    // remove the echoed prompt if model returns it
    const idx = full.indexOf(usedPrompt);
    if (idx >= 0) return full.slice(idx + usedPrompt.length).trim();
    return full.trim();
  }

  Scratch.extensions.register(new CocreaAI());
})(Scratch);
