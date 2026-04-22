// js/features/ai_chat.js
    // --- AI Chat ---

    function renderAiChat() {
      // Take over the full workspace area
      const workspace = document.getElementById('tool-workspace');
      workspace.innerHTML = `
        <div class="lg:col-span-12 flex flex-col" style="height:calc(100vh - 9rem)">
          <!-- Settings Bar -->
          <div id="ai-settings-bar" class="glass-panel rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
            <span class="text-sm font-semibold text-slate-300 ml-2"><i class="fa-solid fa-gear text-brand-400 ml-1"></i> إعدادات الذكاء الاصطناعي</span>
            <input id="ai-base-url" type="text" placeholder="Base URL (مثال: https://api.groq.com/openai/v1)"
              class="flex-1 min-w-[220px] bg-slate-900 border border-darkborder rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors" />
            <input id="ai-api-key" type="password" placeholder="API Key"
              class="flex-1 min-w-[180px] bg-slate-900 border border-darkborder rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors" />
            <input id="ai-model" type="text" placeholder="اسم الموديل (مثال: gpt-4o-mini)"
              class="flex-1 min-w-[180px] bg-slate-900 border border-darkborder rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors" />
            <select id="ai-cookie"
              class="flex-1 min-w-[180px] bg-slate-900 border border-darkborder rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors appearance-none pr-8">
              <option value="">بدون حساب X (فقط بحث وتحليل)</option>
            </select>
            <div class="flex gap-2 flex-wrap">
              <button onclick="aiSetPreset('groq')" class="text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 transition-all">⚡ Groq</button>
              <button onclick="aiSetPreset('openai')" class="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-darkborder transition-all">🟢 OpenAI</button>
              <button onclick="aiSetPreset('deepseek')" class="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-darkborder transition-all">🔵 DeepSeek</button>
              <button onclick="aiSetPreset('ollama')" class="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-darkborder transition-all">🐋 Ollama</button>
              <button onclick="aiSaveSettings()" class="text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-all font-semibold">حفظ</button>
              <button onclick="aiClearChat()" class="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-darkborder transition-all">مسح المحادثة</button>
            </div>
          </div>
          <!-- Chat Messages -->
          <div id="ai-chat-messages" class="flex-1 overflow-y-auto bg-[#0b1120] rounded-2xl border border-darkborder p-4 space-y-4 mb-4 font-sans" dir="rtl">
            <div id="ai-empty-state" class="flex flex-col items-center justify-center h-full text-center gap-4">
              <div class="text-4xl">🤖</div>
              <h3 class="text-xl font-bold text-white">مرحباً! أنا مساعدك الذكي لـ X/Twitter</h3>
              <p class="text-slate-400 text-sm max-w-md">يمكنني البحث عن الترندات، تحليل التغريدات، متابعة/إلغاء متابعة الحسابات، نشر تغريدات، وإدارة حملاتك تلقائياً.</p>
              <div class="flex flex-wrap gap-2 justify-center mt-2">
                <button onclick="aiSendChip(this)" class="text-xs px-3 py-2 rounded-lg bg-darkcard border border-darkborder hover:border-brand-500 hover:text-brand-300 text-slate-300 transition-all">ما هي أدواتك؟</button>
                <button onclick="aiSendChip(this)" class="text-xs px-3 py-2 rounded-lg bg-darkcard border border-darkborder hover:border-brand-500 hover:text-brand-300 text-slate-300 transition-all">ما هي ترندات السعودية اليوم؟</button>
                <button onclick="aiSendChip(this)" class="text-xs px-3 py-2 rounded-lg bg-darkcard border border-darkborder hover:border-brand-500 hover:text-brand-300 text-slate-300 transition-all">ابحث عن تغريدات فيروسية عن الذكاء الاصطناعي</button>
                <button onclick="aiSendChip(this)" class="text-xs px-3 py-2 rounded-lg bg-darkcard border border-darkborder hover:border-brand-500 hover:text-brand-300 text-slate-300 transition-all">هل حساب @elonmusk موقوف؟</button>
              </div>
            </div>
          </div>
          <!-- Input -->
          <div class="flex gap-3 items-end">
            <textarea id="ai-input" rows="1" dir="rtl"
              placeholder="اكتب رسالتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
              class="flex-1 bg-darkcard border border-darkborder rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none transition-colors"
              onkeydown="aiHandleKey(event)" oninput="aiAutoResize(this)"></textarea>
            <button onclick="aiSend()" id="ai-send-btn"
              class="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap">
              <i class="fa-solid fa-paper-plane"></i> إرسال
            </button>
          </div>
        </div>
      `;
      // Populate accounts
      const cookieSelect = document.getElementById('ai-cookie');
      if (typeof xactionsAccounts !== 'undefined' && xactionsAccounts.length > 0) {
        xactionsAccounts.forEach(acc => {
          const flag = (typeof buildFlagEmoji === 'function') ? buildFlagEmoji(acc.country) : '';
          cookieSelect.insertAdjacentHTML('beforeend', `<option value="${acc.token}">${flag} ${acc.name}</option>`);
        });
      }

      // Load saved settings
      const s = aiGetSettings();
      if (s.baseUrl) document.getElementById('ai-base-url').value = s.baseUrl;
      if (s.apiKey) document.getElementById('ai-api-key').value = s.apiKey;
      if (s.model) document.getElementById('ai-model').value = s.model;
      if (s.cookie) document.getElementById('ai-cookie').value = s.cookie;
    }

    const AI_PRESETS = {
      groq:     { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
      openai:   { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
      deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
      anthropic:{ baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
      ollama:   { baseUrl: 'http://localhost:11434/v1', model: 'llama3.2', apiKey: 'ollama' },
    };

    function aiGetSettings() {
      return {
        baseUrl: localStorage.getItem('xa_baseUrl') || '',
        apiKey:  localStorage.getItem('xa_apiKey')  || '',
        model:   localStorage.getItem('xa_model')   || '',
        cookie:  localStorage.getItem('xa_cookie')  || '',
      };
    }

    function aiSaveSettings() {
      const bu = document.getElementById('ai-base-url')?.value.trim();
      const ak = document.getElementById('ai-api-key')?.value.trim();
      const mo = document.getElementById('ai-model')?.value.trim();
      const cookieSelect = document.getElementById('ai-cookie');
      
      if (bu) localStorage.setItem('xa_baseUrl', bu);
      if (ak) localStorage.setItem('xa_apiKey', ak);
      if (mo) localStorage.setItem('xa_model', mo);
      
      if (cookieSelect) {
        localStorage.setItem('xa_cookie', cookieSelect.value);
      }

      // Visual feedback
      const btn = event.target;
      btn.textContent = '✓ تم الحفظ';
      setTimeout(() => { btn.textContent = 'حفظ'; }, 1500);
    }

    function aiSetPreset(key) {
      const p = AI_PRESETS[key];
      if (!p) return;
      const buEl = document.getElementById('ai-base-url');
      const moEl = document.getElementById('ai-model');
      const akEl = document.getElementById('ai-api-key');
      if (buEl) buEl.value = p.baseUrl;
      if (moEl) moEl.value = p.model;
      if (p.apiKey && akEl && !akEl.value) akEl.value = p.apiKey;
    }

    function aiClearChat() {
      aiChatHistory = [];
      const msgs = document.getElementById('ai-chat-messages');
      if (!msgs) return;
      msgs.innerHTML = `
        <div id="ai-empty-state" class="flex flex-col items-center justify-center h-full text-center gap-4">
          <div class="text-4xl">🤖</div>
          <h3 class="text-xl font-bold text-white">المحادثة فارغة</h3>
          <p class="text-slate-400 text-sm">ابدأ محادثة جديدة مع الذكاء الاصطناعي</p>
        </div>`;
    }

    function aiSendChip(btn) {
      const inp = document.getElementById('ai-input');
      if (inp) { inp.value = btn.textContent.trim(); aiSend(); }
    }

    function aiHandleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); }
    }

    function aiAutoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }

    function aiEscHtml(str) {
      return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function aiFormatMd(text) {
      if (!text) return '';
      return text
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_,_l,c) => `<pre style="background:#0b1120;border:1px solid #334155;border-radius:8px;padding:10px;overflow-x:auto;font-size:.78rem;margin:8px 0">${c.trim()}</pre>`)
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.08);border-radius:4px;padding:1px 5px;color:#2dd4bf">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)$/gm, '• $1')
        .replace(/\n/g, '<br>');
    }

    function aiScrollDown() {
      const el = document.getElementById('ai-chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }

    function aiAppendUser(text) {
      document.getElementById('ai-empty-state')?.remove();
      const msgs = document.getElementById('ai-chat-messages');
      if (!msgs) return;
      msgs.insertAdjacentHTML('beforeend', `
        <div class="flex justify-start">
          <div class="max-w-[75%] bg-brand-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">${aiEscHtml(text).replace(/\n/g,'<br>')}</div>
        </div>`);
      aiScrollDown();
    }

    function aiAppendThinking() {
      document.getElementById('ai-empty-state')?.remove();
      const msgs = document.getElementById('ai-chat-messages');
      if (!msgs) return;
      msgs.insertAdjacentHTML('beforeend', `
        <div id="ai-thinking" class="flex justify-end gap-3 items-start">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-blue-600 flex items-center justify-center text-xs">🤖</div>
          <div class="bg-darkcard border border-darkborder rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-slate-400 flex gap-2 items-center">
            <span class="flex gap-1">
              <span style="animation:bounce 1.2s infinite;display:inline-block;width:6px;height:6px;border-radius:50%;background:#2dd4bf"></span>
              <span style="animation:bounce 1.2s .2s infinite;display:inline-block;width:6px;height:6px;border-radius:50%;background:#2dd4bf"></span>
              <span style="animation:bounce 1.2s .4s infinite;display:inline-block;width:6px;height:6px;border-radius:50%;background:#2dd4bf"></span>
            </span>
            جارٍ التفكير...
          </div>
        </div>`);
      aiScrollDown();
    }

    function aiAppendResponse(content, toolResults) {
      document.getElementById('ai-thinking')?.remove();
      const msgs = document.getElementById('ai-chat-messages');
      if (!msgs) return;
      let toolHtml = '';
      if (toolResults?.length) {
        toolHtml = toolResults.map((tr, i) => {
          const isErr = tr.result?.error;
          return `<div style="background:#0b1120;border:1px solid #334155;border-radius:10px;margin-bottom:8px;overflow:hidden">
            <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"
              style="padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;background:rgba(45,212,191,.06)">
              <span style="font-family:monospace;font-size:.75rem;color:#2dd4bf">🔧 ${aiEscHtml(tr.tool)}</span>
              <span style="margin-right:auto;font-size:.68rem;padding:2px 8px;border-radius:9999px;background:${isErr?'rgba(239,68,68,.15)':'rgba(34,197,94,.15)'};color:${isErr?'#ef4444':'#22c55e'}">${isErr ? '✗ خطأ' : '✓ تم'}</span>
              <span style="color:#64748b;font-size:.7rem">▼</span>
            </div>
            <div style="display:none;padding:10px 14px">
              <div style="font-size:.68rem;color:#64748b;text-transform:uppercase;margin-bottom:4px">المعاملات</div>
              <pre style="font-size:.72rem;color:#94a3b8;background:#0f172a;border-radius:6px;padding:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all">${aiEscHtml(JSON.stringify(tr.args, null, 2))}</pre>
              <div style="font-size:.68rem;color:#64748b;text-transform:uppercase;margin:8px 0 4px">النتيجة</div>
              <pre style="font-size:.72rem;color:#94a3b8;background:#0f172a;border-radius:6px;padding:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all">${aiEscHtml(JSON.stringify(tr.result, null, 2).substring(0, 1500))}${JSON.stringify(tr.result||'', null, 2).length > 1500 ? '\n...' : ''}</pre>
            </div>
          </div>`;
        }).join('');
      }
      msgs.insertAdjacentHTML('beforeend', `
        <div class="flex justify-end gap-3 items-start">
          <div style="max-width:78%">
            ${toolHtml}
            ${content ? `<div class="bg-darkcard border border-darkborder rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-slate-200 leading-relaxed">${aiFormatMd(content)}</div>` : ''}
            <div style="font-size:.68rem;color:#64748b;margin-top:4px;text-align:left">${new Date().toLocaleTimeString('ar-SA', {hour:'2-digit',minute:'2-digit'})}</div>
          </div>
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#2dd4bf,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0">🤖</div>
        </div>`);
      aiScrollDown();
    }

    function aiAppendError(msg) {
      document.getElementById('ai-thinking')?.remove();
      const msgs = document.getElementById('ai-chat-messages');
      if (!msgs) return;
      msgs.insertAdjacentHTML('beforeend', `
        <div class="flex justify-end gap-3 items-start">
          <div class="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-sm text-red-400">
            <strong>⚠️ خطأ:</strong> ${aiEscHtml(msg)}
          </div>
        </div>`);
      aiScrollDown();
    }

    async function aiSend() {
      const inp = document.getElementById('ai-input');
      if (!inp || aiChatLoading) return;
      const text = inp.value.trim();
      if (!text) return;
      const s = aiGetSettings();
      // Read current field values too (not yet saved)
      const buVal = document.getElementById('ai-base-url')?.value.trim() || s.baseUrl;
      const akVal = document.getElementById('ai-api-key')?.value.trim() || s.apiKey;
      const moVal = document.getElementById('ai-model')?.value.trim() || s.model;
      const cookieSelect = document.getElementById('ai-cookie');
      const ckVal = cookieSelect ? cookieSelect.value : s.cookie;
      if (!akVal) {
        aiAppendError('يرجى إدخال API Key أولاً في إعدادات الذكاء الاصطناعي أعلاه.');
        return;
      }
      inp.value = '';
      inp.style.height = 'auto';
      aiChatLoading = true;
      document.getElementById('ai-send-btn').disabled = true;
      aiAppendUser(text);
      aiChatHistory.push({ role: 'user', content: text });
      aiAppendThinking();
      try {
        const configParams = { 
          baseUrl: buVal || 'https://api.openai.com/v1', 
          apiKey: akVal, 
          model: moVal || 'gpt-4o-mini', 
          cookie: ckVal 
        };
        if (typeof xactionsAccounts !== 'undefined') {
          configParams.accounts = xactionsAccounts.map(a => ({ id: a.id, name: a.name, country: a.country, token: a.token }));
        }

        const res = await fetch('/api/ai-chat/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: aiChatHistory.slice(0, -1),
            config: configParams
          })
        });
        const data = await res.json();
        if (!res.ok) { aiAppendError(data.error || 'فشل الطلب'); return; }
        aiChatHistory.push({ role: 'assistant', content: data.content || '' });
        aiAppendResponse(data.content, data.toolResults);
      } catch(e) {
        aiAppendError(e.message);
      } finally {
        aiChatLoading = false;
        document.getElementById('ai-send-btn').disabled = false;
        document.getElementById('ai-input')?.focus();
      }
    }

