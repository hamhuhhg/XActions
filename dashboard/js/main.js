// js/main.js

    // Store current data

    // Tool Configurations
    // Initialize UI
    document.addEventListener('DOMContentLoaded', () => {
      renderSidebarNav();
      // Handle Run Button
      document.getElementById('run-btn').addEventListener('click', executeTool);
    });
    let editingCampaignId = null;

