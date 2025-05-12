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
        await fetchDataFromS3(dataset); // Await the promise

        console.log(`Single dataset ${dataset.name} fetched and processed, building unified model...`);
        buildUnifiedModel(); // This function populates the global 'unifiedModel'

        // Make the model globally available
        window.unifiedModel = unifiedModel;
        console.log("window.unifiedModel updated after single load. Content length: " + (window.unifiedModel ? JSON.stringify(window.unifiedModel).length : "null"));
        
        updateStatusBanner(`Successfully loaded ${dataset.name}.`, 'success');
        populateFiltersFromUnifiedModel();
        applyFiltersAndUpdateVisuals();

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
