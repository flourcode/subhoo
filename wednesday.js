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
	d3.select("body").selectAll(".chart-tooltip").remove(); // Specifically for your enhanced donut charts
        
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
// In wednesday.js

function fetchDataFromS3(dataset) {
    return new Promise((resolve, reject) => { // MODIFICATION: Wrap in a Promise
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
                // MODIFICATION: Reject promise on error
                reject(new Error(`Failed to fetch data: ${response.status} ${statusText}`)); 
                return; // Important to return here after reject
            }
            return response.text();
        })
        .then(csvText => {
            if (csvText === undefined) { // Check if response.text() resolved with undefined (e.g. from reject above)
                 return; // Already handled by reject
            }
            // Process the CSV data
            processDataset(dataset, Papa.parse(csvText, {
                header: true,
                dynamicTyping: false,
                skipEmptyLines: 'greedy',
                transformHeader: header => header.trim()
            }).data);
            resolve(); // MODIFICATION: Resolve the promise when done
        })
        .catch(error => {
            console.error(`Error fetching dataset ${dataset.name}:`, error);
            // updateStatusBanner is good, but also reject for the caller
            // updateStatusBanner(`Error loading dataset: ${error.message}`, 'error'); 
            // isLoading and refreshButton should be handled by the caller (loadSingleDataset)
            reject(error); // MODIFICATION: Reject the promise on catch
        });
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
	displayNoData('circular-dendrogram-container', 'Select a dataset to view nodes.');
	displayNoData('bento-naics-distribution', 'Select a dataset to view NAICS distribution.'); // Or the inner chart container
    

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
async function loadSingleDataset(dataset) { // MODIFICATION: Make async
    if (!dataset || !dataset.id || isLoading) {
        console.warn("Load dataset cancelled. Already loading or invalid dataset provided.");
        if (!dataset) updateStatusBanner('Invalid dataset specified.', 'error');
        return;
    }

    console.log(`Initiating load for dataset: ${dataset.name} (ID: ${dataset.id})`);
    selectedAgencies = [dataset]; 
    isLoading = true; // Set isLoading at the start of the operation

    updateDashboardTitle([dataset]);
    updateStatusBanner(`Loading ${dataset.name} data...`, 'info');
    document.getElementById('refresh-button').disabled = true;

    // Set loading states for containers (existing code)
    setLoading('contract-leaders-table-container', true, `Loading ${dataset.name} leader data...`);
    setLoading('tav-tcv-chart-container', true, `Loading ${dataset.name} TAV/TCV data...`);
    setLoading('expiring-contracts-table-container', true, `Loading ${dataset.name} expiring contracts...`);
    setLoading('sankey-chart-container', true, `Loading ${dataset.name} award flow...`);
    setLoading('map-container', true, `Loading ${dataset.name} performance data...`);

    // Reset data based on dataset type (existing code)
    if (dataset.type === 'primes') {
        rawData.primes = [];
    } else {
        rawData.subs = [];
    }
    
    if (tavTcvChartInstance) {
        tavTcvChartInstance.destroy();
        tavTcvChartInstance = null;
    }

    // Clear ARR result and reset filters (existing code)
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
	try {
        await fetchDataFromS3(dataset); // MODIFICATION: Await the promise

        console.log(`Single dataset ${dataset.name} fetched and processed, building unified model...`);
        buildUnifiedModel(); // This function populates the global 'unifiedModel'

        // === ADD THIS LINE HERE (for single loads) ===
        window.unifiedModel = unifiedModel;
        console.log("window.unifiedModel updated after single load. Content length: " + (window.unifiedModel ? JSON.stringify(window.unifiedModel).length : "null"));
        // ===========================================

        updateStatusBanner(`Successfully loaded ${dataset.name}.`, 'success');
        populateFiltersFromUnifiedModel();
        applyFiltersAndUpdateVisuals();

    } catch (error) {
        console.error(`Error in loadSingleDataset for ${dataset.name}:`, error);
        updateStatusBanner(`Error loading dataset ${dataset.name}: ${error.message}`, 'error');
        resetUIForNoDataset(); // Or a more specific error display
    } finally {
        isLoading = false; // Ensure isLoading is reset
        document.getElementById('refresh-button').disabled = false; // Ensure button is re-enabled
    }
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
         window.unifiedModel = unifiedModel; 
        console.log("window.unifiedModel updated after combined load. Content length: " + (window.unifiedModel ? JSON.stringify(window.unifiedModel).length : "null"));
        
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
    setLoading('bento-naics-distribution', true); // Add new chart's bento box ID here
   
    // Check if we're using unified model or direct raw data
    if (unifiedModel) {
        updateVisualsFromUnifiedModel(subAgencyFilter, naicsFilter, searchTerm);
        
        // Add Share of Wallet chart with a delay
        try {
            setTimeout(() => {
                displayShareOfWalletChart(unifiedModel);
            }, 300);
        } catch (e) {
            console.error("Error displaying Share of Wallet chart:", e);
        }
    } else {
        // Fall back to using direct raw data for backward compatibility
        updateVisualsFromRawData(subAgencyFilter, naicsFilter, searchTerm);
    }
}

function initializeEnhancedFeatures() {
    console.log("Initializing enhanced UI features...");
    
    try {
        // Initialize preset views to replace complex filtering
        initializePresetViews();
        console.log("Preset views initialized");
    } catch (e) {
        console.error("Error initializing preset views:", e);
    }
    
    console.log("Enhanced UI features initialization complete");
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
	// --- NEW: NAICS Donut Chart ---
    const naicsDistributionData = processNaicsDistributionData(filteredModel);
    const naicsDonutChartContainerId = 'naics-donut-chart-container'; // The div D3 will select
    const naicsBentoBoxId = 'bento-naics-distribution'; // The parent bento box for overall loading

    // Set loading state for the bento box just before trying to draw
    setLoading(naicsBentoBoxId, true, 'Loading NAICS distribution...');

    // Use a timeout to allow the DOM to update and containers to get their sizes
    setTimeout(() => {
        displayNaicsDonutChart(naicsDistributionData, naicsDonutChartContainerId, 5);
        // Turn off loading for the bento box AFTER the chart attempts to draw or shows a no-data message
        setLoading(naicsBentoBoxId, false);
    }, 100); // Increased timeout slightly, adjust if needed
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
            dashboardTitle.textContent = agencyName + ' Data';
            dashboardSubtitle.textContent = `Analyzing ${dataset.type} data from USAspending.gov`;
        } else {
            // Multiple datasets - use the first one's agency name
            const agencyNames = new Set(datasets.map(d => d.name.split(' (')[0]));
            const isSameAgency = agencyNames.size === 1;
            
            if (isSameAgency) {
                // Same agency, different data types
                const agencyName = Array.from(agencyNames)[0];
                dashboardTitle.textContent = agencyName + ' Data';
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
        dashboardTitle.textContent = agencyName + ' Data';
        dashboardSubtitle.textContent = `Analyzing ${datasets.type} data from USAspending.gov`;
    }
}
// wednesday.js

// --- Add global variables to store sort state ---
let leadersTableSort = { key: 'totalValue', dir: 'desc' }; // Default sort for leaders
let expiringTableSort = { key: 'period_of_performance_current_end_date', dir: 'asc' }; // Default sort for expiring

// --- Utility function to add sort icons ---
function updateSortIcons(tableId, sortKey, sortDir) {
    const table = document.getElementById(tableId);
    if (!table) return;

    table.querySelectorAll('th.sortable-header').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕'; // Reset icon

        if (th.dataset.sortKey === sortKey) {
            th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            if (icon) icon.textContent = sortDir === 'asc' ? '▲' : '▼';
        }
    });
}

// --- Modify displayContractLeadersTable ---
function displayContractLeadersTable(leaderData) {
    const containerId = 'contract-leaders-table-container';
    const tableId = 'leaders-table'; // Give the table an ID
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found.`);
        return;
    }
    setLoading(containerId, false);

    // --- Keep existing setup for export button etc. ---
    container.innerHTML = ''; // Clear previous

    if (!leaderData || leaderData.length === 0) {
        displayNoData(containerId, 'No contract leader data found.');
        return;
    }

    // Create header section with export button (Keep existing code)
    const headerSection = document.createElement('div');
    headerSection.style.display = 'flex';
    headerSection.style.justifyContent = 'flex-end';
    headerSection.style.marginBottom = '8px';

    const exportButton = document.createElement('button');
    exportButton.className = 'button export-btn'; // Added export-btn class
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
    exportButton.addEventListener('click', () => {
        const exportData = leaderData.map(leader => ({ /* ... existing export mapping ... */ }));
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        exportToCSV(exportData, `top-contractors-${dateStr}.csv`);
    });
    headerSection.appendChild(exportButton);
    container.appendChild(headerSection);

    // Create a table wrapper div (Keep existing code)
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.style.overflow = 'auto';
    tableWrapper.style.maxHeight = '900px'; // Adjust as needed

    // Create Table Structure
    const table = document.createElement('table');
    table.id = tableId; // Assign ID
    table.className = 'min-w-full divide-y';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    // --- Define headers with sort keys ---
    const headers = [
        { text: 'Recipient', scope: 'col', key: 'siName', sortable: false },
        { text: 'Total Value', scope: 'col', class: 'number', key: 'totalValue', sortable: true }, // Sortable
        { text: 'Awards', scope: 'col', class: 'number', key: 'numAwards', sortable: false },
        { text: 'Avg Value', scope: 'col', class: 'number', key: 'avgValue', sortable: true }, // Sortable
        { text: 'Majority Work', scope: 'col', key: 'dominantNaics', sortable: false },
        { text: 'USASpending', scope: 'col', class: 'text-center', key: 'usaSpendingLink', sortable: false }
    ];

    headers.forEach(headerInfo => {
        const th = document.createElement('th');
        th.textContent = headerInfo.text;
        th.scope = headerInfo.scope;
        if (headerInfo.class) th.className = headerInfo.class;
        th.dataset.sortKey = headerInfo.key; // Store key

        if (headerInfo.sortable) {
            th.classList.add('sortable-header');
            th.style.cursor = 'pointer';
            const iconSpan = document.createElement('span');
            iconSpan.className = 'sort-icon';
            iconSpan.textContent = ' ↕'; // Initial icon
            th.appendChild(iconSpan);

            // --- Add click listener for sorting ---
            th.addEventListener('click', () => {
                const newKey = headerInfo.key;
                let newDir = 'desc';
                if (leadersTableSort.key === newKey && leadersTableSort.dir === 'desc') {
                    newDir = 'asc';
                }
                leadersTableSort.key = newKey;
                leadersTableSort.dir = newDir;
                // Re-render the table with new sort order
                displayContractLeadersTable(leaderData); // Pass original data to re-sort
            });
        }
        headerRow.appendChild(th);
    });

    // --- Sort the data based on current state BEFORE slicing ---
    const sortKey = leadersTableSort.key;
    const sortDir = leadersTableSort.dir;
    const sortedData = [...leaderData].sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        // Handle numeric sorting for value columns
        if (sortKey === 'totalValue' || sortKey === 'avgValue') {
            valA = typeof valA === 'number' ? valA : 0;
            valB = typeof valB === 'number' ? valB : 0;
        } else { // Basic string compare for others if needed
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    // Display top 10 leaders (or more if needed)
    const displayData = sortedData.slice(0, 10); // Slice *after* sorting

    const tbody = table.createTBody();
    tbody.className = 'divide-y';

    // --- Populate table body (Keep existing logic, use displayData) ---
    displayData.forEach(leader => {
        const row = tbody.insertRow();
        // Recipient Name (clickable)
        let cell = row.insertCell();
        cell.className = 'font-medium';
        // ... (rest of nameLink creation) ...
        const nameLink = document.createElement('a');
        nameLink.href = '#';
        nameLink.style.color = getCssVar('--color-primary');
        nameLink.style.textDecoration = 'none';
        nameLink.style.fontWeight = '600';
        nameLink.textContent = truncateText(leader.siName, 35);
        nameLink.title = `View profile for ${leader.siName}`;
        nameLink.addEventListener('click', (e) => {
            e.preventDefault();
            // showContractorProfile(leader.siName); // Ensure this function exists
        });
        cell.appendChild(nameLink);

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
        if (leader.uniqueContractKeys && leader.uniqueContractKeys.length > 0) {
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
            } else {
                cell.textContent = `${leader.uniqueContractKeys.length} contracts`;
                cell.style.color = getCssVar('--color-text-secondary');
            }
        } else {
            cell.textContent = '-';
            cell.style.color = getCssVar('--color-text-tertiary');
        }
    });
    // --- END of body population ---

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // Add summary text (Keep existing code)
    if (leaderData.length > 10) {
        const summaryPara = document.createElement('p');
        summaryPara.className = 'summary-text';
        summaryPara.style.color = getCssVar('--color-text-secondary');
        summaryPara.textContent = `Showing Top 10 of ${leaderData.length} leaders. Sorted by ${sortKey} (${sortDir}).`;
        container.appendChild(summaryPara);
    }

    // --- Update sort icons AFTER table is built ---
    updateSortIcons(tableId, sortKey, sortDir);
}


// --- Modify displayExpiringTable ---
function displayExpiringTable(expiringData) {
    const containerId = 'expiring-contracts-table-container';
    const tableId = 'expiring-table'; // Give the table an ID
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found.`);
        return;
    }
    setLoading(containerId, false);

    // --- Keep existing setup for export button etc. ---
    container.innerHTML = ''; // Clear previous

    if (!expiringData || expiringData.length === 0) {
        displayNoData(containerId, 'No contracts found expiring in the next 6 months.');
        return;
    }

    // Create header section with export button (Keep existing code)
    const headerSection = document.createElement('div');
    headerSection.style.display = 'flex';
    headerSection.style.justifyContent = 'flex-end';
    headerSection.style.marginBottom = '8px';

    const exportButton = document.createElement('button');
    exportButton.className = 'button export-btn'; // Added export-btn class
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
    exportButton.addEventListener('click', () => {
        const exportData = expiringData.map(contract => ({
            // ... existing export mapping ...
             contract_id: contract.award_id_piid || contract.contract_award_unique_key || '',
             contractor_name: contract.recipient_name || '',
             description: contract.transaction_description || '',
             end_date: contract.formatted_end_date ||
                    (contract.period_of_performance_current_end_date_parsed instanceof Date ?
                     contract.period_of_performance_current_end_date_parsed.toISOString().split('T')[0] :
                     contract.period_of_performance_current_end_date || ''),
             value: typeof contract.current_total_value_of_award === 'number' ?
                       contract.current_total_value_of_award :
                       parseSafeFloat(contract.current_total_value_of_award || 0), // Use parseSafeFloat
             naics_code: contract.naics_code || '',
             naics_description: contract.naics_description || ''
        }));
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        exportToCSV(exportData, `expiring-contracts-${dateStr}.csv`);
    });
    headerSection.appendChild(exportButton);
    container.appendChild(headerSection);

    // Create Table Structure
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.style.overflow = 'auto';
    tableWrapper.style.maxHeight = '300px'; // Adjust as needed

    const table = document.createElement('table');
    table.id = tableId; // Assign ID
    table.className = 'min-w-full divide-y';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    // --- Define headers with sort keys ---
    const headers = [
        { text: 'Contract ID / PIID', key: 'award_id_piid', sortable: false },
        { text: 'Recipient Name', key: 'recipient_name', sortable: false },
        { text: 'Description', key: 'transaction_description', sortable: false },
        { text: 'End Date', key: 'period_of_performance_current_end_date', sortable: true }, // Sortable by date
        { text: 'Current Value', key: 'current_total_value_of_award', sortable: true, format: 'currency', class: 'number' }, // Sortable by value
        { text: 'USA Spending', key: 'usa_spending', class: 'text-center', sortable: false }
    ];

    headers.forEach(headerInfo => {
        const th = document.createElement('th');
        th.textContent = headerInfo.text;
        th.scope = 'col';
        if (headerInfo.class) th.className = headerInfo.class;
        if (headerInfo.key === 'current_total_value_of_award') {
            th.style.textAlign = 'right';
        }
        th.dataset.sortKey = headerInfo.key; // Store key

        if (headerInfo.sortable) {
            th.classList.add('sortable-header');
            th.style.cursor = 'pointer';
            const iconSpan = document.createElement('span');
            iconSpan.className = 'sort-icon';
            iconSpan.textContent = ' ↕'; // Initial icon
            th.appendChild(iconSpan);

            // --- Add click listener for sorting ---
            th.addEventListener('click', () => {
                const newKey = headerInfo.key;
                let newDir = 'desc'; // Default to desc for value, asc for date
                if (newKey === 'period_of_performance_current_end_date') {
                     newDir = 'asc'; // Dates default to ascending
                     if(expiringTableSort.key === newKey && expiringTableSort.dir === 'asc') {
                         newDir = 'desc';
                     }
                } else { // Value column
                    if (expiringTableSort.key === newKey && expiringTableSort.dir === 'desc') {
                        newDir = 'asc';
                    }
                }

                expiringTableSort.key = newKey;
                expiringTableSort.dir = newDir;
                // Re-render the table with new sort order
                displayExpiringTable(expiringData); // Pass original data to re-sort
            });
        }
        headerRow.appendChild(th);
    });

    // --- Sort the data based on current state ---
    const sortKey = expiringTableSort.key;
    const sortDir = expiringTableSort.dir;
    const sortedData = [...expiringData].sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (sortKey === 'current_total_value_of_award') {
            valA = parseSafeFloat(valA); // Use safe float parsing
            valB = parseSafeFloat(valB);
        } else if (sortKey === 'period_of_performance_current_end_date') {
            // Use pre-parsed dates if available, otherwise parse on the fly
            valA = a.period_of_performance_current_end_date_parsed || parseDate(valA);
            valB = b.period_of_performance_current_end_date_parsed || parseDate(valB);
            // Handle null dates (sort them to the end typically)
            if (valA === null && valB === null) return 0;
            if (valA === null) return 1; // Nulls last
            if (valB === null) return -1; // Nulls last
        } else {
             valA = String(valA).toLowerCase();
             valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });


    const tbody = table.createTBody();
    tbody.className = 'divide-y';

    // --- Populate table body (use sortedData) ---
    sortedData.forEach(contract => { // Use sortedData here
        const row = tbody.insertRow();
        headers.forEach(headerInfo => {
            let cell = row.insertCell();
            // ... (Keep existing cell population logic) ...
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
                     value = contract.formatted_end_date; // Use pre-formatted if parsed is missing
                 } else {
                     value = parseDate(value)?.toISOString().split('T')[0] || 'Invalid Date'; // Fallback parsing
                 }
            } else if (headerInfo.format === 'currency') {
                value = formatCurrency(parseSafeFloat(value)); // Ensure value is parsed before formatting
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
            cell.title = String(value) !== '-' && String(value) !== 'Invalid Date' ? String(value) : ''; // Set title for full text on hover
            if (headerInfo.class) cell.className += ` ${headerInfo.class}`; // Append class

             // Apply proper text color based on content
            if (value === '-' || value === 'Invalid Date') {
                cell.style.color = getCssVar('--color-text-tertiary');
            } else {
                cell.style.color = getCssVar('--color-text-primary');
            }
        });
    });
    // --- END of body population ---

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // Add summary text
    const summaryPara = document.createElement('p');
    summaryPara.className = 'summary-text';
    summaryPara.style.color = getCssVar('--color-text-secondary');
    summaryPara.textContent = `Showing ${sortedData.length} expiring contracts. Sorted by ${sortKey} (${sortDir}).`;
    container.appendChild(summaryPara);

    // --- Update sort icons AFTER table is built ---
    updateSortIcons(tableId, sortKey, sortDir);
}
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    
    try {
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
        
        // Initialize preset views with timeout
        setTimeout(function() {
            try {
                initializePresetViews();
                console.log("Preset views initialized successfully");
            } catch(e) {
                console.error("Error initializing preset views:", e);
            }
        }, 500);
        
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
    } catch (e) {
        console.error("Error during dashboard initialization:", e);
    }
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
// Helper function to add prime nodes and their subs
function addPrimeNodes(topPrimes, model, parentNode) {
    topPrimes.forEach(prime => {
        const primeData = model.primes[prime.id];
        if (!primeData) return;
        
        const primeNode = {
            name: primeData.name,
            id: "prime-" + Math.random().toString(36).substring(2, 9),
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
                id: "sub-" + Math.random().toString(36).substring(2, 9),
                value: sub.value,
                isSub: true // Explicitly mark as a subcontractor
            });
        });
        
        // Add prime if it has significant value
        if (prime.value > 100000) {
            parentNode.children.push(primeNode);
        }
    });
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
/**
 * Fix for "processNaicsDistributionData is not defined" error
 * 
 * This ensures the function is available when needed during data loading
 */

// Define the function directly if it doesn't exist yet
if (typeof window.processNaicsDistributionData !== 'function') {
  /**
   * Process data for NAICS distribution visualization with proper filtering
   * @param {Object} model - The unified data model
   * @param {string} naicsFilter - Current NAICS filter selection
   * @param {string} subAgencyFilter - Current sub-agency filter selection
   * @param {string} searchTerm - Current search term
   */
  window.processNaicsDistributionData = function(model, naicsFilter, subAgencyFilter, searchTerm) {
    if (!model || !model.contracts) {
      return [];
    }

    // Handle undefined parameters
    naicsFilter = naicsFilter || '';
    subAgencyFilter = subAgencyFilter || '';
    searchTerm = searchTerm || '';

    console.log(`Processing NAICS data with filters: NAICS=${naicsFilter}, SubAgency=${subAgencyFilter}, Search=${searchTerm}`);

    const naicsAggregates = {};
    
    // Process all contracts
    Object.values(model.contracts || {}).forEach(contract => {
      // Skip if no NAICS code or no value
      if (!contract.naicsCode || contract.value <= 0) return;

      // Apply sub-agency filter if set
      if (subAgencyFilter && contract.subAgencyId) {
        const subAgency = model.subAgencies[contract.subAgencyId];
        if (!subAgency || subAgency.name !== subAgencyFilter) return;
      }

      // Apply search filter if set
      if (searchTerm) {
        const searchFields = [
          contract.description,
          model.primes[contract.primeId]?.name,
          model.subAgencies[contract.subAgencyId]?.name,
          model.offices[contract.officeId]?.name,
          contract.naicsCode,
          contract.naicsDesc
        ];
        
        if (!searchFields.some(field => field && field.toLowerCase().includes(searchTerm.toLowerCase()))) {
          return;
        }
      }

      // Add to aggregates
      const code = contract.naicsCode;
      const desc = contract.naicsDesc || "N/A";
      
      if (!naicsAggregates[code]) {
        naicsAggregates[code] = { 
          code: code, 
          desc: desc, 
          name: code, // For color mapping
          value: 0,
          isSelected: (naicsFilter && code === naicsFilter) 
        };
      }
      
      naicsAggregates[code].value += contract.value;
    });
    
    // Convert to array and sort
    const sortedNaicsData = Object.values(naicsAggregates)
      .sort((a, b) => b.value - a.value);
    
    // Calculate percentages
    const totalValue = sortedNaicsData.reduce((sum, item) => sum + item.value, 0);
    sortedNaicsData.forEach(item => {
      item.percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
    });

    // If we have a NAICS filter, ensure the selected NAICS is included in top N
    if (naicsFilter && naicsAggregates[naicsFilter]) {
      // Create a copy to manipulate for display purposes
      const displayData = [...sortedNaicsData];
      const selectedData = naicsAggregates[naicsFilter];
      
      // If the selected NAICS isn't already in top 5
      const topN = 5;
      if (!displayData.slice(0, topN).some(item => item.code === naicsFilter)) {
        const selectedIndex = displayData.findIndex(item => item.code === naicsFilter);
        
        if (selectedIndex >= 0) {
          // Remove from current position
          const selected = displayData.splice(selectedIndex, 1)[0];
          // Add in at position 5 (replacing the last item in top 5)
          displayData.splice(Math.min(topN - 1, displayData.length), 0, selected);
        }
      }
      
      return displayData; // Return modified list ensuring selected NAICS is visible
    }
    
    return sortedNaicsData;
  };
  console.log("Defined processNaicsDistributionData function");
}

/**
 * Make sure Share of Wallet data processing is also defined
 */
if (typeof window.processShareOfWalletData !== 'function') {
  /**
   * Process data for Share of Wallet chart with proper filtering
   * @param {Object} model - The unified data model
   * @param {string} naicsFilter - Current NAICS filter selection
   * @param {string} subAgencyFilter - Current sub-agency filter selection
   * @param {string} searchTerm - Current search term
   */
  window.processShareOfWalletData = function(model, naicsFilter, subAgencyFilter, searchTerm) {
    if (!model || !model.primes) {
      return [];
    }
    
    // Handle undefined parameters
    naicsFilter = naicsFilter || '';
    subAgencyFilter = subAgencyFilter || '';
    searchTerm = searchTerm || '';
    
    // Aggregate by prime
    const primeValues = {};
    let totalValue = 0;
    
    // Process from contracts, applying all filters
    Object.values(model.contracts || {}).forEach(contract => {
      if (!contract.primeId || !contract.value || contract.value <= 0) return;
      
      // Apply NAICS filter if set
      if (naicsFilter && contract.naicsCode !== naicsFilter) return;
      
      // Apply sub-agency filter if set
      if (subAgencyFilter && contract.subAgencyId) {
        const subAgency = model.subAgencies[contract.subAgencyId];
        if (!subAgency || subAgency.name !== subAgencyFilter) return;
      }
      
      // Apply search filter if set
      if (searchTerm) {
        const searchFields = [
          contract.description,
          model.primes[contract.primeId]?.name,
          model.subAgencies[contract.subAgencyId]?.name,
          model.offices[contract.officeId]?.name,
          contract.naicsCode,
          contract.naicsDesc
        ];
        
        if (!searchFields.some(field => field && field.toLowerCase().includes(searchTerm.toLowerCase()))) {
          return;
        }
      }
      
      // Get prime details
      const prime = model.primes[contract.primeId];
      if (!prime || !prime.name) return;
      
      const primeName = prime.name;
      if (!primeValues[primeName]) {
        primeValues[primeName] = 0;
      }
      
      primeValues[primeName] += contract.value;
      totalValue += contract.value;
    });
    
    // Convert to array and sort
    const sortedPrimes = Object.entries(primeValues)
      .map(([name, value]) => ({
        name: name,
        value: value,
        percentage: 0 // Calculate after
      }))
      .sort((a, b) => b.value - a.value);
    
    // Take top 7 primes
    const result = sortedPrimes.slice(0, 7);
    
    // Add "Other" category if needed
    if (sortedPrimes.length > 7) {
      const otherValue = sortedPrimes.slice(7)
        .reduce((sum, item) => sum + item.value, 0);
      
      if (otherValue > 0) {
        result.push({
          name: "Other",
          value: otherValue,
          isOther: true,
          count: sortedPrimes.length - 7
        });
      }
    }
    
    // Calculate percentages
    result.forEach(item => {
      item.percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
    });
    
    return result;
  };
  console.log("Defined processShareOfWalletData function");
}

// Fix for init code to handle cases where data is available but chart isn't rendered
function loadChartsIfDataExists() {
  // Check if data already exists
  if (typeof window.unifiedModel !== 'undefined' && 
      window.unifiedModel !== null && 
      typeof window.unifiedModel.contracts !== 'undefined' &&
      Object.keys(window.unifiedModel.contracts || {}).length > 0) {
    console.log("Data already exists, rendering charts immediately");
    
    try {
      // Directly try to render charts
      if (typeof window.updateBothChartsWithConsistentSizing === 'function') {
        window.updateBothChartsWithConsistentSizing();
      } else if (typeof window.renderConsistentNaicsChart === 'function') {
        window.renderConsistentNaicsChart();
        window.renderConsistentShareOfWalletChart();
      }
    } catch (e) {
      console.error("Error rendering charts with existing data:", e);
    }
  }
}

// Run immediately and also after a short delay to catch any race conditions
loadChartsIfDataExists();
setTimeout(loadChartsIfDataExists, 500);
/**
 * FIXED CHART SIZING FOR DONUT CHARTS
 * 
 * This code specifically addresses the inconsistent scaling of donut charts
 * within bento boxes, ensuring they have consistent sizes regardless of browser window size.
 */

// Common size configuration for both charts
const CHART_CONFIG = {
  // Default aspect ratio (width:height)
  aspectRatio: 1.0,
  
  // Minimum dimensions to ensure charts are visible
  minWidth: 150,
  minHeight: 150,
  
  // Maximum dimensions to prevent charts from growing too large
  maxWidth: 400,
  maxHeight: 400,
  
  // Standard radius as percentage of container size (when aspectRatio = 1)
  radiusPercent: 0.38,
  
  // Base padding around chart (will be adjusted based on container size)
  basePadding: {
    top: 20,
    right: 40,
    bottom: 20,
    left: 40
  },
  
  // Enable debug mode to show container boundaries
  debug: false
};

/**
 * Calculate optimal chart dimensions to ensure consistent sizing
 * @param {HTMLElement} container - The chart container element
 * @returns {Object} Dimensions and settings for optimal chart display
 */
function calculateChartDimensions(container) {
  if (!container) {
    console.error("No container provided for dimension calculation");
    return null;
  }
  
  // Get the actual container dimensions
  const containerRect = container.getBoundingClientRect();
  const containerWidth = Math.max(containerRect.width, CHART_CONFIG.minWidth);
  const containerHeight = Math.max(containerRect.height, CHART_CONFIG.minHeight);
  
  // Calculate padding scales based on container size
  // For smaller containers, reduce padding proportionally
  const scaleFactor = Math.min(1, Math.max(0.5, containerWidth / 300));
  const padding = {
    top: CHART_CONFIG.basePadding.top * scaleFactor,
    right: CHART_CONFIG.basePadding.right * scaleFactor,
    bottom: CHART_CONFIG.basePadding.bottom * scaleFactor,
    left: CHART_CONFIG.basePadding.left * scaleFactor
  };
  
  // Calculate available space for chart
  const availableWidth = containerWidth - padding.left - padding.right;
  const availableHeight = containerHeight - padding.top - padding.bottom;
  
  // Determine the chart size based on available space
  // We'll use the smaller dimension to maintain aspect ratio
  const chartSize = Math.min(
    availableWidth,
    availableHeight,
    Math.min(CHART_CONFIG.maxWidth, CHART_CONFIG.maxHeight)
  );
  
  // Calculate chart dimensions with desired aspect ratio
  const chartWidth = chartSize;
  const chartHeight = chartSize / CHART_CONFIG.aspectRatio;
  
  // Calculate radius based on the smaller dimension
  const diameter = Math.min(chartWidth, chartHeight);
  const radius = diameter * CHART_CONFIG.radiusPercent;
  
  // Center position within the container
  const centerX = padding.left + availableWidth / 2;
  const centerY = padding.top + availableHeight / 2;
  
  return {
    width: containerWidth,
    height: containerHeight,
    chartWidth: chartWidth,
    chartHeight: chartHeight,
    padding: padding,
    radius: radius,
    innerRadius: radius * 0.6, // Standard inner radius for donut
    centerX: centerX,
    centerY: centerY,
    scaleFactor: scaleFactor
  };
}

/**
 * Rebuild a donut chart with correct sizing and dimensions
 * 
 * @param {string} containerId - ID of the container element
 * @param {Function} chartFunction - Function to call for rendering the chart
 * @param {Array} additionalArgs - Any additional arguments for the chart function
 */
function resizeDonutChart(containerId, chartFunction, ...additionalArgs) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found`);
    return;
  }
  
  // Clear the container
  container.innerHTML = '';
  
  if (CHART_CONFIG.debug) {
    // Add debug outline
    container.style.border = '1px dashed red';
  }
  
  // Calculate dimensions
  const dimensions = calculateChartDimensions(container);
  if (!dimensions) return;
  
  // Create an appropriately sized SVG container
  const svg = d3.select(container)
    .append('svg')
    .attr('width', dimensions.width)
    .attr('height', dimensions.height)
    .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
    .attr('class', 'donut-chart-svg')
    .style('overflow', 'visible'); // Allows labels to extend beyond
  
  if (CHART_CONFIG.debug) {
    // Show actual chart area in debug mode
    svg.append('rect')
      .attr('x', dimensions.padding.left)
      .attr('y', dimensions.padding.top)
      .attr('width', dimensions.chartWidth)
      .attr('height', dimensions.chartHeight)
      .attr('fill', 'none')
      .attr('stroke', 'blue')
      .attr('stroke-dasharray', '3,3');
  }
  
  // Create the chart container group, centered
  const chartGroup = svg.append('g')
    .attr('transform', `translate(${dimensions.centerX}, ${dimensions.centerY})`)
    .attr('class', 'donut-chart-group');
  
  // Call the chart function with the prepared container and dimensions
  // Chart function should expect (container, dimensions, ...args)
  chartFunction(chartGroup, dimensions, ...additionalArgs);
  
  return dimensions;
}

/**
 * Render NAICS donut chart with consistent sizing
 */
function renderConsistentNaicsChart() {
  const containerId = 'naics-donut-chart-container';
  
  // Get current filters directly from UI elements
  const naicsFilter = document.getElementById('naics-filter')?.value || '';
  const subAgencyFilter = document.getElementById('sub-agency-filter')?.value || '';
  const searchTerm = document.getElementById('search-input')?.value?.trim().toLowerCase() || '';
  
  // Process data with filters
  const naicsData = processNaicsDistributionData(unifiedModel, naicsFilter, subAgencyFilter, searchTerm);
  if (!naicsData || naicsData.length === 0) {
    displayNoData(containerId, 'No NAICS data available with current filters.');
    return;
  }
  
  // Resize and create the chart
  resizeDonutChart(containerId, renderDonutChartCore, {
    data: naicsData,
    title: naicsFilter ? `NAICS ${naicsFilter}` : "Top NAICS",
    centerValue: naicsData[0].code,
    labelField: "code",
    descField: "desc",
    highlightField: naicsFilter ? "code" : null,
    highlightValue: naicsFilter,
    topN: 5
  });
}

/**
 * Render Share of Wallet donut chart with consistent sizing
 */
function renderConsistentShareOfWalletChart() {
  const containerId = 'share-of-wallet-container';
  
  // Create container if it doesn't exist
  ensureShareOfWalletContainer();
  
  // Get current filters
  const naicsFilter = document.getElementById('naics-filter')?.value || '';
  const subAgencyFilter = document.getElementById('sub-agency-filter')?.value || '';
  const searchTerm = document.getElementById('search-input')?.value?.trim().toLowerCase() || '';
  
  // Process data with filters
  const shareData = processShareOfWalletData(unifiedModel, naicsFilter, subAgencyFilter, searchTerm);
  if (!shareData || shareData.length === 0) {
    displayNoData(containerId, 'No market share data available with current filters.');
    return;
  }
  
  // Format long names
  formatPrimeContractorNames(shareData);
  
  // Resize and create the chart
  resizeDonutChart(containerId, renderDonutChartCore, {
    data: shareData,
    title: "Leader",
    centerValue: shareData[0].name,
    labelField: "name",
    descField: null,
    topN: 7
  });
}

/**
 * Format contractor names to make them more suitable for display
 */
function formatPrimeContractorNames(data) {
  data.forEach(item => {
    if (item.name && item.name.length > 20 && !item.isOther) {
      // Store original name
      item.fullName = item.name;
      // Create shortened version
      const parts = item.name.split(' ');
      if (parts.length > 2) {
        item.name = parts[0] + ' ' + parts[1];
      } else {
        item.name = item.name.substring(0, 18) + '...';
      }
    }
  });
}

/**
 * Ensure the Share of Wallet container exists
 */
function ensureShareOfWalletContainer() {
  const containerId = 'share-of-wallet-container';
  const bentoId = 'bento-share-of-wallet';
  let container = document.getElementById(containerId);
  
  if (!container) {
    console.log("Creating Share of Wallet container");
    const bentoGrid = document.querySelector('.bento-grid');
    if (!bentoGrid) {
      console.error("Could not find bento grid for Share of Wallet container");
      return;
    }
    
    let bentoBox = document.getElementById(bentoId);
    if (!bentoBox) {
      bentoBox = document.createElement('div');
      bentoBox.id = bentoId;
      bentoBox.className = 'bento-box';
      bentoBox.style.minHeight = '240px';
      
      const header = document.createElement('div');
      header.className = 'card-header';
      header.innerHTML = `
          <div class="card-icon-circle">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21.21 15.89A10 10 0 1 1 8.11 2.99"></path>
                  <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
              </svg>
          </div>
          <h2>Market Share</h2>
      `;
      bentoBox.appendChild(header);
      bentoGrid.appendChild(bentoBox);
    }
    
    // Create chart container
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'chart-container';
    // Set explicit height to match other chart containers
    container.style.minHeight = '220px';
    container.style.height = '100%';
    bentoBox.appendChild(container);
  }
  
  return container;
}

/**
 * Core donut chart renderer that works with the resizing framework
 */
function renderDonutChartCore(container, dimensions, options) {
  // Default options
  const defaults = {
    data: [],
    title: "Distribution",
    subtitle: "",
    centerValue: "",
    labelField: "name",
    descField: "desc",
    valueField: "value",
    percentageField: "percentage",
    otherLabel: "Other",
    topN: 5,
    highlightField: null,
    highlightValue: null
  };
  
  const config = { ...defaults, ...options };
  const data = config.data;
  
  if (!data || data.length === 0) {
    container.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("fill", getCssVar('--color-text-secondary'))
      .text("No data available");
    return;
  }
  
  // Prepare top N data + Other
  const sortedData = [...data].sort((a, b) => (b[config.valueField] || 0) - (a[config.valueField] || 0));
  const topNData = sortedData.slice(0, config.topN);
  
  // If highlighting a specific value, ensure it's included in the top data
  if (config.highlightField && config.highlightValue) {
    const highlightedItem = sortedData.find(d => d[config.highlightField] === config.highlightValue);
    if (highlightedItem && !topNData.some(d => d[config.highlightField] === config.highlightValue)) {
      // Replace the last item
      topNData.pop();
      topNData.push(highlightedItem);
    }
  }
  
  const otherValue = d3.sum(sortedData.slice(config.topN), d => d[config.valueField] || 0);
  const otherPercentage = d3.sum(sortedData.slice(config.topN), d => d[config.percentageField] || 0);
  const chartPlotData = [...topNData];
  
  if (otherValue > 0 && sortedData.length > config.topN) {
    const otherCount = sortedData.length - config.topN;
    const otherItem = {
      [config.labelField]: config.otherLabel,
      [config.descField]: `${config.otherLabel} (${otherCount} items)`,
      [config.valueField]: otherValue,
      [config.percentageField]: otherPercentage,
      isOther: true
    };
    
    chartPlotData.push(otherItem);
  }
  
  // Set up colors based on theme
  const color = getDonutColorScale(chartPlotData, config.labelField, config.highlightField, config.highlightValue);
  
  // Set up pie layout with equal spacing
  const pie = d3.pie()
    .padAngle(0.01)
    .value(d => d[config.valueField])
    .sort(null);
  
  // Generate arc paths
  const arcGenerator = d3.arc()
    .innerRadius(dimensions.innerRadius)
    .outerRadius(dimensions.radius)
    .cornerRadius(1);
  
  // Arc generators for lead lines
  const labelArcStart = d3.arc()
    .innerRadius(dimensions.radius * 0.98)
    .outerRadius(dimensions.radius * 0.98);
  
  const labelArcMid = d3.arc()
    .innerRadius(dimensions.radius * 1.10)
    .outerRadius(dimensions.radius * 1.10);
  
  const pieData = pie(chartPlotData);
  
  // Create arc segments
  container.selectAll(".arc-path")
    .data(pieData)
    .join("path")
    .attr("class", "arc-path")
    .attr("fill", (d, i) => {
      // Highlight selected item if specified
      if (config.highlightField && config.highlightValue && 
          d.data[config.highlightField] === config.highlightValue) {
        return getCssVar('--color-primary');
      }
      return color(d.data[config.labelField]);
    })
    .attr("d", arcGenerator)
    .attr("stroke", getCssVar('--color-surface'))
    .style("stroke-width", "1.5px")
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(200)
        .attr("stroke", getCssVar('--color-primary'))
        .style("stroke-width", "2px")
        .attr("transform", "scale(1.03)");
      
      // Remove any existing tooltips
      d3.select("body").selectAll(".chart-tooltip").remove();
      
      // Create tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "chart-tooltip")
        .style("position", "absolute")
        .style("background-color", getCssVar('--color-surface'))
        .style("color", getCssVar('--color-text-primary'))
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("box-shadow", getCssVar('--shadow-md'))
        .style("border", `1px solid ${getCssVar('--color-border')}`)
        .style("z-index", 1000);
      
      tooltip.transition().duration(200).style("opacity", 1);
      
      // Format tooltip content
      const name = d.data.fullName || d.data[config.labelField];
      const desc = d.data[config.descField] || "";
      const value = formatCurrency(d.data[config.valueField]);
      const percentage = d.data[config.percentageField].toFixed(1);
      
      tooltip.html(
        `<div style="font-weight: bold; margin-bottom: 4px;">${name}</div>` +
        `${desc ? `<div style="color: ${getCssVar('--color-text-secondary')}; margin-bottom: 4px;">${desc}</div>` : ""}` +
        `<div>Value: ${value}</div><div>Share: ${percentage}%</div>`
      );
      
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on("mousemove", function(event) {
      d3.select("body").select(".chart-tooltip")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).transition().duration(200)
        .attr("stroke", getCssVar('--color-surface'))
        .style("stroke-width", "1.5px")
        .attr("transform", "scale(1)");
      
      d3.select("body").select(".chart-tooltip")
        .transition().duration(200)
        .style("opacity", 0)
        .remove();
    });
  
  // Add center text
  const centerText = container.append("text")
    .attr("text-anchor", "middle")
    .style("font-family", "var(--font-body, sans-serif)")
    .style("fill", getCssVar('--color-text-primary'));
  
  // Title text
  centerText.append("tspan")
    .attr("x", 0)
    .attr("dy", "-0.6em")
    .style("font-size", `${0.75 * dimensions.scaleFactor}em`)
    .style("fill", getCssVar('--color-text-secondary'))
    .text(config.title);
  
  // Optional subtitle
  if (config.subtitle) {
    centerText.append("tspan")
      .attr("x", 0)
      .attr("dy", "1.1em")
      .style("font-size", `${0.7 * dimensions.scaleFactor}em`)
      .style("fill", getCssVar('--color-text-tertiary'))
      .text(config.subtitle);
  }
  
  // Center value (typically the top item's label)
centerText.append("tspan")
  .attr("x", 0)
  .attr("dy", config.subtitle ? "1.3em" : "1.5em")
  .style("font-size", `${0.9 * dimensions.scaleFactor}em`)
  .style("font-weight", "600")
  .text(config.centerValue || "");

// Add NAICS description for NAICS chart
if (config.labelField === "code" && data.length > 0) {
  const centerItem = data[0]; // Top NAICS code
  if (centerItem && centerItem.desc) {
    centerText.append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .style("font-size", `${0.7 * dimensions.scaleFactor}em`)
      .style("fill", getCssVar('--color-text-tertiary'))
      .text(truncateText(centerItem.desc, 24));
  }
}
  
  // Add external labels with lead lines
  // Calculate which segments are large enough for labels
  const minPercentageForLabel = 4.0; // 4%
  const labelThresholdPercentage = minPercentageForLabel / 100;
  
  const labelData = pieData.filter(d => {
    const percentage = (d.endAngle - d.startAngle) / (2 * Math.PI);
    return percentage >= labelThresholdPercentage && d.data[config.valueField] > 0;
  });
  
  if (labelData.length > 0) {
    // Create lead lines group
    const lineGroup = container.append("g").attr("class", "label-lines");
    
    // Create text labels group
    const textLabelGroup = container.append("g").attr("class", "text-labels");
    
    // Set styling properties
    const polylineStrokeColor = getCssVar('--color-text-tertiary');
    const labelTextColor = getCssVar('--color-text-secondary');
    const labelDescColor = getCssVar('--color-text-tertiary');
    
    // Calculate dimensions for lead lines
    const leaderLineHorizontalPartLength = Math.max(8, Math.min(15, dimensions.radius * 0.2));
    const textStartOffsetFromLeaderLine = 4;
    
    // Add leader lines
    lineGroup.selectAll('polyline')
      .data(labelData)
      .join('polyline')
      .attr('stroke', polylineStrokeColor)
      .style('fill', 'none')
      .attr('stroke-width', 1)
      .attr('points', d => {
        const posA = labelArcStart.centroid(d);
        const posB = labelArcMid.centroid(d);
        const posC = [posB[0], posB[1]]; // Initialize posC with posB coordinates
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        
        // Extend posC horizontally based on angle
        posC[0] = posB[0] + leaderLineHorizontalPartLength * (midangle < Math.PI ? 1 : -1);
        
        return [posA, posB, posC];
      });
    
    // Calculate optimal font size based on container dimensions
    const baseFontSize = 11;
    const fontSizeFactor = Math.min(1, Math.max(0.8, dimensions.radius / 80));
    const labelFontSize = Math.round(baseFontSize * fontSizeFactor);
    const descFontSize = Math.round(labelFontSize * 0.9);
    
    // Add text labels
    const textLabels = textLabelGroup.selectAll('text')
      .data(labelData)
      .join('text')
      .style('font-family', "var(--font-body, sans-serif)")
      .attr('dy', '0.35em')
      .attr('transform', d => {
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        const posB = labelArcMid.centroid(d);
        const xPos = posB[0] + (leaderLineHorizontalPartLength + textStartOffsetFromLeaderLine) * (midangle < Math.PI ? 1 : -1);
        const yPos = posB[1];
        return `translate(${xPos},${yPos})`;
      })
      .style('text-anchor', d => {
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return midangle < Math.PI ? 'start' : 'end';
      });
    
    // Add primary label text
    textLabels.append('tspan')
      .attr('x', 0)
      .style('font-size', `${labelFontSize}px`)
      .style('font-weight', '500')
      .style('fill', labelTextColor)
      .text(d => truncateText(d.data[config.labelField], 15));
    
    // Add secondary label text (description or percentage)
    textLabels.filter(d => !d.data.isOther && (config.descField || true))
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '1.2em')
      .style('font-size', `${descFontSize}px`)
      .style('fill', labelDescColor)
      .text(d => {
        if (config.descField && d.data[config.descField]) {
          return truncateText(d.data[config.descField], 18);
        } else {
          // Always show percentage if no description
          return `${d.data[config.percentageField].toFixed(1)}%`;
        }
      });
  }
}

/**
 * Get color scale for donut chart with special handling for highlighted items
 */
function getDonutColorScale(data, colorField, highlightField, highlightValue) {
  // Create domain from data
  const domain = data.map(d => d[colorField]);
  
  // Get base colors from CSS
  const primary = getCssVar('--chart-color-primary');
  const secondary = getCssVar('--chart-color-secondary');
  const tertiary = getCssVar('--chart-color-tertiary');
  
  // Create color variations
  const colors = [
    primary,
    secondary,
    tertiary,
    d3.color(primary).darker(0.3).toString(),
    d3.color(secondary).darker(0.3).toString(), 
    d3.color(tertiary).brighter(0.3).toString(),
    d3.color(primary).brighter(0.5).toString(),
    d3.color(secondary).brighter(0.5).toString()
  ];
  
  // Make sure we have enough colors
  while (colors.length < domain.length) {
    colors.push(d3.color(colors[colors.length % 3]).brighter(0.2 * Math.floor(colors.length / 3)).toString());
  }
  
  // Create the scale
  const colorScale = d3.scaleOrdinal()
    .domain(domain)
    .range(colors.slice(0, domain.length));
  
  // Return function that handles special cases
  return function(value) {
    // Special handling for highlighted item
    if (highlightField && highlightValue) {
      const item = data.find(d => d[colorField] === value);
      if (item && item[highlightField] === highlightValue) {
        return getCssVar('--color-primary');
      }
    }
    
    // Special handling for "Other" category
    const item = data.find(d => d[colorField] === value);
    if (item && item.isOther) {
      return getCssVar('--color-text-tertiary');
    }
    
    return colorScale(value);
  };
}

/**
 * Update both charts to ensure consistent sizing
 */
function updateBothChartsWithConsistentSizing() {
  try {
    // Update NAICS chart
    renderConsistentNaicsChart();
    
    // Update Share of Wallet chart
    renderConsistentShareOfWalletChart();
    
  } catch (error) {
    console.error("Error updating charts with consistent sizing:", error);
  }
}

/**
 * Hook this into both the filter system and window resizing
 */
function setupChartSizingSystem() {
  // Get current filter values
  lastFilterState = {
    naicsCode: document.getElementById('naics-filter')?.value || '',
    subAgency: document.getElementById('sub-agency-filter')?.value || '',
    searchTerm: document.getElementById('search-input')?.value?.trim().toLowerCase() || ''
  };
  
  // Hook into filter application
  if (typeof window.applyFiltersAndUpdateVisuals === 'function') {
    const originalApplyFilters = window.applyFiltersAndUpdateVisuals;
    window.applyFiltersAndUpdateVisuals = function() {
      // Call original function
      originalApplyFilters.apply(this, arguments);
      
      // Update our charts with a delay to let the model filtering complete
      setTimeout(updateBothChartsWithConsistentSizing, 300);
    };
    console.log("Successfully hooked into applyFiltersAndUpdateVisuals");
  }
  
  // Hook into unified model updates
  if (typeof window.updateVisualsFromUnifiedModel === 'function') {
    const originalUpdateVisuals = window.updateVisualsFromUnifiedModel;
    window.updateVisualsFromUnifiedModel = function() {
      // Call original function
      originalUpdateVisuals.apply(this, arguments);
      
      // Update our charts with a delay
      setTimeout(updateBothChartsWithConsistentSizing, 300);
    };
    console.log("Successfully hooked into updateVisualsFromUnifiedModel");
  }
  
  // Add filter event listeners
  const filterElements = [
    { id: 'search-input', event: 'input' },
    { id: 'sub-agency-filter', event: 'change' },
    { id: 'naics-filter', event: 'change' },
    { id: 'refresh-button', event: 'click' }
  ];
  
  filterElements.forEach(item => {
    const element = document.getElementById(item.id);
    if (element) {
      element.addEventListener(item.event, function() {
        // Use a small delay to let other event handlers complete
        setTimeout(updateBothChartsWithConsistentSizing, 300);
      });
      console.log(`Added ${item.event} listener to ${item.id}`);
    }
  });
  
  // Handle window resize events
  window.addEventListener('resize', function() {
    // Debounce resize handling
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(function() {
      console.log("Window resized, updating chart sizes");
      updateBothChartsWithConsistentSizing();
    }, 250);
  });
  
  // Initial render
  updateBothChartsWithConsistentSizing();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // Wait for the main code to initialize
    setTimeout(setupChartSizingSystem, 500);
  });
} else {
  // Document already loaded, initialize with a delay
  setTimeout(setupChartSizingSystem, 500);
}

// Make functions available globally
window.renderConsistentNaicsChart = renderConsistentNaicsChart;
window.renderConsistentShareOfWalletChart = renderConsistentShareOfWalletChart;
window.updateBothChartsWithConsistentSizing = updateBothChartsWithConsistentSizing;
/**
 * This code fixes the initial load of the NAICS chart by hooking into the data loading functions
 */

// Add hooks into the data loading process
function hookIntoDataLoading() {
  console.log("Setting up hooks for NAICS chart initial load");
  
  // Hook into loadSingleDataset
  if (typeof window.loadSingleDataset === 'function') {
    const originalLoadSingleDataset = window.loadSingleDataset;
    window.loadSingleDataset = function(dataset) {
      // Call original function
      originalLoadSingleDataset.apply(this, arguments);
      
      // After data loads and processes, render our charts
      setTimeout(function() {
        console.log("Dataset loaded, initializing charts");
        updateBothChartsWithConsistentSizing();
      }, 1500); // Longer delay to allow data to load and process
    };
    console.log("Successfully hooked into loadSingleDataset");
  }
  
  // Hook into loadCombinedDatasets
  if (typeof window.loadCombinedDatasets === 'function') {
    const originalLoadCombinedDatasets = window.loadCombinedDatasets;
    window.loadCombinedDatasets = function(datasetIds) {
      // Call original function
      originalLoadCombinedDatasets.apply(this, arguments);
      
      // After data loads and processes, render our charts
      setTimeout(function() {
        console.log("Combined datasets loaded, initializing charts");
        updateBothChartsWithConsistentSizing();
      }, 2000); // Even longer delay for combined datasets
    };
    console.log("Successfully hooked into loadCombinedDatasets");
  }
  
  // Hook into processDataset, which is called when data is ready
  if (typeof window.processDataset === 'function') {
    const originalProcessDataset = window.processDataset;
    window.processDataset = function(dataset, data) {
      // Call original function
      const result = originalProcessDataset.apply(this, arguments);
      
      // After processing completes (which means data is ready)
      setTimeout(function() {
        console.log("Dataset processed, initializing charts");
        updateBothChartsWithConsistentSizing();
      }, 500);
      
      return result;
    };
    console.log("Successfully hooked into processDataset");
  }
  
  // Hook into buildUnifiedModel, which is called after all data is loaded
  if (typeof window.buildUnifiedModel === 'function') {
    const originalBuildUnifiedModel = window.buildUnifiedModel;
    window.buildUnifiedModel = function() {
      // Call original function
      originalBuildUnifiedModel.apply(this, arguments);
      
      // After unified model is built, render our charts
      console.log("Unified model built, initializing charts");
      updateBothChartsWithConsistentSizing();
    };
    console.log("Successfully hooked into buildUnifiedModel");
  }
  
  // Add manual button to force chart refresh
  addRefreshChartsButton();
  
  // Set up a periodic check for loaded data
  checkForLoadedDataAndRender();
}

// Create a temporary button to manually refresh charts (useful for debugging)
function addRefreshChartsButton() {
  // Don't add in production
  const isDebug = false;
  if (!isDebug) return;
  
  const container = document.querySelector('.header-controls');
  if (!container) return;
  
  const button = document.createElement('button');
  button.textContent = "Refresh Charts";
  button.style.padding = "6px 10px";
  button.style.marginLeft = "8px";
  button.addEventListener('click', function() {
    updateBothChartsWithConsistentSizing();
  });
  
  container.appendChild(button);
}

// Function to periodically check if data is loaded and render charts
function checkForLoadedDataAndRender() {
  console.log("Setting up periodic check for loaded data");
  
  // Initial delay before first check
  setTimeout(function checkData() {
    // Check if we have NAICS data available
    const hasData = typeof unifiedModel !== 'undefined' && 
                   unifiedModel !== null && 
                   typeof unifiedModel.contracts !== 'undefined' &&
                   Object.keys(unifiedModel.contracts || {}).length > 0;
    
    if (hasData) {
      console.log("Data detected, initializing charts");
      updateBothChartsWithConsistentSizing();
    } else {
      console.log("No data yet, checking again soon");
      // Check again in a moment
      setTimeout(checkData, 1000);
    }
  }, 1000);
}

// Update your initialization to include the new hooks
const originalSetupChartSizingSystem = window.setupChartSizingSystem;
window.setupChartSizingSystem = function() {
  // Call original setup
  if (typeof originalSetupChartSizingSystem === 'function') {
    originalSetupChartSizingSystem();
  }
  
  // Add our data loading hooks
  hookIntoDataLoading();
};

// Initialize right away if page is already loaded
if (document.readyState !== 'loading') {
  hookIntoDataLoading();
}
/**
 * Fix for "Loading NAICS distribution..." text not disappearing
 */

// Update renderConsistentNaicsChart to properly handle loading state
const originalRenderConsistentNaicsChart = window.renderConsistentNaicsChart;
window.renderConsistentNaicsChart = function() {
  const containerId = 'naics-donut-chart-container';
  const bentoId = 'bento-naics-distribution';
  
  // Clear loading state for both container and bento box
  clearLoadingState(containerId);
  clearLoadingState(bentoId);
  
  // Call the original rendering function
  if (typeof originalRenderConsistentNaicsChart === 'function') {
    originalRenderConsistentNaicsChart();
  }
  
  // Make sure loading is cleared after rendering completes
  setTimeout(function() {
    clearLoadingState(containerId);
    clearLoadingState(bentoId);
  }, 100);
};

// Update renderConsistentShareOfWalletChart similarly
const originalRenderConsistentShareOfWalletChart = window.renderConsistentShareOfWalletChart;
window.renderConsistentShareOfWalletChart = function() {
  const containerId = 'share-of-wallet-container';
  const bentoId = 'bento-share-of-wallet';
  
  // Clear loading state for both container and bento box
  clearLoadingState(containerId);
  clearLoadingState(bentoId);
  
  // Call the original rendering function
  if (typeof originalRenderConsistentShareOfWalletChart === 'function') {
    originalRenderConsistentShareOfWalletChart();
  }
  
  // Make sure loading is cleared after rendering completes
  setTimeout(function() {
    clearLoadingState(containerId);
    clearLoadingState(bentoId);
  }, 100);
};

/**
 * Helper function to clear loading state for a container
 */
function clearLoadingState(containerId) {
  if (!containerId) return;
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Find and remove loading placeholder
  const loadingPlaceholder = container.querySelector('.loading-placeholder');
  if (loadingPlaceholder) {
    loadingPlaceholder.style.display = 'none';
  }
  
  // Call setLoading if it exists as a function
  if (typeof window.setLoading === 'function') {
    try {
      window.setLoading(containerId, false);
    } catch (e) {
      console.warn(`Error calling setLoading for ${containerId}:`, e);
    }
  }
}

// Update the main charts update function
const originalUpdateBothChartsWithConsistentSizing = window.updateBothChartsWithConsistentSizing;
window.updateBothChartsWithConsistentSizing = function() {
  // Clear loading states first
  clearLoadingState('naics-donut-chart-container');
  clearLoadingState('bento-naics-distribution');
  clearLoadingState('share-of-wallet-container');
  clearLoadingState('bento-share-of-wallet');
  
  // Call original function
  if (typeof originalUpdateBothChartsWithConsistentSizing === 'function') {
    originalUpdateBothChartsWithConsistentSizing();
  }
  
  // Clear loading states again after rendering completes
  setTimeout(function() {
    clearLoadingState('naics-donut-chart-container');
    clearLoadingState('bento-naics-distribution');
    clearLoadingState('share-of-wallet-container');
    clearLoadingState('bento-share-of-wallet');
  }, 200);
};

// Run immediately to clear any existing loading states
clearLoadingState('naics-donut-chart-container');
clearLoadingState('bento-naics-distribution');
clearLoadingState('share-of-wallet-container');
clearLoadingState('bento-share-of-wallet');
// This function creates hierarchical data using the specified fields
function createHierarchyData(model, subAgencyFilter) {
    // Create root node
    const root = {
        name: "Root",
        id: "root",
        children: []
    };
    
    // Get agencies to display
    let agenciesToShow = [];
    
    // When a sub-agency filter is applied, find the parent agency
    if (subAgencyFilter) {
        // Find agencies that have the specified sub-agency
        Object.values(model.agencies).forEach(agency => {
            const hasMatchingSubAgency = Array.from(agency.subAgencies || []).some(subAgencyId => {
                const subAgency = model.subAgencies[subAgencyId];
                return subAgency && subAgency.name === subAgencyFilter;
            });
            
            if (hasMatchingSubAgency) {
                agenciesToShow.push(agency);
            }
        });
    } else {
        // Show top agencies by value
        agenciesToShow = Object.values(model.agencies)
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }
    
    // Add agencies as top-level nodes (awarding_agency_name)
    agenciesToShow.forEach(agency => {
        const agencyNode = {
            name: agency.name, // Use awarding_agency_name
            id: "agency-" + Math.random().toString(36).substring(2, 9),
            value: agency.value,
            children: []
        };
        
        // If a sub-agency filter is applied, add the sub-agency as an intermediate node
        if (subAgencyFilter) {
            // Find the matching sub-agencies
            const matchingSubAgencies = [];
            
            Array.from(agency.subAgencies || []).forEach(subAgencyId => {
                const subAgency = model.subAgencies[subAgencyId];
                if (subAgency && subAgency.name === subAgencyFilter) {
                    matchingSubAgencies.push(subAgency);
                }
            });
            
            // If matching sub-agencies found, add them as intermediate nodes (awarding_sub_agency_name)
            if (matchingSubAgencies.length > 0) {
                matchingSubAgencies.forEach(subAgency => {
                    const subAgencyNode = {
                        name: subAgency.name, // Use awarding_sub_agency_name
                        id: "subagency-" + Math.random().toString(36).substring(2, 9),
                        value: subAgency.value,
                        isSubAgency: true,
                        children: []
                    };
                    
                    // Find offices for this sub-agency (awarding_office_name)
                    const officesForSubAgency = {};
                    
                    Array.from(subAgency.offices || []).forEach(officeId => {
                        const office = model.offices[officeId];
                        if (office) {
                            officesForSubAgency[officeId] = {
                                id: officeId,
                                name: office.name,
                                value: office.value
                            };
                        }
                    });
                    
                    // Sort offices by value and take top 5
                    const topOffices = Object.values(officesForSubAgency)
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 7);
                    
                    // Add office nodes
                    topOffices.forEach(office => {
                        const officeNode = {
                            name: office.name, // Use awarding_office_name
                            id: "office-" + Math.random().toString(36).substring(2, 9),
                            value: office.value,
                            isOffice: true,
                            children: []
                        };
                        
                        // Find primes for this office (recipient_name)
                        const primesForOffice = {};
                        
                        // Get contracts connected to this office
                        Object.values(model.contracts).forEach(contract => {
                            if (contract.officeId === office.id) {
                                const primeId = contract.primeId;
                                if (!primesForOffice[primeId]) {
                                    primesForOffice[primeId] = 0;
                                }
                                primesForOffice[primeId] += contract.value;
                            }
                        });
                        
                        // Sort primes by value and take top 3
                        const topPrimes = Object.entries(primesForOffice)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 7)
                            .map(([primeId, value]) => ({
                                id: primeId,
                                value: value
                            }));
                        
                        // Add prime contractor nodes
                        topPrimes.forEach(prime => {
                            const primeData = model.primes[prime.id];
                            if (!primeData) return;
                            
                            const primeNode = {
                                name: primeData.name, // Use recipient_name
                                id: "prime-" + Math.random().toString(36).substring(2, 9),
                                value: prime.value,
                                isPrime: true,
                                children: []
                            };
                            
                            // Find subs for this prime (subawardee_name)
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
                            
                            // Sort subs by value and take top 2
                            const topSubs = Object.entries(subsForPrime)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 7)
                                .map(([subId, value]) => ({
                                    id: subId,
                                    value: value
                                }));
                            
                            // Add sub nodes
                            topSubs.forEach(sub => {
                                const subData = model.subs[sub.id];
                                if (!subData) return;
                                
                                primeNode.children.push({
                                    name: subData.name, // Use subawardee_name
                                    id: "sub-" + Math.random().toString(36).substring(2, 9),
                                    value: sub.value,
                                    isSub: true
                                });
                            });
                            
                            // Add prime if it has children or significant value
                            if (primeNode.children.length > 0 || prime.value > 100000) {
                                officeNode.children.push(primeNode);
                            }
                        });
                        
                        // Add office if it has children
                        if (officeNode.children.length > 0) {
                            subAgencyNode.children.push(officeNode);
                        }
                    });
                    
                    // Add sub-agency if it has children
                    if (subAgencyNode.children.length > 0) {
                        agencyNode.children.push(subAgencyNode);
                    }
                });
            }
        } else {
            // No filter - add sub-agencies directly under agency
            const subAgenciesForAgency = {};
            
            Array.from(agency.subAgencies || []).forEach(subAgencyId => {
                const subAgency = model.subAgencies[subAgencyId];
                if (subAgency) {
                    subAgenciesForAgency[subAgencyId] = {
                        id: subAgencyId,
                        name: subAgency.name,
                        value: subAgency.value
                    };
                }
            });
            
            // Sort sub-agencies by value and take top 3
            const topSubAgencies = Object.values(subAgenciesForAgency)
                .sort((a, b) => b.value - a.value)
                .slice(0, 3);
            
            // Add sub-agency nodes
            topSubAgencies.forEach(subAgency => {
                const subAgencyNode = {
                    name: subAgency.name, // Use awarding_sub_agency_name
                    id: "subagency-" + Math.random().toString(36).substring(2, 9),
                    value: subAgency.value,
                    isSubAgency: true,
                    children: []
                };
                
                // Find offices for this sub-agency
                const officesForSubAgency = {};
                
                const subAgencyObj = model.subAgencies[subAgency.id];
                if (subAgencyObj && subAgencyObj.offices) {
                    Array.from(subAgencyObj.offices).forEach(officeId => {
                        const office = model.offices[officeId];
                        if (office) {
                            officesForSubAgency[officeId] = {
                                id: officeId,
                                name: office.name,
                                value: office.value
                            };
                        }
                    });
                }
                
                // Sort offices by value and take top 2
                const topOffices = Object.values(officesForSubAgency)
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 2);
                
                // Add office nodes
                topOffices.forEach(office => {
                    const officeNode = {
                        name: office.name, // Use awarding_office_name
                        id: "office-" + Math.random().toString(36).substring(2, 9),
                        value: office.value,
                        isOffice: true,
                        children: []
                    };
                    
                    // Add prime contractors for this office
                    // This is similar to the code above for filtered sub-agencies
                    const primesForOffice = {};
                    
                    Object.values(model.contracts).forEach(contract => {
                        if (contract.officeId === office.id) {
                            const primeId = contract.primeId;
                            if (!primesForOffice[primeId]) {
                                primesForOffice[primeId] = 0;
                            }
                            primesForOffice[primeId] += contract.value;
                        }
                    });
                    
                    // Sort primes by value and take top 2
                    const topPrimes = Object.entries(primesForOffice)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 2)
                        .map(([primeId, value]) => ({
                            id: primeId,
                            value: value
                        }));
                    
                    // Add prime contractor nodes
                    topPrimes.forEach(prime => {
                        const primeData = model.primes[prime.id];
                        if (!primeData) return;
                        
                        const primeNode = {
                            name: primeData.name, // Use recipient_name
                            id: "prime-" + Math.random().toString(36).substring(2, 9),
                            value: prime.value,
                            isPrime: true,
                            children: []
                        };
                        
                        // Add subs for this prime
                        const subsForPrime = {};
                        
                        model.relationships.primeToSub.forEach(rel => {
                            if (rel.source === prime.id) {
                                const subId = rel.target;
                                if (!subsForPrime[subId]) {
                                    subsForPrime[subId] = 0;
                                }
                                subsForPrime[subId] += rel.value;
                            }
                        });
                        
                        // Sort subs by value and take top 1
                        const topSubs = Object.entries(subsForPrime)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 1)
                            .map(([subId, value]) => ({
                                id: subId,
                                value: value
                            }));
                        
                        // Add sub nodes
                        topSubs.forEach(sub => {
                            const subData = model.subs[sub.id];
                            if (!subData) return;
                            
                            primeNode.children.push({
                                name: subData.name, // Use subawardee_name
                                id: "sub-" + Math.random().toString(36).substring(2, 9),
                                value: sub.value,
                                isSub: true
                            });
                        });
                        
                        // Add prime if it has children or significant value
                        if (primeNode.children.length > 0 || prime.value > 100000) {
                            officeNode.children.push(primeNode);
                        }
                    });
                    
                    // Add office if it has children
                    if (officeNode.children.length > 0) {
                        subAgencyNode.children.push(officeNode);
                    }
                });
                
                // Add sub-agency if it has children
                if (subAgencyNode.children.length > 0) {
                    agencyNode.children.push(subAgencyNode);
                }
            });
        }
        
        // Add agency if it has children
        if (agencyNode.children.length > 0) {
            root.children.push(agencyNode);
        }
    });
    
    // Add a check for empty visualization
    if (root.children.length === 0) {
        // Create a dummy agency to ensure something displays
        root.children.push({
            name: subAgencyFilter ? `No data for ${subAgencyFilter}` : "Selected Agency",
            id: "agency-" + Math.random().toString(36).substring(2, 9),
            value: 1000000,
            children: [{
                name: "No Data Found",
                id: "subagency-" + Math.random().toString(36).substring(2, 9),
                value: 1000000,
                isSubAgency: true,
                children: []
            }]
        });
    }
    
    return root;
}
// Get theme-aware color scheme for the dendrogram
function getDendrogramColors() {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (isDarkMode) {
        // Dark mode color palette - more saturated, slightly brighter colors
        return {
            agency: '#9580FF',          // Vibrant purple
            subagency: '#B8A5FF',       // Lighter purple
            office: '#5EADF2',          // Bright blue
            prime: '#5CD6B2',           // Teal
            sub: '#FFA15C',             // Orange
            background: '#1E1A22',      // Dark background
            text: '#F4F2F6',            // Light text
            secondaryText: '#B5B0BD',   // Dimmed text
            border: '#3A373E'           // Dark border
        };
    } else {
        // Light mode color palette - slightly desaturated, deeper colors
        return {
            agency: '#6E56C7',          // Deep purple
            subagency: '#9984E8',       // Medium purple
            office: '#3F8CCA',          // Deep blue
            prime: '#2EB28F',           // Deep teal
            sub: '#E67A33',             // Deep orange
            background: '#FFFFFF',      // Light background
            text: '#36323A',            // Dark text
            secondaryText: '#615C66',   // Medium text
            border: '#D7D4DC'           // Light border
        };
    }
}
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
    
    // Get the current sub-agency filter (if any)
    const subAgencyFilter = document.getElementById('sub-agency-filter')?.value || '';
    
    // Check if we have valid model data
    if (!model || !Object.keys(model.agencies).length) {
        displayNoData(containerId, 'No data available for hierarchical visualization.');
        return;
    }
    
    try {
        // Create wide-format SVG container
        const width = 1600;
        const height = 800;
        
        const svg = d3.select(container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        // Create a single container group for the visualization
        const vizContainer = svg.append("g")
            .attr("class", "viz-container");
            
        // Create hierarchical data
        const hierarchyData = createHierarchyData(model, subAgencyFilter);
        
        // Convert to d3 hierarchy
        const originalRoot = d3.hierarchy(hierarchyData);
        originalRoot.sort((a, b) => (b.data.value || 0) - (a.data.value || 0));
        
        // Keep track of current view state
        let currentRoot = originalRoot;
        let breadcrumbPath = [];
        
        // Initial render
        renderView();
        
        // Main render function
        function renderView() {
            // Clear previous content
            vizContainer.selectAll("*").remove();
            
            // Create tree layout for current root
            const treeLayout = d3.tree()
                .size([height - 150, width - 300])
                .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));
            
            // Clone the current root to avoid modifying the original
            const root = d3.hierarchy(currentRoot.data);
            root.sort((a, b) => (b.data.value || 0) - (a.data.value || 0));
            
            // Apply layout
            treeLayout(root);
            
            // Adjust horizontal spacing
            const levelWidth = (width - 300) / (root.height + 1);
            root.each(d => {
                d.y = 100 + (d.depth * levelWidth);
            });
            
            // Create a group for the chart
            const chart = vizContainer.append("g")
                .attr("class", "chart")
                .attr("transform", `translate(30, 75)`);
            
            // Create links
            const link = chart.append("g")
                .attr("class", "links")
                .selectAll("path")
                .data(root.links())
                .join("path")
                .attr("fill", "none")
                .attr("stroke", getCssVar('--color-border'))
                .attr("stroke-opacity", 0.8)
                .attr("d", d3.linkHorizontal()
                    .x(d => d.y)
                    .y(d => d.x))
                .attr("stroke-width", d => {
                    const value = d.target.data.value || 0;
                    return Math.max(0.5, Math.min(2, Math.log10(value + 1) / 6));
                });
            
            // Get node type function (accounting for breadcrumb depth)
            function getNodeType(d) {
                const effectiveDepth = breadcrumbPath.length + d.depth;
                
                if (effectiveDepth === 0) return 'root';
                if (effectiveDepth === 1) return 'agency';
                if (effectiveDepth === 2) {
                    return d.data.isSubAgency ? 'subagency' : 'unknown';
                }
                if (effectiveDepth === 3) {
                    return d.data.isOffice ? 'office' : 'prime';
                }
                if (effectiveDepth === 4) {
                    return d.data.isPrime ? 'prime' : 'sub';
                }
                return 'sub';
            }
            
            // Calculate node radius based on type
            function getNodeRadius(d) {
                const type = getNodeType(d);
                if (type === 'root') return 0;
                if (type === 'agency') return 8;
                if (type === 'subagency') return 7;
                if (type === 'office') return 6;
                if (type === 'prime') return 5;
                return 4;
            }
            
            // Create node groups
            const nodeGroups = chart.append("g")
                .attr("class", "nodes")
                .selectAll("g.node")
                .data(root.descendants())
                .join("g")
                .attr("class", d => `node ${d.children && d.children.length > 0 ? 'has-children' : 'leaf'}`)
                .attr("transform", d => `translate(${d.y},${d.x})`)
                .attr("data-type", d => getNodeType(d))
                .attr("data-name", d => d.data.name)
                .style("cursor", d => d.children && d.children.length > 0 ? "pointer" : "default");
            
            // Get theme-aware colors
const colors = getDendrogramColors();

// Add circles to nodes
nodeGroups.append("circle")
    .attr("r", d => getNodeRadius(d))
    .attr("fill", d => {
        const type = getNodeType(d);
        if (type === 'root') return 'none';
        if (type === 'agency') return colors.agency;
        if (type === 'subagency') return colors.subagency;
        if (type === 'office') return colors.office;
        if (type === 'prime') return colors.prime;
        return colors.sub;
    })
    .attr("stroke", colors.background)
    .attr("stroke-width", 1.5);

            
            // Add plus icon for nodes with children
            nodeGroups.filter(d => d.children && d.children.length > 0)
                .append("text")
                .attr("class", "drill-icon")
                .attr("dy", "0.3em")
                .attr("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("fill", getCssVar('--color-surface'))
                .text("+");
            
            // Add labels with inline values
            nodeGroups.append("text")
                .attr("class", "node-label")
                .attr("dy", "0.32em")
                .attr("x", d => {
                    const nodeRadius = getNodeRadius(d);
                    return d.children ? -nodeRadius - 6 : nodeRadius + 6;
                })
                .attr("text-anchor", d => d.children ? "end" : "start")
                .attr("font-size", d => {
                    const type = getNodeType(d);
                    if (type === 'agency') return "12px";
                    if (type === 'subagency') return "11px";
                    if (type === 'office') return "10px";
                    return "9px";
                })
                .attr("fill", getCssVar('--color-text-primary'))
                .text(d => {
                    const name = d.data.name || "";
                    const type = getNodeType(d);
                    
                    // Combine name and value for prime and sub nodes
                    if (type === 'prime' || type === 'sub') {
                        const valueStr = d.data.value ? ` (${formatConciseCurrency(d.data.value)})` : '';
                        
                        // Adjust max length based on name + value length
                        const maxNameLength = 45 - valueStr.length;
                        
                        if (name.length > maxNameLength) {
                            return name.substring(0, maxNameLength - 3) + "..." + valueStr;
                        }
                        return name + valueStr;
                    }
                    
                    // For other node types, just display name
                    const maxLength = type === 'agency' ? 30 : 
                                     type === 'subagency' ? 30 :
                                     type === 'office' ? 30 : 25;
                                     
                    if (name.length > maxLength) {
                        return name.substring(0, maxLength - 3) + "...";
                    }
                    
                    return name;
                });
            
            // Add separate value labels for agency, subagency, and office nodes
            nodeGroups.filter(d => {
                const type = getNodeType(d);
                return (type === 'agency' || type === 'subagency' || type === 'office') && d.data.value;
            })
            .append("text")
            .attr("class", "value-label")
            .attr("x", d => {
                const nodeRadius = getNodeRadius(d);
                return d.children ? -nodeRadius - 6 : nodeRadius + 6;
            })
            .attr("y", 14)
            .attr("text-anchor", d => d.children ? "end" : "start")
            .attr("font-size", "9px")
            .attr("fill", getCssVar('--color-text-secondary'))
            .text(d => formatConciseCurrency(d.data.value));
            
            // Set up tooltip
            let tooltip = d3.select("body").select("#tree-tooltip");
            if (tooltip.empty()) {
                tooltip = d3.select("body").append("div")
                    .attr("id", "tree-tooltip")
                    .style("position", "absolute")
                    .style("visibility", "hidden")
                    .style("opacity", 0)
                    .style("background-color", getCssVar('--color-surface'))
                    .style("border", `1px solid ${getCssVar('--color-border')}`)
                    .style("border-radius", "4px")
                    .style("padding", "10px")
                    .style("color", getCssVar('--color-text-primary'))
                    .style("font-size", "12px")
                    .style("pointer-events", "none")
                    .style("z-index", 1000)
                    .style("max-width", "350px")
                    .style("box-shadow", "0 3px 14px rgba(0,0,0,0.15)");
            }
            
            // Tooltip functions
            function showTooltip(event, d) {
                const percentage = (100 * d.data.value / originalRoot.data.value).toFixed(1);
                const type = getNodeType(d);
                
                let tooltipContent = `
                    <div style="font-weight: bold; margin-bottom: 5px;">${d.data.name || 'Unknown'}</div>
                    <div>Type: ${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    <div>Value: ${formatCurrency(d.data.value || 0)}</div>
                    <div>Share: ${percentage}%</div>
                `;
                
                // Add child count info for clickable nodes
                if (d.children && d.children.length > 0) {
                    tooltipContent += `<div>Children: ${d.children.length}</div>`;
                    tooltipContent += `<div style="color: ${getCssVar('--color-text-tertiary')}; font-style: italic; margin-top: 5px;">Click to drill down</div>`;
                }
                
                tooltip.html(tooltipContent)
                    .style("visibility", "visible")
                    .style("opacity", 1)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
            
            function hideTooltip() {
                tooltip.style("visibility", "hidden").style("opacity", 0);
            }
            
            // Add direct click handler to nodes with children
            nodeGroups.filter(d => d.children && d.children.length > 0)
                .on("click", function(event, d) {
                    event.stopPropagation(); // Stop event propagation
                    
                    // Find the node in the original hierarchy by path
                    const path = [...breadcrumbPath, d.data.name];
                    const targetNode = findNodeByPath(originalRoot, path);
                    
                    if (targetNode) {
                        // Save current view in breadcrumb
                        breadcrumbPath.push(d.data.name);
                        currentRoot = targetNode;
                        renderView();
                    }
                });
            
            // Add hover effects
            nodeGroups.on("mouseover", function(event, d) {
                d3.select(this).select("circle")
                    .attr("stroke", getCssVar('--chart-color-primary'))
                    .attr("stroke-width", 2);
                
                showTooltip(event, d);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).select("circle")
                    .attr("stroke", getCssVar('--color-surface'))
                    .attr("stroke-width", 1.5);
                
                hideTooltip();
            });
            
            // Add breadcrumb navigation if we're not at the root
            if (breadcrumbPath.length > 0) {
                const breadcrumb = vizContainer.append("g")
                    .attr("class", "breadcrumb")
                    .attr("transform", "translate(30, 30)");
                
                // Add "Root" button
                const rootBtn = breadcrumb.append("g")
                    .attr("class", "breadcrumb-item")
                    .attr("transform", "translate(0, 0)")
                    .style("cursor", "pointer");
                
                rootBtn.append("rect")
                    .attr("width", 70)
                    .attr("height", 24)
                    .attr("rx", 4)
                    .attr("fill", getCssVar('--color-surface-variant'))
                    .attr("stroke", getCssVar('--color-border'));
                
                rootBtn.append("text")
                    .attr("x", 35)
                    .attr("y", 16)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "11px")
                    .attr("fill", getCssVar('--color-text-primary'))
                    .text("Root View");
                
                rootBtn.on("click", function() {
                    // Reset to root
                    breadcrumbPath = [];
                    currentRoot = originalRoot;
                    renderView();
                });
                
                // Add breadcrumb items
                let xOffset = 80;
                
                breadcrumbPath.forEach((name, i) => {
                    const isLast = i === breadcrumbPath.length - 1;
                    
                    // Add separator
                    breadcrumb.append("text")
                        .attr("x", xOffset)
                        .attr("y", 16)
                        .attr("text-anchor", "middle")
                        .attr("font-size", "14px")
                        .attr("fill", getCssVar('--color-text-tertiary'))
                        .text("›");
                    
                    xOffset += 15;
                    
                    // Calculate width for item
                    const displayName = name.length > 20 ? name.substring(0, 17) + "..." : name;
                    const textWidth = displayName.length * 6 + 20; // Approximate width
                    
                    // Create breadcrumb item
                    const item = breadcrumb.append("g")
                        .attr("class", "breadcrumb-item")
                        .attr("transform", `translate(${xOffset}, 0)`)
                        .style("cursor", isLast ? "default" : "pointer");
                    
                    item.append("rect")
                        .attr("width", textWidth)
                        .attr("height", 24)
                        .attr("rx", 4)
                        .attr("fill", isLast ? getCssVar('--color-primary') : getCssVar('--color-surface-variant'))
                        .attr("stroke", getCssVar('--color-border'));
                    
                    item.append("text")
                        .attr("x", textWidth / 2)
                        .attr("y", 16)
                        .attr("text-anchor", "middle")
                        .attr("font-size", "11px")
                        .attr("fill", isLast ? getCssVar('--color-on-primary') : getCssVar('--color-text-primary'))
                        .text(displayName);
                    
                    if (!isLast) {
                        item.on("click", function() {
                            // Navigate to this breadcrumb
                            breadcrumbPath = breadcrumbPath.slice(0, i + 1);
                            const targetNode = findNodeByPath(originalRoot, breadcrumbPath);
                            if (targetNode) {
                                currentRoot = targetNode;
                                renderView();
                            }
                        });
                    }
                    
                    xOffset += textWidth + 5;
                });
            }
            
            // Add simple legend
            const legend = vizContainer.append("g")
                .attr("class", "legend")
                .attr("transform", breadcrumbPath.length > 0 ? "translate(30, 80)" : "translate(30, 30)");
                
            const legendData = [
    { label: "Agency", color: colors.agency },
    { label: "Sub-Agency", color: colors.subagency },
    { label: "Office", color: colors.office },
    { label: "Prime", color: colors.prime },
    { label: "Sub", color: colors.sub }
];
            
            legendData.forEach((item, i) => {
                const g = legend.append("g")
                    .attr("transform", `translate(0, ${i * 20})`);
                    
                g.append("rect")
                    .attr("width", 12)
                    .attr("height", 12)
                    .attr("fill", item.color);
                    
                g.append("text")
                    .attr("x", 18)
                    .attr("y", 10)
                    .attr("font-size", "10px")
                    .attr("fill", getCssVar('--color-text-secondary'))
                    .text(item.label);
            });
            
            // Add help text
            vizContainer.append("g")
                .attr("class", "help-text")
                .attr("transform", `translate(${width - 20}, ${height - 10})`)
                .append("text")
                .attr("text-anchor", "end")
                .attr("font-size", "9px")
                .attr("fill", getCssVar('--color-text-tertiary'))
                .text("Click node to drill down, click breadcrumb to navigate back");
        }
        
        // Helper function to find a node by path from root
        function findNodeByPath(root, path) {
            let current = root;
            
            // Follow each name in the path
            for (let i = 0; i < path.length; i++) {
                const name = path[i];
                
                // Find child with this name
                if (!current.children) return null;
                
                let found = false;
                for (let j = 0; j < current.children.length; j++) {
                    if (current.children[j].data.name === name) {
                        current = current.children[j];
                        found = true;
                        break;
                    }
                }
                
                if (!found) return null;
            }
            
            return current;
        }
        
        // Add zoom functionality to the SVG
        const zoom = d3.zoom()
            .scaleExtent([0.2, 5])
            .on("zoom", (event) => {
                vizContainer.attr("transform", event.transform);
            });
            
        svg.call(zoom)
           .on("dblclick.zoom", function() {
                svg.transition().duration(750).call(
                    zoom.transform,
                    d3.zoomIdentity.translate(0, 0).scale(1)
                );
            });
            
    } catch (error) {
        console.error("Error creating visualization:", error);
        displayError(containerId, `Failed to render visualization: ${error.message}`);
    }
}
// Custom force function for clustering nodes at different relationship levels
function isolatedNodesClusterForce(nodes, relationshipMap, strength = 0.5) {
    function force(alpha) {
        relationshipMap.forEach((childIds, parentId) => {
            const parentNode = nodes.find(n => n.id === parentId);
            if (!parentNode) return;

            const childNodes = nodes.filter(n => childIds.includes(n.id)); 
            if (childNodes.length === 0) return;

            const parentAngle = Math.atan2(parentNode.y, parentNode.x);
            const arcRange = Math.PI / 3; // 60 degrees

            childNodes.forEach((childNode, i) => {
                // Ensure division by zero is avoided and single nodes are centered
                const angleOffset = childNodes.length > 1 ? 
                    (arcRange * (i / (childNodes.length - 1))) : arcRange / 2;
                const childAngle = parentAngle - (arcRange / 2) + angleOffset;

                // Distance depends on the node types
                const distance = 
                    (parentNode.type === 'prime' && childNode.type === 'sub') ? 45 :
                    (parentNode.type === 'office' && childNode.type === 'prime') ? 55 :
                    (parentNode.type === 'subagency' && childNode.type === 'office') ? 65 : 
                    75;
                
                const targetX = parentNode.x + (distance * Math.cos(childAngle));
                const targetY = parentNode.y + (distance * Math.sin(childAngle));

                childNode.x += (targetX - childNode.x) * alpha * strength;
                childNode.y += (targetY - childNode.y) * alpha * strength;
            });
        });
    }
    
    // Allow strength to be configured
    force.strength = function(s) {
        if (arguments.length) {
            strength = s;
            return force;
        }
        return strength;
    };
    
    return force;
}