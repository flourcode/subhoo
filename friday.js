// Constants
const S3_BASE_URL = 'https://subhoodata.s3.us-east-1.amazonaws.com/data/';
const DATASETS = [
    { id: 'army_primes', name: 'Army' },
    { id: 'dhs_primes', name: 'DHS' },
    { id: 'doj_primes', name: 'DOJ' },
    { id: 'epa_primes', name: 'EPA' },
    { id: 'navy_primes', name: 'Navy' },
    { id: 'socom_primes', name: 'SOCOM' },
    { id: 'uscc_primes', name: 'USCC' },
    { id: 'usmc_primes', name: 'USMC' },
    { id: 'va_primes', name: 'VA' }
];

// Global variables
let rawData = []; // To store loaded data
let tavTcvChartInstance = null; // Store chart instance
let isLoading = false;
let currentDataset = null;
let chartData = []; // Store chart data globally

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

function cleanupTooltips() {
    // Remove custom HTML tooltips
    const tooltipIds = ['tav-tcv-tooltip'];
    tooltipIds.forEach(id => {
        const tooltipEl = document.getElementById(id);
        if (tooltipEl && tooltipEl.parentNode) {
            tooltipEl.parentNode.removeChild(tooltipEl);
        }
    });
    
    // Remove D3 tooltips - use more specific selectors
    d3.select("body").selectAll(".sankey-tooltip").remove();
    d3.select("body").selectAll(".map-tooltip").remove();
    d3.select("body").selectAll(".tooltip").remove();
    
    // Also clean up any Chart.js tooltips that might be created
    d3.select("body").selectAll(".chartjs-tooltip").remove();
    const chartjsTooltip = document.getElementById('chartjs-tooltip');
    if (chartjsTooltip && chartjsTooltip.parentNode) {
        chartjsTooltip.parentNode.removeChild(chartjsTooltip);
    }
    
    // For good measure, find any tooltips with style="opacity: 1" that might be stuck
    document.querySelectorAll('div[style*="opacity: 1"][style*="position: absolute"]').forEach(el => {
        // Only remove if it looks like a tooltip
        if (el.style.pointerEvents === 'none' && 
            el.style.zIndex && 
            !el.className.includes('loading') && 
            !el.className.includes('placeholder')) {
            el.parentNode.removeChild(el);
        }
    });
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

function updateDateDisplay() {
    // Get the elements
    const dateText = document.getElementById('date-text');
    const timeText = document.getElementById('time-text');

    // Check if elements were found
    if (!dateText || !timeText) {
        console.error("Date/Time display elements not found. Check IDs: #date-text, #time-text");
        return; 
    }

    // Get the current date and time
    const now = new Date();

    // Format the date as "Thu, May 1"
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const dayStr = dayNames[now.getDay()];
    const monthStr = monthNames[now.getMonth()];
    const dateStr = now.getDate();
    
    dateText.textContent = `${dayStr}, ${monthStr} ${dateStr}`;

    // Format the time as "2:07 PM"
    const timeString = now.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
    });
    
    timeText.textContent = timeString;
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
    // Clean up tooltips
    cleanupTooltips();
    
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
    document.getElementById('arr-result').textContent = '$0 / yr';
    document.getElementById('arr-loading').style.display = 'none';
    document.getElementById('arr-error').style.display = 'none';
    document.getElementById('arr-no-data').style.display = 'none'; 

    // Reset filters
    const subAgencyFilter = document.getElementById('sub-agency-filter');
    const naicsFilter = document.getElementById('naics-filter');
    if (subAgencyFilter) subAgencyFilter.innerHTML = '<option value="">All Sub-Agencies</option>';
    if (naicsFilter) naicsFilter.innerHTML = '<option value="">All NAICS</option>';
    
    // Reset search
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
}

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

        // Get unique contract keys - MODIFIED: Store these in an array to use for permalinks
        const uniqueContractKeysSet = new Set(validContracts.map(c => c.contract_award_unique_key || c.award_id_piid).filter(Boolean));
        const uniqueContractKeys = Array.from(uniqueContractKeysSet); // Convert set to array
        
        if (uniqueContractKeys.length === 0) return null;

        // Calculate total and average values
        const values = validContracts.map(c => parseSafeFloat(c.current_total_value_of_award) || parseSafeFloat(c.base_and_exercised_options_value) || 0);
        const totalValue = d3.sum(values);
        const avgValue = totalValue / uniqueContractKeys.length;

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
            numAwards: uniqueContractKeys.length,
            totalValue: totalValue,
            avgValue: avgValue,
            avgDurationDays: Math.round(avgDurationDays),
            dominantType: dominantType,
            uniqueContractKeys: uniqueContractKeys // Added this line
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
    tableWrapper.style.maxHeight = '900px';
    
    // Display top 10 leaders
    const displayData = leaderData.slice(0, 10);
    
    // Create Table Structure
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y';
    
    const thead = table.createTHead();
    thead.className = 'bg-gray-50';
    const headerRow = thead.insertRow();
    const headers = [
        { text: 'Recipient', scope: 'col' },
        { text: 'Total Value', scope: 'col', class: 'number' },
        { text: 'Awards', scope: 'col', class: 'number' },
        { text: 'Avg Value', scope: 'col', class: 'number' },
        { text: 'Days', scope: 'col', class: 'number' },
        { text: 'Majority Work', scope: 'col' },
        { text: 'USASpending', scope: 'col', class: 'text-center' }
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
        
        // USASpending Link
        cell = row.insertCell();
        cell.className = 'text-center';
        
        // Only create links when we have a specific contract ID
        if (leader.uniqueContractKeys && leader.uniqueContractKeys.length > 0) {
            // If there's only one contract
            if (leader.uniqueContractKeys.length === 1) {
                const contractId = leader.uniqueContractKeys[0];
                const link = document.createElement('a');
                link.href = `https://www.usaspending.gov/award/${contractId}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'detail-link';
                link.textContent = 'View';
                cell.appendChild(link);
            } 
            // If there are multiple contracts, note that
            else {
                cell.textContent = `${leader.uniqueContractKeys.length} contracts`;
            }
        } else {
            cell.textContent = '-';
        }
    });
    
    // Append the table to the wrapper
    tableWrapper.appendChild(table);
    
    // Append the wrapper to the container
    container.appendChild(tableWrapper);
    
    // Add summary text if more leaders exist
    if (leaderData.length > 10) {
        const summaryPara = document.createElement('p');
        summaryPara.className = 'text-center text-sm text-gray-500 summary-text';
        summaryPara.textContent = `Showing Top 10 of ${leaderData.length} leaders by Total Value`;
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
        { text: 'Description', key: 'transaction_description' }, // Added description column
        { text: 'End Date', key: 'period_of_performance_current_end_date' },
        { text: 'Current Value', key: 'current_total_value_of_award', format: 'currency' },
        { text: 'USA Spending', key: 'usa_spending', class: 'text-center' }
    ];

    headers.forEach(headerInfo => {
        const th = document.createElement('th');
        th.textContent = headerInfo.text;
        th.scope = 'col';
        if (headerInfo.class) th.className = headerInfo.class;
        if (headerInfo.key === 'current_total_value_of_award') {
            th.style.textAlign = 'right';
        }
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    tbody.className = 'divide-y';

    expiringData.forEach(contract => {
        const row = tbody.insertRow();
        
        // Process each column defined in headers
        headers.forEach(headerInfo => {
            let cell = row.insertCell();
            
            // Special handling for USA Spending column
            if (headerInfo.key === 'usa_spending') {
                cell.className = 'text-center';
                const contractId = contract.contract_award_unique_key || contract.award_id_piid;
                
                if (contractId) {
                    const link = document.createElement('a');
                    link.href = `https://www.usaspending.gov/award/${contractId}`;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.className = 'detail-link';
                    link.textContent = 'View';
                    cell.appendChild(link);
                } else {
                    cell.textContent = '-';
                }
                return;
            }
            
            // Regular column processing
            let value = contract[headerInfo.key] || '-';

            // For description, look for alternative fields if the main one is empty
            if (headerInfo.key === 'transaction_description' && (value === '-' || value === '')) {
                value = contract.prime_award_base_transaction_description || 
                        contract.award_description || 
                        contract.description || '-';
            }

            // Format date or currency if specified
            if (headerInfo.key === 'period_of_performance_current_end_date' && contract[headerInfo.key + '_parsed'] instanceof Date) {
                value = contract[headerInfo.key + '_parsed'].toISOString().split('T')[0];
            } else if (headerInfo.format === 'currency') {
                value = formatCurrency(value);
                cell.className = 'number'; // Add number class for right alignment
            }

            // Determine max length based on column
            let maxLength = 40;
            if (headerInfo.key === 'transaction_description') {
                maxLength = 60; // Allow longer text for description
                cell.style.maxWidth = '250px'; // Limit width of description cell
                cell.style.wordWrap = 'break-word'; // Allow word wrapping
            }

            cell.textContent = truncateText(value, maxLength);
            cell.title = value !== '-' ? value : ''; // Set title for full text on hover
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
    
    if (!container) {
        console.error("TAV/TCV chart container element not found.");
        return;
    }

    setLoading(containerId, false);
    
    // Clear container and recreate canvas
    container.innerHTML = '';
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'tavTcvChart';
    container.appendChild(newCanvas);

    if (!chartData || chartData.length === 0) {
        displayNoData(containerId, 'No contracts found for TAV/TCV comparison.');
        return;
    }

    // Create a completely separate tooltip div
    let tooltip = document.createElement('div');
    tooltip.id = 'tav-tcv-tooltip-new';
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '10px';
    tooltip.style.background = 'white';
    tooltip.style.border = '1px solid #ccc';
    tooltip.style.borderRadius = '4px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '9999';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    // Store chart data globally for resize events
    window.chartData = chartData;
    
    // Get theme
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDarkMode) {
        tooltip.style.background = '#252229';
        tooltip.style.color = '#F4F2F6';
        tooltip.style.border = '1px solid #3A373E';
    }
    
    // Set dimensions
    const containerWidth = container.clientWidth || 600;
    const containerHeight = container.clientHeight || 400;
    newCanvas.width = containerWidth;
    newCanvas.height = containerHeight;
    
    // Get context
    const ctx = newCanvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get canvas context for TAV/TCV chart");
        displayError(containerId, "Could not initialize chart canvas");
        return;
    }
    
    // Choose colors based on theme
    const primaryColor = isDarkMode ? '#A29AAA' : '#9993A1';
    const secondaryColor = isDarkMode ? '#8C85A0' : '#797484';
    const textColor = isDarkMode ? '#F4F2F6' : '#36323A';
    
    // Prepare data - use empty labels, we'll add them as overlays
    const emptyLabels = chartData.map(() => '');
    const tavData = chartData.map(d => d.tav);
    const tcvData = chartData.map(d => d.tcv);
    
    // Destroy previous instance if it exists
    if (tavTcvChartInstance) {
        try {
            tavTcvChartInstance.destroy();
        } catch (error) {
            console.warn("Error destroying previous chart instance:", error);
        }
        tavTcvChartInstance = null;
    }
    
    // Create chart with empty labels
    tavTcvChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: emptyLabels,
            datasets: [
                {
                    label: 'TAV (Obligated)',
                    data: tavData,
                    backgroundColor: primaryColor,
                    borderWidth: 0,
                    barPercentage: 0.85,
                    categoryPercentage: 0.8,
                    borderRadius: 4
                },
                {
                    label: 'TCV (Current Total)',
                    data: tcvData,
                    backgroundColor: secondaryColor,
                    borderWidth: 0,
                    barPercentage: 0.85,
                    categoryPercentage: 0.8,
                    borderRadius: 4
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 14
                        }
                    }
                },
                tooltip: {
                    enabled: false // Disable built-in tooltips
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        callback: function(value) {
                            if (value >= 1e6) {
                                return '$' + (value / 1e6).toFixed(1) + 'M';
                            } else if (value >= 1e3) {
                                return '$' + (value / 1e3).toFixed(0) + 'K';
                            }
                            return '$' + value;
                        },
                        color: textColor
                    }
                },
                y: {
                    ticks: {
                        display: false // Hide default labels
                    },
                    grid: {
                        display: false
                    }
                }
            },
            layout: {
                padding: {
                    left: 5,
                    right: 20
                }
            }
        }
    });
    
    // Create container for label overlays
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'chart-y-labels-container';
    labelsContainer.style.position = 'absolute';
    labelsContainer.style.top = '0';
    labelsContainer.style.left = '0';
    labelsContainer.style.width = '100%';
    labelsContainer.style.height = '100%';
    labelsContainer.style.pointerEvents = 'none';
    
    // Add the labels container
    container.style.position = 'relative';
    container.appendChild(labelsContainer);
    
    // Handle mouse events manually 
    newCanvas.onclick = function(event) {
        const rect = newCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const activePoints = tavTcvChartInstance.getElementsAtEventForMode(
            event,
            'nearest',
            { intersect: true },
            false
        );
        
        if (activePoints && activePoints.length > 0) {
            const idx = activePoints[0].index;
            if (idx >= 0 && chartData[idx] && chartData[idx].id) {
                window.open(`https://www.usaspending.gov/award/${chartData[idx].id}`, '_blank');
            }
        }
    };
    
    // Handle mousemove for tooltips
    newCanvas.onmousemove = function(event) {
        const rect = newCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const activePoints = tavTcvChartInstance.getElementsAtEventForMode(
            event,
            'nearest',
            { intersect: true },
            false
        );
        
        if (activePoints && activePoints.length > 0) {
            const idx = activePoints[0].index;
            const datasetIdx = activePoints[0].datasetIndex;
            
            if (idx >= 0 && idx < chartData.length && datasetIdx >= 0) {
                const contract = chartData[idx];
                const datasetLabel = tavTcvChartInstance.data.datasets[datasetIdx].label;
                const value = tavTcvChartInstance.data.datasets[datasetIdx].data[idx];
                
                tooltip.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${contract.primeName}</div>
                    <div style="font-size: 11px; opacity: 0.7; margin-bottom: 8px;">(ID: ${contract.id})</div>
                    <div>${datasetLabel}: ${formatCurrency(value)}</div>
                    <div>Click to view on USAspending.gov</div>
                `;
                
                tooltip.style.display = 'block';
                tooltip.style.left = (event.pageX + 10) + 'px';
                tooltip.style.top = (event.pageY - 28) + 'px';
                
                newCanvas.style.cursor = 'pointer';
            } else {
                tooltip.style.display = 'none';
                newCanvas.style.cursor = 'default';
            }
        } else {
            tooltip.style.display = 'none';
            newCanvas.style.cursor = 'default';
        }
    };
    
    // Handle mouseout
    newCanvas.onmouseout = function() {
        tooltip.style.display = 'none';
        newCanvas.style.cursor = 'default';
    };
    
    // After chart is rendered, add label overlays inside the bars
    setTimeout(() => {
        if (!tavTcvChartInstance) return;
        
        const yAxis = tavTcvChartInstance.scales.y;
        const xAxis = tavTcvChartInstance.scales.x;
        const chartArea = tavTcvChartInstance.chartArea;
        
        chartData.forEach((contract, index) => {
            if (!contract || !contract.id) return;
            
            const yCenter = yAxis.getPixelForValue(index);
            
            // Create the label element
            const label = document.createElement('div');
            label.textContent = contract.primeName;
            label.style.position = 'absolute';
            label.style.left = (chartArea.left + 10) + 'px';
            label.style.top = (yCenter - 10) + 'px';
            label.style.transform = 'translateY(-50%)';
            label.style.fontFamily = "'Inter', sans-serif";
            label.style.fontSize = '12px';
            label.style.fontWeight = 'bold';
            label.style.color = '#FFFFFF';
            label.style.textShadow = '0px 0px 2px rgba(0,0,0,0.5)';
            label.style.pointerEvents = 'none';
            label.style.whiteSpace = 'nowrap';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            
            // Determine maximum width based on the shortest bar
            const minValueForRow = Math.min(tavData[index], tcvData[index]);
            const xPosition = xAxis.getPixelForValue(minValueForRow);
            const maxWidth = xPosition - chartArea.left - 20;
            
            label.style.maxWidth = Math.max(maxWidth, 50) + 'px';
            
            labelsContainer.appendChild(label);
        });
    }, 100);
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
    if (!data || data.length === 0) return { nodes: [], links: [] };

    // Get unique sub-agencies
    const subAgencies = new Set();
    data.forEach(row => {
        const agency = row.awarding_sub_agency_name?.trim();
        if (agency && agency.toLowerCase() !== 'unknown sub-agency' && agency.toLowerCase() !== 'unknown') {
            subAgencies.add(agency);
        }
    });

    // Get top 10 recipients
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
        .map(([name]) => name);

    // Create nodes array
    const nodes = [];
    
    // Add agency nodes
    Array.from(subAgencies).forEach(agency => {
        nodes.push({ name: truncateText(agency, 30) });
    });
    
    // Add recipient nodes
    topRecipients.forEach(recipient => {
        nodes.push({ name: truncateText(recipient, 30) });
    });

    // Create links array
    const links = [];
    const agencyIndices = {};
    const recipientIndices = {};
    
    // Map agency names to indices
    Array.from(subAgencies).forEach((agency, i) => {
        agencyIndices[agency] = i;
    });
    
    // Map recipient names to indices (offset by number of agencies)
    topRecipients.forEach((recipient, i) => {
        recipientIndices[recipient] = i + subAgencies.size;
    });

    // Create links from agencies to recipients
    data.forEach(row => {
        const agency = row.awarding_sub_agency_name?.trim();
        const recipient = row.recipient_name;
        
        if (!agency || !recipient || !agencyIndices.hasOwnProperty(agency) || !recipientIndices.hasOwnProperty(recipient)) {
            return;
        }
        
        const value = parseSafeFloat(row.current_total_value_of_award);
        
        if (value <= 0) return;
        
        // Check if a link already exists between these nodes
        const existingLinkIndex = links.findIndex(link => 
            link.source === agencyIndices[agency] && link.target === recipientIndices[recipient]
        );
        
        if (existingLinkIndex >= 0) {
            // Add to existing link
            links[existingLinkIndex].value += value;
        } else {
            // Create new link
            links.push({
                source: agencyIndices[agency],
                target: recipientIndices[recipient],
                value: value
            });
        }
    });

    // Convert source/target from indices to objects (required by d3.sankey)
    const nodesObjects = nodes.map(n => ({...n}));
    const linksObjects = links.map(l => ({
        source: nodesObjects[l.source],
        target: nodesObjects[l.target],
        value: l.value
    }));

    console.log(`Processed data for Sankey chart: ${nodesObjects.length} nodes, ${linksObjects.length} links`);
    return { nodes: nodesObjects, links: linksObjects };
}
function displaySankeyChart(sankeyData) {
    const containerId = 'sankey-chart-container';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error("Sankey chart container not found.");
        return;
    }

    // Clear any previous content and create a new SVG
    container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'sankeyChart';
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    container.appendChild(svg);
    
    setLoading(containerId, false);
    
    if (!sankeyData || !sankeyData.nodes || !sankeyData.links || 
        sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
        displayNoData(containerId, 'No data available for Sankey diagram.');
        return;
    }
    
    try {
        // Check if we need to remove old tooltips
        const oldTooltip = document.getElementById('sankey-tooltip-direct');
        if (oldTooltip) {
            document.body.removeChild(oldTooltip);
        }
        
        // Create a simple tooltip div (standalone, not related to other CSS)
        const tooltip = document.createElement('div');
        tooltip.id = 'sankey-tooltip-direct';
        tooltip.style.position = 'absolute';
        tooltip.style.padding = '10px';
        tooltip.style.backgroundColor = '#FFFFFF';
        tooltip.style.color = '#36323A';
        tooltip.style.border = '1px solid #D7D4DC';
        tooltip.style.borderRadius = '4px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '9999';
        tooltip.style.display = 'none';
        tooltip.style.fontSize = '12px';
        tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        document.body.appendChild(tooltip);
        
        // Check theme for tooltip appearance
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDarkMode) {
            tooltip.style.backgroundColor = '#252229';
            tooltip.style.color = '#F4F2F6';
            tooltip.style.border = '1px solid #3A373E';
        }
        
        const width = container.clientWidth || 600;
        const height = container.clientHeight || 400;
        const margin = {top: 20, right: 20, bottom: 20, left: 20};
        
        // Choose colors based on theme
        const nodeColor = isDarkMode ? '#A29AAA' : '#9993A1';
        const linkColor = isDarkMode ? '#3A373E' : '#D7D4DC';
        const textColor = isDarkMode ? '#F4F2F6' : '#36323A';
        
        // Create D3 selection
        const svgSelection = d3.select(svg)
            .attr('width', width)
            .attr('height', height);
        
        // Reset data for Sankey
        const nodesData = sankeyData.nodes.map((node, i) => ({
            name: node.name,
            id: i
        }));
        
        const linksData = [];
        sankeyData.links.forEach(link => {
            // Handle both object and index references
            let sourceIndex = typeof link.source === 'object' ? 
                nodesData.findIndex(n => n.name === link.source.name) : 
                parseInt(link.source);
                
            let targetIndex = typeof link.target === 'object' ? 
                nodesData.findIndex(n => n.name === link.target.name) : 
                parseInt(link.target);
            
            // Only add valid links 
            if (sourceIndex !== targetIndex && 
                sourceIndex >= 0 && sourceIndex < nodesData.length &&
                targetIndex >= 0 && targetIndex < nodesData.length) {
                linksData.push({
                    source: sourceIndex,
                    target: targetIndex,
                    value: link.value || 1  // Default to 1 if no value
                });
            }
        });
        
        // Check if we have valid data
        if (nodesData.length === 0 || linksData.length === 0) {
            displayNoData(containerId, 'Insufficient data for Sankey diagram.');
            return;
        }
        
        // Create Sankey generator
        const sankey = d3.sankey()
            .nodeWidth(15)
            .nodePadding(10)
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);
        
        // Apply Sankey to data
        const graph = sankey({
            nodes: nodesData.map(d => Object.assign({}, d)),
            links: linksData.map(d => Object.assign({}, d))
        });
        
        // Draw links
        svgSelection.append('g')
            .selectAll('path')
            .data(graph.links)
            .enter()
            .append('path')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', linkColor)
            .attr('stroke-width', d => Math.max(1, d.width))
            .attr('stroke-opacity', 0.5)
            .attr('fill', 'none')
            .attr('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                // Show tooltip
                const html = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${d.source.name} → ${d.target.name}</div>
                    <div>Value: ${formatCurrency(d.value)}</div>
                `;
                tooltip.innerHTML = html;
                tooltip.style.display = 'block';
                tooltip.style.left = (event.pageX + 10) + 'px';
                tooltip.style.top = (event.pageY - 28) + 'px';
                
                // Highlight link
                d3.select(this).attr('stroke-opacity', 0.8);
            })
            .on('mousemove', function(event) {
                tooltip.style.left = (event.pageX + 10) + 'px';
                tooltip.style.top = (event.pageY - 28) + 'px';
            })
            .on('mouseout', function() {
                tooltip.style.display = 'none';
                d3.select(this).attr('stroke-opacity', 0.5);
            });
        
        // Draw nodes
        svgSelection.append('g')
            .selectAll('rect')
            .data(graph.nodes)
            .enter()
            .append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => Math.max(1, d.y1 - d.y0))
            .attr('width', d => Math.max(1, d.x1 - d.x0))
            .attr('fill', nodeColor)
            .attr('stroke', isDarkMode ? '#4A474E' : '#E9E6ED')
            .attr('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                // Show tooltip
                const html = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${d.name}</div>
                    <div>Total Value: ${formatCurrency(d.value)}</div>
                `;
                tooltip.innerHTML = html;
                tooltip.style.display = 'block';
                tooltip.style.left = (event.pageX + 10) + 'px';
                tooltip.style.top = (event.pageY - 28) + 'px';
                
                // Highlight node
                d3.select(this)
                    .attr('stroke', isDarkMode ? '#A29AAA' : '#9993A1')
                    .attr('stroke-width', 2);
            })
            .on('mousemove', function(event) {
                tooltip.style.left = (event.pageX + 10) + 'px';
                tooltip.style.top = (event.pageY - 28) + 'px';
            })
            .on('mouseout', function() {
                tooltip.style.display = 'none';
                d3.select(this)
                    .attr('stroke', isDarkMode ? '#4A474E' : '#E9E6ED')
                    .attr('stroke-width', 1);
            });
        
        // Add node labels
        svgSelection.append('g')
            .selectAll('text')
            .data(graph.nodes)
            .enter()
            .append('text')
            .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr('y', d => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
            .text(d => d.name)
            .attr('font-size', '10px')
            .attr('fill', textColor);
        
    } catch (error) {
        console.error("Error rendering Sankey chart:", error);
        displayError(containerId, `Error rendering Sankey chart: ${error.message}`);
    }
}
// --- Choropleth Map Functions ---
function processMapData(data) {
    console.log("Processing data for performance map...");
    if (!data || data.length === 0) return {};
    
    // Create a map to store state-level aggregates
    const stateData = {};
    
    // Debug counter for rows with FIPS codes
    let rowsWithFips = 0;
    
    data.forEach(row => {
        // Use the correct field for state FIPS codes
        let fipsCode = null;
        
        // First try the exact field name provided
        if (row.prime_award_transaction_place_of_performance_state_fips_code) {
            fipsCode = row.prime_award_transaction_place_of_performance_state_fips_code.trim();
            rowsWithFips++;
        } 
        // Then try fallback options
        else if (row.primary_place_of_performance_state_code) {
            fipsCode = row.primary_place_of_performance_state_code.trim();
        } else if (row.pop_state_code) {
            fipsCode = row.pop_state_code.trim();
        } else if (row.place_of_performance_state_code) {
            fipsCode = row.place_of_performance_state_code.trim();
        }
        
        // If no FIPS code found, skip this row
        if (!fipsCode) return;
        
        // Ensure FIPS code is a 2-digit string
        if (fipsCode.length > 2) {
            // If longer than 2 digits, assume it's a county FIPS and take the first 2 digits
            fipsCode = fipsCode.substring(0, 2);
        } else if (fipsCode.length === 1) {
            // If it's a single digit, add leading zero
            fipsCode = '0' + fipsCode;
        }
        
        const value = parseSafeFloat(row.current_total_value_of_award) || 0;
        
        if (!stateData[fipsCode]) {
            stateData[fipsCode] = {
                value: 0,
                count: 0
            };
        }
        
        stateData[fipsCode].value += value;
        stateData[fipsCode].count += 1;
    });
    
    console.log(`Processed data for map: ${Object.keys(stateData).length} states with FIPS codes (found ${rowsWithFips} rows with FIPS codes)`);
    return stateData;
}
function displayChoroplethMap(mapData) {
    const containerId = 'map-container';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error("Map container not found.");
        return;
    }

    // Clean up any existing tooltips
    cleanupTooltips();
    
    // Clear any previous content and create a new div
    container.innerHTML = '';
    const mapDiv = document.createElement('div');
    mapDiv.id = 'choroplethMap';
    mapDiv.style.width = '100%';
    mapDiv.style.height = '100%';
    container.appendChild(mapDiv);
    
    setLoading(containerId, false); // Turn off loading spinner

    if (!mapData || Object.keys(mapData).length === 0) {
        displayNoData(containerId, 'No geographic data available for mapping.');
        return;
    }

    try {
        // Set up map dimensions based on the container div
        const width = container.clientWidth;
        const height = container.clientHeight || 400; // Default height if not set

        // Check if dimensions are valid
        if (width <= 0 || height <= 0) {
             console.warn(`Map container has invalid dimensions: ${width}x${height}. Map rendering skipped.`);
             displayError(containerId, 'Map container has zero size. Cannot render map.');
             return;
        }

        // Check if we're in dark mode
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkMode ? '#F4F2F6' : '#36323A';

        // Create SVG element inside the map div
        const svg = d3.select(mapDiv)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`) // Add viewBox for better scaling
            .style('max-width', '100%') // Ensure SVG scales down if needed
            .style('height', 'auto');

        // Define color scale for the map
        const stateValues = Object.values(mapData).map(d => d.value);
        const maxValue = d3.max(stateValues) || 0;

        // Create color scale for map - use different colors for dark/light mode
        const colorScale = d3.scaleSequential()
            .domain([0, maxValue === 0 ? 1 : maxValue]) // Ensure domain is valid if max is 0
            .interpolator(isDarkMode ?
                d3.interpolate('#3A373E', '#A29AAA') : // Dark mode: darker to lighter purple
                d3.interpolate('#E9E6ED', '#9993A1')); // Light mode: light to medium purple

        // Remove existing tooltips first
        d3.select("body").selectAll(".map-tooltip").remove();
        
        // Create tooltip - attach to body for better positioning
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "map-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("opacity", 0)
            .style("background-color", isDarkMode ? "#252229" : "#FFFFFF")
            .style("color", isDarkMode ? "#F4F2F6" : "#36323A")
            .style("padding", "10px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("border", "1px solid " + (isDarkMode ? "#3A373E" : "#D7D4DC"))
            .style("z-index", "9999");

        // State name mapping
        const fipsToStateName = {
            "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
            "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
            "11": "District of Columbia", "12": "Florida", "13": "Georgia", "15": "Hawaii",
            "16": "Idaho", "17": "Illinois", "18": "Indiana", "19": "Iowa", "20": "Kansas",
            "21": "Kentucky", "22": "Louisiana", "23": "Maine", "24": "Maryland",
            "25": "Massachusetts", "26": "Michigan", "27": "Minnesota", "28": "Mississippi",
            "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
            "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York",
            "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma",
            "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina",
            "46": "South Dakota", "47": "Tennessee", "48": "Texas", "49": "Utah",
            "50": "Vermont", "51": "Virginia", "53": "Washington", "54": "West Virginia",
            "55": "Wisconsin", "56": "Wyoming", "72": "Puerto Rico"
        };

        // Load US state boundaries GeoJSON
        d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
            .then(us => {
                if (!us || !us.objects || !us.objects.states) {
                    throw new Error("Invalid GeoJSON data");
                }

                // Convert TopoJSON to GeoJSON features
                const states = topojson.feature(us, us.objects.states); // Keep the FeatureCollection

                // --- Projection Fitting Logic ---
                const projection = d3.geoAlbersUsa(); // Create projection

                // Fit the projection to the container size using the GeoJSON data
                projection.fitSize([width, height], states);

                // Create the path generator using the FITTED projection
                const path = d3.geoPath().projection(projection);
                // --- End Projection Fitting ---

                // Draw state boundaries
                svg.append('g') // Group map paths
                   .selectAll('path')
                   .data(states.features) // Use the features array
                   .enter()
                   .append('path')
                   .attr('d', path)
                   .attr('fill', d => {
                       // Use the state FIPS code to lookup data
                       const fipsCode = d.id.toString().padStart(2, '0');
                       const stateData = mapData[fipsCode];
                       return stateData ? colorScale(stateData.value) : (isDarkMode ? '#2D2A31' : '#ccc'); // Default color
                   })
                   .attr('stroke', isDarkMode ? '#3A373E' : '#FFFFFF') // Border color between states
                   .attr('stroke-width', 0.5)
                   .style('cursor', 'pointer')
                   .on('mouseover', function(event, d) {
                       // Show tooltip with transition
                       tooltip
                            .style("visibility", "visible")
                            .style("opacity", 1); 
                            
                       tooltip.html(() => {
                           const fipsCode = d.id.toString().padStart(2, '0');
                           const stateData = mapData[fipsCode];
                           const stateName = fipsToStateName[fipsCode] || "Unknown";
                           if (stateData) {
                               return `
                                   <strong>${stateName}</strong>
                                   <div>Total Value: ${formatCurrency(stateData.value)}</div>
                                   <div>Contracts: ${stateData.count.toLocaleString()}</div>
                               `;
                           } else {
                               return `<strong>${stateName}</strong><br>No data`;
                           }
                       })
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");

                       // Highlight the state
                       d3.select(this)
                           .attr("stroke", isDarkMode ? "#A29AAA" : "#9993A1")
                           .attr("stroke-width", 1.5)
                           .raise(); // Bring hovered path to front
                   })
                   .on('mousemove', function(event) {
                       // Update tooltip position as mouse moves
                       tooltip
                          .style("left", (event.pageX + 10) + "px")
                          .style("top", (event.pageY - 28) + "px");
                   })
                   .on('mouseout', function() {
                       // Hide tooltip with transition
                       tooltip
                          .style("visibility", "hidden")
                          .style("opacity", 0);
                              
                       // Remove highlight
                       d3.select(this)
                           .attr("stroke", isDarkMode ? '#3A373E' : '#FFFFFF')
                           .attr("stroke-width", 0.5);
                   });

                // --- Legend ---
                const legendWidth = Math.min(width * 0.4, 200); // Adjust width relative to map size
                const legendHeight = 10; // Slimmer legend bar
                const legendX = width - legendWidth - 20; // Position bottom right
                const legendY = height - 35; // Position bottom right

                const legendGroup = svg.append("g")
                                       .attr("transform", `translate(${legendX}, ${legendY})`);

                // Create discrete color bins for legend
                const numBins = 5;
                // Ensure bins work even if maxValue is 0
                 const binMaxValue = maxValue === 0 ? 1 : maxValue;
                 const bins = Array.from({length: numBins}, (_, i) => binMaxValue * i / (numBins -1));
                 const binWidth = legendWidth / numBins;


                // Add legend title
                legendGroup.append('text')
                    .attr('x', legendWidth / 2)
                    .attr('y', -6) // Position above the legend rect
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .attr('fill', textColor)
                    .text('Contract Value');

                // Create discrete color blocks
                legendGroup.selectAll('rect')
                    .data(bins)
                    .enter()
                    .append('rect')
                    .attr('x', (d, i) => i * binWidth)
                    .attr('y', 0)
                    .attr('width', binWidth)
                    .attr('height', legendHeight)
                    .attr('fill', d => colorScale(d))
                    .attr('stroke', isDarkMode ? '#3A373E' : '#D7D4DC')
                    .attr('stroke-width', 0.5);

                // Add min/max labels
                legendGroup.append('text')
                    .attr('x', 0)
                    .attr('y', legendHeight + 10) // Below legend rect
                    .attr('text-anchor', 'start')
                    .attr('font-size', '10px')
                    .attr('fill', textColor)
                    .text('Low');

                legendGroup.append('text')
                    .attr('x', legendWidth)
                    .attr('y', legendHeight + 10) // Below legend rect
                    .attr('text-anchor', 'end')
                    .attr('font-size', '10px')
                    .attr('fill', textColor)
                    .text('High');

            })
            .catch(error => {
                console.error("Error loading or processing GeoJSON for map:", error);
                displayError(containerId, `Error rendering map: ${error.message}`);
                // Clean up tooltip if it exists
                d3.select("body").selectAll(".map-tooltip").remove();
            });
    } catch (error) {
        console.error("Error creating choropleth map:", error);
        displayError(containerId, "Failed to render map: " + error.message);
        // Clean up tooltip if it exists
        d3.select("body").selectAll(".map-tooltip").remove();
    }
}
function applyFiltersAndUpdateVisuals() {
    // --- Get Filter & Search Values ---
    const subAgencyFilter = document.getElementById('sub-agency-filter')?.value || '';
    const naicsFilter = document.getElementById('naics-filter')?.value || '';
    const searchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || '';

    console.log("Applying filters/search:", { subAgencyFilter, naicsFilter, searchTerm });

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


    // Filter the data *after* search has been applied
    const filteredData = dataAfterSearch.filter(row => {
        // Check Sub-Agency Filter
        const subAgency = row.awarding_sub_agency_name?.trim();
        if (subAgencyFilter && subAgency !== subAgencyFilter) return false;

        // Check NAICS Filter
        const naics = row.naics_code?.toString().trim();
        if (naicsFilter && naics !== naicsFilter) return false;

        // If all checks pass, include the row
        return true;
    });

    console.log(`Filtered data count (after search & filters): ${filteredData.length} records`);

    // Clean up tooltips before redrawing
    cleanupTooltips();

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
    
    calculateAverageARR(filteredData);
    
    // Return the final filtered data
    return filteredData;
}

function calculateAverageARR(dataForARR) {
    const resultDiv = document.getElementById('arr-result');
    const loadingDiv = document.getElementById('arr-loading');
    const errorDiv = document.getElementById('arr-error');
    const noDataDiv = document.getElementById('arr-no-data');

    // Reset UI elements
    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    noDataDiv.style.display = 'none';

    // If no data was passed, get the currently filtered data
    if (!dataForARR) {
        dataForARR = applyFiltersAndUpdateVisuals();
    }

    try {
        console.log(`Calculating ARR based on ${dataForARR.length} filtered contracts.`);

        if (dataForARR.length === 0) {
            loadingDiv.style.display = 'none';
            noDataDiv.style.display = 'block';
            resultDiv.textContent = formatCurrency(0) + " / yr";
            resultDiv.style.display = 'block';
            return;
        }
            let totalAnnualizedValue = 0;
            let validContractsCount = 0;
            
            // Group contracts by duration buckets for more accurate ARR
            const shortTermContracts = []; // Less than 90 days
            const mediumTermContracts = []; // 90 days to 270 days
            const longTermContracts = []; // More than 270 days
            
            dataForARR.forEach((row) => {
                const value = parseSafeFloat(row.current_total_value_of_award) || parseSafeFloat(row.base_and_exercised_options_value) || 0;
                const durationDays = calculateDurationDays(row.period_of_performance_start_date, row.period_of_performance_current_end_date);

                if (value > 0 && durationDays > 0) {
                    // Categorize by duration
                    if (durationDays < 90) {
                        shortTermContracts.push({ value, durationDays });
                    } else if (durationDays < 270) {
                        mediumTermContracts.push({ value, durationDays });
                    } else {
                        longTermContracts.push({ value, durationDays });
                    }
                    validContractsCount++;
                }
            });
            
            // Calculate ARR with appropriate weighting based on contract duration
            let weightedARR = 0;
            
            // Short-term contracts are weighted less in the ARR calculation (to avoid over-projection)
            if (shortTermContracts.length > 0) {
                const shortTermARR = shortTermContracts.reduce((sum, contract) => {
                    return sum + (contract.value / contract.durationDays) * 365.25 * 0.5; // 50% weight
                }, 0) / shortTermContracts.length;
                
                weightedARR += shortTermARR * (shortTermContracts.length / validContractsCount);
            }
            
            // Medium-term contracts are weighted normally
            if (mediumTermContracts.length > 0) {
                const mediumTermARR = mediumTermContracts.reduce((sum, contract) => {
                    return sum + (contract.value / contract.durationDays) * 365.25 * 0.8; // 80% weight
                }, 0) / mediumTermContracts.length;
                
                weightedARR += mediumTermARR * (mediumTermContracts.length / validContractsCount);
            }
            
            // Long-term contracts are weighted most heavily (most reliable ARR indicator)
            if (longTermContracts.length > 0) {
                const longTermARR = longTermContracts.reduce((sum, contract) => {
                    return sum + (contract.value / contract.durationDays) * 365.25; // 100% weight
                }, 0) / longTermContracts.length;
                
                weightedARR += longTermARR * (longTermContracts.length / validContractsCount);
            }
            
            // If no contracts in any bucket, fall back to simple average
            if (weightedARR === 0 && validContractsCount > 0) {
                dataForARR.forEach((row) => {
                    const value = parseSafeFloat(row.current_total_value_of_award) || parseSafeFloat(row.base_and_exercised_options_value) || 0;
                    const durationDays = calculateDurationDays(row.period_of_performance_start_date, row.period_of_performance_current_end_date);
                    
                    if (value > 0 && durationDays > 0) {
                        const durationYears = durationDays / 365.25;
                        const annualizedValue = value / durationYears;
                        totalAnnualizedValue += annualizedValue;
                    }
                });
                
                weightedARR = totalAnnualizedValue / validContractsCount;
            }

            if (validContractsCount > 0) {
                resultDiv.textContent = formatCurrency(weightedARR) + " / yr";
                resultDiv.style.display = 'block';
                console.log(`Weighted Average ARR: ${weightedARR.toFixed(0)} (from ${validContractsCount} valid contracts)`);
                noDataDiv.style.display = 'none';
            } else {
                noDataDiv.textContent = 'No contracts suitable for ARR calculation found in the filtered set.';
                noDataDiv.style.display = 'block';
                resultDiv.textContent = formatCurrency(0) + " / yr";
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
        // Extract just the agency name by removing " (Primes)"
        const agencyName = dataset.name.replace(' (Primes)', ' Spending');
        
        // Set the title to just the agency name
        dashboardTitle.textContent = agencyName;
        
        // Keep the subtitle with the full dataset name
        dashboardSubtitle.textContent = `Analyzing contract data from USAspending.gov`;
    } else {
        // Reset to default titles
        dashboardTitle.textContent = ' Spending Dashboard';
        dashboardSubtitle.textContent = 'Select an agency dataset to begin';
    }
}

function loadDataset(dataset) {
    // Clean up tooltips before loading new dataset
    cleanupTooltips();
    
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
    document.getElementById('arr-result').textContent = '$0 / yr';
    document.getElementById('arr-loading').style.display = 'none';
    document.getElementById('arr-error').style.display = 'none';
    document.getElementById('arr-no-data').style.display = 'none';
    
    // Reset filter dropdowns and date inputs
    document.getElementById('sub-agency-filter').innerHTML = '<option value="">All Sub-Agencies</option>';
    document.getElementById('sub-agency-filter').value = '';
    document.getElementById('naics-filter').innerHTML = '<option value="">All NAICS</option>';
    document.getElementById('naics-filter').value = '';

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

    if (subAgencyFilter) subAgencyFilter.addEventListener('change', applyFiltersAndUpdateVisuals);
    if (naicsFilter) naicsFilter.addEventListener('change', applyFiltersAndUpdateVisuals);
}

// Add this to the theme toggle event listener in initializeThemeToggle function:
function initializeThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    
    // Check for saved theme preference or use device preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply the theme on page load
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    }
    
    // Toggle theme when button is clicked
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            
            if (currentTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                moonIcon.style.display = 'block';
                sunIcon.style.display = 'none';
                
                // Update tooltip styles for light theme
                updateTooltipThemes(false);
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'block';
                
                // Update tooltip styles for dark theme
                updateTooltipThemes(true);
            }
            
            // Force immediate update of all charts with theme-aware colors
            setTimeout(updateChartsForTheme, 50);
        });
    }
}

// Add this new function to update tooltip themes:
function updateTooltipThemes(isDarkMode) {
    // Update TAV/TCV tooltip
    const tavTooltip = document.getElementById('tav-tcv-tooltip-new');
    if (tavTooltip) {
        if (isDarkMode) {
            tavTooltip.style.backgroundColor = '#252229';
            tavTooltip.style.color = '#F4F2F6';
            tavTooltip.style.border = '1px solid #3A373E';
        } else {
            tavTooltip.style.backgroundColor = '#FFFFFF';
            tavTooltip.style.color = '#36323A';
            tavTooltip.style.border = '1px solid #D7D4DC';
        }
    }
    
    // Update Sankey tooltip
    const sankeyTooltip = document.querySelector('.sankey-tooltip');
    if (sankeyTooltip) {
        if (isDarkMode) {
            sankeyTooltip.style.backgroundColor = '#252229';
            sankeyTooltip.style.color = '#F4F2F6';
            sankeyTooltip.style.border = '1px solid #3A373E';
        } else {
            sankeyTooltip.style.backgroundColor = '#FFFFFF';
            sankeyTooltip.style.color = '#36323A';
            sankeyTooltip.style.border = '1px solid #D7D4DC';
        }
    }
}

// Update chart colors when theme changes
function updateChartsForTheme() {
    // First cleanup all tooltips
    cleanupTooltips();
    
    // Update TAV/TCV chart if it exists
    if (tavTcvChartInstance) {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const primaryColor = isDarkMode ? '#A29AAA' : '#9993A1';
        const secondaryColor = isDarkMode ? '#8C85A0' : '#797484';
        
        tavTcvChartInstance.data.datasets[0].backgroundColor = primaryColor;
        tavTcvChartInstance.data.datasets[1].backgroundColor = secondaryColor;
        
        // Update text colors
        tavTcvChartInstance.options.plugins.legend.labels.color = isDarkMode ? '#F4F2F6' : '#36323A';
        tavTcvChartInstance.options.scales.x.ticks.color = isDarkMode ? '#F4F2F6' : '#36323A';
        
        tavTcvChartInstance.update();
    }
    
    // Redraw Sankey chart
    if (document.getElementById('sankeyChart') && 
        document.getElementById('sankey-chart-container')) {
        // Only redraw if we have data
        if (rawData && rawData.length > 0) {
            const sankeyData = processSankeyData(rawData);
            displaySankeyChart(sankeyData);
        }
    }
    
    // Redraw Choropleth map
    if (document.getElementById('choroplethMap') && 
        document.getElementById('map-container')) {
        // Only redraw if we have data
        if (rawData && rawData.length > 0) {
            const mapData = processMapData(rawData);
            displayChoroplethMap(mapData);
        }
    }
}

function handleWindowResize() {
    // Clean up tooltips before resizing
    cleanupTooltips();
    
    // Resize TAV/TCV chart if it exists
    if (tavTcvChartInstance) {
        tavTcvChartInstance.resize();
        
        // Re-render the custom labels for the TAV/TCV chart
        const container = document.getElementById('tav-tcv-chart-container');
        if (container) {
            // Find or recreate the labels container
            let labelsContainer = container.querySelector('.chart-y-labels-container');
            
            if (labelsContainer) {
                // Clear existing labels
                labelsContainer.innerHTML = '';
                
                // Access the stored chart data
                const chartData = window.chartData;
                
                if (chartData && chartData.length > 0) {
                    // Re-add labels (similar code to what's in displayTavTcvChart)
                    setTimeout(() => {
                        const yAxis = tavTcvChartInstance.scales.y;
                        const xAxis = tavTcvChartInstance.scales.x;
                        const chartArea = tavTcvChartInstance.chartArea;
                        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                        
                        chartData.forEach((contract, index) => {
                            if (!contract.id) return;
                            
                            const yCenter = yAxis.getPixelForValue(index);
                            
                            // Create the label element
                            const label = document.createElement('div');
                            label.textContent = contract.primeName;
                            label.style.position = 'absolute';
                            label.style.left = (chartArea.left + 10) + 'px';
                            label.style.top = (yCenter - 10) + 'px';
                            label.style.transform = 'translateY(-50%)';
                            label.style.fontFamily = "'Inter', sans-serif";
                            label.style.fontSize = '12px';
                            label.style.fontWeight = 'bold';
                            label.style.color = '#FFFFFF'; // White text for visibility
                            label.style.textShadow = '0px 0px 2px rgba(0,0,0,0.5)';
                            label.style.pointerEvents = 'none';
                            label.style.whiteSpace = 'nowrap';
                            label.style.overflow = 'hidden';
                            label.style.textOverflow = 'ellipsis';
                            
                            // Calculate max width
                            const tavData = chartData.map(d => d.tav);
                            const tcvData = chartData.map(d => d.tcv);
                            const minValueForRow = Math.min(tavData[index], tcvData[index]);
                            const xPosition = xAxis.getPixelForValue(minValueForRow);
                            const maxWidth = xPosition - chartArea.left - 20;
                            
                            label.style.maxWidth = Math.max(maxWidth, 50) + 'px';
                            
                            labelsContainer.appendChild(label);
                        });
                    }, 100);
                }
            }
        }
    }

    // Redraw Sankey chart
    if (document.getElementById('sankeyChart') && 
        document.getElementById('sankey-chart-container')) {
        // Only redraw if we have data
        if (rawData && rawData.length > 0) {
            const sankeyData = processSankeyData(rawData);
            displaySankeyChart(sankeyData);
        }
    }

    // Redraw Choropleth map
    if (document.getElementById('choroplethMap') && 
        document.getElementById('map-container')) {
        // Only redraw if we have data
        if (rawData && rawData.length > 0) {
            const mapData = processMapData(rawData);
            displayChoroplethMap(mapData);
        }
    }
}

// Window resize event handler with debounce
window.addEventListener('resize', function() {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(function() {
        console.log("Window resized, redrawing charts...");
        handleWindowResize();
    }, 250);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    
    // Initialize the dataset selector dropdown
    initializeDatasetSelector();
    
    // Initialize theme toggle
    initializeThemeToggle();

    // Initial dashboard setup
    updateDashboardTitle(null);
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
