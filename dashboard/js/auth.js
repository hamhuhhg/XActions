// js/auth.js
    // Accounts Manager Status Badge Dummy (remove old logic)
    function updateAccountsBadge() {
      const badge = document.getElementById('auth-status-badge');
      if (badge) {
        badge.className = 'px-2 py-1 rounded-md text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center gap-1.5';
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> ${xactionsAccounts.length} حسابات محفوظة`;
      }
    }
    // Accounts Management
    function openAccountsManager() {
      document.getElementById('accounts-modal').classList.remove('hidden');
      renderAccountsList();
    }
    function closeAccountsManager() {
      document.getElementById('accounts-modal').classList.add('hidden');
      if (currentToolId) selectTool(currentToolId);
      updateAccountsBadge();
      editingAccountId = null; // Reset editing state when modal closes
    }

    // Tool Form Account Filtering & Selection
    function filterToolAccounts(countryCode) {
      const rows = document.querySelectorAll('.tool-account-row');
      rows.forEach(row => {
        if (countryCode === 'all' || row.dataset.country === countryCode) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });
    }

    function selectAllAccounts() {
      const rows = document.querySelectorAll('.tool-account-row');
      const visibleCheckboxes = Array.from(rows)
        .filter(row => row.style.display !== 'none')
        .map(row => row.querySelector('.account-checkbox'));

      if (visibleCheckboxes.length === 0) return;

      const allChecked = visibleCheckboxes.every(cb => cb.checked);
      visibleCheckboxes.forEach(cb => cb.checked = !allChecked);
    }




    function populateCountrySelects() {
      const addSelect = document.getElementById('new-account-country');
      const filterSelect = document.getElementById('filter-accounts-country');

      if (!addSelect || !filterSelect) return;

      let addHtml = '<option value="global" selected>🌍 غير محدد (عالمي)</option>';
      let filterHtml = '<option value="all" selected>جميع الدول</option><option value="global">🌍 غير محدد (عالمي)</option>';

      allCountries.forEach(country => {
        const optionString = `<option value="${country.code}">${country.flag} ${country.name}</option>`;
        addHtml += optionString;
        filterHtml += optionString;
      });

      addSelect.innerHTML = addHtml;
      filterSelect.innerHTML = filterHtml;
    }

    document.addEventListener('DOMContentLoaded', () => {
      populateCountrySelects();
      syncAccountsWithDb();
    });

    async function syncAccountsWithDb() {
      try {
        // 1. Send local accounts to DB first
        if (xactionsAccounts.length > 0) {
          await fetch('/api/new_api/accounts/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: xactionsAccounts })
          });
        }
        
        // 2. Fetch all accounts from DB
        const res = await fetch('/api/new_api/accounts');
        const result = await res.json();
        
        if (result.success && result.data && result.data.length > 0) {
          let hasChanges = false;
          result.data.forEach(dbAcc => {
            const existing = xactionsAccounts.find(a => String(a.id) === String(dbAcc.id));
            if (!existing) {
              xactionsAccounts.push({
                id: dbAcc.id,
                name: dbAcc.name,
                token: dbAcc.token,
                country: dbAcc.country,
                platform: dbAcc.platform || 'twitter',
                isSuspended: dbAcc.isSuspended
              });
              hasChanges = true;
            } else {
                // Update local if necessary
                if (existing.platform !== dbAcc.platform || existing.isSuspended !== dbAcc.isSuspended) {
                    existing.platform = dbAcc.platform || 'twitter';
                    existing.isSuspended = dbAcc.isSuspended;
                    hasChanges = true;
                }
            }
          });
          
          if (hasChanges) {
              localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
              renderAccountsList();
          }
        }
      } catch (err) {
        console.error('Failed to sync accounts with DB:', err);
      }
    }


    function setAccountPlatform(platform) {
      currentAccountPlatform = platform;
      
      // Update Tab Styles
      const tabTwitter = document.getElementById('account-tab-twitter');
      const tabFacebook = document.getElementById('account-tab-facebook');
      
      if (platform === 'twitter') {
        tabTwitter.className = "px-4 py-2 font-bold focus:outline-none flex items-center gap-2 text-white border-b-2 border-brand-500 transition-colors";
        tabFacebook.className = "px-4 py-2 font-bold focus:outline-none flex items-center gap-2 text-slate-400 border-b-2 border-transparent hover:text-white transition-colors";
        document.getElementById('new-account-token').placeholder = "رمز المصادقة (auth_token)...";
      } else {
        tabFacebook.className = "px-4 py-2 font-bold focus:outline-none flex items-center gap-2 text-white border-b-2 border-blue-500 transition-colors";
        tabTwitter.className = "px-4 py-2 font-bold focus:outline-none flex items-center gap-2 text-slate-400 border-b-2 border-transparent hover:text-white transition-colors";
        document.getElementById('new-account-token').placeholder = 'كوكيز فيسبوك: {"c_user":"...","xs":"..."}';
      }
      
      cancelEdit();
      renderAccountsList();
    }

    function addAccount() {
      const nameInput = document.getElementById('new-account-name');
      const tokenInput = document.getElementById('new-account-token');
      const countryInput = document.getElementById('new-account-country');
      const name = nameInput.value.trim();
      const token = tokenInput.value.trim();
      const country = countryInput.value;
      if (!name || !token) return alert('يرجى إدخال اسم الحساب ورمز المصادقة.');

      if (editingAccountId) {
        const index = xactionsAccounts.findIndex(acc => acc.id === editingAccountId);
        if (index !== -1) {
          xactionsAccounts[index] = { ...xactionsAccounts[index], name, token, country, platform: currentAccountPlatform };
        }
        editingAccountId = null;
        document.getElementById('save-account-btn').innerHTML = 'حفظ الحساب <i class="fa-solid fa-check ml-1"></i>';
        const cancelBtn = document.getElementById('cancel-edit-btn');
        if (cancelBtn) cancelBtn.classList.add('hidden');
      } else {
        xactionsAccounts.push({ id: Date.now(), name, token, country, platform: currentAccountPlatform });
      }

      localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
      syncAccountsWithDb();

      nameInput.value = '';
      tokenInput.value = '';
      countryInput.value = 'global';
      renderAccountsList();
    }

    function cancelEdit() {
      editingAccountId = null;
      document.getElementById('new-account-name').value = '';
      document.getElementById('new-account-token').value = '';
      document.getElementById('new-account-country').value = 'global';
      document.getElementById('save-account-btn').innerHTML = 'حفظ الحساب <i class="fa-solid fa-check ml-1"></i>';
      const cancelBtn = document.getElementById('cancel-edit-btn');
      if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    function editAccount(id) {
      const acc = xactionsAccounts.find(a => a.id == id);
      if (!acc) return;
      editingAccountId = id;
      document.getElementById('new-account-name').value = acc.name;
      document.getElementById('new-account-token').value = acc.token;
      document.getElementById('new-account-country').value = acc.country || 'global';
      document.getElementById('save-account-btn').innerHTML = 'تحديث الحساب <i class="fa-solid fa-pen ml-1"></i>';

      let cancelBtn = document.getElementById('cancel-edit-btn');
      if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.onclick = cancelEdit;
        cancelBtn.className = "w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg text-sm transition-colors border border-slate-700";
        cancelBtn.innerHTML = 'إلغاء التعديل <i class="fa-solid fa-xmark ml-1"></i>';
        document.getElementById('save-account-btn').parentElement.appendChild(cancelBtn);
      }
      cancelBtn.classList.remove('hidden');
    }

    function buildFlagEmoji(countryCode) {
      if (!countryCode || countryCode === 'global' || countryCode === 'other') return '🌍';
      const country = allCountries.find(c => c.code === countryCode);
      return country ? country.flag : '🌍';
    }

    async function deleteAccount(id) {
      if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
      
      try {
        await fetch(`/api/new_api/accounts/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Error deleting account from DB:', e);
      }

      xactionsAccounts = xactionsAccounts.filter(acc => acc.id != id);
      if (editingAccountId == id) cancelEdit();
      localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
      syncAccountsWithDb();
      renderAccountsList();
    }

    function renderAccountsList() {
      const list = document.getElementById('accounts-list');
      const noMsg = document.getElementById('no-accounts-msg');
      list.innerHTML = '';

      let filteredAccounts = xactionsAccounts.filter(acc => (acc.platform || 'twitter') === currentAccountPlatform);
      if (currentCountryFilter !== 'all') {
        filteredAccounts = filteredAccounts.filter(acc => acc.country === currentCountryFilter);
      }

      if (filteredAccounts.length === 0) {
        noMsg.classList.remove('hidden');
        if (xactionsAccounts.length > 0) {
          noMsg.innerText = 'لا توجد حسابات لهذه الدولة.';
        } else {
          noMsg.innerText = 'لا توجد حسابات محفوظة بعد.';
        }
      } else {
        noMsg.classList.add('hidden');
        filteredAccounts.forEach(acc => {
          const item = document.createElement('div');

          let statusBadgeHtml = '';
          if (acc.isSuspended) {
            statusBadgeHtml = `<span class="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">موقوف</span>`;
          } else if (acc.isSuspended === false) {
            statusBadgeHtml = `<span class="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">نشط</span>`;
          }

          const flagEmoji = buildFlagEmoji(acc.country);

          const platformIcon = currentAccountPlatform === 'facebook' ? 'fa-facebook text-blue-500' : 'fa-x-twitter text-brand-400';

          item.className = `flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0b1120] p-3 rounded-lg border ${acc.isSuspended ? 'border-rose-500/50 bg-rose-500/5' : 'border-darkborder'} group gap-3`;
          item.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden w-full sm:w-auto">
              <div class="w-8 h-8 rounded-full ${acc.isSuspended ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800'} flex items-center justify-center shrink-0">
                <i class="fa-brands ${platformIcon} text-sm"></i>
              </div>
              <div class="truncate">
                <p class="text-sm font-medium ${acc.isSuspended ? 'text-rose-300' : 'text-white'} truncate flex items-center pr-2">
                    ${acc.name}
                    <span class="mr-1.5 opacity-80" title="دولة الحساب">${flagEmoji}</span>
                    ${statusBadgeHtml}
                </p>
                <p class="text-xs text-slate-500 font-mono truncate w-32 border-b border-dashed border-slate-700">***${acc.token.slice(-6)}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button onclick="openSafeBrowser(${acc.id})" id="browse-btn-${acc.id}" class="text-xs px-2.5 py-1.5 rounded bg-blue-500/10 text-blue-400 hover:text-white hover:bg-blue-600 transition-colors flex items-center gap-1.5 border border-blue-500/30" title="تصفح المتصفح الآمن">
                  <i class="fa-solid fa-up-right-from-square"></i>
                </button>
                <button onclick="checkSingleAccount(${acc.id})" id="check-btn-${acc.id}" class="text-xs px-2.5 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 border border-slate-700" title="فحص حالة الحساب">
                  <i class="fa-solid fa-shield-halved"></i>
                </button>
                <button onclick="editAccount(${acc.id})" class="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="تعديل الحساب">
                  <i class="fa-solid fa-pen text-sm"></i>
                </button>
                <button onclick="deleteAccount(${acc.id})" class="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 p-2 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="حذف الحساب">
                  <i class="fa-solid fa-trash text-sm"></i>
                </button>
            </div>
          `;
          list.appendChild(item);
        });
      }
      updateAccountsBadge();
    }
    // Export Utilities
    function copyResults() {
      if (lastResultData) {
        navigator.clipboard.writeText(JSON.stringify(lastResultData, null, 2))
          .then(() => alert('تم نسخ النتائج إلى الحافظة!'));
      }
    }
    function downloadJSON() {
      if (lastResultData) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastResultData, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        const fileName = `xactions_${currentToolId}_${new Date().getTime()}.json`;
        dlAnchorElem.setAttribute("download", fileName);
        dlAnchorElem.click();
      }
    }
    // JSON Highlighting Logic
    function syntaxHighlightJSON(json) {
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
    }

    // Browser Login Logic
    async function loginWithBrowser() {
      const btn = document.getElementById('btn-browser-login');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الفتح...';

      try {
        const platform = typeof currentAccountPlatform !== 'undefined' ? currentAccountPlatform : 'twitter';
        const response = await fetch(`/api/new_api/login?platform=${platform}`);
        const data = await response.json();

        if (data.success && data.token) {
          document.getElementById('new-account-token').value = data.token;
          if (data.accountName) {
            document.getElementById('new-account-name').value = data.accountName;
          }
          alert('تم تسجيل الدخول واستخراج الرمز بنجاح!');
        } else {
          alert('خطأ: ' + (data.error || 'فشل في تسجيل الدخول.'));
        }
      } catch (err) {
        console.error(err);
        alert('حدث خطأ في الاتصال بالخادم. تأكد من عمل السيرفر.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }

    // Safe Browser Logic
    async function openSafeBrowser(accountId) {
      const accIndex = xactionsAccounts.findIndex(a => a.id == accountId);
      if (accIndex === -1) return;

      const acc = xactionsAccounts[accIndex];
      const btn = document.getElementById(`browse-btn-${accountId}`);
      const originalHtml = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

      try {
        const response = await fetch('/api/new_api/safe_browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: acc.token, platform: acc.platform || 'twitter' })
        });

        const data = await response.json();
        if (!data.success) {
          alert(`فشل فتح المتصفح: ${data.error}`);
        }
        // If success, nothing to show, the python window will pop up.
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء الاتصال بالخادم. تأكد من عمل Python و nodriver.');
      } finally {
        if (document.getElementById(`browse-btn-${accountId}`)) {
          document.getElementById(`browse-btn-${accountId}`).disabled = false;
          document.getElementById(`browse-btn-${accountId}`).innerHTML = originalHtml;
        }
      }
    }

    // Suspension Checker Logic
    async function checkSingleAccount(accountId) {
      const accIndex = xactionsAccounts.findIndex(a => a.id == accountId);
      if (accIndex === -1) return;

      const acc = xactionsAccounts[accIndex];
      const btn = document.getElementById(`check-btn-${accountId}`);
      const originalHtml = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

      try {
        const response = await fetch('/api/new_api/check_suspension', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: acc.token, username: acc.name.split(' ')[0], platform: acc.platform || 'twitter' }) // Pass first word of name as username fallback, or modify to extract handle if saved. Here username is strictly needed by python script. Python script currently strips "@"
        });

        const data = await response.json();
        if (data.success) {
          xactionsAccounts[accIndex].isSuspended = data.isSuspended || data.doesNotExist;
          localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
          syncAccountsWithDb();
          renderAccountsList();
        } else {
          alert(`فشل ਫحص ${acc.name}: ${data.error}`);
        }
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء الاتصال بالخادم. تأكد من عمل Python و nodriver.');
      } finally {
        if (document.getElementById(`check-btn-${accountId}`)) {
          document.getElementById(`check-btn-${accountId}`).disabled = false;
          document.getElementById(`check-btn-${accountId}`).innerHTML = originalHtml;
        }
      }
    }

    async function checkAllAccounts() {
      if (xactionsAccounts.length === 0) return alert('لا توجد حسابات للفحص');

      const checkAllBtn = document.getElementById('btn-check-all');
      const originalHtml = checkAllBtn.innerHTML;
      checkAllBtn.disabled = true;
      checkAllBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري الفحص...';

      let suspendedCount = 0;

      for (const [index, acc] of xactionsAccounts.entries()) {
        checkAllBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${index + 1} / ${xactionsAccounts.length}...`;

        try {
          const response = await fetch('/api/new_api/check_suspension', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: acc.token, username: acc.name.split(' ')[0], platform: acc.platform || 'twitter' })
          });

          const data = await response.json();
          if (data.success) {
            const isSusp = data.isSuspended || data.doesNotExist;
            xactionsAccounts[index].isSuspended = isSusp;
            if (isSusp) suspendedCount++;
          }
        } catch (err) {
          console.error(`Error checking ${acc.name}:`, err);
        }
      }

      localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
      syncAccountsWithDb();
      renderAccountsList();

      checkAllBtn.disabled = false;
      checkAllBtn.innerHTML = originalHtml;
      alert(`تم فحص ${xactionsAccounts.length} حسابات. تم العثور على ${suspendedCount} حساب موقوف/غير موجود.`);
    }

