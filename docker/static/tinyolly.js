import { initTabs, startAutoRefresh, switchTab, toggleAutoRefresh } from './tabs.js';
import { loadStats, loadLogs } from './api.js';
import { initTheme, toggleTheme } from './theme.js';
import {
    showTraceDetail,
    showTracesList,
    toggleTraceJSON,
    copyTraceJSON,
    downloadTraceJSON,
    showLogsForTrace,
    filterMetrics,
    clearLogFilter,
    filterLogs
} from './render.js';

// Expose functions to global scope for HTML onclick handlers IMMEDIATELY
// (before DOMContentLoaded so they're available for inline event handlers)
window.switchTab = switchTab;
window.toggleTheme = toggleTheme;
window.toggleAutoRefresh = toggleAutoRefresh;
window.showTraceDetail = showTraceDetail;
window.showTracesList = showTracesList;
window.toggleTraceJSON = toggleTraceJSON;
window.copyTraceJSON = copyTraceJSON;
window.downloadTraceJSON = downloadTraceJSON;
window.showLogsForTrace = showLogsForTrace;
window.loadLogs = loadLogs;
window.filterMetrics = filterMetrics;
window.clearLogFilter = clearLogFilter;
window.filterLogs = filterLogs;

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('TinyOlly initializing...');
    initTheme();
    initTabs();
    loadStats();

    // Attach log search event listener
    const logSearch = document.getElementById('log-search');
    if (logSearch) {
        logSearch.addEventListener('keyup', filterLogs);
        console.log('✓ Log search listener attached');
    }

    if (localStorage.getItem('tinyolly-auto-refresh') !== 'false') {
        startAutoRefresh();
    }
});
