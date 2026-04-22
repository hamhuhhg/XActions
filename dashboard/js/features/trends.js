// js/features/trends.js
    // --- Trend Extractor Logic ---
    async function renderTrendExtractor(container) {
      container.innerHTML = `
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-fire text-orange-500"></i> خيارات استخراج الترند
            </h3>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">الدولة المستهدفة</label>
            <div class="flex gap-2">
              <select id="trend-country" disabled class="w-full bg-slate-900/50 border border-darkborder rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 appearance-none disabled:opacity-50">
                <option value="">جاري تحميل الدول...</option>
              </select>
              <button type="button" onclick="executeTrendExtraction()" id="btn-extract-trends" disabled class="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-2">
                  <i class="fa-solid fa-bolt"></i> استخراج
              </button>
            </div>
          </div>
        </div>
        
        <div id="trend-results-container" class="mt-6 border border-darkborder rounded-2xl overflow-hidden shadow-xl bg-slate-900/50 hidden">
          <div class="flex items-center justify-between border-b border-darkborder bg-slate-800/80 p-3">
             <h4 class="text-sm font-medium text-white flex items-center gap-2">
                <i class="fa-solid fa-list-ol text-slate-400"></i> قائمة الهاشتاجات النشطة (<span id="trend-country-name">Worldwide</span>)
             </h4>
             <button type="button" onclick="copyAllTrends()" class="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20 hover:bg-brand-500/20">
               <i class="fa-regular fa-copy"></i> نسخ جميع الهاشتاجات
             </button>
          </div>
          <div class="p-0 overflow-x-auto custom-scrollbar">
            <table class="w-full text-sm text-right text-slate-300">
              <thead class="text-xs text-slate-400 uppercase bg-slate-800/30">
                  <tr>
                      <th scope="col" class="px-4 py-3 border-b border-darkborder text-center w-16">الترتيب</th>
                      <th scope="col" class="px-4 py-3 border-b border-darkborder">الترند (هاشتاج/كلمة)</th>
                      <th scope="col" class="px-4 py-3 border-b border-darkborder">حجم التغريدات</th>
                      <th scope="col" class="px-4 py-3 border-b border-darkborder w-24">إجراء</th>
                  </tr>
              </thead>
              <tbody id="trends-table-body" class="divide-y divide-darkborder/50">
                  <!-- JS Injected Rows -->
              </tbody>
            </table>
          </div>
        </div>
      `;

      const select = document.getElementById('trend-country');
      const btn = document.getElementById('btn-extract-trends');

      select.innerHTML = '';
      window.trendCountries.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.slug;
        opt.innerText = c.name;
        select.appendChild(opt);
      });
      select.disabled = false;
      btn.disabled = false;
    }

    async function executeTrendExtraction() {
      const select = document.getElementById('trend-country');
      const countrySlug = select.value;
      const countryName = select.options[select.selectedIndex].text;
      const btn = document.getElementById('btn-extract-trends');
      const container = document.getElementById('trend-results-container');
      const tbody = document.getElementById('trends-table-body');

      if (!countrySlug) return;

      printToTerminal(`[TrandExtractor] جاري استخراج الترند لدولة ${countryName} عبر المتصفح المخفي...`, 'info');

      const originalBtnHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري...';
      btn.disabled = true;
      select.disabled = true;

      try {
        const res = await fetch(`/api/new_api/trends/${countrySlug}`);
        const data = await res.json();

        if (data.success && data.trends) {
          window.lastExtractedTrends = data.trends; // Cache for universal copying
          document.getElementById('trend-country-name').innerText = countryName;

          tbody.innerHTML = '';
          if (data.trends.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-slate-500">لايوجد معلومات متوفرة لهذه الدولة حالياً.</td></tr>';
          } else {
            data.trends.forEach(t => {
              const tr = document.createElement('tr');
              tr.className = 'hover:bg-slate-800/30 transition-colors group';

              const safeName = t.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');

              tr.innerHTML = `
                  <td class="px-4 py-3 font-mono text-xs text-center text-slate-500">${t.rank || '-'}</td>
                  <td class="px-4 py-3 font-semibold text-white">${t.name}</td>
                  <td class="px-4 py-3 text-xs text-slate-400">${t.volume || 'غير معروف'}</td>
                  <td class="px-4 py-3 text-left">
                    <button onclick="copyTrend('${safeName}')" class="text-slate-500 hover:text-brand-400 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="نسخ لاستخدامه في أتمتة">
                      <i class="fa-regular fa-copy"></i>
                    </button>
                  </td>
                `;
              tbody.appendChild(tr);
            });
          }
          container.classList.remove('hidden');
          printToTerminal(`تم استخراج ${data.trends.length} هاشتاج / ترند بنجاح.`, 'success');
        } else {
          alert('فشل استخراج الترند: ' + (data.error || 'خطأ غير معروف'));
          printToTerminal('فشل عملية استخراج الترند', 'error');
        }
      } catch (err) {
        console.error(err);
        alert('حدث خطأ في الاتصال أثناء استخراج الترند');
      } finally {
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
        select.disabled = false;
      }
    }

    function copyTrend(text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('تم نسخ: ' + text);
      }).catch(err => {
        alert('فشل النسخ: ' + err);
      });
    }

    function copyAllTrends() {
      if (!window.lastExtractedTrends || window.lastExtractedTrends.length === 0) {
        alert('لا يوجد هاشتاجات لنسخها');
        return;
      }

      // Combine all trend names with space
      const combined = window.lastExtractedTrends.map(t => t.name).join(' ');
      navigator.clipboard.writeText(combined).then(() => {
        alert('تم نسخ جميع الهاشتاجات للذاكرة بنجاح لاستخدامها في البوتات!');
      }).catch(err => {
        alert('فشل النسخ: ' + err);
      });
    }

