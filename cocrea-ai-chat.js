/* Cocrea / Gandi IDE AI Chat Extension (no API key)
 * Runs open-source LLMs in-browser via WebLLM (WebGPU/WebAssembly).
 * Works in Scratch-like editors (Gandi/Cocrea/TurboWarp-style extensions).
 * Docs: https://webllm.mlc.ai/ (everything runs in your browser)
 */

(function (Scratch) {
  'use strict';

  // --- Minimal placeholder icon (1x1 transparent). Replace with your own if you like. ---
  // You can replace this with a bigger PNG data: URI (see icon download link in my message).
  const ICON_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

  // Model choices shipped by WebLLM (names from webllm prebuilt config).
  // Pick small if your device is modest; large = better quality but heavier.
  const MODEL_OPTIONS = [
    "Phi-3-mini-4k-instruct",      // fast, small (good default)
    "Llama-3.1-8B-Instruct",       // higher quality, heavy
    "TinyLlama-1.1B-chat"          // very small, slow but ultra-lightweight
  ];

  class CocreaAIChat {
    constructor() {
      this.ready = false;
      this.loading = false;
      this.progress = 0;
      this.lastUsage = "";
      this.temperature = Number(localStorage.getItem('cocrea.ai.temp') ?? 0.7);
      this.model = localStorage.getItem('cocrea.ai.model') || MODEL_OPTIONS[0];
      this.systemPrompt = localStorage.getItem('cocrea.ai.system') || "You are a helpful assistant for Scratch/Gandi projects. Be concise and practical.";
      this.messages = [{ role: "system", content: this.systemPrompt }];

      // webllm module + engine will be filled later
      this.webllm = null;
      this.engine = null;
    }

    getInfo() {
      return {
        id: 'cocreaAIChat',
        name: 'AI Chat (Local)',
        menuIconURI: ICON_DATA_URI,
        blockIconURI: ICON_DATA_URI,
        color1: '#6c5ce7',
        color2: '#5f27cd',
        docsURI: 'https://webllm.mlc.ai/',
        blocks: [
          { opcode: 'loadModel', blockType: Scratch.BlockType.COMMAND, text: 'load AI model' },
          { opcode: 'isReady', blockType: Scratch.BlockType.BOOLEAN, text: 'AI ready?' },
          { opcode: 'getProgress', blockType: Scratch.BlockType.REPORTER, text: 'load progress %' },
          { opcode: 'setModel', blockType: Scratch.BlockType.COMMAND, text: 'use model [MODEL]', arguments: { MODEL: { type: Scratch.ArgumentType.STRING, menu: 'models' } } },
          { opcode: 'setSystem', blockType: Scratch.BlockType.COMMAND, text: 'set system prompt [TEXT]', arguments: { TEXT: Scratch.ArgumentType.STRING } },
          { opcode: 'setTemp', blockType: Scratch.BlockType.COMMAND, text: 'set temperature [TEMP]', arguments: { TEMP: Scratch.ArgumentType.NUMBER } },
          { opcode: 'ask', blockType: Scratch.BlockType.REPORTER, text: 'ask AI [PROMPT]', arguments: { PROMPT: Scratch.ArgumentType.STRING } },
          { opcode: 'clearChat', blockType: Scratch.BlockType.COMMAND, text: 'clear AI chat' },
          { opcode: 'lastUsage', blockType: Scratch.BlockType.REPORTER, text: 'last token usage' },
        ],
        menus: {
          models: {
            acceptReporters: true,
            items: MODEL_OPTIONS.map(m => ({ text: m, value: m }))
          }
        }
      };
    }

    // --- Helpers ---

    _savePrefs() {
      localStorage.setItem('cocrea.ai.model', this.model);
      localStorage.setItem('cocrea.ai.system', this.systemPrompt);
      localStorage.setItem('cocrea.ai.temp', String(this.temperature));
    }

    async _ensureModule() {
      if (this.webllm) return;
      // Dynamically import WebLLM from a CDN; stays inside your browser.
      this.webllm = await import('https://esm.run/@mlc-ai/web-llm');
      // optional: you could inspect this.webllm.prebuiltAppConfig.model_list here
    }

    async _createOrReloadEngine() {
      await this._ensureModule();
      const { CreateMLCEngine } = this.webllm;

      this.loading = true;
      this.ready = false;
      this.progress = 0;

      const initProgressCallback = (p) => {
        // WebLLM progress object sometimes has .progress (0..1) or bytes info.
        const pct = (typeof p?.progress === 'number') ? p.progress * 100 :
                    (p?.loaded && p?.total) ? (p.loaded / p.total) * 100 : 0;
        this.progress = Math.max(0, Math.min(100, Math.round(pct)));
      };

      try {
        if (!this.engine) {
          this.engine = await CreateMLCEngine(this.model, { initProgressCallback });
        } else {
          await this.engine.reload(this.model, { initProgressCallback });
        }
        this.ready = true;
      } catch (e) {
        console.error('[CocreaAIChat] failed to load model:', e);
        this.ready = false;
        throw e;
      } finally {
        this.loading = false;
      }
    }

    // --- Blocks ---

    async loadModel() {
      // If WebGPU is unavailable, WebLLM may fall back to WASM (slow) or fail.
      if (!('gpu' in navigator)) {
        // Still try; user may have CPU fallback available
        console.warn('WebGPU not detected; attempting CPU/WASM fallback (may be slow).');
      }
      await this._createOrReloadEngine();
    }

    isReady() {
      return this.ready;
    }

    getProgress() {
      return String(this.progress);
    }

    setModel(args) {
      const model = String(args.MODEL || '').trim();
      if (model && MODEL_OPTIONS.includes(model)) {
        this.model = model;
        this._savePrefs();
      }
    }

    setSystem(args) {
      this.systemPrompt = String(args.TEXT ?? '');
      // Reset system message at the beginning of history
      this.messages = [{ role: 'system', content: this.systemPrompt }];
      this._savePrefs();
    }

    setTemp(args) {
      let t = Number(args.TEMP);
      if (!Number.isFinite(t)) t = 0.7;
      this.temperature = Math.max(0, Math.min(2, t));
      this._savePrefs();
    }

    async ask(args) {
      const prompt = String(args.PROMPT ?? '');
      if (!this.engine) await this._createOrReloadEngine();
      if (!this.ready) return '…loading model…';

      // Keep short, practical chat history
      const MAX_PAIRS = 8;
      const trimmed = this.messages.slice(-1 - MAX_PAIRS * 2); // keep system + last pairs
      const messages = [...trimmed, { role: 'user', content: prompt }];

      try {
        const reply = await this.engine.chat.completions.create({
          messages,
          temperature: this.temperature,
        });

        const msg = reply?.choices?.[0]?.message;
        const content = (typeof msg === 'string') ? msg : (msg?.content ?? '');
        this.messages = messages.concat([{ role: 'assistant', content }]);

        const u = reply?.usage;
        if (u) {
          const parts = [];
          if (u.prompt_tokens != null) parts.push(`prompt:${u.prompt_tokens}`);
          if (u.completion_tokens != null) parts.push(`completion:${u.completion_tokens}`);
          if (u.total_tokens != null) parts.push(`total:${u.total_tokens}`);
          this.lastUsage = parts.join(', ');
        } else {
          this.lastUsage = '';
        }

        return content || '';
      } catch (e) {
        console.error('[CocreaAIChat] ask() error:', e);
        return 'AI error: ' + (e?.message || String(e));
      }
    }

    clearChat() {
      this.messages = [{ role: 'system', content: this.systemPrompt }];
      this.lastUsage = '';
    }

    lastUsage() {
      return this.lastUsage || '';
    }
  }

  Scratch.extensions.register(new CocreaAIChat());
})(Scratch);
