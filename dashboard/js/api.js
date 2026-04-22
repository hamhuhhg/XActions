// js/api.js
    // Execute API Call
    async function executeTool() {
      if (!currentToolId) return;
      const tool = tools[currentToolId];
      // Regular inputs
      const formInputs = document.querySelectorAll('#dynamic-form input, #dynamic-form select, #dynamic-form textarea:not(.textarea-list-item)');
      let params = {};
      let isValid = true;
      formInputs.forEach(input => {
        if (input.required && !input.value.trim()) {
          input.classList.add('border-red-500');
          isValid = false;
        } else {
          input.classList.remove('border-red-500');
        }
        if (input.type === 'checkbox') {
          params[input.name] = input.checked;
        } else {
          params[input.name] = input.value.trim();
        }
      });

      // Textarea List Inputs (e.g., Auto Poster)
      if (tool.inputs.some(i => i.type === 'textarea-list')) {
        const listItems = document.querySelectorAll('.textarea-list-item');
        let combinedText = [];
        listItems.forEach(area => {
          const val = area.value.trim();
          if (val) combinedText.push(val);
        });

        if (combinedText.length === 0) {
          isValid = false;
          // Highlight first one
          if (listItems[0]) listItems[0].classList.add('border-red-500');
        } else {
          // Combine with the separator expected by autoPoster.js
          params['tweets'] = combinedText.join('\n---\n');
        }
      }
      if (!isValid) return printToTerminal('خطأ: يرجى ملء جميع الحقول المطلوبة.', 'error');

      let selectedAccounts = [];
      if (tool.requiresAuth) {
        const checks = document.querySelectorAll('.account-checkbox:checked');
        checks.forEach(cb => {
          const acc = xactionsAccounts.find(a => a.id == cb.value);
          if (acc) selectedAccounts.push(acc);
        });
        if (selectedAccounts.length === 0) {
          return printToTerminal('خطأ: يرجى اختيار حساب واحد على الأقل.', 'error');
        }
      } else {
        selectedAccounts.push({ name: 'System', token: null });
      }

      // UI Loading state
      const runBtn = document.getElementById('run-btn');
      const originalBtnHtml = runBtn.innerHTML;
      runBtn.disabled = true;
      runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري تنفيذ المهمة...';
      clearTerminal();

      let allResults = [];

      try {
        for (const acc of selectedAccounts) {
          let logPrefix = tool.requiresAuth ? `[${acc.name}] ` : '';
          printToTerminal(`${logPrefix}[${new Date().toLocaleTimeString()}] بدء تشغيل ${tool.title}...`, 'info');

          const method = tool.method || 'GET';
          let fetchOptions = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
          };
          if (acc.token) {
            fetchOptions.headers['x-auth-token'] = acc.token;
          }
          let url = tool.endpoint;
          if (method === 'GET' || method === 'HEAD') {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
          } else {
            fetchOptions.body = JSON.stringify({
              scriptName: tool.scriptName,
              options: params
            });
          }
          const response = await fetch(url, fetchOptions);
          const result = await response.json();
          if (result.success) {
            let resData = result.data || result.message;
            allResults.push({ account: acc.name, data: resData });

            if (typeof resData === 'object') {
              printToTerminal(`${logPrefix}تم التنفيذ بنجاح. تحقق من المخرجات المرفقة.`, 'success');
            } else {
              printToTerminal(`${logPrefix}${resData}`, 'success');
            }
          } else {
            printToTerminal(`${logPrefix}خطأ في API: ${result.error}`, 'error');
          }
        }

        // Output final JSON if objects were returned
        if (allResults.length > 0) {
          // If only 1 result, format as single data array, otherwise map multiple outputs
          lastResultData = allResults.length === 1 && !tool.requiresAuth ? allResults[0].data : allResults;
          const isObj = typeof lastResultData === 'object';
          document.getElementById('export-controls').style.display = isObj ? 'flex' : 'none';
          if (isObj) {
            const formattedJSON = syntaxHighlightJSON(JSON.stringify(lastResultData, null, 2));
            document.getElementById('terminal-output').innerHTML += `<div class="mt-4 pt-4 border-t border-slate-800 w-full"><pre><code>${formattedJSON}</code></pre></div>`;
          }
        }
      } catch (err) {
        printToTerminal(`خطأ في الشبكة/النظام: ${err.message}`, 'error');
      } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = originalBtnHtml;
      }
    }
