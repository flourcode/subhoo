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
let currentSearchTerm = '';
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
function fetchDataFromS3(dataset) {
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
                reject(new Error(`Failed to fetch data: ${response.status} ${statusText}`)); 
                return; 
            }
            return response.text();
        })
        .then(csvText => {
            if (csvText === undefined) {
                 return; 
            }
            // Process the CSV data
            processDataset(dataset, Papa.parse(csvText, {
                header: true,
                dynamicTyping: false,
                skipEmptyLines: 'greedy',
                transformHeader: header => header.trim()
            }).data);
            resolve(); 
        })
        .catch(error => {
            console.error(`Error fetching dataset ${dataset.name}:`, error);
            reject(error); 
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
    displayNoData('bento-naics-distribution', 'Select a dataset to view NAICS distribution.'); 

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
async function loadSingleDataset(dataset) {
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

    // Set loading states for containers
    setLoading('contract-leaders-table-container', true, `Loading ${dataset.name} leader data...`);
    setLoading('tav-tcv-chart-container', true, `Loading ${dataset.name} TAV/TCV data...`);
    setLoading('expiring-contracts-table-container', true, `Loading ${dataset.name} expiring contracts...`);
    setLoading('sankey-chart-container', true, `Loading ${dataset.name} award flow...`);
    setLoading('map-container', true, `Loading ${dataset.name} performance data...`);

    // Reset data based on dataset type
    if (dataset.type === 'primes') {
        rawData.primes = [];
    } else {
        rawData.subs = [];
    }
    
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

        try {
        await fetchDataFromS3(dataset);

        console.log(`Single dataset ${dataset.name} fetched and processed, building unified model...`);
        buildUnifiedModel();

        window.unifiedModel = unifiedModel;
        console.log("window.unifiedModel updated after single load. Content length: " + (window.unifiedModel ? JSON.stringify(window.unifiedModel).length : "null"));
        
        updateStatusBanner(`Successfully loaded ${dataset.name}.`, 'success');
        populateFiltersFromUnifiedModel();
        applyFiltersAndUpdateVisuals();
        
        // Add this line:
        ensureAllVisualizationsLoaded();

    } catch (error) {
        console.error(`Error in loadSingleDataset for ${dataset.name}:`, error);
        updateStatusBanner(`Error loading dataset ${dataset.name}: ${error.message}`, 'error');
        resetUIForNoDataset(); 
    } finally {
        isLoading = false; // Ensure isLoading is reset
        document.getElementById('refresh-button').disabled = false; // Ensure button is re-enabled
    }
}

async function loadCombinedDatasets(datasetIds) {
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
    try {
        await fetchDataSequentially(datasets);
        
        isLoading = false;
        document.getElementById('refresh-button').disabled = false;
    } catch (error) {
        console.error("Error loading combined datasets:", error);
        updateStatusBanner(`Error loading datasets: ${error.message}`, 'error');
        isLoading = false;
        document.getElementById('refresh-button').disabled = false;
    }
}

async function fetchDataSequentially(datasets) {
    try {
        for (let i = 0; i < datasets.length; i++) {
            const dataset = datasets[i];
            console.log(`Loading dataset ${i + 1}/${datasets.length}: ${dataset.name}`);
            updateStatusBanner(`Loading ${dataset.name} data (${i + 1}/${datasets.length})...`);
            
            await fetchAndProcessDataset(dataset);
        }
        
        console.log("All datasets loaded, building unified model...");
        buildUnifiedModel();
        window.unifiedModel = unifiedModel; 
        console.log("window.unifiedModel updated after combined load. Content length: " + (window.unifiedModel ? JSON.stringify(window.unifiedModel).length : "null"));
        
        updateStatusBanner(`Successfully loaded combined data.`, 'success');
        
        populateFiltersFromUnifiedModel();
        applyFiltersAndUpdateVisuals();
        
        // Add this line:
        ensureAllVisualizationsLoaded();
        
    } catch (error) {
        console.error("Error loading combined datasets:", error);
        updateStatusBanner(`Error loading datasets: ${error.message}`, 'error');
        throw error; // Rethrow to handle in the calling function
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
    setLoading('bento-naics-distribution', true); 
   
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
    
    // NAICS Donut Chart
    const naicsDistributionData = processNaicsDistributionData(filteredModel);
    const naicsDonutChartContainerId = 'naics-donut-chart-container'; 
    const naicsBentoBoxId = 'bento-naics-distribution'; 

    // Set loading state for the bento box just before trying to draw
    setLoading(naicsBentoBoxId, true, 'Loading NAICS distribution...');

    // Use a timeout to allow the DOM to update and containers to get their sizes
    setTimeout(() => {
        displayNaicsDonutChart(naicsDistributionData, naicsDonutChartContainerId, 5);
        // Turn off loading for the bento box AFTER the chart attempts to draw or shows a no-data message
        setLoading(naicsBentoBoxId, false);
    }, 100);
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

    // Refine primeToSub relationships to ensure they link through filtered contracts
    // Create a set of Prime IDs that are definitely included due to contracts passing ALL filters
    const validPrimeIdsFromFilteredContracts = new Set();
    Object.values(filtered.contracts).forEach(contract => {
        validPrimeIdsFromFilteredContracts.add(contract.primeId);
    });

    // Filter the primeToSub relationships:
    // Keep only those where the source (prime) is in our valid set
    // AND the target (sub) exists in the already filtered subs list.
    const fullyFilteredPrimeToSub = filtered.relationships.primeToSub.filter(rel =>
        validPrimeIdsFromFilteredContracts.has(rel.source) && // Prime MUST be linked to a contract that passed filters
        filtered.subs[rel.target]                             // Sub must also exist after its own filtering
    );

    // Replace the potentially over-inclusive relationships in the model being returned
    filtered.relationships.primeToSub = fullyFilteredPrimeToSub;
    
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
        .sort((a, b) => b.totalValue - a.totalValue);

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

function processNaicsDistributionData(filteredModel) {
    if (!filteredModel || !filteredModel.contracts) {
        return [];
    }

    console.log("Processing NAICS distribution data from model");

    const naicsAggregates = {};
    
    // Process all contracts
    Object.values(filteredModel.contracts || {}).forEach(contract => {
        // Skip if no NAICS code or no value
        if (!contract.naicsCode || contract.value <= 0) return;

        // Add to aggregates
        const code = contract.naicsCode;
        const desc = contract.naicsDesc || "N/A";
        
        if (!naicsAggregates[code]) {
            naicsAggregates[code] = { 
                code: code, 
                desc: desc, 
                name: code, // For color mapping
                value: 0 
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

    console.log(`Processed ${sortedNaicsData.length} NAICS codes for distribution chart`);
    return sortedNaicsData;
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

function initializeThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    
    if (!toggleBtn || !moonIcon || !sunIcon) {
        console.warn("Theme toggle elements not found");
        return;
    }
    
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
// Add global variables to store sort state
let leadersTableSort = { key: 'totalValue', dir: 'desc' }; // Default sort for leaders
let expiringTableSort = { key: 'period_of_performance_current_end_date', dir: 'asc' }; // Default sort for expiring

// Utility function to add sort icons
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

function displayContractLeadersTable(leaderData) {
    const containerId = 'contract-leaders-table-container';
    const tableId = 'leaders-table'; // Give the table an ID
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found.`);
        return;
    }
    setLoading(containerId, false);

    // Keep existing setup for export button etc.
    container.innerHTML = ''; // Clear previous

    if (!leaderData || leaderData.length === 0) {
        displayNoData(containerId, 'No contract leader data found.');
        return;
    }

    // Create header section with export button
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
        const exportData = leaderData.map(leader => ({ 
            contractor_name: leader.siName,
            contracts: leader.numAwards,
            subcontractors: leader.numSubs,
            total_value: leader.totalValue,
            average_value: leader.avgValue,
            average_duration_days: leader.avgDurationDays,
            naics_code: leader.dominantNaics?.code || '',
            naics_description: leader.dominantNaics?.desc || ''
        }));
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        exportToCSV(exportData, `top-contractors-${dateStr}.csv`);
    });
    headerSection.appendChild(exportButton);
    container.appendChild(headerSection);

    // Create a table wrapper div
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

    // Define headers with sort keys
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

            // Add click listener for sorting
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

    // Sort the data based on current state BEFORE slicing
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

    // Populate table body (use displayData)
    displayData.forEach(leader => {
        const row = tbody.insertRow();
        // Recipient Name (clickable)
        let cell = row.insertCell();
        cell.className = 'font-medium';
        const nameLink = document.createElement('a');
        nameLink.href = '#';
        nameLink.style.color = getCssVar('--color-primary');
        nameLink.style.textDecoration = 'none';
        nameLink.style.fontWeight = '600';
        nameLink.textContent = truncateText(leader.siName, 35);
        nameLink.title = `View profile for ${leader.siName}`;
        nameLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Future functionality: showContractorProfile(leader.siName);
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

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // Add summary text
    if (leaderData.length > 10) {
        const summaryPara = document.createElement('p');
        summaryPara.className = 'summary-text';
        summaryPara.style.color = getCssVar('--color-text-secondary');
        summaryPara.textContent = `Showing Top 10 of ${leaderData.length} leaders. Sorted by ${sortKey} (${sortDir}).`;
        container.appendChild(summaryPara);
    }

    // Update sort icons AFTER table is built
    updateSortIcons(tableId, sortKey, sortDir);
}

function displayExpiringTable(expiringData) {
    const containerId = 'expiring-contracts-table-container';
    const tableId = 'expiring-table'; // Give the table an ID
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found.`);
        return;
    }
    setLoading(containerId, false);

    // Keep existing setup for export button etc.
    container.innerHTML = ''; // Clear previous

    if (!expiringData || expiringData.length === 0) {
        displayNoData(containerId, 'No contracts found expiring in the next 6 months.');
        return;
    }

    // Create header section with export button
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

    // Define headers with sort keys
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

            // Add click listener for sorting
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

    // Sort the data based on current state
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

    // Populate table body (use sortedData here)
    sortedData.forEach(contract => {
        const row = tbody.insertRow();
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

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // Add summary text
    const summaryPara = document.createElement('p');
    summaryPara.className = 'summary-text';
    summaryPara.style.color = getCssVar('--color-text-secondary');
    summaryPara.textContent = `Showing ${sortedData.length} expiring contracts. Sorted by ${sortKey} (${sortDir}).`;
    container.appendChild(summaryPara);

    // Update sort icons AFTER table is built
    updateSortIcons(tableId, sortKey, sortDir);
}
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

// Initialize processNaicsDistributionData function for NAICS donut chart
if (typeof window.processNaicsDistributionData !== 'function') {
    window.processNaicsDistributionData = function(model) {
        if (!model || !model.contracts) {
            return [];
        }

        console.log("Processing NAICS distribution data from model");

        const naicsAggregates = {};
        
        // Process all contracts
        Object.values(model.contracts || {}).forEach(contract => {
            // Skip if no NAICS code or no value
            if (!contract.naicsCode || contract.value <= 0) return;

            // Add to aggregates
            const code = contract.naicsCode;
            const desc = contract.naicsDesc || "N/A";
            
            if (!naicsAggregates[code]) {
                naicsAggregates[code] = { 
                    code: code, 
                    desc: desc, 
                    name: code, // For color mapping
                    value: 0 
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

        console.log(`Processed ${sortedNaicsData.length} NAICS codes for distribution chart`);
        return sortedNaicsData;
    };
}

// Main initialization function
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
            
            // Load combined datasets with a slight delay to ensure UI is ready
            setTimeout(() => {
                loadCombinedDatasets([socomPrimes.id, socomSubs.id]);
            }, 300);
        } else if (socomPrimes) {
            console.log("Automatically loading SOCOM primes dataset...");
            
            // Update the dropdown to show SOCOM as selected
            const datasetSelect = document.getElementById('dataset-select');
            if (datasetSelect) {
                datasetSelect.value = 'socom_primes';
            }
            
            // Load the SOCOM dataset with a slight delay
            setTimeout(() => {
                loadSingleDataset(socomPrimes);
            }, 300);
        } else {
            console.log("SOCOM dataset not found in the DATASETS array");
        }
        
        console.log("Dashboard initialized.");
    } catch (e) {
        console.error("Error during dashboard initialization:", e);
    }
});

// In your resize handler, add this call
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
           ensureAllVisualizationsLoaded(); // Add this line
       } else if (rawData.primes.length > 0 || rawData.subs.length > 0) {
           applyFiltersAndUpdateVisuals();
           ensureAllVisualizationsLoaded(); // Add this line
       }
   }, 250); // Debounce for 250ms
});
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
        
        // Get color values directly rather than using CSS vars for the interpolation
        const baseColor = isDarkMode ? 
            d3.rgb(getCssVar('--color-surface-variant')).toString() : 
            d3.rgb(getCssVar('--color-surface-variant')).toString();
            
        const highlightColor = isDarkMode ?
            d3.rgb(getCssVar('--chart-color-primary')).toString() :
            d3.rgb(getCssVar('--chart-color-primary')).toString();

        // Create explicit color scale using the extracted RGB values
        const colorScale = d3.scaleSequential()
            .domain([0, maxValue === 0 ? 1 : maxValue])
            .interpolator(d3.interpolate(baseColor, highlightColor));

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

function displayEnhancedSankeyChart(model) {
    const containerId = 'sankey-chart-container';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error("Sankey chart container not found.");
        return;
    }

    // Clear previous content
    container.innerHTML = '';
    
    setLoading(containerId, false);
    
    if (!model || 
       (!model.relationships.agencyToPrime.length && !model.relationships.primeToSub.length)) {
        displayNoData(containerId, 'No data available for Sankey diagram.');
        return;
    }
    
    try {
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
        
        // Add panel titles
        const leftTitle = document.createElement('div');
        leftTitle.style.textAlign = 'center';
        leftTitle.style.marginBottom = '10px';
        leftTitle.style.fontWeight = 'bold';
        leftTitle.style.color = getCssVar('--color-text-primary');
        leftTitle.textContent = 'Agency to Prime Contractors';
        leftPanelContainer.appendChild(leftTitle);
        
        const rightTitle = document.createElement('div');
        rightTitle.style.textAlign = 'center';
        rightTitle.style.marginBottom = '10px';
        rightTitle.style.fontWeight = 'bold';
        rightTitle.style.color = getCssVar('--color-text-primary');
        rightTitle.textContent = 'Prime to Subcontractors';
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
        
        // Get data for left panel (agencies to primes)
        const leftData = processAgencyToPrimeSankeyData(model);
        
        // Get data for right panel (primes to subs)
        const rightData = processPrimeToSubSankeyData(model);
        
        // Set up dimensions and colors
        const panelWidth = leftPanelContainer.clientWidth || 300;
        const panelHeight = leftPanelContainer.clientHeight || 400;
        const margin = {top: 20, right: 20, bottom: 20, left: 20};
        
        // Create tooltip
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "sankey-tooltip")
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
            
        // Draw both Sankey diagrams
        if (leftData.nodes.length > 0 && leftData.links.length > 0) {
            drawSankeyDiagram(
                d3.select(leftSvg),
                leftData.nodes,
                leftData.links,
                panelWidth,
                panelHeight,
                margin,
                tooltip,
                'left'
            );
        } else {
            // No data for left panel
            d3.select(leftSvg)
                .append("text")
                .attr("x", panelWidth / 2)
                .attr("y", panelHeight / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", getCssVar('--color-text-secondary'))
                .attr("opacity", 0.7)
                .text("No agency-prime data available");
        }
        
        if (rightData.nodes.length > 0 && rightData.links.length > 0) {
            drawSankeyDiagram(
                d3.select(rightSvg),
                rightData.nodes,
                rightData.links,
                panelWidth,
                panelHeight,
                margin,
                tooltip,
                'right'
            );
        } else {
            // No data for right panel
            d3.select(rightSvg)
                .append("text")
                .attr("x", panelWidth / 2)
                .attr("y", panelHeight / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", getCssVar('--color-text-secondary'))
                .attr("opacity", 0.7)
                .text("No prime-sub data available");
        }
        
    } catch (error) {
        console.error("Error rendering Sankey chart:", error);
        displayError(containerId, `Error rendering Sankey chart: ${error.message}`);
    }
}

function processAgencyToPrimeSankeyData(model) {
    const nodes = [];
    const links = [];
    const nodeMap = {};
    
    // Get top agency-prime relationships by value
    const topRelationships = model.relationships.agencyToPrime
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    
    // Exit early if no relationships
    if (topRelationships.length === 0) {
        return { nodes, links };
    }
    
    // Build nodes and node map
    let nodeIndex = 0;
    
    // First, add agency nodes
    const agencyIds = new Set();
    topRelationships.forEach(rel => agencyIds.add(rel.source));
    
    agencyIds.forEach(agencyId => {
        const agency = model.agencies[agencyId];
        if (agency) {
            nodes.push({
                name: truncateText(agency.name, 30),
                id: agencyId,
                type: 'agency',
                index: nodeIndex
            });
            nodeMap[agencyId] = nodeIndex++;
        }
    });
    
    // Then, add prime nodes
    const primeIds = new Set();
    topRelationships.forEach(rel => primeIds.add(rel.target));
    
    primeIds.forEach(primeId => {
        const prime = model.primes[primeId];
        if (prime) {
            nodes.push({
                name: truncateText(prime.name, 30),
                id: primeId,
                type: 'prime',
                index: nodeIndex
            });
            nodeMap[primeId] = nodeIndex++;
        }
    });
    
    // Create links from the top relationships
    topRelationships.forEach(rel => {
        if (nodeMap.hasOwnProperty(rel.source) && nodeMap.hasOwnProperty(rel.target)) {
            links.push({
                source: nodeMap[rel.source],
                target: nodeMap[rel.target],
                value: rel.value
            });
        }
    });
    
    return { nodes, links };
}

function processPrimeToSubSankeyData(model) {
    const nodes = [];
    const links = [];
    const nodeMap = {};
    
    // Get top prime-sub relationships by value
    const topRelationships = model.relationships.primeToSub
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    
    // Exit early if no relationships
    if (topRelationships.length === 0) {
        return { nodes, links };
    }
    
    // Build nodes and node map
    let nodeIndex = 0;
    
    // First, add prime nodes
    const primeIds = new Set();
    topRelationships.forEach(rel => primeIds.add(rel.source));
    
    primeIds.forEach(primeId => {
        const prime = model.primes[primeId];
        if (prime) {
            nodes.push({
                name: truncateText(prime.name, 30),
                id: primeId,
                type: 'prime',
                index: nodeIndex
            });
            nodeMap[primeId] = nodeIndex++;
        }
    });
    
    // Then, add sub nodes
    const subIds = new Set();
    topRelationships.forEach(rel => subIds.add(rel.target));
    
    subIds.forEach(subId => {
        const sub = model.subs[subId];
        if (sub) {
            nodes.push({
                name: truncateText(sub.name, 30),
                id: subId,
                type: 'sub',
                index: nodeIndex
            });
            nodeMap[subId] = nodeIndex++;
        }
    });
    
    // Create links from the top relationships
    topRelationships.forEach(rel => {
        if (nodeMap.hasOwnProperty(rel.source) && nodeMap.hasOwnProperty(rel.target)) {
            links.push({
                source: nodeMap[rel.source],
                target: nodeMap[rel.target],
                value: rel.value
            });
        }
    });
    
    return { nodes, links };
}

function drawSankeyDiagram(svgSelection, nodes, links, width, height, margin, tooltip, panelSide) {
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
    
    // Create node colors based on type
    const nodeColors = {
        'agency': getCssVar('--chart-color-tertiary'),
        'subagency': getCssVar('--chart-color-tertiary'),
        'office': getCssVar('--chart-color-tertiary'),
        'prime': getCssVar('--chart-color-primary'),
        'sub': getCssVar('--chart-color-secondary')
    };
    
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
            tooltip.html(html);
            tooltip.style("visibility", "visible")
                .style("opacity", 1)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            
            // Highlight link
            d3.select(this).attr('stroke-opacity', 0.8);
        })
        .on('mousemove', function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on('mouseout', function() {
            tooltip.style("visibility", "hidden")
                .style("opacity", 0);
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
        .attr('width', d => d.x1 - d.x0)
        .attr('fill', d => nodeColors[d.type] || '#999')
        .attr('stroke', getCssVar('--color-surface'))
        .attr('stroke-width', 1)
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            // Show tooltip
            const html = `
                <div style="font-weight: bold; margin-bottom: 5px;">${d.name}</div>
                <div>Type: ${d.type.charAt(0).toUpperCase() + d.type.slice(1)}</div>
                <div>Total Value: ${formatCurrency(d.value)}</div>
            `;
            tooltip.html(html)
                .style("visibility", "visible")
                .style("opacity", 1)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            
            // Highlight node
            d3.select(this)
                .attr('stroke', getCssVar('--color-primary'))
                .attr('stroke-width', 2);
        })
        .on('mousemove', function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on('mouseout', function() {
            tooltip.style("visibility", "hidden")
                .style("opacity", 0);
            d3.select(this)
                .attr('stroke', getCssVar('--color-surface'))
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
        .attr('fill', getCssVar('--color-text-primary'))
        .each(function(d) {
            // Hide labels for small nodes
            if ((d.y1 - d.y0) < 5) {
                d3.select(this).remove();
            }
        });
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
        // Create hierarchical data structure
        const hierarchyData = createHierarchyData(model, subAgencyFilter);
        
        // Create wide-format SVG container
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        const svg = d3.select(container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        // Create tree layout
        const treeLayout = d3.tree()
            .size([height - 50, width - 200])
            .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));
        
        // Create hierarchy from data
        const root = d3.hierarchy(hierarchyData);
        
        // Apply layout
        treeLayout(root);
        
        // Create container group
        const g = svg.append("g")
            .attr("transform", `translate(50, 25)`);
        
        // Create links
        g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x))
            .attr('fill', 'none')
            .attr('stroke', getCssVar('--color-border'))
            .attr('stroke-width', 1);
        
        // Create nodes
        const nodes = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', d => `node ${d.children ? 'node--internal' : 'node--leaf'}`)
            .attr('transform', d => `translate(${d.y}, ${d.x})`);
        
        // Add node circles
        nodes.append('circle')
            .attr('r', 5)
            .attr('fill', d => {
                if (d.depth === 0) return 'none'; // Hide root
                if (d.depth === 1) return getCssVar('--chart-color-primary');
                if (d.depth === 2) return getCssVar('--chart-color-secondary');
                return getCssVar('--chart-color-tertiary');
            })
            .attr('stroke', getCssVar('--color-surface'))
            .attr('stroke-width', 1.5);
        
        // Add node labels
        nodes.append('text')
            .attr('dy', '0.31em')
            .attr('x', d => d.children ? -8 : 8)
            .attr('text-anchor', d => d.children ? 'end' : 'start')
            .attr('font-size', d => {
                if (d.depth === 0) return '0px'; // Hide root
                if (d.depth === 1) return '12px';
                if (d.depth === 2) return '11px';
                return '10px';
            })
            .text(d => d.depth === 0 ? '' : d.data.name)
            .attr('fill', getCssVar('--color-text-primary'))
            .each(function(d) {
                const el = d3.select(this);
                const text = el.text();
                if (text.length > 30) {
                    el.text(text.substring(0, 27) + '...');
                }
            });
        
        // Add tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'hierarchy-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', getCssVar('--color-surface'))
            .style('color', getCssVar('--color-text-primary'))
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('border', `1px solid ${getCssVar('--color-border')}`);
        
        nodes.on('mouseover', function(event, d) {
            if (d.depth === 0) return; // Skip root node
            
            // Calculate value for non-leaf nodes
            let value = d.data.value || 0;
            if (!value && d.children) {
                value = d.children.reduce((sum, child) => sum + (child.data.value || 0), 0);
            }
            
            // Create tooltip content
            let content = `<div style="font-weight: bold;">${d.data.name}</div>`;
            if (value > 0) {
                content += `<div>Value: ${formatCurrency(value)}</div>`;
            }
            if (d.children) {
                content += `<div>Children: ${d.children.length}</div>`;
            }
            
            tooltip.html(content)
                .style('visibility', 'visible')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            
            // Highlight node
            d3.select(this).select('circle')
                .attr('stroke', getCssVar('--color-primary'))
                .attr('stroke-width', 2);
        })
        .on('mousemove', function(event) {
            tooltip.style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('visibility', 'hidden');
            
            d3.select(this).select('circle')
                .attr('stroke', getCssVar('--color-surface'))
                .attr('stroke-width', 1.5);
        });
        
    } catch (error) {
        console.error("Error creating visualization:", error);
        displayError(containerId, `Failed to render visualization: ${error.message}`);
    }
}

function createHierarchyData(model, subAgencyFilter) {
    // Create root node
    const root = {
        name: "Root",
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
    
    // Add agencies as top-level nodes
    agenciesToShow.forEach(agency => {
        const agencyNode = {
            name: agency.name,
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
            
            // Add filtered sub-agencies
            matchingSubAgencies.forEach(subAgency => {
                const subAgencyNode = {
                    name: subAgency.name,
                    value: subAgency.value,
                    children: []
                };
                
                // Add top offices for this sub-agency
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
                    .slice(0, 5);
                
                // Add office nodes
                topOffices.forEach(office => {
                    const officeNode = {
                        name: office.name,
                        value: office.value,
                        children: []
                    };
                    
                    subAgencyNode.children.push(officeNode);
                });
                
                agencyNode.children.push(subAgencyNode);
            });
        } else {
            // No filter - add top sub-agencies
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
            
            // Sort and take top 3
            const topSubAgencies = Object.values(subAgenciesForAgency)
                .sort((a, b) => b.value - a.value)
                .slice(0, 3);
            
            // Add sub-agency nodes
            topSubAgencies.forEach(subAgency => {
                const subAgencyNode = {
                    name: subAgency.name,
                    value: subAgency.value,
                    children: []
                };
                
                agencyNode.children.push(subAgencyNode);
            });
        }
        
        // Add agency if it has children
        if (agencyNode.children.length > 0) {
            root.children.push(agencyNode);
        }
    });
    
    // Ensure we have some data
    if (root.children.length === 0) {
        root.children.push({
            name: "No Data Available",
            value: 0,
            children: []
        });
    }
    
    return root;
}

function displayNaicsDonutChart(data, containerId, topN = 5) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found`);
        return;
    }
    
    // Clear the container
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        displayNoData(containerId, 'No NAICS data available for distribution.');
        return;
    }
    
    try {
        // Set up dimensions and colors
        const width = container.clientWidth || 300;
        const height = container.clientHeight || 300;
        const radius = Math.min(width, height) / 2 * 0.8;
        const innerRadius = radius * 0.6;
        
        // Take top N codes plus "Other"
        const topItems = data.slice(0, topN);
        const otherValue = data.slice(topN).reduce((sum, item) => sum + item.value, 0);
        
        const chartData = [...topItems];
        if (otherValue > 0) {
            chartData.push({
                code: 'Other',
                desc: `Other NAICS (${data.length - topN} codes)`,
                value: otherValue,
                percentage: 100 - topItems.reduce((sum, item) => sum + item.percentage, 0)
            });
        }
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);
        
        // Create color scale
        const colors = [
            getCssVar('--chart-color-primary'),
            getCssVar('--chart-color-secondary'),
            getCssVar('--chart-color-tertiary'),
            d3.color(getCssVar('--chart-color-primary')).darker(0.5),
            d3.color(getCssVar('--chart-color-secondary')).darker(0.5),
            d3.color(getCssVar('--chart-color-tertiary')).darker(0.5)
        ];
        
        const color = d3.scaleOrdinal()
            .domain(chartData.map(d => d.code))
            .range(colors);
        
        // Create donut chart
        const pie = d3.pie()
            .sort(null)
            .value(d => d.value);
        
        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius)
            .cornerRadius(1);
        
        // Add arcs
        const arcs = svg.selectAll('.arc')
            .data(pie(chartData))
            .enter()
            .append('g')
            .attr('class', 'arc');
        
        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.code === 'Other' ? getCssVar('--color-text-tertiary') : color(d.data.code))
            .attr('stroke', getCssVar('--color-surface'))
            .attr('stroke-width', 1);
        
        // Add tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'donut-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', getCssVar('--color-surface'))
            .style('color', getCssVar('--color-text-primary'))
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('border', `1px solid ${getCssVar('--color-border')}`);
        
        arcs.on('mouseover', function(event, d) {
            // Create tooltip content
            let content = `<div style="font-weight: bold;">${d.data.code}</div>`;
            if (d.data.desc) {
                content += `<div>${d.data.desc}</div>`;
            }
            content += `<div>Value: ${formatCurrency(d.data.value)}</div>`;
            content += `<div>Share: ${d.data.percentage.toFixed(1)}%</div>`;
            
            tooltip.html(content)
                .style('visibility', 'visible')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            
            // Highlight arc
            d3.select(this).select('path')
                .attr('stroke', getCssVar('--color-primary'))
                .attr('stroke-width', 2);
        })
        .on('mousemove', function(event) {
            tooltip.style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('visibility', 'hidden');
            
            d3.select(this).select('path')
                .attr('stroke', getCssVar('--color-surface'))
                .attr('stroke-width', 1);
        });
        
        // Add center text
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.5em')
            .attr('font-size', '12px')
            .attr('fill', getCssVar('--color-text-secondary'))
            .text('Top NAICS');
        
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1em')
            .attr('font-size', '14px')
            .attr('fill', getCssVar('--color-text-primary'))
            .attr('font-weight', 'bold')
            .text(data[0].code);
        
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '2.5em')
            .attr('font-size', '10px')
            .attr('fill', getCssVar('--color-text-tertiary'))
            .text(truncateText(data[0].desc, 40));
        
    } catch (error) {
        console.error("Error creating donut chart:", error);
        displayNoData(containerId, `Error: ${error.message}`);
    }
}

function displayShareOfWalletChart(model) {
    // Process data for Share of Wallet
    const contractorShares = processShareOfWalletData(model);
    
    // Display in the container
    displayShareOfWalletDonut(contractorShares);
}

function processShareOfWalletData(model) {
    if (!model || !model.primes) {
        return [];
    }
    
    // Aggregate values by prime contractor
    const primeValues = {};
    let totalValue = 0;
    
    // Get value from each prime
    Object.values(model.primes).forEach(prime => {
        if (prime.value > 0) {
            primeValues[prime.name] = (primeValues[prime.name] || 0) + prime.value;
            totalValue += prime.value;
        }
    });
    
    // Convert to array and sort
    const sortedPrimes = Object.entries(primeValues)
        .map(([name, value]) => ({
            name: name,
            value: value,
            percentage: 0
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
}

function displayShareOfWalletDonut(data) {
    const containerId = 'share-of-wallet-container';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error(`Container #${containerId} not found`);
        ensureShareOfWalletContainer();
        return;
    }
    
    // Clear the container
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        displayNoData(containerId, 'No market share data available.');
        return;
    }
    
    try {
        // Set up dimensions and colors
        const width = container.clientWidth || 300;
        const height = container.clientHeight || 300;
        const radius = Math.min(width, height) / 2 * 0.8;
        const innerRadius = radius * 0.6;
        
        // Format long names
        data.forEach(item => {
            if (item.name && item.name.length > 20 && !item.isOther) {
                item.fullName = item.name;
                const parts = item.name.split(' ');
                if (parts.length > 2) {
                    item.name = parts[0] + ' ' + parts[1];
                } else {
                    item.name = item.name.substring(0, 18) + '...';
                }
            }
        });
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);
        
        // Create color scale
        const colors = [
            getCssVar('--chart-color-primary'),
            getCssVar('--chart-color-secondary'),
            getCssVar('--chart-color-tertiary'),
            d3.color(getCssVar('--chart-color-primary')).darker(0.3),
            d3.color(getCssVar('--chart-color-secondary')).darker(0.3),
            d3.color(getCssVar('--chart-color-tertiary')).darker(0.3),
            d3.color(getCssVar('--chart-color-primary')).brighter(0.3)
        ];
        
        const color = d3.scaleOrdinal()
            .domain(data.map(d => d.name))
            .range(colors);
        
        // Create donut chart
        const pie = d3.pie()
            .sort(null)
            .value(d => d.value);
        
        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius)
            .cornerRadius(1);
        
        // Add arcs
        const arcs = svg.selectAll('.arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');
        
        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.isOther ? getCssVar('--color-text-tertiary') : color(d.data.name))
            .attr('stroke', getCssVar('--color-surface'))
            .attr('stroke-width', 1);
        
        // Add tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'share-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', getCssVar('--color-surface'))
            .style('color', getCssVar('--color-text-primary'))
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('border', `1px solid ${getCssVar('--color-border')}`);
        
        arcs.on('mouseover', function(event, d) {
            // Create tooltip content
            let content = `<div style="font-weight: bold;">${d.data.fullName || d.data.name}</div>`;
            content += `<div>Value: ${formatCurrency(d.data.value)}</div>`;
            content += `<div>Market Share: ${d.data.percentage.toFixed(1)}%</div>`;
            if (d.data.isOther && d.data.count) {
                content += `<div>Includes ${d.data.count} other contractors</div>`;
            }
            
            tooltip.html(content)
                .style('visibility', 'visible')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            
            // Highlight arc
            d3.select(this).select('path')
                .attr('stroke', getCssVar('--color-primary'))
                .attr('stroke-width', 2);
        })
        .on('mousemove', function(event) {
            tooltip.style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('visibility', 'hidden');
            
            d3.select(this).select('path')
                .attr('stroke', getCssVar('--color-surface'))
                .attr('stroke-width', 1);
        });
        
        // Add center text
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.5em')
            .attr('font-size', '12px')
            .attr('fill', getCssVar('--color-text-secondary'))
            .text('Market Leader');
        
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1em')
            .attr('font-size', '14px')
            .attr('fill', getCssVar('--color-text-primary'))
            .attr('font-weight', 'bold')
            .text(data[0].name);
        
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '2.5em')
            .attr('font-size', '10px')
            .attr('fill', getCssVar('--color-text-tertiary'))
            .text(`${data[0].percentage.toFixed(1)}% of market`);
        
    } catch (error) {
        console.error("Error creating share of wallet chart:", error);
        displayNoData(containerId, `Error: ${error.message}`);
    }
}

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
function ensureAllVisualizationsLoaded() {
    console.log("Ensuring all visualizations are properly loaded and displayed...");
    
    // Get the current filter values
    const subAgencyFilter = document.getElementById('sub-agency-filter')?.value || '';
    const naicsFilter = document.getElementById('naics-filter')?.value || '';
    const searchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    
    // Force re-application of filters with a slight delay to ensure containers are ready
    setTimeout(() => {
        if (unifiedModel) {
            // First, make sure all containers are visible
            ensureContainersVisible();
            
            // Then apply filters and update visuals
            updateVisualsFromUnifiedModel(subAgencyFilter, naicsFilter, searchTerm);
            
            // Try to render Share of Wallet chart separately with a delay
            setTimeout(() => {
                try {
                    displayShareOfWalletChart(unifiedModel);
                } catch (e) {
                    console.error("Error displaying Share of Wallet chart:", e);
                }
            }, 500);
        }
    }, 300);
}

function ensureContainersVisible() {
    // List of all visualization containers
    const containerIds = [
        'contract-leaders-table-container',
        'tav-tcv-chart-container',
        'expiring-contracts-table-container', 
        'sankey-chart-container',
        'map-container',
        'circular-dendrogram-container',
        'bento-naics-distribution'
    ];
    
    // Ensure all containers are visible and initialized
    containerIds.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            // Make sure the container is visible
            container.style.display = 'block';
            
            // If container has no height, try to give it a default height
            if (container.clientHeight < 10) {
                container.style.minHeight = '250px';
            }
            
            // Make sure parent bento box is visible
            const bentoBox = container.closest('.bento-box');
            if (bentoBox) {
                bentoBox.style.display = 'block';
            }
        }
    });
    
    // Ensure Share of Wallet container exists
    ensureShareOfWalletContainer();
}