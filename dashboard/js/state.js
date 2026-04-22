// Global State Variables
let currentToolId = null;
let lastResultData = null;
let xactionsAccounts = JSON.parse(localStorage.getItem('xactions_accounts')) || [];

// Accounts Management State
let currentAccountPlatform = 'twitter';
let editingAccountId = null;
let currentCountryFilter = 'all';

// AI Chat State
let aiChatHistory = [];
let aiChatLoading = false;

// Trend Extractor State
let currentTrendsRegion = 'worldwide';
let autoRefreshTrends = false;
let trendsInterval = null;