// Constants
const S3_BASE_URL = 'https://subhoodata.s3.us-east-1.amazonaws.com/data/';
const DATASETS = [
    { id: 'army_primes', name: 'Army (Primes)', type: 'primes' },
    { id: 'dhs_primes', name: 'DHS (Primes)', type: 'primes' },
    { id: 'doj_primes', name: 'DOJ (Primes)', type: 'primes' },
    { id: 'epa_primes', name: 'EPA (Primes)', type: 'primes' },
    { id: 'navy_primes', name: 'Navy (Primes)', type: 'primes' },
    { id: 'socom_primes', name: 'SOCOM (Primes)', type: 'primes' },
    { id: 'uscc_primes', name: 'USCC (Primes)', type: 'primes' },
    { id: 'usmc_primes', name: 'USMC (Primes)', type: 'primes' },
    { id: 'va_primes', name: 'VA (Primes)', type: 'primes' },
    { id: 'army', name: 'Army (Subs)', type: 'subs' },
    { id: 'navy', name: 'Navy (Subs)', type: 'subs' },
    { id: 'usmc', name: 'Marine Corps (Subs)', type: 'subs' },
    { id: 'airforce', name: 'Air Force (Subs)', type: 'subs' },
    { id: 'dla', name: 'DLA (Subs)', type: 'subs' },
    { id: 'disa', name: 'DISA (Subs)', type: 'subs' },
    { id: 'mda', name: 'MDA (Subs)', type: 'subs' },
    { id: 'socom', name: 'USSOCOM (Subs)', type: 'subs' },
    { id: 'uscc', name: 'Cyber Command (Subs)', type: 'subs' },
    { id: 'hhs', name: 'HHS (Subs)', type: 'subs' },
    { id: 'va', name: 'VA (Subs)', type: 'subs' },
    { id: 'dhs', name: 'DHS (Subs)', type: 'subs' },
    { id: 'treasury', name: 'Treasury (Subs)', type: 'subs' },
    { id: 'epa', name: 'EPA (Subs)', type: 'subs' },
    { id: 'faa', name: 'FAA (Subs)', type: 'subs' },
    { id: 'doj', name: 'Dept of Justice (Subs)', type: 'subs' },
    { id: 'doe', name: 'Dept of Energy (Subs)', type: 'subs' }
];

// Global variables
let rawData = {
    primes: [],
    subs: []
}; // Structured to store both prime and sub contract data
let unifiedModel = null; // The unified data model linking everything
let tavTcvChartInstance = null; // Store chart instance
let isLoading = false;
let selectedAgencies = []; // List of selected agency IDs
let chartData = []; // Store chart data globally

// Field mapping to normalize field names between data sources
const fieldMap = {
    // Agency fields
    agencyName: {
        primes: 'awarding_agency_name',
        subs: 'prime_award_awarding_agency_name'
    },
    subAgencyName: {
        primes: 'awarding_sub_agency_name',
        subs: 'prime_award_awarding_sub_agency_name'
    },
    officeName: {
        primes: 'awarding_office_name',
        subs: 'prime_award_awarding_office_name'
    },
    // Contractor fields
    primeName: {
        primes: 'recipient_name',
        subs: 'prime_awardee_name'
    },
    subName: {
        primes: null, // Prime data doesn't have sub info
        subs: 'subawardee_name'
    },
    // Contract value fields
    contractValue: {
        primes: 'current_total_value_of_award',
        subs: 'subaward_amount'
    },
    // NAICS fields
    naicsCode: {
        primes: 'naics_code',
        subs: 'prime_award_naics_code'
    },
    naicsDesc: {
        primes: 'naics_description',
        subs: 'prime_award_naics_description'
    },
    // Date fields
    startDate: {
        primes: 'period_of_performance_start_date',
        subs: 'prime_award_period_of_performance_start_date'
    },
    endDate: {
        primes: 'period_of_performance_current_end_date',
        subs: 'prime_award_period_of_performance_current_end_date'
    },
    // Location fields
    popStateCode: {
        primes: 'prime_award_transaction_place_of_performance_state_fips_code',
        subs: 'subaward_primary_place_of_performance_state_code'
    },
    // Unique ID fields
    contractId: {
        primes: 'contract_award_unique_key',
        subs: 'prime_award_unique_key'
    },
    subcontractId: {
        primes: null,
        subs: 'subaward_unique_key'
    },
    // Description fields
    description: {
        primes: 'transaction_description',
        subs: 'subaward_description'
    },
    // Additional fields
    obligatedValue: {
        primes: 'total_dollars_obligated',
        subs: null
    },
    potentialValue: {
        primes: 'potential_total_value_of_award',
        subs: null
    }
};

// --- Utility Functions ---
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(Number(value))) return '$ -';
    return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatConciseCurrency(value) {
    if (value === null || value === undefined || isNaN(Number(value))) return '$ -';
    
    // Format differently based on the size of the number
    if (value >= 1000000) {
        // Format as millions with one decimal place
        return `~$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
        // Format as thousands with one decimal place
        return `~$${(value / 1000).toFixed(1)}K`;
    } else {
        // Format small values normally without decimals
        return `~$${value.toFixed(0)}`;
    }
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
    const tooltipIds = ['tav-tcv-tooltip', 'sankey-tooltip', 'map-tooltip'];
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
function updateStatusBanner(message, type = 'info') {
    const banner = document.getElementById('status-banner');
    const statusMessage = document.getElementById('status-message');
    
    if (!banner || !statusMessage) {
        console.warn("Status banner elements not found");
        return;
    }

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
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.disabled = isLoading;
    }
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
    const agencySelect = document.getElementById('dataset-select');
    if (!agencySelect) {
        console.error("Dataset select element not found!");
        return;
    }

    // Group datasets by agency with combined options
    const agencyGroups = {};
    DATASETS.forEach(dataset => {
        const agencyName = dataset.name.split(' (')[0]; // Extract agency name without the type
        
        if (!agencyGroups[agencyName]) {
            agencyGroups[agencyName] = {
                name: agencyName,
                datasets: []
            };
        }
        
        agencyGroups[agencyName].datasets.push(dataset);
    });

    // Clear any existing options
    agencySelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Choose an agency...";
    agencySelect.appendChild(defaultOption);
    
    // Add agency options
    Object.values(agencyGroups).sort((a, b) => a.name.localeCompare(b.name)).forEach(group => {
        // Create option group for each agency
        const optGroup = document.createElement('optgroup');
        optGroup.label = group.name;
        
        // Add "Combined Data" option if both types exist
        const hasPrimes = group.datasets.some(d => d.type === 'primes');
        const hasSubs = group.datasets.some(d => d.type === 'subs');
        
        if (hasPrimes && hasSubs) {
            const combinedOption = document.createElement('option');
            const primeDataset = group.datasets.find(d => d.type === 'primes');
            const subDataset = group.datasets.find(d => d.type === 'subs');
            
            // Create special value that indicates combined datasets
            combinedOption.value = `combined:${primeDataset.id},${subDataset.id}`;
            combinedOption.textContent = `${group.name} (Combined)`;
            combinedOption.dataset.isPrime = "true";
            combinedOption.dataset.isSub = "true";
            optGroup.appendChild(combinedOption);
        }
        
        // Add individual dataset options
        group.datasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset.id;
            option.textContent = dataset.name;
            option.dataset.isPrime = dataset.type === 'primes' ? "true" : "false";
            option.dataset.isSub = dataset.type === 'subs' ? "true" : "false";
            optGroup.appendChild(option);
        });
        
        agencySelect.appendChild(optGroup);
    });

    // Add event listener to load selected dataset
    agencySelect.addEventListener('change', function() {
        const selectedValue = this.value;
        
        if (!selectedValue) {
            // Handle empty selection
            updateDashboardTitle(null);
            updateStatusBanner('Please select a dataset to load', 'info');
            resetUIForNoDataset();
            return;
        }
        
        if (selectedValue.startsWith('combined:')) {
            // Handle combined dataset selection
            const datasetIds = selectedValue.split(':')[1].split(',');
            loadCombinedDatasets(datasetIds);
        } else {
            // Handle single dataset selection
            const selectedDataset = DATASETS.find(d => d.id === selectedValue);
            if (selectedDataset) {
                loadSingleDataset(selectedDataset);
            } else {
                console.error(`Selected dataset ID ${selectedValue} not found.`);
                updateStatusBanner(`Invalid dataset selected.`, 'error');
                resetUIForNoDataset();
            }
        }
    });
}

function resetUIForNoDataset() {
    // Clean up tooltips
    cleanupTooltips();
    
    rawData = {
        primes: [],
        subs: []
    };
    unifiedModel = null;
    selectedAgencies = [];
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
    document.getElementById('arr-no-data').style.display = 'block'; 

    // Reset filters
    const subAgencyFilter = document.getElementById('sub-agency-filter');
    const naicsFilter = document.getElementById('naics-filter');
    if (subAgencyFilter) subAgencyFilter.innerHTML = '<option value="">All Sub-Agencies</option>';
    if (naicsFilter) naicsFilter.innerHTML = '<option value="">All NAICS</option>';
    
    // Reset search
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
}

// --- Enhanced Data Loading Functions ---
function loadSingleDataset(dataset) {
    if (!dataset || !dataset.id || isLoading) {
        console.warn("Load dataset cancelled. Already loading or invalid dataset provided.");
        if (!dataset) updateStatusBanner('Invalid dataset specified.', 'error');
        return;
    }

    console.log(`Initiating load for dataset: ${dataset.name} (ID: ${dataset.id})`);
    selectedAgencies = [dataset]; 
    isLoading = true;

    // Update UI to reflect loading state
    updateDashboardTitle([dataset]);
    updateStatusBanner(`Loading ${dataset.name} data...`, 'info');
    document.getElementById('refresh-button').disabled = true;

    // Set loading states for containers
    setLoading('contract-leaders-table-container', true, `Loading ${dataset.name} leader data...`);
    setLoading('tav-tcv-chart-container', true, `Loading ${dataset.name} TAV/TCV data...`);
    setLoading('expiring-contracts-table-container', true, `Loading ${dataset.name} expiring contracts...`);
    setLoading('sankey-chart-container', true, `Loading ${dataset.name} award flow...`);
    setLoading('map-container', true, `Loading ${dataset.name} performance data...`);

    // Reset data based on dataset type
    if (dataset.type === 'primes') {
        rawData.primes = [];
        // Keep subs data if loading just primes
    } else {
        rawData.subs = [];
        // Keep primes data if loading just subs
    }
    
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
    
    // Reset filter dropdowns and search input
    document.getElementById('sub-agency-filter').innerHTML = '<option value="">All Sub-Agencies</option>';
    document.getElementById('sub-agency-filter').value = '';
    document.getElementById('naics-filter').innerHTML = '<option value="">All NAICS</option>';
    document.getElementById('naics-filter').value = '';
    document.getElementById('search-input').value = '';

    // Fetch the data from S3
    fetchDataFromS3(dataset);
}

function loadCombinedDatasets(datasetIds) {
    if (!datasetIds || datasetIds.length === 0 || isLoading) {
        console.warn("Load combined datasets cancelled. Already loading or invalid dataset IDs provided.");
        updateStatusBanner('Invalid datasets specified.', 'error');
        return;
    }

    const datasets = datasetIds.map(id => DATASETS.find(d => d.id === id)).filter(Boolean);
    
    if (datasets.length === 0) {
        console.error("No valid datasets found in the combined selection.");
        updateStatusBanner('Invalid datasets specified.', 'error');
        return;
    }

    console.log(`Initiating combined load for datasets: ${datasets.map(d => d.name).join(', ')}`);
    selectedAgencies = datasets;
    isLoading = true;

    // Update UI to reflect loading state
    updateDashboardTitle(datasets);
    updateStatusBanner(`Loading combined datasets...`, 'info');
    document.getElementById('refresh-button').disabled = true;

    // Set loading states for containers
    setLoading('contract-leaders-table-container', true, 'Loading combined leader data...');
    setLoading('tav-tcv-chart-container', true, 'Loading combined TAV/TCV data...');
    setLoading('expiring-contracts-table-container', true, 'Loading combined expiring contracts...');
    setLoading('sankey-chart-container', true, 'Loading combined award flow...');
    setLoading('map-container', true, 'Loading combined performance data...');

    // Reset existing data
    rawData = {
        primes: [],
        subs: []
    };
    
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
    
    // Reset filter dropdowns and search input
    document.getElementById('sub-agency-filter').innerHTML = '<option value="">All Sub-Agencies</option>';
    document.getElementById('sub-agency-filter').value = '';
    document.getElementById('naics-filter').innerHTML = '<option value="">All NAICS</option>';
    document.getElementById('naics-filter').value = '';
    document.getElementById('search-input').value = '';

    // Fetch each dataset sequentially
    fetchDataSequentially(datasets);
}

async function fetchDataSequentially(datasets) {
    try {
        for (let i = 0; i < datasets.length; i++) {
            const dataset = datasets[i];
            console.log(`Loading dataset ${i + 1}/${datasets.length}: ${dataset.name}`
			);
            updateStatusBanner(`Loading ${dataset.name} data (${i + 1}/${datasets.length})...`);
            
            await fetchAndProcessDataset(dataset);
        }
        
        // After all datasets are loaded, build unified model and update UI
        console.log("All datasets loaded, building unified model...");
        buildUnifiedModel();
        updateStatusBanner(`Successfully loaded combined data.`, 'success');
        
        // Update filters and visualizations
        populateFiltersFromUnifiedModel();
        applyFiltersAndUpdateVisuals();
        
    } catch (error) {
        console.error("Error loading combined datasets:", error);
        updateStatusBanner(`Error loading datasets: ${error.message}`, 'error');
    } finally {
        isLoading = false;
        document.getElementById('refresh-button').disabled = false;
    }
}

function fetchAndProcessDataset(dataset) {
    return new Promise((resolve, reject) => {
        const csvUrl = `${S3_BASE_URL}${dataset.id}.csv`;
        console.log(`Loading data from URL: ${csvUrl}`);

        fetch(csvUrl, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Accept': 'text/csv',
            }
        })
        .then(response => {
            if (!response.ok) {
                const statusText = response.statusText || 'Unknown Error';
                throw new Error(`Failed to fetch data: ${response.status} ${statusText}`);
            }
            return response.text();
        })
        .then(csvText => {
            if (!csvText || csvText.trim() === '') {
                console.warn(`Received empty CSV data for ${dataset.name} from ${csvUrl}`);
                resolve([]);
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

                    // Process data based on dataset type
                    const processedData = processDataset(dataset, results.data || []);
                    
                    // Store the processed data in the correct array based on type
                    if (dataset.type === 'primes') {
                        rawData.primes = rawData.primes.concat(processedData);
                    } else {
                        rawData.subs = rawData.subs.concat(processedData);
                    }
                    
                    resolve(processedData);
                },
                error: (error) => {
                    console.error(`PapaParse Error for ${dataset.name}:`, error);
                    reject(error);
                }
            });
        })
        .catch(error => {
            console.error(`Error fetching dataset ${dataset.name}:`, error);
            reject(error);
        });
    });
}

function processDataset(dataset, data) {
    console.log(`Processing ${data.length} rows for ${dataset.name}...`);
    
    const type = dataset.type; // 'primes' or 'subs'
    
    try {
        // Map over the raw parsed data to clean and structure it
        const processedData = data.map((row, index) => {
            try {
                // Create a new object for the cleaned row
                const cleanRow = {
                    _source: type, // Add source type for reference
                    _datasetId: dataset.id // Add dataset ID for reference
                };

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

                // Add normalized field properties for easier access
                for (const field in fieldMap) {
                    const typeField = fieldMap[field][type];
                    if (typeField && cleanRow[typeField] !== undefined) {
                        cleanRow[field] = cleanRow[typeField];
                    }
                }

                // Convert numeric fields using parseSafeFloat for both prime and sub data
                if (type === 'primes') {
                    cleanRow.contractValue = parseSafeFloat(cleanRow.contractValue);
                    cleanRow.obligatedValue = parseSafeFloat(cleanRow.obligatedValue);
                    cleanRow.potentialValue = parseSafeFloat(cleanRow.potentialValue);
                } else {
                    cleanRow.contractValue = parseSafeFloat(cleanRow.contractValue);
                }

                // Pre-parse date fields
                cleanRow.parsedStartDate = parseDate(cleanRow.startDate);
                cleanRow.parsedEndDate = parseDate(cleanRow.endDate);

                return cleanRow;

            } catch (rowError) {
                console.error(`Error processing row ${index} for ${dataset.name}:`, rowError, "Row data:", row);
                return null;
            }
        }).filter(Boolean); // Filter out null entries

        console.log(`Successfully processed ${processedData.length} valid rows for ${dataset.name}`);
        
        return processedData;

    } catch (error) {
        console.error(`Error processing dataset ${dataset.name}:`, error);
        return [];
    }
}

function buildUnifiedModel() {
    console.log("Building unified data model...");
    
    // Initialize the unified model structure
    unifiedModel = {
        agencies: {},      // Agency objects by ID
        subAgencies: {},   // Sub-Agency objects by ID
        offices: {},       // Office objects by ID
        primes: {},        // Prime contractors by ID
        subs: {},          // Subcontractors by ID
        contracts: {},     // Prime contracts by ID
        subcontracts: {},  // Subcontracts by ID
        relationships: {
            agencyToPrime: [],  // Links from agencies to primes
            primeToSub: []      // Links from primes to subs
        },
        stats: {
            totalContractValue: 0,
            totalPrimeContracts: 0,
            totalSubContracts: 0
        }
    };
    
    // Process prime contract data first
    processPrimeContractsForModel();
    
    // Then process subcontract data and link to primes
    processSubContractsForModel();
    
    // Calculate stats
    calculateModelStats();
    
    console.log("Unified model built:", {
        agencies: Object.keys(unifiedModel.agencies).length,
        subAgencies: Object.keys(unifiedModel.subAgencies).length,
        offices: Object.keys(unifiedModel.offices).length, 
        primes: Object.keys(unifiedModel.primes).length,
        subs: Object.keys(unifiedModel.subs).length,
        contracts: Object.keys(unifiedModel.contracts).length,
        subcontracts: Object.keys(unifiedModel.subcontracts).length,
        agencyToPrimeLinks: unifiedModel.relationships.agencyToPrime.length,
        primeToSubLinks: unifiedModel.relationships.primeToSub.length
    });
}

function processPrimeContractsForModel() {
    // Process all prime contract data
    rawData.primes.forEach(row => {
        const agencyName = row.agencyName || "Unknown Agency";
        const subAgencyName = row.subAgencyName || "Unknown Sub-Agency";
        const officeName = row.officeName || "Unknown Office";
        const primeName = row.primeName || "Unknown Prime";
        const contractId = row.contractId || generateUniqueId();
        const contractValue = row.contractValue || 0;
        
        if (contractValue <= 0) return; // Skip contracts without value
        
        // Add/update agency
        const agencyId = `agency-${sanitizeId(agencyName)}`;
        if (!unifiedModel.agencies[agencyId]) {
            unifiedModel.agencies[agencyId] = {
                id: agencyId,
                name: agencyName,
                type: 'agency',
                value: 0,
                subAgencies: new Set()
            };
        }
        unifiedModel.agencies[agencyId].value += contractValue;
        
        // Add/update sub-agency
        const subAgencyId = `subagency-${sanitizeId(subAgencyName)}`;
        if (!unifiedModel.subAgencies[subAgencyId]) {
            unifiedModel.subAgencies[subAgencyId] = {
                id: subAgencyId,
                name: subAgencyName,
                type: 'subagency',
                value: 0,
                parentId: agencyId,
                offices: new Set()
            };
        }
        unifiedModel.subAgencies[subAgencyId].value += contractValue;
        unifiedModel.agencies[agencyId].subAgencies.add(subAgencyId);
        
        // Add/update office
        const officeId = `office-${sanitizeId(officeName)}`;
        if (!unifiedModel.offices[officeId]) {
            unifiedModel.offices[officeId] = {
                id: officeId,
                name: officeName,
                type: 'office',
                value: 0,
                parentId: subAgencyId
            };
        }
        unifiedModel.offices[officeId].value += contractValue;
        unifiedModel.subAgencies[subAgencyId].offices.add(officeId);
        
        // Add/update prime contractor
        const primeId = `prime-${sanitizeId(primeName)}`;
        if (!unifiedModel.primes[primeId]) {
            unifiedModel.primes[primeId] = {
                id: primeId,
                name: primeName,
                type: 'prime',
                value: 0,
                contracts: new Set(),
                subcontractors: new Set()
            };
        }
        unifiedModel.primes[primeId].value += contractValue;
        
        // Add/update contract
        if (!unifiedModel.contracts[contractId]) {
            unifiedModel.contracts[contractId] = {
                id: contractId,
                value: contractValue,
                primeId: primeId,
                officeId: officeId,
                subAgencyId: subAgencyId,
                agencyId: agencyId,
                description: row.description || "No description",
                naicsCode: row.naicsCode || "Unknown",
                naicsDesc: row.naicsDesc || "Unknown",
                startDate: row.parsedStartDate,
                endDate: row.parsedEndDate,
                raw: row // Store the original row data
            };
        } else {
            // Update existing contract if found
            unifiedModel.contracts[contractId].value += contractValue;
        }
        
        unifiedModel.primes[primeId].contracts.add(contractId);
        
        // Create agency to prime relationship
        const relationshipKey = `${agencyId}|${primeId}`;
        const existingRelationship = unifiedModel.relationships.agencyToPrime.find(
            r => `${r.source}|${r.target}` === relationshipKey
        );
        
        if (existingRelationship) {
            existingRelationship.value += contractValue;
        } else {
            unifiedModel.relationships.agencyToPrime.push({
                source: agencyId,
                target: primeId,
                value: contractValue,
                contractId: contractId
            });
        }
    });
}

function processSubContractsForModel() {
    // Process all subcontract data
    rawData.subs.forEach(row => {
        const primeName = row.primeName || "Unknown Prime";
        const subName = row.subName || "Unknown Subcontractor";
        const contractId = row.contractId || generateUniqueId();
        const subcontractId = row.subcontractId || generateUniqueId();
        const contractValue = row.contractValue || 0;
        
        if (contractValue <= 0) return; // Skip contracts without value
        
        // Add/update prime contractor if not already in model
        const primeId = `prime-${sanitizeId(primeName)}`;
        if (!unifiedModel.primes[primeId]) {
            unifiedModel.primes[primeId] = {
                id: primeId,
                name: primeName,
                type: 'prime',
                value: 0,
                contracts: new Set(),
                subcontractors: new Set()
            };
        }
        
        // Add/update subcontractor
        const subId = `sub-${sanitizeId(subName)}`;
        if (!unifiedModel.subs[subId]) {
            unifiedModel.subs[subId] = {
                id: subId,
                name: subName,
                type: 'sub',
                value: 0,
                subcontracts: new Set(),
                primes: new Set()
            };
        }
        unifiedModel.subs[subId].value += contractValue;
        unifiedModel.primes[primeId].subcontractors.add(subId);
        unifiedModel.subs[subId].primes.add(primeId);
        
        // Add/update subcontract
        unifiedModel.subcontracts[subcontractId] = {
            id: subcontractId,
            primeContractId: contractId,
            value: contractValue,
            primeId: primeId,
            subId: subId,
            description: row.description || "No description",
            naicsCode: row.naicsCode || "Unknown",
            naicsDesc: row.naicsDesc || "Unknown",
            startDate: row.parsedStartDate,
            endDate: row.parsedEndDate,
            raw: row // Store the original row data
        };
        
        unifiedModel.subs[subId].subcontracts.add(subcontractId);
        
        // Create prime to sub relationship
        const relationshipKey = `${primeId}|${subId}`;
        const existingRelationship = unifiedModel.relationships.primeToSub.find(
            r => `${r.source}|${r.target}` === relationshipKey
        );
        
        if (existingRelationship) {
            existingRelationship.value += contractValue;
        } else {
            unifiedModel.relationships.primeToSub.push({
                source: primeId,
                target: subId,
                value: contractValue,
                subcontractId: subcontractId
            });
        }
    });
}

function calculateModelStats() {
    // Calculate total contract values
    unifiedModel.stats.totalPrimeContracts = Object.keys(unifiedModel.contracts).length;
    unifiedModel.stats.totalSubContracts = Object.keys(unifiedModel.subcontracts).length;
    
    // Total contract value is the sum of all prime contracts
    unifiedModel.stats.totalContractValue = Object.values(unifiedModel.contracts)
        .reduce((sum, contract) => sum + contract.value, 0);
}

function generateUniqueId() {
    return 'id-' + Math.random().toString(36).substring(2, 15);
}

function sanitizeId(text) {
    if (!text) return 'unknown';
    return text.toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .trim();
}

function populateFiltersFromUnifiedModel() {
    if (!unifiedModel) return;
    
    // Extract sub-agencies for filter
    const subAgencySet = new Set();
    Object.values(unifiedModel.subAgencies).forEach(subAgency => {
        subAgencySet.add(subAgency.name);
    });
    
    // Extract NAICS codes for filter
    const naicsMap = new Map();
    Object.values(unifiedModel.contracts).forEach(contract => {
        if (contract.naicsCode && contract.naicsDesc) {
            naicsMap.set(contract.naicsCode, contract.naicsDesc);
        }
    });
    
    // Also add NAICS codes from subcontracts
    Object.values(unifiedModel.subcontracts).forEach(subcontract => {
        if (subcontract.naicsCode && subcontract.naicsDesc) {
            naicsMap.set(subcontract.naicsCode, subcontract.naicsDesc);
        }
    });
    
    // Populate the dropdowns
    populateDropdown(document.getElementById('sub-agency-filter'), subAgencySet, "All Sub-Agencies");
    populateNaicsDropdown(document.getElementById('naics-filter'), naicsMap);
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

    // Check if we're using unified model or direct raw data
    if (unifiedModel) {
        updateVisualsFromUnifiedModel(subAgencyFilter, naicsFilter, searchTerm);
    } else {
        // Fall back to using direct raw data for backward compatibility
        updateVisualsFromRawData(subAgencyFilter, naicsFilter, searchTerm);
    }
}

function updateVisualsFromUnifiedModel(subAgencyFilter, naicsFilter, searchTerm) {
    // Apply filters to get filtered data
    const filteredModel = filterUnifiedModel(subAgencyFilter, naicsFilter, searchTerm);
    
    // Clean up tooltips before redrawing
    cleanupTooltips();

    // --- Process and Update Visuals ---
    // Contract Leaders Table
    const leaderData = processContractLeadersFromModel(filteredModel);
    displayContractLeadersTable(leaderData);

    // TAV/TCV Chart
    const tavTcvData = processTavTcvDataFromModel(filteredModel);
    displayTavTcvChart(tavTcvData);

    // Expiring Contracts Table
    const expiringData = processExpiringDataFromModel(filteredModel);
    displayExpiringTable(expiringData);

    // Sankey Chart for Award Flow
    displayEnhancedSankeyChart(filteredModel);

    // Choropleth Map
    const mapData = processMapDataFromModel(filteredModel);
    displayChoroplethMap(mapData);
    
    // Calculate ARR
    calculateAverageARRFromModel(filteredModel);
}

function filterUnifiedModel(subAgencyFilter, naicsFilter, searchTerm) {
    // Create a deep copy of the model structure but with empty collections
    const filtered = {
        agencies: {},
        subAgencies: {},
        offices: {},
        primes: {},
        subs: {},
        contracts: {},
        subcontracts: {},
        relationships: {
            agencyToPrime: [],
            primeToSub: []
        },
        stats: {
            totalContractValue: 0,
            totalPrimeContracts: 0,
            totalSubContracts: 0
        }
    };
    
    // Filter contracts first
    const filteredContractIds = new Set();
    Object.entries(unifiedModel.contracts).forEach(([id, contract]) => {
        // Apply sub-agency filter
        if (subAgencyFilter && 
            unifiedModel.subAgencies[contract.subAgencyId] && 
            unifiedModel.subAgencies[contract.subAgencyId].name !== subAgencyFilter) {
            return;
        }
        
        // Apply NAICS filter
        if (naicsFilter && contract.naicsCode !== naicsFilter) {
            return;
        }
        
        // Apply search term
        if (searchTerm) {
            const searchFields = [
                contract.description,
                unifiedModel.primes[contract.primeId]?.name,
                unifiedModel.subAgencies[contract.subAgencyId]?.name,
                unifiedModel.offices[contract.officeId]?.name,
                contract.naicsCode,
                contract.naicsDesc
            ];
            
            if (!searchFields.some(field => field && field.toLowerCase().includes(searchTerm))) {
                return;
            }
        }
        
        // Contract passes all filters
        filteredContractIds.add(id);
        filtered.contracts[id] = {...contract};
    });
    
    // Filter subcontracts
    const filteredSubcontractIds = new Set();
    Object.entries(unifiedModel.subcontracts).forEach(([id, subcontract]) => {
        // Only include subcontracts whose prime contract passed the filters
        // OR whose prime directly meets the filter criteria
        const primeContract = unifiedModel.contracts[subcontract.primeContractId];
        const prime = unifiedModel.primes[subcontract.primeId];
        
        let includeSubcontract = false;
        
        // Check if prime contract passed filters
        if (primeContract && filteredContractIds.has(subcontract.primeContractId)) {
            includeSubcontract = true;
        }
        
        // If not included yet, check direct filters on the subcontract
        if (!includeSubcontract) {
            // Apply NAICS filter
            if (naicsFilter && subcontract.naicsCode !== naicsFilter) {
                return;
            }
            
            // Apply search term
            if (searchTerm) {
                const searchFields = [
                    subcontract.description,
                    prime?.name,
                    unifiedModel.subs[subcontract.subId]?.name,
                    subcontract.naicsCode,
                    subcontract.naicsDesc
                ];
                
                if (!searchFields.some(field => field && field.toLowerCase().includes(searchTerm))) {
                    return;
                }
            }
            
            includeSubcontract = true;
        }
        
        if (includeSubcontract) {
            filteredSubcontractIds.add(id);
            filtered.subcontracts[id] = {...subcontract};
        }
    });
    
    // Now add all related entities that are needed for filtered contracts/subcontracts
    
    // Add primes and their relationships with agencies
    Object.values(filtered.contracts).forEach(contract => {
        const primeId = contract.primeId;
        const prime = unifiedModel.primes[primeId];
        if (prime && !filtered.primes[primeId]) {
            filtered.primes[primeId] = {...prime, value: 0, contracts: new Set(), subcontractors: new Set()};
        }
        
        if (filtered.primes[primeId]) {
            filtered.primes[primeId].value += contract.value;
            filtered.primes[primeId].contracts.add(contract.id);
            
            // Add agency
            const agencyId = contract.agencyId;
            const agency = unifiedModel.agencies[agencyId];
            if (agency && !filtered.agencies[agencyId]) {
                filtered.agencies[agencyId] = {...agency, value: 0, subAgencies: new Set()};
            }
            
            if (filtered.agencies[agencyId]) {
                filtered.agencies[agencyId].value += contract.value;
                
                // Add sub-agency
                const subAgencyId = contract.subAgencyId;
                const subAgency = unifiedModel.subAgencies[subAgencyId];
                if (subAgency && !filtered.subAgencies[subAgencyId]) {
                    filtered.subAgencies[subAgencyId] = {...subAgency, value: 0, offices: new Set()};
                }
                
                if (filtered.subAgencies[subAgencyId]) {
                    filtered.subAgencies[subAgencyId].value += contract.value;
                    filtered.agencies[agencyId].subAgencies.add(subAgencyId);
                    
                    // Add office
                    const officeId = contract.officeId;
                    const office = unifiedModel.offices[officeId];
                    if (office && !filtered.offices[officeId]) {
                        filtered.offices[officeId] = {...office, value: 0};
                    }
                    
                    if (filtered.offices[officeId]) {
                        filtered.offices[officeId].value += contract.value;
                        filtered.subAgencies[subAgencyId].offices.add(officeId);
                    }
                }
                
                // Add agency to prime relationship
                const relationship = unifiedModel.relationships.agencyToPrime.find(
                    r => r.source === agencyId && r.target === primeId
                );
                
                if (relationship) {
                    // Add a copy of the relationship if not already added
                    if (!filtered.relationships.agencyToPrime.some(
                        r => r.source === agencyId && r.target === primeId
                    )) {
                        filtered.relationships.agencyToPrime.push({...relationship, value: 0});
                    }
                    
                    // Update the relationship value
                    const filteredRelationship = filtered.relationships.agencyToPrime.find(
                        r => r.source === agencyId && r.target === primeId
                    );
                    
                    if (filteredRelationship) {
                        filteredRelationship.value += contract.value;
                    }
                }
            }
        }
    });
    
    // Add subs and their relationships with primes
    Object.values(filtered.subcontracts).forEach(subcontract => {
        const subId = subcontract.subId;
        const sub = unifiedModel.subs[subId];
        if (sub && !filtered.subs[subId]) {
            filtered.subs[subId] = {...sub, value: 0, subcontracts: new Set(), primes: new Set()};
        }
        
        if (filtered.subs[subId]) {
            filtered.subs[subId].value += subcontract.value;
            filtered.subs[subId].subcontracts.add(subcontract.id);
            
            // Make sure prime exists in filtered model
            const primeId = subcontract.primeId;
            if (!filtered.primes[primeId]) {
                const prime = unifiedModel.primes[primeId];
                if (prime) {
                    filtered.primes[primeId] = {...prime, value: 0, contracts: new Set(), subcontractors: new Set()};
                }
            }
            
            if (filtered.primes[primeId]) {
                filtered.primes[primeId].subcontractors.add(subId);
                filtered.subs[subId].primes.add(primeId);
                
                // Add prime to sub relationship
                const relationship = unifiedModel.relationships.primeToSub.find(
                    r => r.source === primeId && r.target === subId
                );
                
                if (relationship) {
                    // Add a copy of the relationship if not already added
                    if (!filtered.relationships.primeToSub.some(
                        r => r.source === primeId && r.target === subId
                    )) {
                        filtered.relationships.primeToSub.push({...relationship, value: 0});
                    }
                    
                    // Update the relationship value
                    const filteredRelationship = filtered.relationships.primeToSub.find(
                        r => r.source === primeId && r.target === subId
                    );
                    
                    if (filteredRelationship) {
                        filteredRelationship.value += subcontract.value;
                    }
                }
            }
        }
    });
    
    // Calculate stats
    filtered.stats.totalPrimeContracts = Object.keys(filtered.contracts).length;
    filtered.stats.totalSubContracts = Object.keys(filtered.subcontracts).length;
    filtered.stats.totalContractValue = Object.values(filtered.contracts)
        .reduce((sum, contract) => sum + contract.value, 0);
    
    return filtered;
}

function processContractLeadersFromModel(model) {
    console.log("Processing Contract Leaders from unified model...");
    
    // Get top prime contractors by value
    const primeLeaders = Object.values(model.primes)
        .map(prime => {
            // Count unique contracts
            const contractCount = prime.contracts.size;
            
            // Count unique subcontractors
            const subCount = prime.subcontractors.size;
            
            // Find dominant NAICS
            const naicsCounts = {};
            let dominantNaics = { code: "Unknown", desc: "Unknown", count: 0 };
            
            // Check contracts associated with this prime
            prime.contracts.forEach(contractId => {
                const contract = model.contracts[contractId];
                if (contract && contract.naicsCode) {
                    const naicsKey = contract.naicsCode;
                    naicsCounts[naicsKey] = (naicsCounts[naicsKey] || 0) + 1;
                    
                    if (naicsCounts[naicsKey] > dominantNaics.count) {
                        dominantNaics = {
                            code: contract.naicsCode,
                            desc: contract.naicsDesc || "Unknown",
                            count: naicsCounts[naicsKey]
                        };
                    }
                }
            });
            
            // Get avg contract duration
            let totalDuration = 0;
            let durationCount = 0;
            
            prime.contracts.forEach(contractId => {
                const contract = model.contracts[contractId];
                if (contract && contract.startDate && contract.endDate) {
                    const duration = calculateDurationDays(contract.startDate, contract.endDate);
                    if (duration > 0) {
                        totalDuration += duration;
                        durationCount++;
                    }
                }
            });
            
            const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
            
            // Get a representative contract for linking
            const sampleContractId = Array.from(prime.contracts)[0];
            
            return {
                siName: prime.name,
                numAwards: contractCount,
                numSubs: subCount,
                totalValue: prime.value,
                avgValue: contractCount > 0 ? prime.value / contractCount : 0,
                avgDurationDays: avgDuration,
                dominantNaics: dominantNaics,
                sampleContractId: sampleContractId,
                uniqueContractKeys: Array.from(prime.contracts)
            };
        })
        .filter(leader => leader.numAwards > 0 && leader.totalValue > 0)
        .sort((a, b) => b.totalValue - a.totalValue
		);

    console.log(`Processed ${primeLeaders.length} leader entries.`);
    return primeLeaders;
}

function processTavTcvDataFromModel(model) {
    console.log("Processing TAV/TCV data from unified model...");
    
    // Get top contracts by value
    const topContracts = Object.values(model.contracts)
        .map(contract => {
            const prime = model.primes[contract.primeId];
            
            return {
                id: contract.id,
                primeName: prime ? prime.name : "Unknown",
                tcv: contract.value, // Current Total Value
                tav: contract.raw.obligatedValue || 0, // Total Obligated Value
                potentialTcv: contract.raw.potentialValue || 0 // Potential Total Value
            };
        })
        .filter(contract => contract.tcv > 0)
        .sort((a, b) => b.tcv - a.tcv)
        .slice(0, 7); // Take top 7
    
    console.log(`Processed ${topContracts.length} contracts for TAV/TCV chart.`);
    return topContracts;
}

function processExpiringDataFromModel(model) {
    console.log("Processing expiring contracts from unified model...");
    
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    
    // Get contracts expiring in the next 6 months
    const expiringContracts = Object.values(model.contracts)
        .filter(contract => {
            return contract.endDate && 
                   contract.endDate >= today && 
                   contract.endDate <= sixMonthsFromNow;
        })
        .map(contract => {
            const prime = model.primes[contract.primeId];
            
            return {
                award_id_piid: contract.id,
                recipient_name: prime ? prime.name : "Unknown",
                transaction_description: contract.description,
                period_of_performance_current_end_date: contract.endDate,
                period_of_performance_current_end_date_parsed: contract.endDate,
                current_total_value_of_award: contract.value,
                contract_award_unique_key: contract.id,
                naics_code: contract.naicsCode,
                naics_description: contract.naicsDesc,
                // Include additional fields for display
                formatted_end_date: contract.endDate ? contract.endDate.toLocaleDateString() : "Unknown"
            };
        })
        .sort((a, b) => {
            // Sort by end date (ascending)
            if (a.period_of_performance_current_end_date_parsed && b.period_of_performance_current_end_date_parsed) {
                return a.period_of_performance_current_end_date_parsed - b.period_of_performance_current_end_date_parsed;
            }
            return 0;
        });
    
    console.log(`Found ${expiringContracts.length} contracts expiring in the next 6 months.`);
    return expiringContracts;
}

function processMapDataFromModel(model) {
    console.log("Processing map data from unified model...");
    
    // Create map to store state-level aggregates
    const stateData = {};
    
    // Process contracts
    Object.values(model.contracts).forEach(contract => {
        // Try to get state code from original contract data
        let stateCode = null;
        
        if (contract.raw) {
            // Check available state fields
            stateCode = contract.raw.popStateCode || 
                        (contract.raw.prime_award_pop_state_code) || 
                        (contract.raw.place_of_performance_state_code);
        }
        
        if (!stateCode) return;
        
        // Normalize state code
        stateCode = stateCode.trim().toUpperCase();
        
        // Ensure code is 2 characters
        if (stateCode.length > 2) {
            stateCode = stateCode.substring(0, 2);
        } else if (stateCode.length === 1) {
            stateCode = '0' + stateCode;
        }
        
        // Add contract value to state aggregate
        if (!stateData[stateCode]) {
            stateData[stateCode] = {
                value: 0,
                count: 0
            };
        }
        
        stateData[stateCode].value += contract.value;
        stateData[stateCode].count += 1;
    });
    
    // Also include subcontracts if they have state data
    Object.values(model.subcontracts).forEach(subcontract => {
        if (!subcontract.raw) return;
        
        // Try to get state code
        let stateCode = subcontract.raw.popStateCode || null;
        
        if (!stateCode) return;
        
        // Normalize state code
        stateCode = stateCode.trim().toUpperCase();
        
        // Ensure code is 2 characters
        if (stateCode.length > 2) {
            stateCode = stateCode.substring(0, 2);
        } else if (stateCode.length === 1) {
            stateCode = '0' + stateCode;
        }
        
        // Add subcontract value to state aggregate
        if (!stateData[stateCode]) {
            stateData[stateCode] = {
                value: 0,
                count: 0
            };
        }
        
        stateData[stateCode].value += subcontract.value;
        stateData[stateCode].count += 1;
    });
    
    console.log(`Processed map data for ${Object.keys(stateData).length} states.`);
    return stateData;
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
    tooltip.id = 'tav-tcv-tooltip';
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
        { text: 'Description', key: 'transaction_description' },
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
            if (headerInfo.key === 'period_of_performance_current_end_date') {
                if (contract.period_of_performance_current_end_date_parsed instanceof Date) {
                    value = contract.period_of_performance_current_end_date_parsed.toISOString().split('T')[0];
                } else if (contract.formatted_end_date) {
                    value = contract.formatted_end_date;
                }
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
function displayEnhancedSankeyChart(model) {
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
    
    // Check if we have valid model data
    if (!model || 
        (!model.relationships.agencyToPrime.length && !model.relationships.primeToSub.length)) {
        displayNoData(containerId, 'No data available for Sankey diagram.');
        return;
    }
    
    try {
        // Create a simple tooltip div
        const tooltip = document.createElement('div');
        tooltip.id = 'sankey-tooltip';
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
        const nodeColors = {
            agency: isDarkMode ? '#A29AAA' : '#9993A1',
            subagency: isDarkMode ? '#9993A1' : '#878094',
            office: isDarkMode ? '#878094' : '#797484',
            prime: isDarkMode ? '#797484' : '#706877',
            sub: isDarkMode ? '#706877' : '#615C66'
        };
        
        const linkColor = isDarkMode ? '#3A373E' : '#D7D4DC';
        const textColor = isDarkMode ? '#F4F2F6' : '#36323A';
        
        // Create D3 selection
        const svgSelection = d3.select(svg)
            .attr('width', width)
            .attr('height', height);
        
        // Prepare nodes and links for Sankey
        const nodes = [];
        const links = [];
        const nodeMap = {};
        
        // Add agency nodes first
        let nodeIndex = 0;
        
        // Function to get or create a node
        const getNode = (id, name, type) => {
            if (nodeMap[id] !== undefined) {
                return nodeMap[id];
            }
            
            const node = {
                name: truncateText(name, 30),
                id: id,
                type: type,
                index: nodeIndex++
            };
            
            nodes.push(node);
            nodeMap[id] = node.index;
            return node.index;
        };
        
        // Add Agency to Prime links
        model.relationships.agencyToPrime.forEach(link => {
            const agencyId = link.source;
            const primeId = link.target;
            
            const agency = model.agencies[agencyId];
            const prime = model.primes[primeId];
            
            if (!agency || !prime) return;
            
            const sourceIndex = getNode(agencyId, agency.name, 'agency');
            const targetIndex = getNode(primeId, prime.name, 'prime');
            
            links.push({
                source: sourceIndex,
                target: targetIndex,
                value: link.value
            });
        });
        
        // Add Prime to Sub links
        model.relationships.primeToSub.forEach(link => {
            const primeId = link.source;
            const subId = link.target;
            
            const prime = model.primes[primeId];
            const sub = model.subs[subId];
            
            if (!prime || !sub) return;
            
            const sourceIndex = getNode(primeId, prime.name, 'prime');
            const targetIndex = getNode(subId, sub.name, 'sub');
            
            links.push({
                source: sourceIndex,
                target: targetIndex,
                value: link.value
            });
        });
        
        // Create Sankey generator
        const sankey = d3.sankey()
            .nodeWidth(15)
            .nodePadding(10)
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);
        
        // Apply Sankey to data
        const graph = sankey({
            nodes: nodes.map(d => Object.assign({}, d)),
            links: links.map(d => Object.assign({}, d))
        });
        
        // Draw links with gradients
        const defs = svgSelection.append('defs');
        
        graph.links.forEach((link, i) => {
            const gradientId = `link-gradient-${i}`;
            const sourceColor = nodeColors[link.source.type] || '#999';
            const targetColor = nodeColors[link.target.type] || '#999';
            
            const gradient = defs.append('linearGradient')
                .attr('id', gradientId)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', link.source.x1)
                .attr('y1', link.source.y0 + (link.source.y1 - link.source.y0) / 2)
                .attr('x2', link.target.x0)
                .attr('y2', link.target.y0 + (link.target.y1 - link.target.y0) / 2);
                
            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', sourceColor)
                .attr('stop-opacity', 0.8);
                
            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', targetColor)
                .attr('stop-opacity', 0.8);
                
            link.gradientId = gradientId;
        });
        
        svgSelection.append('g')
            .selectAll('path')
            .data(graph.links)
            .enter()
            .append('path')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', (d) => `url(#${d.gradientId})`)
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
        
        // Draw nodes with appropriate colors
        svgSelection.append('g')
            .selectAll('rect')
            .data(graph.nodes)
            .enter()
            .append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => Math.max(1, d.y1 - d.y0))
            .attr('width', d => Math.max(1, d.x1 - d.x0))
            .attr('fill', d => nodeColors[d.type] || '#999')
            .attr('stroke', isDarkMode ? '#4A474E' : '#E9E6ED')
            .attr('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                // Show tooltip
                const html = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${d.name}</div>
                    <div>Type: ${d.type.charAt(0).toUpperCase() + d.type.slice(1)}</div>
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
            .attr('fill', textColor)
            .each(function(d) {
                // Hide labels for small nodes
                if ((d.y1 - d.y0) < 10) {
                    d3.select(this).remove();
                }
            });
        
    } catch (error) {
        console.error("Error rendering Sankey chart:", error);
        displayError(containerId, `Error rendering Sankey chart: ${error.message}`);
    }
}

function calculateAverageARRFromModel(model) {
    const resultDiv = document.getElementById('arr-result');
    const loadingDiv = document.getElementById('arr-loading');
    const errorDiv = document.getElementById('arr-error');
    const noDataDiv = document.getElementById('arr-no-data');

    // Reset UI elements
    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    noDataDiv.style.display = 'none';

    try {
        console.log(`Calculating ARR based on ${Object.keys(model.contracts).length} contracts.`);

        if (Object.keys(model.contracts).length === 0) {
            loadingDiv.style.display = 'none';
            noDataDiv.style.display = 'block';
            resultDiv.textContent = formatCurrency(0) + " / yr";
            resultDiv.style.display = 'block';
            return;
        }

        // Group contracts by duration for weighted ARR calculation
        const shortTermContracts = []; // Less than 90 days
        const mediumTermContracts = []; // 90 days to 270 days
        const longTermContracts = []; // More than 270 days
        let validContractsCount = 0;
        
        Object.values(model.contracts).forEach(contract => {
            if (!contract.startDate || !contract.endDate) return;
            
            const value = contract.value || 0;
            const durationDays = calculateDurationDays(contract.startDate, contract.endDate);
            
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
        
        // Short-term contracts are weighted less (50%)
        if (shortTermContracts.length > 0) {
            const shortTermARR = shortTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25 * 0.5;
            }, 0) / shortTermContracts.length;
            
            weightedARR += shortTermARR * (shortTermContracts.length / validContractsCount);
        }
        
        // Medium-term contracts are weighted at 80%
        if (mediumTermContracts.length > 0) {
            const mediumTermARR = mediumTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25 * 0.8;
            }, 0) / mediumTermContracts.length;
            
            weightedARR += mediumTermARR * (mediumTermContracts.length / validContractsCount);
        }
        
        // Long-term contracts are weighted at 100%
        if (longTermContracts.length > 0) {
            const longTermARR = longTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25;
            }, 0) / longTermContracts.length;
            
            weightedARR += longTermARR * (longTermContracts.length / validContractsCount);
        }

        if (validContractsCount > 0) {
            resultDiv.textContent = formatConciseCurrency(weightedARR) + " / yr";
            resultDiv.style.display = 'block';
            console.log(`Weighted Average ARR: ${weightedARR.toFixed(0)} (from ${validContractsCount} valid contracts)`);
            noDataDiv.style.display = 'none';
        } else {
            noDataDiv.textContent = 'No contracts suitable for ARR calculation found.';
            noDataDiv.style.display = 'block';
            resultDiv.textContent = formatConciseCurrency(0) + " / yr";
            resultDiv.style.display = 'block';
            console.log("No valid contracts found for ARR calculation.");
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

// --- Legacy Functions for Raw Data Processing ---
function updateVisualsFromRawData(subAgencyFilter, naicsFilter, searchTerm) {
    // --- Check for Raw Data ---
    if ((!rawData.primes || rawData.primes.length === 0) && 
        (!rawData.subs || rawData.subs.length === 0)) {
        console.warn("No raw data available to filter.");
        resetUIForNoDataset();
        return [];
    }

    // --- Apply Search & Filters for Prime data ---
    let filteredPrimes = rawData.primes;
    if (filteredPrimes.length > 0) {
        // Apply search
        if (searchTerm) {
            filteredPrimes = filteredPrimes.filter(row => {
                return [
                    row.primeName,
                    row.agencyName,
                    row.subAgencyName,
                    row.officeName,
                    row.description,
                    row.naicsCode,
                    row.naicsDesc
                ].some(field => field && field.toString().toLowerCase().includes(searchTerm));
            });
        }

        // Apply sub-agency filter
        if (subAgencyFilter) {
            filteredPrimes = filteredPrimes.filter(row => row.subAgencyName === subAgencyFilter);
        }

        // Apply NAICS filter
        if (naicsFilter) {
            filteredPrimes = filteredPrimes.filter(row => row.naicsCode === naicsFilter);
        }
    }

    // --- Apply Search & Filters for Sub data ---
    let filteredSubs = rawData.subs;
    if (filteredSubs.length > 0) {
        // Apply search
        if (searchTerm) {
            filteredSubs = filteredSubs.filter(row => {
                return [
                    row.primeName,
                    row.subName,
                    row.agencyName,
                    row.subAgencyName,
                    row.officeName,
                    row.description,
                    row.naicsCode,
                    row.naicsDesc
                ].some(field => field && field.toString().toLowerCase().includes(searchTerm));
            });
        }

        // Apply sub-agency filter
        if (subAgencyFilter) {
            filteredSubs = filteredSubs.filter(row => row.subAgencyName === subAgencyFilter);
        }

        // Apply NAICS filter
        if (naicsFilter) {
            filteredSubs = filteredSubs.filter(row => row.naicsCode === naicsFilter);
        }
    }

    // Clean up tooltips before redrawing
    cleanupTooltips();

    console.log(`Filtered data: ${filteredPrimes.length} primes, ${filteredSubs.length} subs`);

    // --- Process and Update Visuals ---
    const hasSubsOnly = filteredPrimes.length === 0 && filteredSubs.length > 0;
    const hasPrimesOnly = filteredPrimes.length > 0 && filteredSubs.length === 0;
    const hasBoth = filteredPrimes.length > 0 && filteredSubs.length > 0;

    // Choose which data to use for each visualization
    if (hasPrimesOnly) {
        // Use prime contract data only
        const leaderData = processContractLeaders(filteredPrimes);
        displayContractLeadersTable(leaderData);

        const tavTcvData = processTavTcvData(filteredPrimes);
        displayTavTcvChart(tavTcvData);

        const expiringData = processExpiringData(filteredPrimes);
        displayExpiringTable(expiringData);

        const sankeyData = processSankeyData(filteredPrimes);
        displaySankeyChart(sankeyData);

        const mapData = processMapData(filteredPrimes);
        displayChoroplethMap(mapData);
        
        calculateAverageARR(filteredPrimes);
    } 
    else if (hasSubsOnly) {
        // Use subcontract data only
        // Adapt subcontract data for leader visualization
        const adaptedSubs = filteredSubs.map(row => ({
            recipient_name: row.primeName,
            current_total_value_of_award: row.contractValue,
            period_of_performance_start_date: row.startDate,
            period_of_performance_current_end_date: row.endDate,
            transaction_description: row.description,
            naics_code: row.naicsCode,
            naics_description: row.naicsDesc,
            prime_award_unique_key: row.contractId
        }));
        
        const leaderData = processContractLeaders(adaptedSubs);
        displayContractLeadersTable(leaderData);

        // Other visualizations will be specific to subcontract data
        displayNoData('tav-tcv-chart-container', 'TAV/TCV chart available for prime contract data only.');
        
        const expiringData = processExpiringDataLegacy(filteredSubs);
        displayExpiringTable(expiringData);
        
        const sankeyData = processSankeyDataLegacy(filteredSubs);
        displaySankeyChart(sankeyData);
        
        const mapData = processMapDataLegacy(filteredSubs);
        displayChoroplethMap(mapData);
        
        calculateAverageARRLegacy(filteredSubs);
    }
    else if (hasBoth) {
        // Both types available, build combined visualizations
        // For leader table, combine prime data first, then add unique subs
        const leaderData = processContractLeaders(filteredPrimes);
        displayContractLeadersTable(leaderData);
        
        // Use prime contracts for TAV/TCV which requires obligated values
        const tavTcvData = processTavTcvData(filteredPrimes);
        displayTavTcvChart(tavTcvData);
        
        // Combine expiring contracts
        const primeExpiring = processExpiringData(filteredPrimes);
        const subExpiring = processExpiringDataLegacy(filteredSubs);
        displayExpiringTable([...primeExpiring, ...subExpiring]);
        
        // Try to build combined Sankey
        const combinedSankeyData = buildCombinedSankeyData(filteredPrimes, filteredSubs);
        displaySankeyChart(combinedSankeyData);
        
        // Combine map data by adding up values for each state
        const primeMapData = processMapData(filteredPrimes);
        const subMapData = processMapDataLegacy(filteredSubs);
        const combinedMapData = combineMapData(primeMapData, subMapData);
        displayChoroplethMap(combinedMapData);
        
        // Use all contracts for ARR calculation
        calculateAverageARRCombined(filteredPrimes, filteredSubs);
    }
    else {
        // No data for either type after filtering
        displayNoData('contract-leaders-table-container', 'No matching contracts found with current filters.');
        displayNoData('tav-tcv-chart-container', 'No matching contracts found with current filters.');
        displayNoData('expiring-contracts-table-container', 'No matching contracts found with current filters.');
        displayNoData('sankey-chart-container', 'No matching contracts found with current filters.');
        displayNoData('map-container', 'No matching contracts found with current filters.');
        
        // Reset ARR display
        document.getElementById('arr-result').textContent = '$0 / yr';
        document.getElementById('arr-loading').style.display = 'none';
        document.getElementById('arr-error').style.display = 'none';
        document.getElementById('arr-no-data').style.display = 'block';
    }
}

// --- Utility functions for combined visualizations ---
function processExpiringDataLegacy(data) {
    console.log("Processing legacy data for expiring contracts...");
    if (!data || data.length === 0) return [];

    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const today = new Date();

    const expiringContracts = data.filter(row => {
        const endDate = row.parsedEndDate;
        if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
            return false;
        }
        return endDate >= today && endDate <= sixMonthsFromNow;
    }).map(row => ({
        award_id_piid: row.contractId || 'Unknown',
        recipient_name: row.primeName || 'Unknown',
        transaction_description: row.description || 'No description',
        period_of_performance_current_end_date: row.endDate,
        period_of_performance_current_end_date_parsed: row.parsedEndDate,
        current_total_value_of_award: row.contractValue,
        contract_award_unique_key: row.contractId,
        // Add extra fields for display
        subawardee_name: row.subName || 'Unknown Sub'
    }));

    console.log(`Found ${expiringContracts.length} contracts expiring in the next 6 months.`);
    return expiringContracts;
}

function processSankeyDataLegacy(data) {
    console.log("Processing legacy data for Sankey chart...");
    if (!data || data.length === 0) return { nodes: [], links: [] };

    // Get unique sub-agencies
    const subAgencies = new Set();
    data.forEach(row => {
        const agency = row.subAgencyName;
        if (agency && agency.toLowerCase() !== 'unknown sub-agency' && agency.toLowerCase() !== 'unknown') {
            subAgencies.add(agency);
        }
    });

    // Get unique primes and subs
    const primes = new Set();
    const subs = new Set();
    data.forEach(row => {
        if (row.primeName) primes.add(row.primeName);
        if (row.subName) subs.add(row.subName);
    });

    // Take top prime contractors by value
    const primeValues = {};
    data.forEach(row => {
        const prime = row.primeName;
        if (!prime) return;
        primeValues[prime] = (primeValues[prime] || 0) + (row.contractValue || 0);
    });

    // Sort primes by value and take top 10
    const topPrimes = Object.entries(primeValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name);

    // Take top subcontractors by value
    const subValues = {};
    data.forEach(row => {
        const sub = row.subName;
        if (!sub) return;
        subValues[sub] = (subValues[sub] || 0) + (row.contractValue || 0);
    });

    // Sort subs by value and take top 10
    const topSubs = Object.entries(subValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name);

    // Create nodes array
    const nodes = [];
    
    // Add agency nodes
    Array.from(subAgencies).forEach(agency => {
        nodes.push({ name: truncateText(agency, 30), type: 'agency' });
    });
    
    // Add prime nodes
    topPrimes.forEach(prime => {
        nodes.push({ name: truncateText(prime, 30), type: 'prime' });
    });
    
    // Add sub nodes
    topSubs.forEach(sub => {
        nodes.push({ name: truncateText(sub, 30), type: 'sub' });
    });

    // Create links array
    const links = [];
    const agencyIndices = {};
    const primeIndices = {};
    const subIndices = {};
    
    // Map names to indices
    let indexCounter = 0;
    Array.from(subAgencies).forEach(agency => {
        agencyIndices[agency] = indexCounter++;
    });
    
    topPrimes.forEach(prime => {
        primeIndices[prime] = indexCounter++;
    });
    
    topSubs.forEach(sub => {
        subIndices[sub] = indexCounter++;
    });

    // Create links from agencies to primes
    data.forEach(row => {
        const agency = row.subAgencyName;
        const prime = row.primeName;
        
        if (!agency || !prime || !agencyIndices.hasOwnProperty(agency) || !primeIndices.hasOwnProperty(prime)) {
            return;
        }
        
        const value = row.contractValue || 0;
        if (value <= 0) return;
        
        // Check if a link already exists between these nodes
        const existingLinkIndex = links.findIndex(link => 
            link.source === agencyIndices[agency] && link.target === primeIndices[prime]
        );
        
        if (existingLinkIndex >= 0) {
            // Add to existing link
            links[existingLinkIndex].value += value;
        } else {
            // Create new link
            links.push({
                source: agencyIndices[agency],
                target: primeIndices[prime],
                value: value
            });
        }
    });

    // Create links from primes to subs
    data.forEach(row => {
        const prime = row.primeName;
        const sub = row.subName;
        
        if (!prime || !sub || !primeIndices.hasOwnProperty(prime) || !subIndices.hasOwnProperty(sub)) {
            return;
        }
        
        const value = row.contractValue || 0;
        if (value <= 0) return;
        
        // Check if a link already exists between these nodes
        const existingLinkIndex = links.findIndex(link => 
            link.source === primeIndices[prime] && link.target === subIndices[sub]
        );
        
        if (existingLinkIndex >= 0) {
            // Add to existing link
            links[existingLinkIndex].value += value;
        } else {
            // Create new link
            links.push({
                source: primeIndices[prime],
                target: subIndices[sub],
                value: value
            });
        }
    });

    return { nodes, links };
}

function processMapDataLegacy(data) {
    console.log("Processing legacy data for map...");
    if (!data || data.length === 0) return {};

    // Create a map to store state-level aggregates
    const stateData = {};
    
    // Find the state code field
    let stateCodeField = null;
    if (data.length > 0) {
        const row = data[0];
        if (row.popStateCode) stateCodeField = 'popStateCode';
        else if (row.prime_award_pop_state_code) stateCodeField = 'prime_award_pop_state_code';
        else if (row.place_of_performance_state_code) stateCodeField = 'place_of_performance_state_code';
    }
    
    if (!stateCodeField) {
        console.warn("Could not determine state code field for map data");
        return {};
    }

    data.forEach(row => {
        const stateCode = row[stateCodeField];
        if (!stateCode) return;
        
        // Normalize state code
        let normalizedCode = stateCode.trim().toUpperCase();
        
        // Ensure code is 2 characters
        if (normalizedCode.length > 2) {
            normalizedCode = normalizedCode.substring(0, 2);
        } else if (normalizedCode.length === 1) {
            normalizedCode = '0' + normalizedCode;
        }
        
        const value = row.contractValue || 0;
        
        if (!stateData[normalizedCode]) {
            stateData[normalizedCode] = {
                value: 0,
                count: 0
            };
        }
        
        stateData[normalizedCode].value += value;
        stateData[normalizedCode].count += 1;
    });
    
    return stateData;
}

function calculateAverageARRLegacy(data) {
    const resultDiv = document.getElementById('arr-result');
    const loadingDiv = document.getElementById('arr-loading');
    const errorDiv = document.getElementById('arr-error');
    const noDataDiv = document.getElementById('arr-no-data');

    // Reset UI elements
    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    noDataDiv.style.display = 'none';

    try {
        console.log(`Calculating ARR based on ${data.length} contracts.`);

        if (data.length === 0) {
            loadingDiv.style.display = 'none';
            noDataDiv.style.display = 'block';
            resultDiv.textContent = '$0 / yr';
            resultDiv.style.display = 'block';
            return;
        }

        // Group contracts by duration for weighted ARR calculation
        const shortTermContracts = []; // Less than 90 days
        const mediumTermContracts = []; // 90 days to 270 days
        const longTermContracts = []; // More than 270 days
        let validContractsCount = 0;
        
        data.forEach(row => {
            if (!row.parsedStartDate || !row.parsedEndDate) return;
            
            const value = row.contractValue || 0;
            const durationDays = calculateDurationDays(row.parsedStartDate, row.parsedEndDate);
            
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
        
        // Calculate weighted ARR
        let weightedARR = 0;
        
        // Each duration category gets weighted differently
        if (shortTermContracts.length > 0) {
            const shortTermARR = shortTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25 * 0.5; // 50% weight
            }, 0) / shortTermContracts.length;
            
            weightedARR += shortTermARR * (shortTermContracts.length / validContractsCount);
        }
        
        if (mediumTermContracts.length > 0) {
            const mediumTermARR = mediumTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25 * 0.8; // 80% weight
            }, 0) / mediumTermContracts.length;
            
            weightedARR += mediumTermARR * (mediumTermContracts.length / validContractsCount);
        }
        
        if (longTermContracts.length > 0) {
            const longTermARR = longTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25; // 100% weight
            }, 0) / longTermContracts.length;
            
            weightedARR += longTermARR * (longTermContracts.length / validContractsCount);
        }

        if (validContractsCount > 0) {
            resultDiv.textContent = formatConciseCurrency(weightedARR) + " / yr";
            resultDiv.style.display = 'block';
            console.log(`Weighted Average ARR: ${weightedARR.toFixed(0)} (from ${validContractsCount} valid contracts)`);
            noDataDiv.style.display = 'none';
        } else {
            noDataDiv.textContent = 'No contracts suitable for ARR calculation found.';
            noDataDiv.style.display = 'block';
            resultDiv.textContent = formatConciseCurrency(0) + " / yr";
            resultDiv.style.display = 'block';
            console.log("No valid contracts found for ARR calculation.");
        }
    } catch (error) {
        console.error("Error calculating ARR:", error);
        errorDiv.textContent = `Error calculating ARR: ${error.message}`;
        errorDiv.style.display = 'block';
        resultDiv.style.display = 'none';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function buildCombinedSankeyData(primeData, subData) {
    // Create a merged Sankey visualization
    console.log("Building combined Sankey data...");
    
    // Get top agencies
    const agencies = new Set();
    primeData.forEach(row => {
        const agency = row.subAgencyName;
        if (agency) agencies.add(agency);
    });
    subData.forEach(row => {
        const agency = row.subAgencyName;
        if (agency) agencies.add(agency);
    });
    
    // Get top prime contractors
    const primeValues = {};
    primeData.forEach(row => {
        const prime = row.primeName;
        if (!prime) return;
        primeValues[prime] = (primeValues[prime] || 0) + (row.contractValue || 0);
    });
    subData.forEach(row => {
        const prime = row.primeName;
        if (!prime) return;
        primeValues[prime] = (primeValues[prime] || 0) + (row.contractValue || 0);
    });
    
    // Get top subcontractors
    const subValues = {};
    subData.forEach(row => {
        const sub = row.subName;
        if (!sub) return;
        subValues[sub] = (subValues[sub] || 0) + (row.contractValue || 0);
    });
    
    // Sort and take top 10 of each
    const topAgencies = Array.from(agencies).slice(0, 10);
    const topPrimes = Object.entries(primeValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name]) => name);
    const topSubs = Object.entries(subValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name);
    
    // Create nodes array
    const nodes = [];
    
    // Add agency nodes
    topAgencies.forEach(agency => {
        nodes.push({ name: truncateText(agency, 30), type: 'agency' });
    });
    
    // Add prime nodes
    topPrimes.forEach(prime => {
        nodes.push({ name: truncateText(prime, 30), type: 'prime' });
    });
    
    // Add sub nodes
    topSubs.forEach(sub => {
        nodes.push({ name: truncateText(sub, 30), type: 'sub' });
    });
    
    // Create links array
    const links = [];
    const nodeMap = {};
    
    // Create node index map
    nodes.forEach((node, i) => {
        nodeMap[node.name] = i;
    });
    
    // Create links from agencies to primes
    const agencyPrimeLinks = {};
    
    // Process agency to prime links from both datasets
    const processAgencyPrimeLink = (agency, prime, value) => {
        if (!agency || !prime || 
            !nodeMap.hasOwnProperty(truncateText(agency, 30)) || 
            !nodeMap.hasOwnProperty(truncateText(prime, 30))) {
            return;
        }
        
        const linkKey = `${agency}|${prime}`;
        
        if (!agencyPrimeLinks[linkKey]) {
            agencyPrimeLinks[linkKey] = {
                source: nodeMap[truncateText(agency, 30)],
                target: nodeMap[truncateText(prime, 30)],
                value: 0
            };
        }
        
        agencyPrimeLinks[linkKey].value += value;
    };
    
    primeData.forEach(row => {
        processAgencyPrimeLink(row.subAgencyName, row.primeName, row.contractValue || 0);
    });
    
    subData.forEach(row => {
        processAgencyPrimeLink(row.subAgencyName, row.primeName, row.contractValue || 0);
    });
    
    // Add agency-prime links to the links array
    Object.values(agencyPrimeLinks).forEach(link => {
        if (link.value > 0) {
            links.push(link);
        }
    });
    
    // Create links from primes to subs
    const primeSubLinks = {};
    
    subData.forEach(row => {
        const prime = row.primeName;
        const sub = row.subName;
        
        if (!prime || !sub || 
            !nodeMap.hasOwnProperty(truncateText(prime, 30)) || 
            !nodeMap.hasOwnProperty(truncateText(sub, 30))) {
            return;
        }
        
        const linkKey = `${prime}|${sub}`;
        
        if (!primeSubLinks[linkKey]) {
            primeSubLinks[linkKey] = {
                source: nodeMap[truncateText(prime, 30)],
                target: nodeMap[truncateText(sub, 30)],
                value: 0
            };
        }
        
        primeSubLinks[linkKey].value += (row.contractValue || 0);
    });
    
    // Add prime-sub links to the links array
    Object.values(primeSubLinks).forEach(link => {
        if (link.value > 0) {
            links.push(link);
        }
    });
    
    return { nodes, links };
}

function combineMapData(primeData, subData) {
    // Combine map data by adding up values for each state
    const combinedData = {};
    
    // Process prime data
    Object.entries(primeData).forEach(([state, data]) => {
        if (!combinedData[state]) {
            combinedData[state] = { value: 0, count: 0 };
        }
        combinedData[state].value += data.value;
        combinedData[state].count += data.count;
    });
    
    // Process sub data
    Object.entries(subData).forEach(([state, data]) => {
        if (!combinedData[state]) {
            combinedData[state] = { value: 0, count: 0 };
        }
        combinedData[state].value += data.value;
        combinedData[state].count += data.count;
    });
    
    return combinedData;
}

function calculateAverageARRCombined(primeData, subData) {
    const resultDiv = document.getElementById('arr-result');
    const loadingDiv = document.getElementById('arr-loading');
    const errorDiv = document.getElementById('arr-error');
    const noDataDiv = document.getElementById('arr-no-data');

    // Reset UI elements
    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    noDataDiv.style.display = 'none';

    try {
        // Combine contract data
        const allContracts = [];
        
        // Process prime contracts
        primeData.forEach(row => {
            if (!row.parsedStartDate || !row.parsedEndDate) return;
            
            allContracts.push({
                value: row.contractValue || 0,
                durationDays: calculateDurationDays(row.parsedStartDate, row.parsedEndDate)
            });
        });
        
        // Process subcontracts
        subData.forEach(row => {
            if (!row.parsedStartDate || !row.parsedEndDate) return;
            
            allContracts.push({
                value: row.contractValue || 0,
                durationDays: calculateDurationDays(row.parsedStartDate, row.parsedEndDate)
            });
        });
        
        console.log(`Calculating ARR based on ${allContracts.length} combined contracts.`);

        if (allContracts.length === 0) {
            loadingDiv.style.display = 'none';
            noDataDiv.style.display = 'block';
            resultDiv.textContent = '$0 / yr';
            resultDiv.style.display = 'block';
            return;
        }

        // Filter valid contracts
        const validContracts = allContracts.filter(contract => 
            contract.value > 0 && contract.durationDays > 0
        );
        
        // Group by duration
        const shortTermContracts = validContracts.filter(c => c.durationDays < 90);
        const mediumTermContracts = validContracts.filter(c => c.durationDays >= 90 && c.durationDays < 270);
        const longTermContracts = validContracts.filter(c => c.durationDays >= 270);
        
        // Calculate weighted ARR
        let weightedARR = 0;
        const validContractsCount = validContracts.length;
        
        if (shortTermContracts.length > 0) {
            const shortTermARR = shortTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25 * 0.5; // 50% weight
            }, 0) / shortTermContracts.length;
            
            weightedARR += shortTermARR * (shortTermContracts.length / validContractsCount);
        }
        
        if (mediumTermContracts.length > 0) {
            const mediumTermARR = mediumTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25 * 0.8; // 80% weight
            }, 0) / mediumTermContracts.length;
            
            weightedARR += mediumTermARR * (mediumTermContracts.length / validContractsCount);
        }
        
        if (longTermContracts.length > 0) {
            const longTermARR = longTermContracts.reduce((sum, contract) => {
                return sum + (contract.value / contract.durationDays) * 365.25; // 100% weight
            }, 0) / longTermContracts.length;
            
            weightedARR += longTermARR * (longTermContracts.length / validContractsCount);
        }

        if (validContractsCount > 0) {
            resultDiv.textContent = formatConciseCurrency(weightedARR) + " / yr";
            resultDiv.style.display = 'block';
            console.log(`Weighted Average ARR: ${weightedARR.toFixed(0)} (from ${validContractsCount} valid contracts)`);
            noDataDiv.style.display = 'none';
        } else {
            noDataDiv.textContent = 'No contracts suitable for ARR calculation found.';
            noDataDiv.style.display = 'block';
            resultDiv.textContent = formatConciseCurrency(0) + " / yr";
            resultDiv.style.display = 'block';
            console.log("No valid contracts found for ARR calculation.");
        }
    } catch (error) {
        console.error("Error calculating combined ARR:", error);
        errorDiv.textContent = `Error calculating ARR: ${error.message}`;
        errorDiv.style.display = 'block';
        resultDiv.style.display = 'none';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// --- Events and initialize the page ---
function setupEventListeners() {
    // Refresh button
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            if (selectedAgencies.length === 1) {
                loadSingleDataset(selectedAgencies[0]);
            } else if (selectedAgencies.length > 1) {
                fetchDataSequentially(selectedAgencies);
            } else {
                console.warn("Cannot refresh - no agency selected");
                updateStatusBanner("Please select an agency first", "error");
            }
        });
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
    }
    
    // Filters that trigger visual updates
    const subAgencyFilter = document.getElementById('sub-agency-filter');
    const naicsFilter = document.getElementById('naics-filter');

    if (subAgencyFilter) subAgencyFilter.addEventListener('change', applyFiltersAndUpdateVisuals);
    if (naicsFilter) naicsFilter.addEventListener('change', applyFiltersAndUpdateVisuals);
}

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

function updateTooltipThemes(isDarkMode) {
    // Update tooltips for the current theme
    const tooltipSelectors = [
        '#sankey-tooltip', 
        '.sankey-tooltip', 
        '#tav-tcv-tooltip', 
        '.map-tooltip'
    ];
    
    tooltipSelectors.forEach(selector => {
        const tooltips = document.querySelectorAll(selector);
        tooltips.forEach(tooltip => {
            if (isDarkMode) {
                tooltip.style.backgroundColor = '#252229';
                tooltip.style.color = '#F4F2F6';
                tooltip.style.border = '1px solid #3A373E';
            } else {
                tooltip.style.backgroundColor = '#FFFFFF';
                tooltip.style.color = '#36323A';
                tooltip.style.border = '1px solid #D7D4DC';
            }
        });
    });
}

function updateChartsForTheme() {
    // Clean up tooltips first
    cleanupTooltips();
    
    // Update visualizations if data is available
    if (unifiedModel) {
        applyFiltersAndUpdateVisuals();
    } else if (rawData.primes.length > 0 || rawData.subs.length > 0) {
        applyFiltersAndUpdateVisuals();
    }
}

function updateDashboardTitle(datasets) {
    const dashboardTitle = document.getElementById('dashboard-title');
    const dashboardSubtitle = document.getElementById('dashboard-subtitle');
    if (!dashboardTitle || !dashboardSubtitle) return;

    if (!datasets || datasets.length === 0) {
        // Reset to default titles
        dashboardTitle.textContent = 'Dashboard';
        dashboardSubtitle.textContent = 'Select an agency dataset to begin';
        return;
    }
    
    if (Array.isArray(datasets)) {
        if (datasets.length === 1) {
            // Single dataset
            const dataset = datasets[0];
            const agencyName = dataset.name.split(' (')[0];
            dashboardTitle.textContent = agencyName + ' Spending';
            dashboardSubtitle.textContent = `Analyzing ${dataset.type} data from USAspending.gov`;
        } else {
            // Multiple datasets - use the first one's agency name
            const agencyNames = new Set(datasets.map(d => d.name.split(' (')[0]));
            const isSameAgency = agencyNames.size === 1;
            
            if (isSameAgency) {
                // Same agency, different data types
                const agencyName = Array.from(agencyNames)[0];
                dashboardTitle.textContent = agencyName + ' Spending';
                dashboardSubtitle.textContent = 'Combined Prime & Subcontract Data';
            } else {
                // Different agencies
                dashboardTitle.textContent = 'Multi-Agency View';
                dashboardSubtitle.textContent = `${agencyNames.size} agencies selected`;
            }
        }
    } else {
        // Legacy support for non-array datasets
        const agencyName = datasets.name.split(' (')[0];
        dashboardTitle.textContent = agencyName + ' Spending';
        dashboardSubtitle.textContent = `Analyzing ${datasets.type} data from USAspending.gov`;
    }
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
        
        // Dominant Type/NAICS
        cell = row.insertCell();
        cell.className = 'text-gray-600 text-xs';
        // Check if using dominantNaics or dominantType
        if (leader.dominantNaics) {
            cell.textContent = truncateText(leader.dominantNaics.desc || "Unknown", 30);
            cell.title = `${leader.dominantNaics.code} - ${leader.dominantNaics.desc}`;
        } else {
            cell.textContent = truncateText(leader.dominantType || "Unknown", 30);
            cell.title = leader.dominantType || "Unknown";
        }
        
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
    
    // Auto-load a dataset (SOCOM combined if possible)
    const socomPrimes = DATASETS.find(d => d.id === 'socom_primes');
    const socomSubs = DATASETS.find(d => d.id === 'socom');
    
    if (socomPrimes && socomSubs) {
        console.log("Automatically loading combined SOCOM dataset...");
        
        // Update the dropdown to show SOCOM as selected
        const datasetSelect = document.getElementById('dataset-select');
        if (datasetSelect) {
            // Look for the combined SOCOM option
            Array.from(datasetSelect.options).forEach(option => {
                if (option.value === `combined:${socomPrimes.id},${socomSubs.id}`) {
                    datasetSelect.value = option.value;
                }
            });
        }
        
        // Load combined datasets
        loadCombinedDatasets([socomPrimes.id, socomSubs.id]);
    } else if (socomPrimes) {
        console.log("Automatically loading SOCOM primes dataset...");
        
        // Update the dropdown to show SOCOM as selected
        const datasetSelect = document.getElementById('dataset-select');
        if (datasetSelect) {
            datasetSelect.value = 'socom_primes';
        }
        
        // Load the SOCOM dataset
        loadSingleDataset(socomPrimes);
    } else {
        console.log("SOCOM dataset not found in the DATASETS array");
    }
    
    console.log("Dashboard initialized.");
});

// Handle window resize events
window.addEventListener('resize', function() {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(function() {
       console.log("Window resized, redrawing charts...");
       
       // Clean up tooltips first
       cleanupTooltips();
       
       // Force charts to redraw after resize
       if (tavTcvChartInstance) {
           tavTcvChartInstance.resize();
       }
       
       // Redraw visualizations if data is available
       if (unifiedModel) {
           applyFiltersAndUpdateVisuals();
       } else if (rawData.primes.length > 0 || rawData.subs.length > 0) {
           applyFiltersAndUpdateVisuals();
       }
   }, 250); // Debounce for 250ms
});