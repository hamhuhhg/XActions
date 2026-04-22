tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#f0fdfa',
              100: '#ccfbf1',
              400: '#2dd4bf',
              500: '#14b8a6',
              600: '#0d9488',
              900: '#134e4a',
            },
            darkmain: '#0f172a',
            darkcard: '#1e293b',
            darkborder: '#334155'
          },
          animation: {
            'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="css/styles.css">
</head>

<body
  class="bg-darkmain text-slate-200 font-sans antialiased min-h-screen flex selection:bg-brand-500 selection:text-white">
  <!-- Sidebar Navigation -->
  <aside
    class="w-64 bg-darkcard border-r border-darkborder flex flex-col h-screen sticky top-0 shadow-2xl z-20 transition-all duration-300">
    <div class="p-6 flex items-center gap-3 border-b border-darkborder">
      <div
        class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-blue-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
        <i class="fa-brands fa-x-twitter text-white text-xl"></i>
      </div>
      <div>
        <h1 class="font-bold text-xl tracking-tight text-white">XActions</h1>
        <p class="text-xs text-brand-400 font-medium tracking-wider uppercase">أدوات متقدمة</p>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto py-4 px-3 space-y-6">
      <!-- Data Scrapers Section -->
      <div>
        <h2 class="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">استخراج البيانات</h2>
        <nav class="space-y-1" id="nav-scrapers"></nav>
      </div>
      <!-- Automation Tools Section -->
      <div>
        <h2 class="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">بوتات الأتمتة</h2>
        <nav class="space-y-1" id="nav-automation"></nav>
      </div>
      <!-- AI Section -->
      <div>
        <h2 class="px-3 text-xs font-semibold text-brand-400/70 uppercase tracking-wider mb-2">الذكاء الاصطناعي</h2>
        <nav class="space-y-1" id="nav-ai"></nav>
      </div>
    </div>
    <div class="p-4 border-t border-darkborder">
      <a href="/dashboard"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full text-sm">
        <i class="fa-solid fa-arrow-right"></i>
        العودة للقائمة الرئيسية
      </a>
    </div>
  </aside>
  <!-- Main Content Area -->
  <main
    class="flex-1 flex flex-col h-screen overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wMikiLz48L3N2Zz4=')]">
    <!-- Headerbar -->
    <header class="h-20 glass-panel border-b border-darkborder flex items-center justify-between px-8 z-10">
      <div>
        <h2 id="current-tool-title" class="text-2xl font-bold text-white flex items-center gap-3">
          <i class="fa-solid fa-bolt text-brand-400"></i>
          اختر أداة
        </h2>
        <p id="current-tool-desc" class="text-sm text-slate-400 mt-1">اختر أداة من الشريط الجانبي للبدء.</p>
      </div>
      <div class="flex items-center gap-4">
        <!-- Accounts Manager Quick Set -->
        <div class="relative">
          <button onclick="openAccountsManager()"
            class="bg-darkcard border border-darkborder hover:border-brand-500/50 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-brand-500/20">
            <i class="fa-solid fa-users text-brand-400"></i>
            إدارة الحسابات
          </button>
        </div>
      </div>
    </header>
    <!-- Dynamic Workspace -->
    <div class="flex-1 overflow-y-auto p-8 relative">
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Welcome State (Visible initially) -->
        <div id="welcome-state"
          class="flex flex-col items-center justify-center h-[60vh] text-center max-w-2xl mx-auto text-right">
          <div
            class="w-24 h-24 bg-darkcard rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-darkborder relative mx-auto">
            <div class="absolute inset-0 bg-brand-500 rounded-2xl blur-xl opacity-20 animate-pulse-slow">
            </div>
            <i class="fa-solid fa-wand-magic-sparkles text-4xl text-brand-400"></i>
          </div>
          <h2 class="text-3xl font-bold text-white mb-4 text-center">مرحباً بك في أدوات XActions المتقدمة</h2>
          <p class="text-slate-400 text-lg mb-8 text-center">نفذ عمليات استخراج وأتمتة قوية مباشرة من متصفحك دون الحاجة
            لسطر الأوامر.</p>
          <div class="grid grid-cols-2 gap-4 w-full">
            <div class="bg-darkcard p-4 rounded-xl border border-darkborder flex items-start gap-4 text-right">
              <!-- Header details -->
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
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
          </div>
        </div>
        <!-- Tool Form (Hidden initially) -->
        <div id="tool-workspace" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Configuration Panel -->
          <div class="lg:col-span-4 space-y-6">
            <div class="glass-panel rounded-2xl p-6 shadow-xl">
              <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <i class="fa-solid fa-sliders text-slate-400"></i>
                الإعدادات
              </h3>
              <!-- Dynamic Form Injected Here -->
              <form id="dynamic-form" class="space-y-4">
                <!-- Inputs injected via JS -->
              </form>
              <div class="mt-8">
                <button id="run-btn"
                  class="w-full relative group overflow-hidden rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 px-4 shadow-lg shadow-brand-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span class="relative z-10 flex items-center justify-center gap-2">
                    <i class="fa-solid fa-play"></i>
                    <span id="run-btn-text">تنفيذ المهمة</span>
                  </span>
                  <!-- Hover effect -->
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-brand-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  </div>
                </button>
              </div>
            </div>
            <!-- Status/Usage Card -->
            <div class="bg-darkcard rounded-2xl p-5 border border-darkborder shadow-xl">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-slate-300">حالة المصادقة</span>
                <span id="auth-status-badge"
                  class="px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-400 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> غير محدد
                </span>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed">بعض مهام الأتمتة تتطلب رمز مصادقة نشط (auth_token). قم
                بتعيينه من القائمة العلوية.</p>
            </div>
          </div>
          <!-- Results Terminal -->
          <div class="lg:col-span-8 flex flex-col h-[calc(100vh-12rem)]">
            <div
              class="glass-panel rounded-t-2xl px-4 py-3 border-b border-darkborder flex items-center justify-between shadow-sm">
              <div class="flex items-center gap-3">
                <i class="fa-solid fa-terminal text-slate-400"></i>
                <span class="text-sm font-medium text-slate-200">مخرجات النظام</span>
              </div>
              <div class="flex gap-2" id="export-controls" style="display: none;">
                <button onclick="copyResults()"
                  class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors tooltip"
                  title="نسخ للائحة">
                  <i class="fa-regular fa-copy"></i>
                </button>
                <button onclick="downloadJSON()"
                  class="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded transition-colors tooltip"
                  title="تحميل كملف JSON">
                  <i class="fa-solid fa-download"></i>
                </button>
              </div>
            </div>
            <div
              class="bg-[#0b1120] border-x border-b border-darkborder rounded-b-2xl flex-1 p-4 overflow-y-auto relative shadow-inner font-mono text-sm leading-relaxed text-left"
              id="terminal-output" dir="ltr">
              <div class="text-slate-500 italic flex items-center justify-center h-full">في انتظار التنفيذ...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
  <!-- UI Logic -->
  <script>
    // Store current data
    
    
    

    // Static regions list from getdaytrends
    ,
      { name: "Algeria", slug: "algeria" },
      { name: "Argentina", slug: "argentina" },
      { name: "Australia", slug: "australia" },
      { name: "Austria", slug: "austria" },
      { name: "Bahrain", slug: "bahrain" },
      { name: "Belarus", slug: "belarus" },
      { name: "Belgium", slug: "belgium" },
      { name: "Brazil", slug: "brazil" },
      { name: "Canada", slug: "canada" },
      { name: "Chile", slug: "chile" },
      { name: "Colombia", slug: "colombia" },
      { name: "Denmark", slug: "denmark" },
      { name: "Dominican Republic", slug: "dominican-republic" },
      { name: "Ecuador", slug: "ecuador" },
      { name: "Egypt", slug: "egypt" },
      { name: "France", slug: "france" },
      { name: "Germany", slug: "germany" },
      { name: "Ghana", slug: "ghana" },
      { name: "Greece", slug: "greece" },
      { name: "Guatemala", slug: "guatemala" },
      { name: "India", slug: "india" },
      { name: "Indonesia", slug: "indonesia" },
      { name: "Ireland", slug: "ireland" },
      { name: "Israel", slug: "israel" },
      { name: "Italy", slug: "italy" },
      { name: "Japan", slug: "japan" },
      { name: "Jordan", slug: "jordan" },
      { name: "Kenya", slug: "kenya" },
      { name: "Korea", slug: "korea" },
      { name: "Kuwait", slug: "kuwait" },
      { name: "Latvia", slug: "latvia" },
      { name: "Lebanon", slug: "lebanon" },
      { name: "Malaysia", slug: "malaysia" },
      { name: "Mexico", slug: "mexico" },
      { name: "Netherlands", slug: "netherlands" },
      { name: "New Zealand", slug: "new-zealand" },
      { name: "Nigeria", slug: "nigeria" },
      { name: "Norway", slug: "norway" },
      { name: "Oman", slug: "oman" },
      { name: "Pakistan", slug: "pakistan" },
      { name: "Panama", slug: "panama" },
      { name: "Peru", slug: "peru" },
      { name: "Philippines", slug: "philippines" },
      { name: "Poland", slug: "poland" },
      { name: "Portugal", slug: "portugal" },
      { name: "Puerto Rico", slug: "puerto-rico" },
      { name: "Qatar", slug: "qatar" },
      { name: "Russia", slug: "russia" },
      { name: "Saudi Arabia", slug: "saudi-arabia" },
      { name: "Singapore", slug: "singapore" },
      { name: "South Africa", slug: "south-africa" },
      { name: "Spain", slug: "spain" },
      { name: "Sweden", slug: "sweden" },
      { name: "Switzerland", slug: "switzerland" },
      { name: "Thailand", slug: "thailand" },
      { name: "Turkey", slug: "turkey" },
      { name: "Ukraine", slug: "ukraine" },
      { name: "United Arab Emirates", slug: "united-arab-emirates" },
      { name: "United Kingdom", slug: "united-kingdom" },
      { name: "United States", slug: "united-states" },
      { name: "Venezuela", slug: "venezuela" },
      { name: "Vietnam", slug: "vietnam" }
    ];
    window.trendCountries = staticCountries;
    // Tool Configurations
    ;
    // Initialize UI
    );
    // Setup Sidebar Menu
    
    // Handle Tool Selection
    
    // Execute API Call
    
    // Checkbox Helper
    
    // Terminal Helpers
    
    
    // Accounts Manager Status Badge Dummy (remove old logic)
    
    // Accounts Management
    
    

    // Tool Form Account Filtering & Selection
    

    

    
    

    ,
      { code: 'eg', name: 'مصر', flag: '🇪🇬' },
      { code: 'ae', name: 'الإمارات', flag: '🇦🇪' },
      { code: 'kw', name: 'الكويت', flag: '🇰🇼' },
      { code: 'qa', name: 'قطر', flag: '🇶🇦' },
      { code: 'om', name: 'عُمان', flag: '🇴🇲' },
      { code: 'bh', name: 'البحرين', flag: '🇧🇭' },
      { code: 'jo', name: 'الأردن', flag: '🇯🇴' },
      { code: 'lb', name: 'لبنان', flag: '🇱🇧' },
      { code: 'sy', name: 'سوريا', flag: '🇸🇾' },
      { code: 'iq', name: 'العراق', flag: '🇮🇶' },
      { code: 'ye', name: 'اليمن', flag: '🇾🇪' },
      { code: 'ma', name: 'المغرب', flag: '🇲🇦' },
      { code: 'dz', name: 'الجزائر', flag: '🇩🇿' },
      { code: 'tn', name: 'تونس', flag: '🇹🇳' },
      { code: 'ly', name: 'ليبيا', flag: '🇱🇾' },
      { code: 'sd', name: 'السودان', flag: '🇸🇩' },
      { code: 'ps', name: 'فلسطين', flag: '🇵🇸' },
      { code: 'mr', name: 'موريتانيا', flag: '🇲🇷' },
      { code: 'so', name: 'الصومال', flag: '🇸🇴' },
      { code: 'dj', name: 'جيبوتي', flag: '🇩🇯' },
      { code: 'km', name: 'جزر القمر', flag: '🇰🇲' },
      { code: 'us', name: 'الولايات المتحدة', flag: '🇺🇸' },
      { code: 'gb', name: 'بريطانيا', flag: '🇬🇧' },
      { code: 'ca', name: 'كندا', flag: '🇨🇦' },
      { code: 'au', name: 'أستراليا', flag: '🇦🇺' },
      { code: 'de', name: 'ألمانيا', flag: '🇩🇪' },
      { code: 'fr', name: 'فرنسا', flag: '🇫🇷' },
      { code: 'it', name: 'إيطاليا', flag: '🇮🇹' },
      { code: 'es', name: 'إسبانيا', flag: '🇪🇸' },
      { code: 'tr', name: 'تركيا', flag: '🇹🇷' },
      { code: 'in', name: 'الهند', flag: '🇮🇳' },
      { code: 'pk', name: 'باكستان', flag: '🇵🇰' },
      { code: 'bd', name: 'بنغلاديش', flag: '🇧🇩' },
      { code: 'id', name: 'إندونيسيا', flag: '🇮🇩' },
      { code: 'my', name: 'ماليزيا', flag: '🇲🇾' },
      { code: 'sg', name: 'سنغافورة', flag: '🇸🇬' },
      { code: 'jp', name: 'اليابان', flag: '🇯🇵' },
      { code: 'kr', name: 'كوريا الجنوبية', flag: '🇰🇷' },
      { code: 'cn', name: 'الصين', flag: '🇨🇳' },
      { code: 'ru', name: 'روسيا', flag: '🇷🇺' },
      { code: 'br', name: 'البرازيل', flag: '🇧🇷' },
      { code: 'ar', name: 'الأرجنتين', flag: '🇦🇷' },
      { code: 'mx', name: 'المكسيك', flag: '🇲🇽' },
      { code: 'za', name: 'جنوب أفريقيا', flag: '🇿🇦' },
      { code: 'ng', name: 'نيجيريا', flag: '🇳🇬' },
      { code: 'se', name: 'السويد', flag: '🇸🇪' },
      { code: 'no', name: 'النرويج', flag: '🇳🇴' },
      { code: 'dk', name: 'الدنمارك', flag: '🇩🇰' },
      { code: 'fi', name: 'فنلندا', flag: '🇫🇮' },
      { code: 'nl', name: 'هولندا', flag: '🇳🇱' },
      { code: 'be', name: 'بلجيكا', flag: '🇧🇪' },
      { code: 'ch', name: 'سويسرا', flag: '🇨🇭' },
      { code: 'at', name: 'النمسا', flag: '🇦🇹' },
      { code: 'gr', name: 'اليونان', flag: '🇬🇷' },
      { code: 'pt', name: 'البرتغال', flag: '🇵🇹' },
      { code: 'ie', name: 'أيرلندا', flag: '🇮🇪' },
      { code: 'nz', name: 'نيوزيلندا', flag: '🇳🇿' },
      { code: 'af', name: 'أفغانستان', flag: '🇦🇫' },
      { code: 'al', name: 'ألبانيا', flag: '🇦🇱' },
      { code: 'ad', name: 'أندورا', flag: '🇦🇩' },
      { code: 'ao', name: 'أنغولا', flag: '🇦🇴' },
      { code: 'ag', name: 'أنتيغوا وبربودا', flag: '🇦🇬' },
      { code: 'am', name: 'أرمينيا', flag: '🇦🇲' },
      { code: 'az', name: 'أذربيجان', flag: '🇦🇿' },
      { code: 'bs', name: 'جزر البهاما', flag: '🇧🇸' },
      { code: 'bb', name: 'باربادوس', flag: '🇧🇧' },
      { code: 'by', name: 'بيلاروسيا', flag: '🇧🇾' },
      { code: 'bz', name: 'بليز', flag: '🇧🇿' },
      { code: 'bj', name: 'بنين', flag: '🇧🇯' },
      { code: 'bt', name: 'بوتان', flag: '🇧🇹' },
      { code: 'bo', name: 'بوليفيا', flag: '🇧🇴' },
      { code: 'ba', name: 'البوسنة والهرسك', flag: '🇧🇦' },
      { code: 'bw', name: 'بوتسوانا', flag: '🇧🇼' },
      { code: 'bn', name: 'بروناي', flag: '🇧🇳' },
      { code: 'bg', name: 'بلغاريا', flag: '🇧🇬' },
      { code: 'bf', name: 'بوركينا فاسو', flag: '🇧🇫' },
      { code: 'bi', name: 'بوروندي', flag: '🇧🇮' },
      { code: 'cv', name: 'الرأس الأخضر', flag: '🇨🇻' },
      { code: 'kh', name: 'كمبوديا', flag: '🇰🇭' },
      { code: 'cm', name: 'الكاميرون', flag: '🇨🇲' },
      { code: 'cf', name: 'جمهورية أفريقيا الوسطى', flag: '🇨🇫' },
      { code: 'td', name: 'تشاد', flag: '🇹🇩' },
      { code: 'cl', name: 'تشيلي', flag: '🇨🇱' },
      { code: 'co', name: 'كولومبيا', flag: '🇨🇴' },
      { code: 'cg', name: 'الكونغو', flag: '🇨🇬' },
      { code: 'cd', name: 'جمهورية الكونغو الديمقراطية', flag: '🇨🇩' },
      { code: 'cr', name: 'كوستاريكا', flag: '🇨🇷' },
      { code: 'hr', name: 'كرواتيا', flag: '🇭🇷' },
      { code: 'cu', name: 'كوبا', flag: '🇨🇺' },
      { code: 'cy', name: 'قبرص', flag: '🇨🇾' },
      { code: 'cz', name: 'التشيك', flag: '🇨🇿' },
      { code: 'do', name: 'جمهورية الدومينيكان', flag: '🇩🇴' },
      { code: 'ec', name: 'الإكوادور', flag: '🇪🇨' },
      { code: 'sv', name: 'السلفادور', flag: '🇸🇻' },
      { code: 'gq', name: 'غينيا الاستوائية', flag: '🇬🇶' },
      { code: 'er', name: 'إريتريا', flag: '🇪🇷' },
      { code: 'ee', name: 'إستونيا', flag: '🇪🇪' },
      { code: 'sz', name: 'إسواتيني', flag: '🇸🇿' },
      { code: 'et', name: 'إثيوبيا', flag: '🇪🇹' },
      { code: 'fj', name: 'فيجي', flag: '🇫🇯' },
      { code: 'ga', name: 'الغابون', flag: '🇬🇦' },
      { code: 'gm', name: 'غامبيا', flag: '🇬🇲' },
      { code: 'ge', name: 'جورجيا', flag: '🇬🇪' },
      { code: 'gh', name: 'غانا', flag: '🇬🇭' },
      { code: 'gd', name: 'غرينادا', flag: '🇬🇩' },
      { code: 'gt', name: 'غواتيمالا', flag: '🇬🇹' },
      { code: 'gn', name: 'غينيا', flag: '🇬🇳' },
      { code: 'gw', name: 'غينيا بيساو', flag: '🇬🇼' },
      { code: 'gy', name: 'غويانا', flag: '🇬🇾' },
      { code: 'ht', name: 'هايتي', flag: '🇭🇹' },
      { code: 'hn', name: 'هندوراس', flag: '🇭🇳' },
      { code: 'hu', name: 'المجر', flag: '🇭🇺' },
      { code: 'is', name: 'آيسلندا', flag: '🇮🇸' },
      { code: 'ir', name: 'إيران', flag: '🇮🇷' },
      { code: 'ci', name: 'ساحل العاج', flag: '🇨🇮' },
      { code: 'jm', name: 'جامايكا', flag: '🇯🇲' },
      { code: 'kz', name: 'كازاخستان', flag: '🇰🇿' },
      { code: 'ke', name: 'كينيا', flag: '🇰🇪' },
      { code: 'ki', name: 'كيريباتي', flag: '🇰🇮' },
      { code: 'kp', name: 'كوريا الشمالية', flag: '🇰🇵' },
      { code: 'kg', name: 'قيرغيزستان', flag: '🇰🇬' },
      { code: 'la', name: 'لاوس', flag: '🇱🇦' },
      { code: 'lv', name: 'لاتفيا', flag: '🇱🇻' },
      { code: 'ls', name: 'ليسوتو', flag: '🇱🇸' },
      { code: 'lr', name: 'ليبيريا', flag: '🇱🇷' },
      { code: 'li', name: 'ليختنشتاين', flag: '🇱🇮' },
      { code: 'lt', name: 'ليتوانيا', flag: '🇱🇹' },
      { code: 'lu', name: 'لوكسمبورغ', flag: '🇱🇺' },
      { code: 'mg', name: 'مدغشقر', flag: '🇲🇬' },
      { code: 'mw', name: 'ملاوي', flag: '🇲🇼' },
      { code: 'mv', name: 'المالديف', flag: '🇲🇻' },
      { code: 'ml', name: 'مالي', flag: '🇲🇱' },
      { code: 'mt', name: 'مالطا', flag: '🇲🇹' },
      { code: 'mh', name: 'جزر مارشال', flag: '🇲🇭' },
      { code: 'mu', name: 'موريشيوس', flag: '🇲🇺' },
      { code: 'fm', name: 'ميكرونيزيا', flag: '🇫🇲' },
      { code: 'md', name: 'مولدوفا', flag: '🇲🇩' },
      { code: 'mc', name: 'موناكو', flag: '🇲🇨' },
      { code: 'mn', name: 'منغوليا', flag: '🇲🇳' },
      { code: 'me', name: 'الجبل الأسود', flag: '🇲🇪' },
      { code: 'mz', name: 'موزمبيق', flag: '🇲🇿' },
      { code: 'mm', name: 'ميانمار', flag: '🇲🇲' },
      { code: 'na', name: 'ناميبيا', flag: '🇳🇦' },
      { code: 'nr', name: 'ناورو', flag: '🇳🇷' },
      { code: 'np', name: 'نيبال', flag: '🇳🇵' },
      { code: 'ni', name: 'نيكاراغوا', flag: '🇳🇮' },
      { code: 'ne', name: 'النيجر', flag: '🇳🇪' },
      { code: 'mk', name: 'مقدونيا الشمالية', flag: '🇲🇰' },
      { code: 'pw', name: 'بالاو', flag: '🇵🇼' },
      { code: 'pa', name: 'بنما', flag: '🇵🇦' },
      { code: 'pg', name: 'بابوا غينيا الجديدة', flag: '🇵🇬' },
      { code: 'py', name: 'باراغواي', flag: '🇵🇾' },
      { code: 'pe', name: 'بيرو', flag: '🇵🇪' },
      { code: 'ph', name: 'الفلبين', flag: '🇵🇭' },
      { code: 'pl', name: 'بولندا', flag: '🇵🇱' },
      { code: 'ro', name: 'رومانيا', flag: '🇷🇴' },
      { code: 'rw', name: 'رواندا', flag: '🇷🇼' },
      { code: 'kn', name: 'سانت كيتس ونيفيس', flag: '🇰🇳' },
      { code: 'lc', name: 'سانت لوسيا', flag: '🇱🇨' },
      { code: 'vc', name: 'سانت فينسنت والغرينادين', flag: '🇻🇨' },
      { code: 'ws', name: 'ساموا', flag: '🇼🇸' },
      { code: 'sm', name: 'سان مارينو', flag: '🇸🇲' },
      { code: 'st', name: 'ساو تومي وبرينسيب', flag: '🇸🇹' },
      { code: 'sn', name: 'السنغال', flag: '🇸🇳' },
      { code: 'rs', name: 'صربيا', flag: '🇷🇸' },
      { code: 'sc', name: 'سيشل', flag: '🇸🇨' },
      { code: 'sl', name: 'سيراليون', flag: '🇸🇱' },
      { code: 'sk', name: 'سلوفاكيا', flag: '🇸🇰' },
      { code: 'si', name: 'سلوفينيا', flag: '🇸🇮' },
      { code: 'sb', name: 'جزر سليمان', flag: '🇸🇧' },
      { code: 'lk', name: 'سريلانكا', flag: '🇱🇰' },
      { code: 'sr', name: 'سورينام', flag: '🇸🇷' },
      { code: 'tj', name: 'طاجيكستان', flag: '🇹🇯' },
      { code: 'tz', name: 'تنزانيا', flag: '🇹🇿' },
      { code: 'th', name: 'تايلاند', flag: '🇹🇭' },
      { code: 'tl', name: 'تيمور الشرقية', flag: '🇹🇱' },
      { code: 'tg', name: 'توغو', flag: '🇹🇬' },
      { code: 'to', name: 'تونغا', flag: '🇹🇴' },
      { code: 'tt', name: 'ترينيداد وتوباغو', flag: '🇹🇹' },
      { code: 'tm', name: 'تركمانستان', flag: '🇹🇲' },
      { code: 'tv', name: 'توفالو', flag: '🇹🇻' },
      { code: 'ug', name: 'أوغندا', flag: '🇺🇬' },
      { code: 'ua', name: 'أوكرانيا', flag: '🇺🇦' },
      { code: 'uy', name: 'أوروغواي', flag: '🇺🇾' },
      { code: 'uz', name: 'أوزبكستان', flag: '🇺🇿' },
      { code: 'vu', name: 'فانواتو', flag: '🇻🇺' },
      { code: 'va', name: 'الفاتيكان', flag: '🇻🇦' },
      { code: 've', name: 'فنزويلا', flag: '🇻🇪' },
      { code: 'vn', name: 'فيتنام', flag: '🇻🇳' },
      { code: 'zm', name: 'زامبيا', flag: '🇿🇲' },
      { code: 'zw', name: 'زيمبابوي', flag: '🇿🇼' }
    ].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    

    document.addEventListener('DOMContentLoaded', () => {
      populateCountrySelects();
      syncAccountsWithDb();
    });

    

    

    

    

    

    

    

    

    
    // Export Utilities
    
    
    // JSON Highlighting Logic
    
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

    // --- AI Chat ---
    let aiChatHistory = [];
    let aiChatLoading = false;

    

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

    // --- Campaigns Logic ---
    

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

    

    async 

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