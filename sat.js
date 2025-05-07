// Constants
const S3_BASE_URL = 'https://subhoodata.s3.us-east-1.amazonaws.com/data/';
const DATASETS = [
    // Prime contract datasets
    { id: 'army_primes', name: 'Army (Primes)', type: 'primes' },
    { id: 'dhs_primes', name: 'DHS (Primes)', type: 'primes' },
    { id: 'doj_primes', name: 'DOJ (Primes)', type: 'primes' },
    { id: 'epa_primes', name: 'EPA (Primes)', type: 'primes' },
    { id: 'navy_primes', name: 'Navy (Primes)', type: 'primes' },
    { id: 'socom_primes', name: 'SOCOM (Primes)', type: 'primes' },
    { id: 'uscc_primes', name: 'USCC (Primes)', type: 'primes' },
    { id: 'usmc_primes', name: 'USMC (Primes)', type: 'primes' },
    { id: 'va_primes', name: 'VA (Primes)', type: 'primes' },
    
    // Subcontract datasets
    { id: 'army', name: 'Army (Subs)', type: 'subs' },
    { id: 'navy', name: 'Navy (Subs)', type: 'subs' },
    { id: 'usmc', name: 'USMC (Subs)', type: 'subs' },
    { id: 'airforce', name: 'Air Force (Subs)', type: 'subs' },
    { id: 'dla', name: 'DLA (Subs)', type: 'subs' },
    { id: 'disa', name: 'DISA (Subs)', type: 'subs' },
    { id: 'mda', name: 'MDA (Subs)', type: 'subs' },
    { id: 'socom', name: 'SOCOM (Subs)', type: 'subs' },
    { id: 'uscc', name: 'USCC (Subs)', type: 'subs' },
    { id: 'hhs', name: 'HHS (Subs)', type: 'subs' },
    { id: 'va', name: 'VA (Subs)', type: 'subs' },
    { id: 'dhs', name: 'DHS (Subs)', type: 'subs' },
    { id: 'cbp', name: 'CBP (Subs)', type: 'subs' },
    { id: 'treasury', name: 'Treasury (Subs)', type: 'subs' },
    { id: 'epa', name: 'EPA (Subs)', type: 'subs' },
    { id: 'faa', name: 'FAA (Subs)', type: 'subs' },
    { id: 'doj', name: 'DOJ (Subs)', type: 'subs' },
    { id: 'doe', name: 'DOE (Subs)', type: 'subs' },
    { id: 'doc', name: 'DOC (Subs)', type: 'subs' },
    { id: 'dol', name: 'DOL (Subs)', type: 'subs' },
    { id: 'dos', name: 'DOS (Subs)', type: 'subs' },
    { id: 'dot', name: 'DOT (Subs)', type: 'subs' },
    { id: 'ssa', name: 'SSA (Subs)', type: 'subs' },
    { id: 'usda', name: 'USDA (Subs)', type: 'subs' },
    { id: 'nasa', name: 'NASA (Subs)', type: 'subs' },
    { id: 'md', name: 'Maryland (Subs)', type: 'subs' },
    { id: 'fas', name: 'FAS (Subs)', type: 'subs' },
    { id: 'gsa', name: 'GSA (Subs)', type: 'subs' },
    { id: 'darpa', name: 'DARPA (Subs)', type: 'subs' },
    { id: 'doi', name: 'DOI (Subs)', type: 'subs' }
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
let currentSearchTerm = ''

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
    
    // If already a Date object, return it
    if (dateString instanceof Date && !isNaN(dateString.getTime())) return dateString;
    
    try {
        // Common date formats found in USAspending data
        let date = null;
        
        // Try ISO 8601 format (YYYY-MM-DD)
        if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
            date = new Date(dateString);
            if (!isNaN(date.getTime())) return date;
        }
        
        // Try MM/DD/YYYY format
        if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const parts = dateString.split('/');
            date = new Date(parts[2], parts[0] - 1, parts[1]);
            if (!isNaN(date.getTime())) return date;
        }
        
        // Try date-fns if available
        if (typeof dateFns !== 'undefined') {
            const parsedDate = dateFns.parseISO(dateString);
            if (!isNaN(parsedDate.getTime())) return parsedDate;
        }
        
        // Last resort: browser's native parsing
        date = new Date(dateString);
        if (!isNaN(date.getTime())) return date;
        
        // Extra fallback for fiscal year format like "FY18" or "FY 2018"
        const fyMatch = dateString.match(/FY\s*(\d{2,4})/i);
        if (fyMatch) {
            let year = parseInt(fyMatch[1]);
            if (year < 100) year += 2000; // Assume 20xx for 2-digit years
            return new Date(year, 9, 1); // October 1st of the fiscal year (FY starts Oct 1 in US)
        }
        
        console.log(`Could not parse date: "${dateString}"`);
        return null;
    } catch (e) {
        console.error(`Error parsing date: "${dateString}"`, e);
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

    // Reset classes
    banner.className = '';
    
    // Add the type class
    banner.classList.add(type);

    // Check if this is a loading message we want to auto-fade
    const isLoadingMessage = (
        message.includes('Loading') || 
        message.includes('loaded') ||
        message.includes('data...') ||
        message.includes('Ready to load') ||
        (message.includes('Successfully') && message.includes('loaded'))
    );
    
    // Clear any existing timeout to prevent multiple fade animations
    if (banner._fadeTimeout) {
        clearTimeout(banner._fadeTimeout);
        banner._hideTimeout && clearTimeout(banner._hideTimeout);
    }
    
    // Show the banner
    banner.style.display = '';
    banner.style.opacity = '1';
    banner.style.transition = '';  // Reset transition
    
    // If it's a loading success message, fade it out after a delay
    if (isLoadingMessage && (type === 'success' || type === 'info')) {
        // Store the timeouts on the element itself for later clearing if needed
        banner._fadeTimeout = setTimeout(() => {
            // Start fade out animation
            banner.style.transition = 'opacity 1s ease-out';
            banner.style.opacity = '0';
            
            // After the fade completes, hide the element 
            banner._hideTimeout = setTimeout(() => {
                banner.style.display = 'none';
                // Reset the transition so it doesn't affect other status changes
                banner.style.transition = '';
                // Clear timeout references
                banner._fadeTimeout = null;
                banner._hideTimeout = null;
            }, 1000);
        }, 1500);  // Show for 1.5 seconds before beginning fade
    }

    // Enable/disable refresh button based on loading state
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.disabled = isLoading;
    }
}
function getCssVar(varName) {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) throw new Error(`Variable ${varName} returned empty`);
    return value;
  } catch (e) {
    console.warn(`Could not get CSS variable ${varName}: ${e.message}`);
    // Provide reasonable fallbacks based on your color scheme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Core colors
    if (varName === '--color-text-primary') return isDark ? '#F5F5F5' : '#222222';
    if (varName === '--color-text-secondary') return isDark ? '#C8C8C8' : '#555555';
    if (varName === '--color-text-tertiary') return isDark ? '#767077' : '#B3B3B3';
    if (varName === '--color-primary') return isDark ? '#A59FA8' : '#9A949B';
    if (varName === '--color-secondary') return isDark ? '#908A91' : '#7A747B';
    if (varName === '--color-background') return isDark ? '#1E1E1E' : '#F9F9F9';
    if (varName === '--color-surface') return isDark ? '#2B2B2B' : '#FFFFFF';
    if (varName === '--color-surface-container') return isDark ? '#444444' : '#F0F0F0';
    if (varName === '--color-surface-variant') return isDark ? '#5A5A5A' : '#E8E8E8';
    if (varName === '--color-border') return isDark ? '#444444' : '#DDDDDD';
    if (varName === '--color-outline') return isDark ? '#5A5A5A' : '#CCCCCC';
    
    // Chart-specific colors
    if (varName === '--chart-color-primary') return isDark ? '#A59FA8' : '#9A949B';
    if (varName === '--chart-color-secondary') return isDark ? '#908A91' : '#7A747B';
    if (varName === '--chart-color-tertiary') return isDark ? '#767077' : '#B6B1B7';
    
    console.error(`Fallback used for CSS variable ${varName}. Check definition.`);
    return '#cccccc'; // Generic fallback
  }
}
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
        placeholder.style.display = 'flex';
        placeholder.style.color = getCssVar('--color-text-tertiary');
        
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
        errorPlaceholder.className = 'error-placeholder';
        container.insertBefore(errorPlaceholder, container.firstChild);
    }
    errorPlaceholder.textContent = message;
    errorPlaceholder.style.display = 'flex';
    errorPlaceholder.style.color = getCssVar('--color-error');
    
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
    noDataPlaceholder.style.display = 'flex';
    noDataPlaceholder.style.color = getCssVar('--color-text-tertiary');
    
    // Hide main content
    const content = container.querySelector('table, canvas, svg');
    if(content) content.style.display = 'none';
    
    // Destroy chart instance if needed
    if (containerId === 'tav-tcv-chart-container' && tavTcvChartInstance) {
        tavTcvChartInstance.destroy();
        tavTcvChartInstance = null;
    }
}
function fetchDataFromS3(dataset) {
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
        // Process the CSV data
        processDataset(dataset, Papa.parse(csvText, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: 'greedy',
            transformHeader: header => header.trim()
        }).data);
    })
    .catch(error => {
        console.error(`Error fetching dataset ${dataset.name}:`, error);
        updateStatusBanner(`Error loading dataset: ${error.message}`, 'error');
        isLoading = false;
        document.getElementById('refresh-button').disabled = false;
    });
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
    
    // Reset search - Enhanced version
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        // Clear the input value
        searchInput.value = '';
        
        // Reset global search term variable
        currentSearchTerm = '';
        
        // Trigger any input event listeners
        if (typeof Event === 'function') {
            const event = new Event('input', {
                bubbles: true,
                cancelable: true,
            });
            searchInput.dispatchEvent(event);
        }
        
        // Find and click any clear button
        const clearBtn = document.getElementById('search-clear-btn');
        if (clearBtn) {
            // If the clear button has a click handler, trigger it
            clearBtn.click();
        } else {
            // If there's a clear button with a different ID or class
            const altClearBtn = document.querySelector('.search-clear-btn, button[aria-label="Clear search"]');
            if (altClearBtn) {
                altClearBtn.click();
            }
        }
        
        // Force a re-filter of the data if needed
        if (typeof applyFiltersAndUpdateVisuals === 'function') {
            // Delay slightly to ensure the search value change is processed
            setTimeout(applyFiltersAndUpdateVisuals, 50);
        }
    }
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
    
	displayForceDirectedRadial(filteredModel);
    
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
    // --- BEGIN INSERTED CODE ---

// Refine primeToSub relationships to ensure they link through filtered contracts
// Create a set of Prime IDs that are definitely included due to contracts passing ALL filters
const validPrimeIdsFromFilteredContracts = new Set();
Object.values(filtered.contracts).forEach(contract => {
    validPrimeIdsFromFilteredContracts.add(contract.primeId);
});

console.log(`Refining Prime-Sub relationships. Primes linked to filtered contracts: ${validPrimeIdsFromFilteredContracts.size}`);

// Filter the primeToSub relationships:
// Keep only those where the source (prime) is in our valid set
// AND the target (sub) exists in the already filtered subs list.
const fullyFilteredPrimeToSub = filtered.relationships.primeToSub.filter(rel =>
    validPrimeIdsFromFilteredContracts.has(rel.source) && // Prime MUST be linked to a contract that passed filters
    filtered.subs[rel.target]                             // Sub must also exist after its own filtering
);

console.log(`Original primeToSub count: ${filtered.relationships.primeToSub.length}, Fully filtered count: ${fullyFilteredPrimeToSub.length}`);

// Replace the potentially over-inclusive relationships in the model being returned
filtered.relationships.primeToSub = fullyFilteredPrimeToSub;

// Optional: Recalculate prime/sub values based only on these filtered relationships if needed downstream.
// Currently, Sankey likely uses the relationship value directly, so this might not be necessary.

// --- END INSERTED CODE ---

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

    // --- Remove old custom label/tooltip elements ---
    container.innerHTML = ''; // Clear previous content
    cleanupTooltips(); // Ensure old tooltips are gone

    // --- Create Canvas ---
    const canvas = document.createElement('canvas');
    canvas.id = 'tavTcvChart';
    container.appendChild(canvas);

    if (!chartData || chartData.length === 0) {
        displayNoData(containerId, 'No contracts found for TAV/TCV comparison.');
        return;
    }

    // --- Prepare Data for Stacked Chart ---
    const labels = chartData.map(d => d.primeName);
    const tavValues = chartData.map(d => d.tav || 0);
    const remainingTcvValues = chartData.map(d => Math.max(0, (d.tcv || 0) - (d.tav || 0)));
    const totalTcvValues = chartData.map(d => d.tcv || 0);

    // --- Get Theme Colors from CSS Variables ---
    const tavColor = getCssVar('--chart-color-primary');
    const remainderColor = getCssVar('--chart-color-tertiary');
    const textColor = getCssVar('--color-text-secondary');
    const gridColor = getCssVar('--color-border');
    const legendColor = getCssVar('--color-text-secondary');
    const barBorderColor = getCssVar('--color-surface');

    // --- Destroy previous chart instance if it exists ---
    if (tavTcvChartInstance) {
        try { tavTcvChartInstance.destroy(); } catch (e) { console.warn("Error destroying chart:", e); }
        tavTcvChartInstance = null;
    }

    // --- Create New Stacked Chart ---
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }

    tavTcvChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'TAV (Obligated)',
                    data: tavValues,
                    backgroundColor: tavColor,
                    borderColor: barBorderColor,
                    borderWidth: 1,
                    borderRadius: { topLeft: 4, bottomLeft: 4, topRight: 0, bottomRight: 0 },
                    borderSkipped: false,
                },
                {
                    label: 'TCV Remainder',
                    data: remainingTcvValues,
                    backgroundColor: remainderColor,
                    borderColor: barBorderColor,
                    borderWidth: 1,
                    borderRadius: { topRight: 4, bottomRight: 4, topLeft: 0, bottomLeft: 0 },
                    borderSkipped: false,
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { left: 5, right: 10, top: 5, bottom: 5 }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: legendColor,
                        boxWidth: 12,
                        padding: 20,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: getCssVar('--color-surface'),
                    titleColor: getCssVar('--color-text-secondary'),
                    bodyColor: getCssVar('--color-text-primary'),
                    footerColor: getCssVar('--color-text-primary'),
                    borderColor: getCssVar('--color-border'),
                    borderWidth: 1,
                    padding: 10,
                    boxPadding: 3,
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed.x;
                            return `${datasetLabel}: ${formatConciseCurrency(value)}`;
                        },
                        footer: function(tooltipItems) {
                            const dataIndex = tooltipItems[0]?.dataIndex;
                            if (dataIndex === undefined) return '';
                            const totalTCV = totalTcvValues[dataIndex];
                            return `Total TCV: ${formatConciseCurrency(totalTCV)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: gridColor,
                        drawBorder: false,
                        lineWidth: 0.5
                    },
                    ticks: {
                        color: textColor,
                        font: { size: 10 },
                        callback: function(value) {
                            return formatConciseCurrency(value).replace('~','');
                        },
                        maxTicksLimit: 6
                    }
                },
                y: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: true,
                        color: textColor,
                        font: { size: 11 },
                        callback: function(value, index) {
                            const label = labels[index] || '';
                            return label.length > 30 ? label.substring(0, 27) + '...' : label;
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const dataIndex = elements[0].index;
                    const contractId = chartData[dataIndex]?.id;
                    if (contractId) {
                        window.open(`https://www.usaspending.gov/award/${contractId}`, '_blank');
                    }
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            }
        }
    });
}
// Add this function to your JavaScript file

/**
 * Exports data to a CSV file and triggers a download
 * @param {Array} data - Array of objects to convert to CSV
 * @param {String} filename - Name of the file to download
 */
function exportToCSV(data, filename) {
    // Return if no data
    if (!data || !data.length) {
        console.warn('No data to export');
        return;
    }

    // Get headers from the first data object
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(item => {
        const row = headers.map(header => {
            // Get the value for this header
            let value = item[header] || '';
            
            // Format dates if needed
            if (header.includes('date') && value instanceof Date) {
                value = value.toISOString().split('T')[0]; // YYYY-MM-DD format
            }
            
            // Handle commas and quotes in the value (CSV escape)
            const cellValue = String(value).replace(/"/g, '""');
            
            // Wrap in quotes if the value contains commas, quotes, or newlines
            return /[",\n\r]/.test(cellValue) ? `"${cellValue}"` : cellValue;
        }).join(',');
        
        csvContent += row + '\n';
    });
    
    // Create a Blob containing the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Add link to document, click it, then remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Modify your displayExpiringTable function to include an export button
 * @param {Array} expiringData - Array of expiring contract data
 */
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

    // Create header section with export button
    const headerSection = document.createElement('div');
    headerSection.style.display = 'flex';
    headerSection.style.justifyContent = 'flex-end';
    headerSection.style.marginBottom = '8px';
    
    // Create the export button
    const exportButton = document.createElement('button');
    exportButton.className = 'button';
    exportButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Export CSV
    `;
    exportButton.style.display = 'flex';
    exportButton.style.alignItems = 'center';
    exportButton.style.gap = '6px';
    
    // Add click event to export button
    exportButton.addEventListener('click', () => {
        // Clone the data and clean it for export
        const exportData = expiringData.map(contract => {
            // Create a clean object for export - select only the fields you want
            return {
                contract_id: contract.award_id_piid || contract.contract_award_unique_key || '',
                contractor_name: contract.recipient_name || '',
                description: contract.transaction_description || '',
                end_date: contract.formatted_end_date || 
                    (contract.period_of_performance_current_end_date_parsed instanceof Date ? 
                     contract.period_of_performance_current_end_date_parsed.toISOString().split('T')[0] : 
                     contract.period_of_performance_current_end_date || ''),
                value: typeof contract.current_total_value_of_award === 'number' ? 
                       contract.current_total_value_of_award : 
                       parseFloat(contract.current_total_value_of_award || 0),
                naics_code: contract.naics_code || '',
                naics_description: contract.naics_description || ''
            };
        });
        
        // Get current date for filename
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Export the data
        exportToCSV(exportData, `expiring-contracts-${dateStr}.csv`);
    });
    
    // Add export button to header section
    headerSection.appendChild(exportButton);
    container.appendChild(headerSection);

    // Create Table Structure
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.style.overflow = 'auto';
    tableWrapper.style.maxHeight = '300px';

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y';

    const thead = table.createTHead();
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
                    link.style.color = getCssVar('--color-primary');
                    link.textContent = 'View';
                    cell.appendChild(link);
                } else {
                    cell.textContent = '-';
                    cell.style.color = getCssVar('--color-text-tertiary');
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
            
            // Apply proper text color based on content
            if (value === '-') {
                cell.style.color = getCssVar('--color-text-tertiary');
            } else {
                cell.style.color = getCssVar('--color-text-primary');
            }
        });
    });

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // Add summary text
    const summaryPara = document.createElement('p');
    summaryPara.className = 'summary-text';
    summaryPara.style.color = getCssVar('--color-text-secondary');
    summaryPara.textContent = `Showing ${expiringData.length} expiring contracts.`;
    container.appendChild(summaryPara);
}
function getCssVar(varName) {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) throw new Error(`Variable ${varName} returned empty`);
    return value;
  } catch (e) {
    console.warn(`Could not get CSS variable ${varName}: ${e.message}`);
    // Fallbacks for Monocle/Print theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
     if (varName === '--color-text-secondary') return isDark ? '#B6B1B7' : '#625C61';
     if (varName === '--color-border') return isDark ? '#312d2a' : '#D8D4D7';
     if (varName === '--chart-color-primary') return isDark ? '#A59FA8' : '#9A949B';
     if (varName === '--chart-color-secondary') return isDark ? '#908A91' : '#7A747B';
     if (varName === '--chart-color-tertiary') return isDark ? '#767077' : '#B6B1B7';
     if (varName === '--color-surface') return isDark ? '#262321' : '#F5F3F5';
     if (varName === '--color-text-primary') return isDark ? '#FDFBF5' : '#312d2a';
     if (varName === '--shadow-md') return isDark ? '0 2px 4px rgba(0, 0, 0, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.08)';
     if (varName === '--border-radius-sm') return '8px'; // Or 6px if you used tighter radii
     if (varName === '--color-primary') return isDark ? '#A59FA8' : '#9A949B';
    console.error(`Fallback used for CSS variable ${varName}. Check definition.`);
    return '#cccccc';
  }
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
    
    setLoading(containerId, false);

    if (!mapData || Object.keys(mapData).length === 0) {
        displayNoData(containerId, 'No geographic data available for mapping.');
        return;
    }

    try {
        // Set up map dimensions based on the container div
        const width = container.clientWidth;
        const height = container.clientHeight || 400;

        // Check if dimensions are valid
        if (width <= 0 || height <= 0) {
            console.warn(`Map container has invalid dimensions: ${width}x${height}. Map rendering skipped.`);
            displayError(containerId, 'Map container has zero size. Cannot render map.');
            return;
        }

        // Check if we're in dark mode
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = getCssVar('--color-text-secondary');

        // Create SVG element inside the map div
        const svg = d3.select(mapDiv)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('max-width', '100%')
            .style('height', 'auto');

        // Define color scale for the map
        const stateValues = Object.values(mapData).map(d => d.value);
        const maxValue = d3.max(stateValues) || 0;
        
        // DEBUG: Let's verify the values we're using for coloring
        console.log('State values range:', d3.min(stateValues), 'to', maxValue);
        
        // Get color values directly rather than using CSS vars for the interpolation
        const baseColor = isDarkMode ? 
            d3.rgb(getCssVar('--color-surface-variant')).toString() : 
            d3.rgb(getCssVar('--color-surface-variant')).toString();
            
        const highlightColor = isDarkMode ?
            d3.rgb(getCssVar('--chart-color-primary')).toString() :
            d3.rgb(getCssVar('--chart-color-primary')).toString();
        
        console.log('Color scale range:', baseColor, 'to', highlightColor);

        // Create explicit color scale using the extracted RGB values
        const colorScale = d3.scaleSequential()
            .domain([0, maxValue === 0 ? 1 : maxValue])
            .interpolator(d3.interpolate(baseColor, highlightColor));

        // Test the color scale with a few values
        if (maxValue > 0) {
            console.log('Color at 0:', colorScale(0));
            console.log('Color at max/2:', colorScale(maxValue/2));
            console.log('Color at max:', colorScale(maxValue));
        }

        // Remove existing tooltips first
        d3.select("body").selectAll(".map-tooltip").remove();
        
        // Create tooltip - attach to body for better positioning
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "map-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("opacity", 0)
            .style("background-color", getCssVar('--color-surface'))
            .style("color", getCssVar('--color-text-primary'))
            .style("padding", "10px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("border", `1px solid ${getCssVar('--color-border')}`)
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
                const states = topojson.feature(us, us.objects.states);
                
                // DEBUG: Create a mapping of IDs to verify correct state matching
                const stateIdMap = {};
                states.features.forEach(feature => {
                    stateIdMap[feature.id] = feature.id.toString().padStart(2, '0');
                });
                console.log('Available state IDs in GeoJSON:', stateIdMap);
                console.log('Sample of our data state codes:', Object.keys(mapData).slice(0, 5));

                // Create projection
                const projection = d3.geoAlbersUsa()
                    .fitSize([width, height], states);

                // Create the path generator
                const path = d3.geoPath().projection(projection);

                // Draw state boundaries
                svg.append('g')
                   .selectAll('path')
                   .data(states.features)
                   .enter()
                   .append('path')
                   .attr('d', path)
                   .attr('fill', d => {
                       // Use the state FIPS code to lookup data
                       const fipsCode = d.id.toString().padStart(2, '0');
                       const stateData = mapData[fipsCode];
                       
                       // DEBUG: Show what color is being assigned
                       if (stateData) {
                           console.log(`State ${fipsCode}: value=${stateData.value}, color=${colorScale(stateData.value)}`);
                       }
                       
                       return stateData ? colorScale(stateData.value) : getCssVar('--color-surface-variant');
                   })
                   .attr('stroke', getCssVar('--color-border'))
                   .attr('stroke-width', 0.5)
                   .style('cursor', 'pointer')
                   .on('mouseover', function(event, d) {
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
                           .attr("stroke", getCssVar('--color-primary'))
                           .attr("stroke-width", 1.5)
                           .raise();
                   })
                   .on('mousemove', function(event) {
                       tooltip
                          .style("left", (event.pageX + 10) + "px")
                          .style("top", (event.pageY - 28) + "px");
                   })
                   .on('mouseout', function() {
                       tooltip
                          .style("visibility", "hidden")
                          .style("opacity", 0);
                              
                       d3.select(this)
                           .attr("stroke", getCssVar('--color-border'))
                           .attr("stroke-width", 0.5);
                   });

                // Add legend
                const legendWidth = Math.min(width * 0.4, 200);
                const legendHeight = 10;
                const legendX = width - legendWidth - 20;
                const legendY = height - 35;

                const legendGroup = svg.append("g")
                    .attr("transform", `translate(${legendX}, ${legendY})`);

                // Create discrete color bins
                const numBins = 5;
                const binMaxValue = maxValue === 0 ? 1 : maxValue;
                const bins = Array.from({length: numBins}, (_, i) => binMaxValue * i / (numBins - 1));
                const binWidth = legendWidth / numBins;

                // Add legend title
                legendGroup.append('text')
                    .attr('x', legendWidth / 2)
                    .attr('y', -6)
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
                    .attr('stroke', getCssVar('--color-border'))
                    .attr('stroke-width', 0.5);

                // Add min/max labels
                legendGroup.append('text')
                    .attr('x', 0)
                    .attr('y', legendHeight + 10)
                    .attr('text-anchor', 'start')
                    .attr('font-size', '10px')
                    .attr('fill', textColor)
                    .text('Low');

                legendGroup.append('text')
                    .attr('x', legendWidth)
                    .attr('y', legendHeight + 10)
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
        // Collect all prime contract data for ARR calculation
        const contracts = [];
        
        // Get contracts from the model
        Object.values(model.contracts).forEach(contract => {
            // Skip contracts without value
            if (!contract.value || contract.value <= 0) return;
            
            // Extract the raw data
            const row = contract.raw;
            if (!row) return;
            
            // Get period of performance dates
            const startDate = row.period_of_performance_start_date;
            const endDate = row.period_of_performance_current_end_date;
            
            // Calculate duration if dates are available
            let durationDays = 0;
            if (startDate && endDate) {
                durationDays = calculateDurationDays(startDate, endDate);
            }
            
            // Add to contracts array if there's a valid duration
            if (durationDays > 0) {
                contracts.push({
                    value: contract.value,
                    durationDays: durationDays
                });
            }
        });
        
        console.log(`Found ${contracts.length} contracts with valid dates and values for ARR calculation`);
        
        if (contracts.length === 0) {
            loadingDiv.style.display = 'none';
            noDataDiv.style.display = 'block';
            resultDiv.textContent = formatConciseCurrency(0) + " / yr";
            resultDiv.style.display = 'block';
            return;
        }
        
        // Calculate simple ARR for each contract and average them
        let totalAnnualizedValue = 0;
        contracts.forEach(contract => {
            const annualizedValue = (contract.value / contract.durationDays) * 365.25;
            totalAnnualizedValue += annualizedValue;
        });
        
        const averageARR = totalAnnualizedValue / contracts.length;
        
        // Display the result
        resultDiv.textContent = formatConciseCurrency(averageARR) + " / yr";
        resultDiv.style.display = 'block';
        loadingDiv.style.display = 'none';
        noDataDiv.style.display = 'none';
        
        console.log(`Calculated ARR: ${formatCurrency(averageARR)} from ${contracts.length} contracts`);
        
    } catch (error) {
        console.error("Error calculating ARR:", error);
        errorDiv.textContent = `Error calculating ARR: ${error.message}`;
        errorDiv.style.display = 'block';
        resultDiv.style.display = 'none';
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
    refreshButton.addEventListener('click', function() {
        // Clear search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
            currentSearchTerm = ''; // Reset tracking variable
            
            // Trigger input event to ensure listeners are notified
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            searchInput.dispatchEvent(inputEvent);
            
            // Also try to trigger clear button if it exists
            const clearBtn = document.querySelector('#search-clear-btn, .search-clear-btn');
            if (clearBtn) {
                clearBtn.style.display = 'none'; // Hide the clear button
            }
        }
        
        // Get the currently selected dataset from the dropdown
        const datasetSelect = document.getElementById('dataset-select');
        if (datasetSelect && datasetSelect.value) {
            const selectedValue = datasetSelect.value;
            
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
                    updateStatusBanner(`Invalid dataset selected: ${selectedValue}`, 'error');
                }
            }
        } else {
            updateStatusBanner("Please select a dataset first", "info");
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
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'block';
            }
            
            // Force immediate update of all charts with theme-aware colors
            setTimeout(updateChartsForTheme, 50);
        });
    }
}
function updateTooltipThemes(isDarkMode) {
    // Update tooltips for the current theme using CSS variables
    const tooltipSelectors = [
        '#sankey-tooltip', 
        '.sankey-tooltip', 
        '#tav-tcv-tooltip', 
        '.map-tooltip'
    ];
    
    tooltipSelectors.forEach(selector => {
        const tooltips = document.querySelectorAll(selector);
        tooltips.forEach(tooltip => {
            tooltip.style.backgroundColor = getCssVar('--color-surface');
            tooltip.style.color = getCssVar('--color-text-primary');
            tooltip.style.border = `1px solid ${getCssVar('--color-border')}`;
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
    const headerRow = thead.insertRow();
    const headers = [
        { text: 'Recipient', scope: 'col' },
        { text: 'Total Value', scope: 'col', class: 'number' },
        { text: 'Awards', scope: 'col', class: 'number' },
        { text: 'Avg Value', scope: 'col', class: 'number' },
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
        cell.className = 'font-medium';
        cell.style.color = getCssVar('--color-text-primary');
        cell.textContent = truncateText(leader.siName, 35);
        cell.title = leader.siName;
        
        // Total Value
        cell = row.insertCell();
        cell.className = 'number font-bold';
        cell.style.color = getCssVar('--color-text-primary');
        cell.textContent = formatCurrency(leader.totalValue);
        
        // Num Awards
        cell = row.insertCell();
        cell.className = 'number';
        cell.style.color = getCssVar('--color-text-secondary');
        cell.textContent = leader.numAwards.toLocaleString();
        
        // Avg Value
        cell = row.insertCell();
        cell.className = 'number';
        cell.style.color = getCssVar('--color-text-secondary');
        cell.textContent = formatCurrency(leader.avgValue);
        
        // Dominant Type/NAICS
        cell = row.insertCell();
        cell.className = 'text-xs';
        cell.style.color = getCssVar('--color-text-secondary');
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
                link.style.color = getCssVar('--color-primary');
                link.textContent = 'View';
                cell.appendChild(link);
            } 
            // If there are multiple contracts, note that
            else {
                cell.textContent = `${leader.uniqueContractKeys.length} contracts`;
                cell.style.color = getCssVar('--color-text-secondary');
            }
        } else {
            cell.textContent = '-';
            cell.style.color = getCssVar('--color-text-tertiary');
        }
    });
    
    // Append the table to the wrapper
    tableWrapper.appendChild(table);
    
    // Append the wrapper to the container
    container.appendChild(tableWrapper);
    
    // Add summary text if more leaders exist
    if (leaderData.length > 10) {
        const summaryPara = document.createElement('p');
        summaryPara.className = 'summary-text';
        summaryPara.style.color = getCssVar('--color-text-secondary');
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
// Main visualization function
function displayForceDirectedRadial(model) {
    const containerId = 'circular-dendrogram-container';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error("Container not found.");
        return;
    }

    // Clear any previous content
    container.innerHTML = '';
    
    setLoading(containerId, false);
    
    // Check if we have valid model data
    if (!model || !Object.keys(model.agencies).length) {
        displayNoData(containerId, 'No data available for hierarchical visualization.');
        return;
    }
    
    try {
        // Create SVG container
        const width = container.clientWidth;
        const height = Math.max(500, container.clientHeight);
        
        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height);
            
        // Add a group for the visualization
        const g = svg.append("g")
            .attr("transform", `translate(${width/2}, ${height/2})`);
            
        // Create hierarchical data
        const hierarchyData = createHierarchyData(model);
        
        // Calculate node size based on value
        function calculateNodeSize(type, value) {
            // Base radius by type
            const baseRadius = type === 'agency' ? 8 : 
                              type === 'prime' ? 6 : 4;
            
            // Scale by value (use log scale to handle wide range of values)
            if (value && value > 0) {
                // Minimum size is the base radius
                // Maximum size is 3x the base radius for largest values
                const scaleFactor = Math.log10(value) / 8; // Adjust divisor to taste
                return baseRadius * (1 + Math.min(2, scaleFactor));
            }
            
            return baseRadius;
        }
        
        // Set up force simulation
        const simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(d => {
                // Shorter distances for subcontractor links
                return d.source.type === 'prime' ? 50 : 80;
            }))
            .force("charge", d3.forceManyBody().strength(d => {
                // Stronger repulsion for bigger nodes 
                return d.type === 'agency' ? -400 : 
                      d.type === 'prime' ? -200 : -50;
            }))
            .force("center", d3.forceCenter(0, 0))
            .force("collide", d3.forceCollide(d => {
                if (d.type === 'root') return 0;
                
                // Calculate node radius based on value
                const nodeRadius = calculateNodeSize(d.type, d.value);
                
                // Add padding for text
                const textPadding = d.type !== 'sub' ? 
                    Math.min(d.name.length * 3, 60) : 0;
                    
                return nodeRadius + textPadding;
            }).strength(0.8))
            .force("radial", d3.forceRadial(d => d.depth * 100, 0, 0).strength(1));
            
        // Convert hierarchical data to nodes and links for force layout
        const nodes = [];
        const links = [];
        
        // Process nodes recursively
        function processNode(node, parent = null, depth = 0) {
            const id = node.name + (Math.random().toString(36).substring(2, 5));
            
            const newNode = {
                id: id,
                name: node.name,
                value: node.value || 0,
                depth: depth,
                type: depth === 0 ? 'root' : depth === 1 ? 'agency' : depth === 2 ? 'prime' : 'sub'
            };
            
            nodes.push(newNode);
            
            // Add link to parent if not root
            if (parent) {
                links.push({
                    source: parent.id,
                    target: id,
                    value: node.value || 1
                });
            }
            
            // Process children
            if (node.children) {
                node.children.forEach(child => {
                    processNode(child, newNode, depth + 1);
                });
            }
            
            return newNode;
        }
        
        // Start processing from root
        processNode(hierarchyData);
        
        // Create links
        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke", d => {
                if (d.source.type === 'root') return getCssVar('--color-border');
                if (d.source.type === 'agency') return getCssVar('--chart-color-primary');
                if (d.source.type === 'prime') return getCssVar('--chart-color-secondary');
                return getCssVar('--chart-color-tertiary');
            })
            .attr("stroke-width", d => Math.max(0.5, Math.min(3, Math.sqrt(d.value) / 10000)))
            .attr("stroke-opacity", 0.6);
            
        // Create node groups
        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
                
        // Add circles to nodes with size proportional to value
        node.append("circle")
            .attr("r", d => {
                if (d.type === 'root') return 0; // Hide root
                return calculateNodeSize(d.type, d.value);
            })
            .attr("fill", d => {
                if (d.type === 'agency') return getCssVar('--chart-color-primary');
                if (d.type === 'prime') return getCssVar('--chart-color-secondary');
                return getCssVar('--chart-color-tertiary');
            })
            .attr("stroke", getCssVar('--color-surface'))
            .attr("stroke-width", 1);
            
        // Add labels to nodes - showing all labels with appropriate opacity
        // and positioning based on which side of the circle they are
        node.append("text")
            .attr("opacity", d => {
                // Show all labels by default, with different opacity levels
                return d.type === 'agency' ? 1 : 
                       d.type === 'prime' ? 0.9 : 0.7; // Show sub labels at 0.7 opacity
            })
            .text(d => {
                if (d.type === 'root') return "";
                // Truncate text based on node type
                if (d.type === 'agency' && d.name.length > 30) return d.name.substring(0, 27) + "...";
                if (d.type === 'prime' && d.name.length > 25) return d.name.substring(0, 22) + "...";
                if (d.type === 'sub' && d.name.length > 20) return d.name.substring(0, 17) + "...";
                return d.name;
            })
            .attr("fill", getCssVar('--color-text-primary'))
            .attr("font-size", d => {
                if (d.type === 'agency') return "12px";
                if (d.type === 'prime') return "11px";
                return "10px";
            })
            .attr("dy", "0.32em");
            
        // Add hover interactions for highlighting
        node.on("mouseover", function(event, d) {
            // Highlight current node
            d3.select(this).select("circle")
                .attr("stroke", getCssVar('--chart-color-primary'))
                .attr("stroke-width", 2);
                
            d3.select(this).select("text")
                .attr("opacity", 1)
                .attr("font-weight", "bold");
                
            // Highlight connected links and nodes
            link.attr("stroke-opacity", l => 
                (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
                
            node.filter(n => n.id !== d.id)
                .attr("opacity", n => {
                    // Check if this node is connected to the selected node
                    const isConnected = links.some(l => 
                        (l.source.id === d.id && l.target.id === n.id) || 
                        (l.target.id === d.id && l.source.id === n.id));
                    
                    return isConnected ? 1 : 0.3;
                });
        })
        .on("mouseout", function() {
            // Reset highlights
            node.select("circle")
                .attr("stroke", getCssVar('--color-surface'))
                .attr("stroke-width", 1);
                
            node.select("text")
                .attr("opacity", d => {
                    return d.type === 'agency' ? 1 : 
                           d.type === 'prime' ? 0.9 : 0.7;
                })
                .attr("font-weight", "normal");
                
            // Reset link opacity
            link.attr("stroke-opacity", 0.6);
            
            // Reset node opacity
            node.attr("opacity", 1);
        });
            
        // Add tooltips with value information
        node.append("title")
            .text(d => {
                const valueText = d.value ? formatCurrency(d.value) : "Value not available";
                return `${d.name}\n${valueText}`;
            });
            
        // Add color legend
        const colorLegend = svg.append("g")
            .attr("transform", `translate(20, 20)`);
            
        const colorLegendData = [
            { label: "Agency", color: getCssVar('--chart-color-primary') },
            { label: "Prime Contractor", color: getCssVar('--chart-color-secondary') },
            { label: "Subcontractor", color: getCssVar('--chart-color-tertiary') }
        ];
        
        colorLegendData.forEach((item, i) => {
            const g = colorLegend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
                
            g.append("rect")
                .attr("width", 14)
                .attr("height", 14)
                .attr("fill", item.color);
                
            g.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .attr("font-size", "12px")
                .attr("fill", getCssVar('--color-text-secondary'))
                .text(item.label);
        });
            
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);
            
        // Set up simulation tick
        simulation
            .nodes(nodes)
            .on("tick", ticked);
            
        simulation.force("link")
            .links(links);
            
        // Functions for simulation
        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
                
            node.attr("transform", d => `translate(${d.x},${d.y})`);
            
            // Update text position based on node position relative to center
            node.select("text")
                .attr("x", d => {
                    // Calculate which side of the center the node is on
                    const nodeRadius = calculateNodeSize(d.type, d.value);
                    
                    // If on the left side of the visualization
                    if (d.x < 0) {
                        return -nodeRadius - 5; // Position text to the left of the node
                    } else {
                        return nodeRadius + 5; // Position text to the right of the node
                    }
                })
                .attr("text-anchor", d => d.x < 0 ? "end" : "start");
        }
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
    } catch (error) {
        console.error("Error creating force-directed visualization:", error);
        displayError(containerId, `Failed to render visualization: ${error.message}`);
    }
}

// Helper function to create hierarchical data from unified model
function createHierarchyData(model) {
    // Create root node
    const root = {
        name: "All Contracts",
        children: []
    };
    
    // Add top agencies (by value)
    const agencies = Object.values(model.agencies)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Limit to top 6 agencies
        
    agencies.forEach(agency => {
        const agencyNode = {
            name: agency.name,
            value: agency.value,
            children: []
        };
        
        // Find top primes for this agency
        const primesForAgency = {};
        
        // Get agency to prime relationships
        model.relationships.agencyToPrime.forEach(rel => {
            if (rel.source === agency.id) {
                const primeId = rel.target;
                if (!primesForAgency[primeId]) {
                    primesForAgency[primeId] = 0;
                }
                primesForAgency[primeId] += rel.value;
            }
        });
        
        // Sort primes by value and take top 8
        const topPrimes = Object.entries(primesForAgency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([primeId, value]) => ({
                id: primeId,
                value: value
            }));
            
        // Add prime contractor nodes
        topPrimes.forEach(prime => {
            const primeData = model.primes[prime.id];
            if (!primeData) return;
            
            const primeNode = {
                name: primeData.name,
                value: prime.value,
                children: []
            };
            
            // Find subs for this prime
            const subsForPrime = {};
            
            // Get prime to sub relationships
            model.relationships.primeToSub.forEach(rel => {
                if (rel.source === prime.id) {
                    const subId = rel.target;
                    if (!subsForPrime[subId]) {
                        subsForPrime[subId] = 0;
                    }
                    subsForPrime[subId] += rel.value;
                }
            });
            
            // Sort subs by value and take top 5
            const topSubs = Object.entries(subsForPrime)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([subId, value]) => ({
                    id: subId,
                    value: value
                }));
                
            // Add sub nodes
            topSubs.forEach(sub => {
                const subData = model.subs[sub.id];
                if (!subData) return;
                
                primeNode.children.push({
                    name: subData.name,
                    value: sub.value
                });
            });
            
            // Modified: Always add prime if it has significant value, regardless of whether it has subs
            if (prime.value > 100000) {
                agencyNode.children.push(primeNode);
            }
        });
        
        // Modified: Always add agency if it has prime contractors with significant value
        if (agencyNode.children.length > 0) {
            root.children.push(agencyNode);
        }
    });
    
    // Add a check for empty visualization
    if (root.children.length === 0) {
        // Create a dummy agency and prime to ensure something displays
        root.children.push({
            name: "Selected Agency",
            value: 1000000,
            children: [{
                name: "No Subcontractor Relationships",
                value: 1000000,
                children: []
            }]
        });
    }
    
    return root;
}
function initializeSankeyFilters() {
  // Find the existing filter container - this is where your current filters are located
  const filtersContainer = document.querySelector('div[style*="display: flex; flex-direction: column"]');
  
  if (!filtersContainer) {
    console.error("Filter container not found, cannot add Sankey visualization options");
    return;
  }
  
  // Create a heading for Sankey visualization options
  const sankeyHeading = document.createElement('h2');
  sankeyHeading.style.fontSize = '14px';
  sankeyHeading.style.margin = '0';
  sankeyHeading.textContent = 'Sankey Visualization';
  
  // Create the agency field selector
  const agencyFieldSelect = document.createElement('select');
  agencyFieldSelect.id = 'sankey-agency-field';
  agencyFieldSelect.className = 'input-select';
  agencyFieldSelect.style.width = '100%';
  
  // Add options for agency field
  agencyFieldSelect.innerHTML = `
    <option value="agencyName">Agency</option>
    <option value="subAgencyName" selected>Sub-Agency</option>
    <option value="officeName">Office</option>
  `;
  
  // Create the contractor field selector
  const contractorFieldSelect = document.createElement('select');
  contractorFieldSelect.id = 'sankey-contractor-field';
  contractorFieldSelect.className = 'input-select';
  contractorFieldSelect.style.width = '100%';
  
  // Add options for contractor field
  contractorFieldSelect.innerHTML = `
    <option value="primeName" selected>Prime Contractors</option>
    <option value="subName">Subcontractors</option>
  `;
  
  // Add the refresh button to the container for reference
  const refreshButton = document.getElementById('refresh-button');
  
  // Insert Sankey controls before the refresh button and after the NAICS filter
  if (refreshButton && refreshButton.parentNode) {
    // Insert before the status banner
    const statusBanner = document.getElementById('status-banner');
    if (statusBanner) {
      filtersContainer.insertBefore(sankeyHeading, statusBanner);
      filtersContainer.insertBefore(agencyFieldSelect, statusBanner);
      filtersContainer.insertBefore(contractorFieldSelect, statusBanner);
    } else {
      // Fallback, insert before refresh button
      filtersContainer.insertBefore(sankeyHeading, refreshButton);
      filtersContainer.insertBefore(agencyFieldSelect, refreshButton);
      filtersContainer.insertBefore(contractorFieldSelect, refreshButton);
    }
  } else {
    // If refresh button not found, just append to the end
    filtersContainer.appendChild(sankeyHeading);
    filtersContainer.appendChild(agencyFieldSelect);
    filtersContainer.appendChild(contractorFieldSelect);
  }
  
  // Add event listeners to update visualization when options change
  agencyFieldSelect.addEventListener('change', applyFiltersAndUpdateVisuals);
  contractorFieldSelect.addEventListener('change', applyFiltersAndUpdateVisuals);
}

// Process data for the left Sankey panel based on selection
function processSankeyDataForLeftPanel(model, selectedField) {
  // Filter to top relationships by value
  const topAgencyToPrime = model.relationships.agencyToPrime
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
      
  const nodes = [];
  const links = [];
  const nodeMap = {};
  
  // Field types to entity types mapping
  const fieldToEntityType = {
    'agencyName': 'agency',
    'subAgencyName': 'subagency',
    'officeName': 'office',
    'primeName': 'prime'
  };
  
  // Get appropriate field name from the entity based on selection
  const getEntityName = (entityId, type) => {
    if (type === 'prime') {
      return model.primes[entityId]?.name || 'Unknown';
    }
    
    // For agency entities, determine based on selected field
    switch (selectedField) {
      case 'agencyName':
        return model.agencies[entityId]?.name || 'Unknown Agency';
      case 'subAgencyName':
        return model.subAgencies[entityId]?.name || 'Unknown Sub-Agency';
      case 'officeName':
        return model.offices[entityId]?.name || 'Unknown Office';
      default:
        return 'Unknown';
    }
  };
  
  // Get appropriate source entity ID based on selection
  const getSourceEntityId = (linkData) => {
    const contract = model.contracts[linkData.contractId];
    if (!contract) return null;
    
    switch (selectedField) {
      case 'agencyName':
        return contract.agencyId;
      case 'subAgencyName':
        return contract.subAgencyId;
      case 'officeName':
        return contract.officeId;
      default:
        return contract.subAgencyId; // Default to sub-agency
    }
  };
  
  // Process each relationship
  topAgencyToPrime.forEach(link => {
    const sourceId = getSourceEntityId(link);
    const targetId = link.target; // Prime ID
    
    if (!sourceId || !targetId) return;
    
    // Get entity name based on type and add node if not already added
    const sourceName = getEntityName(sourceId, fieldToEntityType[selectedField]);
    const targetName = getEntityName(targetId, 'prime');
    
    // Add source node if not yet added
    if (!nodeMap[sourceId]) {
      const nodeIndex = nodes.length;
      nodes.push({
        name: truncateText(sourceName, 30),
        id: sourceId,
        type: fieldToEntityType[selectedField],
        index: nodeIndex
      });
      nodeMap[sourceId] = nodeIndex;
    }
    
    // Add target node if not yet added
    if (!nodeMap[targetId]) {
      const nodeIndex = nodes.length;
      nodes.push({
        name: truncateText(targetName, 30),
        id: targetId,
        type: 'prime',
        index: nodeIndex
      });
      nodeMap[targetId] = nodeIndex;
    }
    
    // Add link
    links.push({
      source: nodeMap[sourceId],
      target: nodeMap[targetId],
      value: link.value
    });
  });
  
  return { nodes, links };
}

// Process data for the right Sankey panel based on selection
function processSankeyDataForRightPanel(model, selectedField) {
  // Filter to top relationships by value
  const topPrimeToSub = model.relationships.primeToSub
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
      
  const nodes = [];
  const links = [];
  const nodeMap = {};
  
  // If no subcontract data, return empty arrays
  if (topPrimeToSub.length === 0) {
    return { nodes, links };
  }
  
  // Field types to entity types mapping
  const fieldToEntityType = {
    'primeName': 'prime',
    'subName': 'sub'
  };
  
  // Get entity name based on type
  const getEntityName = (entityId, type) => {
    if (type === 'prime') {
      return model.primes[entityId]?.name || 'Unknown Prime';
    } else if (type === 'sub') {
      return model.subs[entityId]?.name || 'Unknown Sub';
    }
    return 'Unknown';
  };
  
  // Process each relationship
  topPrimeToSub.forEach(link => {
    const sourceId = link.source; // Prime ID
    const targetId = link.target; // Sub ID
    
    // Get entity names
    const sourceName = getEntityName(sourceId, 'prime');
    const targetName = getEntityName(targetId, 'sub');
    
    // Add source node if not yet added
    if (!nodeMap[sourceId]) {
      const nodeIndex = nodes.length;
      nodes.push({
        name: truncateText(sourceName, 30),
        id: sourceId,
        type: 'prime',
        index: nodeIndex
      });
      nodeMap[sourceId] = nodeIndex;
    }
    
    // Add target node if not yet added
    if (!nodeMap[targetId]) {
      const nodeIndex = nodes.length;
      nodes.push({
        name: truncateText(targetName, 30),
        id: targetId,
        type: 'sub',
        index: nodeIndex
      });
      nodeMap[targetId] = nodeIndex;
    }
    
    // Add link
    links.push({
      source: nodeMap[sourceId],
      target: nodeMap[targetId],
      value: link.value
    });
  });
  
  return { nodes, links };
}

// Helper mapping for panel titles
const agencyTitleMap = {
  'agencyName': 'Agency',
  'subAgencyName': 'Sub-Agency',
  'officeName': 'Office'
};

// Create tooltip for Sankey diagram
function createSankeyTooltip() {
  // Remove any existing tooltip
  const oldTooltip = document.getElementById('sankey-tooltip');
  if (oldTooltip) {
    document.body.removeChild(oldTooltip);
  }
  
  // Create new tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'sankey-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.padding = '10px';
  tooltip.style.backgroundColor = getCssVar('--color-surface');
  tooltip.style.color = getCssVar('--color-text-primary');
  tooltip.style.border = `1px solid ${getCssVar('--color-border')}`;
  tooltip.style.borderRadius = '4px';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.zIndex = '99999';
  tooltip.style.display = 'none';
  tooltip.style.fontSize = '12px';
  tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  document.body.appendChild(tooltip);
  
  return tooltip;
}

// Get colors for Sankey nodes based on current theme
function getSankeyNodeColors() {
  return {
    agency: getCssVar('--chart-color-tertiary'),
    subagency: getCssVar('--chart-color-tertiary'),
    office: getCssVar('--chart-color-tertiary'),
    prime: getCssVar('--chart-color-primary'),
    sub: getCssVar('--chart-color-secondary')
  };
}

// Enhanced version of the Sankey chart display function
function displayEnhancedSankeyChart(model) {
  console.log("Rendering enhanced Sankey chart with model data");
  
  const containerId = 'sankey-chart-container';
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error("Sankey chart container not found.");
    return;
  }

  // Get selected visualization options from the filter panel
  const agencyField = document.getElementById('sankey-agency-field')?.value || 'subAgencyName';
  const contractorField = document.getElementById('sankey-contractor-field')?.value || 'primeName';
  
  // Clear previous content
  container.innerHTML = '';
  
  // Set up container layout for split panels
  const panelsContainer = document.createElement('div');
  panelsContainer.style.display = 'flex';
  panelsContainer.style.flexDirection = 'row';
  panelsContainer.style.gap = '20px';
  panelsContainer.style.height = 'calc(100% - 40px)';
  container.appendChild(panelsContainer);
  
  // Create container for each panel
  const leftPanelContainer = document.createElement('div');
  leftPanelContainer.id = 'agency-prime-panel';
  leftPanelContainer.style.flex = '1';
  
  const rightPanelContainer = document.createElement('div');
  rightPanelContainer.id = 'prime-sub-panel';
  rightPanelContainer.style.flex = '1';
  
  panelsContainer.appendChild(leftPanelContainer);
  panelsContainer.appendChild(rightPanelContainer);
  
  // Add panel titles with selected field information
  const leftTitle = document.createElement('div');
  leftTitle.style.textAlign = 'center';
  leftTitle.style.marginBottom = '10px';
  leftTitle.style.fontWeight = 'bold';
  leftTitle.style.color = getCssVar('--color-text-primary');
  leftTitle.textContent = `${agencyTitleMap[agencyField] || 'Agency'} to Prime Contractors`;
  leftPanelContainer.appendChild(leftTitle);
  
  const rightTitle = document.createElement('div');
  rightTitle.style.textAlign = 'center';
  rightTitle.style.marginBottom = '10px';
  rightTitle.style.fontWeight = 'bold';
  rightTitle.style.color = getCssVar('--color-text-primary');
  rightTitle.textContent = `Prime to ${contractorField === 'subName' ? 'Subcontractors' : 'Projects'}`;
  rightPanelContainer.appendChild(rightTitle);
  
  // Create SVGs for each panel
  const leftSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  leftSvg.id = 'agency-prime-sankey';
  leftSvg.setAttribute('width', '100%');
  leftSvg.setAttribute('height', '100%');
  leftPanelContainer.appendChild(leftSvg);
  
  const rightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  rightSvg.id = 'prime-sub-sankey';
  rightSvg.setAttribute('width', '100%');
  rightSvg.setAttribute('height', '100%');
  rightPanelContainer.appendChild(rightSvg);
  
  setLoading(containerId, false);
  
  if (!model || 
     (!model.relationships.agencyToPrime.length && !model.relationships.primeToSub.length)) {
    displayNoData(containerId, 'No data available for Sankey diagram.');
    return;
  }
  
  try {
    // Create tooltip
    const tooltip = createSankeyTooltip();
    
    // Set dimensions for each panel
    const panelWidth = leftPanelContainer.clientWidth || 300;
    const panelHeight = leftPanelContainer.clientHeight || 400;
    const margin = {top: 20, right: 20, bottom: 20, left: 20};
    
    // Get colors based on theme
    const nodeColors = getSankeyNodeColors();
    const nodeStrokeColor = getCssVar('--color-surface');
    
    // Create D3 selections
    const leftSvgSelection = d3.select(leftSvg)
      .attr('width', panelWidth)
      .attr('height', panelHeight);
        
    const rightSvgSelection = d3.select(rightSvg)
      .attr('width', panelWidth)
      .attr('height', panelHeight);
    
    // Process data for both panels based on selected fields
    const leftSankeyData = processSankeyDataForLeftPanel(model, agencyField);
    const rightSankeyData = processSankeyDataForRightPanel(model, contractorField);
    
    // Draw the Sankey diagrams
    drawSankeyDiagram(
      leftSvgSelection,
      leftSankeyData.nodes,
      leftSankeyData.links,
      panelWidth,
      panelHeight,
      margin,
      nodeColors,
      nodeStrokeColor,
      tooltip,
      'left'
    );
    
    if (rightSankeyData.nodes.length > 0 && rightSankeyData.links.length > 0) {
      drawSankeyDiagram(
        rightSvgSelection,
        rightSankeyData.nodes,
        rightSankeyData.links,
        panelWidth,
        panelHeight,
        margin,
        nodeColors,
        nodeStrokeColor,
        tooltip,
        'right'
      );
    } else {
      // No data for right panel
      rightSvgSelection.append("text")
        .attr("x", panelWidth / 2)
        .attr("y", panelHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", getCssVar('--color-text-secondary'))
        .attr("opacity", 0.7)
        .text(`No ${contractorField === 'subName' ? 'subcontractor' : 'project'} data available`);
    }
  } catch (error) {
    console.error("Error rendering Sankey charts:", error);
    displayError(containerId, `Error rendering Sankey charts: ${error.message}`);
  }
}

// Draw a Sankey diagram with the provided data
function drawSankeyDiagram(svgSelection, nodes, links, width, height, margin, nodeColors, nodeStrokeColor, tooltip, panelSide) {
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
    const gradientId = `${panelSide}-link-gradient-${i}`;
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
  
  // Draw links
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
    .attr('fill', d => nodeColors[d.type] || '#999')
    .attr('stroke', nodeStrokeColor)
    .attr('stroke-width', 1)
    .attr('cursor', 'pointer')
    .attr('data-id', d => d.id)
    .attr('data-type', d => d.type)
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
        .attr('stroke', getCssVar('--chart-color-primary'))
        .attr('stroke-width', 2);
          
      // Cross-panel highlighting for prime nodes
      if (panelSide === 'left' && d.type === 'prime') {
        d3.select('#prime-sub-sankey')
          .selectAll('rect')
          .filter(node => node.type === 'prime' && node.id === d.id)
          .attr('stroke', getCssVar('--chart-color-primary'))
          .attr('stroke-width', 2);
      } else if (panelSide === 'right' && d.type === 'prime') {
        d3.select('#agency-prime-sankey')
          .selectAll('rect')
          .filter(node => node.type === 'prime' && node.id === d.id)
          .attr('stroke', getCssVar('--chart-color-primary'))
          .attr('stroke-width', 2);
      }
    })
    .on('mousemove', function(event) {
      tooltip.style.left = (event.pageX + 10) + 'px';
      tooltip.style.top = (event.pageY - 28) + 'px';
    })
    .on('mouseout', function() {
      tooltip.style.display = 'none';
      d3.select(this)
        .attr('stroke', nodeStrokeColor)
        .attr('stroke-width', 1);
          
      // Remove cross-panel highlighting
      if (panelSide === 'left') {
        d3.select('#prime-sub-sankey')
          .selectAll('rect')
          .attr('stroke', nodeStrokeColor)
          .attr('stroke-width', 1);
      } else {
        d3.select('#agency-prime-sankey')
          .selectAll('rect')
          .attr('stroke', nodeStrokeColor)
          .attr('stroke-width', 1);
      }
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
    .attr('font-size', '11px')
    .attr('fill', getCssVar('--color-text-primary'))
    .each(function(d) {
      // Hide labels for small nodes
      if ((d.y1 - d.y0) < 5) {
        d3.select(this).remove();
      }
    });
      
  // Add note about showing only top connections
  svgSelection.append("text")
    .attr("x", width - 10)
    .attr("y", height - 10)
    .attr("text-anchor", "end")
    .attr("font-size", "10px")
    .attr("fill", getCssVar('--color-text-secondary'))
    .attr("opacity", 0.7)
    .text("Showing top 10 flows by value");
}

// Override the existing displayEnhancedSankeyChart function
window.displayEnhancedSankeyChart = displayEnhancedSankeyChart;

// Find any existing displaySankeyChart or displayEnhancedSankeyChartWithSelectors functions
// and replace them with our new implementation
if (typeof window.displaySankeyChart === 'function') {
  window.displaySankeyChart = displayEnhancedSankeyChart;
}

if (typeof window.displayEnhancedSankeyChartWithSelectors === 'function') {
  window.displayEnhancedSankeyChartWithSelectors = displayEnhancedSankeyChart;
}

// Initialize during page load if not already done
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSankeyFilters);
} else {
  // Document already loaded, run the initialization
  initializeSankeyFilters();
}

// Make sure the appropriate function gets called during visualization updates
const originalApplyFilters = window.applyFiltersAndUpdateVisuals;
if (typeof originalApplyFilters === 'function') {
  window.applyFiltersAndUpdateVisuals = function() {
    // Call the original function first
    originalApplyFilters.apply(this, arguments);
    
    // Make sure our enhanced Sankey display function gets called
    if (typeof displaySankeyChart === 'function' && 
        typeof displayEnhancedSankeyChart === 'function' &&
        displaySankeyChart !== displayEnhancedSankeyChart) {
      // Replace the old function with our enhanced version
      window.displaySankeyChart = displayEnhancedSankeyChart;
    }
  };
}