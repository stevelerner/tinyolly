import { formatTraceId, copyToClipboard, downloadJson } from './utils.js';

let currentLogs = [];
let selectedLogIndex = null;
let displayedLogsCount = 50;
const LOGS_PER_PAGE = 50;

export function renderLogs(logs, containerId = 'logs-container') {
    const container = document.getElementById(containerId);
    currentLogs = logs;
    selectedLogIndex = null;
    displayedLogsCount = LOGS_PER_PAGE;

    // Clear JSON view when rendering new logs
    const jsonContainer = document.getElementById('log-json-container');
    if (jsonContainer) jsonContainer.innerHTML = '';

    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }

    if (logs.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">📝</div><div>No logs found</div></div>';
        return;
    }

    // Preserve current search filter
    const searchInput = document.getElementById('log-search');
    const currentFilter = searchInput ? searchInput.value : '';

    renderLogList(container, logs.slice(0, displayedLogsCount), logs.length);

    // Re-apply search filter if one was active
    if (currentFilter) {
        setTimeout(() => filterLogs(), 10);
    }

    // Add click handlers using event delegation
    // Remove existing listener to avoid duplicates if renderLogs is called multiple times
    // (Actually, replacing innerHTML removes listeners on children, but not on container itself if added via addEventListener)
    // Ideally we should use a named function and removeEventListener, or check if listener attached.
    // For simplicity in this refactor, we'll assume container is fresh or we accept potential duplicate listeners on container (which is bad).
    // Better approach: attach listener once in init, or use "onclick" property.
    container.onclick = (e) => handleLogClick(e);
}

function renderLogList(container, logsToShow, totalLogs) {
    const limitNote = `<div style="padding: 10px; text-align: center; color: var(--text-muted); font-size: 12px;">Showing ${logsToShow.length} of ${totalLogs} logs</div>`;

    // Build table with headers
    const headerRow = `
        <div class="log-header-row" style="display: flex; align-items: center; gap: 15px; padding: 8px 12px; border-bottom: 2px solid var(--border-color); background: var(--bg-secondary); font-weight: bold; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
            <div style="flex: 0 0 100px;">Time</div>
            <div style="flex: 0 0 120px;">ServiceName</div>
            <div style="flex: 0 0 60px;">Severity</div>
            <div style="flex: 0 0 180px;">traceId</div>
            <div style="flex: 0 0 140px;">spanId</div>
            <div style="flex: 1; min-width: 200px;">Message</div>
        </div>
    `;

    const logsHtml = logsToShow.map((log, index) => {
        const timestamp = new Date(log.timestamp * 1000).toLocaleTimeString([], {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        const severity = log.severity || 'INFO';
        const traceId = log.traceId || log.trace_id;
        const spanId = log.spanId || log.span_id;

        return `
            <div class="log-row" data-log-index="${index}" style="display: flex; flex-direction: row; align-items: center; gap: 15px; padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-size: 11px; cursor: pointer;">
                <div style="flex: 0 0 100px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted);">${timestamp}</div>
                <div style="flex: 0 0 120px; color: var(--text-main); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.service_name || ''}">${log.service_name || '-'}</div>
                <div style="flex: 0 0 60px; font-weight: 600; font-size: 10px; color: var(--text-main);">${severity}</div>
                <div style="flex: 0 0 180px; font-family: 'JetBrains Mono', monospace; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${traceId || ''}">
                    ${traceId ? `<a class="log-trace-link" data-trace-id="${traceId}" style="color: var(--primary); cursor: pointer; text-decoration: none; font-family: 'JetBrains Mono', monospace;">${formatTraceId(traceId)}</a>` : '<span style="color: var(--text-muted);">-</span>'}
                </div>
                <div style="flex: 0 0 140px; font-family: 'JetBrains Mono', monospace; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${spanId || ''}">
                    ${spanId ? `<a class="log-span-link" data-span-id="${spanId}" style="color: var(--primary); cursor: pointer; text-decoration: none; font-family: 'JetBrains Mono', monospace;">${formatTraceId(spanId)}</a>` : '<span style="color: var(--text-muted);">-</span>'}
                </div>
                <div style="flex: 1; min-width: 200px; color: var(--text-main); word-break: break-word;">${log.message || ''}</div>
            </div>
        `;
    }).join('');

    let loadMoreHtml = '';
    if (logsToShow.length < totalLogs) {
        loadMoreHtml = `
            <div style="text-align: center; padding: 20px;">
                <button id="load-more-logs-btn" style="padding: 8px 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); cursor: pointer;">
                    Load More Logs (${totalLogs - logsToShow.length} remaining)
                </button>
            </div>
        `;
    }

    container.innerHTML = limitNote + headerRow + logsHtml + loadMoreHtml;

    const loadMoreBtn = document.getElementById('load-more-logs-btn');
    if (loadMoreBtn) {
        loadMoreBtn.onclick = () => {
            displayedLogsCount += LOGS_PER_PAGE;
            renderLogList(container, currentLogs.slice(0, displayedLogsCount), currentLogs.length);
            // Re-apply filter
            filterLogs();
        };
    }
}

function handleLogClick(e) {
    // Handle trace link clicks
    const traceLink = e.target.closest('.log-trace-link');
    if (traceLink) {
        e.preventDefault();
        e.stopPropagation(); // Prevent row click
        const traceId = traceLink.dataset.traceId;
        if (traceId && window.showTraceDetail) {
            // Switch to traces tab first
            if (window.switchTab) {
                window.switchTab('traces');
            }
            // Then show the trace detail
            setTimeout(() => window.showTraceDetail(traceId), 100);
        }
        return;
    }

    // Handle span link clicks
    const spanLink = e.target.closest('.log-span-link');
    if (spanLink) {
        e.preventDefault();
        e.stopPropagation(); // Prevent row click
        const spanId = spanLink.dataset.spanId;

        if (spanId) {
            // Switch to spans tab
            if (window.switchTab) {
                window.switchTab('spans');
            }

            // Wait for spans to load, then find and click the span row
            setTimeout(() => {
                // Find the span row by its data-span-id attribute
                const spanRow = document.querySelector(`.trace-item[data-span-id="${spanId}"]`);
                if (spanRow) {
                    // Programmatically click the span row to open its detail
                    spanRow.click();
                    // Scroll to the span
                    spanRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    console.log(`Span ${spanId} not found in current spans view`);
                }
            }, 300); // Give more time for spans to render
        }
        return;
    }

    // Handle log row click
    const logRow = e.target.closest('.log-row');
    if (logRow) {
        const index = parseInt(logRow.dataset.logIndex);
        showLogJson(index);
    }
}

function showLogJson(index) {
    if (!currentLogs || !currentLogs[index]) return;

    const log = currentLogs[index];
    const container = document.getElementById('log-json-container');
    if (!container) return;

    // Highlight selected row
    document.querySelectorAll('.log-row').forEach((row, idx) => {
        if (idx === index) {
            row.style.background = 'var(--bg-hover)';
        } else {
            row.style.background = '';
        }
    });

    selectedLogIndex = index;

    container.innerHTML = `
        <div class="log-json-view" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-main);">
                    Log Details
                    <span style="font-weight: normal; color: var(--text-muted); font-size: 0.9em; margin-left: 8px; font-family: 'JetBrains Mono', monospace;">
                        ${new Date(log.timestamp * 1000).toLocaleString()}
                    </span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="copy-log-json-btn" style="padding: 6px 12px; cursor: pointer; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-main); border-radius: 4px; font-size: 12px;">
                        Copy JSON
                    </button>
                    <button id="download-log-json-btn" style="padding: 6px 12px; cursor: pointer; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-main); border-radius: 4px; font-size: 12px;">
                        Download JSON
                    </button>
                    <button id="close-log-json-btn" style="padding: 6px 12px; cursor: pointer; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-main); border-radius: 4px; font-size: 12px;">
                        Close
                    </button>
                    <span id="copy-log-json-feedback" style="color: var(--success-text); font-size: 12px; display: none; margin-left: 8px;">Copied!</span>
                </div>
            </div>
            <div style="background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; overflow: auto; max-height: 500px;">
                <pre style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-main); margin: 0; white-space: pre-wrap; word-wrap: break-word; line-height: 1.5;">${JSON.stringify(log, null, 2)}</pre>
            </div>
        </div>
    `;

    // Attach handlers for the buttons
    document.getElementById('copy-log-json-btn').onclick = () => {
        const feedback = document.getElementById('copy-log-json-feedback');
        copyToClipboard(JSON.stringify(log, null, 2), feedback);
    };

    document.getElementById('download-log-json-btn').onclick = () => {
        downloadJson(log, `log-${log.timestamp}.json`);
    };

    document.getElementById('close-log-json-btn').onclick = () => {
        container.innerHTML = '';
        document.querySelectorAll('.log-row').forEach(row => row.style.background = '');
        selectedLogIndex = null;
    };
}

export function clearLogFilter() {
    const filterInput = document.getElementById('trace-id-filter');
    const searchInput = document.getElementById('log-search');
    if (filterInput) {
        filterInput.value = '';
    }
    if (searchInput) {
        searchInput.value = '';
    }
    // Show all logs
    const logRows = document.querySelectorAll('.log-row');
    logRows.forEach(row => {
        row.classList.remove('hidden');
    });
}

// Filter logs based on search input (searches all log content)
export function filterLogs() {
    const searchInput = document.getElementById('log-search');
    if (!searchInput) return;

    const filter = searchInput.value.toLowerCase().trim();
    const logRows = document.querySelectorAll('.log-row');

    if (!filter) {
        // Show all logs
        logRows.forEach(row => row.classList.remove('hidden'));
        return;
    }

    // Hide/show rows based on filter
    logRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(filter)) {
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
    });
}

export function isLogJsonOpen() {
    return selectedLogIndex !== null;
}
