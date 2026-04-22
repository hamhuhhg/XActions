// js/features/campaigns.js
    // --- Campaigns Logic ---
    function renderCampaignBuilder(container) {
      container.innerHTML = `
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-bullhorn text-brand-400"></i> إعداد الحملة الجديدة
            </h3>
            <button type="button" onclick="openCampaignsManager()" class="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-2">
              <i class="fa-solid fa-list-ul"></i> إدارة الحملات السابقة
            </button>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">اسم الحملة</label>
              <input type="text" id="campaign-name" class="w-full bg-slate-900/50 border border-darkborder rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" placeholder="حملة العيد 2024">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">الجدولة (اختياري)</label>
              <input type="datetime-local" id="campaign-schedule" class="w-full bg-slate-900/50 border border-darkborder rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
            </div>
          </div>
          <div id="campaign-account-selector"></div>
          <div class="bg-darkcard border border-darkborder rounded-2xl overflow-hidden shadow-xl">
            <div class="flex border-b border-darkborder bg-slate-900/80 p-1">
              <button type="button" onclick="switchCampaignTab('tweets')" class="campaign-tab-btn flex-1 py-2.5 text-xs font-bold rounded-xl transition-all text-brand-400 bg-brand-500/10 active" data-tab="tweets"><i class="fa-solid fa-feather-pointed mr-1"></i> تغريدات</button>
              <button type="button" onclick="switchCampaignTab('replies')" class="campaign-tab-btn flex-1 py-2.5 text-xs font-bold rounded-xl transition-all text-slate-400 hover:text-white" data-tab="replies"><i class="fa-solid fa-reply mr-1"></i> ردود</button>
              <button type="button" onclick="switchCampaignTab('quotes')" class="campaign-tab-btn flex-1 py-2.5 text-xs font-bold rounded-xl transition-all text-slate-400 hover:text-white" data-tab="quotes"><i class="fa-solid fa-quote-left mr-1"></i> اقتباسات</button>
              <button type="button" onclick="switchCampaignTab('messages')" class="campaign-tab-btn flex-1 py-2.5 text-xs font-bold rounded-xl transition-all text-slate-400 hover:text-white" data-tab="messages"><i class="fa-solid fa-envelope mr-1"></i> رسائل</button>
            </div>
            <div class="p-6 min-h-[350px] bg-slate-900/40 text-right" dir="rtl">
              <div id="tab-tweets" class="campaign-tab-content space-y-4">
                <div id="tweets-list" class="space-y-3"></div>
                <button type="button" onclick="addCampaignRow('tweets')" class="w-full py-3 border-2 border-dashed border-darkborder rounded-xl text-slate-500 hover:text-brand-400 hover:border-brand-500/50 transition-all text-xs font-bold flex items-center justify-center gap-2">+ إضافة تغريدة جديدة</button>
              </div>
              <div id="tab-replies" class="campaign-tab-content hidden space-y-4">
                <div id="replies-list" class="space-y-3"></div>
                <button type="button" onclick="addCampaignRow('replies')" class="w-full py-3 border-2 border-dashed border-darkborder rounded-xl text-slate-500 hover:text-brand-400 hover:border-brand-500/50 transition-all text-xs font-bold flex items-center justify-center gap-2">+ إضافة رد استهدافي</button>
              </div>
              <div id="tab-quotes" class="campaign-tab-content hidden space-y-4">
                <div id="quotes-list" class="space-y-3"></div>
                <button type="button" onclick="addCampaignRow('quotes')" class="w-full py-3 border-2 border-dashed border-darkborder rounded-xl text-slate-500 hover:text-brand-400 hover:border-brand-500/50 transition-all text-xs font-bold flex items-center justify-center gap-2">+ إضافة اقتباس جديد</button>
              </div>
              <div id="tab-messages" class="campaign-tab-content hidden space-y-4">
                <div id="messages-list" class="space-y-3"></div>
                <button type="button" onclick="addCampaignRow('messages')" class="w-full py-3 border-2 border-dashed border-darkborder rounded-xl text-slate-500 hover:text-brand-400 hover:border-brand-500/50 transition-all text-xs font-bold flex items-center justify-center gap-2">+ إضافة رسالة خاصة</button>
              </div>
            </div>
          </div>
          <div class="flex gap-3">
            <button type="button" onclick="saveCampaignToDb()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2">
              <i class="fa-solid fa-save"></i> حفظ المسودة
            </button>
            <button type="button" onclick="runCampaignNow(event)" class="flex-[2] bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5">
              <i class="fa-solid fa-play"></i> تشغيل الحملة الآن
            </button>
          </div>
        </div>
          `;
      const accPlaceholder = document.getElementById('campaign-account-selector');
      let filterOptions = '<option value="all">جميع الدول</option>';
      allCountries.forEach(c => filterOptions += `<option value="${c.code}">${c.flag} ${c.name}</option>`);
      accPlaceholder.innerHTML = `
          <div class="mb-4 border border-darkborder rounded-xl bg-slate-900/40 overflow-hidden">
          <div class="bg-slate-900 px-4 py-2 border-b border-darkborder flex items-center justify-between">
            <h4 class="text-sm font-semibold text-white flex items-center gap-2"><i class="fa-solid fa-users text-brand-400"></i> الحسابات المشاركة</h4>
            <select id="campaign-acc-filter" onchange="filterToolAccounts(this.value)" class="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 outline-none">${filterOptions}</select>
          </div>
          <div class="p-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar text-right" id="campaign-accounts-list" dir="rtl">
            ${xactionsAccounts.map(acc => `
              <label class="flex items-center gap-3 hover:bg-slate-800/50 p-2 rounded-lg cursor-pointer transition-colors tool-account-row" data-country="${acc.country || 'global'}">
                <input type="checkbox" name="target_accounts" value="${acc.id}" class="w-4 h-4 text-brand-500 bg-slate-900 border-darkborder rounded account-checkbox">
                <span class="text-xs text-slate-300">${buildFlagEmoji(acc.country)} ${acc.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
          `;
      addCampaignRow('tweets');
    }

    function switchCampaignTab(tabId) {
      document.querySelectorAll('.campaign-tab-content').forEach(el => el.classList.add('hidden'));
      document.getElementById(`tab-${tabId}`).classList.remove('hidden');
      document.querySelectorAll('.campaign-tab-btn').forEach(btn => {
        btn.className = btn.className.replace('active bg-brand-500/10 text-brand-400', 'text-slate-400').replace('text-slate-400', 'text-slate-400');
        if (btn.dataset.tab === tabId) btn.className = btn.className.replace('text-slate-400', 'active bg-brand-500/10 text-brand-400');
      });
    }

    function updateCampaignTargetOptions() {
      const tweets = Array.from(document.querySelectorAll('#tweets-list > div')).map(row => ({
        id: row.querySelector('.camp-ref-id').value,
        text: row.querySelector('.camp-text').value.substring(0, 30) + '...'
      }));

      document.querySelectorAll('.camp-target-select').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- اختر التغريدة المستهدفة --</option>' +
          tweets.map(t => `<option value="${t.id}">${t.id}: ${t.text}</option>`).join('') +
          '<option value="manual">-- إدخال رابط يدوي --</option>';
        if (Array.from(select.options).some(opt => opt.value === currentVal)) select.value = currentVal;
      });
    }

    function addCampaignRow(type, initialData = null) {
      const container = document.getElementById(`${type}-list`);
      const rowId = 'row-' + Math.random().toString(36).substr(2, 9);
      const div = document.createElement('div');
      div.className = 'p-4 bg-slate-900/60 border border-darkborder rounded-xl relative group animate-fade-in-up text-right';
      div.id = rowId;
      div.dir = 'rtl';

      let refId = initialData?.refId || '';
      if (type === 'tweets' && !refId) {
        const count = document.querySelectorAll('#tweets-list > div').length + 1;
        refId = `t${count}`;
      }

      const idField = `<input type="text" class="bg-slate-800/50 border border-darkborder rounded px-2 py-0.5 text-[10px] text-slate-400 focus:outline-none focus:border-brand-500 w-20 camp-ref-id" placeholder="t1" value="${refId}" dir="ltr" oninput="updateCampaignTargetOptions()">`;
      const textVal = initialData?.text || '';

      let inputHtml = '';
      if (type === 'tweets') {
        inputHtml = `
          <div class="flex justify-between items-center mb-2">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">تغريدة جديدة</span>
            ${idField}
          </div>
          <textarea class="w-full bg-transparent border-none text-sm text-white focus:ring-0 p-0 resize-none camp-text" placeholder="ماذا تريد أن تغرد؟" rows="2" oninput="updateCampaignTargetOptions()">${textVal}</textarea>
        `;
      } else if (type === 'messages') {
        const targetVal = initialData?.target || '';
        inputHtml = `
          <div class="flex justify-between items-center mb-2">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">رسالة خاصة</span>
          </div>
          <input type="text" class="w-full bg-transparent border-none text-[11px] text-brand-400 focus:ring-0 p-0 mb-1 camp-target" placeholder="اسم المستخدم المرسل إليه..." dir="ltr" value="${targetVal}">
            <textarea class="w-full bg-transparent border-none text-sm text-white focus:ring-0 p-0 resize-none camp-text" placeholder="نص الرسالة..." rows="2">${textVal}</textarea>
            `;
      } else {
        // Replies or Quotes
        let targetVal = initialData?.target || '';
        let isManual = false;
        let selectedRef = '';
        if (targetVal.startsWith('{{ ') && targetVal.endsWith('}}')) {
          selectedRef = targetVal.slice(2, -2);
          targetVal = '';
        } else if (targetVal) {
          isManual = true;
        }

        inputHtml = `
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">${type === 'replies' ? 'رد استهدافي' : 'اقتباس استهدافي'}</span>
            </div>
            <div class="space-y-2 mb-2">
              <select class="w-full bg-slate-800/50 border border-darkborder rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 camp-target-select" onchange="this.nextElementSibling.style.display = (this.value === 'manual' ? 'block' : 'none')">
                <option value="">-- تحميل التغريدات... --</option>
                ${isManual ? '<option value="manual" selected>-- إدخال رابط يدوي --</option>' : ''}
                ${selectedRef ? `<option value="${selectedRef}" selected>${selectedRef}</option>` : ''}
              </select>
              <input type="text" class="w-full bg-transparent border border-darkborder/50 rounded-lg px-2 py-1 text-[11px] text-brand-400 focus:ring-0 camp-target ${isManual ? '' : 'hidden'}" placeholder="رابط التغريدة (URL)..." dir="ltr" value="${targetVal}">
            </div>
            <textarea class="w-full bg-transparent border-none text-sm text-white focus:ring-0 p-0 resize-none camp-text" placeholder="نص المحتوى..." rows="2">${textVal}</textarea>
            `;
      }

      const trendConfigHtml = type !== 'messages' ? `
          <div class="mt-2 text-right border-t border-darkborder/30 pt-2">
            <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-300 w-max">
              <input type="checkbox" class="camp-trend-enabled rounded bg-slate-900 border-darkborder text-brand-500 w-3.5 h-3.5" onchange="this.parentElement.nextElementSibling.style.display = this.checked ? 'flex' : 'none'" ${initialData?.trendConfig?.enabled ? 'checked' : ''}>
              إضافة هاشتاقات ترند تلقائياً
            </label>
            <div class="flex gap-2 mt-2 items-center" style="display: ${initialData?.trendConfig?.enabled ? 'flex' : 'none'};">
              <select class="camp-trend-country bg-slate-800/50 border border-darkborder rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-brand-500 w-32">
                 ${window.trendCountries ? window.trendCountries.map(c => `<option value="${c.slug}" ${initialData?.trendConfig?.country === c.slug ? 'selected' : ''}>${c.name}</option>`).join('') : '<option value="worldwide">Worldwide</option>'}
              </select>
              <input type="number" min="1" max="20" class="camp-trend-count bg-slate-800/50 border border-darkborder rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-brand-500 w-16 text-center" value="${initialData?.trendConfig?.count || 3}">
              <span class="text-[10px] text-slate-500">عدد الهاشتاقات</span>
            </div>
          </div>
      ` : '';

      div.innerHTML = `${inputHtml}
          ${trendConfigHtml}
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-darkborder/30">
              <input type="hidden" class="camp-media-path" value="${initialData?.media || ''}">
                <input type="file" id="media-upload-${rowId}" class="hidden" accept="image/*,video/*" onchange="handleCampaignMediaUpload(event, '${rowId}')">
                  <label for="media-upload-${rowId}" id="media-btn-${rowId}" class="cursor-pointer text-[10px] ${initialData?.media ? 'text-brand-400 font-bold' : 'text-slate-500 hover:text-brand-400'} flex items-center gap-1 transition-colors">
                    <i class="fa-regular ${initialData?.media ? 'fa-image' : 'fa-image'}"></i>
                    <span class="btn-text">${initialData?.media ? 'صورة مرفقة' : 'صورة'}</span>
                  </label>
                  <button type="button" onclick="document.getElementById('${rowId}').remove(); updateCampaignTargetOptions();" class="text-rose-500/50 hover:text-rose-500"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>`;
      container.appendChild(div);

      updateCampaignTargetOptions();
    }

    async function handleCampaignMediaUpload(event, rowId) {
      const file = event.target.files[0];
      if (!file) return;

      const btn = document.getElementById(`media-btn-${rowId}`);
      const btnText = btn.querySelector('.btn-text');
      const icon = btn.querySelector('i');
      const hiddenInput = document.querySelector(`#${rowId} .camp-media-path`);

      const originalText = btnText.innerText;

      try {
        btnText.innerText = 'جاري الرفع...';
        icon.className = 'fa-solid fa-spinner fa-spin';
        btn.classList.add('opacity-50', 'cursor-not-allowed');

        const extension = file.name.split('.').pop();

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const fileBase64 = reader.result;

          try {
            const res = await fetch('/api/new_api/upload_media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64, extension })
            });
            const result = await res.json();

            if (result.success) {
              hiddenInput.value = result.filePath;
              btnText.innerText = 'صورة مرفقة';
              icon.className = 'fa-regular fa-image';
              btn.className = 'text-[10px] text-brand-400 font-bold flex items-center gap-1 transition-colors';
            } else {
              alert('فشل رفع الملف: ' + result.error);
              btnText.innerText = originalText;
              icon.className = 'fa-regular fa-image';
              btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
          } catch (err) {
            alert('فشل الاتصال بالخادم أثناء الرفع');
            btnText.innerText = originalText;
            icon.className = 'fa-regular fa-image';
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
          }
        };
        reader.onerror = error => {
          alert('فشل قراءة الملف: ' + error);
          btnText.innerText = originalText;
          icon.className = 'fa-regular fa-image';
          btn.classList.remove('opacity-50', 'cursor-not-allowed');
        };
      } catch (error) {
        console.error("Error converting file:", error);
      }
    }

    async function saveCampaignToDb() {
      const name = document.getElementById('campaign-name').value;
      if (!name) {
        alert('يرجى إدخال اسم للحملة');
        return null;
      }
      const accounts = Array.from(document.querySelectorAll('#campaign-accounts-list .account-checkbox:checked')).map(cb => cb.value);

      const extract = (typeId) => Array.from(document.querySelectorAll(`#${typeId}-list > div`)).map(row => {
        const select = row.querySelector('.camp-target-select');
        let target = row.querySelector('.camp-target')?.value;
        if (select && select.value && select.value !== 'manual') {
          target = `{{${select.value}}}`;
        }

        let trendConfig = null;
        if (typeId !== 'messages') {
          const trendCheckbox = row.querySelector('.camp-trend-enabled');
          if (trendCheckbox) {
            trendConfig = {
              enabled: trendCheckbox.checked,
              country: row.querySelector('.camp-trend-country')?.value || 'worldwide',
              count: parseInt(row.querySelector('.camp-trend-count')?.value || '3', 10)
            };
          }
        }

        return {
          refId: row.querySelector('.camp-ref-id')?.value?.trim(),
          text: row.querySelector('.camp-text')?.value,
          target: target,
          media: row.querySelector('.camp-media-path')?.value || null,
          trendConfig: trendConfig
        };
      }).filter(c => (c.text && c.text.trim()) || (c.target && c.target.trim()) || c.media);

      const campaignData = {
        id: editingCampaignId,
        name,
        schedule: document.getElementById('campaign-schedule').value || null,
        config: { target_accounts: accounts },
        content: {
          tweets: extract('tweets'),
          replies: extract('replies'),
          quotes: extract('quotes'),
          messages: extract('messages')
        }
      };
      try {
        const res = await fetch('/api/new_api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campaignData) });
        const result = await res.json();
        if (result.success) {
          alert('تم حفظ الحملة بنجاح!');
          editingCampaignId = result.data.id; // Store ID for future updates
          return result.data;
        } else {
          alert('خطأ: ' + result.error);
          return null;
        }
      } catch (e) {
        alert('فشل الاتصال بالخادم');
        return null;
      }
    }

    function openCampaignsManager() {
      document.getElementById('campaigns-modal').classList.remove('hidden');
      loadCampaignsList();
    }

    function closeCampaignsManager() {
      document.getElementById('campaigns-modal').classList.add('hidden');
    }

    async function loadCampaignsList() {
      const container = document.getElementById('campaigns-list-container');
      container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin text-2xl mb-4 block"></i>جاري تحميل الحملات...</div>';

      try {
        const res = await fetch('/api/new_api/campaigns');
        const result = await res.json();
        if (result.success) {
          if (result.data.length === 0) {
            container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500">لا توجد حملات محفوظة بعد.</div>';
            return;
          }
          container.innerHTML = '';
          result.data.forEach(camp => {
            const card = document.createElement('div');
            card.className = "bg-slate-900/60 border border-darkborder p-4 rounded-2xl flex flex-col justify-between gap-4 group hover:border-brand-500/50 transition-all";
            card.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                  <div class="overflow-hidden">
                    <h4 class="font-bold text-white truncate text-sm" title="${camp.name}">${camp.name}</h4>
                    <p class="text-[10px] text-slate-500 font-mono mt-0.5">${new Date(camp.createdAt).toLocaleDateString('ar-EG')} - ${camp.status || 'draft'}</p>
                  </div>
                  <div class="flex gap-1.5 shrink-0">
                    <button onclick="quickRunCampaign('${camp.id}')" class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center border border-emerald-500/20" title="تشغيل الآن">
                      <i class="fa-solid fa-play text-[10px]"></i>
                    </button>
                    <button onclick="editCampaign('${camp.id}')" class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center border border-blue-500/20" title="تعديل">
                      <i class="fa-solid fa-pen text-[10px]"></i>
                    </button>
                    <button onclick="deleteCampaignFromList('${camp.id}')" class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-rose-500/20" title="حذف">
                      <i class="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </div>
                `;
            container.appendChild(card);
          });
        }
      } catch (e) {
        container.innerHTML = '<div class="col-span-full py-12 text-center text-rose-400">فشل تحميل الحملات.</div>';
      }
    }

    async function editCampaign(id) {
      try {
        // We fetch the full list or single if API supported, but here list works
        const res = await fetch('/api/new_api/campaigns');
        const result = await res.json();
        const camp = result.data.find(c => c.id === id);
        if (!camp) return alert('الحملة غير موجودة');

        // Populate builder
        editingCampaignId = camp.id;
        document.getElementById('campaign-name').value = camp.name;
        document.getElementById('campaign-schedule').value = camp.schedule ? camp.schedule.slice(0, 16) : '';

        const config = JSON.parse(camp.config || '{ }');
        const content = JSON.parse(camp.content || '{ }');

        // Reset and Populate Tabs
        ['tweets', 'replies', 'quotes', 'messages'].forEach(type => {
          const list = document.getElementById(`${type}-list`);
          list.innerHTML = '';
          if (content[type] && Array.isArray(content[type])) {
            content[type].forEach(row => {
              addCampaignRow(type, row);
            });
          }
        });

        // Select Accounts
        const accountsList = document.querySelectorAll('#campaign-accounts-list .account-checkbox');
        const targetAccs = config.target_accounts || [];
        accountsList.forEach(cb => {
          cb.checked = targetAccs.includes(cb.value);
        });

        closeCampaignsManager();
        alert('تم تحميل الحملة للمحرر بنجاح!');
      } catch (e) {
        console.error(e);
        alert('خطأ في تحميل الحملة');
      }
    }

    async function quickRunCampaign(id) {
      if (!confirm('هل تريد تشغيل هذه الحملة في الخلفية الآن؟')) return;
      try {
        await syncAccountsWithDb();
        const res = await fetch(`/api/new_api/campaigns/${id}/execute`, { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          alert('بدأ تنفيذ الحملة في الخلفية بنجاح!');
          closeCampaignsManager();
        } else {
          alert('خطأ: ' + result.error);
        }
      } catch (e) {
        alert('فشل بدء الحملة');
      }
    }

    async function deleteCampaignFromList(id) {
      if (!confirm('هل أنت متأكد من حذف هذه الحملة نهائياً؟')) return;
      try {
        const res = await fetch(`/api/new_api/campaigns/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          loadCampaignsList();
        } else {
          alert('خطأ في الحذف');
        }
      } catch (e) {
        alert('فشل الاتصال بالخادم');
      }
    }

    async function runCampaignNow(event) {
      const btn = event.currentTarget;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري البدء...';

      try {
        await syncAccountsWithDb();
        const campaign = await saveCampaignToDb();
        if (!campaign) return;

        const res = await fetch(`/api/new_api/campaigns/${campaign.id}/execute`, { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          alert('بدأ تنفيذ الحملة في الخلفية بنجاح!');
        } else {
          alert('خطأ: ' + result.error);
        }
      } catch (e) {
        alert('فشل بدء الحملة');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }

