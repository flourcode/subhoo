// Modern Bento UI Dashboard JavaScript - Simplified Version

// Constants
const S3_BASE_URL = 'https://subhoodata.s3.us-east-1.amazonaws.com/data/';
const DATASETS = [
    { id: 'army_primes', name: 'Army (Primes)' },
    { id: 'dhs_primes', name: 'DHS (Primes)' },
    { id: 'doj_primes', name: 'DOJ (Primes)' },
    { id: 'epa_primes', name: 'EPA (Primes)' },
    { id: 'navy_primes', name: 'Navy (Primes)' },
    { id: 'socom_primes', name: 'SOCOM (Primes)' },
    { id: 'uscc_primes', name: 'USCC (Primes)' },
    { id: 'usmc_primes', name: 'USMC (Primes)' },
    { id: 'va_primes', name: 'VA (Primes)' }
];

let rawData = []; // To store loaded data
let tavTcvChartInstance = null; // Store chart instance
let isLoading = false;
let currentDataset = null;

// --- Utility Functions ---
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(Number(value))) return '$0';
    return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function parseSafeFloat(value) {
    if (value === null || value === undefined || value === '') return 0;
    const cleanedString = String(value).replace(/[^0-9.-]+/g,'');
    const num = parseFloat(cleanedString);
    return isNaN(num) ? 0 : num;
}

function parseDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    try {
        // Prioritize ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
        if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
            const dateTimeStr = dateString.includes('T') ? dateString : dateString.split(' ')[0] + 'T00:00:00Z'; // Assume UTC if no timezone
            const date = new Date(dateTimeStr);
            if (!isNaN(date.getTime())) return date;
        }
        // Fallback for other potential formats if date-fns is available
        if (typeof dateFns !== 'undefined') {
            // Add more formats if needed, e.g., 'MM/dd/yyyy'
            const parsedDate = dateFns.parseISO(dateString);
            if (!isNaN(parsedDate.getTime())) return parsedDate;
        }
        // Final fallback to browser's native parsing (can be inconsistent)
        const nativeDate = new Date(dateString);
        if (!isNaN(nativeDate.getTime())) return nativeDate;

        console.warn(`Could not parse date reliably: ${dateString}`);
        return null;
    } catch (e) {
        console.error(`Error parsing date: ${dateString}`, e);
        return null;
    }
}

function calculateDurationDays(startDateStr, endDateStr) {
    const start = parseDate(startDateStr);
    const end = parseDate(endDateStr);
    // Ensure both dates are valid Date objects and end is not before start
    if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return 0;
    }
    // Use date-fns if available for potentially more accurate difference
    if (typeof dateFns !== 'undefined') {
        // differenceInDays calculates full days, add 1 for inclusive duration
        return dateFns.differenceInDays(end, start) + 1;
    } else {
        // Basic calculation (might have DST issues, but generally ok for duration)
        const diffTime = end.getTime() - start.getTime(); // Difference in milliseconds
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Convert ms to days and add 1
        return diffDays > 0 ? diffDays : 0; // Ensure non-negative result
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    const stringText = String(text);
    return stringText.length > maxLength ? stringText.substring(0, maxLength - 3) + '...' : stringText;
}

// Update date display function
function updateDateDisplay() {
    // Get current date elements
    const dateNumber = document.querySelector('.date-number');
    const dateDetails = document.querySelector('.date-details');
    const dateRange = document.querySelector('.date-range span');
    
    if (!dateNumber || !dateDetails || !dateRange) {
        console.error("Date display elements not found");
        return;
    }
    
    // Get current date
    const now = new Date();
    
    // Update the day number
    dateNumber.textContent = now.getDate();
    
    // Update day name and month
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    dateDetails.innerHTML = `
        <div>${dayNames[now.getDay()]},</div>
        <div>${monthNames[now.getMonth()]}</div>
    `;
    
    // Calculate date range (current month to 3 months later)
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Format start date (current month shortened)
    const startMonth = monthNames[currentMonth].substring(0, 3);
    
    // Calculate end date (3 months later)
    const endDate = new Date(currentYear, currentMonth + 3, now.getDate());
    const endMonth = monthNames[endDate.getMonth()].substring(0, 3);
    
    // Update date range display
    dateRange.textContent = `${startMonth} ${now.getDate()} - ${endMonth} ${endDate.getDate()}`;
}

function setLoading(containerId, isLoading, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Find placeholders within the specific container
    let placeholder = container.querySelector('.loading-placeholder');
    let errorPlaceholder = container.querySelector('.error-placeholder');
    let noDataPlaceholder = container.querySelector('.no-data-placeholder');

    // Find the main content (table or canvas) within the container
    const content = container.querySelector('table, canvas');

    if (isLoading) {
        // Hide error/no-data placeholders
        if(errorPlaceholder) errorPlaceholder.style.display = 'none';
        if(noDataPlaceholder) noDataPlaceholder.style.display = 'none';

        // Create or update the loading placeholder
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'loading-placeholder';
            // Prepend placeholder so content hides behind it if needed
            container.insertBefore(placeholder, container.firstChild);
        }
        placeholder.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
        placeholder.style.display = 'flex';

        // Hide the main content
        if(content) content.style.display = 'none';
    } else {
        // Hide the loading placeholder
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        // Show the main content if it exists
        if(content) {
            if (content.tagName === 'TABLE') {
                content.style.display = 'table';
            } else {
                content.style.display = 'block'; // Default for canvas etc.
            }
        }
    }
}

function displayError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    setLoading(containerId, false); // Ensure loading is off

    // Hide other placeholders
    let loadingPlaceholder = container.querySelector('.loading-placeholder');
    let noDataPlaceholder = container.querySelector('.no-data-placeholder');
    if(loadingPlaceholder) loadingPlaceholder.style.display = 'none';
    if(noDataPlaceholder) noDataPlaceholder.style.display = 'none';

    // Find or create error placeholder
    let errorPlaceholder = container.querySelector('.error-placeholder');
    if (!errorPlaceholder) {
        errorPlaceholder = document.createElement('div');
        errorPlaceholder.className = 'error-placeholder';
        // Prepend placeholder
        container.insertBefore(errorPlaceholder, container.firstChild);
    }
    errorPlaceholder.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span>${message}</span>`;
    errorPlaceholder.style.display = 'flex';

    // Hide main content (table/canvas)
    const content = container.querySelector('table, canvas');
    if(content) content.style.display = 'none';

    // Destroy chart instances if needed
    if (containerId === 'tav-tcv-chart-container' && tavTcvChartInstance) {
        tavTcvChartInstance.destroy();
        tavTcvChartInstance = null;
    }
}

function displayNoData(containerId, message = "No data available.") {
    const container = document.getElementById(containerId);
    if (!container) return;
    setLoading(containerId, false); // Ensure loading is off

    // Hide other placeholders
    let loadingPlaceholder = container.querySelector('.loading-placeholder');
    let errorPlaceholder = container.querySelector('.error-placeholder');
    if(loadingPlaceholder) loadingPlaceholder.style.display = 'none';
    if(errorPlaceholder) errorPlaceholder.style.display = 'none';

    // Find or create no-data placeholder
    let noDataPlaceholder = container.querySelector('.no-data-placeholder');
    if (!noDataPlaceholder) {
        noDataPlaceholder = document.createElement('div');
        noDataPlaceholder.className = 'no-data-placeholder';
        // Prepend placeholder
        container.insertBefore(noDataPlaceholder, container.firstChild);
    }
    noDataPlaceholder.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg><span>${message}</span>`;
    noDataPlaceholder.style.display = 'flex';

    // Hide main content (table/canvas)
    const content = container.querySelector('table, canvas');
    if(content) content.style.display = 'none';

    // Destroy chart instances if needed
    if (containerId === 'tav-tcv-chart-container' && tavTcvChartInstance) {
        tavTcvChartInstance.destroy();
        tavTcvChartInstance = null;
    }
}

// Dropdown population functions
function populateDropdown(selectElement, itemsSet, defaultOptionText = "All") {
    if (!selectElement) {
        console.warn("populateDropdown: Provided selectElement is null or undefined.");
        return;
    }
    const currentValue = selectElement.value; // Preserve selection if possible
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`; // Clear existing options
    // Sort items alphabetically before adding
    const sortedItems = Array.from(itemsSet).sort((a, b) => String(a).localeCompare(String(b)));
    sortedItems.forEach(item => {
        if (item === null || item === undefined) return; // Skip null/undefined items
        const option = document.createElement('option');
        option.value = item;
        const text = String(item); // Ensure it's a string
        option.textContent = truncateText(text, 50); // Truncate long text in dropdown
        option.title = text; // Full text in tooltip
        selectElement.appendChild(option);
    });
    // Restore previous selection if it still exists
    if (sortedItems.includes(currentValue)) {
        selectElement.value = currentValue;
    }
}

function populateNaicsDropdown(selectElement, naicsMap) {
    if (!selectElement) {
        console.warn("populateNaicsDropdown: Provided selectElement is null or undefined.");
        return;
    }
    const currentValue = selectElement.value; // Preserve selection
    selectElement.innerHTML = `<option value="">All NAICS</option>`; // Clear existing
    // Sort NAICS codes numerically/alphabetically
    const sortedCodes = Array.from(naicsMap.keys()).sort();
    sortedCodes.forEach(code => {
        if (code === null || code === undefined) return; // Skip null/undefined codes
        const desc = naicsMap.get(code) || 'No Description'; // Handle missing descriptions
        const option = document.createElement('option');
        option.value = code;
        const codeStr = String(code); // Ensure code is string
        const descStr = String(desc); // Ensure desc is string
        option.textContent = `${codeStr} - ${truncateText(descStr, 30)}`; // Format: CODE - Short Desc
        option.title = `${codeStr} - ${descStr}`; // Full description in tooltip
        selectElement.appendChild(option);
    });
    // Restore previous selection if it still exists
    if (sortedCodes.includes(currentValue)) {
        selectElement.value = currentValue;
    }
}

// --- Initialize Dataset Selector ---
function initializeDatasetSelector() {
    const datasetSelect = document.getElementById('dataset-select');
    if (!datasetSelect) {
        console.error("Dataset select element not found!");
        return;
    }

    // Clear any existing options
    datasetSelect.innerHTML = '<option value="">Select dataset...</option>';

    // Populate the dropdown with dataset options
    DATASETS.forEach(dataset => {
        const option = document.createElement('option');
        option.value = dataset.id;
        option.textContent = dataset.name;
        datasetSelect.appendChild(option);
    });

    // Add event listener to load selected dataset
    datasetSelect.addEventListener('change', function() {
        const selectedDatasetId = this.value;
        if (selectedDatasetId) {
            const selectedDataset = DATASETS.find(d => d.id === selectedDatasetId);
            if (selectedDataset) {
                loadDataset(selectedDataset);
            } else {
                console.error(`Selected dataset ID ${selectedDatasetId} not found.`);
                // Handle error, maybe reset UI or show message
                updateStatusBanner(`Invalid dataset selected.`, 'error');
                // Reset dependent UI elements
                resetUIForNoDataset();
            }
        } else {
            // Handle "Choose a dataset..." selection
            updateDashboardTitle(null); // Reset title
            updateStatusBanner('Please select a dataset to begin', 'info');
            resetUIForNoDataset(); // Clear charts/tables/filters
        }
    });
}

function resetUIForNoDataset() {
    rawData = [];
    currentDataset = null;
    document.getElementById('refresh-button').disabled = true; // Disable refresh

    // Clear and show placeholders in relevant boxes
    displayNoData('contract-leaders-table-container', 'Select a dataset to view leaders.');
    displayNoData('tav-tcv-chart-container', 'Select a dataset to view chart.');

    // Reset ARR estimator
    document.getElementById('arr-result').textContent = '--';
    document.getElementById('arr-loading').style.display = 'none';
    document.getElementById('arr-error').style.display = 'none';
    document.getElementById('arr-no-data').style.display = 'none'; // Hide ARR specific no-data initially

    // Reset filters (clear options and values)
    const subAgencyFilter = document.getElementById('sub-agency-filter');
    const naicsFilter = document.getElementById('naics-filter');
    if (subAgencyFilter) subAgencyFilter.innerHTML = '<option value="">All Sub-Agencies</option>';
    if (naicsFilter) naicsFilter.innerHTML = '<option value="">All NAICS</option>';
    document.getElementById('arr-start-date').value = '';
    document.getElementById('arr-end-date').value = '';
}

// --- Chart 1: Contract Type Leaders ---
function processContractLeaders(data) {
    console.log("Processing Contract Leaders data...");
    if (!data || data.length === 0) return [];

    // Group contracts by recipient name
    // Use d3.group for efficiency
    const groupedByRecipient = d3.group(data, d => d.recipient_name);

    const leaderData = Array.from(groupedByRecipient, ([primeName, contracts]) => {
        // Skip if primeName is missing or clearly indicates unknown/invalid
        if (!primeName || primeName.toLowerCase() === 'unknown recipient' || primeName.toLowerCase() === 'multiple recipients') {
            return null;
        }

        // Filter contracts for valid data points needed for calculation
        const validContracts = contracts.filter(c => {
            const key = c.contract_award_unique_key || c.award_id_piid;
            const value = parseSafeFloat(c.current_total_value_of_award) || parseSafeFloat(c.base_and_exercised_options_value) || 0;
            return key && value > 0; // Require a key and some value
        });

        // If no valid contracts after filtering, skip this recipient
        if (validContracts.length === 0) return null;

        // Get unique contract keys to count awards accurately
        const uniqueContractKeys = new Set(validContracts.map(c => c.contract_award_unique_key || c.award_id_piid).filter(Boolean));
        if (uniqueContractKeys.size === 0) return null; // Should not happen due to filter above, but safety check

        // Calculate total and average values
        const values = validContracts.map(c => parseSafeFloat(c.current_total_value_of_award) || parseSafeFloat(c.base_and_exercised_options_value) || 0);
        const totalValue = d3.sum(values);
        const avgValue = totalValue / uniqueContractKeys.size; // Average per award/key

        // Calculate average duration
        const durations = validContracts.map(c => calculateDurationDays(c.period_of_performance_start_date, c.period_of_performance_current_end_date)).filter(d => d > 0);
        const avgDurationDays = durations.length > 0 ? d3.mean(durations) : 0;

        // Determine dominant description (simple approach: most frequent non-empty)
        const descriptions = validContracts
            .map(c => (c.transaction_description || c.prime_award_base_transaction_description || '').trim())
            .filter(desc => desc && desc.toLowerCase() !== 'no description provided' && desc.toLowerCase() !== 'none'); // Filter out common placeholders

        let dominantType = 'N/A';
        if (descriptions.length > 0) {
            const descCounts = d3.rollup(descriptions, v => v.length, d => d); // Count occurrences
            const sortedCounts = Array.from(descCounts.entries()).sort(([, countA], [, countB]) => countB - countA); // Sort by count desc
            dominantType = sortedCounts[0][0]; // Get the most frequent one
        }

        return {
            siName: primeName,
            numAwards: uniqueContractKeys.size,
            totalValue: totalValue,
            avgValue: avgValue,
            avgDurationDays: Math.round(avgDurationDays), // Round to nearest day
            dominantType: dominantType
        };
    }).filter(Boolean) // Remove null entries from skipped recipients
      .sort((a, b) => b.totalValue - a.totalValue); // Sort leaders by total value descending

    console.log(`Processed ${leaderData.length} valid leaders.`);
    return leaderData;
}

function displayContractLeadersTable(leaderData) {
    const containerId = 'contract-leaders-table-container';
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found.`);
        return;
    }

    setLoading(containerId, false); // Turn off loading spinner

    // Remove any existing table or placeholders first
    container.innerHTML = ''; // Clear previous content

    if (!leaderData || leaderData.length === 0) {
        displayNoData(containerId, 'No contract leader data found.');
        return;
    }

    // Display top 15 leaders
    const displayData = leaderData.slice(0, 15);

    // Create Table Structure dynamically
    const table = document.createElement('table');
    table.className = 'leader-table';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = [
        { text: 'Recipient Name', scope: 'col' },
        { text: 'Total Value', scope: 'col', class: 'number' },
        { text: '# Awards', scope: 'col', class: 'number' },
        { text: 'Avg Value', scope: 'col', class: 'number' },
        { text: 'Avg Duration', scope: 'col', class: 'number' },
        { text: 'Dominant Desc.', scope: 'col' }
    ];

    headers.forEach(headerInfo => {
        const th = document.createElement('th');
        th.textContent = headerInfo.text;
        th.scope = headerInfo.scope;
        if (headerInfo.class) th.className = headerInfo.class;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();

    displayData.forEach(leader => {
        const row = tbody.insertRow();

        // Recipient Name
        let cell = row.insertCell();
        cell.className = 'recipient-name';
        cell.textContent = truncateText(leader.siName, 25);
        cell.title = leader.siName; // Full name on hover

        // Total Value
        cell = row.insertCell();
        cell.className = 'number';
        cell.textContent = formatCurrency(leader.totalValue);

        // Num Awards
        cell = row.insertCell();
        cell.className = 'number';
        cell.textContent = leader.numAwards.toLocaleString();

        // Avg Value
        cell = row.insertCell();
        cell.className = 'number';
        cell.textContent = formatCurrency(leader.avgValue);

        // Avg Duration
        cell = row.insertCell();
        cell.className = 'number';
        cell.textContent = leader.avgDurationDays > 0 ? leader.avgDurationDays.toLocaleString() + ' days' : '-';

        // Dominant Type
        cell = row.insertCell();
        cell.className = 'description';
        cell.textContent = truncateText(leader.dominantType, 30);
        cell.title = leader.dominantType; // Full description on hover
    });

    // Create a table wrapper div to hold only the table
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.style.overflow = 'auto';
    tableWrapper.style.maxHeight = '300px';
    tableWrapper.appendChild(table);
    
    // Append the table wrapper to the container
    container.appendChild(tableWrapper);

    // Add summary text if more leaders exist
    if (leaderData.length > 15) {
        const summaryPara = document.createElement('p');
        summaryPara.className = 'table-summary';
        summaryPara.textContent = `Showing top 15 of ${leaderData.length} leaders`;
        container.appendChild(summaryPara);
    }
}

// --- Chart 2: TAV vs TCV Tracker (Modified to show top 10) ---
function processTavTcvData(data) {
    console.log("Processing TAV/TCV data...");
    if (!data || data.length === 0) return [];

    const contracts = data.map(row => {
            // Parse values safely
            const tcv = parseSafeFloat(row.current_total_value_of_award);
            const tav = parseSafeFloat(row.total_dollars_obligated);
            // Identify a unique key, preferring contract_award_unique_key
            const contractId = row.contract_award_unique_key || row.award_id_piid;
            // Get recipient name, default if missing
            const primeName = row.recipient_name || 'Unknown Prime';
            // Get potential value, trying multiple fields
            const potentialTcv = parseSafeFloat(row.potential_total_value_of_award) || parseSafeFloat(row.base_and_all_options_value) || 0;

            // Return structured object, or null if essential data is missing/invalid
            if (!contractId || tcv <= 0 || !primeName) { // Require ID, positive TCV, and a name
                return null;
            }

            return {
                id: contractId,
                primeName: primeName,
                tcv: tcv,
                tav: tav,
                potentialTcv: potentialTcv // Keep potential value if needed later
            };
        })
        .filter(Boolean) // Remove null entries from invalid rows
        .sort((a, b) => b.tcv - a.tcv) // Sort by Current Total Value (TCV) descending
        .slice(0, 10); // Take only the top 10 contracts

    console.log(`Processed ${contracts.length} contracts for TAV/TCV chart.`);
    return contracts;
}

function displayTavTcvChart(chartData) {
    const containerId = 'tav-tcv-chart-container';
    const container = document.getElementById(containerId);
    const canvas = document.getElementById('tavTcvChart');

    if (!container || !canvas) {
        console.error("TAV/TCV chart container or canvas element not found.");
        if(container) displayError(containerId, "Chart canvas element is missing.");
        return;
    }

    setLoading(containerId, false); // Turn off loading
    // Ensure container is clean before adding canvas back
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(canvas); // Add canvas

    if (!chartData || chartData.length === 0) {
        displayNoData(containerId, 'No contracts found for TAV/TCV comparison.');
        if (tavTcvChartInstance) {
            tavTcvChartInstance.destroy();
            tavTcvChartInstance = null;
        }
        canvas.style.display = 'none'; // Hide canvas if no data
        return;
    }

    canvas.style.display = 'block'; // Ensure canvas is visible
    const ctx = canvas.getContext('2d');

    // Destroy previous chart instance if it exists
    if (tavTcvChartInstance) {
        tavTcvChartInstance.destroy();
        tavTcvChartInstance = null; // Clear reference
    }

    // Prepare data for Chart.js
    // Show more of the company name without contract ID
    const labels = chartData.map(d => truncateText(d.primeName, 25));
    const tavData = chartData.map(d => d.tav);
    const tcvData = chartData.map(d => d.tcv);

    // Use modern color scheme based on CSS variables
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#2563eb';
    const primaryLightColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-light').trim() || '#eff6ff';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#4b5563';
    const textPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || '#111827';
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim() || '#ffffff';
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim() || '#e5e7eb';

    // Create the new chart instance
    tavTcvChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'TAV (Obligated)',
                    data: tavData,
                    backgroundColor: primaryLightColor,
                    borderColor: primaryLightColor,
                    borderWidth: 0,
                    barPercentage: 0.85,
                    categoryPercentage: 0.85,
                    borderRadius: 4,
                },
                {
                    label: 'TCV (Current Total)',
                    data: tcvData,
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    borderWidth: 0,
                    barPercentage: 0.85,
                    categoryPercentage: 0.85,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            font: {
                family: "'Inter', sans-serif",
                size: 13
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: false },
                    ticks: {
                        callback: function(value) {
                            if (Math.abs(value) >= 1e6) {
                                return ' + (value / 1e6).toFixed(1) + 'M';
                            } else if (Math.abs(value) >= 1e3) {
                                return ' + (value / 1e3).toFixed(0) + 'K';
                            }
                            return value !== 0 ? formatCurrency(value) : '$0';
                        },
                        color: textColor,
                        font: { size: 12 },
                        padding: 8,
                        maxTicksLimit: 6,
                    },
                    grid: {
                        display: false,
                        drawBorder: false,
                    },
                    border: {
                        display: false,
                    }
                },
                y: {
                    ticks: {
                        color: textColor,
                        font: { 
                            size: 13,
                            weight: 'medium'
                        },
                        padding: 12,
                        align: 'start'
                    },
                    grid: {
                        display: false,
                        drawBorder: false,
                    },
                    border: {
                        display: false,
                    }
                }
            },
            plugins: {
                tooltip: {
                    backgroundColor: bgColor,
                    titleColor: textPrimaryColor,
                    bodyColor: textPrimaryColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            if (chartData && chartData[index]) {
                                const originalData = chartData[index];
                                return originalData.primeName;
                            }
                            return '';
                        },
                        footer: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            if (chartData && chartData[index]) {
                                const originalData = chartData[index];
                                return `Contract ID: ${originalData.id}`;
                            }
                            return '';
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.x !== null) {
                                label += formatCurrency(context.parsed.x);
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        color: textPrimaryColor,
                        boxWidth: 14,
                        padding: 20,
                        font: { 
                            size: 13,
                            weight: 'medium'
                        }
                    }
                }
            },
            layout: {
                padding: { top: 10, bottom: 10, left: 10, right: 20 }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            },
            onResize: function(chart, size) {
                // Check if we're on mobile
                if (window.innerWidth <= 768) {
                    // Set maximum height for chart
                    chart.height = Math.min(chart.height, 330);
                    
                    // Force canvas to stay within bounds
                    const canvas = chart.canvas;
                    if (canvas) {
                        canvas.style.maxHeight = '330px';
                        canvas.style.height = '330px';
                    }
                }
            }
        }
    });

    // Enforce chart size constraints
    enforceChartSizeConstraints();
}

// Helper function to enforce chart size constraints
function enforceChartSizeConstraints() {
    // Apply size constraints to the chart canvas
    const canvas = document.getElementById('tavTcvChart');
    if (canvas && window.innerWidth <= 768) {
        // Set fixed dimensions
        canvas.style.height = '330px';
        canvas.style.maxHeight = '330px';
        canvas.style.minWidth = '480px';
        canvas.style.maxWidth = '800px';
        
        // Force chart container to specific size
        const container = document.getElementById('tav-tcv-chart-container');
        if (container) {
            container.style.height = '350px';
            container.style.maxHeight = '350px';
            container.style.overflow = 'auto hidden'; // Allow horizontal but not vertical scrolling
        }
    }
}

// --- Filters and Dynamic Chart Updates ---
function populateFilters(data) {
    if (!data || data.length === 0) {
        // Clear existing filters if no data
        populateDropdown(document.getElementById('sub-agency-filter'), new Set(), "All Sub-Agencies");
        populateNaicsDropdown(document.getElementById('naics-filter'), new Map());
        return;
    }

    const subAgencySet = new Set();
    const naicsMap = new Map(); // Use Map for NAICS code -> description

    data.forEach(row => {
        // Populate Sub-Agency Filter
        const subAgency = row.awarding_sub_agency_name?.trim();
        // Add only if it's a non-empty string and not a common 'unknown' placeholder
        if (subAgency && subAgency.toLowerCase() !== 'unknown sub-agency' && subAgency.toLowerCase() !== 'unknown') {
            subAgencySet.add(subAgency);
        }

        // Populate NAICS Filter
        const code = row.naics_code?.toString().trim();
        const desc = row.naics_description?.trim() || 'No Description'; // Provide default desc
        // Add only if code is valid and not already in the map
        if (code && code !== 'null' && code !== 'undefined' && code.toLowerCase() !== 'unknown' && code.toLowerCase() !== 'none' && !naicsMap.has(code)) {
            naicsMap.set(code, desc);
        }
    });

    // Populate the dropdowns using the collected, unique, sorted values
    populateDropdown(document.getElementById('sub-agency-filter'), subAgencySet, "All Sub-Agencies");
    populateNaicsDropdown(document.getElementById('naics-filter'), naicsMap);
}

// Function to apply filters and update relevant charts/tables
function applyFiltersAndUpdateVisuals() {
    const subAgencyFilter = document.getElementById('sub-agency-filter').value;
    const naicsFilter = document.getElementById('naics-filter').value;
    // Get date strings directly from input, parse them within the filter logic
    const startDateString = document.getElementById('arr-start-date').value;
    const endDateString = document.getElementById('arr-end-date').value;

    console.log("Applying filters:", { subAgencyFilter, naicsFilter, startDateString, endDateString });

    if (!rawData || rawData.length === 0) {
        console.warn("No raw data available to filter.");
        // Ensure UI reflects no data state if dataset wasn't loaded
        if (!currentDataset) {
            resetUIForNoDataset();
        } else {
            // If dataset loaded but rawData is empty (e.g., processing error)
            displayNoData('contract-leaders-table-container', 'No data loaded to filter.');
            displayNoData('tav-tcv-chart-container', 'No data loaded to filter.');
        }
        return []; // Return empty array as no data to filter
    }

    // Parse filter dates only once
    const filterStartDate = startDateString ? parseDate(startDateString) : null;
    const filterEndDate = endDateString ? parseDate(endDateString) : null;


    // Filter the raw data based on selected criteria
    const filteredData = rawData.filter(row => {
        // Check Sub-Agency Filter
        const subAgency = row.awarding_sub_agency_name?.trim();
        if (subAgencyFilter && subAgency !== subAgencyFilter) return false;

        // Check NAICS Filter
        const naics = row.naics_code?.toString().trim();
        if (naicsFilter && naics !== naicsFilter) return false;

        // Check Date Filter (Period of Performance Overlap)
        if (filterStartDate || filterEndDate) {
            const popStartDate = row.period_of_performance_start_date_parsed; // Use pre-parsed date
            const popEndDate = row.period_of_performance_current_end_date_parsed; // Use pre-parsed date

            // If contract dates are invalid, exclude it from date-filtered results
            if (!popStartDate || !popEndDate || !(popStartDate instanceof Date) || !(popEndDate instanceof Date)) {
                return false;
            }

            // Check for overlap:
            // Contract must end *after* or *on* the filter start date (if specified)
            const endsAfterFilterStart = !filterStartDate || popEndDate >= filterStartDate;
            // Contract must start *before* or *on* the filter end date (if specified)
            const startsBeforeFilterEnd = !filterEndDate || popStartDate <= filterEndDate;

            // If either condition is false, there is no overlap
            if (!endsAfterFilterStart || !startsBeforeFilterEnd) {
                return false;
            }
        }

        // If all checks pass, include the row
        return true;
    });

    console.log(`Filtered data count: ${filteredData.length} records`);

    // Update visuals that depend on the *full* filtered dataset
    // (Leaders and TAV/TCV process the filtered data internally to get top N)
    const leaderData = processContractLeaders(filteredData);
    displayContractLeadersTable(leaderData);

    const tavTcvData = processTavTcvData(filteredData); // Processes filtered data for top 10 TCV
    displayTavTcvChart(tavTcvData);

    // Return filteredData so the ARR function can use it directly
    return filteredData;
}

function calculateAverageARR() {
    const resultDiv = document.getElementById('arr-result');
    const loadingDiv = document.getElementById('arr-loading');
    const errorDiv = document.getElementById('arr-error');
    const noDataDiv = document.getElementById('arr-no-data');

    // Reset UI elements for calculation start
    resultDiv.textContent = '--'; // Placeholder while calculating
    resultDiv.style.display = 'none'; // Hide result initially
    loadingDiv.style.display = 'flex'; // Show loading spinner
    errorDiv.style.display = 'none';
    noDataDiv.style.display = 'none';

    // Apply filters first to get the correct data subset for ARR calculation
    const dataForARR = applyFiltersAndUpdateVisuals();

    // Use setTimeout to allow the UI (loading spinner) to render before blocking with calculation
    setTimeout(() => {
        try {
            console.log(`Calculating ARR based on ${dataForARR.length} filtered contracts.`);

            if (dataForARR.length === 0) {
                loadingDiv.style.display = 'none'; // Hide loading
                noDataDiv.style.display = 'flex'; // Show no-data message
                resultDiv.textContent = formatCurrency(0) + " / year"; // Display $0 result
                resultDiv.style.display = 'block'; // Show the $0 result
                return;
            }

            let totalAnnualizedValue = 0;
            let validContractsCount = 0;

            dataForARR.forEach((row, index) => {
                // Use the most reliable value field available
                const value = parseSafeFloat(row.current_total_value_of_award) || parseSafeFloat(row.base_and_exercised_options_value) || 0;
                // Use pre-parsed dates for duration calculation
                const durationDays = calculateDurationDays(row.period_of_performance_start_date, row.period_of_performance_current_end_date); // Use raw dates as fallback

                // Check for valid value and duration needed for ARR
                if (value > 0 && durationDays > 0) {
                    // Calculate duration in years (using 365.25 for leap year average)
                    const durationYears = durationDays / 365.25;
                    // Calculate annualized value for this contract
                    const annualizedValue = value / durationYears;
                    totalAnnualizedValue += annualizedValue;
                    validContractsCount++;
                }
            });

            // Calculate and display the average ARR if valid contracts were found
            if (validContractsCount > 0) {
                const averageARR = totalAnnualizedValue / validContractsCount;
                resultDiv.textContent = formatCurrency(averageARR) + " / year";
                resultDiv.style.display = 'block'; // Show the calculated result
                console.log(`Average ARR: ${averageARR.toFixed(0)} (from ${validContractsCount} valid contracts)`);
                noDataDiv.style.display = 'none'; // Ensure no-data message is hidden
            } else {
                // If loop finished but no contracts were valid for ARR calculation
                noDataDiv.style.display = 'flex'; // Show specific no-data message
                resultDiv.textContent = formatCurrency(0) + " / year"; // Display $0 result
                resultDiv.style.display = 'block'; // Show the $0 result
                console.log("No valid contracts found for ARR calculation after filtering.");
            }
        } catch (error) {
            console.error("Error calculating ARR:", error);
            errorDiv.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span>Error: ${error.message}</span>`;
            errorDiv.style.display = 'flex'; // Show error message
            resultDiv.style.display = 'none'; // Hide potentially stale result
        } finally {
            // Always hide the loading spinner when calculation finishes or errors out
            loadingDiv.style.display = 'none';
        }
    }, 50); // Short delay (50ms) seems reasonable
}
// --- Load Dataset Functions ---
function updateStatusBanner(message, type = 'info') {
    const banner = document.getElementById('status-banner'); // The div containing the message
    const statusMessage = document.getElementById('status-message');
    const refreshButton = document.getElementById('refresh-button');
    if (!banner || !statusMessage || !refreshButton) return; // Safety check

    // Update the message text
    statusMessage.textContent = message;

    // Update banner styling/class based on type
    banner.className = ''; // Reset classes first
    if (type === 'error') {
        banner.classList.add('error');
    } else if (type === 'success') {
        banner.classList.add('success');
    } else {
        banner.classList.add('info'); // Default/loading state
    }

    // Enable/disable refresh button based on global loading state
    refreshButton.disabled = isLoading;
}

function updateDashboardTitle(dataset) {
    const dashboardTitle = document.getElementById('dashboard-title');
    const dashboardSubtitle = document.getElementById('dashboard-subtitle');
    if (!dashboardTitle || !dashboardSubtitle) return; // Safety check

    if (dataset) {
        dashboardTitle.textContent = `${dataset.name} Sales QBR Dashboard`;
        dashboardSubtitle.textContent = `Analyze contract data with precision`;
    } else {
        // Reset to default titles when no dataset is selected
        dashboardTitle.textContent = 'Sales QBR Dashboard';
        dashboardSubtitle.textContent = 'Analyze contract data with precision';
    }
}

function loadDataset(dataset) {
    // Prevent concurrent loads or loading without a valid dataset object
    if (!dataset || !dataset.id || isLoading) {
        console.warn("Load dataset cancelled. Already loading or invalid dataset provided.");
        if (!dataset) updateStatusBanner('Invalid dataset specified.', 'error');
        return;
    }

    console.log(`Initiating load for dataset: ${dataset.name} (ID: ${dataset.id})`);
    currentDataset = dataset; // Store the currently selected dataset info
    isLoading = true; // Set loading flag

    // Update UI to reflect loading state
    updateDashboardTitle(dataset); // Set header title/subtitle
    updateStatusBanner(`Loading ${dataset.name} data...`, 'info'); // Show loading message in status
    document.getElementById('refresh-button').disabled = true; // Disable refresh during load

    // Set loading states specifically for chart/table containers
    setLoading('contract-leaders-table-container', true, `Loading ${dataset.name} leader data...`);
    setLoading('tav-tcv-chart-container', true, `Loading ${dataset.name} TAV/TCV data...`);

    // Clear previous chart instances to prevent rendering issues
    if (tavTcvChartInstance) {
        tavTcvChartInstance.destroy();
        tavTcvChartInstance = null;
    }

    // Clear ARR result and reset filters
    document.getElementById('arr-result').textContent = '--';
    document.getElementById('arr-loading').style.display = 'none';
    document.getElementById('arr-error').style.display = 'none';
    document.getElementById('arr-no-data').style.display = 'none';
    
    // Reset filter dropdowns and date inputs
    document.getElementById('sub-agency-filter').innerHTML = '<option value="">All Sub-Agencies</option>';
    document.getElementById('sub-agency-filter').value = '';
    document.getElementById('naics-filter').innerHTML = '<option value="">All NAICS</option>';
    document.getElementById('naics-filter').value = '';
    document.getElementById('arr-start-date').value = '';
    document.getElementById('arr-end-date').value = '';

    // Fetch the data from S3 asynchronously
    fetchDataFromS3(dataset);
}

function refreshCurrentDataset() {
    if (currentDataset && !isLoading) { // Only refresh if a dataset is selected and not currently loading
        console.log("Refreshing current dataset:", currentDataset.name);
        // Simply call loadDataset again with the stored currentDataset
        loadDataset(currentDataset);
    } else if (isLoading) {
        console.log("Refresh cancelled: Data is already loading.");
    } else {
        console.log("Refresh cancelled: No dataset selected.");
        updateStatusBanner('Select a dataset first to refresh.', 'error');
    }
}

async function fetchDataFromS3(dataset) {
    console.log(`Starting fetch for: ${dataset.name}`);
    updateStatusBanner(`Loading ${dataset.name} data...`, 'info'); // Update status

    const csvUrl = `${S3_BASE_URL}${dataset.id}.csv`;
    console.log(`Loading data from URL: ${csvUrl}`);

    try {
        const response = await fetch(csvUrl, {
            method: 'GET',
            mode: 'cors', // Ensure CORS is handled
            cache: 'no-cache', // Force fresh data fetch
            headers: {
                'Accept': 'text/csv', // Be explicit about expected content type
            }
        });

        // Check if the fetch was successful (status code 200-299)
        if (!response.ok) {
            // Construct a more informative error message
            const statusText = response.statusText || 'Unknown Error';
            const errorMsg = `Failed to fetch data: ${response.status} ${statusText}`;
            console.error(errorMsg, `URL: ${csvUrl}`);
            throw new Error(errorMsg); // Throw error to be caught below
        }

        // Get the response body as text
        const csvText = await response.text();

        // Check if the response body is empty or whitespace only
        if (!csvText || csvText.trim() === '') {
            console.warn(`Received empty CSV data for ${dataset.name} from ${csvUrl}`);
            // Treat empty data as a successful load but with zero records
            processDataset(dataset, []); // Process with an empty array
            return; // Stop further processing for this function
        }

        // Update status before starting potentially long parse process
        updateStatusBanner(`Parsing ${dataset.name} data...`, 'info');

        // Use PapaParse for robust CSV parsing
        Papa.parse(csvText, {
            header: true, // Treat first row as headers
            dynamicTyping: false, // Keep all values as strings initially for safe parsing
            skipEmptyLines: 'greedy', // Skip empty lines and lines with only whitespace
            transformHeader: header => header.trim(), // Trim whitespace from headers
            complete: (results) => {
                console.log(`Successfully parsed ${results.data.length} rows for ${dataset.name}.`);

                // Log any non-critical parsing errors
                if (results.errors && results.errors.length > 0) {
                    console.warn(`CSV parsing for ${dataset.name} encountered ${results.errors.length} errors:`, results.errors);
                }

                // Check if data array exists and has content after parsing
                if (!results.data || results.data.length === 0) {
                    console.warn(`No data rows found after parsing CSV for ${dataset.name}.`);
                    // Process with empty data array
                    processDataset(dataset, []);
                } else {
                    // Process the successfully parsed data
                    processDataset(dataset, results.data);
                }
            },
            error: (error) => {
                // Handle critical errors specifically from PapaParse
                console.error(`PapaParse Error for ${dataset.name}:`, error);
                // Throw a new error to be caught by the main catch block
                throw new Error(`Error parsing CSV: ${error.message}`);
            }
        });

    } catch (error) {
        // Catch errors from fetch() or errors thrown during parsing
        console.error(`Error loading or parsing dataset ${dataset.name}:`, error);
        updateStatusBanner(`Error loading ${dataset.name}: ${error.message}`, 'error');

        // Display error messages in the UI components
        displayError('contract-leaders-table-container', `Failed to load data: ${error.message}`);
        displayError('tav-tcv-chart-container', `Failed to load data: ${error.message}`);

        // Reset state on error
        rawData = []; // Clear any potentially partial data
        populateFilters(rawData); // Clear filters
        isLoading = false; // Reset loading flag
        // Ensure refresh button is usable for retrying
        const refreshButton = document.getElementById('refresh-button');
        if (refreshButton) refreshButton.disabled = false;
    }
}

function processDataset(dataset, data) {
    console.log(`Processing ${data.length} rows for ${dataset.name}...`);
    updateStatusBanner(`Processing ${dataset.name} data...`, 'info');

    try {
        // Map over the raw parsed data to clean and structure it
        rawData = data.map((row, index) => {
            try {
                // Create a new object for the cleaned row
                const cleanRow = {};

                // Trim whitespace from all string values and handle nulls/undefined
                for (const key in row) {
                    if (Object.prototype.hasOwnProperty.call(row, key)) {
                        const value = row[key];
                        if (typeof value === 'string') {
                            cleanRow[key] = value.trim();
                        } else if (value === null || value === undefined) {
                            cleanRow[key] = null; // Standardize null/undefined
                        } else {
                            cleanRow[key] = value; // Keep non-strings as is (numbers, booleans)
                        }
                    }
                }

                // Convert specific numeric fields safely using parseSafeFloat
                cleanRow.current_total_value_of_award = parseSafeFloat(cleanRow.current_total_value_of_award);
                cleanRow.base_and_exercised_options_value = parseSafeFloat(cleanRow.base_and_exercised_options_value);
                cleanRow.total_dollars_obligated = parseSafeFloat(cleanRow.total_dollars_obligated);
                cleanRow.base_and_all_options_value = parseSafeFloat(cleanRow.base_and_all_options_value);
                cleanRow.potential_total_value_of_award = parseSafeFloat(cleanRow.potential_total_value_of_award);

                // Provide default values for essential string fields if they are null/empty
                cleanRow.recipient_name = cleanRow.recipient_name || 'Unknown Recipient';
                cleanRow.awarding_sub_agency_name = cleanRow.awarding_sub_agency_name || 'Unknown Sub-Agency';
                cleanRow.naics_code = cleanRow.naics_code || 'Unknown';
                cleanRow.naics_description = cleanRow.naics_description || 'No Description';
                // Ensure key fields like award ID are present, maybe default if absolutely needed
                cleanRow.contract_award_unique_key = cleanRow.contract_award_unique_key || null; // Keep null if missing
                cleanRow.award_id_piid = cleanRow.award_id_piid || null; // Keep null if missing

                // Pre-parse date fields for efficiency during filtering/calculations
                // Store parsed dates in new properties to avoid modifying original strings
                cleanRow.period_of_performance_start_date_parsed = parseDate(cleanRow.period_of_performance_start_date);
                cleanRow.period_of_performance_current_end_date_parsed = parseDate(cleanRow.period_of_performance_current_end_date);

                // Return the cleaned and structured row
                return cleanRow;

            } catch (rowError) {
                console.error(`Error processing row ${index} for ${dataset.name}:`, rowError, "Row data:", row);
                return null; // Return null for rows that cause critical processing errors
            }
        }).filter(Boolean); // Filter out any null entries resulting from row processing errors

        console.log(`Successfully processed ${rawData.length} valid rows for ${dataset.name}`);

        // Check if all rows failed processing (rawData is empty but original data was not)
        if (rawData.length === 0 && data.length > 0) {
            // This indicates a systemic issue with the data or processing logic
            throw new Error(`All ${data.length} data rows failed processing. Check data format or processing logic.`);
        }

        // Update UI after successful processing
        updateStatusBanner(`Successfully loaded ${rawData.length} records from ${dataset.name} at ${new Date().toLocaleTimeString()}`, 'success');

        // Populate filter dropdowns based on the processed data
        populateFilters(rawData);

        // Apply filters initially (to show all data) and update charts/tables
        applyFiltersAndUpdateVisuals();

    } catch (error) {
        // Catch errors specific to the processing stage
        console.error(`Error processing dataset ${dataset.name}:`, error);
        updateStatusBanner(`Error processing ${dataset.name}: ${error.message}`, 'error');

        // Display error messages in the UI components
        displayError('contract-leaders-table-container', `Error processing data: ${error.message}`);
        displayError('tav-tcv-chart-container', `Error processing data: ${error.message}`);

        // Reset state on processing error
        rawData = []; // Clear data
        populateFilters(rawData); // Clear filters
        resetUIForNoDataset(); // Ensure UI reflects the error state

    } finally {
        // Always reset the loading flag and re-enable refresh button
        isLoading = false;
        const refreshButton = document.getElementById('refresh-button');
        if (refreshButton) refreshButton.disabled = false;
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Calculate ARR button
    const arrButton = document.getElementById('arr-calculate-button');
    if (arrButton) {
        arrButton.addEventListener('click', calculateAverageARR);
    } else {
        console.error("ARR Calculate button not found.");
    }

    // Refresh button
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshCurrentDataset);
    } else {
        console.error("Refresh button not found.");
    }

    // Filters that trigger visual updates (excluding ARR calculation)
    const subAgencyFilter = document.getElementById('sub-agency-filter');
    const naicsFilter = document.getElementById('naics-filter');
    const startDateInput = document.getElementById('arr-start-date');
    const endDateInput = document.getElementById('arr-end-date');

    if (subAgencyFilter) subAgencyFilter.addEventListener('change', applyFiltersAndUpdateVisuals);
    if (naicsFilter) naicsFilter.addEventListener('change', applyFiltersAndUpdateVisuals);
    // Update visuals immediately when dates change (ARR calculation still needs button press)
    if (startDateInput) startDateInput.addEventListener('change', applyFiltersAndUpdateVisuals);
    if (endDateInput) endDateInput.addEventListener('change', applyFiltersAndUpdateVisuals);

    // Add window resize listener for chart responsiveness
    window.addEventListener('resize', function() {
        if (tavTcvChartInstance) {
            tavTcvChartInstance.resize();
            enforceChartSizeConstraints();
        }
    });
}

// --- Initialize Dashboard ---
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    
    // Initialize the dataset selector dropdown
    initializeDatasetSelector();

    // Set initial UI state
    updateDashboardTitle(null); // Set default titles
    updateStatusBanner('Please select a dataset to begin', 'info'); // Initial status
    resetUIForNoDataset(); // Set initial state for charts, tables, filters

    // Update date display with actual current date
    updateDateDisplay();

    // Setup all event listeners after DOM is ready
    setupEventListeners();
    
    // Auto-load the SOCOM dataset when the page loads
    const socomDataset = DATASETS.find(d => d.id === 'socom_primes');
    if (socomDataset) {
        console.log("Automatically loading SOCOM dataset...");
        
        // Update the dropdown to show SOCOM as selected
        const datasetSelect = document.getElementById('dataset-select');
        if (datasetSelect) {
            datasetSelect.value = 'socom_primes';
        }
        
        // Load the SOCOM dataset
        loadDataset(socomDataset);
    } else {
        console.error("SOCOM dataset not found in the DATASETS array");
    }

    // Update the date display every minute to keep it current during long sessions
    setInterval(updateDateDisplay, 60000);

    console.log("Dashboard initialized.");
});