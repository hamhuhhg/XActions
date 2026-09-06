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
      if (typeof selectedAccountIds !== 'undefined') selectedAccountIds.clear();
      if (typeof updateBulkActionBar === 'function') updateBulkActionBar();
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
        // 1. Fetch all accounts from DB first (Single source of truth)
        const base = typeof API_BASE !== 'undefined' ? API_BASE : '';
        const res = await fetch(`${base}/api/new_api/accounts`);
        const result = await res.json();
        
        if (result.success && Array.isArray(result.data)) {
          let hasChanges = false;
          const dbIds = new Set(result.data.map(d => String(d.id)));

          result.data.forEach(dbAcc => {
            const existing = xactionsAccounts.find(a => String(a.id) === String(dbAcc.id));
            if (!existing) {
              xactionsAccounts.push({
                id: String(dbAcc.id),
                name: dbAcc.name,
                token: dbAcc.token,
                country: dbAcc.country,
                platform: dbAcc.platform || 'twitter',
                isSuspended: dbAcc.isSuspended,
                username: dbAcc.username || '',
                email: dbAcc.email || '',
                phone: dbAcc.phone || '',
                password: dbAcc.password || '',
                avatar: dbAcc.avatar || '',
                notes: dbAcc.notes || '',
                order: typeof dbAcc.order === 'number' ? dbAcc.order : 0
              });
              hasChanges = true;
            } else {
              // Don't overwrite if the user is currently editing this account in the UI
              if (editingAccountId && String(editingAccountId) === String(dbAcc.id)) {
                return;
              }
              // Update local state if token, name, platform, status, credentials, avatar, notes, or order changed in DB
              if (
                existing.token !== dbAcc.token ||
                existing.name !== dbAcc.name ||
                existing.platform !== dbAcc.platform ||
                existing.isSuspended !== dbAcc.isSuspended ||
                existing.country !== dbAcc.country ||
                (dbAcc.username !== undefined && existing.username !== dbAcc.username) ||
                (dbAcc.email !== undefined && existing.email !== dbAcc.email) ||
                (dbAcc.phone !== undefined && existing.phone !== dbAcc.phone) ||
                (dbAcc.password !== undefined && existing.password !== dbAcc.password) ||
                (dbAcc.avatar !== undefined && existing.avatar !== dbAcc.avatar) ||
                (dbAcc.notes !== undefined && existing.notes !== dbAcc.notes) ||
                (dbAcc.order !== undefined && existing.order !== dbAcc.order)
              ) {
                existing.token = dbAcc.token;
                existing.name = dbAcc.name;
                existing.platform = dbAcc.platform || 'twitter';
                existing.country = dbAcc.country;
                existing.isSuspended = dbAcc.isSuspended;
                if (dbAcc.username !== undefined) existing.username = dbAcc.username || '';
                if (dbAcc.email !== undefined) existing.email = dbAcc.email || '';
                if (dbAcc.phone !== undefined) existing.phone = dbAcc.phone || '';
                if (dbAcc.password !== undefined) existing.password = dbAcc.password || '';
                if (dbAcc.avatar !== undefined) existing.avatar = dbAcc.avatar || '';
                if (dbAcc.notes !== undefined) existing.notes = dbAcc.notes || '';
                if (dbAcc.order !== undefined) existing.order = typeof dbAcc.order === 'number' ? dbAcc.order : 0;
                hasChanges = true;
              }
            }
          });

          // Sort by order ascending
          xactionsAccounts.sort((a, b) => (a.order || 0) - (b.order || 0));

          // 2. Sync any local-only new accounts up to DB
          const localOnly = xactionsAccounts.filter(a => !dbIds.has(String(a.id)));
          if (localOnly.length > 0) {
            await fetch(`${base}/api/new_api/accounts/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accounts: localOnly })
            });
          }
          
          if (hasChanges) {
            localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
            renderAccountsList();
            updateAccountsBadge();
          }
        }
      } catch (err) {
        console.error('Failed to sync accounts with DB:', err);
      }
    }


    function setAccountPlatform(platform, preserveEdit = false) {
      currentAccountPlatform = platform;
      
      // Update Tab Styles
      const tabTwitter = document.getElementById('account-tab-twitter');
      const tabFacebook = document.getElementById('account-tab-facebook');
      
      if (tabTwitter && tabFacebook) {
        if (platform === 'twitter') {
          tabTwitter.className = "px-4 py-1.5 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 text-white bg-brand-500 shadow-sm";
          tabFacebook.className = "px-4 py-1.5 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/50";
          document.getElementById('new-account-token').placeholder = "رمز المصادقة (auth_token)...";
        } else {
          tabFacebook.className = "px-4 py-1.5 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 text-white bg-blue-600 shadow-sm";
          tabTwitter.className = "px-4 py-1.5 font-semibold text-xs rounded-lg transition-all flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/50";
          document.getElementById('new-account-token').placeholder = 'كوكيز فيسبوك: {"c_user":"...","xs":"..."}';
        }
      }
      
      if (!preserveEdit) {
        cancelEdit();
      }
      if (typeof selectedAccountIds !== 'undefined') selectedAccountIds.clear();
      if (typeof updateBulkActionBar === 'function') updateBulkActionBar();
      renderAccountsList();
    }

    // Helper functions for credential storage and visibility
    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }

    function escapeAttr(str) {
      if (!str) return '';
      return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function toggleFormPasswordVisibility() {
      const pwdInput = document.getElementById('new-account-password');
      const icon = document.getElementById('toggle-form-password-icon');
      if (!pwdInput) return;
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        if (icon) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        }
      } else {
        pwdInput.type = 'password';
        if (icon) {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      }
    }

    function toggleAccountCredentialsView(accId) {
      const panel = document.getElementById(`account-creds-${accId}`);
      const btn = document.getElementById(`cred-btn-${accId}`);
      if (!panel) return;
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        if (btn) {
          btn.classList.add('bg-amber-500', 'text-slate-950', 'font-bold');
          btn.classList.remove('bg-amber-500/10', 'text-amber-400');
        }
      } else {
        panel.classList.add('hidden');
        if (btn) {
          btn.classList.remove('bg-amber-500', 'text-slate-950', 'font-bold');
          btn.classList.add('bg-amber-500/10', 'text-amber-400');
        }
      }
    }

    function toggleSavedPasswordVisibility(accId) {
      const el = document.getElementById(`saved-pwd-${accId}`);
      const icon = document.getElementById(`saved-pwd-icon-${accId}`);
      const label = document.getElementById(`saved-pwd-label-${accId}`);
      if (!el) return;
      const isMasked = el.getAttribute('data-masked') === 'true';
      const realPwd = el.getAttribute('data-pwd') || '';
      if (isMasked) {
        el.innerText = realPwd || '(فارغ)';
        el.setAttribute('data-masked', 'false');
        el.classList.add('text-emerald-400', 'font-bold');
        if (icon) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        }
        if (label) label.innerText = 'إخفاء';
      } else {
        el.innerText = '••••••••';
        el.setAttribute('data-masked', 'true');
        el.classList.remove('text-emerald-400', 'font-bold');
        if (icon) {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
        if (label) label.innerText = 'كشف';
      }
    }

    function copySavedPassword(accId) {
      const el = document.getElementById(`saved-pwd-${accId}`);
      const pwd = el ? el.getAttribute('data-pwd') : '';
      if (!pwd) {
        return alert('لا توجد كلمة مرور محفوظة لهذا الحساب.');
      }
      navigator.clipboard.writeText(pwd).then(() => {
        alert('تم نسخ كلمة المرور إلى الحافظة بنجاح! 📋');
      }).catch(() => {
        prompt('انسخ كلمة المرور:', pwd);
      });
    }

    function copyAccountField(text, labelName) {
      if (!text) {
        return alert(`لا توجد قيمة لـ ${labelName} لنسخها.`);
      }
      navigator.clipboard.writeText(text).then(() => {
        alert(`تم نسخ ${labelName} (${text}) إلى الحافظة بنجاح! 📋`);
      }).catch(() => {
        prompt(`انسخ ${labelName}:`, text);
      });
    }

    function copyAllAccountData(accId) {
      const acc = xactionsAccounts.find(a => String(a.id) === String(accId));
      if (!acc) return;
      const lines = [
        `منصة الحساب: ${acc.platform === 'facebook' ? 'فيسبوك (Facebook)' : 'إكس (Twitter)'}`,
        `اسم الحساب: ${acc.name || '-'}`,
        acc.username ? `اسم المستخدم: ${acc.username}` : null,
        acc.email ? `البريد الإلكتروني: ${acc.email}` : null,
        acc.phone ? `رقم الهاتف: ${acc.phone}` : null,
        acc.password ? `كلمة المرور: ${acc.password}` : null,
        acc.country ? `دولة الحساب: ${acc.country}` : null,
        acc.token ? `الرمز / الكوكيز: ${acc.token}` : null,
        acc.notes ? `ملاحظات: ${acc.notes}` : null,
      ].filter(Boolean).join('\n');

      navigator.clipboard.writeText(lines).then(() => {
        alert('تم نسخ كامل بيانات الحساب وكلمة المرور إلى الحافظة بنجاح! 📋');
      }).catch(() => {
        prompt('انسخ بيانات الحساب:', lines);
      });
    }

    // Avatar helpers
    function updateAvatarPreview(url) {
      const previewImg = document.getElementById('new-account-avatar-preview');
      const placeholder = document.getElementById('new-account-avatar-placeholder');
      const clearBtn = document.getElementById('btn-clear-avatar');
      if (!previewImg || !placeholder) return;

      const trimmed = (url || '').trim();
      if (trimmed) {
        previewImg.src = trimmed;
        previewImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
        if (clearBtn) clearBtn.classList.remove('hidden');

        previewImg.onerror = () => {
          previewImg.classList.add('hidden');
          placeholder.classList.remove('hidden');
        };
      } else {
        previewImg.src = '';
        previewImg.classList.add('hidden');
        placeholder.classList.remove('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');
      }
    }

    function handleAvatarFileSelected(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        return alert('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP).');
      }

      if (file.size > 1.5 * 1024 * 1024) {
        return alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 1.5 ميغابايت.');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const avatarInput = document.getElementById('new-account-avatar');
        if (avatarInput) avatarInput.value = dataUrl;
        updateAvatarPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }

    function clearAvatarInput() {
      const avatarInput = document.getElementById('new-account-avatar');
      const fileInput = document.getElementById('new-account-avatar-file');
      if (avatarInput) avatarInput.value = '';
      if (fileInput) fileInput.value = '';
      updateAvatarPreview('');
    }

    async function addAccount() {
      const nameInput = document.getElementById('new-account-name');
      const tokenInput = document.getElementById('new-account-token');
      const countryInput = document.getElementById('new-account-country');
      const usernameInput = document.getElementById('new-account-username');
      const emailInput = document.getElementById('new-account-email');
      const phoneInput = document.getElementById('new-account-phone');
      const passwordInput = document.getElementById('new-account-password');
      const avatarInput = document.getElementById('new-account-avatar');
      const notesInput = document.getElementById('new-account-notes');

      const name = nameInput.value.trim();
      const token = tokenInput.value.trim();
      const country = countryInput.value;
      const username = usernameInput ? usernameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const avatar = avatarInput ? avatarInput.value.trim() : '';
      const notes = notesInput ? notesInput.value.trim() : '';

      if (!name || !token) return alert('يرجى إدخال اسم الحساب ورمز المصادقة أو الكعكات.');

      const saveBtn = document.getElementById('save-account-btn');
      const originalBtnHtml = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = 'جاري الحفظ... <i class="fa-solid fa-spinner fa-spin ml-1"></i>';

      let accountToSync = null;

      try {
        if (editingAccountId) {
          const index = xactionsAccounts.findIndex(acc => String(acc.id) === String(editingAccountId));
          if (index !== -1) {
            xactionsAccounts[index] = {
              ...xactionsAccounts[index],
              name,
              token,
              country,
              platform: currentAccountPlatform || xactionsAccounts[index].platform || 'twitter',
              username,
              email,
              phone,
              password,
              avatar,
              notes
            };
            accountToSync = xactionsAccounts[index];
          }
          editingAccountId = null;
          saveBtn.innerHTML = '<span>حفظ الحساب</span> <i class="fa-solid fa-check text-xs"></i>';
          const cancelBtn = document.getElementById('cancel-edit-btn');
          if (cancelBtn) cancelBtn.classList.add('hidden');
          const formTitle = document.getElementById('account-form-title');
          if (formTitle) formTitle.innerHTML = '<i class="fa-solid fa-plus text-emerald-400"></i> إضافة وتخزين حساب جديد';
        } else {
          const platformAccsCount = xactionsAccounts.filter(a => (a.platform || 'twitter') === (currentAccountPlatform || 'twitter')).length;
          accountToSync = {
            id: String(Date.now()),
            name,
            token,
            country,
            platform: currentAccountPlatform || 'twitter',
            username,
            email,
            phone,
            password,
            avatar,
            notes,
            order: platformAccsCount
          };
          xactionsAccounts.push(accountToSync);
        }

        // 1. Immediately persist this account (created or updated) directly to the database!
        const base = typeof API_BASE !== 'undefined' ? API_BASE : '';
        if (accountToSync) {
          await fetch(`${base}/api/new_api/accounts/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: [accountToSync] })
          });
        }

        // 2. Save updated state to localStorage
        localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));

        nameInput.value = '';
        tokenInput.value = '';
        countryInput.value = 'global';
        clearAvatarInput();
        if (notesInput) notesInput.value = '';
        if (usernameInput) usernameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (passwordInput) {
          passwordInput.value = '';
          passwordInput.type = 'password';
          const eyeIcon = document.getElementById('toggle-form-password-icon');
          if (eyeIcon) {
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
          }
        }
        renderAccountsList();
        updateAccountsBadge();

        // 3. Re-sync with DB to ensure perfect synchronization
        await syncAccountsWithDb();
      } catch (e) {
        console.error('Error saving account:', e);
        alert('حدث خطأ أثناء حفظ الحساب في قاعدة البيانات: ' + e.message);
      } finally {
        saveBtn.disabled = false;
        if (!editingAccountId) {
          saveBtn.innerHTML = '<span>حفظ الحساب</span> <i class="fa-solid fa-check text-xs"></i>';
        }
      }
    }

    function cancelEdit() {
      editingAccountId = null;
      document.getElementById('new-account-name').value = '';
      document.getElementById('new-account-token').value = '';
      document.getElementById('new-account-country').value = 'global';
      clearAvatarInput();
      const notesInput = document.getElementById('new-account-notes');
      if (notesInput) notesInput.value = '';
      const usernameInput = document.getElementById('new-account-username');
      const emailInput = document.getElementById('new-account-email');
      const phoneInput = document.getElementById('new-account-phone');
      const passwordInput = document.getElementById('new-account-password');
      if (usernameInput) usernameInput.value = '';
      if (emailInput) emailInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (passwordInput) {
        passwordInput.value = '';
        passwordInput.type = 'password';
        const eyeIcon = document.getElementById('toggle-form-password-icon');
        if (eyeIcon) {
          eyeIcon.classList.remove('fa-eye-slash');
          eyeIcon.classList.add('fa-eye');
        }
      }
      const formTitle = document.getElementById('account-form-title');
      if (formTitle) formTitle.innerHTML = '<i class="fa-solid fa-plus text-emerald-400"></i> إضافة وتخزين حساب جديد';
      document.getElementById('save-account-btn').innerHTML = '<span>حفظ الحساب</span> <i class="fa-solid fa-check text-xs"></i>';
      const cancelBtn = document.getElementById('cancel-edit-btn');
      if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    function editAccount(id) {
      const acc = xactionsAccounts.find(a => String(a.id) === String(id));
      if (!acc) return;
      editingAccountId = String(acc.id);

      // Switch platform tab if necessary to match the account being edited
      if (acc.platform && acc.platform !== currentAccountPlatform) {
        setAccountPlatform(acc.platform, true);
      }

      document.getElementById('new-account-name').value = acc.name || '';
      document.getElementById('new-account-token').value = acc.token || '';
      document.getElementById('new-account-country').value = acc.country || 'global';
      
      const avatarInput = document.getElementById('new-account-avatar');
      if (avatarInput) {
        avatarInput.value = acc.avatar || '';
        updateAvatarPreview(acc.avatar || '');
      }

      const notesInput = document.getElementById('new-account-notes');
      if (notesInput) notesInput.value = acc.notes || '';

      const usernameInput = document.getElementById('new-account-username');
      const emailInput = document.getElementById('new-account-email');
      const phoneInput = document.getElementById('new-account-phone');
      const passwordInput = document.getElementById('new-account-password');
      if (usernameInput) usernameInput.value = acc.username || '';
      if (emailInput) emailInput.value = acc.email || '';
      if (phoneInput) phoneInput.value = acc.phone || '';
      if (passwordInput) passwordInput.value = acc.password || '';

      const formTitle = document.getElementById('account-form-title');
      if (formTitle) formTitle.innerHTML = '<i class="fa-solid fa-pen text-amber-400"></i> تعديل بيانات الحساب';
      document.getElementById('save-account-btn').innerHTML = '<span>تحديث الحساب</span> <i class="fa-solid fa-pen text-xs"></i>';

      let cancelBtn = document.getElementById('cancel-edit-btn');
      if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.type = 'button';
        cancelBtn.onclick = cancelEdit;
        cancelBtn.className = "flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-xl text-xs sm:text-sm transition-colors border border-slate-700 flex items-center justify-center gap-2";
        cancelBtn.innerHTML = '<span>إلغاء التعديل</span> <i class="fa-solid fa-xmark text-xs"></i>';
        document.getElementById('save-account-btn').parentElement.appendChild(cancelBtn);
      }
      cancelBtn.classList.remove('hidden');

      const tokenEl = document.getElementById('new-account-token');
      if (tokenEl) {
        tokenEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tokenEl.focus();
      }
    }

    function buildFlagEmoji(countryCode) {
      if (!countryCode || countryCode === 'global' || countryCode === 'other') return '🌍';
      const country = allCountries.find(c => c.code === countryCode);
      return country ? country.flag : '🌍';
    }

    async function deleteAccount(id) {
      if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
      
      const base = typeof API_BASE !== 'undefined' ? API_BASE : '';
      try {
        await fetch(`${base}/api/new_api/accounts/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Error deleting account from DB:', e);
      }

      xactionsAccounts = xactionsAccounts.filter(acc => String(acc.id) !== String(id));
      if (String(editingAccountId) === String(id)) cancelEdit();
      if (typeof selectedAccountIds !== 'undefined') selectedAccountIds.delete(String(id));
      localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
      renderAccountsList();
      updateAccountsBadge();
      if (typeof updateBulkActionBar === 'function') updateBulkActionBar();
    }

    async function renameAccount(id) {
      const acc = xactionsAccounts.find(a => String(a.id) === String(id));
      if (!acc) return;
      const newName = prompt('أدخل الاسم الجديد للحساب:', acc.name);
      if (newName && newName.trim() && newName.trim() !== acc.name) {
        acc.name = newName.trim();
        localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
        const base = typeof API_BASE !== 'undefined' ? API_BASE : '';
        try {
          await fetch(`${base}/api/new_api/accounts/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: [acc] })
          });
        } catch (e) {
          console.error(e);
        }
        renderAccountsList();
      }
    }

    function renderAccountsList() {
      const list = document.getElementById('accounts-list');
      const noMsg = document.getElementById('no-accounts-msg');
      list.innerHTML = '';

      let filteredAccounts = xactionsAccounts.filter(acc => (acc.platform || 'twitter') === currentAccountPlatform);
      if (currentCountryFilter !== 'all') {
        filteredAccounts = filteredAccounts.filter(acc => acc.country === currentCountryFilter);
      }

      const searchInput = document.getElementById('filter-accounts-search');
      const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
      if (searchQuery) {
        filteredAccounts = filteredAccounts.filter(acc =>
          (acc.name && acc.name.toLowerCase().includes(searchQuery)) ||
          (acc.username && acc.username.toLowerCase().includes(searchQuery)) ||
          (acc.email && acc.email.toLowerCase().includes(searchQuery)) ||
          (acc.phone && acc.phone.includes(searchQuery)) ||
          (acc.notes && acc.notes.toLowerCase().includes(searchQuery))
        );
      }

      const countBadge = document.getElementById('accounts-count-badge');
      if (countBadge) {
        countBadge.innerText = String(filteredAccounts.length);
      }

      if (filteredAccounts.length === 0) {
        noMsg.classList.remove('hidden');
        if (searchQuery) {
          noMsg.innerHTML = '<i class="fa-solid fa-magnifying-glass text-2xl text-slate-600 mb-2"></i><span>لا توجد نتائج مطابقة لبحثك.</span>';
        } else if (currentCountryFilter !== 'all') {
          noMsg.innerHTML = '<i class="fa-solid fa-earth-americas text-2xl text-slate-600 mb-2"></i><span>لا توجد حسابات لهذه الدولة.</span>';
        } else {
          noMsg.innerHTML = '<i class="fa-solid fa-users-slash text-2xl text-slate-600 mb-2"></i><span>لا توجد حسابات محفوظة بعد.</span>';
        }
      } else {
        noMsg.classList.add('hidden');
        filteredAccounts.forEach((acc, idx) => {
          const item = document.createElement('div');
          const isFirst = idx === 0;
          const isLast = idx === filteredAccounts.length - 1;
          const isSelected = typeof selectedAccountIds !== 'undefined' && selectedAccountIds.has(String(acc.id));

          let statusBadgeHtml = '';
          if (acc.isSuspended) {
            statusBadgeHtml = `<span class="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">موقوف</span>`;
          } else if (acc.isSuspended === false) {
            statusBadgeHtml = `<span class="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">نشط</span>`;
          }

          const flagEmoji = buildFlagEmoji(acc.country);
          const platformIcon = currentAccountPlatform === 'facebook' ? 'fa-facebook text-blue-500' : 'fa-x-twitter text-brand-400';
          const hasCredentials = !!(acc.username || acc.email || acc.phone || acc.password);

          let credsBadgesHtml = '';
          if (acc.username) {
            credsBadgesHtml += `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20 truncate max-w-[100px]" title="اسم المستخدم">@${escapeHtml(acc.username)}</span>`;
          }
          if (acc.email) {
            credsBadgesHtml += `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60 truncate max-w-[120px]" title="البريد">${escapeHtml(acc.email)}</span>`;
          }
          if (acc.phone) {
            credsBadgesHtml += `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60 truncate max-w-[90px]" title="الهاتف">${escapeHtml(acc.phone)}</span>`;
          }
          if (acc.password) {
            credsBadgesHtml += `<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1" title="كلمة المرور مخزنة"><i class="fa-solid fa-key text-[9px]"></i> سرية</span>`;
          }
          if (acc.notes) {
            credsBadgesHtml += `<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1 truncate max-w-[120px] cursor-pointer" onclick="openAccountDetailModal('${acc.id}')" title="ملاحظات: ${escapeAttr(acc.notes)}"><i class="fa-solid fa-note-sticky text-[9px] text-amber-400"></i> ${escapeHtml(acc.notes)}</span>`;
          }

          const avatarHtml = acc.avatar ? `
            <div class="relative w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/70 shrink-0 shadow-sm overflow-hidden flex items-center justify-center cursor-pointer group/avatar" onclick="openAccountDetailModal('${acc.id}')" title="عرض بطاقة الحساب">
              <img src="${escapeAttr(acc.avatar)}" class="w-full h-full object-cover" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
              <div class="w-full h-full ${acc.isSuspended ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'} hidden items-center justify-center">
                <i class="fa-brands ${platformIcon} text-base"></i>
              </div>
              <span class="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[8px] text-brand-400 shadow">
                <i class="fa-brands ${platformIcon}"></i>
              </span>
            </div>
          ` : `
            <div class="w-10 h-10 rounded-xl ${acc.isSuspended ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800/90 border border-slate-700/50'} flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:border-brand-500/50 transition-colors" onclick="openAccountDetailModal('${acc.id}')" title="عرض بطاقة الحساب">
              <i class="fa-brands ${platformIcon} text-base"></i>
            </div>
          `;

          const borderClass = isSelected
            ? 'border-brand-500/80 bg-brand-500/10 ring-1 ring-brand-500/40 shadow-lg shadow-brand-500/5'
            : acc.isSuspended
              ? 'border-rose-500/50 bg-rose-500/5'
              : 'border-darkborder hover:border-slate-700/80';

          item.className = `flex flex-col bg-[#0b1120] p-3 rounded-xl border ${borderClass} group gap-2.5 transition-all`;
          item.innerHTML = `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
              <div class="flex items-center gap-2.5 overflow-hidden w-full sm:w-auto">
                <!-- Checkbox for Multi-Selection & Bulk Reordering -->
                <label class="flex items-center justify-center p-0.5 cursor-pointer shrink-0" onclick="event.stopPropagation()" title="تحديد الحساب لتغيير ترتيبه">
                  <input type="checkbox" class="w-4 h-4 rounded bg-[#080d1a] border-slate-700 text-brand-500 focus:ring-0 cursor-pointer" ${isSelected ? 'checked' : ''} onchange="toggleAccountSelection('${acc.id}', this.checked)">
                </label>

                <!-- Reorder Up/Down Controls -->
                <div class="flex flex-col gap-0.5 shrink-0 justify-center">
                  <button onclick="moveAccountUp('${acc.id}')" class="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded transition ${isFirst ? 'opacity-20 cursor-not-allowed' : ''}" title="رفع للأعلى" ${isFirst ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-up text-[9px]"></i>
                  </button>
                  <button onclick="moveAccountDown('${acc.id}')" class="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded transition ${isLast ? 'opacity-20 cursor-not-allowed' : ''}" title="إنزال للأسفل" ${isLast ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-down text-[9px]"></i>
                  </button>
                </div>

                <!-- Avatar or Platform Icon -->
                ${avatarHtml}

                <div class="truncate flex-1 min-w-0">
                  <p class="text-sm font-semibold ${acc.isSuspended ? 'text-rose-300' : 'text-white'} truncate flex items-center pr-1 cursor-pointer hover:text-brand-300 transition-colors" onclick="openAccountDetailModal('${acc.id}')" title="عرض بطاقة الحساب وبياناته">
                      ${escapeHtml(acc.name)}
                      <span class="mr-1.5 opacity-80" title="دولة الحساب">${flagEmoji}</span>
                      ${statusBadgeHtml}
                  </p>
                  <div class="flex items-center gap-1.5 flex-wrap mt-1">
                    <p class="text-[11px] text-slate-500 font-mono truncate w-24 border-b border-dashed border-slate-700 cursor-pointer" onclick="openAccountDetailModal('${acc.id}')" title="معاينة الرمز">***${(acc.token || '').slice(-6)}</p>
                    ${credsBadgesHtml}
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
                  <button onclick="openAccountDetailModal('${acc.id}')" id="cred-btn-${acc.id}" class="text-xs px-2.5 py-1.5 rounded-lg ${hasCredentials ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'} transition-all flex items-center gap-1.5 border shadow-sm" title="عرض بطاقة الحساب وبياناته الكاملة">
                    <i class="fa-solid fa-id-card"></i>
                    <span class="text-[11px] font-medium">البيانات</span>
                  </button>
                  <button onclick="openSafeBrowser('${acc.id}')" id="browse-btn-${acc.id}" class="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:text-white hover:bg-blue-600 transition-colors flex items-center gap-1 border border-blue-500/30" title="تصفح المتصفح الآمن">
                    <i class="fa-solid fa-up-right-from-square"></i>
                  </button>
                  <button onclick="checkSingleAccount('${acc.id}')" id="check-btn-${acc.id}" class="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 border border-slate-700" title="فحص حالة الحساب">
                    <i class="fa-solid fa-shield-halved"></i>
                  </button>
                  <button onclick="editAccount('${acc.id}')" class="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="تعديل بيانات الحساب">
                    <i class="fa-solid fa-pen text-sm"></i>
                  </button>
                  <button onclick="deleteAccount('${acc.id}')" class="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 p-1.5 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="حذف الحساب">
                    <i class="fa-solid fa-trash text-sm"></i>
                  </button>
              </div>
            </div>

            <!-- Expandable Credentials Panel -->
            <div id="account-creds-${acc.id}" class="w-full pt-3 mt-1 border-t border-slate-800/80 hidden text-xs">
              <div class="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2.5 shadow-inner">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span class="text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                    <i class="fa-solid fa-lock text-amber-400 text-xs"></i> بيانات الحساب المخزنة:
                  </span>
                  <div class="flex items-center gap-2">
                    <button onclick="copyAllAccountData('${acc.id}')" class="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition shadow-sm" title="نسخ جميع بيانات الحساب بنسق مرتب">
                      <i class="fa-solid fa-copy text-[10px]"></i> نسخ كامل البيانات
                    </button>
                    <button onclick="editAccount('${acc.id}')" class="text-[11px] px-2.5 py-1 rounded bg-brand-500/15 text-brand-400 hover:bg-brand-500 hover:text-slate-950 border border-brand-500/30 flex items-center gap-1.5 transition font-medium">
                      <i class="fa-solid fa-pen text-[10px]"></i> تعديل
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <!-- Username -->
                  <div class="flex items-center justify-between bg-[#080d1a] px-2.5 py-1.5 rounded-lg border border-slate-800/90">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                      <span class="text-slate-400 text-[11px] shrink-0 font-medium">اسم المستخدم:</span>
                      <span class="font-mono text-white truncate">${acc.username ? escapeHtml(acc.username) : '<span class="text-slate-600">غير محدد</span>'}</span>
                    </div>
                    ${acc.username ? `<button onclick="copyAccountField('${escapeAttr(acc.username)}', 'اسم المستخدم')" class="text-slate-400 hover:text-brand-400 p-1 transition" title="نسخ اسم المستخدم"><i class="fa-solid fa-copy text-xs"></i></button>` : ''}
                  </div>

                  <!-- Email -->
                  <div class="flex items-center justify-between bg-[#080d1a] px-2.5 py-1.5 rounded-lg border border-slate-800/90">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                      <span class="text-slate-400 text-[11px] shrink-0 font-medium">البريد:</span>
                      <span class="font-mono text-white truncate">${acc.email ? escapeHtml(acc.email) : '<span class="text-slate-600">غير محدد</span>'}</span>
                    </div>
                    ${acc.email ? `<button onclick="copyAccountField('${escapeAttr(acc.email)}', 'البريد الإلكتروني')" class="text-slate-400 hover:text-brand-400 p-1 transition" title="نسخ البريد الإلكتروني"><i class="fa-solid fa-copy text-xs"></i></button>` : ''}
                  </div>

                  <!-- Phone -->
                  <div class="flex items-center justify-between bg-[#080d1a] px-2.5 py-1.5 rounded-lg border border-slate-800/90">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                      <span class="text-slate-400 text-[11px] shrink-0 font-medium">الهاتف:</span>
                      <span class="font-mono text-white truncate">${acc.phone ? escapeHtml(acc.phone) : '<span class="text-slate-600">غير محدد</span>'}</span>
                    </div>
                    ${acc.phone ? `<button onclick="copyAccountField('${escapeAttr(acc.phone)}', 'رقم الهاتف')" class="text-slate-400 hover:text-brand-400 p-1 transition" title="نسخ رقم الهاتف"><i class="fa-solid fa-copy text-xs"></i></button>` : ''}
                  </div>

                  <!-- Password with Reveal & Copy -->
                  <div class="flex items-center justify-between bg-[#080d1a] px-2.5 py-1.5 rounded-lg border border-slate-800/90">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                      <span class="text-slate-400 text-[11px] shrink-0 font-medium">كلمة المرور:</span>
                      <span id="saved-pwd-${acc.id}" class="font-mono text-slate-200" data-pwd="${escapeAttr(acc.password || '')}" data-masked="true">${acc.password ? '••••••••' : '<span class="text-slate-600">غير محدد</span>'}</span>
                    </div>
                    ${acc.password ? `
                    <div class="flex items-center gap-1 shrink-0">
                      <button onclick="toggleSavedPasswordVisibility('${acc.id}')" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] flex items-center gap-1 transition" title="إظهار أو إخفاء كلمة المرور">
                        <i class="fa-solid fa-eye text-[10px]" id="saved-pwd-icon-${acc.id}"></i>
                        <span id="saved-pwd-label-${acc.id}">كشف</span>
                      </button>
                      <button onclick="copySavedPassword('${acc.id}')" class="p-1 text-slate-400 hover:text-brand-400 transition" title="نسخ كلمة المرور">
                        <i class="fa-solid fa-copy text-xs"></i>
                      </button>
                    </div>
                    ` : ''}
                  </div>
                </div>

                ${acc.notes ? `
                <div class="mt-2 pt-2 border-t border-slate-800/80 bg-[#080d1a] px-2.5 py-1.5 rounded-lg border border-slate-800/90 text-xs">
                  <div class="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                    <span class="flex items-center gap-1 font-medium text-amber-400/90">
                      <i class="fa-solid fa-note-sticky text-[10px]"></i> ملاحظات:
                    </span>
                    <button onclick="copyAccountField('${escapeAttr(acc.notes)}', 'ملاحظات الحساب')" class="text-slate-400 hover:text-white transition" title="نسخ الملاحظات">
                      <i class="fa-solid fa-copy text-xs"></i>
                    </button>
                  </div>
                  <p class="text-slate-300 font-sans text-xs whitespace-pre-wrap">${escapeHtml(acc.notes)}</p>
                </div>
                ` : ''}
              </div>
            </div>
          `;
          list.appendChild(item);
        });
      }
      updateAccountsBadge();
      if (typeof updateBulkActionBar === 'function') updateBulkActionBar();
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
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري فتح المتصفح...';

      try {
        const platform = typeof currentAccountPlatform !== 'undefined' ? currentAccountPlatform : 'twitter';
        const base = typeof API_BASE !== 'undefined' ? API_BASE : '';
        const targetUrl = `${base}/api/new_api/login?platform=${platform}`;
        console.log('[Browser Login] Initiating login session via:', targetUrl);
        const response = await fetch(targetUrl);
        const data = await response.json();

        if (data.success && data.token) {
          document.getElementById('new-account-token').value = data.token;
          const enteredName = document.getElementById('new-account-name').value.trim();
          const fallbackName = platform === 'facebook' ? (data.accountName || 'حساب فيسبوك') : (data.accountName || 'حساب جديد');
          const finalName = enteredName || fallbackName;
          document.getElementById('new-account-name').value = finalName;
          
          // Automatically save the account
          const newAcc = { 
            id: String(Date.now()), 
            name: finalName, 
            token: data.token, 
            country: document.getElementById('new-account-country').value || 'global', 
            platform: platform 
          };
          xactionsAccounts.push(newAcc);
          localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));

          await fetch(`${base}/api/new_api/accounts/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: [newAcc] })
          }).catch(e => console.error('Error syncing new account to DB:', e));

          await syncAccountsWithDb();
          renderAccountsList();
          updateAccountsBadge();
          
          alert(`تم تسجيل الدخول واستخراج الرمز وحفظ الحساب باسم "${finalName}" بنجاح!`);
        } else {
          alert('خطأ: ' + (data.error || 'فشل في تسجيل الدخول.'));
        }
      } catch (err) {
        console.error('[Browser Login Error]', err);
        let msg = err.message || 'يرجى المحاولة مرة أخرى والتأكد من تشغيل السيرفر.';
        if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
          msg += '\n\n⚠️ تنبيه: المتصفح يمنع الاتصال بالخادم عند فتح الصفحة كملف محلي (file:///!). يرجى فتح اللوحة عبر الرابط: http://localhost:3001/dashboard';
        }
        alert('حدث خطأ أثناء جلسة تسجيل الدخول: ' + msg);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }

    // Safe Browser Logic
    async function openSafeBrowser(accountId) {
      const accIndex = xactionsAccounts.findIndex(a => String(a.id) === String(accountId));
      if (accIndex === -1) return;

      const acc = xactionsAccounts[accIndex];
      const btn = document.getElementById(`browse-btn-${accountId}`);
      const originalHtml = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

      const base = typeof API_BASE !== 'undefined' ? API_BASE : '';
      try {
        const response = await fetch(`${base}/api/new_api/safe_browser`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: acc.token, platform: acc.platform || 'twitter', accountId: acc.id })
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
      const accIndex = xactionsAccounts.findIndex(a => String(a.id) === String(accountId));
      if (accIndex === -1) return;

      const acc = xactionsAccounts[accIndex];
      const btn = document.getElementById(`check-btn-${accountId}`);
      const originalHtml = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

      const base = typeof API_BASE !== 'undefined' ? API_BASE : '';
      try {
        const response = await fetch(`${base}/api/new_api/check_suspension`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: acc.token, username: acc.name.split(' ')[0], platform: acc.platform || 'twitter' })
        });

        const data = await response.json();
        if (data.success) {
          xactionsAccounts[accIndex].isSuspended = data.isSuspended || data.doesNotExist;
          localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
          syncAccountsWithDb();
          renderAccountsList();
        } else {
          alert(`فشل فحص ${acc.name}: ${data.error}`);
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
      const base = typeof API_BASE !== 'undefined' ? API_BASE : '';

      for (const [index, acc] of xactionsAccounts.entries()) {
        checkAllBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${index + 1} / ${xactionsAccounts.length}...`;

        try {
          const response = await fetch(`${base}/api/new_api/check_suspension`, {
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

    // ==========================================
    // Accounts Export & Import Mechanism
    // ==========================================

    function openExportAccountsModal() {
      const currentScopeLabel = document.getElementById('export-scope-current-label');
      if (currentScopeLabel) {
        const platformName = currentAccountPlatform === 'facebook' ? 'فيسبوك (Facebook)' : 'إكس (X / Twitter)';
        currentScopeLabel.textContent = `حسابات المنصة الحالية فقط (${platformName})`;
      }
      const modal = document.getElementById('export-accounts-modal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeExportAccountsModal() {
      const modal = document.getElementById('export-accounts-modal');
      if (modal) modal.classList.add('hidden');
    }

    function getAccountsExportPayload() {
      const scopeRadio = document.querySelector('input[name="export-scope"]:checked');
      const scope = scopeRadio ? scopeRadio.value : 'current';

      let accountsToExport = [];
      if (scope === 'all') {
        accountsToExport = [...xactionsAccounts];
      } else {
        accountsToExport = xactionsAccounts.filter(acc => (acc.platform || 'twitter') === currentAccountPlatform);
      }

      // Format accounts with all credentials, avatar, order and metadata
      const cleanAccounts = accountsToExport.map((acc, i) => ({
        id: String(acc.id || Date.now()),
        name: acc.name || 'حساب بدون اسم',
        platform: acc.platform || 'twitter',
        token: acc.token || '',
        country: acc.country || 'global',
        isSuspended: !!acc.isSuspended,
        username: acc.username || '',
        email: acc.email || '',
        phone: acc.phone || '',
        password: acc.password || '',
        avatar: acc.avatar || '',
        notes: acc.notes || '',
        order: typeof acc.order === 'number' ? acc.order : i
      }));

      return {
        version: 1,
        app: 'XActions',
        exportedAt: new Date().toISOString(),
        platformScope: scope,
        totalAccounts: cleanAccounts.length,
        accounts: cleanAccounts
      };
    }

    function downloadAccountsExportFile() {
      const payload = getAccountsExportPayload();
      if (!payload.accounts || payload.accounts.length === 0) {
        return alert('لا توجد حسابات متاحة للتصدير في هذا النطاق.');
      }

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateStr = new Date().toISOString().slice(0, 10);
      const scopeName = payload.platformScope === 'all' ? 'all' : currentAccountPlatform;
      link.href = url;
      link.download = `xactions-accounts-${scopeName}-${dateStr}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      closeExportAccountsModal();
    }

    async function copyAccountsExportJson() {
      const payload = getAccountsExportPayload();
      if (!payload.accounts || payload.accounts.length === 0) {
        return alert('لا توجد حسابات متاحة للتصدير في هذا النطاق.');
      }

      const jsonStr = JSON.stringify(payload, null, 2);
      let copied = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(jsonStr);
          copied = true;
        } catch (e) {
          console.warn('Clipboard API error:', e);
        }
      }

      if (!copied) {
        const textarea = document.createElement('textarea');
        textarea.value = jsonStr;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          copied = document.execCommand('copy');
        } catch (e) {
          console.warn('execCommand error:', e);
        }
        document.body.removeChild(textarea);
      }

      if (copied) {
        alert(`تم نسخ كود JSON بنجاح (${payload.totalAccounts} حساب). يمكنك حفظه أو استيراده في أي وقت.`);
        closeExportAccountsModal();
      } else {
        alert('تعذر النسخ التلقائي إلى الحافظة. يرجى استخدام خيار تحميل الملف.');
      }
    }

    function openImportAccountsModal() {
      const fileInput = document.getElementById('import-accounts-file-input');
      if (fileInput) fileInput.value = '';

      const fileNameContainer = document.getElementById('import-file-name');
      if (fileNameContainer) fileNameContainer.classList.add('hidden');

      const jsonTextarea = document.getElementById('import-accounts-json-text');
      if (jsonTextarea) jsonTextarea.value = '';

      const modal = document.getElementById('import-accounts-modal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeImportAccountsModal() {
      const modal = document.getElementById('import-accounts-modal');
      if (modal) modal.classList.add('hidden');
    }

    function handleAccountsFileSelected(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const fileNameText = document.getElementById('import-file-name-text');
      const fileNameContainer = document.getElementById('import-file-name');
      if (fileNameText && fileNameContainer) {
        fileNameText.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        fileNameContainer.classList.remove('hidden');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const jsonTextarea = document.getElementById('import-accounts-json-text');
        if (jsonTextarea) {
          jsonTextarea.value = content;
        }
      };
      reader.onerror = () => {
        alert('فشل قراءة الملف المحدد. تأكد من سلامة الملف.');
      };
      reader.readAsText(file);
    }

    async function pasteAccountsJsonFromClipboard() {
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            const jsonTextarea = document.getElementById('import-accounts-json-text');
            if (jsonTextarea) {
              jsonTextarea.value = text;
            }
            return;
          }
        } catch (e) {
          console.warn('Clipboard read error:', e);
        }
      }
      alert('يرجى لصق الكود يدويًا في المربع أدناه (Ctrl+V أو اللصق بالزر الأيمن).');
    }

    async function executeAccountsImport() {
      const jsonTextarea = document.getElementById('import-accounts-json-text');
      const rawText = jsonTextarea ? jsonTextarea.value.trim() : '';

      if (!rawText) {
        return alert('يرجى اختيار ملف JSON أو لصق كود الحسابات أولاً.');
      }

      let parsedData;
      try {
        parsedData = JSON.parse(rawText);
      } catch (err) {
        console.error('JSON parse error during import:', err);
        return alert('خطأ في نسق JSON: يرجى التأكد من صحة الكود البرمجي المدخل أو سلامة الملف.');
      }

      // Determine incoming accounts list
      let incomingAccounts = [];
      if (Array.isArray(parsedData)) {
        incomingAccounts = parsedData;
      } else if (parsedData && Array.isArray(parsedData.accounts)) {
        incomingAccounts = parsedData.accounts;
      } else if (parsedData && typeof parsedData === 'object') {
        // Maybe single account object
        if (parsedData.token || parsedData.name || parsedData.username) {
          incomingAccounts = [parsedData];
        }
      }

      if (!Array.isArray(incomingAccounts) || incomingAccounts.length === 0) {
        return alert('لم يتم العثور على أي حسابات صالحة في الملف أو النص المدخل.');
      }

      // Strategy
      const strategyRadio = document.querySelector('input[name="import-strategy"]:checked');
      const strategy = strategyRadio ? strategyRadio.value : 'merge'; // 'merge' or 'skip'

      let countAdded = 0;
      let countUpdated = 0;
      let countSkipped = 0;

      for (const incoming of incomingAccounts) {
        if (!incoming || typeof incoming !== 'object') continue;

        const incName = (incoming.name || incoming.username || 'حساب مستورد').trim();
        const incToken = (incoming.token || '').trim();
        const incPlatform = (incoming.platform || currentAccountPlatform || 'twitter').trim().toLowerCase();
        const incCountry = (incoming.country || 'global').trim();
        const incSuspended = Boolean(incoming.isSuspended);
        const incUsername = (incoming.username || '').trim();
        const incEmail = (incoming.email || '').trim();
        const incPhone = (incoming.phone || '').trim();
        const incPassword = (incoming.password || '').trim();
        const incAvatar = (incoming.avatar || '').trim();
        const incNotes = (incoming.notes || '').trim();
        const incOrder = typeof incoming.order === 'number' ? incoming.order : xactionsAccounts.length;

        // Match existing account by ID, Token, or Username/Name + Platform
        const matchIndex = xactionsAccounts.findIndex(existing => {
          if (incoming.id && String(existing.id) === String(incoming.id)) return true;
          if (incToken && existing.token && existing.token.trim() === incToken) return true;
          if (incUsername && existing.username && existing.username.toLowerCase() === incUsername.toLowerCase() && (existing.platform || 'twitter') === incPlatform) return true;
          if (incName && existing.name && existing.name.toLowerCase() === incName.toLowerCase() && (existing.platform || 'twitter') === incPlatform) return true;
          return false;
        });

        if (matchIndex !== -1) {
          if (strategy === 'skip') {
            countSkipped++;
            continue;
          }

          // Strategy is 'merge': update existing account with new data
          const existing = xactionsAccounts[matchIndex];
          if (incName && (!existing.name || existing.name === 'حساب جديد')) existing.name = incName;
          if (incToken) existing.token = incToken;
          if (incPlatform) existing.platform = incPlatform;
          if (incCountry && incCountry !== 'global') existing.country = incCountry;
          if (incoming.isSuspended !== undefined) existing.isSuspended = incSuspended;
          if (incUsername) existing.username = incUsername;
          if (incEmail) existing.email = incEmail;
          if (incPhone) existing.phone = incPhone;
          if (incPassword) existing.password = incPassword;
          if (incAvatar) existing.avatar = incAvatar;
          if (incNotes) existing.notes = incNotes;
          if (typeof incoming.order === 'number') existing.order = incOrder;

          countUpdated++;
        } else {
          // Add new account
          const newId = String(incoming.id || Date.now() + '_' + Math.random().toString(36).substr(2, 6));
          xactionsAccounts.push({
            id: newId,
            name: incName,
            token: incToken,
            platform: incPlatform,
            country: incCountry,
            isSuspended: incSuspended,
            username: incUsername,
            email: incEmail,
            phone: incPhone,
            password: incPassword,
            avatar: incAvatar,
            notes: incNotes,
            order: incOrder
          });
          countAdded++;
        }
      }

      // Sort accounts by order
      xactionsAccounts.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Save to localStorage
      localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));

      // Sync to Database
      await syncAccountsWithDb();

      // Refresh UI
      renderAccountsList();
      updateAccountsBadge();
      closeImportAccountsModal();

      alert(`✅ تم الاستيراد بنجاح!\n\n• حسابات جديدة تم إضافتها: ${countAdded}\n• حسابات حالية تم تحديث بياناتها: ${countUpdated}\n• حسابات مكررة تم تخطيها: ${countSkipped}\n• الإجمالي المحفوظ الآن: ${xactionsAccounts.length}`);
    }

    // ==========================================
    // Account Selection & Bulk Reordering
    // ==========================================

    function toggleAccountSelection(id, isChecked) {
      const strId = String(id);
      if (isChecked) {
        selectedAccountIds.add(strId);
      } else {
        selectedAccountIds.delete(strId);
      }
      updateBulkActionBar();
      renderAccountsList();
    }

    function toggleSelectAllAccounts(checked) {
      let filteredAccounts = xactionsAccounts.filter(acc => (acc.platform || 'twitter') === currentAccountPlatform);
      if (currentCountryFilter !== 'all') {
        filteredAccounts = filteredAccounts.filter(acc => acc.country === currentCountryFilter);
      }
      const searchInput = document.getElementById('filter-accounts-search');
      const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
      if (searchQuery) {
        filteredAccounts = filteredAccounts.filter(acc =>
          (acc.name && acc.name.toLowerCase().includes(searchQuery)) ||
          (acc.username && acc.username.toLowerCase().includes(searchQuery)) ||
          (acc.email && acc.email.toLowerCase().includes(searchQuery)) ||
          (acc.phone && acc.phone.includes(searchQuery)) ||
          (acc.notes && acc.notes.toLowerCase().includes(searchQuery))
        );
      }

      if (checked) {
        filteredAccounts.forEach(acc => selectedAccountIds.add(String(acc.id)));
      } else {
        filteredAccounts.forEach(acc => selectedAccountIds.delete(String(acc.id)));
      }
      updateBulkActionBar();
      renderAccountsList();
    }

    function clearSelectedAccounts() {
      if (typeof selectedAccountIds !== 'undefined') {
        selectedAccountIds.clear();
      }
      const selectAllCb = document.getElementById('select-all-accounts-checkbox');
      if (selectAllCb) selectAllCb.checked = false;
      updateBulkActionBar();
      renderAccountsList();
    }

    function updateBulkActionBar() {
      const bar = document.getElementById('accounts-bulk-actions-bar');
      const countEl = document.getElementById('selected-accounts-count');
      const selectAllCb = document.getElementById('select-all-accounts-checkbox');
      const count = typeof selectedAccountIds !== 'undefined' ? selectedAccountIds.size : 0;

      if (countEl) countEl.textContent = String(count);

      if (bar) {
        if (count > 0) {
          bar.classList.remove('hidden');
        } else {
          bar.classList.add('hidden');
        }
      }

      if (selectAllCb) {
        let filteredAccounts = xactionsAccounts.filter(acc => (acc.platform || 'twitter') === currentAccountPlatform);
        if (currentCountryFilter !== 'all') {
          filteredAccounts = filteredAccounts.filter(acc => acc.country === currentCountryFilter);
        }
        const searchInput = document.getElementById('filter-accounts-search');
        const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (searchQuery) {
          filteredAccounts = filteredAccounts.filter(acc =>
            (acc.name && acc.name.toLowerCase().includes(searchQuery)) ||
            (acc.username && acc.username.toLowerCase().includes(searchQuery)) ||
            (acc.email && acc.email.toLowerCase().includes(searchQuery)) ||
            (acc.phone && acc.phone.includes(searchQuery)) ||
            (acc.notes && acc.notes.toLowerCase().includes(searchQuery))
          );
        }
        selectAllCb.checked = filteredAccounts.length > 0 && filteredAccounts.every(acc => selectedAccountIds.has(String(acc.id)));
      }
    }

    async function applyPlatformAccountsOrder(newPlatformAccs) {
      newPlatformAccs.forEach((acc, i) => {
        acc.order = i;
      });

      const otherPlatformAccs = xactionsAccounts.filter(a => (a.platform || 'twitter') !== currentAccountPlatform);
      xactionsAccounts = [...otherPlatformAccs, ...newPlatformAccs];
      xactionsAccounts.sort((a, b) => (a.order || 0) - (b.order || 0));

      localStorage.setItem('xactions_accounts', JSON.stringify(xactionsAccounts));
      renderAccountsList();
      updateBulkActionBar();

      const base = typeof API_BASE !== 'undefined' ? API_BASE : '';
      try {
        await fetch(`${base}/api/new_api/accounts/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts: newPlatformAccs })
        });
      } catch (err) {
        console.error('Error syncing reordered accounts to DB:', err);
      }
    }

    async function moveAccountUp(id) {
      const platformAccs = xactionsAccounts.filter(a => (a.platform || 'twitter') === currentAccountPlatform);
      const currentIdx = platformAccs.findIndex(a => String(a.id) === String(id));
      if (currentIdx <= 0) return;

      const temp = platformAccs[currentIdx];
      platformAccs[currentIdx] = platformAccs[currentIdx - 1];
      platformAccs[currentIdx - 1] = temp;

      await applyPlatformAccountsOrder(platformAccs);
    }

    async function moveAccountDown(id) {
      const platformAccs = xactionsAccounts.filter(a => (a.platform || 'twitter') === currentAccountPlatform);
      const currentIdx = platformAccs.findIndex(a => String(a.id) === String(id));
      if (currentIdx === -1 || currentIdx >= platformAccs.length - 1) return;

      const temp = platformAccs[currentIdx];
      platformAccs[currentIdx] = platformAccs[currentIdx + 1];
      platformAccs[currentIdx + 1] = temp;

      await applyPlatformAccountsOrder(platformAccs);
    }

    async function moveSelectedAccountsUp() {
      if (!selectedAccountIds || selectedAccountIds.size === 0) return;
      const platformAccs = xactionsAccounts.filter(a => (a.platform || 'twitter') === currentAccountPlatform);
      let moved = false;
      for (let i = 1; i < platformAccs.length; i++) {
        const currId = String(platformAccs[i].id);
        const prevId = String(platformAccs[i - 1].id);
        if (selectedAccountIds.has(currId) && !selectedAccountIds.has(prevId)) {
          const temp = platformAccs[i];
          platformAccs[i] = platformAccs[i - 1];
          platformAccs[i - 1] = temp;
          moved = true;
        }
      }
      if (moved) {
        await applyPlatformAccountsOrder(platformAccs);
      }
    }

    async function moveSelectedAccountsDown() {
      if (!selectedAccountIds || selectedAccountIds.size === 0) return;
      const platformAccs = xactionsAccounts.filter(a => (a.platform || 'twitter') === currentAccountPlatform);
      let moved = false;
      for (let i = platformAccs.length - 2; i >= 0; i--) {
        const currId = String(platformAccs[i].id);
        const nextId = String(platformAccs[i + 1].id);
        if (selectedAccountIds.has(currId) && !selectedAccountIds.has(nextId)) {
          const temp = platformAccs[i];
          platformAccs[i] = platformAccs[i + 1];
          platformAccs[i + 1] = temp;
          moved = true;
        }
      }
      if (moved) {
        await applyPlatformAccountsOrder(platformAccs);
      }
    }

    async function moveSelectedAccountsToTop() {
      if (!selectedAccountIds || selectedAccountIds.size === 0) return;
      const platformAccs = xactionsAccounts.filter(a => (a.platform || 'twitter') === currentAccountPlatform);
      const selected = platformAccs.filter(a => selectedAccountIds.has(String(a.id)));
      const unselected = platformAccs.filter(a => !selectedAccountIds.has(String(a.id)));
      const newOrder = [...selected, ...unselected];
      await applyPlatformAccountsOrder(newOrder);
    }

    async function moveSelectedAccountsToBottom() {
      if (!selectedAccountIds || selectedAccountIds.size === 0) return;
      const platformAccs = xactionsAccounts.filter(a => (a.platform || 'twitter') === currentAccountPlatform);
      const selected = platformAccs.filter(a => selectedAccountIds.has(String(a.id)));
      const unselected = platformAccs.filter(a => !selectedAccountIds.has(String(a.id)));
      const newOrder = [...unselected, ...selected];
      await applyPlatformAccountsOrder(newOrder);
    }

    // ==========================================
    // Account Profile & Details Card Modal
    // ==========================================

    function openAccountDetailModal(id) {
      const acc = xactionsAccounts.find(a => String(a.id) === String(id));
      if (!acc) return;

      // Name & Flag
      const nameEl = document.getElementById('card-modal-name');
      if (nameEl) nameEl.textContent = acc.name || 'حساب بدون اسم';

      const flagEl = document.getElementById('card-modal-country');
      if (flagEl) flagEl.textContent = buildFlagEmoji(acc.country);

      // Platform
      const isFb = (acc.platform || 'twitter') === 'facebook';
      const platformIcon = isFb ? 'fa-facebook text-blue-500' : 'fa-x-twitter text-brand-400';
      const platformText = isFb ? 'فيسبوك (Facebook)' : 'إكس (X / Twitter)';

      const platformTextEl = document.getElementById('card-modal-platform-text');
      if (platformTextEl) platformTextEl.textContent = platformText;

      const platformBadge = document.getElementById('card-modal-platform-badge');
      if (platformBadge) platformBadge.innerHTML = `<i class="fa-brands ${platformIcon}"></i>`;

      // Avatar
      const avatarContainer = document.getElementById('card-modal-avatar-container');
      if (avatarContainer) {
        if (acc.avatar) {
          avatarContainer.innerHTML = `<img src="${escapeAttr(acc.avatar)}" class="w-full h-full object-cover" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="w-full h-full flex items-center justify-center text-slate-400 hidden"><i class="fa-brands ${platformIcon} text-2xl"></i></div>`;
        } else {
          avatarContainer.innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-400"><i class="fa-brands ${platformIcon} text-2xl"></i></div>`;
        }
      }

      // Status
      const statusBadge = document.getElementById('card-modal-status-badge');
      if (statusBadge) {
        if (acc.isSuspended) {
          statusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
          statusBadge.textContent = 'موقوف / يحتاج مراجعة';
        } else {
          statusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          statusBadge.textContent = 'نشط وسليم';
        }
      }

      // Username, Email, Phone
      const userEl = document.getElementById('card-modal-username');
      if (userEl) userEl.textContent = acc.username ? `@${acc.username}` : '(غير محدد)';

      const emailEl = document.getElementById('card-modal-email');
      if (emailEl) emailEl.textContent = acc.email || '(غير محدد)';

      const phoneEl = document.getElementById('card-modal-phone');
      if (phoneEl) phoneEl.textContent = acc.phone || '(غير محدد)';

      // Password
      const pwdEl = document.getElementById('card-modal-password');
      if (pwdEl) {
        pwdEl.setAttribute('data-pwd', acc.password || '');
        pwdEl.setAttribute('data-masked', 'true');
        pwdEl.textContent = acc.password ? '••••••••' : '(لا توجد كلمة مرور)';
        const pwdIcon = document.getElementById('card-modal-pwd-icon');
        const pwdLabel = document.getElementById('card-modal-pwd-label');
        if (pwdIcon) { pwdIcon.className = 'fa-solid fa-eye text-[11px]'; }
        if (pwdLabel) { pwdLabel.textContent = 'كشف'; }
      }

      // Notes
      const notesEl = document.getElementById('card-modal-notes');
      if (notesEl) {
        notesEl.textContent = acc.notes ? acc.notes : '(لا توجد ملاحظات)';
      }

      // Token
      const tokenEl = document.getElementById('card-modal-token');
      if (tokenEl) tokenEl.textContent = acc.token || '(فارغ)';

      // Buttons
      const copyAllBtn = document.getElementById('card-modal-copy-all-btn');
      if (copyAllBtn) copyAllBtn.onclick = () => copyAllAccountData(acc.id);

      const browseBtn = document.getElementById('card-modal-browse-btn');
      if (browseBtn) browseBtn.onclick = () => openSafeBrowser(acc.id);

      const editBtn = document.getElementById('card-modal-edit-btn');
      if (editBtn) editBtn.onclick = () => { closeAccountDetailModal(); editAccount(acc.id); };

      const modal = document.getElementById('account-detail-modal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeAccountDetailModal() {
      const modal = document.getElementById('account-detail-modal');
      if (modal) modal.classList.add('hidden');
    }

    function copyCardField(elementId, labelName) {
      const el = document.getElementById(elementId);
      const text = el ? (el.textContent || '').trim() : '';
      if (!text || text === 'غير محدد' || text === '(غير محدد)' || text === '(فارغ)') {
        return alert(`لا توجد بيانات لـ ${labelName} لنسخها.`);
      }
      navigator.clipboard.writeText(text).then(() => {
        alert(`تم نسخ ${labelName} بنجاح! 📋`);
      }).catch(() => {
        prompt(`انسخ ${labelName}:`, text);
      });
    }

    function toggleCardModalPassword() {
      const pwdEl = document.getElementById('card-modal-password');
      const icon = document.getElementById('card-modal-pwd-icon');
      const label = document.getElementById('card-modal-pwd-label');
      if (!pwdEl) return;
      const isMasked = pwdEl.getAttribute('data-masked') === 'true';
      const realPwd = pwdEl.getAttribute('data-pwd') || '';
      if (!realPwd) return alert('لا توجد كلمة مرور مخزنة لهذا الحساب.');

      if (isMasked) {
        pwdEl.textContent = realPwd;
        pwdEl.setAttribute('data-masked', 'false');
        pwdEl.classList.remove('text-amber-400');
        pwdEl.classList.add('text-emerald-400', 'font-bold');
        if (icon) icon.className = 'fa-solid fa-eye-slash text-[11px]';
        if (label) label.textContent = 'إخفاء';
      } else {
        pwdEl.textContent = '••••••••';
        pwdEl.setAttribute('data-masked', 'true');
        pwdEl.classList.remove('text-emerald-400', 'font-bold');
        pwdEl.classList.add('text-amber-400');
        if (icon) icon.className = 'fa-solid fa-eye text-[11px]';
        if (label) label.textContent = 'كشف';
      }
    }

    function copyCardModalPassword() {
      const pwdEl = document.getElementById('card-modal-password');
      const pwd = pwdEl ? pwdEl.getAttribute('data-pwd') : '';
      if (!pwd) return alert('لا توجد كلمة مرور مخزنة لهذا الحساب.');
      navigator.clipboard.writeText(pwd).then(() => {
        alert('تم نسخ كلمة المرور إلى الحافظة بنجاح! 📋');
      }).catch(() => {
        prompt('انسخ كلمة المرور:', pwd);
      });
    }

