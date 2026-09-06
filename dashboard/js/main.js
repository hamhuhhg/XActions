// js/main.js

document.addEventListener('DOMContentLoaded', () => {
  setMainPlatform(typeof currentMainPlatform !== 'undefined' ? currentMainPlatform : 'twitter');
  
  // Handle Run Button
  const runBtn = document.getElementById('run-btn');
  if (runBtn) {
    runBtn.addEventListener('click', executeTool);
  }
});

let editingCampaignId = null;
