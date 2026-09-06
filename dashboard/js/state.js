// Global State Variables
if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
  // Opening via file:/// in Firefox triggers NetworkError due to CORS security restrictions
  window.location.href = 'http://localhost:3001/dashboard';
}

const API_BASE = (typeof window !== 'undefined' && window.location.port !== '3001' && window.location.protocol !== 'file:' && window.location.host)
  ? `http://${window.location.hostname || 'localhost'}:3001`
  : '';

let currentMainPlatform = 'twitter';
let currentToolId = null;
let lastResultData = null;
let xactionsAccounts = JSON.parse(localStorage.getItem('xactions_accounts')) || [];

// Accounts Management State
let currentAccountPlatform = 'twitter';
let editingAccountId = null;
let currentCountryFilter = 'all';
let selectedAccountIds = new Set();

// AI Chat State
let aiChatHistory = [];
let aiChatLoading = false;

// Trend Extractor State
let currentTrendsRegion = 'worldwide';
let autoRefreshTrends = false;
let trendsInterval = null;