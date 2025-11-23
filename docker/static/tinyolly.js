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

import { debounce } from './utils.js';

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

// Global error handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error('Global error caught:', message, error);
    return false;
};

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('TinyOlly initializing...');
        initTheme();
        initTabs();
        loadStats();

        // Attach log search event listener with debounce
        const logSearch = document.getElementById('log-search');
        if (logSearch) {
            logSearch.addEventListener('keyup', debounce(filterLogs, 300));
            console.log('✓ Log search listener attached (debounced)');
        }

        // Attach metric search event listener with debounce
        const metricSearch = document.getElementById('metric-search');
        if (metricSearch) {
            metricSearch.addEventListener('keyup', debounce(filterMetrics, 300));
            console.log('✓ Metric search listener attached (debounced)');
        }

        if (localStorage.getItem('tinyolly-auto-refresh') !== 'false') {
            startAutoRefresh();
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
