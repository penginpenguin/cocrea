/* Patched cocrea-ai-chat.js
 * - Integrates stability patches & crash reporter (stays until closed)
 * - Keeps original extension functionality
 *
 * Replace your old cocrea-ai-chat.js with this file.
 */

//// =================== STABILITY PATCHES & CRASH REPORTER ===================

// 1) Prevent document.write from wiping page after load
(function documentWriteGuard() {
  try {
    const oldWrite = document.write.bind(document);
    document.write = function(...args) {
      if (document.readyState !== 'loading') {
        console.warn('[Patch] document.write() called after load - ignored.', args.join(''));
        return;
      }
      return oldWrite(...args);
    };
    console.log('[Patch] document.write guard installed');
  } catch (e) {
    console.warn('[Patch] document.write guard failed', e);
  }
})();

// 2) Blockly null-guard for contentLeft (only if Blockly exists)
(function patchBlockly() {
  try {
    if (typeof Blockly !== 'undefined' && Blockly.Gesture && Blockly.Gesture.prototype.handleMove) {
      const original = Blockly.Gesture.prototype.handleMove;
      Blockly.Gesture.prototype.handleMove = function(e) {
        try {
          // Many Blockly errors arise from workspace or scrollbar being null; guard defensively
          if (!this.workspace_ || !this.workspace_.scrollbar) {
            return;
          }
          // contentLeft may not exist in some forks - guard
          if (typeof this.workspace_.scrollbar.contentLeft === 'undefined' && typeof this.workspace_.scrollbar.getContentLeft === 'function') {
            this.workspace_.scrollbar.contentLeft = this.workspace_.scrollbar.getContentLeft();
          }
          if (this.workspace_.scrollbar.contentLeft == null) {
            return;
          }
          return original.call(this, e);
        } catch (err) {
          console.error('[Patch] Blockly handleMove prevented error:', err);
        }
      };
      console.log('[Patch] Blockly gesture.handleMove patched');
    } else {
      console.log('[Patch] Blockly not found or no gesture handleMove to patch');
    }
  } catch (err) {
    console.warn('[Patch] Blockly patch failed', err);
  }
})();

// 3) Crash reporter: shows detailed popup (stays until closed), with Copy + Download TXT
(function crashReporterInstall() {
  try {
    function buildReportObject(e, extra) {
      const ua = navigator.userAgent;
      const time = new Date().toISOString();
      const report = {
        time,
        userAgent: ua,
        location: window.location.href,
        message: e && (e.message || String(e)) || String(e),
        filename: e && (e.filename || e.fileName || '') || '',
        lineno: e && (e.lineno || e.lineNumber || '') || '',
        colno: e && (e.colno || e.columnNumber || '') || '',
        stack: e && (e.error && e.error.stack ? e.error.stack : (e.stack || '')) || '',
        type: e && e.type ? e.type : 'error',
        extra: extra || {}
      };

      // Try to include the AI state histories if available
      try {
        const S = window.__COCREA_AI_STATE__;
        if (S) {
          report.extra.ai_state = {
            localModel: S.localModel,
            webllmModel: S.webllmModel,
            hfModel: S.hfModel,
            lastUsage: S.lastUsage || '',
            loadProgress: S.loadProgress || 0,
            recent: {
              localHistory: (S.localHistory || []).slice(-12),
              webllmHistory: (S.webllmHistory || []).slice(-12),
              hfHistory: (S.hfHistory || []).slice(-12)
            }
          };
        } else {
          report.extra.ai_state = 'No AI state object found (window.__COCREA_AI_STATE__ is missing)';
        }
      } catch (inner) {
        report.extra.ai_state_error = String(inner);
      }

      return report;
    }

    function formatReport(report) {
      const parts = [];
      parts.push(`=== Crash Report ===`);
      parts.push(`Time: ${report.time}`);
      parts.push(`User Agent: ${report.userAgent}`);
      parts.push(`URL: ${report.location}`);
      parts.push(`Type: ${report.type}`);
      parts.push(`Message: ${report.message}`);
      if (report.filename) parts.push(`File: ${report.filename}`);
      if (report.lineno || report.colno) parts.push(`Line: ${report.lineno || '?'} Col: ${report.colno || '?'}`);
      parts.push(`Stack:\n${report.stack || '[no stack]'}`);
      parts.push('');
      parts.push('--- Extra ---');
      try {
        parts.push(JSON.stringify(report.extra, null, 2));
      } catch (e) {
        parts.push('Could not stringify extra: ' + String(e));
      }
      return parts.join('\n');
    }

    function showPopup(reportText) {
      try {
        // If popup already exists, append details instead of creating another
        const existing = document.getElementById('cocrea-crash-popup');
        if (existing) {
          const pre = existing.querySelector('pre');
          if (pre) pre.textContent = reportText;
          existing.style.display = 'block';
          return;
        }

        const popup = document.createElement('div');
        popup.id = 'cocrea-crash-popup';
        popup.style.cssText = `
          position: fixed;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 980px;
          max-height: 85vh;
          overflow: auto;
          background: #111;
          color: #e6eef8;
          border: 2px solid #444;
          padding: 14px;
          z-index: 2147483647;
          box-shadow: 0 8px 48px rgba(0,0,0,0.6);
          font-family: Consolas, "Liberation Mono", Menlo, monospace;
          border-radius: 8px;
        `;

        const title = document.createElement('div');
        title.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
        const h = document.createElement('strong');
        h.textContent = 'Crash Reporter — Detailed Error';
        h.style.fontSize = '16px';
        h.style.color = '#ffd27f';

        const controls = document.createElement('div');

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy Report';
        copyBtn.style.cssText = `
          margin-left:8px;padding:6px 10px;border-radius:6px;border:none;background:#2d8cf0;color:white;cursor:pointer;
        `;
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(reportText);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy Report', 2000);
          } catch (e) {
            console.warn('copy failed', e);
            copyBtn.textContent = 'Copy Failed';
            setTimeout(() => copyBtn.textContent = 'Copy Report', 2000);
          }
        };

        // Download button
        const dlBtn = document.createElement('button');
        dlBtn.textContent = 'Download .txt';
        dlBtn.style.cssText = `
          margin-left:8px;padding:6px 10px;border-radius:6px;border:none;background:#6dffb1;color:#012;cursor:pointer;
        `;
        dlBtn.onclick = () => {
          try {
            const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cocrea_crash_${(new Date()).toISOString().replace(/[:.]/g,'-')}.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          } catch (e) {
            console.warn('download failed', e);
          }
        };

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
          margin-left:8px;padding:6px 10px;border-radius:6px;border:none;background:#ff6b6b;color:white;cursor:pointer;
        `;
        closeBtn.onclick = () => {
          popup.style.display = 'none';
        };

        controls.appendChild(copyBtn);
        controls.appendChild(dlBtn);
        controls.appendChild(closeBtn);

        title.appendChild(h);
        title.appendChild(controls);

        const pre = document.createElement('pre');
        pre.style.cssText = 'white-space:pre-wrap;background:#0b1220;padding:10px;border-radius:6px;color:#d8eefe;font-size:12px;';
        pre.textContent = reportText;

        const note = document.createElement('div');
        note.style.cssText = 'margin-top:8px;color:#aabacc;font-size:12px';
        note.textContent = 'Please copy or download this report and send it to the developer for debugging. The popup will remain until closed.';

        popup.appendChild(title);
        popup.appendChild(pre);
        popup.appendChild(note);

        document.body.appendChild(popup);
      } catch (err) {
        console.error('[CrashReporter] showPopup failed', err);
      }
    }

    // Global handlers
    window.addEventListener('error', function (ev) {
      try {
        const reportObj = buildReportObject(ev, { source: 'window.error' });
        const reportText = formatReport(reportObj);
        console.error('[CrashReporter] caught error:', reportText);
        showPopup(reportText);
      } catch (e) {
        console.error('[CrashReporter] error handling failed', e);
      }
    });

    window.addEventListener('unhandledrejection', function (ev) {
      try {
        const reportObj = buildReportObject({ message: String(ev.reason), stack: ev.reason && ev.reason.stack ? ev.reason.stack : '' }, { source: 'unhandledrejection' });
        const reportText = formatReport(reportObj);
        console.error('[CrashReporter] caught unhandledrejection:', reportText);
        showPopup(reportText);
      } catch (e) {
        console.error('[CrashReporter] unhandledrejection handler failed', e);
      }
    });

    console.log('[Patch] Crash reporter installed (popup will stay until closed).');
  } catch (e) {
    console.error('[Patch] Crash reporter installation failed', e);
  }
})();

//// =================== ORIGINAL EXTENSION (unchanged logic, with small safety hookups) ================

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

  // Expose state for crash reporter and external inspection
  try {
    window.__COCREA_AI_STATE__ = S;
  } catch (e) {
    console.warn('[Patch] Could not set window.__COCREA_AI_STATE__', e);
  }

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
      try {
        S.systemPrompt = String(TEXT ?? '');
        S.localHistory = [{ role: 'system', content: S.systemPrompt }];
        S.webllmHistory = [{ role: 'system', content: S.systemPrompt }];
        S.hfHistory = [{ role: 'system', content: S.systemPrompt }];
        S.save();
      } catch (e) {
        console.error('[CocreaAI] setSystem error', e);
        throw e;
      }
    }
    setTemp({ TEMP }) {
      try {
        let t = Number(TEMP);
        if (!Number.isFinite(t)) t = 0.7;
        S.temperature = Math.max(0, Math.min(2, t));
        S.save();
      } catch (e) {
        console.error('[CocreaAI] setTemp error', e);
        throw e;
      }
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
      try {
        // Example local runner using Transformers.js + ONNXRuntime Web from local files.
        if (!S.tfjs) {
          S.tfjs = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.0');
        }

        // Configure to prefer local paths (no internet required for the local model).
        S.tfjs.env.useBrowserCache = true;
        S.tfjs.env.remoteModels = false; // don’t hit the hub for local runner

        const base = `./models/${S.localModel}`;
        S.tfjs.env.localModelPath = (repo, file) => `${base}/${file}`;

        S.hfPipeline = await S.tfjs.pipeline('text-generation', S.localModel, {
          device: 'auto',
          dtype: 'q4',
          progress_callback: p => {
            const pct = p?.progress != null ? (p.progress * 100) : 0;
            S.loadProgress = Math.round(pct);
          }
        });

        S.localRunner = S.hfPipeline;
        S.localReady = true;
        S.hfReady = !!S.hfPipeline;
      } catch (err) {
        console.error('[CocreaAI] loadLocal failed', err);
        throw err;
      }
    }
    isLocalReady() { return S.localReady; }
    async askLocal({ PROMPT }) {
      try {
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
      } catch (e) {
        console.error('[CocreaAI] askLocal error', e);
        throw e;
      }
    }

    // ---------- WebLLM ----------
    setWModel({ MODEL }) { if (MODEL) { S.webllmModel = MODEL; S.save(); } }
    async loadWebLLM() {
      try {
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
      } catch (e) {
        console.error('[CocreaAI] loadWebLLM failed', e);
        throw e;
      }
    }
    isWebLLMReady() { return S.webllmReady; }
    async askWebLLM({ PROMPT }) {
      try {
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
      } catch (e) {
        console.error('[CocreaAI] askWebLLM error', e);
        throw e;
      }
    }

    // ---------- Transformers.js (HF) ----------
    setHFModel({ MODEL }) { if (MODEL) { S.hfModel = MODEL; S.save(); } }
    async loadHF() {
      try {
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
      } catch (e) {
        console.error('[CocreaAI] loadHF failed', e);
        throw e;
      }
    }
    isHFReady() { return S.hfReady; }
    async askHF({ PROMPT }) {
      try {
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
      } catch (e) {
        console.error('[CocreaAI] askHF error', e);
        throw e;
      }
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

  // Safety: ensure lastUsage method always exists globally for external callers
  try {
    if (!window.cocreaAI_lastUsage_safe) {
      window.cocreaAI_lastUsage_safe = function() {
        try {
          return (window.__COCREA_AI_STATE__ && window.__COCREA_AI_STATE__.lastUsage) || '';
        } catch (e) {
          return '';
        }
      };
      console.log('[Patch] global cocreaAI_lastUsage_safe installed');
    }
  } catch (e) {
    console.warn('[Patch] could not install cocreaAI_lastUsage_safe', e);
  }

  // Register the extension safely
  try {
    Scratch.extensions.register(new CocreaAI());
    console.log('[CocreaAI] Extension registered (patched build)');
  } catch (err) {
    // If registration fails, throw an error that will be captured by crash reporter
    console.error('[CocreaAI] Registration failed', err);
    throw err;
  }
})(Scratch);
