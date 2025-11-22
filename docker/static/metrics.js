export async function renderMetrics(metricsData) {
    const container = document.getElementById('metrics-container');

    if (!metricsData || !metricsData.names || metricsData.names.length === 0) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div>No metrics collected yet</div></div>';
        return;
    }

    const metricNames = metricsData.names;

    // Build table header
    let html = `
        <div class="metrics-table-header">
            <div class="metric-header-cell">Metric Name</div>
            <div class="metric-header-cell">Type</div>
            <div class="metric-header-cell" style="text-align: right;">Latest Value</div>
            <div class="metric-header-cell" style="text-align: center;">Graph</div>
        </div>
    `;

    container.innerHTML = html;

    // Fetch and display each metric's latest value
    for (const name of metricNames) {
        try {
            const response = await fetch(`/api/metrics/${name}?limit=1`);
            const data = await response.json();
            
            let latestValue = '-';
            let metricType = 'Metric';
            
            let labels = {};
            
            if (data.data && data.data.length > 0) {
                const point = data.data[data.data.length - 1];
                
                // Extract labels if present
                labels = point.labels || {};
                
                console.log(`Metric: ${name}, point.type="${point.type}", point.histogram=${point.histogram !== undefined}, point.value=${point.value}`);
                
                // Determine metric type - prioritize the 'type' field from OTLP receiver
                if (point.type) {
                    // Normalize type to title case
                    metricType = point.type.charAt(0).toUpperCase() + point.type.slice(1);
                    console.log(`  → Using point.type: ${metricType}`);
                } else if (point.histogram !== undefined) {
                    metricType = 'Histogram';
                    console.log(`  → Detected histogram from data structure`);
                } else {
                    // Fallback to name-based heuristics
                    const hasActive = name.includes('.active') || name.includes('_active');
                    const hasCurrent = name.includes('.current') || name.includes('_current');
                    const hasTotal = name.includes('.total') || name.includes('_total');
                    const hasCount = name.includes('.count') || name.includes('_count');
                    
                    console.log(`  → Name heuristics: .active=${hasActive}, .current=${hasCurrent}, .total=${hasTotal}, .count=${hasCount}`);
                    
                    if (hasActive || hasCurrent) {
                        metricType = 'Gauge';
                    } else if (hasTotal || hasCount) {
                        metricType = 'Counter';
                    } else {
                        metricType = 'Gauge';
                    }
                }
                
                console.log(`  → Final detected type: ${metricType}`);
                
                // Extract the actual value for display
                if (point.histogram !== undefined) {
                    // For histograms, show count and average
                    const histData = point.histogram;
                    if (histData.count !== undefined && histData.sum !== undefined) {
                        const avg = histData.sum / histData.count;
                        latestValue = `${histData.count} req, avg: ${avg.toFixed(2)}ms`;
                    } else if (histData.count !== undefined) {
                        latestValue = `${histData.count} observations`;
                    } else if (histData.average !== undefined) {
                        latestValue = histData.average.toFixed(2);
                    } else {
                        latestValue = 'Histogram';
                    }
                } else if (point.value !== undefined) {
                    latestValue = typeof point.value === 'number' ? point.value.toFixed(2) : point.value;
                } else {
                    latestValue = '-';
                }
            }
            
            // Determine type badge class
            let typeBadgeClass = 'metric-type-gauge';
            if (metricType === 'Counter') typeBadgeClass = 'metric-type-counter';
            else if (metricType === 'Histogram') typeBadgeClass = 'metric-type-histogram';
            
            // Build labels HTML (badges)
            let labelsHtml = '';
            if (labels && Object.keys(labels).length > 0) {
                labelsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">';
                for (const [key, value] of Object.entries(labels)) {
                    labelsHtml += `<span style="font-size: 10px; padding: 2px 6px; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 3px; color: var(--text-muted); font-family: monospace;">${key}="${value}"</span>`;
                }
                labelsHtml += '</div>';
            }
            
            const chartId = `chart-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            const row = `
                <div class="metric-row" data-metric-name="${name}" data-metric-type="${metricType.toLowerCase()}">
                    <div class="metric-header">
                        <div class="metric-cell metric-col-name">
                            <div>${name}</div>
                            ${labelsHtml}
                        </div>
                        <div class="metric-cell metric-col-type">
                            <span class="metric-type-badge ${typeBadgeClass}">${metricType}</span>
                        </div>
                        <div class="metric-cell metric-col-value">${latestValue}</div>
                        <div class="metric-cell">
                            <span class="metric-expand-icon">➤</span>
                        </div>
                    </div>
                    <div class="metric-chart-container">
                        <div class="metric-name">${name}</div>
                        <div style="position: relative; height: 150px; padding: 0;">
                            <canvas id="${chartId}"></canvas>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML += row;
        } catch (error) {
            console.error(`Error fetching metric ${name}:`, error);
            
            const chartId = `chart-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            // Still show the metric name even if we can't fetch data
            const row = `
                <div class="metric-row" data-metric-name="${name}" data-metric-type="${metricType.toLowerCase()}">
                    <div class="metric-header">
                        <div class="metric-cell metric-col-name">${name}</div>
                        <div class="metric-cell metric-col-type">
                            <span class="metric-type-badge metric-type-gauge">Metric</span>
                        </div>
                        <div class="metric-cell metric-col-value">-</div>
                        <div class="metric-cell">
                            <span class="metric-expand-icon">➤</span>
                        </div>
                    </div>
                    <div class="metric-chart-container">
                        <div class="metric-name">${name}</div>
                        <div style="position: relative; height: 150px; padding: 0;">
                            <canvas id="${chartId}"></canvas>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML += row;
        }
    }
    
    // Add click handlers to toggle metric charts
    container.querySelectorAll('.metric-row').forEach(row => {
        const header = row.querySelector('.metric-header');
        const metricName = row.dataset.metricName;
        const metricType = row.dataset.metricType; // Get type from data attribute
        
        header.addEventListener('click', async () => {
            const isExpanded = row.classList.contains('expanded');
            
            if (isExpanded) {
                row.classList.remove('expanded');
            } else {
                row.classList.add('expanded');
                
                // Load and render chart if not already loaded
                const chartCanvas = row.querySelector('canvas');
                if (chartCanvas && !chartCanvas.dataset.loaded) {
                    console.log(`Rendering chart for ${metricName}, type from data-attribute: ${metricType}`);
                    await renderMetricChart(metricName, chartCanvas, metricType);
                    chartCanvas.dataset.loaded = 'true';
                }
            }
        });
    });
}

// Store chart instances to properly destroy them
const chartInstances = {};

// Export function to check if any metric chart is expanded
export function isMetricChartOpen() {
    const expandedRow = document.querySelector('.metric-row.expanded');
    return expandedRow !== null;
}

async function renderMetricChart(metricName, canvas, metricType) {
    try {
        // Destroy existing chart instance if it exists
        const chartId = canvas.id;
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
            delete chartInstances[chartId];
        }
        
        // Fetch metric data for the last 10 minutes
        const endTime = Date.now() / 1000;
        const startTime = endTime - 600; // 10 minutes ago
        
        const response = await fetch(`/api/metrics/${metricName}?start=${startTime}&end=${endTime}`);
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, 75);
            return;
        }
        
        // Determine the metric type from data if not provided
        const firstPoint = data.data[0];
        const actualType = metricType || firstPoint.type || 'gauge';
        
        console.log(`Chart for ${metricName}: metricType=${metricType}, firstPoint.type=${firstPoint.type}, actualType=${actualType}`);
        
        // Route to appropriate visualization
        const typeLower = actualType.toLowerCase();
        if (typeLower === 'histogram') {
            console.log(`Rendering histogram for ${metricName}`);
            renderHistogramChart(metricName, canvas, data.data);
        } else if (typeLower === 'gauge') {
            console.log(`Rendering gauge for ${metricName}`);
            renderGaugeChart(metricName, canvas, data.data);
        } else if (typeLower === 'counter') {
            console.log(`Rendering counter for ${metricName}`);
            renderCounterChart(metricName, canvas, data.data);
        } else {
            console.log(`Rendering line chart for ${metricName}, type: ${typeLower}`);
            renderLineChart(metricName, canvas, data.data, actualType);
        }
    } catch (error) {
        console.error(`Error rendering chart for ${metricName}:`, error);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'var(--text-muted)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading chart', canvas.width / 2, 75);
    }
}

function renderGaugeChart(metricName, canvas, dataPoints) {
    const chartId = canvas.id;
    const latestPoint = dataPoints[dataPoints.length - 1];
    const currentValue = latestPoint.value !== undefined ? latestPoint.value : 0;
    
    // Determine max value from historical data
    const allValues = dataPoints.map(p => p.value || 0);
    const maxValue = Math.max(...allValues, currentValue * 1.2); // Add 20% headroom
    
    // Create a doughnut chart to simulate a gauge
    chartInstances[chartId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Current', 'Remaining'],
            datasets: [{
                data: [currentValue, Math.max(0, maxValue - currentValue)],
                backgroundColor: [
                    'rgb(59, 130, 246)',
                    'rgba(200, 200, 200, 0.2)'
                ],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                },
                title: {
                    display: true,
                    text: metricName,
                    font: {
                        size: 12
                    }
                }
            }
        },
        plugins: [{
            id: 'gaugeText',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2 + 20;
                
                ctx.save();
                ctx.font = 'bold 18px Inter';
                ctx.fillStyle = 'rgb(59, 130, 246)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentValue.toFixed(2), centerX, centerY);
                
                ctx.font = '11px Inter';
                ctx.fillStyle = 'var(--text-muted)';
                ctx.fillText(`/ ${maxValue.toFixed(0)}`, centerX, centerY + 16);
                ctx.restore();
            }
        }]
    });
}

function renderCounterChart(metricName, canvas, dataPoints) {
    const chartId = canvas.id;
    
    // For counters, calculate the rate per second (industry standard)
    // This handles resets gracefully and shows actual request rate
    
    const labels = [];
    const rates = [];
    
    for (let i = 1; i < dataPoints.length; i++) {
        const prevPoint = dataPoints[i - 1];
        const currPoint = dataPoints[i];
        
        const prevValue = prevPoint.value || 0;
        const currValue = currPoint.value || 0;
        const timeDelta = currPoint.timestamp - prevPoint.timestamp;
        
        // Calculate rate per second
        let rate = 0;
        if (timeDelta > 0) {
            const valueDelta = currValue - prevValue;
            // If counter reset (value went down), treat current value as the delta
            const actualDelta = valueDelta >= 0 ? valueDelta : currValue;
            rate = actualDelta / timeDelta;
        }
        
        const date = new Date(currPoint.timestamp * 1000);
        labels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        rates.push(rate);
    }
    
    // Create smooth line chart showing rate per second
    chartInstances[chartId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${metricName} per second`,
                data: rates,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 1,
                pointHoverRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `${metricName} - Request Rate`,
                    font: {
                        size: 12
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(2)} req/sec`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        maxRotation: 0
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grace: '10%',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + '/s';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Requests per Second'
                    }
                }
            }
        }
    });
}

function renderLineChart(metricName, canvas, dataPoints, metricType) {
    const chartId = canvas.id;
    
    // Prepare chart data
    const labels = dataPoints.map(point => {
        const date = new Date(point.timestamp * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    
    const values = dataPoints.map(point => {
        return point.value !== undefined ? point.value : 0;
    });
    
    // Create chart using Chart.js and store the instance
    chartInstances[chartId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: metricName,
                data: values,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        maxRotation: 0
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grace: '5%',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        precision: 2
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function renderHistogramChart(metricName, canvas, dataPoints) {
    const chartId = canvas.id;
    const latestPoint = dataPoints[dataPoints.length - 1];
    
    // Get bucket data from histogram structure
    let buckets = [];
    if (latestPoint.histogram && latestPoint.histogram.buckets) {
        buckets = latestPoint.histogram.buckets;
    } else if (latestPoint.buckets) {
        buckets = latestPoint.buckets;
    }
    
    if (buckets.length === 0) {
        // Fallback to line chart showing count over time
        const labels = dataPoints.map(point => {
            const date = new Date(point.timestamp * 1000);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        });
        
        const counts = dataPoints.map(point => {
            if (point.histogram && point.histogram.count !== undefined) {
                return point.histogram.count;
            }
            return point.count || 0;
        });
        
        chartInstances[chartId] = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Request Count',
                    data: counts,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `${metricName} - Request Count Over Time`,
                        font: { size: 12 }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        return;
    }
    
    // Create bar chart for histogram buckets
    const labels = buckets.map(b => {
        const bound = b.bound !== undefined ? b.bound : b.upper_bound !== undefined ? b.upper_bound : b.upperBound;
        if (bound === null || bound === undefined || bound === Infinity) {
            return '∞';
        }
        return bound.toFixed(2);
    });
    
    const counts = buckets.map(b => b.count || 0);
    
    chartInstances[chartId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: counts,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `${metricName} - Bucket Distribution (Latest)`,
                    font: {
                        size: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label === '∞' ? '> previous bound' : `≤ ${context.label}ms`;
                            return `Count: ${context.parsed.y} ${label}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Upper Bound (ms)'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Request Count'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}
