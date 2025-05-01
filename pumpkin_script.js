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

// Global variables
let rawData = []; // To store loaded data
let tavTcvChartInstance = null; // Store chart instance
let isLoading = false;
let currentDataset = null;

// --- Utility Functions ---
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(Number(value))) return '$ -';
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
        // Fallback to other potential formats if date-fns is available
        if (typeof dateFns !== 'undefined') {
            const parsedDate = dateFns.parseISO(dateString);
            if (!isNaN(parsedDate.getTime())) return parsedDate;
        }
        // Final fallback to browser's native parsing
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
    // Ensure both dates are valid
    if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return 0;
    }
    // Use date-fns if available
    if (typeof dateFns !== 'undefined') {
        return dateFns.differenceInDays(end, start) + 1;
    } else {
        // Basic calculation
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

// --- UI Helper Functions ---
function setLoading(containerId, isLoading, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Find placeholders
    let placeholder = container.querySelector('.loading-placeholder');
    let errorPlaceholder = container.querySelector('.error-placeholder');
    let noDataPlaceholder = container.querySelector('.no-data-placeholder');
    
    // Find the main content
    const content = container.querySelector('table, canvas, svg');
    
    if (isLoading) {
        // Hide error/no-data placeholders
        if(errorPlaceholder) errorPlaceholder.style.display = 'none';
        if(noDataPlaceholder) noDataPlaceholder.style.display = 'none';
        
        // Create or update the loading placeholder
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'loading-placeholder';
            container.insertBefore(placeholder, container.firstChild);
        }
        placeholder.innerHTML = `<div class="spinner"></div>${message}`;
        placeholder.style.display = 'block';
        
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
                content.style.display = 'block';
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
        errorPlaceholder.className = 'error-placeholder text-red-600';
        container.insertBefore(errorPlaceholder, container.firstChild);
    }
    errorPlaceholder.textContent = message;
    errorPlaceholder.style.display = 'block';
    
    // Hide main content
    const content = container.querySelector('table, canvas, svg');
    if(content) content.style.display = 'none';
    
    // Destroy chart instance if needed
    if (containerId === 'tav-tcv-chart-container' && tavTcvChartInstance) {
        tavTcvChartInstance.destroy();
        tavTcvChartInstance = null;
    }
}

function displayNoData(containerId, message = "No data available for this view.") {
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
        container.insertBefore(noDataPlaceholder, container.firstChild);
    }
    noDataPlaceholder.textContent = message;
    noDataPlaceholder.style.display = 'block';
    
    // Hide main content
    const content = container.querySelector('table, canvas, svg');
    if(content) content.style.display = 'none';
    
    // Destroy chart instance if needed
    if (containerId === 'tav-tcv-chart-container' && tavTcvChartInstance) {
        tavTcvChartInstance.destroy();
        tavTcvChartInstance = null;
    }
}

// --- Date Display Functions ---
function updateDateDisplay() {
    // Get the elements for date number, details, and time display
    const dateNumber = document.getElementById('current-date');
    const dateDetails = document.getElementById('date-details');
    const timeDisplay = document.getElementById('date-range');

    // Check if elements were found
    if (!dateNumber || !dateDetails || !timeDisplay) {
        console.error("Date/Time display elements not found. Check IDs: #current-date, #date-details, #date-range");
        return; // Exit if elements are missing
    }

    // Get the current date and time
    const now = new Date();

    // Update Date Portion
    dateNumber.textContent = now.getDate();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    dateDetails.innerHTML = `
        <div>${dayNames[now.getDay()]},</div>
        <div>${monthNames[now.getMonth()]}</div>
    `;

    // Update Time Portion
    const timeString = now.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
    });

    // Set the text content of the span to the formatted time string
    timeDisplay.textContent = timeString;
}

// --- Dropdown Population Functions ---
function populateDropdown(selectElement, itemsSet, defaultOptionText = "All") {
    if (!selectElement) return;
    
    // Preserve current selection if possible
    const currentValue = selectElement.value;
    
    // Clear existing options first
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
    
    // Simply add all items without transformation
    if (itemsSet && itemsSet.size > 0) {
        Array.from(itemsSet).sort().forEach(item => {
            if (item === null || item === undefined || item === '') return;
            
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
    }
    
    // Restore previous selection if it exists in the new set
    if (currentValue && Array.from(itemsSet).includes(currentValue)) {
        selectElement.value = currentValue;
    }
}

function populateNaicsDropdown(selectElement, naicsMap) {
    if (!selectElement) return;
    
    // Preserve current selection
    const currentValue = selectElement.value;
    
    // Clear existing options
    selectElement.innerHTML = `<option value="">All NAICS</option>`;
    
    // Add all NAICS codes with descriptions
    if (naicsMap && naicsMap.size > 0) {
        Array.from(naicsMap.keys()).sort().forEach(code => {
            if (!code) return;
            
            const desc = naicsMap.get(code) || '';
            const option = document.createElement('option');
            option.value = code;
            
            // Simple format: CODE - Description
            option.textContent = code + (desc ? ' - ' + desc : '');
            
            selectElement.appendChild(option);
        });
    }
    
    // Restore previous selection if possible
    if (currentValue && naicsMap.has(currentValue)) {
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
    datasetSelect.innerHTML = '';
    
    // Populate the dropdown with dataset options exactly as defined in DATASETS
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
                updateStatusBanner(`Invalid dataset selected.`, 'error');
                resetUIForNoDataset();
            }
        } else {
            // Handle empty selection
            updateDashboardTitle(null);
            updateStatusBanner('Please select a dataset to load', 'info');
            resetUIForNoDataset();
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
    displayNoData('expiring-contracts-table-container', 'Select a dataset to view expiring contracts.');
    displayNoData('sankey-chart-container', 'Select a dataset to view award flow.');
    displayNoData('map-container', 'Select a dataset to view performance map.');

    // Reset ARR estimator
    document.getElementById('arr-result').textContent = '--';
    document.getElementById('arr-loading').style.display = 'none';
    document.getElementById('arr-error').style.display = 'none';
    document.getElementById('arr-no-data').style.display = 'none'; 

    // Reset filters
    const subAgencyFilter = document.getElementById('sub-agency-filter');
    const naicsFilter = document.getElementById('naics-filter');
    if (subAgencyFilter) subAgencyFilter.innerHTML = '<option value="">All Sub-Agencies</option>';
    if (naicsFilter) naicsFilter.innerHTML = '<option value="">All NAICS</option>';
    document.getElementById('arr-start-date').value = '';
    document.getElementById('arr-end-date').value = '';
    
    // Reset search
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
}

// --- Chart 1: Contract Leaders Table ---
function processContractLeaders(data) {
    console.log("Processing Contract Leaders data...");
    if (!data || data.length === 0) return [];

    // Group contracts by recipient name
    const groupedByRecipient = d3.group(data, d => d.recipient_name);

    const leaderData = Array.from(groupedByRecipient, ([primeName, contracts]) => {
        // Skip if primeName is missing or invalid
        if (!primeName || primeName.toLowerCase() === 'unknown recipient' || primeName.toLowerCase() === 'multiple recipients') {
            return null;
        }

        // Filter contracts for valid data points
        const validContracts = contracts.filter(c => {
            const key = c.contract_award_unique_key || c.award_id_piid;
            const value = parseSafeFloat(c.current_total_value_of_award) || parseSafeFloat(c.base_and_exercised_options_value) || 0;
            return key && value > 0;
        });

        // If no valid contracts after filtering, skip this recipient
        if (validContracts.length === 0) return null;

        // Get unique contract keys
        const uniqueContractKeys = new Set(validContracts.map(c => c.contract_award_unique_key || c.award_id_piid).filter(Boolean));
        if (uniqueContractKeys.size === 0) return null;

        // Calculate total and average values
        const values = validContracts.map(c => parseSafeFloat(c.current_total_value_of_award) || parseSafeFloat(c.base_and_exercised_options_value) || 0);
        const totalValue = d3.sum(values);
        const avgValue = totalValue / uniqueContractKeys.size;

        // Calculate average duration
        const durations = validContracts.map(c => calculateDurationDays(c.period_of_performance_start_date, c.period_of_performance_current_end_date)).filter(d => d > 0);
        const avgDurationDays = durations.length > 0 ? d3.mean(durations) : 0;

        // Determine dominant description
        const descriptions = validContracts
            .map(c => (c.transaction_description || c.prime_award_base_transaction_description || '').trim())
            .filter(desc => desc && desc.toLowerCase() !== 'no description provided' && desc.toLowerCase() !== 'none');

        let dominantType = 'N/A';
        if (descriptions.length > 0) {
            const descCounts = d3.rollup(descriptions, v => v.length, d => d);
            const sortedCounts = Array.from(descCounts.entries()).sort(([, countA], [, countB]) => countB - countA);
            dominantType = sortedCounts[0][0];
        }

        return {
            siName: primeName,
            numAwards: uniqueContractKeys.size,
            totalValue: totalValue,
            avgValue: avgValue,
            avgDurationDays: Math.round(avgDurationDays),
            dominantType: dominantType
        };
    }).filter(Boolean) // Remove null entries
      .sort((a, b) => b.totalValue - a.totalValue); // Sort by total value descending

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

    // Remove any existing table or placeholders
    container.innerHTML = '';

    if (!leaderData || leaderData.length === 0) {
        displayNoData(containerId, 'No contract leader data found.');
        return;
    }

    // Create a table wrapper div
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.style.overflow = 'auto';
    tableWrapper.style.maxHeight = '300px';

    // Display top 15 leaders
    const displayData = leaderData.slice(0, 15);

    // Create Table Structure
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y';

    const thead = table.createTHead();
    thead.className = 'bg-gray-50';
    const headerRow = thead.insertRow();
    const headers = [
        { text: 'Recipient Name', scope: 'col' },
        { text: 'Total Value', scope: 'col', class: 'number' },
        { text: '# Awards', scope: 'col', class: 'number' },
        { text: 'Avg Value', scope: 'col', class: 'number' },
        { text: 'Avg Duration (Days)', scope: 'col', class: 'number' },
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
    tbody.className = 'divide-y';

    displayData.forEach(leader => {
        const row = tbody.insertRow();

        // Recipient Name
        let cell = row.insertCell();
        cell.className = 'font-medium text-gray-900';
        cell.textContent = truncateText(leader.siName, 35);
        cell.title = leader.siName;

        // Total Value
        cell = row.insertCell();
        cell.className = 'number text-gray-600 font-bold';
        cell.textContent = formatCurrency(leader.totalValue);

        // Num Awards
        cell = row.insertCell();
        cell.className = 'number text-gray-600';
        cell.textContent = leader.numAwards.toLocaleString();

        // Avg Value
        cell = row.insertCell();
        cell.className = 'number text-gray-600';
        cell.textContent = formatCurrency(leader.avgValue);

        // Avg Duration
        cell = row.insertCell();
        cell.className = 'number text-gray-600';
        cell.textContent = leader.avgDurationDays > 0 ? leader.avgDurationDays.toLocaleString() : '-';

        // Dominant Type
        cell = row.insertCell();
        cell.className = 'text-gray-600 text-xs';
        cell.textContent = truncateText(leader.dominantType, 30);
        cell.title = leader.dominantType;
    });

    // Append the table to the wrapper
    tableWrapper.appendChild(table);
    
    // Append the wrapper to the container
    container.appendChild(tableWrapper);

    // Add summary text if more leaders exist
    if (leaderData.length > 15) {
        const summaryPara = document.createElement('p');
        summaryPara.className = 'text-center text-sm text-gray-500 summary-text';
        summaryPara.textContent = `Showing Top 15 of ${leaderData.length} leaders by Total Value`;
        container.appendChild(summaryPara);
    }
}

// --- Chart 2: Expiring Contracts Table ---
function processExpiringData(data) {
    console.log("Processing data for expiring contracts...");
    if (!data || data.length === 0) return [];

    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const today = new Date();

    const expiringContracts = data.filter(row => {
        const endDateField = 'period_of_performance_current_end_date';
        const endDate = row[endDateField + '_parsed'];

        if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
            return false;
        }

        return endDate >= today && endDate <= sixMonthsFromNow;
    });

    // Sort by end date ascending (soonest expiring first)
    expiringContracts.sort((a, b) => {
        const endDateField = 'period_of_performance_current_end_date_parsed';
        const dateA = a[endDateField];
        const dateB = b[endDateField];
        if (!dateA) return 1; // Put items without dates last
        if (!dateB) return -1;
        return dateA - dateB;
    });

    console.log(`Found ${expiringContracts.length} contracts expiring in the next 6 months.`);
    return expiringContracts;
}

function displayExpiringTable(expiringData) {
    const containerId = 'expiring-contracts-table-container';
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found.`);
        return;
    }

    setLoading(containerId, false); // Turn off loading spinner

    // Clear previous content
    container.innerHTML = '';

    if (!expiringData || expiringData.length === 0) {
        displayNoData(containerId, 'No contracts found expiring in the next 6 months.');
        return;
    }

    // Create Table Structure
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.style.overflow = 'auto';
    tableWrapper.style.maxHeight = '300px';

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y';

    const thead = table.createTHead();
    thead.className = 'bg-gray-50';
    const headerRow = thead.insertRow();
    
    const headers = [
        { text: 'Contract ID / PIID', key: 'award_id_piid' },
        { text: 'Recipient Name', key: 'recipient_name' },
        { text: 'End Date', key: 'period_of_performance_current_end_date' },
        { text: 'Current Value', key: 'current_total_value_of_award', format: 'currency', class: 'number' }
    ];

    headers.forEach(headerInfo => {
        const th = document.createElement('th');
        th.textContent = headerInfo.text;
        th.scope = 'col';
        if (headerInfo.class) th.className = headerInfo.class;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    tbody.className = 'divide-y';

    expiringData.forEach(contract => {
        const row = tbody.insertRow();
        headers.forEach(headerInfo => {
            let cell = row.insertCell();
            let value = contract[headerInfo.key] || '-';

            // Format date or currency if specified
            if (headerInfo.key === 'period_of_performance_current_end_date' && contract[headerInfo.key + '_parsed'] instanceof Date) {
                value = contract[headerInfo.key + '_parsed'].toISOString().split('T')[0];
            } else if (headerInfo.format === 'currency') {
                value = formatCurrency(value);
            }

            cell.textContent = truncateText(value, 40);
            cell.title = contract[headerInfo.key] || '';
            if (headerInfo.class) cell.className = headerInfo.class;
        });
    });

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // Add summary text
    const summaryPara = document.createElement('p');
    summaryPara.className = 'text-center text-sm text-gray-500 summary-text';
    summaryPara.textContent = `Showing ${expiringData.length} expiring contracts.`;
    container.appendChild(summaryPara);
}

// --- Chart 3: TAV vs TCV Tracker ---
function processTavTcvData(data) {
    console.log("Processing TAV/TCV data...");
    if (!data || data.length === 0) return [];

    const contracts = data.map(row => {
            // Parse values safely
            const tcv = parseSafeFloat(row.current_total_value_of_award);
            const tav = parseSafeFloat(row.total_dollars_obligated);
            // Identify a unique key
            const contractId = row.contract_award_unique_key || row.award_id_piid;
            // Get recipient name
            const primeName = row.recipient_name || 'Unknown Prime';
            // Get potential value
            const potentialTcv = parseSafeFloat(row.potential_total_value_of_award) || parseSafeFloat(row.base_and_all_options_value) || 0;

            // Return structured object, or null if essential data is missing/invalid
            if (!contractId || tcv <= 0 || !primeName) {
                return null;
            }

            return {
                id: contractId,
                primeName: primeName,
                tcv: tcv,
                tav: tav,
                potentialTcv: potentialTcv
            };
        })
        .filter(Boolean) // Remove null entries
        .sort((a, b) => b.tcv - a.tcv) // Sort by Current Total Value (TCV) descending
        .slice(0, 7); // Take the top 7 contracts

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
        tavTcvChartInstance = null;
    }

    // Prepare data for Chart.js
    const labels = chartData.map(d => truncateText(d.primeName, 25));
    const tavData = chartData.map(d => d.tav);
    const tcvData = chartData.map(d => d.tcv);

    // Get computed styles for chart colors
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--color-charts-primary').trim() || '#9993A1';
    const secondaryColor = computedStyle.getPropertyValue('--color-charts-secondary').trim() || '#797484';
    const textColor = computedStyle.getPropertyValue('--color-text-secondary').trim() || '#FFFFF3';
    const textPrimaryColor = computedStyle.getPropertyValue('--color-text-primary').trim() || '#FFFFF3';
    const surfaceColor = computedStyle.getPropertyValue('--color-surface').trim() || '#252327';
    const outlineColor = computedStyle.getPropertyValue('--color-outline').trim() || '#615C66';

    // Create the new chart instance
    tavTcvChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'TAV (Obligated)',
                    data: tavData,
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    borderWidth: 0,
                    barPercentage: 0.85,
                    categoryPercentage: 0.8,
                    borderRadius: 4,
                },
                {
                    label: 'TCV (Current Total)',
                    data: tcvData,
                    backgroundColor: secondaryColor,
                    borderColor: secondaryColor,
                    borderWidth: 0,
                    barPercentage: 0.85,
                    categoryPercentage: 0.8,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Horizontal bars
            font: {
                family: "'Poppins', sans-serif",
                size: 13
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: false },
                    ticks: {
                        callback: function(value) {
                            if (Math.abs(value) >= 1e6) {
                                return '$' + (value / 1e6).toFixed(1) + 'M';
                            } else if (Math.abs(value) >= 1e3) {
                                return '$' + (value / 1e3).toFixed(0) + 'K';
                            }
                            return value !== 0 ? formatCurrency(value) : '$0';
                        },
                        color: textColor,
                        font: { size: 13 },
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
                            weight: 'bold'
                        },
                        padding: 8,
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
                    backgroundColor: surfaceColor,
                    titleColor: textPrimaryColor,
                    bodyColor: textPrimaryColor,
                    borderColor: outlineColor,
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
                                return `${originalData.primeName}\n(${originalData.id})`;
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
                        boxWidth: 18,
                        padding: 20,
                        font: { 
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            },
            layout: {
                padding: { top: 16, bottom: 16, left: 12, right: 20 }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });
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
    const naicsMap = new Map();

    data.forEach(row => {
        // Add all sub-agencies as-is without extra checks
        if (row.awarding_sub_agency_name) {
            subAgencySet.add(row.awarding_sub_agency_name);
        }

        // Add all NAICS codes as-is
        if (row.naics_code) {
            const code = String(row.naics_code);
            const desc = row.naics_description || '';
            if (!naicsMap.has(code)) {
                naicsMap.set(code, desc);
            }
        }
    });

    // Populate the dropdowns
    populateDropdown(document.getElementById('sub-agency-filter'), subAgencySet, "All Sub-Agencies");
    populateNaicsDropdown(document.getElementById('naics-filter'), naicsMap);
}

// --- Sankey Chart Functions ---
function processSankeyData(data) {
    console.log("Processing data for Sankey chart...");
    if (!data || data.length === 0) return [];

    // Get unique sub-agencies
    const subAgencies = [];
    const subAgencySet = new Set();
    
    data.forEach(row => {
        const agency = row.awarding_sub_agency_name?.trim();
        if (agency && !subAgencySet.has(agency)) {
            subAgencySet.add(agency);
            subAgencies.push({ name: agency });
        }
    });

    // Get top 10 recipients by value
    const recipientValues = {};
    data.forEach(row => {
        const recipient = row.recipient_name;
        if (!recipient) return;
        
        if (!recipientValues[recipient]) {
            recipientValues[recipient] = 0;
        }
        recipientValues[recipient] += parseSafeFloat(row.current_total_value_of_award);
    });

    // Sort recipients by value and take top 10
    const topRecipients = Object.entries(recipientValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => ({ name: name }));

    // Create links between agencies and recipients
    const links = [];
    
    // Collect all links and sum values
    data.forEach(row => {
        const agency = row.awarding_sub_agency_name?.trim();
        const recipient = row.recipient_name;
        
        if (!agency || !recipient) return;
        
        // Find agency and recipient indices
        const sourceIndex = subAgencies.findIndex(a => a.name === agency);
        const targetIndex = topRecipients.findIndex(r => r.name === recipient);
        
        // Only create links to top recipients
        if (sourceIndex === -1 || targetIndex === -1) return;
        
        const value = parseSafeFloat(row.current_total_value_of_award);
        if (value <= 0) return;
        
        // Check if a link already exists
        const existingLinkIndex = links.findIndex(link => 
            link.source === sourceIndex && 
            link.target === subAgencies.length + targetIndex
        );
        
        if (existingLinkIndex >= 0) {
            // Add value to existing link
            links[existingLinkIndex].value += value;
        } else {
            // Create new link
            links.push({
                source: sourceIndex,
                target: subAgencies.length + targetIndex, // Recipients start after agencies
                value: value
            });
        }
    });
    
    // Filter out links with zero or very small values
    const validLinks = links.filter(link => link.value > 1000);
    
    // Filter nodes to only include those with connections
    const connectedAgencyIndices = new Set();
    const connectedRecipientIndices = new Set();
    
    validLinks.forEach(link => {
        if (link.source < subAgencies.length) {
            connectedAgencyIndices.add(link.source);
        }
        if (link.target >= subAgencies.length) {
            connectedRecipientIndices.add(link.target - subAgencies.length);
        }
    });
    
    const filteredAgencies = Array.from(connectedAgencyIndices).map(i => subAgencies[i]);
    const filteredRecipients = Array.from(connectedRecipientIndices).map(i => topRecipients[i]);
    
    // Create final nodes list
    const nodes = [...filteredAgencies, ...filteredRecipients];
    
    // Create a mapping from old indices to new indices
    const oldToNewIndexMap = new Map();
    connectedAgencyIndices.forEach((oldIndex, newIndex) => {
        oldToNewIndexMap.set(oldIndex, newIndex);
    });
    connectedRecipientIndices.forEach((oldIndex, newIndex) => {
        oldToNewIndexMap.set(oldIndex + subAgencies.length, newIndex + filteredAgencies.length);
    });
    
    // Remap link source/target to new indices
    const remappedLinks = validLinks.map(link => ({
        source: oldToNewIndexMap.get(link.source),
        target: oldToNewIndexMap.get(link.target),
        value: link.value
    })).filter(link => link.source !== undefined && link.target !== undefined);
    
    console.log(`Processed data for Sankey chart: ${nodes.length} nodes, ${remappedLinks.length} links`);
    return { nodes, links: remappedLinks };
}

function displaySankeyChart(sankeyData) {
    const containerId = 'sankey-chart-container';
    const container = document.getElementById(containerId);
    const svg = document.getElementById('sankeyChart');
    
    if (!container || !svg) {
        console.error("Sankey chart container or SVG element not found.");
        if(container) displayError(containerId, "SVG element is missing.");
        return;
    }
    
    setLoading(containerId, false); // Turn off loading spinner
    
    // Clear any previous content
    svg.innerHTML = '';
    
    if (!sankeyData || !sankeyData.nodes || !sankeyData.links || 
        sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
        displayNoData(containerId, 'No data available for Sankey diagram.');
        return;
    }
    
    // Set dimensions and margins
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 20, right: 20, bottom: 20, left: 20};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create simple Sankey layout with D3
    const nodeWidth = 15;
    const nodePadding = 10;
    
    // Manually create a simple Sankey layout if d3.sankey is not available
    try {
        // Create a mapping of node ID to index in the nodes array
        const nodeMap = new Map(sankeyData.nodes.map((node, i) => [i, node]));
        
        // Calculate the total outgoing value for each source node
        const sourceValues = new Map();
        sankeyData.links.forEach(link => {
            const source = link.source;
            const value = link.value;
            sourceValues.set(source, (sourceValues.get(source) || 0) + value);
        });
        
        // Calculate the total incoming value for each target node
        const targetValues = new Map();
        sankeyData.links.forEach(link => {
            const target = link.target;
            const value = link.value;
            targetValues.set(target, (targetValues.get(target) || 0) + value);
        });
        
        // Calculate the maximum value for scaling purposes
        const maxValue = Math.max(
            ...Array.from(sourceValues.values()),
            ...Array.from(targetValues.values())
        );
        
        // Layout nodes in two columns
        const columnGap = innerWidth * 0.6;
        const nodeCount = sankeyData.nodes.length;
        const halfCount = Math.ceil(nodeCount / 2);
        
        // Assign x positions in two columns
        for (let i = 0; i < nodeCount; i++) {
            const node = nodeMap.get(i);
            // Determine if node is source or target
            const isSource = i < halfCount;
            
            // Set x position
            node.x0 = isSource ? margin.left : margin.left + columnGap;
            node.x1 = node.x0 + nodeWidth;
        }
        
        // Calculate y positions based on equal spacing
        const sourceNodes = sankeyData.nodes.slice(0, halfCount);
        const targetNodes = sankeyData.nodes.slice(halfCount);
        
        // Calculate spacing for source nodes
        const sourceSpacing = (innerHeight - sourceNodes.length * nodeWidth) / (sourceNodes.length + 1);
        sourceNodes.forEach((node, i) => {
            node.y0 = margin.top + i * (nodeWidth + sourceSpacing) + sourceSpacing;
            node.y1 = node.y0 + nodeWidth;
        });
        
        // Calculate spacing for target nodes
        const targetSpacing = (innerHeight - targetNodes.length * nodeWidth) / (targetNodes.length + 1);
        targetNodes.forEach((node, i) => {
            node.y0 = margin.top + i * (nodeWidth + targetSpacing) + targetSpacing;
            node.y1 = node.y0 + nodeWidth;
        });
        
        // Create path data for links
        sankeyData.links.forEach(link => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);
            const value = link.value;
            
            // Set source and target data for rendering
            link.sourceX = source.x1;
            link.sourceY = source.y0 + (source.y1 - source.y0) / 2;
            link.targetX = target.x0;
            link.targetY = target.y0 + (target.y1 - target.y0) / 2;
            
            // Calculate width proportional to value
            link.width = Math.max(1, (value / maxValue) * 30);
        });
        
        // Create the main SVG group
        const g = d3.select(svg)
            .attr('width', width)
            .attr('height', height)
            .append('g');
        
        // Add links
        g.append('g')
            .selectAll('path')
            .data(sankeyData.links)
            .enter()
            .append('path')
            .attr('d', link => {
                const curvature = 0.5;
                const x0 = link.sourceX;
                const y0 = link.sourceY;
                const x1 = link.targetX;
                const y1 = link.targetY;
                const xi = d3.interpolateNumber(x0, x1);
                const x2 = xi(curvature);
                const x3 = xi(1 - curvature);
                
                return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
            })
            .attr('stroke-width', d => Math.max(1, d.width))
            .attr('stroke', '#797484')
            .attr('stroke-opacity', 0.5)
            .attr('fill', 'none')
            .append('title')
            .text(d => {
                const source = nodeMap.get(d.source);
                const target = nodeMap.get(d.target);
                return `${source.name} → ${target.name}\n${formatCurrency(d.value)}`;
            });
        
        // Add nodes as rectangles
        g.append('g')
            .selectAll('rect')
            .data(sankeyData.nodes)
            .enter()
            .append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => d.y1 - d.y0)
            .attr('width', d => d.x1 - d.x0)
            .attr('fill', '#9993A1')
            .attr('stroke', '#252327')
            .append('title')
            .text(d => `${d.name}\n${formatCurrency(sourceValues.get(sankeyData.nodes.indexOf(d)) || targetValues.get(sankeyData.nodes.indexOf(d)) || 0)}`);
        
        // Add labels
        g.append('g')
            .selectAll('text')
            .data(sankeyData.nodes)
            .enter()
            .append('text')
            .attr('x', d => d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr('y', d => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.x0 < innerWidth / 2 ? 'start' : 'end')
            .text(d => truncateText(d.name, 25))
            .attr('font-size', '11px')
            .attr('fill', '#FFFFF3');
        
    } catch (error) {
        console.error("Error creating Sankey diagram:", error);
        displayError(containerId, "Failed to render Sankey diagram: " + error.message);
    }
}

// --- Choropleth Map Functions ---
function processMapData(data) {
    console.log("Processing data for performance map...");
    if (!data || data.length === 0) return {};
    
    // Create a map to store state-level aggregates
    const stateData = {};
    
    data.forEach(row => {
        // Try multiple possible field names for state
        const state = row.place_of_performance_state_name?.trim() || 
                      row.pop_state_code?.trim() ||
                      row.pop_state_name?.trim() ||
                      row.place_of_performance_state_code?.trim() ||
                      "Unknown";
                     
        const value = parseSafeFloat(row.current_total_value_of_award) || 0;
        
        if (state.toLowerCase() === 'unknown') return;
        
        if (!stateData[state]) {
            stateData[state] = {
                value: 0,
                count: 0
            };
        }
        
        stateData[state].value += value;
        stateData[state].count += 1;
    });
    
    console.log(`Processed data for map: ${Object.keys(stateData).length} states`);
    return stateData;
}

function displayChoroplethMap(mapData) {
    const containerId = 'map-container';
    const container = document.getElementById(containerId);
    const mapDiv = document.getElementById('choroplethMap');
    
    if (!container || !mapDiv) {
        console.error("Map container or div element not found.");
        if(container) displayError(containerId, "Map div element is missing.");
        return;
    }
    
    setLoading(containerId, false); // Turn off loading spinner
    
    // Clear any previous content
    mapDiv.innerHTML = '';
    
    if (!mapData || Object.keys(mapData).length === 0) {
        displayNoData(containerId, 'No geographic data available for mapping.');
        return;
    }
    
    try {
        // Set up map dimensions
        const width = mapDiv.clientWidth;
        const height = mapDiv.clientHeight;
        
        // Create SVG element inside the map div
        const svg = d3.select(mapDiv)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Create a map projection
        const projection = d3.geoAlbersUsa()
            .scale(width)
            .translate([width / 2, height / 2]);
        
        const path = d3.geoPath().projection(projection);
        
        // Define color scale for the map
        const stateValues = Object.values(mapData).map(d => d.value);
        const maxValue = d3.max(stateValues) || 0;
        
        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateBlues)
            .domain([0, maxValue]);
        
        // Create tooltip
        const tooltip = d3.select(mapDiv)
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', '#252327')
            .style('color', '#FFFFF3')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none');
        
        // State name to abbreviation mapping
        const stateNameToAbbr = {
            "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
            "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
            "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
            "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
            "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
            "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
            "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
            "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
            "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
            "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
            "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
            "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
            "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
        };
        
        // Abbreviation to name mapping (reverse of above)
        const abbrToStateName = {};
        Object.entries(stateNameToAbbr).forEach(([name, abbr]) => {
            abbrToStateName[abbr] = name;
        });
        
        // Attempt to load US state boundaries GeoJSON
        d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
            .then(us => {
                if (!us || !us.objects || !us.objects.states) {
                    throw new Error("Invalid GeoJSON data");
                }
                
                // Convert TopoJSON to GeoJSON
                const states = topojson.feature(us, us.objects.states).features;
                
                // Set state name property for each feature
                states.forEach(state => {
                    const id = state.id;
                    // Convert FIPS code to state name
                    Object.entries(stateNameToAbbr).forEach(([name, abbr]) => {
                        if (state.properties && !state.properties.name) {
                            state.properties.name = name;
                        }
                    });
                });
                
                // Draw state boundaries
                svg.selectAll('path')
                    .data(states)
                    .enter()
                    .append('path')
                    .attr('d', path)
                    .attr('fill', d => {
                        // Try to find data for this state
                        let stateData;
                        const stateName = d.properties.name;
                        const stateAbbr = stateNameToAbbr[stateName];
                        
                        // Check if we have data under the full name or abbreviation
                        if (mapData[stateName]) {
                            stateData = mapData[stateName];
                        } else if (stateAbbr && mapData[stateAbbr]) {
                            stateData = mapData[stateAbbr];
                        }
                        
                        // Return color based on value, or default gray
                        return stateData ? colorScale(stateData.value) : '#ccc';
                    })
                    .attr('stroke', '#252327')
                    .attr('stroke-width', 0.5)
                    .on('mouseover', function(event, d) {
                        let stateName = d.properties.name;
                        let stateAbbr = stateNameToAbbr[stateName];
                        let stateData;
                        
                        // Find data for this state
                        if (mapData[stateName]) {
                            stateData = mapData[stateName];
                        } else if (stateAbbr && mapData[stateAbbr]) {
                            stateData = mapData[stateAbbr];
                        }
                        
                        if (stateData) {
                            tooltip.transition()
                                .duration(200)
                                .style('opacity', 0.9);
                                
                            tooltip.html(`
                                <strong>${stateName}</strong><br>
                                Total Value: ${formatCurrency(stateData.value)}<br>
                                Contracts: ${stateData.count}
                            `)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                        }
                    })
                    .on('mouseout', function() {
                        tooltip.transition()
                            .duration(500)
                            .style('opacity', 0);
                    });
                    
                // Add legend
                const legendWidth = 200;
                const legendHeight = 15;
                const legendX = width - legendWidth - 20;
                const legendY = height - 40;
                
                // Create a linear gradient for the legend
                const defs = svg.append('defs');
                const linearGradient = defs.append('linearGradient')
                    .attr('id', 'legend-gradient')
                    .attr('x1', '0%')
                    .attr('y1', '0%')
                    .attr('x2', '100%')
                    .attr('y2', '0%');
                    
                // Add color stops to the gradient
                const stops = [0, 0.25, 0.5, 0.75, 1];
                stops.forEach(stop => {
                    linearGradient.append('stop')
                        .attr('offset', `${stop * 100}%`)
                        .attr('stop-color', colorScale(stop * maxValue));
                });
                
                // Draw the legend rectangle
                svg.append('rect')
                    .attr('x', legendX)
                    .attr('y', legendY)
                    .attr('width', legendWidth)
                    .attr('height', legendHeight)
                    .style('fill', 'url(#legend-gradient)')
                    .attr('stroke', '#252327')
                    .attr('stroke-width', 1);
                    
                // Add legend labels
                svg.append('text')
                    .attr('x', legendX)
                    .attr('y', legendY - 5)
                    .attr('text-anchor', 'start')
                    .attr('font-size', '10px')
                    .attr('fill', '#FFFFF3')
                    .text('$0');
                    
                svg.append('text')
                    .attr('x', legendX + legendWidth)
                    .attr('y', legendY - 5)
                    .attr('text-anchor', 'end')
                    .attr('font-size', '10px')
                    .attr('fill', '#FFFFF3')
                    .text(formatCurrency(maxValue));
                    
                svg.append('text')
                    .attr('x', legendX + (legendWidth / 2))
                    .attr('y', legendY - 5)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .attr('fill', '#FFFFF3')
                    .text('Contract Value by State');
            })
            .catch(error => {
                console.error("Error loading GeoJSON:", error);
                displayError(containerId, `Error loading map data: ${error.message}`);
            });
    } catch (error) {
        console.error("Error creating choropleth map:", error);
        displayError(containerId, "Failed to render map: " + error.message);
    }
}

function applyFiltersAndUpdateVisuals() {
    // --- Get Filter & Search Values ---
    const subAgencyFilter = document.getElementById('sub-agency-filter')?.value || '';
    const naicsFilter = document.getElementById('naics-filter')?.value || '';
    const startDateString = document.getElementById('arr-start-date')?.value || '';
    const endDateString = document.getElementById('arr-end-date')?.value || '';
    const searchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || '';

    console.log("Applying filters/search:", { subAgencyFilter, naicsFilter, startDateString, endDateString, searchTerm });

    // --- Set Loading States for ALL dynamic cards ---
    setLoading('contract-leaders-table-container', true);
    setLoading('tav-tcv-chart-container', true);
    setLoading('expiring-contracts-table-container', true);
    setLoading('sankey-chart-container', true);
    setLoading('map-container', true);

    // --- Check for Raw Data ---
    if (!rawData || rawData.length === 0) {
        console.warn("No raw data available to filter.");
        if (!currentDataset) {
            resetUIForNoDataset(); // Resets everything if no dataset selected
        } else {
            // If dataset was loaded but resulted in empty rawData
            displayNoData('contract-leaders-table-container', 'No data loaded.');
            displayNoData('tav-tcv-chart-container', 'No data loaded.');
            displayNoData('expiring-contracts-table-container', 'No data loaded.');
            displayNoData('sankey-chart-container', 'No data loaded.');
            displayNoData('map-container', 'No data loaded.');
        }
        return []; // Return empty array
    }

    // --- Apply Search ---
    let dataAfterSearch = rawData; // Start with all raw data
    if (searchTerm !== '') {
        console.log(`Applying search for term: "${searchTerm}"`);
        dataAfterSearch = rawData.filter(row => {
            const recipientMatch = row.recipient_name?.toLowerCase().includes(searchTerm);
            const piidMatch = row.award_id_piid?.toLowerCase().includes(searchTerm);
			const descriptionMatch = row.transaction_description?.toLowerCase().includes(searchTerm);

            return recipientMatch || piidMatch || descriptionMatch;
        });
        console.log(`Data count after search: ${dataAfterSearch.length}`);
    }

    // --- Apply Filters (SubAgency, NAICS, Dates) ---
    const filterStartDate = startDateString ? parseDate(startDateString) : null;
    const filterEndDate = endDateString ? parseDate(endDateString) : null;

    // Filter the data *after* search has been applied
    const filteredData = dataAfterSearch.filter(row => {
        // Check Sub-Agency Filter
        const subAgency = row.awarding_sub_agency_name?.trim();
        if (subAgencyFilter && subAgency !== subAgencyFilter) return false;

        // Check NAICS Filter
        const naics = row.naics_code?.toString().trim();
        if (naicsFilter && naics !== naicsFilter) return false;

        // Check Date Filter (Period of Performance Overlap)
        if (filterStartDate || filterEndDate) {
            const popStartDate = row.period_of_performance_start_date_parsed;
            const popEndDate = row.period_of_performance_current_end_date_parsed;

            if (!popStartDate || !popEndDate || !(popStartDate instanceof Date) || !(popEndDate instanceof Date)) {
                return false; // Exclude if dates are invalid for date filtering
            }
            const endsAfterFilterStart = !filterStartDate || popEndDate >= filterStartDate;
            const startsBeforeFilterEnd = !filterEndDate || popStartDate <= filterEndDate;
            if (!endsAfterFilterStart || !startsBeforeFilterEnd) {
                return false; // No overlap
            }
        }

        // If all checks pass, include the row
        return true;
    });

    console.log(`Filtered data count (after search & filters): ${filteredData.length} records`);

    // --- Process and Update Visuals ---
    // Contract Leaders Table
    const leaderData = processContractLeaders(filteredData);
    displayContractLeadersTable(leaderData);

    // TAV/TCV Chart
    const tavTcvData = processTavTcvData(filteredData);
    displayTavTcvChart(tavTcvData);

    // Expiring Contracts Table
    const expiringData = processExpiringData(filteredData);
    displayExpiringTable(expiringData);

    // Sankey Chart for Award Flow
    const sankeyData = processSankeyData(filteredData);
    displaySankeyChart(sankeyData);

    // Choropleth Map
    const mapData = processMapData(filteredData);
    displayChoroplethMap(mapData);

    // Return the final filtered data
    return filteredData;
}

// --- ARR Calculation ---
function calculateAverageARR() {
    const resultDiv = document.getElementById('arr-result');
    const loadingDiv = document.getElementById('arr-loading');
    const errorDiv = document.getElementById('arr-error');
    const noDataDiv = document.getElementById('arr-no-data');

    // Reset UI elements
    resultDiv.textContent = '--';
    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    noDataDiv.style.display = 'none';

    // Apply filters to get filtered data
    const dataForARR = applyFiltersAndUpdateVisuals();

    // Use setTimeout to allow the UI to render
    setTimeout(() => {
        try {
            console.log(`Calculating ARR based on ${dataForARR.length} filtered contracts.`);

            if (dataForARR.length === 0) {
                loadingDiv.style.display = 'none';
                noDataDiv.textContent = 'No contracts match the selected filter criteria for ARR calculation.';
                noDataDiv.style.display = 'block';
                resultDiv.textContent = formatCurrency(0) + " / year";
                resultDiv.style.display = 'block';
                return;
            }

            let totalAnnualizedValue = 0;
            let validContractsCount = 0;

            dataForARR.forEach((row) => {
                const value = parseSafeFloat(row.current_total_value_of_award) || parseSafeFloat(row.base_and_exercised_options_value) || 0;
                const durationDays = calculateDurationDays(row.period_of_performance_start_date, row.period_of_performance_current_end_date);

                if (value > 0 && durationDays > 0) {
                    const durationYears = durationDays / 365.25;
                    const annualizedValue = value / durationYears;
                    totalAnnualizedValue += annualizedValue;
                    validContractsCount++;
                }
            });

            if (validContractsCount > 0) {
                const averageARR = totalAnnualizedValue / validContractsCount;
                resultDiv.textContent = formatCurrency(averageARR) + " / year";
                resultDiv.style.display = 'block';
                console.log(`Average ARR: ${averageARR.toFixed(0)} (from ${validContractsCount} valid contracts)`);
                noDataDiv.style.display = 'none';
            } else {
                noDataDiv.textContent = 'No contracts suitable for ARR calculation found in the filtered set.';
                noDataDiv.style.display = 'block';
                resultDiv.textContent = formatCurrency(0) + " / year";
                resultDiv.style.display = 'block';
                console.log("No valid contracts found for ARR calculation after filtering.");
            }
        } catch (error) {
            console.error("Error calculating ARR:", error);
            errorDiv.textContent = `Error calculating ARR: ${error.message}`;
            errorDiv.style.display = 'block';
            resultDiv.style.display = 'none';
        } finally {
            // Always hide the loading spinner
            loadingDiv.style.display = 'none';
        }
    }, 50);
}

// --- Load Dataset Functions ---
function updateStatusBanner(message, type = 'info') {
    const banner = document.getElementById('status-banner');
    const statusMessage = document.getElementById('status-message');
    const refreshButton = document.getElementById('refresh-button');
    if (!banner || !statusMessage || !refreshButton) return;

    // Update the message text
    statusMessage.textContent = message;

    // Update banner styling/class based on type
    banner.className = '';
    if (type === 'error') {
        banner.classList.add('error');
    } else if (type === 'success') {
        banner.classList.add('success');
    } else {
        banner.classList.add('info');
    }

    // Enable/disable refresh button based on loading state
    refreshButton.disabled = isLoading;
}

function updateDashboardTitle(dataset) {
    const dashboardTitle = document.getElementById('dashboard-title');
    const dashboardSubtitle = document.getElementById('dashboard-subtitle');
    if (!dashboardTitle || !dashboardSubtitle) return;

    if (dataset) {
        dashboardTitle.textContent = `${dataset.name} Sales QBR Dashboard`;
        dashboardSubtitle.textContent = `Analyzing contract data for ${dataset.name}`;
    } else {
        // Reset to default titles
        dashboardTitle.textContent = 'Sales QBR Dashboard';
        dashboardSubtitle.textContent = 'Select an agency dataset to begin';
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
    updateDashboardTitle(dataset);
    updateStatusBanner(`Loading ${dataset.name} data...`, 'info');
    document.getElementById('refresh-button').disabled = true;

    // Set loading states for containers
    setLoading('contract-leaders-table-container', true, `Loading ${dataset.name} leader data...`);
    setLoading('tav-tcv-chart-container', true, `Loading ${dataset.name} TAV/TCV data...`);
    setLoading('expiring-contracts-table-container', true, `Loading ${dataset.name} expiring contracts...`);
    setLoading('sankey-chart-container', true, `Loading ${dataset.name} award flow...`);
    setLoading('map-container', true, `Loading ${dataset.name} performance data...`);

    // Clear previous chart instances
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

    // Fetch the data from S3
    fetchDataFromS3(dataset);
}

function refreshCurrentDataset() {
    if (currentDataset && !isLoading) {
        console.log("Refreshing current dataset:", currentDataset.name);
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
    updateStatusBanner(`Loading ${dataset.name} data...`, 'info');

    const csvUrl = `${S3_BASE_URL}${dataset.id}.csv`;
    console.log(`Loading data from URL: ${csvUrl}`);

    try {
        const response = await fetch(csvUrl, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Accept': 'text/csv',
            }
        });

        // Check if the fetch was successful
        if (!response.ok) {
            const statusText = response.statusText || 'Unknown Error';
            const errorMsg = `Failed to fetch data: ${response.status} ${statusText}`;
            console.error(errorMsg, `URL: ${csvUrl}`);
            throw new Error(errorMsg);
        }

        // Get the response body as text
        const csvText = await response.text();

        // Check if the response body is empty
        if (!csvText || csvText.trim() === '') {
            console.warn(`Received empty CSV data for ${dataset.name} from ${csvUrl}`);
            processDataset(dataset, []);
            return;
        }

        // Update status before parsing
        updateStatusBanner(`Parsing ${dataset.name} data...`, 'info');

        // Use PapaParse for CSV parsing
        Papa.parse(csvText, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: 'greedy',
            transformHeader: header => header.trim(),
            complete: (results) => {
                console.log(`Successfully parsed ${results.data.length} rows for ${dataset.name}.`);

                // Log any parsing errors
                if (results.errors && results.errors.length > 0) {
                    console.warn(`CSV parsing for ${dataset.name} encountered ${results.errors.length} errors:`, results.errors);
                }

                // Check if data array exists and has content
                if (!results.data || results.data.length === 0) {
                    console.warn(`No data rows found after parsing CSV for ${dataset.name}.`);
                    processDataset(dataset, []);
                } else {
                    // Process the successfully parsed data
                    processDataset(dataset, results.data);
                }
            },
            error: (error) => {
                // Handle critical errors from PapaParse
                console.error(`PapaParse Error for ${dataset.name}:`, error);
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
        displayError('expiring-contracts-table-container', `Failed to load data: ${error.message}`);
        displayError('sankey-chart-container', `Failed to load data: ${error.message}`);
        displayError('map-container', `Failed to load data: ${error.message}`);

        // Reset state on error
        rawData = [];
        populateFilters(rawData);
        isLoading = false;
        
        // Enable refresh button for retry
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
                            cleanRow[key] = null;
                        } else {
                            cleanRow[key] = value;
                        }
                    }
                }

                // Convert numeric fields using parseSafeFloat
                cleanRow.current_total_value_of_award = parseSafeFloat(cleanRow.current_total_value_of_award);
                cleanRow.base_and_exercised_options_value = parseSafeFloat(cleanRow.base_and_exercised_options_value);
                cleanRow.total_dollars_obligated = parseSafeFloat(cleanRow.total_dollars_obligated);
                cleanRow.base_and_all_options_value = parseSafeFloat(cleanRow.base_and_all_options_value);
                cleanRow.potential_total_value_of_award = parseSafeFloat(cleanRow.potential_total_value_of_award);

                // Default values for essential fields
                cleanRow.recipient_name = cleanRow.recipient_name || 'Unknown Recipient';
                cleanRow.awarding_sub_agency_name = cleanRow.awarding_sub_agency_name || 'Unknown Sub-Agency';
                cleanRow.naics_code = cleanRow.naics_code || 'Unknown';
                cleanRow.naics_description = cleanRow.naics_description || 'No Description';
                cleanRow.contract_award_unique_key = cleanRow.contract_award_unique_key || null;
                cleanRow.award_id_piid = cleanRow.award_id_piid || null;

                // Pre-parse date fields
                cleanRow.period_of_performance_start_date_parsed = parseDate(cleanRow.period_of_performance_start_date);
                cleanRow.period_of_performance_current_end_date_parsed = parseDate(cleanRow.period_of_performance_current_end_date);

                return cleanRow;

            } catch (rowError) {
                console.error(`Error processing row ${index} for ${dataset.name}:`, rowError, "Row data:", row);
                return null;
            }
        }).filter(Boolean); // Filter out null entries

        console.log(`Successfully processed ${rawData.length} valid rows for ${dataset.name}`);

        // Check if all rows failed processing
        if (rawData.length === 0 && data.length > 0) {
            throw new Error(`All ${data.length} data rows failed processing. Check data format or processing logic.`);
        }

        // Update UI after successful processing
        updateStatusBanner(`Successfully loaded ${rawData.length} records from ${dataset.name} at ${new Date().toLocaleTimeString()}`, 'success');

        // Populate filter dropdowns
        populateFilters(rawData);

        // Apply filters and update charts/tables
        applyFiltersAndUpdateVisuals();

    } catch (error) {
        // Catch errors specific to the processing stage
        console.error(`Error processing dataset ${dataset.name}:`, error);
        updateStatusBanner(`Error processing ${dataset.name}: ${error.message}`, 'error');

        // Display error messages in the UI components
        displayError('contract-leaders-table-container', `Error processing data: ${error.message}`);
        displayError('tav-tcv-chart-container', `Error processing data: ${error.message}`);
        displayError('expiring-contracts-table-container', `Error processing data: ${error.message}`);
        displayError('sankey-chart-container', `Error processing data: ${error.message}`);
        displayError('map-container', `Error processing data: ${error.message}`);

        // Reset state on processing error
        rawData = [];
        populateFilters(rawData);
        resetUIForNoDataset();

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
    
    // Search input with debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log("Search input changed, triggering filter update...");
                applyFiltersAndUpdateVisuals();
            }, 500); // 500ms delay
        });
    } else {
        console.error("Search input element not found.");
    }
    
    // Filters that trigger visual updates
    const subAgencyFilter = document.getElementById('sub-agency-filter');
    const naicsFilter = document.getElementById('naics-filter');
    const startDateInput = document.getElementById('arr-start-date');
    const endDateInput = document.getElementById('arr-end-date');

    if (subAgencyFilter) subAgencyFilter.addEventListener('change', applyFiltersAndUpdateVisuals);
    if (naicsFilter) naicsFilter.addEventListener('change', applyFiltersAndUpdateVisuals);
    if (startDateInput) startDateInput.addEventListener('change', applyFiltersAndUpdateVisuals);
    if (endDateInput) endDateInput.addEventListener('change', applyFiltersAndUpdateVisuals);
}

// --- Initialize Dashboard ---
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    
    // Initialize the dataset selector dropdown
    initializeDatasetSelector();

    // Set initial UI state
    updateDashboardTitle(null);
    updateStatusBanner('Please select a dataset to begin', 'info');
    resetUIForNoDataset();
    updateDateDisplay();
    
    // Setup all event listeners
    setupEventListeners();
    
    // Auto-load the SOCOM dataset
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

    console.log("Dashboard initialized.");
});

// Update the date display every minute
setInterval(updateDateDisplay, 60000);

// Handle window resize for charts
window.addEventListener('resize', function() {
    if (tavTcvChartInstance) {
        // Force chart redraw on window resize
        tavTcvChartInstance.resize();
        // Additional adjustment for left alignment
        const canvas = document.getElementById('tavTcvChart');
        if (canvas) {
            canvas.style.marginLeft = '0';
        }
    }
});