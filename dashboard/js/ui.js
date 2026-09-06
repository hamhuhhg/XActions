// js/ui.js

// Platform Switcher
function setMainPlatform(platform) {
  currentMainPlatform = platform;

  const tabTwitter = document.getElementById('platform-tab-twitter');
  const tabFacebook = document.getElementById('platform-tab-facebook');
  const logoIcon = document.getElementById('sidebar-logo-icon');
  const logoBadge = document.getElementById('sidebar-logo-badge');
  const logoSub = document.getElementById('sidebar-logo-sub');
  const aiSection = document.getElementById('sidebar-section-ai');

  if (platform === 'twitter') {
    if (tabTwitter) {
      tabTwitter.className = "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-sm";
    }
    if (tabFacebook) {
      tabFacebook.className = "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white border border-transparent";
    }
    if (logoIcon) logoIcon.className = "fa-brands fa-x-twitter text-white text-xl";
    if (logoBadge) logoBadge.className = "w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-blue-600 flex items-center justify-center shadow-lg shadow-brand-500/20 transition-all";
    if (logoSub) logoSub.innerText = "أدوات تويتر (X)";
  } else {
    if (tabFacebook) {
      tabFacebook.className = "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm";
    }
    if (tabTwitter) {
      tabTwitter.className = "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white border border-transparent";
    }
    if (logoIcon) logoIcon.className = "fa-brands fa-facebook text-white text-xl";
    if (logoBadge) logoBadge.className = "w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all";
    if (logoSub) logoSub.innerText = "أدوات فيسبوك";
  }

  if (aiSection) aiSection.classList.remove('hidden');

  // Also set account manager platform
  if (typeof setAccountPlatform === 'function') {
    setAccountPlatform(platform);
  } else if (typeof currentAccountPlatform !== 'undefined') {
    currentAccountPlatform = platform;
  }

  // If a tool was open from another platform, return to welcome state
  if (currentToolId && tools[currentToolId]) {
    const toolPlatform = tools[currentToolId].platform || 'twitter';
    if (toolPlatform !== platform && toolPlatform !== 'all') {
      document.getElementById('tool-workspace').classList.add('hidden');
      document.getElementById('welcome-state').classList.remove('hidden');
      document.getElementById('current-tool-title').innerHTML = '<i class="fa-solid fa-bolt text-brand-400"></i> اختر أداة';
      document.getElementById('current-tool-desc').innerText = 'اختر أداة من الشريط الجانبي للبدء.';
      currentToolId = null;
    }
  }

  renderSidebarNav();
  updateWelcomeState(platform);
}

function updateWelcomeState(platform) {
  const welcomeTitle = document.getElementById('welcome-title');
  const welcomeSubtitle = document.getElementById('welcome-subtitle');
  const welcomeIcon = document.getElementById('welcome-icon');
  const welcomeIconGlow = document.getElementById('welcome-icon-glow');
  const cardsContainer = document.getElementById('welcome-cards-container');

  if (!welcomeTitle || !cardsContainer) return;

  if (platform === 'facebook') {
    welcomeTitle.innerText = 'مرحباً بك في أدوات فيسبوك المتقدمة';
    welcomeSubtitle.innerText = 'استخراج الملفات الشخصية والمجموعات وأتمتة النشر والتفاعل على فيسبوك بدون حظر.';
    if (welcomeIcon) welcomeIcon.className = 'fa-brands fa-facebook text-4xl text-blue-400';
    if (welcomeIconGlow) welcomeIconGlow.className = 'absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 animate-pulse-slow';
    
    cardsContainer.innerHTML = `
      <div class="bg-darkcard p-4 rounded-xl border border-darkborder flex items-start gap-4 text-right">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <i class="fa-brands fa-facebook text-lg"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">إدارة حسابات فيسبوك</h3>
            <p class="text-xs text-slate-400">احفظ كوكيز الجلسة وقم بإدارتها بأمان</p>
          </div>
        </div>
      </div>
      <div class="bg-darkcard p-4 rounded-xl border border-darkborder flex items-start gap-4 text-right">
        <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <i class="fa-solid fa-id-card text-blue-400"></i>
        </div>
        <div>
          <h3 class="text-white font-medium">استخراج البروفايلات والمجموعات</h3>
          <p class="text-xs text-slate-400 mt-1">جلب المنشورات، النبذة، المتابعين، والأصدقاء بدقة.</p>
        </div>
      </div>
    `;
  } else {
    welcomeTitle.innerText = 'مرحباً بك في أدوات XActions المتقدمة';
    welcomeSubtitle.innerText = 'نفذ عمليات استخراج وأتمتة قوية مباشرة من متصفحك دون الحاجة لسطر الأوامر.';
    if (welcomeIcon) welcomeIcon.className = 'fa-solid fa-wand-magic-sparkles text-4xl text-brand-400';
    if (welcomeIconGlow) welcomeIconGlow.className = 'absolute inset-0 bg-brand-500 rounded-2xl blur-xl opacity-20 animate-pulse-slow';
    
    cardsContainer.innerHTML = `
      <div class="bg-darkcard p-4 rounded-xl border border-darkborder flex items-start gap-4 text-right">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <i class="fa-solid fa-users text-lg"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">إدارة حسابات X.com</h3>
            <p class="text-xs text-slate-400">أضف حسابات تويتر لاستخدامها في الأتمتة</p>
          </div>
        </div>
      </div>
      <div class="bg-darkcard p-4 rounded-xl border border-darkborder flex items-start gap-4 text-right">
        <div class="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
          <i class="fa-solid fa-robot text-brand-400"></i>
        </div>
        <div>
          <h3 class="text-white font-medium">أتمتة الإجراءات</h3>
          <p class="text-xs text-slate-400 mt-1">الإعجاب التلقائي، إلغاء المتابعة الجماعي، والنمو الذكي.</p>
        </div>
      </div>
    `;
  }
}

// Setup Sidebar Menu filtered by platform
function renderSidebarNav() {
  const scrapersNav = document.getElementById('nav-scrapers');
  const automationNav = document.getElementById('nav-automation');
  const aiNav = document.getElementById('nav-ai');
  
  if (scrapersNav) scrapersNav.innerHTML = '';
  if (automationNav) automationNav.innerHTML = '';
  if (aiNav) aiNav.innerHTML = '';

  const activePlatform = typeof currentMainPlatform !== 'undefined' ? currentMainPlatform : 'twitter';

  const platformTools = Object.values(tools).filter(tool => {
    const toolPlatform = tool.platform || 'twitter';
    return toolPlatform === activePlatform || toolPlatform === 'all';
  });

  platformTools.forEach(tool => {
    const navItem = document.createElement('a');
    navItem.href = '#';
    const colorClass = tool.type === 'action'
      ? 'hover:bg-rose-500/10 hover:text-rose-400 text-slate-400'
      : tool.type === 'ai'
      ? 'hover:bg-brand-500/15 hover:text-brand-300 text-slate-300'
      : 'hover:bg-brand-500/10 hover:text-brand-400 text-slate-400';
    navItem.className = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${colorClass}`;
    navItem.id = `nav-item-${tool.id}`;
    navItem.onclick = (e) => { e.preventDefault(); selectTool(tool.id); };
    navItem.innerHTML = `
      <i class="${tool.icon} w-5 text-center ${tool.color} opacity-70"></i>
      ${tool.title}
      ${tool.requiresAuth ? '<i class="fa-solid fa-lock text-[10px] ml-auto opacity-50"></i>' : ''}
    `;
    if (tool.type === 'scraper' && scrapersNav) scrapersNav.appendChild(navItem);
    else if (tool.type === 'ai' && aiNav) aiNav.appendChild(navItem);
    else if (automationNav) automationNav.appendChild(navItem);
  });
}

// Handle Tool Selection
function selectTool(toolId) {
  currentToolId = toolId;
  const tool = tools[toolId];
  if (!tool) return;

  // UI Updates
  document.getElementById('welcome-state').classList.add('hidden');
  document.getElementById('tool-workspace').classList.remove('hidden');
  document.getElementById('current-tool-title').innerHTML = `<i class="${tool.icon} ${tool.color}"></i> ${tool.title}`;
  document.getElementById('current-tool-desc').innerText = tool.desc;

  // Build Form
  const form = document.getElementById('dynamic-form');
  form.innerHTML = ''; // Clear existing

  if (tool.isSpecialized && (tool.id === 'campaigns' || tool.id === 'fbCampaigns')) {
    const platform = tool.platform || (tool.id === 'fbCampaigns' ? 'facebook' : 'twitter');
    renderCampaignBuilder(form, platform);
    document.getElementById('run-btn').classList.add('hidden');
    return;
  } else if (tool.isSpecialized && tool.id === 'trendExtractor') {
    renderTrendExtractor(form);
    document.getElementById('run-btn').classList.add('hidden');
    return;
  } else if (tool.isSpecialized && tool.id === 'aiChat') {
    renderAiChat();
    document.getElementById('run-btn').classList.add('hidden');
    return;
  } else {
    document.getElementById('run-btn').classList.remove('hidden');
  }

  // Inject Account Selection if needed
  if (tool.requiresAuth) {
    const accWrapper = document.createElement('div');
    accWrapper.className = 'mb-4 border border-darkborder rounded-xl bg-slate-900/40 overflow-hidden';
    const header = document.createElement('div');
    header.className = 'bg-slate-900 px-4 py-2 border-b border-darkborder flex items-center justify-between';

    // Build the options string for the country filter
    let filterOptions = '<option value="all">جميع الدول</option><option value="global">🌍 غير محدد</option>';
    allCountries.forEach(c => {
      filterOptions += `<option value="${c.code}">${c.flag} ${c.name}</option>`;
    });

    header.innerHTML = `
      <h4 class="text-sm font-semibold text-white flex items-center gap-2"><i class="fa-solid fa-users text-brand-400"></i> الحسابات المستهدفة</h4>
      <div class="flex items-center gap-3">
        <select id="tool-accounts-filter" onchange="filterToolAccounts(this.value)" class="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-brand-500 appearance-none pr-6 pl-2 bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_8px] bg-[position:right_6px_center]">
          ${filterOptions}
        </select>
        <button type="button" onclick="selectAllAccounts()" class="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline transition-colors flex items-center gap-1"><i class="fa-solid fa-check-double"></i> تحديد الكل</button>
      </div>
    `;
    accWrapper.appendChild(header);
    const listDiv = document.createElement('div');
    listDiv.className = 'p-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar';
    
    const toolPlatform = tool.platform || 'twitter';
    const filteredToolAccounts = xactionsAccounts.filter(a => (a.platform || 'twitter') === toolPlatform);
    
    if (filteredToolAccounts.length === 0) {
      listDiv.innerHTML = '<p class="text-xs text-slate-500 text-center py-2">لا يوجد حسابات لهذه المنصة. يرجى إضافتها من إدارة الحسابات العلوية.</p>';
    } else {
      filteredToolAccounts.forEach(acc => {
        const lbl = document.createElement('label');
        const flag = buildFlagEmoji(acc.country);
        lbl.className = 'flex items-center gap-3 hover:bg-slate-800/50 p-2 rounded-lg cursor-pointer transition-colors tool-account-row';
        lbl.dataset.country = acc.country || 'global';
        lbl.innerHTML = `
          <input type="checkbox" name="target_accounts" value="${acc.id}" class="w-4 h-4 text-brand-500 bg-slate-900 border-darkborder rounded focus:ring-brand-500 focus:ring-offset-darkcard account-checkbox">
          <span class="text-sm font-medium text-slate-300 select-none">${flag} ${acc.name}</span>
        `;
        listDiv.appendChild(lbl);
      });
    }
    accWrapper.appendChild(listDiv);
    form.appendChild(accWrapper);
  }

  (tool.inputs || []).forEach(input => {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5';
    label.innerText = input.label;
    wrapper.appendChild(label);
    let inputEl;
    if (input.type === 'select') {
      inputEl = document.createElement('select');
      inputEl.className = 'w-full bg-slate-900/50 border border-darkborder rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:bg-slate-900 transition-colors appearance-none';
      input.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.innerText = opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ');
        if (opt === input.defaultValue) option.selected = true;
        inputEl.appendChild(option);
      });
    } else if (input.type === 'textarea-list') {
      const listWrapper = document.createElement('div');
      listWrapper.id = `textarea-list-${input.id}`;
      listWrapper.className = 'flex flex-col gap-3';
      const addTextArea = () => {
        const areaWrap = document.createElement('div');
        areaWrap.className = 'relative group';
        const area = document.createElement('textarea');
        area.className = 'w-full bg-slate-900/50 border border-darkborder rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors resize-y min-h-[80px] textarea-list-item';
        area.placeholder = 'ماذا يحدث حالياً؟!';
        const removeBtn = document.createElement('button');
        removeBtn.className = 'absolute top-2 right-2 text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 rounded-md p-1';
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark text-xs"></i>';
        removeBtn.onclick = (e) => { e.preventDefault(); areaWrap.remove(); };
        areaWrap.appendChild(area);
        areaWrap.appendChild(removeBtn);
        listWrapper.appendChild(areaWrap);
      };
      // Add first initial textarea
      addTextArea();
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'self-start mt-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md transition-colors flex items-center gap-2';
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> إضافة تغريدة أخرى';
      addBtn.onclick = addTextArea;
      wrapper.appendChild(listWrapper);
      wrapper.appendChild(addBtn);
      inputEl = listWrapper; // Dummy assignment so it gets appended below
    } else if (input.type === 'checkbox') {
      wrapper.className = 'flex items-center gap-3 bg-slate-900/30 p-3 rounded-lg border border-darkborder/50';
      inputEl = document.createElement('input');
      inputEl.type = 'checkbox';
      inputEl.className = 'w-4 h-4 text-brand-500 bg-slate-900 border-darkborder rounded focus:ring-brand-500 focus:ring-offset-darkcard focus:ring-2';
      inputEl.checked = input.defaultValue;
      wrapper.innerHTML = '';
      wrapper.appendChild(inputEl);
      const chkLabel = document.createElement('label');
      chkLabel.className = 'text-sm font-medium text-slate-300 select-none cursor-pointer';
      chkLabel.innerText = input.label;
      wrapper.appendChild(chkLabel);
    } else if (input.type === 'textarea') {
      inputEl = document.createElement('textarea');
      inputEl.rows = 4;
      inputEl.className = 'w-full bg-slate-900/50 border border-darkborder rounded-lg p-3 text-sm text-white focus:outline-none focus:border-brand-500 focus:bg-slate-900 transition-colors placeholder-slate-600 resize-y';
      inputEl.placeholder = input.placeholder || '';
      if (input.defaultValue !== undefined) inputEl.value = input.defaultValue;
      wrapper.appendChild(inputEl);
    } else if (input.type === 'image-upload') {
      const uploadContainer = document.createElement('div');
      uploadContainer.className = 'flex flex-col gap-2.5';

      inputEl = document.createElement('input');
      inputEl.type = 'hidden';
      inputEl.id = `input-${input.id}`;
      inputEl.name = input.id;
      if (input.required) inputEl.required = true;

      const filePicker = document.createElement('input');
      filePicker.type = 'file';
      filePicker.accept = 'image/*';
      filePicker.className = 'hidden';
      filePicker.id = `filepicker-${input.id}`;

      const dropZone = document.createElement('div');
      dropZone.className = 'border-2 border-dashed border-darkborder hover:border-brand-500/60 bg-slate-900/40 hover:bg-slate-900/70 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all text-center group';
      dropZone.innerHTML = `
        <div class="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          <i class="fa-solid fa-cloud-arrow-up text-lg"></i>
        </div>
        <span class="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">اضغط لاختيار صورة من جهازك</span>
        <span class="text-[10px] text-slate-500 mt-1">PNG, JPG, JPEG, WEBP</span>
      `;
      dropZone.onclick = () => filePicker.click();

      const urlInputWrap = document.createElement('div');
      urlInputWrap.className = 'relative flex items-center';
      const urlIcon = document.createElement('i');
      urlIcon.className = 'fa-solid fa-link absolute left-3 text-slate-500 text-xs';
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.placeholder = input.placeholder || 'أو الصق رابط صورة (URL) مباشرة...';
      urlInput.className = 'w-full bg-slate-900/50 border border-darkborder rounded-lg py-2 text-xs text-white focus:outline-none focus:border-brand-500 focus:bg-slate-900 transition-colors pl-8 pr-3 placeholder-slate-600';
      urlInputWrap.appendChild(urlIcon);
      urlInputWrap.appendChild(urlInput);

      const previewCard = document.createElement('div');
      previewCard.className = 'hidden relative rounded-xl overflow-hidden border border-darkborder bg-slate-950 p-2 flex items-center gap-3';
      previewCard.innerHTML = `
        <img class="w-16 h-16 object-cover rounded-lg border border-darkborder/60 bg-slate-900 shrink-0" src="" alt="preview">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-white truncate preview-filename">صورة مرفقة</p>
          <p class="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5"><i class="fa-solid fa-circle-check text-[8px]"></i> جاهزة للنشر</p>
        </div>
        <button type="button" class="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="إزالة الصورة">
          <i class="fa-regular fa-trash-can text-sm"></i>
        </button>
      `;
      const previewImg = previewCard.querySelector('img');
      const previewName = previewCard.querySelector('.preview-filename');
      const removeBtn = previewCard.querySelector('button');

      const clearImage = () => {
        inputEl.value = '';
        filePicker.value = '';
        urlInput.value = '';
        previewImg.src = '';
        previewCard.classList.add('hidden');
        dropZone.classList.remove('hidden');
      };

      removeBtn.onclick = clearImage;

      filePicker.onchange = async () => {
        const file = filePicker.files[0];
        if (!file) return;

        const originalDropHtml = dropZone.innerHTML;
        dropZone.innerHTML = `
          <div class="flex items-center gap-2 text-xs text-brand-400 py-2">
            <i class="fa-solid fa-spinner fa-spin text-sm"></i> جاري رفع ومعالجة الصورة...
          </div>
        `;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const fileBase64 = reader.result;
            const extension = file.name.split('.').pop() || 'jpg';
            const res = await fetch('/api/new_api/upload_media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64, extension })
            });
            const result = await res.json();
            if (result.success && result.filePath) {
              inputEl.value = result.filePath;
              previewImg.src = reader.result;
              previewName.innerText = file.name;
              previewCard.classList.remove('hidden');
              dropZone.classList.add('hidden');
              urlInput.value = '';
            } else {
              alert('فشل رفع الصورة: ' + (result.error || 'خطأ غير معروف'));
              dropZone.innerHTML = originalDropHtml;
            }
          } catch(err) {
            alert('خطأ أثناء رفع الصورة: ' + err.message);
            dropZone.innerHTML = originalDropHtml;
          }
        };
        reader.onerror = () => {
          alert('تعذر قراءة ملف الصورة من جهازك.');
          dropZone.innerHTML = originalDropHtml;
        };
      };

      urlInput.oninput = () => {
        const val = urlInput.value.trim();
        if (val) {
          inputEl.value = val;
          previewImg.src = val;
          previewName.innerText = val.split('/').pop() || 'صورة من رابط';
          previewCard.classList.remove('hidden');
          dropZone.classList.add('hidden');
        } else {
          clearImage();
        }
      };

      uploadContainer.appendChild(filePicker);
      uploadContainer.appendChild(dropZone);
      uploadContainer.appendChild(urlInputWrap);
      uploadContainer.appendChild(previewCard);
      uploadContainer.appendChild(inputEl);
      wrapper.appendChild(uploadContainer);
    } else {
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'relative flex items-center';
      if (input.prepend) {
        const prepend = document.createElement('span');
        prepend.className = 'absolute left-3 text-slate-500 font-medium select-none';
        prepend.innerText = input.prepend;
        inputWrapper.appendChild(prepend);
      } else if (input.icon) {
        const icon = document.createElement('i');
        icon.className = `${input.icon} absolute left-3 text-slate-500`;
        inputWrapper.appendChild(icon);
      }
      inputEl = document.createElement('input');
      inputEl.type = input.type;
      inputEl.placeholder = input.placeholder || '';
      inputEl.className = `w-full bg-slate-900/50 border border-darkborder rounded-lg py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:bg-slate-900 transition-colors placeholder-slate-600 ${input.prepend || input.icon ? 'pl-8 pr-3' : 'px-3'}`;
      if (input.defaultValue !== undefined) inputEl.value = input.defaultValue;
      inputWrapper.appendChild(inputEl);
      wrapper.appendChild(inputWrapper);
    }
    if (input.type !== 'image-upload') {
      inputEl.id = `input-${input.id}`;
      if (input.type !== 'textarea-list') {
        inputEl.name = input.id;
        if (input.required) inputEl.required = true;
      }
    }
    if (input.type !== 'checkbox') form.appendChild(wrapper);
    else form.appendChild(wrapper);
  });

  // Run Button color based on tool type
  const runBtn = document.getElementById('run-btn');
  if (tool.type === 'action') {
    runBtn.className = 'w-full relative group overflow-hidden rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 px-4 shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5';
    document.getElementById('run-btn-text').innerText = 'تشغيل الأتمتة';
  } else {
    runBtn.className = 'w-full relative group overflow-hidden rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 px-4 shadow-lg shadow-brand-500/25 transition-all transform hover:-translate-y-0.5';
    document.getElementById('run-btn-text').innerText = 'بدء الاستخراج';
  }

  // Clean Terminal
  clearTerminal();
  printToTerminal('جاهز. تم التهيئة لـ ' + tool.title, 'info');
  document.getElementById('export-controls').style.display = 'none';
}

// Checkbox Helper
function selectAllAccounts() {
  document.querySelectorAll('.account-checkbox').forEach(cb => cb.checked = true);
}

// Terminal Helpers
function clearTerminal() {
  document.getElementById('terminal-output').innerHTML = '';
}

function printToTerminal(text, type = 'normal') {
  const terminal = document.getElementById('terminal-output');
  let color = 'text-slate-300';
  let icon = '';
  if (type === 'error') { color = 'text-red-400'; icon = '<i class="fa-solid fa-circle-xmark mr-2"></i>'; }
  if (type === 'success') { color = 'text-green-400'; icon = '<i class="fa-solid fa-check mr-2"></i>'; }
  if (type === 'info') { color = 'text-blue-400'; icon = '<i class="fa-solid fa-info-circle mr-2"></i>'; }
  terminal.innerHTML += `<div class="${color} flex flex-col md:flex-row md:items-start gap-2 mb-2 p-2 bg-[#060b14] border border-darkborder/50 rounded-lg">
    <div class="mt-0.5 shrink-0">${icon}</div>
    <span>${text}</span>
  </div>`;
  terminal.scrollTop = terminal.scrollHeight;
}
