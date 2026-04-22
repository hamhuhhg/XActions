// js/ui.js
    // Setup Sidebar Menu
    function renderSidebarNav() {
      const scrapersNav = document.getElementById('nav-scrapers');
      const automationNav = document.getElementById('nav-automation');
      const aiNav = document.getElementById('nav-ai');
      Object.values(tools).forEach(tool => {
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
        if (tool.type === 'scraper') scrapersNav.appendChild(navItem);
        else if (tool.type === 'ai') aiNav.appendChild(navItem);
        else automationNav.appendChild(navItem);
      });
    }
    // Handle Tool Selection
    function selectTool(toolId) {
      currentToolId = toolId;
      const tool = tools[toolId];
      // UI Updates
      document.getElementById('welcome-state').classList.add('hidden');
      document.getElementById('tool-workspace').classList.remove('hidden');
      document.getElementById('current-tool-title').innerHTML = `<i class="${tool.icon} ${tool.color}"></i> ${tool.title}`;
      document.getElementById('current-tool-desc').innerText = tool.desc;
      // Build Form
      const form = document.getElementById('dynamic-form');
      form.innerHTML = ''; // Clear existing

      if (tool.isSpecialized && tool.id === 'campaigns') {
        renderCampaignBuilder(form);
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

      tool.inputs.forEach(input => {
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
        inputEl.id = `input-${input.id}`;
        if (input.type !== 'textarea-list') {
          inputEl.name = input.id;
          if (input.required) inputEl.required = true;
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

