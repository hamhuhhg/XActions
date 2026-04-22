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
    let currentToolId = null;
    let lastResultData = null;
    let xactionsAccounts = JSON.parse(localStorage.getItem('xactions_accounts')) || [];

    // Static regions list from getdaytrends
    const staticCountries = [
      { name: "Worldwide", slug: "worldwide" },
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
    const tools = {
      // --- SCRAPERS ---
      'profile': {
        id: 'profile',
        type: 'scraper',
        title: 'مستخرج الملف الشخصي',
        desc: 'الحصول على معلومات شاملة لملف شخصي محدد على X/Twitter.',
        icon: 'fa-regular fa-id-card',
        color: 'text-blue-400',
        endpoint: '/api/new_api/profile',
        method: 'GET',
        inputs: [
          { id: 'username', label: 'اسم المستخدم المستهدف (بدون @)', type: 'text', placeholder: 'elonmusk', prepend: '@', required: true }
        ]
      },
      'followers': {
        id: 'followers',
        type: 'scraper',
        title: 'مستخرج المتابعين',
        desc: 'استخراج قائمة المستخدمين الذين يتابعون حساباً محدداً.',
        icon: 'fa-solid fa-users',
        color: 'text-indigo-400',
        endpoint: '/api/new_api/followers',
        method: 'GET',
        inputs: [
          { id: 'username', label: 'اسم المستخدم المستهدف', type: 'text', placeholder: 'elonmusk', prepend: '@', required: true },
          { id: 'limit', label: 'الحد الأقصى للنتائج', type: 'number', placeholder: '100', defaultValue: 100 }
        ]
      },
      'tweets': {
        id: 'tweets',
        type: 'scraper',
        title: 'محمل التغريدات',
        desc: 'استخراج التغريدات الأخيرة من يوميات ملف شخصي محدد.',
        icon: 'fa-regular fa-comment-dots',
        color: 'text-sky-400',
        endpoint: '/api/new_api/tweets',
        method: 'GET',
        inputs: [
          { id: 'username', label: 'اسم المستخدم المستهدف', type: 'text', placeholder: 'SpaceX', prepend: '@', required: true },
          { id: 'limit', label: 'أقصى عدد للتغريدات', type: 'number', placeholder: '50', defaultValue: 50 },
          { id: 'includeReplies', label: 'تضمين الردود في الاستخراج؟', type: 'checkbox', defaultValue: false }
        ]
      },
      'search': {
        id: 'search',
        type: 'scraper',
        title: 'استعلام البحث',
        desc: 'إجراء بحث متقدم في تويتر واستخراج النتائج.',
        icon: 'fa-solid fa-magnifying-glass',
        color: 'text-teal-400',
        endpoint: '/api/new_api/search',
        method: 'GET',
        inputs: [
          { id: 'query', label: 'كلمة البحث أو استعلام متقدم', type: 'text', placeholder: 'AI agents min_faves:1000', icon: 'fa-solid fa-search', required: true },
          { id: 'limit', label: 'الحد الأقصى للنتائج', type: 'number', placeholder: '50', defaultValue: 50 },
          { id: 'filter', label: 'نوع التصفية', type: 'select', options: ['latest', 'top', 'people', 'photos', 'videos'], defaultValue: 'latest' }
        ]
      },
      'hashtag': {
        id: 'hashtag',
        type: 'scraper',
        title: 'مستخرج الهاشتاجات',
        desc: 'استخراج أفضل التغريدات الحديثة لهاشتاج محدد.',
        icon: 'fa-solid fa-hashtag',
        color: 'text-purple-400',
        endpoint: '/api/new_api/hashtag',
        method: 'GET',
        inputs: [
          { id: 'tag', label: 'الهاشتاج (بدون #)', type: 'text', placeholder: 'technology', prepend: '#', required: true },
          { id: 'limit', label: 'الحد الأقصى للنتائج', type: 'number', placeholder: '50', defaultValue: 50 },
          { id: 'filter', label: 'ترتيب الفرز', type: 'select', options: ['latest', 'top'], defaultValue: 'latest' }
        ]
      },
      'thread': {
        id: 'thread',
        type: 'scraper',
        title: 'مستخرج السلاسل',
        desc: 'تحميل سلسلة تغريدات كاملة من رابط تغريدة واحدة.',
        icon: 'fa-solid fa-bars-staggered',
        color: 'text-amber-400',
        endpoint: '/api/new_api/thread',
        method: 'GET',
        inputs: [
          { id: 'url', label: 'رابط التغريدة', type: 'text', placeholder: 'https://x.com/username/status/12345...', required: true }
        ]
      },
      'media': {
        id: 'media',
        type: 'scraper',
        title: 'مستخرج الوسائط',
        desc: 'استخراج الصور والفيديوهات من ملف مستخدم.',
        icon: 'fa-regular fa-image',
        color: 'text-pink-400',
        endpoint: '/api/new_api/media',
        method: 'GET',
        inputs: [
          { id: 'username', label: 'اسم المستخدم المستهدف', type: 'text', placeholder: 'SpaceX', prepend: '@', required: true },
          { id: 'limit', label: 'الحد الأقصى للوسائط', type: 'number', placeholder: '50', defaultValue: 50 }
        ]
      },
      'trendExtractor': {
        id: 'trendExtractor',
        type: 'scraper',
        title: 'مستخرج الترند',
        desc: 'استخراج الهاشتاجات والكلمات المفتاحية النشطة حالياً في تويتر بفرز حسب الدولة.',
        icon: 'fa-solid fa-fire-flame-curved',
        color: 'text-orange-500',
        isSpecialized: true // Needs custom UI rendering
      },
      // --- AUTOMATION (Bots) ---
      'autoPoster': {
        id: 'autoPoster',
        type: 'action',
        title: 'الناشر التلقائي (فردي/جماعي)',
        desc: 'نشر التغريدات تلقائياً. افصل بين عدة تغريدات بـ --- للنشر الجماعي.',
        icon: 'fa-solid fa-paper-plane',
        color: 'text-indigo-400',
        endpoint: '/api/new_api/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'autoPoster',
        inputs: [
          { id: 'tweets', label: 'محتوى التغريدة (أضف مربعات للنشر الجماعي)', type: 'textarea-list', required: true }
        ]
      },
      'autoLike': {
        id: 'autoLike',
        type: 'action',
        title: 'بوت الإعجاب التلقائي',
        desc: 'الإعجاب التلقائي بالتغريدات بناءً على كلمات مفتاحية معينة أو من مستخدم مستهدف لبناء التفاعل.',
        icon: 'fa-solid fa-heart',
        color: 'text-rose-400',
        endpoint: '/api/new_api/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'autoLike',
        inputs: [
          { id: 'target_type', label: 'نوع الاستهداف', type: 'select', options: ['keyword', 'user_timeline'], defaultValue: 'keyword' },
          { id: 'target_value', label: 'قيمة الاستهداف (كلمة مفتاحية أو اسم مستخدم)', type: 'text', placeholder: 'ChatGPT', required: true },
          { id: 'limit', label: 'أقصى عدد للإعجابات في كل تشغيل', type: 'number', placeholder: '10', defaultValue: 10 }
        ]
      },
      'smartUnfollow': {
        id: 'smartUnfollow',
        type: 'action',
        title: 'إلغاء المتابعة الجماعي الذكي',
        desc: 'إزالة المتابعة تلقائياً للمستخدمين الذين لا يتابعونك، مع الاحتفاظ بالمتابعين المتبادلين بأمان.',
        icon: 'fa-solid fa-user-minus',
        color: 'text-orange-400',
        endpoint: '/api/new_api/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'unfollowNonFollowers',
        inputs: [
          { id: 'limit', label: 'أقصى عدد للإلغاء المتابعة', type: 'number', placeholder: '50', defaultValue: 50 }
        ]
      },
      'autoRetweet': {
        id: 'autoRetweet',
        type: 'action',
        title: 'بوت إعادة التغريد التلقائي',
        desc: 'إعادة التغريد تلقائياً من مستخدم أو بناءً على كلمة مفتاحية.',
        icon: 'fa-solid fa-retweet',
        color: 'text-green-400',
        endpoint: '/api/new_api/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'autoRetweet',
        inputs: [
          { id: 'target_type', label: 'نوع الاستهداف', type: 'select', options: ['keyword', 'user_timeline'], defaultValue: 'keyword' },
          { id: 'target_value', label: 'قيمة الاستهداف (كلمة مفتاحية أو اسم مستخدم)', type: 'text', placeholder: 'AI', required: true },
          { id: 'limit', label: 'أقصى عدد لإعادة التغريد', type: 'number', placeholder: '10', defaultValue: 10 }
        ]
      },
      'autoFollow': {
        id: 'autoFollow',
        type: 'action',
        title: 'بوت المتابعة التلقائية',
        desc: 'متابعة جماعية للمستخدمين الذين غردوا عن كلمة مفتاحية معينة.',
        icon: 'fa-solid fa-user-plus',
        color: 'text-emerald-400',
        endpoint: '/api/new_api/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'autoFollow',
        inputs: [
          { id: 'keyword', label: 'الكلمة المفتاحية للبحث عن المستخدمين', type: 'text', placeholder: 'Web3', required: true },
          { id: 'limit', label: 'أقصى عدد للمتابعات', type: 'number', placeholder: '20', defaultValue: 20 }
        ]
      },
      'autoComment': {
        id: 'autoComment',
        type: 'action',
        title: 'بوت الردود التلقائية',
        desc: 'الرد التلقائي على التغريدات التي تطابق كلمة مفتاحية برسالة محددة مسبقاً.',
        icon: 'fa-solid fa-reply',
        color: 'text-violet-400',
        endpoint: '/api/new_api/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'autoComment',
        inputs: [
          { id: 'target_type', label: 'نوع الاستهداف', type: 'select', options: ['keyword', 'user_timeline'], defaultValue: 'keyword' },
          { id: 'target_value', label: 'الاستهداف للرد (كلمة أو مستخدم)', type: 'text', placeholder: 'AI', required: true },
          { id: 'comment_text', label: 'رسالة الرد', type: 'text', placeholder: 'Great post!', required: true },
          { id: 'limit', label: 'أقصى عدد للردود', type: 'number', placeholder: '5', defaultValue: 5 }
        ]
      },
      'campaigns': {
        id: 'campaigns',
        type: 'action',
        title: 'بوت الحملات (متقدم)',
        desc: 'بناء حملات معقدة تتضمن تغريدات، ردود، اقتباسات، وجدولة زمنية عبر عدة حسابات دفعة واحدة.',
        icon: 'fa-solid fa-bullhorn',
        color: 'text-brand-400',
        method: 'POST',
        requiresAuth: true,
        isSpecialized: true,
        inputs: []
      },
      // --- FACEBOOK TOOLS ---
      'fbProfile': {
        id: 'fbProfile',
        type: 'scraper',
        title: 'فيس بوك - استخراج الملف الشخصي',
        desc: 'الحصول على معلومات حول ملف شخصي على فيس بوك.',
        icon: 'fa-brands fa-facebook',
        color: 'text-blue-500',
        endpoint: '/api/new_api/facebook/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'fb_get_profile',
        platform: 'facebook',
        inputs: [
          { id: 'profileUrl', label: 'رابط الملف الشخصي المستهدف', type: 'text', placeholder: 'https://facebook.com/zuck', required: true }
        ]
      },
      'fbGroup': {
        id: 'fbGroup',
        type: 'scraper',
        title: 'فيس بوك - استخراج من مجموعة',
        desc: 'الحصول على أحدث المنشورات من مجموعة فيس بوك محددة.',
        icon: 'fa-solid fa-users-rectangle',
        color: 'text-blue-500',
        endpoint: '/api/new_api/facebook/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'fb_get_group_posts',
        platform: 'facebook',
        inputs: [
          { id: 'groupUrl', label: 'رابط المجموعة المستهدفة', type: 'text', placeholder: 'https://facebook.com/groups/xxxxx', required: true },
          { id: 'limit', label: 'أقصى عدد للمنشورات', type: 'number', placeholder: '10', defaultValue: 10 }
        ]
      },
      'fbPost': {
        id: 'fbPost',
        type: 'action',
        title: 'فيس بوك - نشر على اليوميات',
        desc: 'نشر تحديث حالة أو نص على يومياتك في فيس بوك.',
        icon: 'fa-regular fa-paper-plane',
        color: 'text-blue-500',
        endpoint: '/api/new_api/facebook/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'fb_post_timeline',
        platform: 'facebook',
        inputs: [
          { id: 'text', label: 'محتوى المنشور', type: 'textarea', placeholder: 'Hello Facebook!', required: true }
        ]
      },
      'fbReply': {
        id: 'fbReply',
        type: 'action',
        title: 'فيس بوك - الرد على منشور',
        desc: 'الرد بتعليق على منشور فيس بوك محدد.',
        icon: 'fa-solid fa-reply',
        color: 'text-blue-500',
        endpoint: '/api/new_api/facebook/run',
        method: 'POST',
        requiresAuth: true,
        scriptName: 'fb_reply_comment',
        platform: 'facebook',
        inputs: [
          { id: 'postUrl', label: 'رابط المنشور', type: 'text', placeholder: 'https://facebook.com/zuck/posts/xxxxx', required: true },
          { id: 'text', label: 'التعليق المكتوب', type: 'textarea', placeholder: 'Awesome post!', required: true }
        ]
      },
      // --- AI ---
      'aiChat': {
        id: 'aiChat',
        type: 'ai',
        title: 'محادثة الذكاء الاصطناعي',
        desc: 'تحدث مع الذكاء الاصطناعي لتنفيذ مهام X/Twitter تلقائياً. يدعم OpenAI وGroq وDeepSeek وOllama وأي API متوافق.',
        icon: 'fa-solid fa-robot',
        color: 'text-brand-400',
        isSpecialized: true,
        inputs: []
      }
    };
    // Initialize UI
    document.addEventListener('DOMContentLoaded', () => {
      renderSidebarNav();
      // Handle Run Button
      document.getElementById('run-btn').addEventListener('click', executeTool);
    });
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

    let currentCountryFilter = 'all';
    let editingAccountId = null;

    const allCountries = [
      { code: 'sa', name: 'السعودية', flag: '🇸🇦' },
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

    let currentAccountPlatform = 'twitter';

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
      document.getElementById('cancel-edit-btn').classList.add('hidden');
    }

    function editAccount(id) {
      const acc = xactionsAccounts.find(a => a.id === id);
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

    function deleteAccount(id) {
      if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
      xactionsAccounts = xactionsAccounts.filter(acc => acc.id !== id);
      if (editingAccountId === id) cancelEdit();
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
      const accIndex = xactionsAccounts.findIndex(a => a.id === accountId);
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
      const accIndex = xactionsAccounts.findIndex(a => a.id === accountId);
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

    let editingCampaignId = null;

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

    // --- AI Chat ---
    let aiChatHistory = [];
    let aiChatLoading = false;

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