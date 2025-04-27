// Global variables
let rawData = [];
let processedData = null;
let tableSortKey = 'subaward_amount';
let tableSortDirection = 'desc';
let currentSankeyData = null;
let currentAgency = 'dhs'; // Your default agency
let currentFocusNode = null;
let minContractValue = 2000000; // Your default min value
let activeLevels = ['subagency', 'office', 'prime', 'sub']; // Restored full hierarchy
let topNFilterValue = 0; // Keep if logic is still present, though UI removed
let resizeTimeout;
let currentVizType = 'sankey';
let minValueUpdateTimeout;
let currentSearchTerm = '';
let currentMapFocusState = null;
let userChangedMinValue = false;
let currentNaicsFilter = '';
let currentSubAgencyFilter = ''; // Keep SubAgency variable
let currentOfficeFilter = '';    // Keep Office filter variable
let currentPrimeFilter = '';
let currentSubFilter = '';
let allExpiringContracts = []; // Stores all contracts meeting criteria
let displayedExpiringCount = 0; // How many are currently shown
let expiringSortKey = 'endDate'; // Default sort: Potential End Date
let expiringSortDirection = 'asc'; // Default direction: Ascending (soonest first)
const DEFAULT_MIN_VALUE = 2000000; // Your default
const CHOROPLETH_MIN_VALUE = 0;
const itemsPerLoad = 10; // Initial items to show
const itemsToAdd = 50; // How many to add when "Load More" is clicked
const expiringAmountThreshold = 200000; // $200,000 threshold

// --- Unified Monochromatic Desaturated Purple Color Scale ---
const nodeTypes = ['agency', 'subagency', 'office', 'prime', 'sub'];
let monochromaticPurpleColors = {}; // Object to store colors read from CSS

// Function to read CSS variables ONCE after DOM is ready
function initializeColorScale() {
    const style = getComputedStyle(document.documentElement);
    monochromaticPurpleColors = {
        agency: style.getPropertyValue('--sankey-node-agency').trim() || '#9993A1', // Fallback
        subagency: style.getPropertyValue('--sankey-node-subagency').trim() || '#878094',
        office: style.getPropertyValue('--sankey-node-office').trim() || '#797484',
        prime: style.getPropertyValue('--sankey-node-prime').trim() || '#706877',
        sub: style.getPropertyValue('--sankey-node-sub').trim() || '#615C66'
    };
//     console.log("Read Monochromatic Colors from CSS:", monochromaticPurpleColors);

    // Define the single scale using the read values
    window.monochromaticPurpleScale = d3.scaleOrdinal()
        .domain(nodeTypes)
        .range([
            monochromaticPurpleColors.agency,
            monochromaticPurpleColors.subagency,
            monochromaticPurpleColors.office,
            monochromaticPurpleColors.prime,
            monochromaticPurpleColors.sub
        ]);
}

/// Initialize the application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async function() {
//     console.log("DOM Loaded. Initializing application...");

    window.appInitialized = false;

    try {
        // Attach basic event listeners
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        document.getElementById('agency-selector').addEventListener('change', changeAgency);
        document.getElementById('min-value').addEventListener('input', debounceMinValueUpdate);
        document.getElementById('reset-filters').addEventListener('click', () => resetFilters(true));
        document.getElementById('info-panel-close').addEventListener('click', closeInfoPanel);
        document.getElementById('breadcrumb').addEventListener('click', handleBreadcrumbClick);

        // Set up level filters
        const levelButtons = document.querySelectorAll('#level-filters button');
        levelButtons.forEach(button => {
            button.addEventListener('click', toggleLevelFilter);
        });

        // NEW: Set up collapsible filter sections
        document.querySelectorAll('.filter-section > summary').forEach(summary => {
            summary.addEventListener('click', function(e) {
                // Don't add preventDefault here to allow native details/summary behavior
                // But you can add custom animation logic if desired
                
                // Track which sections are open/closed for user preferences
                const details = this.parentElement;
                const sectionId = details.getAttribute('data-section') || 
                                 summary.querySelector('h3')?.textContent || 
                                 'unknown-section';
                
//                 console.log(`Filter section ${sectionId} ${details.open ? 'opened' : 'closed'}`);
                
                // Optional: save user preference
                // localStorage.setItem(`filter-section-${sectionId}`, details.open ? 'open' : 'closed');
            });
        });
        
        // NEW: Set up the two-column layout responsive behavior
        function adjustFilterColumns() {
            const filterRows = document.querySelectorAll('.filter-row');
            const isMobile = window.innerWidth < 600;
            
            filterRows.forEach(row => {
                const columns = row.querySelectorAll('.filter-column');
                columns.forEach(column => {
                    column.style.width = isMobile ? '100%' : 'calc(50% - 4px)';
                    column.style.marginBottom = isMobile ? '8px' : '0';
                });
            });
        }
// --- Share Button Listener with Null Check ---
    const shareButton = document.getElementById('share-button');

    if (shareButton) {
        // Add the 'if' check around the listener attachment
        shareButton.addEventListener('click', async () => {
            // This will copy the URL currently in the address bar
            const urlToShare = window.location.href;

            const shareData = {
                title: document.title,
                text: 'Check out Subhoo - Federal Subcontractor Intelligence!', // Optional text
                url: urlToShare
            };

            // Try the native Web Share API first
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                    // console.log('Page shared successfully');
                } catch (err) {
                    if (err.name !== 'AbortError') {
                       console.error('Error sharing:', err);
                       showNotification(`Could not share: ${err.message}`, 'error');
                    } // Ignore AbortError (user cancellation)
                }
            } else {
                // --- Fallback: Copy to Clipboard ---
                // This code runs if navigator.share is not available
                console.warn('Web Share API not supported. Attempting to copy URL to clipboard.');
                try {
                    await navigator.clipboard.writeText(urlToShare);
                    // Success notification
                    showNotification('Link copied to clipboard!', 'info'); // Make sure showNotification function exists
                } catch (clipErr) {
                    console.error('Failed to copy URL to clipboard:', clipErr);
                    // Error notification
                    showNotification('Sharing not supported & failed to copy link. Please copy the URL manually.', 'warning');
                }
                // --- End Fallback ---
            }
        });
    } else {
        console.warn('Share button element (#share-button) not found when attaching listener.');
    }
    // --- End Share Button Logic ---
const exportExpiringBtn = document.getElementById('export-expiring-csv');
if (exportExpiringBtn) {
    exportExpiringBtn.addEventListener('click', exportExpiringContractsCSV);
}
        // Call initially and on resize
        adjustFilterColumns();
        window.addEventListener('resize', adjustFilterColumns);

        // Setup other components
        setupVisualizationToggle();
        setupResponsiveVisualization();
        setTimeout(setupStatsCardTooltips, 500);
        addCssFixes();
      
        // Setup filtering components
        setupEnhancedFilters();
        
        // NEW: Restore filter section states from user preferences (if saved)
        restoreFilterSectionStates();
	const loadMoreBtn = document.getElementById('load-more-expiring');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreExpiringContracts);
    }
    } catch(e) {
        console.error("Error attaching initial event listeners:", e);
    }
	initializeColorScale();
    await discoverAgencies();
    window.appInitialized = true;
});

// NEW: Helper function to restore filter section open/closed states
function restoreFilterSectionStates() {
    document.querySelectorAll('.filter-section[data-section]').forEach(section => {
        const sectionId = section.getAttribute('data-section');
        const savedState = localStorage.getItem(`filter-section-${sectionId}`);
        
        if (savedState === 'open') {
            section.setAttribute('open', '');
        } else if (savedState === 'closed') {
            section.removeAttribute('open');
        }
        // If no saved state, use the default (as specified in HTML)
    });
}

// Set up window resize listener for responsive charts
function setupResponsiveVisualization() {
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
//             console.log("Window resized - updating visualizations");
            if (currentVizType) {
                updateVisualization(currentVizType);
            } else if (currentSankeyData) {
                drawSankeyDiagram(currentSankeyData);
            }
        }, 250);
    });

    const visualizationContainer = document.querySelector('.visualization');
    if (visualizationContainer && window.ResizeObserver) {
        const resizeObserver = new ResizeObserver((entries) => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
//                 console.log("Container size changed - updating current visualization");
                if (currentVizType) {
                    updateVisualization(currentVizType);
                } else if (currentSankeyData) {
                    drawSankeyDiagram(currentSankeyData);
                }
            }, 250);
        });
        resizeObserver.observe(visualizationContainer);
//         console.log("Resize observer attached to visualization container");
    }
}

function addCssFixes() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .viz-panel { visibility: hidden; opacity: 0; transition: opacity 0.3s ease; }
        .viz-panel.active { visibility: visible; opacity: 1; transition: opacity 0.3s ease; }
        .stats-card { cursor: pointer; transition: background-color 0.2s ease; }
        .stats-card:hover { background-color: var(--color-surface-container-high); }
        
        /* NEW: Filter panel height reduction styles */
        .filter-section summary {
            cursor: pointer;
            user-select: none;
        }
        
        .filter-section summary h3 {
            display: inline-block;
            margin: 0;
            padding-bottom: 4px;
        }
        
        .filter-section summary::marker,
        .filter-section summary::-webkit-details-marker {
            color: var(--app-accent-color);
        }
        
        .filter-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .filter-column {
            flex: 1;
            min-width: calc(50% - 4px);
        }
        
        @media (max-width: 600px) {
            .filter-column {
                width: 100%;
                min-width: 100%;
                margin-bottom: 8px;
            }
        }
        
        .sidebar .filter-section {
            margin-bottom: 8px;
            padding-bottom: 8px;
        }
        
        .sidebar label {
            margin-bottom: 3px;
            font-size: 0.75rem;
        }
        
        .filter-select {
            padding: 6px 8px;
            font-size: 0.85rem;
            line-height: 1.2;
        }
    `;
    document.head.appendChild(styleElement);
//     console.log("Added CSS fixes");
}
// Enhanced Filter Setup Functions
function setupEnhancedFilters() {
//     console.log("Setting up enhanced filters...");
    setupSearchFilter();
    setupSubAgencyFilter(); // Set up SubAgency filter
    setupOfficeFilter();    // Set up Office filter
    setupNaicsFilter();
    setupPrimeContractorFilter();
    setupSubcontractorFilter();
    // setupTopNFilter(); // Ensure this remains commented/removed if UI is gone
//     console.log("Enhanced filters setup complete");
}
function setupSubAgencyFilter() {
    const subAgencyFilter = document.getElementById('subagency-filter'); // Target correct ID
    if (!subAgencyFilter) {
         console.warn("SubAgency filter select element (#subagency-filter) not found in HTML.");
         return; // Exit if element not found
    }
    // Attach event listener
    subAgencyFilter.addEventListener('change', () => {
        currentSubAgencyFilter = subAgencyFilter.value; // Update correct global variable
//         console.log(`SubAgency filter changed to: ${currentSubAgencyFilter || 'All'}`);
        if (rawData && rawData.length > 0) {
            processData(); // Trigger data reprocessing
        }
    });
//     console.log("SubAgency Filter setup complete");
}
function setupSearchFilter() {
    const searchInput = document.getElementById('data-search');
    if (!searchInput) {
        console.warn("Search input element not found");
        return;
    }
    
    const searchContainer = searchInput.parentElement;
    if (!searchContainer) {
        console.warn("Search container not found");
        return;
    }
    
    // First, remove ALL existing clear buttons to start fresh
    const existingButtons = searchContainer.querySelectorAll('.search-clear-btn, #search-clear-btn, button[aria-label="Clear search"]');
    existingButtons.forEach(button => button.remove());
    
    // Create a single new clear button with a distinctive ID
    const clearButton = document.createElement('button');
    clearButton.id = 'search-clear-btn';
    clearButton.className = 'search-clear-btn';
    clearButton.innerHTML = '&times;';
    clearButton.setAttribute('aria-label', 'Clear search');
    
    // Apply styles for the clear button
    Object.assign(clearButton.style, {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        fontSize: '1.2rem',
        color: 'var(--color-on-surface-variant)',
        cursor: 'pointer',
        display: searchInput.value ? 'block' : 'none',
        zIndex: '100' // Very high z-index to ensure it's on top
    });
    
    // Add click handler
    clearButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        searchInput.value = '';
        clearButton.style.display = 'none';
        currentSearchTerm = '';
        if (rawData && rawData.length > 0) {
            processData();
        }
        // Focus back on the input
        searchInput.focus();
    });
    
    // Add the button at the end of the container
    searchContainer.appendChild(clearButton);
    
    // Set up input event handler
    const originalInputHandler = searchInput._inputHandler;
    if (originalInputHandler) {
        // Remove existing handler if present
        searchInput.removeEventListener('input', originalInputHandler);
    }
    
    // Create and store a reference to the new handler
    const inputHandler = function() {
        // Show/hide clear button
        if (clearButton) {
            clearButton.style.display = this.value ? 'block' : 'none';
        }
        
        // Debounce search processing
        clearTimeout(window.searchDebounceTimeout);
        window.searchDebounceTimeout = setTimeout(() => {
            currentSearchTerm = this.value.trim().toLowerCase();
            if (rawData && rawData.length > 0) {
                processData();
            }
        }, 350);
    };
    
    // Store the handler reference
    searchInput._inputHandler = inputHandler;
    
    // Add the event listener
    searchInput.addEventListener('input', inputHandler);
}
function setupTopNFilter() {
    // Look for existing top-n-selector, create it if it doesn't exist
    let topNSelector = document.getElementById('top-n-selector');
    
    if (!topNSelector) {
//         console.log("Creating Top N Filter...");
        
        // Create container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-section top-n-filter';
        
        // Add heading
        const heading = document.createElement('h3');
        heading.textContent = 'Top Subcontracts';
        filterContainer.appendChild(heading);
        
        // Add label
        const label = document.createElement('label');
        label.setAttribute('for', 'top-n-selector');
        label.textContent = 'Show only top contracts:';
        filterContainer.appendChild(label);
        
        // Create select element
        topNSelector = document.createElement('select');
        topNSelector.id = 'top-n-selector';
        topNSelector.className = 'filter-select';
        topNSelector.setAttribute('aria-label', 'Select number of top subcontracts');
        
        // Add options
        const options = [
            { value: 0, text: 'Show All' },
            { value: 10, text: 'Top 10' },
            { value: 25, text: 'Top 25' },
            { value: 50, text: 'Top 50' },
            { value: 100, text: 'Top 100' }
        ];
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            topNSelector.appendChild(option);
        });
        
        filterContainer.appendChild(topNSelector);
        
        // Find sidebar to add it to
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Insert before the reset button
            const resetButton = document.getElementById('reset-filters');
            if (resetButton) {
                sidebar.insertBefore(filterContainer, resetButton);
            } else {
                sidebar.appendChild(filterContainer);
            }
        }
    }
    
    // Attach event listener
    topNSelector.addEventListener('change', () => {
        topNFilterValue = parseInt(topNSelector.value, 10) || 0;
//         console.log(`Top N filter changed to: ${topNFilterValue === 0 ? 'All' : topNFilterValue}`);
        if (processedData && (currentVizType === 'sankey' || currentVizType === 'network' || currentVizType === 'treemap')) {
            updateVisualization(currentVizType);
        }
    });
    
//     console.log("Top N Filter setup complete");
}
function setupOfficeFilter() {
    const officeFilter = document.getElementById('office-filter'); // Target correct ID
    if (!officeFilter) {
         console.warn("Office filter select element (#office-filter) not found in HTML.");
         return; // Exit if element not found
    }
    // Attach event listener
    officeFilter.addEventListener('change', () => {
        currentOfficeFilter = officeFilter.value; // Update correct global variable
//         console.log(`Office filter changed to: ${currentOfficeFilter || 'All'}`);
        if (rawData && rawData.length > 0) {
            processData(); // Trigger data reprocessing
        }
    });
//     console.log("Office Filter setup complete");
}

function setupNaicsFilter() {
    // Create container if it doesn't exist
    let naicsFilter = document.getElementById('naics-filter');
    
    if (!naicsFilter) {
//         console.log("Creating NAICS Filter...");
        
        // Create container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-section naics-filter';
        
        // Add heading
        const heading = document.createElement('h3');
        heading.textContent = 'NAICS Filter';
        filterContainer.appendChild(heading);
        
        // Add label
        const label = document.createElement('label');
        label.setAttribute('for', 'naics-filter');
        label.textContent = 'Filter by NAICS Code:';
        filterContainer.appendChild(label);
        
        // Create select element
        naicsFilter = document.createElement('select');
        naicsFilter.id = 'naics-filter';
        naicsFilter.className = 'filter-select';
        naicsFilter.setAttribute('aria-label', 'Filter by NAICS Code');
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'All NAICS Codes';
        naicsFilter.appendChild(defaultOption);
        
        filterContainer.appendChild(naicsFilter);
        
        // Find sidebar to add it to
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Insert after office filter
            const subAgencySection = document.querySelector('.filter-section.office-filter');
            if (subAgencySection) {
                sidebar.insertBefore(filterContainer, subAgencySection.nextSibling);
            } else {
                sidebar.appendChild(filterContainer);
            }
        }
    }
    
    // Attach event listener
    naicsFilter.addEventListener('change', () => {
        currentNaicsFilter = naicsFilter.value;
//         console.log(`NAICS filter changed to: ${currentNaicsFilter || 'All'}`);
        if (rawData && rawData.length > 0) {
            processData();
        }
    });
    
//     console.log("NAICS Filter setup complete");
}

function setupPrimeContractorFilter() {
    // Create container if it doesn't exist
    let primeFilter = document.getElementById('prime-filter');
    
    if (!primeFilter) {
//         console.log("Creating Prime Contractor Filter...");
        
        // Create container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-section prime-filter';
        
        // Add heading
        const heading = document.createElement('h3');
        heading.textContent = 'Prime Contractor';
        filterContainer.appendChild(heading);
        
        // Add label
        const label = document.createElement('label');
        label.setAttribute('for', 'prime-filter');
        label.textContent = 'Filter by Prime Contractor:';
        filterContainer.appendChild(label);
        
        // Create select element
        primeFilter = document.createElement('select');
        primeFilter.id = 'prime-filter';
        primeFilter.className = 'filter-select';
        primeFilter.setAttribute('aria-label', 'Filter by Prime Contractor');
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'All Prime Contractors';
        primeFilter.appendChild(defaultOption);
        
        filterContainer.appendChild(primeFilter);
        
        // Find sidebar to add it to
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Insert after NAICS filter
            const naicsSection = document.querySelector('.filter-section.naics-filter');
            if (naicsSection) {
                sidebar.insertBefore(filterContainer, naicsSection.nextSibling);
            } else {
                sidebar.appendChild(filterContainer);
            }
        }
    }
    
    // Attach event listener
    primeFilter.addEventListener('change', () => {
        currentPrimeFilter = primeFilter.value;
//         console.log(`Prime filter changed to: ${currentPrimeFilter || 'All'}`);
        if (rawData && rawData.length > 0) {
            processData();
        }
    });
    
//     console.log("Prime Contractor Filter setup complete");
}

function setupSubcontractorFilter() {
    // Create container if it doesn't exist
    let subFilter = document.getElementById('sub-filter');
    
    if (!subFilter) {
//         console.log("Creating Subcontractor Filter...");
        
        // Create container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-section sub-filter';
        
        // Add heading
        const heading = document.createElement('h3');
        heading.textContent = 'Subcontractor';
        filterContainer.appendChild(heading);
        
        // Add label
        const label = document.createElement('label');
        label.setAttribute('for', 'sub-filter');
        label.textContent = 'Filter by Subcontractor:';
        filterContainer.appendChild(label);
        
        // Create select element
        subFilter = document.createElement('select');
        subFilter.id = 'sub-filter';
        subFilter.className = 'filter-select';
        subFilter.setAttribute('aria-label', 'Filter by Subcontractor');
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'All Subcontractors';
        subFilter.appendChild(defaultOption);
        
        filterContainer.appendChild(subFilter);
        
        // Find sidebar to add it to
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Insert after prime filter
            const primeSection = document.querySelector('.filter-section.prime-filter');
            if (primeSection) {
                sidebar.insertBefore(filterContainer, primeSection.nextSibling);
            } else {
                sidebar.appendChild(filterContainer);
            }
        }
    }
    
    // Attach event listener
    subFilter.addEventListener('change', () => {
        currentSubFilter = subFilter.value;
//         console.log(`Subcontractor filter changed to: ${currentSubFilter || 'All'}`);
        if (rawData && rawData.length > 0) {
            processData();
        }
    });
    
//     console.log("Subcontractor Filter setup complete");
}

function populateFilterDropdowns() {
    if (!rawData || rawData.length === 0) return;
    populateSubAgencyFilter(); // Populate SubAgency dropdown
    populateOfficeFilter();    // Populate Office dropdown
    populateNaicsFilter();
    populatePrimeFilter();
    populateSubFilter();
//     console.log("All filter dropdowns populated");
}
function populateSubAgencyFilter() {
    const subAgencyFilter = document.getElementById('subagency-filter'); // Target correct ID
    if (!subAgencyFilter || !rawData || rawData.length === 0) return;

    const subAgencies = new Set();
    rawData.forEach(row => {
        // Use the correct data field for sub-agency name
        const subAgency = row.prime_award_awarding_sub_agency_name?.trim();
        if (subAgency && subAgency !== 'null' && subAgency !== 'undefined') {
            subAgencies.add(subAgency);
        }
    });

    // Clear previous options except the first one ("All SubAgencies" - Set in HTML)
    while (subAgencyFilter.options.length > 1) {
        subAgencyFilter.remove(1);
    }

    // Add new options from the data
    const sortedSubAgencies = Array.from(subAgencies).sort();
    sortedSubAgencies.forEach(subAgency => {
        const option = document.createElement('option');
        option.value = subAgency;
        option.textContent = truncateText(subAgency, 60); // Truncate long names if needed
        option.title = subAgency; // Show full name on hover
        subAgencyFilter.appendChild(option);
    });
//     console.log(`Populated SubAgency filter with ${sortedSubAgencies.length} options`);
}

function populateOfficeFilter() {
    const officeFilter = document.getElementById('office-filter'); // Target correct ID
    if (!officeFilter || !rawData || rawData.length === 0) return;

    const offices = new Set();
    rawData.forEach(row => {
        // Use the correct data field for office name
        const office = row.prime_award_awarding_office_name?.trim();
        if (office && office !== 'null' && office !== 'undefined') {
            offices.add(office);
        }
    });

    // Clear previous options except the first one ("All Offices" - Set in HTML)
    while (officeFilter.options.length > 1) {
        officeFilter.remove(1);
    }

    // Add new options from the data
    const sortedOffices = Array.from(offices).sort();
    sortedOffices.forEach(office => {
        const option = document.createElement('option');
        option.value = office;
        option.textContent = truncateText(office, 60); // Truncate long names if needed
        option.title = office; // Show full name on hover
        officeFilter.appendChild(option);
    });
//     console.log(`Populated Office filter with ${sortedOffices.length} options`);
}

function populateNaicsFilter() {
    const naicsFilter = document.getElementById('naics-filter');
    if (!naicsFilter) return;
    
    const naicsCodes = new Map(); // Use map to store code -> description
    rawData.forEach(row => {
        const code = row.prime_award_naics_code?.toString().trim();
        const desc = row.prime_award_naics_description?.trim() || 'No Description';
        if (code && code !== 'null' && code !== 'undefined') {
            naicsCodes.set(code, desc);
        }
    });
    
    // Clear previous options except the first one
    while (naicsFilter.options.length > 1) {
        naicsFilter.remove(1);
    }
    
    // Add new options
    const sortedCodes = Array.from(naicsCodes.keys()).sort();
    sortedCodes.forEach(code => {
        const desc = naicsCodes.get(code);
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${desc}`;
        naicsFilter.appendChild(option);
    });
    
//     console.log(`Populated NAICS filter with ${sortedCodes.length} options`);
}

function populatePrimeFilter() {
    const primeFilter = document.getElementById('prime-filter');
    if (!primeFilter) return;
    
    const primes = new Set();
    rawData.forEach(row => {
        const prime = row.prime_awardee_name?.trim();
        if (prime && prime !== 'null' && prime !== 'undefined') {
            primes.add(prime);
        }
    });
    
    // Clear previous options except the first one
    while (primeFilter.options.length > 1) {
        primeFilter.remove(1);
    }
    
    // Add new options (limit to top 100 alphabetically for performance)
    const sortedPrimes = Array.from(primes).sort().slice(0, 100);
    sortedPrimes.forEach(prime => {
        const option = document.createElement('option');
        option.value = prime;
        option.textContent = prime;
        primeFilter.appendChild(option);
    });
    
//     console.log(`Populated Prime filter with ${sortedPrimes.length} options`);
}

function populateSubFilter() {
    const subFilter = document.getElementById('sub-filter');
    if (!subFilter) return;
    
    const subs = new Set();
    rawData.forEach(row => {
        const sub = row.subawardee_name?.trim();
        if (sub && sub !== 'null' && sub !== 'undefined') {
            subs.add(sub);
        }
    });
    
    // Clear previous options except the first one
    while (subFilter.options.length > 1) {
        subFilter.remove(1);
    }
    
    // Add new options (limit to top 100 alphabetically for performance)
    const sortedSubs = Array.from(subs).sort().slice(0, 100);
    sortedSubs.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        subFilter.appendChild(option);
    });
    
//     console.log(`Populated Subcontractor filter with ${sortedSubs.length} options`);
}


// Update theme-color meta tag for mobile browser UI
function updateThemeColor(color) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', color);
}

function setupVisualizationToggle() {
//     console.log("Setting up visualization toggle...");
    const toggleButtons = document.querySelectorAll('.viz-toggle-btn');

    // Variable to store the initially determined viz type
    let initialVizType = 'sankey'; // Default fallback

    // Determine initial type from URL hash if present
    const hash = window.location.hash.replace('#', '');
    if (hash && ['sankey', 'network', 'choropleth', 'treemap'].includes(hash)) {
        initialVizType = hash;
//         console.log("Determined initial visualization from hash:", initialVizType);
    } else {
//         console.log("No valid hash found, using default visualization:", initialVizType);
    }

    // Set the initial active button and currentVizType state WITHOUT triggering a click/update
    toggleButtons.forEach(button => {
        const vizType = button.getAttribute('data-viz');
        if (vizType === initialVizType) {
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            currentVizType = initialVizType; // Set the global variable
            // Update panels visibility directly here if needed,
            // although updateVisualization will handle it later anyway
            const panels = document.querySelectorAll('.viz-panel');
             panels.forEach(panel => {
                 const panelType = panel.getAttribute('data-viz');
                 panel.classList.toggle('active', panelType === currentVizType);
                 panel.setAttribute('aria-hidden', panelType !== currentVizType);
             });
        } else {
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
        }
    });

    // Now, attach click listeners for subsequent clicks
    toggleButtons.forEach(button => {
        // Use cloneNode to remove any potentially lingering old listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', function(e) {
            const vizType = this.getAttribute('data-viz');
//             console.log("Visualization toggle button clicked:", vizType);

            // Ripple effect (keep if desired)
            const rect = this.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = `${x}px`; ripple.style.top = `${y}px`;
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);

            // Update button states
            toggleButtons.forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); });
            this.classList.add('active'); this.setAttribute('aria-pressed', 'true');

            // Update the global state and call the update function
            // No need to update URL hash if not desired, keep currentVizType updated
            // window.location.hash = vizType; // Optional: remove if hash update isn't needed

            // Only call updateVisualization if the app is ready (data potentially loaded)
            if (window.appInitialized) {
//                 console.log("Calling updateVisualization from toggle click");
                updateVisualization(vizType); // This call is for USER clicks
            } else {
//                 console.log("Skipping visualization update - app not fully initialized");
            }
        });
    });

//     console.log("Enhanced visualization toggle initialized. Initial type set to:", currentVizType);
    // NOTE: The initial call to updateVisualization is now REMOVED from here.
    // It will be triggered by processData() after loadAgencyData() completes.
}
// Enhanced visualization update function
function updateVisualization(vizType) {
//     console.log(`updateVisualization called with type: ${vizType} at:`, new Date().toISOString());

    // Remember previous viz type
    const previousVizType = currentVizType;
    currentVizType = vizType;

    // Only reset min value when toggling between different viz types
    // AND when user hasn't manually changed the value
    if (previousVizType !== vizType && !userChangedMinValue) {
        const slider = document.getElementById('min-value');
        const display = document.getElementById('min-value-display');

        if (slider && display) {
            if (vizType === 'choropleth') {
//                 console.log(`Setting choropleth default min value: ${CHOROPLETH_MIN_VALUE}`);
                slider.value = CHOROPLETH_MIN_VALUE;
                minContractValue = CHOROPLETH_MIN_VALUE;
                display.textContent = formatCurrency(CHOROPLETH_MIN_VALUE);
            }
            // Reset to default for Sankey, Network, AND Treemap
            else if (vizType === 'sankey' || vizType === 'network' || vizType === 'treemap') {
//                 console.log(`Setting ${vizType} default min value: ${DEFAULT_MIN_VALUE}`);
                slider.value = DEFAULT_MIN_VALUE;
                minContractValue = DEFAULT_MIN_VALUE;
                display.textContent = formatCurrency(DEFAULT_MIN_VALUE);
            }
        }
    }

    updateActiveFiltersDisplay(); // Update filter display first
    showLoading(); // Show loading indicator

    // Toggle visibility of the visualization panels
    const panels = document.querySelectorAll('.viz-panel');
    panels.forEach(panel => {
        const panelType = panel.getAttribute('data-viz');
        panel.classList.toggle('active', panelType === vizType);
        panel.setAttribute('aria-hidden', panelType !== vizType);
    });

    // *** Prepare Data and Handle Potential Override ***
    let vizData = prepareVizData(); // Initial attempt with user's min value
    let dataShownBelowMinValue = false; // Flag to pass to drawing functions

    // Check if the initial data is empty and if the user's minimum is above $0
    // Also ensure we don't override for choropleth which uses its own base min value
    const isEmpty = !vizData || !vizData.nodes || vizData.nodes.length === 0;
    if (isEmpty && minContractValue > 0 && vizType !== 'choropleth') {
        console.warn(`No data found for ${vizType} with Min Value >= ${formatCurrency(minContractValue)}. Attempting redraw with $0.`);
        // Retry preparing data with $0 minimum override
        vizData = prepareVizData(0); // Pass 0 as overrideMinValue
        if (vizData && vizData.nodes && vizData.nodes.length > 0) {
             dataShownBelowMinValue = true; // Mark that we are showing adjusted data
//              console.log(`Successfully fetched data for ${vizType} after overriding min value to $0.`);
        } else {
             console.warn(`Still no data found for ${vizType} even with $0 minimum.`);
        }
    }
    // *** End Data Preparation Logic ***

    // --- Call specific drawing functions ---
    try {
        // Draw the selected visualization - PASS vizData and the flag
        switch (vizType) {
            case 'sankey':
                // *** Pass flag to drawSankeyDiagram ***
                drawSankeyDiagram(vizData, dataShownBelowMinValue);
                break;
            case 'network':
                 // *** Pass flag to drawNetworkGraph ***
                drawNetworkGraph(vizData, dataShownBelowMinValue);
                break;
            case 'choropleth':
                 // Choropleth uses its own aggregation, doesn't need the override/flag typically
                 // Ensure we call prepareVizData without override for it if needed specifically
                 // Or just use the initial vizData if appropriate (depends on its internal logic)
                drawChoroplethMap(vizData); // Assuming drawChoroplethMap uses the data appropriately
                break;
           default:
                console.warn(`Unknown viz type: ${vizType}, defaulting to Sankey.`);
                 // *** Pass flag to drawSankeyDiagram ***
                drawSankeyDiagram(vizData, dataShownBelowMinValue); // Fallback
        }
        // Update the legend for the newly drawn visualization
        updateLegend(vizType);

    } catch (error) {
        console.error(`Error updating visualization to ${vizType}:`, error);
        // Display error message in the specific panel
        const panel = document.querySelector(`.viz-panel[data-viz="${vizType}"]`);
        if (panel) {
            panel.innerHTML = `<div class="error-message"><p>Error rendering ${vizType}:</p><p>${error.message}</p></div>`;
        }
    } finally {
        // Update the data table using the *original* filters (not the override)
        updateDataTable();
        hideLoading(); // Hide loading indicator regardless of success/error
    }
}
function updateDataTable() {
//     console.log("Updating data table view...");
    const tableContainer = document.getElementById('data-table-container');
    if (!tableContainer) { console.error("Data table container element not found."); return; }
    tableContainer.innerHTML = ''; // Clear previous table content

    // Define columns to display in the table
    const displayColumns = [
        { key: 'prime_award_awarding_sub_agency_name', header: 'Sub Agency', truncate: 20, sortable: true },
        { key: 'prime_award_awarding_office_name', header: 'Office', truncate: 30, sortable: true },
        { key: 'prime_awardee_name', header: 'Prime Contractor', truncate: 40, sortable: true },
        { key: 'subawardee_name', header: 'Subcontractor', truncate: 40, sortable: true },
        { key: 'subaward_amount', header: 'Sub Amount', format: 'currency', align: 'right', sortable: true },
        { key: 'subaward_description', header: 'Sub Description', truncate: 50, sortable: false },
        { key: 'prime_award_naics_code', header: 'NAICS', sortable: true, align: 'left'},
        { key: 'subawardee_business_types', header: 'Biz Types', truncate: 20, sortable: true },
        { key: 'usaspending_permalink', header: 'USAspending Link', format: 'link', align: 'center', sortable: false }
    ];

    // Create table header section with title and controls
    const tableHeader = document.createElement('div');
    tableHeader.className = 'data-table-header';
    const agencyDisplayName = getAgencyDisplayName(); // Helper function assumed to exist
    tableHeader.innerHTML = `
        <h3>Detailed Award Data for ${agencyDisplayName}</h3>
        <div class="data-table-controls">
            <span id="data-count">Loading...</span>
            <button id="export-csv" class="btn btn-text">Download Contracts List (CSV)</button>
        </div>
    `;
    tableContainer.appendChild(tableHeader);

    // Create table wrapper for scrolling
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'data-table-wrapper';
    tableContainer.appendChild(tableWrapper);

    // Create the main table element
    const table = document.createElement('table');
    table.className = 'data-table';
    tableWrapper.appendChild(table);

    // Get filtered data for the table
    let tableData = getFilteredTableData(); // Applies all relevant filters

    // Sort data if a sort key is active
    if (tableSortKey && tableData.length > 0) {
        const sortColDef = displayColumns.find(c => c.key === tableSortKey);
        if (sortColDef && sortColDef.sortable) {
//             console.log(`Sorting table display by ${tableSortKey} (${tableSortDirection})`);
            tableData.sort(compareValues(tableSortKey, tableSortDirection));
        }
    }

    // Create table header row (thead)
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    displayColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.header;
        th.classList.add(`col-${col.key}`);
        if (col.align) th.style.textAlign = col.align;
        if (col.sortable) {
            th.classList.add('sortable');
            th.dataset.sortKey = col.key;
            th.onclick = () => handleHeaderClick(col.key);
            if (tableSortKey === col.key) {
                th.classList.add(tableSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        }
        headerRow.appendChild(th);
    });

    // Create table body (tbody)
    const tbody = table.createTBody();
    let displayedRowCount = 0;
    const displayLimit = 100; // Limit rows displayed for performance

    // Check if there's data AFTER filtering
    if (!tableData || tableData.length === 0) {
        // If no data, the tbody will simply remain empty.
//         console.log("updateDataTable: No data to display in the table for current filters.");
    } else {
        // Populate table rows if data exists
        const limitedData = tableData.slice(0, displayLimit);
        limitedData.forEach(item => {
            const row = tbody.insertRow();
            row.onclick = () => handleRowClick(item);
            row.style.cursor = 'pointer';
            displayColumns.forEach(col => {
                const cell = row.insertCell();
                const rawValue = item[col.key];
                let cellValue = rawValue !== null && rawValue !== undefined ? rawValue : 'N/A';
                cell.classList.add(`cell-${col.key}`);
                if (col.align) cell.style.textAlign = col.align;
                cell.title = String(rawValue ?? ''); // Tooltip for full value

                // Format cell content based on column definition
                if (col.format === 'currency') {
                    cell.textContent = formatCurrency(cellValue);
                } else if (col.format === 'link') {
                    if (cellValue && cellValue !== 'N/A' && typeof cellValue === 'string' && cellValue.startsWith('http')) {
                        const link = document.createElement('a');
                        link.href = cellValue; link.textContent = "View"; link.target = "_blank";
                        link.rel = "noopener noreferrer"; link.classList.add('detail-link');
                        link.onclick = (e) => e.stopPropagation(); // Prevent row click
                        cell.appendChild(link);
                    } else {
                        cell.textContent = 'N/A';
                    }
                } else {
                    // Handle text truncation
                    const maxLength = col.truncate;
                    cell.textContent = maxLength ? truncateText(String(cellValue), maxLength) : cellValue;
                }
            });
            displayedRowCount++;
        });
    }

    // Update the displayed row count information
    const countDisplay = document.getElementById('data-count');
    if (countDisplay) {
        countDisplay.textContent = tableData.length > displayLimit
            ? `Showing top ${displayedRowCount} of ${tableData.length} total`
            : `Showing ${displayedRowCount} row(s)`;
    }

    // Set up the Export CSV button
    const exportBtn = document.getElementById('export-csv');
    if (exportBtn) {
        // Clone and replace to remove old listeners
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        newExportBtn.addEventListener('click', () => {
//             console.log("Exporting full filtered data.");
            exportTableAsCSV(tableData, `${currentAgency}_subawards_export.csv`);
        });
        // Disable button if there's no data to export
        newExportBtn.disabled = (!tableData || tableData.length === 0);
    }

//     console.log(`Data table updated: ${displayedRowCount} rows displayed (sorted by ${tableSortKey || 'default'}).`);
}

function getFilteredTableData() {
    if (!rawData || rawData.length === 0) {
        console.warn("No raw data available for table");
        return [];
    }
//     console.log(`--- Filtering table data ---`);
//     console.log(`   Search: "${currentSearchTerm}"`);
//     console.log(`   MinVal Slider: ${formatCurrency(minContractValue)}`);
//     console.log(`   StateFocus: ${currentMapFocusState || 'None'}`);
//     console.log(`   NodeFocus: ${currentFocusNode?.id || 'None'}`);
//     console.log(`   SubAgency: ${currentSubAgencyFilter || 'None'}`); // Log SubAgency
//     console.log(`   Office: ${currentOfficeFilter || 'None'}`);       // Log Office
//     console.log(`   NAICS: ${currentNaicsFilter || 'None'}`);
//     console.log(`   Prime: ${currentPrimeFilter || 'None'}`);
//     console.log(`   Sub: ${currentSubFilter || 'None'}`);

    let filtered = rawData;
    let initialRowCount = rawData.length;

    const getNormalizedStateCode = (row) => {
        const stateCodeSource = row.subaward_primary_place_of_performance_state_code || row.place_of_performance_state || row.pop_state || row.prime_award_pop_state;
         if (typeof stateCodeSource === 'string') { return stateCodeSource.toUpperCase().trim(); } return null;
     };

    // Apply filters sequentially
    if (currentSearchTerm) {
        filtered = filtered.filter(row => {
            const fields = [ // Ensure all relevant fields are included
                row['prime_award_awarding_agency_name'],
                row['prime_award_awarding_sub_agency_name'], // Keep for search
                row['prime_award_awarding_office_name'],    // Keep for search
                row['prime_awardee_name'],
                row['subawardee_name'],
                row['prime_award_naics_code']?.toString(),
                row['prime_award_naics_description']
            ];
            // Ensure field is not null/undefined and is a string before calling toLowerCase
            return fields.some(field => field && typeof field === 'string' && field.toLowerCase().includes(currentSearchTerm));
        });
//         console.log(`   Rows after Search filter: ${filtered.length} (from ${initialRowCount})`);
        initialRowCount = filtered.length;
    }

    // Apply SubAgency Filter (Added back)
    if (currentSubAgencyFilter) {
        filtered = filtered.filter(row => {
            return row['prime_award_awarding_sub_agency_name'] === currentSubAgencyFilter;
        });
//         console.log(`   Rows after SubAgency filter: ${filtered.length} (from ${initialRowCount})`);
        initialRowCount = filtered.length;
    }

    // Apply Office Filter
    if (currentOfficeFilter) {
        filtered = filtered.filter(row => {
            return row['prime_award_awarding_office_name'] === currentOfficeFilter;
        });
//         console.log(`   Rows after Office filter: ${filtered.length} (from ${initialRowCount})`);
        initialRowCount = filtered.length;
    }

    // Apply NAICS Filter
    if (currentNaicsFilter) {
         filtered = filtered.filter(row => row['prime_award_naics_code']?.toString() === currentNaicsFilter);
//          console.log(`   Rows after NAICS filter: ${filtered.length} (from ${initialRowCount})`); initialRowCount = filtered.length;
     }
    // Apply Prime Contractor Filter
    if (currentPrimeFilter) {
         filtered = filtered.filter(row => row['prime_awardee_name'] === currentPrimeFilter);
//          console.log(`   Rows after Prime filter: ${filtered.length} (from ${initialRowCount})`); initialRowCount = filtered.length;
    }
    // Apply Subcontractor Filter
    if (currentSubFilter) {
         filtered = filtered.filter(row => row['subawardee_name'] === currentSubFilter);
//          console.log(`   Rows after Sub filter: ${filtered.length} (from ${initialRowCount})`); initialRowCount = filtered.length;
    }
    // Apply Map State Focus Filter OR Minimum Value Filter
    if (currentMapFocusState) {
//          console.log(`   Applying State focus filter: ${currentMapFocusState}`);
         filtered = filtered.filter(row => getNormalizedStateCode(row) === currentMapFocusState);
//          console.log(`   Rows after State focus filter: ${filtered.length} (from ${initialRowCount})`); initialRowCount = filtered.length;
//          console.log(`   Minimum Value filter SKIPPED due to State focus.`);
    } else { // Apply Minimum Value Filter
//          console.log(`   Applying Minimum Value filter: >= ${formatCurrency(minContractValue)}`);
         filtered = filtered.filter(row => (typeof row.subaward_amount === 'number' ? row.subaward_amount : parseFloat(String(row.subaward_amount || '0').replace(/[^0-9.-]+/g, '')) || 0) >= minContractValue);
//          console.log(`   Rows after Min Value filter: ${filtered.length} (from ${initialRowCount})`); initialRowCount = filtered.length;
    }
    // Apply Node Focus Filter (Includes subagency check)
    if (currentFocusNode) {
//         console.log(`   Applying Node focus filter: ${currentFocusNode.id}`);
        filtered = filtered.filter(row => {
            // Construct potential IDs safely, checking if components exist
            const agencyPart = row.prime_award_awarding_agency_name ? `agency-${row.prime_award_awarding_agency_name}` : null;
            const subAgencyPart = row.prime_award_awarding_sub_agency_name ? `subagency-${row.prime_award_awarding_sub_agency_name}` : null;
            const officePart = row.prime_award_awarding_office_name ? `office-${row.prime_award_awarding_office_name}` : null;
            const primePart = row.prime_awardee_name ? `prime-${row.prime_awardee_name}` : null;
            const subPart = row.subawardee_name ? `sub-${row.subawardee_name}` : null;

            const potentialMatchIDs = [ agencyPart, subAgencyPart, officePart, primePart, subPart ].filter(Boolean); // Filter out nulls

            return potentialMatchIDs.includes(currentFocusNode.id);
        });
//         console.log(`   Rows after Node focus filter: ${filtered.length} (from ${initialRowCount})`);
        initialRowCount = filtered.length;
    }
//     console.log(`--- getFilteredTableData FINAL returning ${filtered.length} rows. ---`);
    return filtered;
}
function isNodeConnectedToFocus(node) { // Used for info panel
    if (!currentFocusNode || !processedData || !processedData.links) return true; // No focus or data, assume connected
    if (node.id === currentFocusNode.id) return true;

    const allLinks = Object.values(processedData.links).flat();
    for (const link of allLinks) {
        // Ensure link source/target IDs are accessed correctly
        const sourceId = link.source?.id || link.source;
        const targetId = link.target?.id || link.target;
        const linkValue = link.value || 0;

        // Apply min value filter relevant to the link type (subcontracts use minContractValue)
        let effectiveMinValue = minContractValue;
        if (linkValue < effectiveMinValue) continue; // Skip links below threshold

        if ((sourceId === currentFocusNode.id && targetId === node.id) ||
            (targetId === currentFocusNode.id && sourceId === node.id)) {
            return true;
        }
    }
    return false;
}

function handleRowClick(item) {
    if (!item || !item.subawardee_name) {
        console.warn("Clicked row item missing subawardee name:", item); return;
    }
//     console.log("Table row click - Focusing on Subawardee:", item.subawardee_name);
    const nodeObject = { id: `sub-${item.subawardee_name}`, name: item.subawardee_name, type: 'sub' };
    nodeClicked(null, nodeObject);
}

function exportTableAsCSV(dataToExport, filename = 'data_export.csv') {
    if (!dataToExport || dataToExport.length === 0) { 
        showNotification("No data available to export.", "warning"); 
        return; 
    }
//     console.log(`Exporting ${dataToExport.length} rows to CSV: ${filename}`);
    
    const exportColumns = [
        { key: 'prime_award_unique_key', header: 'Prime Award Unique Key' },
        { key: 'prime_award_awarding_agency_name', header: 'Awarding Agency' },
        { key: 'prime_award_awarding_sub_agency_name', header: 'Awarding Sub Agency' },
        { key: 'prime_award_awarding_office_name', header: 'Awarding Office' },
        { key: 'prime_awardee_name', header: 'Prime Contractor Name' },
        { key: 'subawardee_name', header: 'Subcontractor Name' },
        { key: 'subaward_amount', header: 'Subaward Amount' },
        { key: 'subaward_description', header: 'Subaward Description' },
        { key: 'prime_award_naics_code', header: 'Prime NAICS Code' },
        { key: 'prime_award_naics_description', header: 'Prime NAICS Description' },
        { key: 'subawardee_business_types', header: 'Subcontractor Business Types' },
        { key: 'prime_award_period_of_performance_start_date', header: 'Prime PoP Start Date' },
        { key: 'prime_award_period_of_performance_current_end_date', header: 'Prime PoP End Date' },
        { key: 'subaward_primary_place_of_performance_state_code', header: 'Sub PoP State Code' },
        { key: 'subaward_place_of_performance_cd_current', header: 'Sub PoP Congressional District' },
        { key: 'usaspending_permalink', header: 'USAspending Link' }
    ];
    
    const escapeCSV = (field) => { 
        if (field === null || field === undefined) return ''; 
        const string = String(field); 
        return `"${string.replace(/"/g, '""')}"`;
    };
    
    const headerRow = exportColumns.map(col => escapeCSV(col.header)).join(',');
    const dataRows = dataToExport.map(item => exportColumns.map(col => escapeCSV(item[col.key])).join(','));
    const csvContent = [headerRow, ...dataRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
//     console.log(`CSV export initiated for ${filename}`);
}

// Apply filters and draw the Sankey diagram (Uses prepareVizData)
function applyFiltersAndDraw() {
    if (!processedData) {
        console.warn("applyFiltersAndDraw: no processedData available.");
        d3.select('#chart').html('<div class="empty-message">Processing Data...</div>');
        return;
    }
//     console.log("Applying filters and drawing Sankey...");

    // 1. Get the fully filtered data (including Top N)
    const vizData = prepareVizData();

    // 2. Update global cache ONLY if not focused (for resize functionality)
    //    Store the data *after* all filters, including Top N, have been applied.
    if (!currentFocusNode) {
        currentSankeyData = vizData;
    }

    // 3. Draw the Sankey diagram with the prepared data
    drawSankeyDiagram(vizData);

    // 4. Update breadcrumb (if focus node is active)
    updateBreadcrumb();
}

function prepareVizData(overrideMinValue = null) {
    if (!processedData || !processedData.nodes || !processedData.links) {
        console.warn("prepareVizData: No processed data available.");
        return { nodes: [], links: [] }; // Return empty data
    }

    // Check if this is prime contract data
    const isPrimeData = currentAgency && currentAgency.endsWith('_primes');
    
    // Determine the effective minimum value to use for filtering this time
    // Use override if provided, otherwise use global (slider) value
    const effectiveMinValue = overrideMinValue !== null ? overrideMinValue : minContractValue;

    // Log which value is being used for clarity, especially if overriding
    if (overrideMinValue !== null) {
        // console.log(`Preparing viz data with OVERRIDE min value: ${formatCurrency(effectiveMinValue)}`);
    } else {
        // Use the specific logic for choropleth's base minimum if no override
        // This ensures choropleth always starts aggregation from its base unless explicitly overridden elsewhere
        const baseMinValue = (currentVizType === 'choropleth') ? CHOROPLETH_MIN_VALUE : minContractValue;
        // console.log(`Preparing viz data. Using effective min value: ${formatCurrency(baseMinValue)} (Viz: ${currentVizType}, Slider: ${formatCurrency(minContractValue)})`);
    }

    // 1. Initial Filtering (Min Value, Active Levels) on base processed data
    // Filter nodes based on the effectiveMinValue and activeLevels
    const nodesByLevelValue = {};
    Object.keys(processedData.nodes).forEach(nodeType => {
        if (Array.isArray(processedData.nodes[nodeType])) {
            // For prime contract data with min value 0 and "All Offices" view,
            // keep all prime nodes without value filtering
            if (isPrimeData && effectiveMinValue === 0 && !currentOfficeFilter && nodeType === 'prime') {
                nodesByLevelValue[nodeType] = processedData.nodes[nodeType].filter(node =>
                    node && activeLevels.includes(node.type)
                );
            } else {
                // Standard filtering for all other cases
                nodesByLevelValue[nodeType] = processedData.nodes[nodeType].filter(node =>
                    node && typeof node.value === 'number' && 
                    node.value >= effectiveMinValue && 
                    activeLevels.includes(node.type)
                );
            }
        } else { 
            nodesByLevelValue[nodeType] = []; 
        }
    });
    
    const initialFilteredNodes = Object.values(nodesByLevelValue).flat();
    const initialFilteredNodeIds = new Set(initialFilteredNodes.map(node => node.id));

    // 2. Link filtering with special handling for prime data "All Offices" view
    let initialFilteredLinks = [];
    
    // Special handling for prime data with "All Offices" view and min value 0
    if (isPrimeData && effectiveMinValue === 0 && !currentOfficeFilter) {
        // First, collect all links that connect to each prime node
        const primeLinks = new Map(); // Map of primeId -> array of links
        
        Object.values(processedData.links).flat().forEach(link => {
            // Find links that connect to prime nodes
            if (link && link.details && link.details.targetType === 'prime') {
                const primeId = link.target;
                if (!primeLinks.has(primeId)) {
                    primeLinks.set(primeId, []);
                }
                primeLinks.get(primeId).push({...link}); // Clone link
            }
        });
        
        // For each prime node, include all links if the prime node exists in initial filtered set
        primeLinks.forEach((links, primeId) => {
            if (initialFilteredNodeIds.has(primeId)) {
                // Include all links connecting to this prime
                links.forEach(link => {
                    // Only add if source node is also in filtered node set
                    if (initialFilteredNodeIds.has(link.source)) {
                        initialFilteredLinks.push(link);
                    }
                });
            }
        });
        
        // Add any other non-prime links that meet standard criteria
        Object.values(processedData.links).flat().forEach(link => {
            if (link && link.details && link.details.targetType !== 'prime' &&
                initialFilteredNodeIds.has(link.source) && 
                initialFilteredNodeIds.has(link.target)) {
                
                // Check if this link is already included
                const linkKey = `${link.source}|${link.target}`;
                const isDuplicate = initialFilteredLinks.some(l => 
                    `${l.source}|${l.target}` === linkKey
                );
                
                if (!isDuplicate) {
                    initialFilteredLinks.push({...link});
                }
            }
        });
    } else {
        // Standard filtering for all other cases
        Object.values(processedData.links).flat().forEach(link => {
            if (link && typeof link.value === 'number' && 
                link.value >= effectiveMinValue &&
                initialFilteredNodeIds.has(link.source) && 
                initialFilteredNodeIds.has(link.target)) {
                
                initialFilteredLinks.push({...link});
            }
        });
    }

    // 2. Focus Node Filtering (if active) - This filter is independent of value
    // It operates on the nodes/links already filtered by effectiveMinValue
    let focusFilteredNodes = initialFilteredNodes;
    let focusFilteredLinks = initialFilteredLinks;
    if (currentFocusNode) {
        // console.log("Applying focus filter for node:", currentFocusNode.id);
        const focusId = currentFocusNode.id;
        // Check if the focus node itself survived the initial effectiveMinValue/level filtering
        const focusNodeExists = initialFilteredNodes.some(n => n.id === focusId);

        if (focusNodeExists) {
            // Use BFS/iterative approach to find all connected nodes within the initialFiltered set
            const nodesToKeep = new Map();
            const nodeIdsToKeep = new Set();
            const queue = [];
            const focusNodeObject = initialFilteredNodes.find(n => n.id === focusId);

            queue.push(focusNodeObject);
            nodesToKeep.set(focusId, focusNodeObject);
            nodeIdsToKeep.add(focusId);
            let head = 0;

            while (head < queue.length) {
                const currentNode = queue[head++];
                // Check against links already filtered by effectiveMinValue
                initialFilteredLinks.forEach(link => {
                    let neighborId = null;
                    // Check if neighbor is in the set initially filtered by effectiveMinValue and levels, and not already added
                    if (link.source === currentNode.id && initialFilteredNodeIds.has(link.target) && !nodeIdsToKeep.has(link.target))
                        neighborId = link.target;
                    else if (link.target === currentNode.id && initialFilteredNodeIds.has(link.source) && !nodeIdsToKeep.has(link.source))
                        neighborId = link.source;

                    if (neighborId) {
                        // Find the neighbor from the initially filtered nodes
                        const neighborNodeObject = initialFilteredNodes.find(n => n.id === neighborId);
                        if (neighborNodeObject) {
                            nodeIdsToKeep.add(neighborId);
                            nodesToKeep.set(neighborId, neighborNodeObject);
                            queue.push(neighborNodeObject);
                        }
                    }
                });
            }

            focusFilteredNodes = Array.from(nodesToKeep.values());
            // Filter links based on nodes kept AND original effectiveMinValue filter
            focusFilteredLinks = initialFilteredLinks.filter(link =>
                nodeIdsToKeep.has(link.source) && nodeIdsToKeep.has(link.target)
            );
            // console.log(`Focus filter applied. Nodes: ${focusFilteredNodes.length}, Links: ${focusFilteredLinks.length}`);
        } else {
            console.warn(`Focus node ${focusId} not found after initial filters (value/level).`);
            // If focus node itself was filtered out, the focus view should be empty
            focusFilteredNodes = [];
            focusFilteredLinks = [];
        }
    }

    // 3. Top N Subcontracts Filter (Applied last to the focus-filtered data)
    // This operates on the data potentially already filtered by focus and effectiveMinValue
    let finalNodes = focusFilteredNodes;
    let finalLinks = focusFilteredLinks;

    // Apply Top N only for relevant visualizations
    if (topNFilterValue > 0 && ['sankey', 'network', 'treemap'].includes(currentVizType)) {
        // console.log(`Applying Top ${topNFilterValue} subcontract filter.`);
        // Isolate subcontract links (already filtered by effectiveMinValue and potentially focus)
        const subcontractLinks = finalLinks.filter(link => link.details?.targetType === 'sub');

        if (subcontractLinks.length > 0) {
            // Sort and slice
            subcontractLinks.sort((a, b) => b.value - a.value);
            const topNSubLinks = subcontractLinks.slice(0, topNFilterValue);
            // console.log(`Kept Top ${topNSubLinks.length} subcontract links.`);

            // Only restructure if the Top N filter actually removes some sub-links
            if (topNSubLinks.length < subcontractLinks.length) {
                // Identify nodes directly involved in the top N sub-links
                const nodesInTopNFlow = new Set();
                topNSubLinks.forEach(link => {
                    nodesInTopNFlow.add(link.source); // Prime ID
                    nodesInTopNFlow.add(link.target); // Sub ID
                });

                // Trace Ancestors iteratively upwards through the graph already filtered by value/focus
                let addedNewAncestor = true;
                const maxIterations = 10; // Safety break
                let iterations = 0;
                while (addedNewAncestor && iterations < maxIterations) {
                    addedNewAncestor = false;
                    iterations++;
                    // Find links (non-subcontract, already filtered by value/focus) where target is known but source is not
                    const ancestorLinks = finalLinks.filter(link =>
                        link.details?.targetType !== 'sub' && // Not a sub link itself
                        nodesInTopNFlow.has(link.target) &&  // Target is known
                        !nodesInTopNFlow.has(link.source)   // Source is new
                    );
                    ancestorLinks.forEach(link => {
                        if (!nodesInTopNFlow.has(link.source)) {
                            // Ensure the ancestor node itself exists in the focusFilteredNodes set
                            if (focusFilteredNodes.some(n => n.id === link.source)) {
                                nodesInTopNFlow.add(link.source);
                                addedNewAncestor = true;
                            }
                        }
                    });
                }
                if (iterations === maxIterations) console.warn("Top N Ancestor tracing hit max iterations.");
                // console.log(`Total nodes in Top N flow (including ancestors): ${nodesInTopNFlow.size}`);

                // Filter final nodes: Must be in the traced flow
                finalNodes = focusFilteredNodes.filter(n => nodesInTopNFlow.has(n.id));
                // Filter final links: Must be either a top N sub-link OR another link type where both ends are in the final node set
                finalLinks = finalLinks.filter(link =>
                    (link.details?.targetType === 'sub' && topNSubLinks.includes(link)) || // It's one of the top N sub links
                    (link.details?.targetType !== 'sub' && nodesInTopNFlow.has(link.source) && nodesInTopNFlow.has(link.target)) // It's another type of link fully within the traced flow
                );
            } else {
                // console.log(`Top N (${topNFilterValue}) includes all ${subcontractLinks.length} subcontracts already filtered. No change needed for Top N.`);
                // No need to re-filter nodes/links if Top N didn't change anything
            }
        } else {
            // console.log("No subcontract links found after other filters to apply Top N to.");
            // If no subcontract links remain after other filters, Top N results in empty subcontracts for Sankey/Network/Treemap
             if (['sankey', 'network', 'treemap'].includes(currentVizType)) {
                 finalNodes = focusFilteredNodes.filter(n => n.type !== 'sub'); // Keep non-sub nodes that passed previous filters
                 finalLinks = finalLinks.filter(link => link.details?.targetType !== 'sub'); // Remove all sub links
             }
        }
    } // End Top N Filter logic

    // console.log(`Final prepared data (using ${formatCurrency(effectiveMinValue)}): Nodes=${finalNodes.length}, Links=${finalLinks.length}`);
    return { nodes: finalNodes, links: finalLinks };
}
function drawSankeyDiagram(data, dataShownBelowMinValue = false) {
    // console.log("Drawing Sankey with:", { nodes: data?.nodes?.length || 0, links: data?.links?.length || 0 });
    const chartElement = d3.select('#chart');
    chartElement.html(''); // Clear previous content

    // Check if we're displaying prime contract data
    const isPrimeData = currentAgency && currentAgency.endsWith('_primes');

    // Simple check - if we have no rawData yet, show loading message instead of error
    if (!rawData || rawData.length === 0) {
        chartElement.html(`
            <div class="loading-message">
                <p>Loading data, please wait...</p>
            </div>
        `);
        return; // Exit early and don't attempt to draw
    }

    // Continue with your existing checks
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links) || data.nodes.length === 0 || data.links.length === 0) {
       
        // Display formatted message IN THE CHART PANEL if no data
        chartElement.html(`
            <div class="formatted-empty-message">
                <strong class="message-title">No Data for Sankey Diagram</strong>
                <p class="message-details">No data above <strong>${formatCurrency(minContractValue)}</strong> matches the current filter combination for this visualization.</p>
                <p class="message-suggestions">Suggestions:</p>
                <ul>
                    <li>Lower the 'Minimum Contract Value' slider.</li>
                    <li>Adjust 'Visible Node Levels'.</li>
                    <li>Adjust or clear the 'Search' term / other filters.</li>
                    <li>Clear any active node focus (click 'All Data').</li>
                    <li>Click 'Reset All Filters'.</li>
                </ul>
            </div>
        `);
        console.warn("drawSankeyDiagram: No valid data to draw.");
        return; // Stop execution
    }
    
    // --- Rest of the Sankey drawing logic ---
    // Proceed with drawing if data is valid
    const chartContainer = document.getElementById('chart');
    const containerRect = chartContainer.getBoundingClientRect();
    const width = containerRect.width, height = containerRect.height;
    const margin = {top: 20, right: 10, bottom: 20, left: 10};
    const innerWidth = width - margin.left - margin.right, innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) {
        console.error("Chart container invalid dimensions.");
        chartElement.html('<div class="error-message">Chart area too small to draw.</div>');
        return;
    }

    // Setup SVG and Sankey layout
    const svg = chartElement.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const sankey = d3.sankey()
        .nodeId(d => d.id)
        .nodeWidth(isMobileDevice() ? 10 : 15)
        .nodeSort(null)
        .nodePadding(isMobileDevice() ? 6 : 10)
        .extent([[0, 0], [innerWidth, innerHeight]]);

    // Deep copy data to avoid modifying original
    const graph = { nodes: data.nodes.map(d => ({...d})), links: data.links.map(d => ({...d})) };
    let sankeyData;
    try {
        // Filter out links with source/target nodes that don't exist in the nodes array
        // This can happen if aggressive filtering removes nodes but not all connected links
        const nodeIds = new Set(graph.nodes.map(n => n.id));
        graph.links = graph.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

        sankeyData = sankey(graph);
        // console.log("Sankey layout calculated.");
    } catch(e) {
        console.error("Error calculating Sankey layout:", e);
        chartElement.html(`<div class="error-message">Error calculating layout: ${e.message}. Try different filters.</div>`);
        return;
    }

    // Create definitions for gradients
    const defs = svg.append("defs");

    // Create a gradient for each link
    sankeyData.links.forEach((link, i) => {
        const gradientId = `link-gradient-${i}`;
        const sourceColor = monochromaticPurpleScale(link.source.type) || '#999'; // Use scale
        const targetColor = monochromaticPurpleScale(link.target.type) || '#999'; // Use scale
        const gradient = defs.append("linearGradient")
            .attr("id", gradientId)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", link.source.x1)
            .attr("y1", link.source.y0 + (link.source.y1 - link.source.y0) / 2)
            .attr("x2", link.target.x0)
            .attr("y2", link.target.y0 + (link.target.y1 - link.target.y0) / 2);

        gradient.append("stop").attr("offset", "0%").attr("stop-color", sourceColor).attr("stop-opacity", 0.8);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", targetColor).attr("stop-opacity", 0.8);
        link.gradientId = gradientId;
    });

    // Draw links
    const links = svg.append('g')
        .attr('class', 'links')
        .attr('fill', 'none')
        .selectAll('path.link')
        .data(sankeyData.links)
        .join('path')
        .attr('class', 'link')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke-width', d => Math.max(1, d.width || 1))
        .attr('stroke', d => `url(#${d.gradientId})`)
        .style('transition', 'stroke-opacity 0.2s ease')
        .style('stroke-opacity', 0.3)
        .on('mouseover', function(event, d) {
            d3.select(this).style('stroke-opacity', 0.6).attr('stroke-width', d => Math.max(2, d.width + 1));
            d3.selectAll('.node').filter(node => node.id === d.source.id || node.id === d.target.id)
                .select('rect').attr('stroke-width', 2).attr('stroke', 'var(--app-accent-color)');
            showLinkTooltip(event, d);
        })
        .on('mouseout', function(event, d) { // Pass 'd' for consistency if needed elsewhere
            d3.select(this).style('stroke-opacity', 0.3).attr('stroke-width', d => Math.max(1, d.width));
            d3.selectAll('.node rect').attr('stroke-width', 1).attr('stroke', 'var(--sankey-node-stroke)');
            hideTooltip();
        });

    // Draw nodes
    const nodeGroup = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('.node')
        .data(sankeyData.nodes)
        .join('g')
        .attr('class', d => `node node-type-${d.type}`)
        .attr('data-type', d => d.type)
        .attr('transform', d => `translate(${d.x0},${d.y0})`)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', d => `${d.name}, ${d.type}, ${formatCurrency(d.value)}`)
        .on('click', nodeClicked)
        .on('mouseover', function(event, d) {
            d3.select(this).select('rect').attr('stroke-width', 2).attr('stroke', 'var(--app-accent-color)');
            d3.selectAll('.link').style('stroke-opacity', link => {
                const sid = typeof link.source === 'object' ? link.source.id : link.source;
                const tid = typeof link.target === 'object' ? link.target.id : link.target;
                return (sid === d.id || tid === d.id) ? 0.6 : 0.1;
            });
            showNodeTooltip(event, d);
        })
        .on('mouseout', function(event, d) { // Pass 'd' for consistency
            // Reset node styling, considering focus state
            const isFocused = currentFocusNode && d.id === currentFocusNode.id;
            d3.select(this).select('rect')
                .attr('stroke-width', isFocused ? 2 : 1)
                .attr('stroke', isFocused ? 'var(--app-accent-color)' : 'var(--sankey-node-stroke)');
            d3.selectAll('.link').style('stroke-opacity', 0.3);
            hideTooltip();
        })
        .on('keydown', function(event, d) {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); nodeClicked(event, d); }
        });

    // Append rectangles
    nodeGroup.append('rect')
        .attr('height', d => Math.max(1, d.y1 - d.y0))
        .attr('width', d => d.x1 - d.x0)
        .attr('fill', d => monochromaticPurpleScale(d.type))
        // Stroke considers focus state correctly on init
        .attr('stroke', d => currentFocusNode && d.id === currentFocusNode.id ? 'var(--app-accent-color)' : 'var(--sankey-node-stroke)')
        .attr('stroke-width', d => currentFocusNode && d.id === currentFocusNode.id ? 2 : 1)
        .attr('fill-opacity', 0.95);

    // Append text labels
    nodeGroup.append('text')
        .attr('x', d => d.x0 < innerWidth / 2 ? (d.x1 - d.x0 + 6) : -6) // Position based on node side
        .attr('y', d => (d.y1 - d.y0) / 2) // Center vertically in the node
        .attr('dy', '0.35em') // Vertical alignment adjustment
        .attr('text-anchor', d => d.x0 < innerWidth / 2 ? 'start' : 'end') // Align text start/end based on node side
        .attr('fill', 'var(--sankey-node-label-fill, #ccc)') // Use CSS variable for color
        .attr('font-family', 'var(--font-primary)')
        // Slightly larger font size, closer to simple.html
        .attr('font-size', isMobileDevice() ? '9px' : '11px') 
        .style('pointer-events', 'none') // Text should not block mouse events on the node
        .style('user-select', 'none') // Prevent text selection
        .text(d => {
            // Prioritize acronym if available for agency/subagency
            const useAcronym = (d.type === 'agency' || d.type === 'subagency') && d.acronym;
            let displayName = useAcronym ? d.acronym : (d.name || ''); // Use name, ensure it's a string

            // --- Revised Truncation Logic (Closer to simple.html) ---
            // Define a single length limit based on device type (adjust these values as needed)
            const lengthLimit = isMobileDevice() ? 18 : 30; 

            // Apply truncation if name exceeds limit (and it's not an acronym we decided to keep short)
            if (!useAcronym && displayName.length > lengthLimit) {
                // Simple substring truncation
                displayName = displayName.substring(0, lengthLimit - 1) + '…'; 
            }
            
            return displayName;
        })
        .each(function(d) { // Still remove text entirely if node is too small vertically
            const nodeHeight = d.y1 - d.y0;
            // Use consistent or slightly adjusted thresholds
            const minHeightThreshold = isMobileDevice() ? 8 : 10; 
            if (nodeHeight < minHeightThreshold) {
                d3.select(this).remove(); // Remove the text element
            }
        });

    // console.log("Sankey diagram draw complete.");
}

function drawNetworkGraph(data, dataShownBelowMinValue = false) {
    // console.log("Drawing Network Graph with previous logic...");
    const chartElement = d3.select('#network-chart');
    chartElement.html(''); // Clear previous

    // Check if we're displaying prime contract data
    const isPrimeData = currentAgency && currentAgency.endsWith('_primes');

    // Add notifications if needed
    if (dataShownBelowMinValue || isPrimeData) {
        // Create a container for notification messages
        const notificationContainer = chartElement.append('div')
            .attr('class', 'viz-notifications')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('left', '0')
            .style('right', '0')
            .style('text-align', 'center')
            .style('z-index', '10');
            
        // Add prime data indicator if showing prime contract data
        if (isPrimeData) {
            notificationContainer.append('div')
               .attr('class', 'prime-data-indicator')
               .style('color', 'var(--color-on-surface-variant)')
               .style('font-size', '12px')
               .style('font-style', 'italic')
               .style('margin-bottom', '5px')
               .text("Prime Contract Data - No Subcontractors");
        }
        
        // Add min value override notification
        if (dataShownBelowMinValue) {
            notificationContainer.append('div')
               .attr('class', 'min-value-override-indicator')
               .style('color', 'var(--color-on-surface-variant)')
               .style('font-size', '12px')
               .style('font-style', 'italic')
               .text(`Showing contracts below minimum filter (${formatCurrency(minContractValue)}) to display data`);
        }
    }

    // Use the passed 'data' object
    const graphNodes = data.nodes;  // Renamed from 'nodes' to 'graphNodes'
    const graphLinks = data.links;  // Renamed from 'links' to 'graphLinks'

    // Check if data is valid for drawing
    if (!graphNodes || graphNodes.length === 0) {
        console.warn("drawNetworkGraph: No nodes remain after filtering.");
        chartElement.html(`
             <div class="formatted-empty-message">
                 <strong class="message-title">No Data for Network Graph</strong>
                 <p class="message-details">No data matches the current filter combination${minContractValue > 0 ? ` above ${formatCurrency(minContractValue)}` : ''}.</p>
                 <p class="message-suggestions">Suggestions:</p><ul>
                     ${minContractValue > 0 ? '<li>Lower the \'Minimum Contract Value\' slider.</li>' : ''}
                     <li>Adjust 'Visible Node Levels'.</li><li>Adjust or clear the 'Search' term / other filters.</li>
                     <li>Clear any active node focus (click 'All Data').</li><li>Click 'Reset All Filters'.</li></ul></div>`);
        return; // Stop execution
    }

    // Proceed with drawing if data is valid
    const chartContainer = document.getElementById('network-chart');
    const containerRect = chartContainer.getBoundingClientRect();
    const width = containerRect.width, height = containerRect.height;

    if (width <= 10 || height <= 10) {
        console.error("Network container invalid dimensions.");
        chartElement.html('<div class="error-message">Chart container invalid dimensions.</div>');
        return;
    }

    // Setup SVG, zoom, and simulation
    const svg = chartElement.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('cursor', 'grab');

    const mainGroup = svg.append('g');

    // --- Set up Zoom behavior ---
    const zoom = d3.zoom()
        .scaleExtent([0.1, 8])
        .on('zoom', (event) => {
            mainGroup.attr('transform', event.transform);
            svg.style('cursor', 'grabbing');
            // Check if resetButton exists before trying to modify it
            const resetButton = chartElement.select('.reset-zoom-btn').node();
            if (resetButton) {
                resetButton.style.display = event.transform.k === 1 && event.transform.x === 0 && event.transform.y === 0 ? 'none' : 'block';
            }
        })
        .on('end', () => svg.style('cursor', 'grab'));

    // Apply zoom behavior to the SVG
    svg.call(zoom);

    // Reset zoom button
    const resetButton = chartElement.append('button')
        .attr('class', 'reset-zoom-btn')
        .text('Reset View')
        .style('position', 'absolute').style('top', '10px').style('right', '10px').style('z-index', '10').style('display', 'none')
        .style('background-color', 'var(--color-surface-container-high)').style('color', 'var(--color-on-surface-variant)')
        .style('border', '1px solid var(--color-outline-variant)').style('border-radius', '20px')
        .style('padding', '8px 12px').style('font-size', '0.8rem').style('cursor', 'pointer')
        .on('click', function() {
            svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity); // Resets to default view
        });

    // Node radius scale
    const maxValue = d3.max(graphNodes, d => d.value) || 1;
    const nodeRadiusScale = d3.scaleSqrt()
        .domain([0, maxValue])
        .range([ isMobileDevice() ? 3 : 4, isMobileDevice() ? 12 : 15 ]);

    // Force simulation setup
    // Ensure links use node objects for simulation if needed, shallow copy data
    const simulationNodes = graphNodes.map(n => ({...n}));
    const simulationLinks = graphLinks.map(l => ({
        ...l, 
        source: simulationNodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source)),
        target: simulationNodes.find(n => n.id === (typeof l.target === 'object' ? l.target.id : l.target))
    })).filter(l => l.source && l.target); // Filter out any invalid links

    const simulation = d3.forceSimulation(simulationNodes)
        .force('link', d3.forceLink(simulationLinks).id(d => d.id).distance(isMobileDevice() ? 45 : 75).strength(0.6))
        .force('charge', d3.forceManyBody().strength(isMobileDevice() ? -90 : -130))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
        .force('collision', d3.forceCollide().radius(d => nodeRadiusScale(d.value) + (isMobileDevice() ? 4 : 6)).strength(0.8));

    // Draw links
    const link = mainGroup.append('g')
        .attr('class', 'links')
        .attr('stroke', 'var(--sankey-link-color)')
        .attr('stroke-opacity', 'var(--sankey-link-opacity)')
        .selectAll('line')
        .data(simulationLinks) // Use simulationLinks which have object references
        .join('line')
        .attr('stroke-width', d => Math.max(0.5, Math.min(5, nodeRadiusScale(d.value) / 3 )))
        .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-opacity', 0.9);
            // Need to pass original link data (without source/target objects) to tooltip if it expects IDs
            const originalLinkData = graphLinks.find(origL => 
                (typeof origL.source === 'object' ? origL.source.id : origL.source) === d.source.id && 
                (typeof origL.target === 'object' ? origL.target.id : origL.target) === d.target.id
            ) || d;
            showLinkTooltip(event, originalLinkData);
        })
        .on('mouseout', function() {
            d3.select(this).attr('stroke-opacity', 'var(--sankey-link-opacity)');
            hideTooltip();
        });

    // Draw nodes (circles)
    const nodeGroup = mainGroup.append('g')
        .attr('class', 'nodes');

    const node = nodeGroup.selectAll('circle')
        .data(simulationNodes, d => d.id) // Use simulationNodes
        .join('circle')
        .attr('r', d => nodeRadiusScale(d.value))
        .attr('fill', d => monochromaticPurpleScale(d.type) || '#797484')
        .attr('stroke', 'var(--sankey-node-stroke)')
        .attr('stroke-width', 1.5)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', d => `${d.name}, ${d.type}, ${formatCurrency(d.value)}`)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended))
        .on('click', nodeClicked)
        .on('mouseover', function(event, d) {
             d3.select(this).attr('stroke-width', 3).attr('stroke', 'var(--app-accent-color)');
             showNodeTooltip(event, d);
             link.attr('stroke-opacity', l => {
                 const sid = l.source.id; 
                 const tid = l.target.id;
                 return (sid === d.id || tid === d.id) ? 0.9 : 0.1;
             });
             node.attr('opacity', n => {
                 if (n.id === d.id) return 1;
                 const isConnected = simulationLinks.some(l => { // Check simulationLinks
                     const sid = l.source.id; 
                     const tid = l.target.id;
                     return (sid === d.id && tid === n.id) || (tid === d.id && sid === n.id);
                 });
                 return isConnected ? 0.8 : 0.3;
             });
         })
        .on('mouseout', function() {
             d3.select(this).attr('stroke-width', 1.5).attr('stroke', 'var(--sankey-node-stroke)');
             hideTooltip();
             link.attr('stroke-opacity', 'var(--sankey-link-opacity)');
             node.attr('opacity', 1);
         })
        .on('keydown', function(event, d) {
            if (event.key === 'Enter' || event.key === ' ') { 
                event.preventDefault(); 
                nodeClicked(event, d); 
            }
        });

    // Draw labels (optional)
    const labelGroup = mainGroup.append("g").attr("class", "labels");

    const label = labelGroup.selectAll("text.node-label")
        .data(simulationNodes, d => d.id) // Use simulationNodes
        .join("text")
        .attr("class", "node-label")
        .attr("text-anchor", "start")
        .style("font-size", isMobileDevice() ? "7px" : "9px")
        .style("fill", "var(--sankey-node-label-fill, #555)")
        .style("pointer-events", "none")
        .style("user-select", "none")
        .text(d => (window.innerWidth <= 768) ? truncateText(d.name, 10) : d.name)
        .attr("dominant-baseline", "middle")
        .attr("dx", d => nodeRadiusScale(d.value) + (isMobileDevice() ? 4 : 5))
        .style("display", d => { 
            const r = nodeRadiusScale(d.value); 
            return isMobileDevice() ? (r < 4 ? "none" : "block") : (r < 2 ? "none" : "block"); 
        });
        // Positions will be set by the tick handler

    // Simulation tick function to update positions
    simulation.on('tick', () => {
        link.attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('cx', d => d.x = Math.max(nodeRadiusScale(d.value), Math.min(width - nodeRadiusScale(d.value), d.x)))
            .attr('cy', d => d.y = Math.max(nodeRadiusScale(d.value), Math.min(height - nodeRadiusScale(d.value), d.y)));

        label.attr('x', d => d.x)
             .attr('y', d => d.y);
    });

    // Drag handler functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
        d3.select(this).style('cursor', 'grabbing');
    }
    function dragged(event, d) {
        d.fx = event.x; d.fy = event.y;
    }
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        if (!isTouchDevice()) { d.fx = null; d.fy = null; } // Unfix on non-touch
        d3.select(this).style('cursor', 'pointer');
    }

    // Double-tap zoom (remains the same)
    let lastTap = 0;
    svg.on('touchend', function(event) { 
        /* ... keep existing ... */ 
        if (event.defaultPrevented) return; 
        const currentTime = new Date().getTime(); 
        const tapLength = currentTime - lastTap; 
        if (tapLength < 400 && tapLength > 0) { 
            event.preventDefault(); 
            const touchPoint = d3.pointer(event, svg.node()); 
            const currentTransform = d3.zoomTransform(svg.node()); 
            if (currentTransform.k < 2) { 
                svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(2.5).translate(-touchPoint[0], -touchPoint[1])); 
            } else { 
                svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity); 
            } 
        } 
        lastTap = currentTime; 
    });

    // console.log("Network graph draw complete.");
}
function drawChoroplethMap() {
    // Note: This function uses rawData and applies filters internally.
    const effectiveMinValue = CHOROPLETH_MIN_VALUE;
    // console.log(`Drawing Choropleth map. Slider: ${formatCurrency(minContractValue)}, Base Aggregation Min: ${formatCurrency(effectiveMinValue)}`);

    const chartElement = d3.select('#map-chart');
    chartElement.html('');

    // Check if we're displaying prime contract data
    const isPrimeData = currentAgency && currentAgency.endsWith('_primes');

    if (!rawData || rawData.length === 0) {
        console.warn("Cannot draw choropleth map: No rawData available");
        chartElement.html(`<div class="formatted-empty-message">...</div>`); // Placeholder
        return;
    }

    // Add prime data indicator if showing prime contract data
    if (isPrimeData) {
        chartElement.append('div')
           .attr('class', 'prime-data-indicator')
           .style('position', 'absolute')
           .style('top', '10px')
           .style('left', '0')
           .style('right', '0')
           .style('text-align', 'center')
           .style('color', 'var(--color-on-surface-variant)')
           .style('font-size', '12px')
           .style('font-style', 'italic')
           .style('z-index', '10')
           .style('background-color', 'rgba(0, 0, 0, 0.1)')
           .style('padding', '3px')
           .text("Prime Contract Data - No Subcontractors");
    }

    // --- Data Aggregation ---
    const statePerformance = {};
    let totalAggregatedValue = 0;
    let validRecords = 0;
    rawData.forEach(row => {
        let includeRow = true;
        // Apply filters (Search, SubAgency, Office, NAICS, Prime, Sub)
        if (currentSearchTerm) { 
            const fields = [ // Ensure all relevant fields are included
                row['prime_award_awarding_agency_name'],
                row['prime_award_awarding_sub_agency_name'], 
                row['prime_award_awarding_office_name'],    
                row['prime_awardee_name'],
                isPrimeData ? null : row['subawardee_name'], // Only include subcontractor for subaward data
                row['prime_award_naics_code']?.toString(),
                row['prime_award_naics_description']
            ].filter(Boolean); // Filter out null values (important for prime data)
            
            if (!fields.some(f => f && typeof f === 'string' && f.toLowerCase().includes(currentSearchTerm))) {
                includeRow = false;
            } 
        }
        
        if (includeRow && currentSubAgencyFilter && row['prime_award_awarding_sub_agency_name'] !== currentSubAgencyFilter) includeRow = false;
        if (includeRow && currentOfficeFilter && row['prime_award_awarding_office_name'] !== currentOfficeFilter) includeRow = false;
        if (includeRow && currentNaicsFilter && row['prime_award_naics_code']?.toString() !== currentNaicsFilter) includeRow = false;
        if (includeRow && currentPrimeFilter && row['prime_awardee_name'] !== currentPrimeFilter) includeRow = false;
        
        // Only apply Sub filter for subaward data
        if (!isPrimeData && includeRow && currentSubFilter && row['subawardee_name'] !== currentSubFilter) includeRow = false;
        
        if (!includeRow) return;

        const subawardValue = typeof row.subaward_amount === 'number' ? 
            row.subaward_amount : 
            parseFloat(String(row.subaward_amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
            
        if (subawardValue < effectiveMinValue) return; // Apply base min for aggregation

        // Handle both prime and subaward field mappings for state code
        const stateCode = row.subaward_primary_place_of_performance_state_code || 
                          row.primary_place_of_performance_state_code ||
                          row.place_of_performance_state || 
                          row.pop_state || 
                          row.prime_award_pop_state;
                          
        const countryCode = row.subaward_primary_place_of_performance_country_code || 
                            row.primary_place_of_performance_country_code ||
                            row.place_of_performance_country || 
                            'USA';
                            
        if (stateCode && typeof stateCode === 'string' && stateCode.length === 2 && 
            (countryCode === 'USA' || countryCode === 'US')) {
             const stateKey = stateCode.toUpperCase();
             statePerformance[stateKey] = (statePerformance[stateKey] || 0) + subawardValue;
             totalAggregatedValue += subawardValue;
             validRecords++;
        }
    });

    // console.log(`Choropleth aggregated ${validRecords} records across ${Object.keys(statePerformance).length} states. Total value: ${formatCurrency(totalAggregatedValue)}`);

    if (Object.keys(statePerformance).length === 0) {
        console.warn("drawChoroplethMap: No aggregated state data after filtering.");
        chartElement.html(`
            <div class="formatted-empty-message">
                <strong class="message-title">No State Data Available</strong>
                <p class="message-details">No geographic data matches the current filter combination${minContractValue > 0 ? ` above ${formatCurrency(minContractValue)}` : ''}.</p>
                <p class="message-suggestions">Suggestions:</p>
                <ul>
                    ${minContractValue > 0 ? '<li>Lower the \'Minimum Contract Value\' slider.</li>' : ''}
                    <li>Adjust or clear the 'Search' term / other filters.</li>
                    <li>Click 'Reset All Filters'.</li>
                </ul>
            </div>
        `);
        return;
    }

    // --- Map Loading and Setup ---
    const loadingMsg = chartElement.append('div').attr('class', 'loading-message').text('Loading map data...');
    const mapUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

    d3.json(mapUrl).then(us => {
        loadingMsg.remove();
        const chartContainer = document.getElementById('map-chart');
        const containerRect = chartContainer.getBoundingClientRect();
        const width = containerRect.width; 
        const height = containerRect.height;
        
        if (width <= 0 || height <= 0) { 
            console.error("Map container invalid"); 
            return; 
        }

        const svg = chartElement.append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('display', 'block')
            .style('width', '100%')
            .style('height', '100%');
            
        const mapGroup = svg.append('g').attr('class', 'map-container');
        const zoom = d3.zoom().scaleExtent([0.5, 8]).on('zoom', event => mapGroup.attr('transform', event.transform));
        svg.call(zoom);

        // Re-add prime data indicator to the SVG if using prime contract data
        if (isPrimeData) {
            svg.append("text")
               .attr("x", width / 2)
               .attr("y", 15)
               .attr("text-anchor", "middle")
               .attr("class", "prime-data-indicator")
               .attr("fill", "var(--color-on-surface-variant)")
               .attr("font-size", "12px")
               .attr("font-style", "italic")
               .text("Prime Contract Data - No Subcontractors");
        }

        const statesGeoJson = topojson.feature(us, us.objects.states);
        const projection = d3.geoAlbersUsa().fitSize([width, height], statesGeoJson); // Center as before
        const path = d3.geoPath().projection(projection);

        // Color Scale
        const dataValues = Object.values(statePerformance);
        const colorScale = d3.scaleQuantile()
            .domain(dataValues.length > 0 ? dataValues : [0, 1])
            .range(monochromaticPurpleScale.range());

        const stateAbbreviations = { 
            "01":"AL", "02":"AK", "04":"AZ", "05":"AR", "06":"CA", "08":"CO", "09":"CT", 
            "10":"DE", "11":"DC", "12":"FL", "13":"GA", "15":"HI", "16":"ID", "17":"IL", 
            "18":"IN", "19":"IA", "20":"KS", "21":"KY", "22":"LA", "23":"ME", "24":"MD", 
            "25":"MA", "26":"MI", "27":"MN", "28":"MS", "29":"MO", "30":"MT", "31":"NE", 
            "32":"NV", "33":"NH", "34":"NJ", "35":"NM", "36":"NY", "37":"NC", "38":"ND", 
            "39":"OH", "40":"OK", "41":"OR", "42":"PA", "44":"RI", "45":"SC", "46":"SD", 
            "47":"TN", "48":"TX", "49":"UT", "50":"VT", "51":"VA", "53":"WA", "54":"WV", 
            "55":"WI", "56":"WY", "72":"PR"
        };

        // --- Draw States ---
        mapGroup.append('g')
            .attr("class", "states")
            .selectAll('path')
            .data(statesGeoJson.features)
            .join('path')
            .attr('d', path)
            .attr('fill', d => { 
                const stateAbbr = stateAbbreviations[d.id]; 
                const value = statePerformance[stateAbbr] || 0; 
                return value > 0 ? colorScale(value) : '#eee'; 
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr('aria-label', d => { 
                const stateAbbr = stateAbbreviations[d.id]; 
                const value = statePerformance[stateAbbr] || 0; 
                return `${getStateFullName(stateAbbr)}: ${formatCurrency(value)}`; 
            })
            .classed('focused-state', d => stateAbbreviations[d.id] === currentMapFocusState)
            .on('mouseover', function(event, d) { 
                d3.select(this).raise().attr('stroke', '#000').attr('stroke-width', 1.5); 
                const stateAbbr = stateAbbreviations[d.id]; 
                const value = statePerformance[stateAbbr] || 0; 
                
                if (value > 0 || !stateAbbr) { 
                    showMapTooltip(event, stateAbbr || d.properties.name, value); 
                } else { 
                    const tooltip = d3.select('#tooltip'); 
                    tooltip.html(`<h4>${getStateFullName(stateAbbr)}</h4><p><em>No contracts match current filters</em></p>`)
                        .classed('visible', true)
                        .attr('aria-hidden', 'false'); 
                    positionTooltip(tooltip, event); 
                } 
            })
            .on('mouseout', function(event, d) { 
                if (stateAbbreviations[d.id] !== currentMapFocusState) { 
                    d3.select(this)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 0.5); 
                } else { 
                    d3.select(this)
                        .attr('stroke', 'var(--app-accent-color)')
                        .attr('stroke-width', 2); 
                } 
                hideTooltip(); 
            })
            .on('click', function(event, d) { 
                const clickedStateAbbr = stateAbbreviations[d.id]; 
                if (!clickedStateAbbr) return; 
                
                // console.log(`--- Map State Click: ${clickedStateAbbr} ---`); 
                
                mapGroup.selectAll('path.focused-state')
                    .classed('focused-state', false)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 0.5); 
                    
                if (currentMapFocusState === clickedStateAbbr) { 
                    currentMapFocusState = null; 
                    // console.log(`   Cleared map state focus.`); 
                    closeInfoPanel(); 
                } else { 
                    currentMapFocusState = clickedStateAbbr; 
                    // console.log(`   Set currentMapFocusState to: ${currentMapFocusState}`); 
                    
                    d3.select(this)
                        .classed('focused-state', true)
                        .attr('stroke', 'var(--app-accent-color)')
                        .attr('stroke-width', 2)
                        .raise(); 
                        
                    const value = statePerformance[clickedStateAbbr] || 0; 
                    if (value > 0) { 
                        showEnhancedStateInfoPanel(clickedStateAbbr, value); 
                    } 
                } 
                
                updateBreadcrumb(); 
                updateDataTable(); 
            });

        // Draw state borders
        mapGroup.append('path')
            .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
            .attr('fill', 'none')
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .attr('stroke-linejoin', 'round')
            .attr('d', path);

        // --- Draw Legend (Smaller) ---
        const legendItemHeight = 18;
        const legendRectSize = 14;
        const legendFontSize = '9px';
        const legendTitleFontSize = '10px';
        const colorRangeArray = monochromaticPurpleScale.range(); // Get the array first
        const legendYOffset = height - (colorRangeArray.length * legendItemHeight) - 30; // CORRECTED: Use .length

        const legendGroup = svg.append('g')
            .attr('class', 'legend choropleth-legend')
            .attr('transform', `translate(15, ${legendYOffset})`); // Position from calculated Y offset

        const legendTitle = isPrimeData ? "Prime Contract Value" : "Contract Value (Filtered)";
        legendGroup.append('text')
            .attr('class', 'legend-title')
            .attr('x', 0)
            .attr('y', -8) // Adjusted y position for smaller title font
            .style('font-size', legendTitleFontSize) // Use smaller title font
            .style('font-weight', 'bold')
            .style('fill', 'var(--color-on-surface)')
            .text(legendTitle);

        const quantiles = colorScale.quantiles();
        const minValue = d3.min(dataValues) || 0;
        const maxValue = d3.max(dataValues) || 1;

        const legendItems = legendGroup.selectAll('.legend-item')
            .data(monochromaticPurpleScale.range())
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * legendItemHeight})`); // Use reduced item height

        // Draw smaller rectangles
        legendItems.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .attr('fill', d => d);

        // Add smaller text labels
        legendItems.append('text')
            .attr('x', legendRectSize + 5) // Position text next to smaller rect
            .attr('y', legendRectSize / 2)  // Center text vertically with rect
            .attr('dy', '0.35em')
            .style('font-size', legendFontSize) // Use smaller font size
            .style('fill', 'var(--color-on-surface)')
            .text((d, i) => {
                const colorRange = monochromaticPurpleScale.range(); // Get the range array
                const numColors = colorRange.length;

                // (Keep the existing lowerBound/upperBound logic)
                const lowerBound = i === 0 ? minValue : quantiles[i - 1];
                const upperBound = i < quantiles.length ? quantiles[i] : maxValue;

                if (quantiles.length === 0) { return `All Values`; } // Handle case with no quantiles
                if (i === 0) return `< ${formatCurrency(upperBound)}`;
                // Use the length of the actual range being used for the comparison
                if (i === numColors - 1) return `≥ ${formatCurrency(lowerBound)}`;
                if (upperBound <= lowerBound) return `≥ ${formatCurrency(lowerBound)}`;
                return `${formatCurrency(lowerBound)} - ${formatCurrency(upperBound)}`;
            });

    }).catch(error => {
        console.error("Error processing or rendering map GeoJSON data:", error);
        chartElement.html(`
            <div class="error-message">
                <p>Error loading map data: ${error.message}</p>
                <p>Please try refreshing the page.</p>
            </div>
        `);
    });
}
function getDisplayName(node) {
    // Use acronym for agencies/subagencies if available
    if ((node.type === 'agency' || node.type === 'subagency') && node.acronym) {
        return node.acronym;
    }
    
    // Otherwise use the name
    return node.name;
}
function updateActiveFiltersDisplay() {
    const filterContainer = document.getElementById('active-filters'); 
    if (!filterContainer) { 
        console.warn("Active filter display container (#active-filters) not found."); 
        return; 
    }
    
    const agencyLabel = getAgencyDisplayName();
    const isPrimeData = currentAgency && currentAgency.endsWith('_primes');
    const displayValueText = formatCurrencyWithSuffix(minContractValue);
    
    // Add "PRIME CONTRACTS" indicator when viewing prime data
    const fiscalYear = new Date().getFullYear();
    const agencyTitleHTML = `<h2 class="agency-filter-title">${agencyLabel} ${isPrimeData ? 
        '<span class="prime-data-badge">PRIME CONTRACTS</span>' : 
        `FY${fiscalYear}`}</h2>`;
    
    let otherFiltersHTML = ''; 
    let hasOtherFilters = false;

    // Add Min Value filter with conditional contract type text
    otherFiltersHTML += `<span class="filter-item"><span class="filter-label">Showing&nbsp;${
        isPrimeData ? 'Contracts' : 'Subcontracts'
    }&nbsp;>&nbsp;${displayValueText}</span>`; 
    hasOtherFilters = true;

    // Add SubAgency filter if active
    if (currentSubAgencyFilter) { 
        otherFiltersHTML += `<span class="filter-separator">|</span> <span class="filter-item"><span class="filter-label">SubAgency:</span> <strong>${truncateText(currentSubAgencyFilter, 30)}</strong></span>`; 
        hasOtherFilters = true; 
    }

    // Add Office Filter
    if (currentOfficeFilter) { 
        otherFiltersHTML += `<span class="filter-separator">|</span> <span class="filter-item"><span class="filter-label">Office:</span> <strong>${truncateText(currentOfficeFilter, 30)}</strong></span>`; 
        hasOtherFilters = true; 
    }

    // Add NAICS filter
    if (currentNaicsFilter) { 
        const el = document.getElementById('naics-filter');
        let nT = currentNaicsFilter, nFT = currentNaicsFilter;
        if (el) {
            const opt = Array.from(el.options).find(o => o.value === currentNaicsFilter);
            if (opt) {
                nFT = opt.textContent;
                nT = opt.value;
            }
        }
        otherFiltersHTML += `<span class="filter-separator">|</span> <span class="filter-item" title="${nFT}"><span class="filter-label">NAICS:</span> <strong>${nT}</strong></span>`; 
        hasOtherFilters = true; 
    }

    // Add Prime filter (only show for subaward data)
    if (currentPrimeFilter && !isPrimeData) { 
        otherFiltersHTML += `<span class="filter-separator">|</span> <span class="filter-item"><span class="filter-label">Prime:</span> <strong>${truncateText(currentPrimeFilter, 30)}</strong></span>`; 
        hasOtherFilters = true; 
    }

    // Add Sub filter (only show for subaward data)
    if (currentSubFilter && !isPrimeData) { 
        otherFiltersHTML += `<span class="filter-separator">|</span> <span class="filter-item"><span class="filter-label">Sub:</span> <strong>${truncateText(currentSubFilter, 30)}</strong></span>`; 
        hasOtherFilters = true; 
    }

    // Add Search filter
    if (currentSearchTerm) { 
        otherFiltersHTML += `<span class="filter-separator">|</span> <span class="filter-item"><span class="filter-label">Search:</span> <strong>"${truncateText(currentSearchTerm, 20)}"</strong></span>`; 
        hasOtherFilters = true; 
    }

    // Update the container
    let finalHTML = agencyTitleHTML; 
    if (hasOtherFilters) { 
        finalHTML += `<div class="other-filters">${otherFiltersHTML}</div>`; 
    }
    filterContainer.innerHTML = finalHTML;

    // Log for debugging
    console.log(`Updated Active Filters Display. Agency=${agencyLabel}, Type=${isPrimeData ? 'Prime Contracts' : 'Subawards'}, View=${currentVizType}`);
}
// Update legend for all visualization types
function updateLegend(vizType) {
    const legend = document.getElementById('legend'); 
    if (!legend) return; 
    legend.innerHTML = '';
    
    switch (vizType) {
        case 'sankey':
        case 'treemap':
            activeLevels.forEach(level => {
                const color = monochromaticPurpleScale(level); // Use the purple scale by hierarchy level
                if (color) {
                    const item = document.createElement('div');
                    item.className = 'legend-item';
                    const colorBlock = document.createElement('div');
                    colorBlock.className = 'legend-color';
                    colorBlock.style.backgroundColor = color;
                    // Use square color blocks for these types
                    colorBlock.style.borderRadius = '3px';
                    const label = document.createElement('span');
                    label.textContent = capitalizeFirstLetter(level);
                    item.appendChild(colorBlock);
                    item.appendChild(label);
                    legend.appendChild(item);
                } else {
                    console.warn(`Could not get color from purpleHierarchyColorScale for legend level: ${level}`);
                }
            });
            
            // Add instruction for treemap
            if (vizType === 'treemap') {
                const instructionItem = document.createElement('div');
                instructionItem.className = 'legend-item legend-instruction'; // Add specific class
                instructionItem.style.flexBasis = '100%'; // Allow taking full width
                instructionItem.style.marginTop = '8px'; // Add some space
                instructionItem.innerHTML = `<span><strong>Tip:</strong> Click cells to focus data. Click 'All Data' breadcrumb to reset.</span>`;
                legend.appendChild(instructionItem);
            }
            break;
            
        case 'network':
            // Use the CATEGORICAL type scale for Network legend
            nodeTypes.forEach(level => { // Iterate through all defined types
                const color = monochromaticPurpleScale(level);
                // Only display legend item if the level is active AND color exists
                if (color && activeLevels.includes(level)) {
                    const item = document.createElement('div');
                    item.className = 'legend-item';
                    const colorBlock = document.createElement('div');
                    colorBlock.className = 'legend-color';
                    colorBlock.style.backgroundColor = color;
                    colorBlock.style.borderRadius = '3px'; // Circle for network
                    const label = document.createElement('span');
                    label.textContent = capitalizeFirstLetter(level);
                    item.appendChild(colorBlock);
                    item.appendChild(label);
                    legend.appendChild(item);
                } else if (!color) {
                    console.warn(`Could not get color from nodeTypeCategoricalColorScale for legend level: ${level}`);
                }
            });
            
            // Add size legend for network
            const sizeItem = document.createElement('div');
            sizeItem.className = 'legend-item size-legend';
            sizeItem.innerHTML = '<span>Node size represents contract value</span>';
            legend.appendChild(sizeItem);
            break;

        case 'choropleth': // Legend generated with map
            legend.innerHTML = '<div class="legend-item"><span>Map legend generated within map area</span></div>';
            break;

        default: // Handle unknown viz types or fallback
            console.warn(`updateLegend: No specific legend logic for vizType: ${vizType}`);
            break;
    }
}

// Tooltip functions
function showNodeTooltip(event, d) {
    const tooltip = d3.select('#tooltip'); 
    if (!tooltip.node()) return;
    const formattedValue = formatCurrency(d.value); 
    let content = `<h4>${d.name}</h4><p><strong>Type:</strong> ${capitalizeFirstLetter(d.type)}</p><p><strong>Value:</strong> ${formattedValue}</p>`;
    content += isTouchDevice() ? `<p><em>Tap to focus on this node</em></p>` : `<p><em>Click to focus on this node</em></p>`;
    tooltip.html(content).classed('visible', true).attr('aria-hidden', 'false'); 
    positionTooltip(tooltip, event);
}

function showLinkTooltip(event, d) {
    const tooltip = d3.select('#tooltip'); 
    if (!tooltip.node()) return;
    const formattedValue = formatCurrency(d.value); 
    let content = `<h4>${d.source.name} → ${d.target.name}</h4><p><strong>Value:</strong> ${formattedValue}</p>`;
    if (d.details?.naicsCode) content += `<p><strong>NAICS:</strong> ${d.details.naicsCode} - ${d.details.naicsDesc || 'N/A'}</p>`;
    if (d.details?.percentage) content += `<p><strong>Percentage:</strong> ${d.details.percentage}</p>`;
    tooltip.html(content).classed('visible', true).attr('aria-hidden', 'false'); 
    positionTooltip(tooltip, event);
}

function hideTooltip() { 
    d3.select('#tooltip').classed('visible', false).attr('aria-hidden', 'true'); 
}

function positionTooltip(tooltipElement, event) {
    const tooltipNode = tooltipElement.node(); 
    if (!tooltipNode) return;
    const offset = isTouchDevice() ? 20 : 15, 
          tooltipWidth = tooltipNode.offsetWidth, 
          tooltipHeight = tooltipNode.offsetHeight;
    const windowWidth = window.innerWidth, 
          windowHeight = window.innerHeight; 
    let x = event.pageX + offset, 
        y = event.pageY + offset;
    if (x + tooltipWidth > windowWidth) x = Math.max(5, event.pageX - tooltipWidth - offset);
    if (y + tooltipHeight > windowHeight) y = Math.max(5, event.pageY - tooltipHeight - offset);
    if (isTouchDevice()) y = Math.min(y, windowHeight - tooltipHeight - 10);
    tooltipElement.style('left', `${x}px`).style('top', `${y}px`);
}

// Map tooltip
function showMapTooltip(event, stateAbbr, value) {
    const tooltip = d3.select('#tooltip'); 
    if (!tooltip.node()) return;
    const topContractors = getTopContractorsForState(stateAbbr, 1); 
    let content = `<h4>${getStateFullName(stateAbbr)}</h4><p><strong>Total Contract Value:</strong> ${formatCurrency(value)}</p>`;
    if (topContractors.length > 0) content += `<p><strong>Top Contractor:</strong> ${topContractors[0].name}</p>`;
    const contractCount = getContractCountForState(stateAbbr); 
    if (contractCount > 0) content += `<p><strong>Contracts:</strong> ${contractCount}</p>`;
    content += `<p><em>Click for more details</em></p>`;
    tooltip.html(content).classed('visible', true).attr('aria-hidden', 'false'); 
    positionTooltip(tooltip, event);
}

// Node click handler
function nodeClicked(event, d) {
//     console.log('Node clicked:', d?.id);
    if (currentFocusNode && currentFocusNode.id === d.id) {
//         console.log('Node already focused. Resetting focus.');
        currentFocusNode = null; 
        closeInfoPanel();
    } else {
//         console.log('Setting focus to node:', d.name);
        currentFocusNode = { id: d.id, name: d.name, type: d.type };
        showInfoPanel(d); // Show details for the clicked node
        if (isTouchDevice() && window.navigator.vibrate) window.navigator.vibrate(50);
    }

    // Update the currently active visualization using the tracked type
//     console.log(`Node click updating visualization: ${currentVizType}`);
    if (currentVizType) {
        updateVisualization(currentVizType); // Use the tracked global type
    } else {
        console.warn("currentVizType not set, defaulting to Sankey update");
        applyFiltersAndDraw();
    }
    updateDataTable(); // Update table to reflect focus change
}
// Info panel functions
function showInfoPanel(node) {
    // console.log('>>> showInfoPanel attempting to show for:', node?.name); // DEBUGGING
    const infoPanel = document.getElementById('info-panel');
    if (!infoPanel) { console.error("Info panel element not found."); return; } // Added check message
    const titleElement = document.getElementById('info-panel-title');
    const contentElement = document.getElementById('info-panel-content');
    const linkElement = document.getElementById('info-panel-link'); // The USAspending link

    // Check if essential elements exist
    if (!titleElement || !contentElement || !linkElement) {
        console.error("Info panel child elements (title, content, link) not found! Check IDs in index.html.");
        // Optionally display error within the panel if possible
        if(infoPanel) infoPanel.innerHTML = '<p style="padding: 10px; color: red;">Error: Panel structure incomplete.</p>';
        return;
    }

     // Ensure panel is not display:none if it was set initially
     infoPanel.style.display = 'block';

    // Check 2: Is valid node data passed?
     if (!node || !node.id || !node.name || !node.type) {
         console.warn("showInfoPanel called with invalid node data:", node);
         titleElement.textContent = 'Details Unavailable';
         contentElement.innerHTML = '<p>Error: Invalid node data provided.</p>';
         linkElement.style.display = 'none'; // Hide USAspending link too
         // Still try to show the panel with the error
         infoPanel.removeAttribute('inert'); // Make interactable
         infoPanel.classList.add('visible');
         // aria-hidden is not needed with inert
         return;
     }

    // Populate Base Info
    titleElement.textContent = node.name;
    contentElement.innerHTML = ''; // Clear previous content
    addInfoItem(contentElement, 'Type', capitalizeFirstLetter(node.type)); // Ensure capitalizeFirstLetter exists
    addInfoItem(contentElement, 'Total Value', formatCurrency(node.value || 0)); // Ensure formatCurrency exists

    // --- Display Connection Details (Existing Logic) ---
    if (!processedData || !processedData.links || !processedData.nodes) {
        console.warn("Processed data not available for detailed info panel connections.");
        addInfoItem(contentElement, 'Connections', 'Processing...');
    } else {
        try {
            const allLinks = Object.values(processedData.links).flat();
            const allNodes = Object.values(processedData.nodes).flat();

            // Filter links relevant to the current node
            let relevantLinks = allLinks.filter(link => {
                 // Safe access to potential object or string IDs
                 const sourceId = typeof link?.source === 'object' ? link.source.id : link?.source;
                 const targetId = typeof link?.target === 'object' ? link.target.id : link?.target;
                 return link && (sourceId === node.id || targetId === node.id);
            });

            // Map connections, ensuring safe access
            const connections = relevantLinks.map(link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                const isSource = sourceId === node.id;
                const connectedNodeId = isSource ? targetId : sourceId;
                const connectedNode = allNodes.find(n => n && n.id === connectedNodeId); // Check n exists
                return {
                    name: connectedNode?.name || connectedNodeId?.split('-').slice(1).join('-') || 'Unknown Entity',
                    type: connectedNode?.type || connectedNodeId?.split('-')[0] || 'unknown',
                    value: link.value || 0,
                    relation: isSource ? 'outgoing' : 'incoming',
                    details: link.details || {} // Ensure details exists
                };
            }).sort((a, b) => b.value - a.value);

            const incomingConnections = connections.filter(c => c.relation === 'incoming');
            const outgoingConnections = connections.filter(c => c.relation === 'outgoing');

            // Helper to display top N connections
            const displayConnections = (list, title) => {
                if (list.length > 0) {
                    addInfoSection(contentElement, title); // Ensure addInfoSection exists
                    list.slice(0, 5).forEach(conn => addInfoItem(contentElement, conn.name, formatCurrency(conn.value))); // Ensure addInfoItem exists
                }
                // Optionally add "None found" if the list is empty for that direction
                // else { addInfoItem(contentElement, title, 'None found in current view.'); }
            };

            // Display logic based on node type
            if (node.type === 'prime') displayConnections(outgoingConnections, 'Top Subcontractors');
            else if (node.type === 'sub') displayConnections(incomingConnections, 'Top Prime Contractors');
            else { // Agency, Subagency, Office
                displayConnections(incomingConnections, `Top Incoming`);
                displayConnections(outgoingConnections, `Top Outgoing`);
                if (incomingConnections.length === 0 && outgoingConnections.length === 0) {
                     // addInfoItem(contentElement, 'Connections', 'None found in current view.');
                }
            }

        } catch (error) {
            console.error("Error processing node connection details:", error);
            addInfoItem(contentElement, 'Error', 'Could not load connection details.');
        }
    }
    // --- End Connection Details ---

    // --- START: Add Context Links for Primes/Subs ---
    if (node.type === 'prime' || node.type === 'sub') {
        const companyName = node.name;
        // Only proceed if the name is reasonably valid (not placeholder text)
        if (companyName && companyName !== 'N/A' && !companyName.toLowerCase().includes('unknown')) {
            const encodedName = encodeURIComponent(companyName);

            // Add a heading for this section
            addInfoSection(contentElement, 'External Links'); // Uses your helper

            // Create a definition description (dd) to hold the links
            const dd = document.createElement('dd');
            dd.classList.add('info-panel-context-links'); // Add class for styling
            // Generate the links HTML
            dd.innerHTML = `
                <a href="https://www.google.com/search?q=${encodedName}+careers" target="_blank" rel="noopener noreferrer" title="Search Careers for ${companyName}" class="context-link">
                    <span class="material-symbols-outlined" aria-hidden="true">work</span> Careers
                </a>
                <a href="https://news.google.com/search?q=${encodedName}" target="_blank" rel="noopener noreferrer" title="Search News for ${companyName}" class="context-link">
                    <span class="material-symbols-outlined" aria-hidden="true">feed</span> News
                </a>
                <a href="https://www.linkedin.com/search/results/companies/?keywords=${encodedName}" target="_blank" rel="noopener noreferrer" title="Search LinkedIn for ${companyName}" class="context-link">
                    <span class="material-symbols-outlined" aria-hidden="true">business_center</span> LinkedIn
                </a>
            `;
            // Append the definition description to the content element (<dl>)
            contentElement.appendChild(dd);
        }
    }
    // --- END: Add Context Links ---

    // --- Update USAspending Link ---
    // (Keep your existing permalink finding logic here)
    let permalink = '#'; // Default
    if (processedData && processedData.links) {
        try {
            const allLinks = Object.values(processedData.links).flat();
            const linkWithPermalink = allLinks.find(link =>
                (link?.source === node.id || link?.target === node.id) && // Check source/target safely
                link?.details?.permalink && typeof link.details.permalink === 'string' &&
                link.details.permalink !== '#' && link.details.permalink.startsWith('http')
            );
             if (linkWithPermalink) {
                 permalink = linkWithPermalink.details.permalink;
             } else {
                 // Fallback to rawData if needed
                 const rawDataItem = rawData?.find(r => // Check rawData exists
                    `prime-${r?.prime_awardee_name}` === node.id ||
                    `sub-${r?.subawardee_name}` === node.id ||
                    `office-${r?.prime_award_awarding_office_name}` === node.id ||
                    `subagency-${r?.prime_award_awarding_sub_agency_name}` === node.id ||
                    `agency-${r?.prime_award_awarding_agency_name}` === node.id);
                 if (rawDataItem?.usaspending_permalink && typeof rawDataItem.usaspending_permalink === 'string' && rawDataItem.usaspending_permalink.startsWith('http')) {
                      permalink = rawDataItem.usaspending_permalink;
                 } else {
                     console.log("No valid permalink found for info panel link.");
                 }
             }
        } catch (permError) {
            console.error("Error finding permalink for info panel:", permError);
            permalink = '#'; // Reset on error
        }
    }
    // Set link properties
    const isValidPermalink = permalink && permalink !== '#' && permalink.startsWith('http');
    linkElement.href = isValidPermalink ? permalink : '#';
    linkElement.style.display = isValidPermalink ? 'inline-flex' : 'none'; // Use inline-flex if using btn class
    if (isValidPermalink) {
        linkElement.setAttribute('target', '_blank');
        linkElement.setAttribute('rel', 'noopener noreferrer');
    } else {
        linkElement.removeAttribute('target');
        linkElement.removeAttribute('rel');
    }
    // --- End USAspending Link ---


    // --- Show Panel (Using Inert) ---
    infoPanel.removeAttribute('inert'); // Make panel accessible and interactive
    infoPanel.classList.add('visible'); // Trigger CSS animation/visibility
    // aria-hidden is not needed when using inert
    // console.log('Info panel displayed.'); // DEBUGGING
}
function closeInfoPanel() { 
    const infoPanel = document.getElementById('info-panel'); 
    if (infoPanel) { 
        infoPanel.classList.remove('visible'); 
        infoPanel.setAttribute('inert', ''); 
    } 
// console.log("Info panel closed (using inert)."); 
}

// Helper functions for info panel
function addInfoSection(container, title) { 
    const dt = document.createElement('dt'); 
    dt.textContent = title; 
    container.appendChild(dt); 
}

function addInfoItem(container, label, value) { 
    const dt = document.createElement('dt'); 
    dt.textContent = label; 
    const dd = document.createElement('dd'); 
    dd.textContent = value; 
    container.appendChild(dt); 
    container.appendChild(dd); 
}

function showEnhancedStateInfoPanel(stateAbbr, value) {
    const infoPanel = document.getElementById('info-panel'); 
    if (!infoPanel) return;
    const titleElement = document.getElementById('info-panel-title'), 
          contentElement = document.getElementById('info-panel-content'), 
          linkElement = document.getElementById('info-panel-link');
    if (!titleElement || !contentElement || !linkElement) return;
    
    const stateName = getStateFullName(stateAbbr); 
    titleElement.textContent = `${stateName} Contracts`; 
    contentElement.innerHTML = '';
    
    addInfoItem(contentElement, 'Total Contract Value', formatCurrency(value));
    const contractCount = getContractCountForState(stateAbbr); 
    addInfoItem(contentElement, 'Total Contracts', contractCount.toLocaleString());
    
    const topPrimes = getTopContractorsForState(stateAbbr, 5, 'prime'); 
    if (topPrimes.length > 0) { 
        addInfoSection(contentElement, 'Top Prime Contractors'); 
        topPrimes.forEach(c => addInfoItem(contentElement, c.name, formatCurrency(c.value))); 
    }
    
    const topSubs = getTopContractorsForState(stateAbbr, 5, 'sub'); 
    if (topSubs.length > 0) { 
        addInfoSection(contentElement, 'Top Subcontractors'); 
        topSubs.forEach(c => addInfoItem(contentElement, c.name, formatCurrency(c.value))); 
    }
    
    const topNaics = getTopNaicsForState(stateAbbr, 3); 
    if (topNaics.length > 0) { 
        addInfoSection(contentElement, 'Primary Industry Categories'); 
        topNaics.forEach(n => addInfoItem(contentElement, `${n.code}`, `${n.desc} (${formatCurrency(n.value)})`)); 
    }
    
    const usaSpendingUrl = `https://www.usaspending.gov/state/${stateName.toLowerCase().replace(/\s+/g, '-')}`;
    linkElement.href = usaSpendingUrl; 
    linkElement.style.display = 'inline-flex';
    infoPanel.classList.add('visible'); 
    infoPanel.setAttribute('aria-hidden', 'false');
}
function showMapTooltip(event, stateAbbr, value) {
    const tooltip = d3.select('#tooltip'); 
    if (!tooltip.node()) return;
    const topContractors = getTopContractorsForState(stateAbbr, 1); 
    let content = `<h4>${getStateFullName(stateAbbr)}</h4><p><strong>Total Contract Value:</strong> ${formatCurrency(value)}</p>`;
    if (topContractors.length > 0) content += `<p><strong>Top Contractor:</strong> ${topContractors[0].name}</p>`;
    const contractCount = getContractCountForState(stateAbbr); 
    if (contractCount > 0) content += `<p><strong>Contracts:</strong> ${contractCount}</p>`;
    content += `<p><em>Click for more details</em></p>`;
    tooltip.html(content).classed('visible', true).attr('aria-hidden', 'false'); 
    positionTooltip(tooltip, event);
}

function getContractCountForState(stateAbbr) {
    if (!rawData || rawData.length === 0) return 0;
    const uniqueContracts = new Set();

    rawData.forEach(row => {
        const popState = row.place_of_performance_state || row.pop_state || row.prime_award_pop_state || row.subaward_primary_place_of_performance_state_code;
        // Ensure popState is valid and matches the target state
        if (!popState || typeof popState !== 'string' || popState.toUpperCase().trim() !== stateAbbr) return;

        // Apply current filters
        let includeRow = true;

        // Search Filter
        if (currentSearchTerm) {
            const fields = [
                row['prime_award_awarding_agency_name'],
                row['prime_award_awarding_sub_agency_name'], // Check SubAgency
                row['prime_award_awarding_office_name'],    // Check Office
                row['prime_awardee_name'],
                row['subawardee_name'],
                row['prime_award_naics_code']?.toString(),
                row['prime_award_naics_description']
            ];
            // Ensure field is not null/undefined and is a string before calling includes
            if (!fields.some(field => field && typeof field === 'string' && field.toLowerCase().includes(currentSearchTerm))) {
                 includeRow = false;
            }
        }

        // SubAgency Filter Check
        if (includeRow && currentSubAgencyFilter && row['prime_award_awarding_sub_agency_name'] !== currentSubAgencyFilter) {
            includeRow = false;
        }

        // Office Filter Check
        if (includeRow && currentOfficeFilter && row['prime_award_awarding_office_name'] !== currentOfficeFilter) {
            includeRow = false;
        }

        // NAICS Filter Check
        if (includeRow && currentNaicsFilter && row['prime_award_naics_code']?.toString() !== currentNaicsFilter) {
            includeRow = false;
        }

        // Prime Filter Check
        if (includeRow && currentPrimeFilter && row['prime_awardee_name'] !== currentPrimeFilter) {
            includeRow = false;
        }

        // Sub Filter Check
        if (includeRow && currentSubFilter && row['subawardee_name'] !== currentSubFilter) {
            includeRow = false;
        }

        // Min Value Check (Use $0 for map helpers for counts/rankings)
        const contractValue = typeof row.subaward_amount === 'number' ? row.subaward_amount : parseFloat(String(row.subaward_amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
        if (contractValue <= 0) { // Exclude zero or negative values
            includeRow = false;
        }


        // If row passes all filters, add its unique identifier to the set
        if (includeRow) {
             // Create a robust unique ID for the subaward
             const contractId = row.subaward_unique_key || row.prime_award_unique_key || `${row.prime_awardee_name}-${row.subawardee_name}-${row.action_date}-${subValue}`;
             uniqueContracts.add(contractId);
        }
    });

    return uniqueContracts.size; // Return the count of unique contracts matching filters for the state
}
function getTopNaicsForState(stateAbbr, limit = 3) {
    if (!rawData || rawData.length === 0) return [];
    const naicsCodes = {}; // Use object to store { value: X, desc: Y }

    rawData.forEach(row => {
        const popState = row.place_of_performance_state || row.pop_state || row.prime_award_pop_state || row.subaward_primary_place_of_performance_state_code;
        // Ensure popState is valid and matches the target state
        if (!popState || typeof popState !== 'string' || popState.toUpperCase().trim() !== stateAbbr) return;


        // Apply current filters (excluding NAICS itself)
        let includeRow = true;

        // Search Filter
        if (currentSearchTerm) {
            const fields = [
                row['prime_award_awarding_agency_name'],
                row['prime_award_awarding_sub_agency_name'], // Check SubAgency
                row['prime_award_awarding_office_name'],    // Check Office
                row['prime_awardee_name'],
                row['subawardee_name'],
                row['prime_award_naics_code']?.toString(),
                row['prime_award_naics_description']
            ];
             if (!fields.some(field => field && typeof field === 'string' && field.toLowerCase().includes(currentSearchTerm))) {
                  includeRow = false;
             }
        }

        // SubAgency Filter Check
        if (includeRow && currentSubAgencyFilter && row['prime_award_awarding_sub_agency_name'] !== currentSubAgencyFilter) {
            includeRow = false;
        }

        // Office Filter Check
        if (includeRow && currentOfficeFilter && row['prime_award_awarding_office_name'] !== currentOfficeFilter) {
            includeRow = false;
        }

        // NOTE: Do NOT filter by currentNaicsFilter here

        // Prime Filter Check
        if (includeRow && currentPrimeFilter && row['prime_awardee_name'] !== currentPrimeFilter) {
            includeRow = false;
        }

        // Sub Filter Check
        if (includeRow && currentSubFilter && row['subawardee_name'] !== currentSubFilter) {
            includeRow = false;
        }

        // Min Value Check (Use $0 for map helpers)
        const contractValue = typeof row.subaward_amount === 'number' ? row.subaward_amount : parseFloat(String(row.subaward_amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
        if (contractValue <= 0) { // Exclude zero or negative
            includeRow = false;
        }

        // If row passes filters, aggregate NAICS data
        if (includeRow) {
            const naicsCode = row.prime_award_naics_code?.toString().trim() || 'Unknown';
            const naicsDesc = row.prime_award_naics_description?.trim() || 'Unknown Description';

            if (naicsCode === 'Unknown') return; // Skip if no valid NAICS

            const key = `${naicsCode}`; // Use code as key
            if (!naicsCodes[key]) {
                // Store description only the first time we see a code
                naicsCodes[key] = { code: naicsCode, desc: naicsDesc, value: 0 };
            }
            naicsCodes[key].value += contractValue; // Aggregate value
        }
    });

    // Convert aggregated data to array, sort, and slice
    const sortedNaics = Object.values(naicsCodes)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);

    return sortedNaics;
}
/**
 * Analyzes processed data to generate actionable insights for salespeople.
 * Focuses on sub-friendly primes and top expiring contracts with links.
 * @param {object} pData - The processedData object from processData().
 * @param {array} expiring - The allExpiringContracts array.
 * @param {number} totalVal - The total filtered contract value from pData.stats.
 * @returns {string[]} - An array of insight strings (HTML supported).
 */
function generateInsights(pData, expiring, totalVal) {
    const insights = [];
    const thresholdPercent = 15; // Example: Highlight if > 15% concentration
    const topExpiringCount = 3; // Still use this to limit the *number* of items processed

    // Ensure necessary data structures exist
    if (!pData || !pData.stats || !pData.nodes || !pData.nodes.prime || !pData.nodes.sub || !pData.links || !pData.links.contractorToSubcontractor || totalVal <= 0) {
        console.warn("generateInsights: Missing required processedData components.");
        return ["Insufficient data available for generating insights."];
    }

    try {
        // --- Concentration Insight (Top Prime/Sub Value) ---
        const topPrime = pData.unfilteredNodes?.prime?.[0];
        if (topPrime && topPrime.value / totalVal > thresholdPercent / 100) {
            insights.push(`Prime <strong>${truncateText(topPrime.name, 30)}</strong> is associated with over ${thresholdPercent}% (${formatCurrency(topPrime.value)}) of the total subaward value in this view.`);
        }

        const topSub = pData.unfilteredNodes?.sub?.[0];
        if (topSub && topSub.value / totalVal > thresholdPercent / 100) {
            insights.push(`Sub <strong>${truncateText(topSub.name, 30)}</strong> received over ${thresholdPercent}% (${formatCurrency(topSub.value)}) of the total subaward value in this view.`);
        }

        // --- "Sub Friendly" Prime Insight (Most Unique Partners) ---
        const primes = pData.nodes?.prime || [];
        const links = pData.links?.contractorToSubcontractor || [];

        if (primes.length > 0 && links.length > 0) {
            let primePartners = {};
            links.forEach(link => {
                if (link && link.source && link.target) {
                    if (!primePartners[link.source]) primePartners[link.source] = new Set();
                    primePartners[link.source].add(link.target);
                }
            });

            let maxSubs = 0;
            let mostFriendlyPrimes = [];

            primes.forEach(pNode => {
                const partnerCount = primePartners[pNode.id]?.size || 0;
                if (partnerCount > maxSubs) {
                    maxSubs = partnerCount;
                    mostFriendlyPrimes = [pNode.name];
                } else if (partnerCount === maxSubs && maxSubs > 0) {
                    mostFriendlyPrimes.push(pNode.name);
                }
            });

            if (maxSubs > 0) {
                const primeList = mostFriendlyPrimes.map(name => `<strong>${truncateText(name, 30)}</strong>`).join(', ');
                insights.push(`${primeList} worked with the most unique subs (${maxSubs}) in this filtered view.`);
            }
        }

        // --- Expiring Contracts Insights (Top 3 with Links, no numbers) ---
        if (expiring && expiring.length > 0) {
            const sortedExpiring = [...expiring].sort((a, b) => {
                 const timeA = a.endDate instanceof Date && !isNaN(a.endDate) ? a.endDate.getTime() : Infinity;
                 const timeB = b.endDate instanceof Date && !isNaN(b.endDate) ? b.endDate.getTime() : Infinity;
                 if (timeA < timeB) return -1;
                 if (timeA > timeB) return 1;
                 return (b.amount || 0) - (a.amount || 0);
            });

            // **MODIFIED HEADING:** Removed the count
            insights.push(`<strong>Potential Contract Expirations (Next ~6 Mo)</strong>`);

            const topExpiringItems = sortedExpiring.slice(0, topExpiringCount); // Still slice top 3

            topExpiringItems.forEach((item) => { // Removed 'index' parameter as it's not used

                const isValidLink = item.permalink && item.permalink !== '#' && typeof item.permalink === 'string' && item.permalink.startsWith('http');
                const linkHTML = isValidLink
                    ? `<a href="${item.permalink}" class="detail-link" target="_blank" rel="noopener noreferrer" style="margin-left: 5px;" title="View on USAspending.gov">View</a>`
                    : '';

                // **MODIFIED LIST ITEM:** Removed index+1 prefix, added a dash
                insights.push(
                     `- ~${item.endDateStr}: <strong>${truncateText(item.prime, 25)}</strong> / ${truncateText(item.sub, 25)} (${formatCurrency(item.amount)}) ${linkHTML}`
                 );
            });

        } else {
             insights.push(`No contracts identified as potentially expiring (> ${formatCurrency(expiringAmountThreshold)}) in the next ~6 months for this agency.`);
        }

    } catch (error) {
        console.error("Error generating insights:", error);
        insights.push("Could not generate all insights due to an error.");
    }

    return insights.length > 0 ? insights : ["No specific insights generated for the current view."];
}
/**
 * Displays the generated insights in the UI.
 * @param {string[]} insightsArray - An array of insight strings.
 */
function displayInsights(insightsArray) {
    const listElement = document.getElementById('insights-list');
    if (!listElement) return;

    listElement.innerHTML = ''; // Clear previous insights or placeholder

    if (!insightsArray || insightsArray.length === 0) {
        listElement.innerHTML = '<li class="placeholder">No insights available.</li>';
        return;
    }

    insightsArray.slice(0, 5).forEach(insight => { // Limit to top 5 insights
        const li = document.createElement('li');
        li.innerHTML = insight; // Use innerHTML because insights might contain <strong> tags
        listElement.appendChild(li);
    });
}
// Update the breadcrumb trail
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb'); 
    if (!breadcrumb) return;
    breadcrumb.innerHTML = '<a href="#" data-action="reset">All Data</a>';
    breadcrumb.classList.remove('visually-hidden');
    breadcrumb.setAttribute('aria-hidden', 'false');
    
    if (currentFocusNode) {
        const separator = document.createElement('span'); 
        separator.className = 'separator'; 
        separator.textContent = ' › ';
        const nodeNameSpan = document.createElement('span'); 
        nodeNameSpan.textContent = currentFocusNode.name;
        breadcrumb.appendChild(separator); 
        breadcrumb.appendChild(nodeNameSpan);
    } else if (currentMapFocusState) {
        const separator = document.createElement('span'); 
        separator.className = 'separator'; 
        separator.textContent = ' › ';
        const stateName = getStateFullName(currentMapFocusState);
        const stateNameSpan = document.createElement('span'); 
        stateNameSpan.textContent = stateName;
        breadcrumb.appendChild(separator); 
        breadcrumb.appendChild(stateNameSpan);
    } else {
        // If no focus or state, hide breadcrumb
        breadcrumb.classList.add('visually-hidden');
        breadcrumb.setAttribute('aria-hidden', 'true');
    }
}

// Handle breadcrumb click
function handleBreadcrumbClick(event) {
    const targetLink = event.target.closest('a[data-action="reset"]');
    if (targetLink) {
        event.preventDefault();
        currentFocusNode = null;
        currentMapFocusState = null;
        closeInfoPanel();
        
        // Clear map state focus if applicable
        d3.select('#map-chart .states path.focused-state')
            .classed('focused-state', false)
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5);
            
        updateBreadcrumb();
        
        if (currentVizType) updateVisualization(currentVizType);
        else applyFiltersAndDraw(); // Fallback
        updateDataTable(); // Ensure table updates on focus reset
    }
}

// Slider/Value update functions
function debounceMinValueUpdate() {
    clearTimeout(minValueUpdateTimeout);
    minValueUpdateTimeout = setTimeout(() => {
        updateMinValueFilter();
    }, 250);
}

function updateMinValueFilter() {
    const slider = document.getElementById('min-value');
    const display = document.getElementById('min-value-display');
    if(!slider || !display) return;
    
    const oldValue = minContractValue;
    minContractValue = parseInt(slider.value);
    display.textContent = formatCurrency(minContractValue);
    
//     console.log(`Filter value changed from ${oldValue} to ${minContractValue}`);
    
    // Track that user has manually changed the value
    userChangedMinValue = true;
//     console.log("User manually changed min value - will preserve this setting");

    // Force layout recalc potentially?
    const vizContainer = document.querySelector('.visualization');
    if(vizContainer) void vizContainer.offsetHeight;

    // Update the currently active visualization using the tracked type
//     console.log(`Slider change updating visualization: ${currentVizType}`);
    if (currentVizType) {
        updateVisualization(currentVizType); // Use the tracked global type
    } else {
        console.warn("currentVizType not set on slider change, defaulting to Sankey update");
        applyFiltersAndDraw();
    }
    
    updateDataTable(); // Ensure table updates with new value filter
}

// Toggle level filter
function toggleLevelFilter(event) {
    const button = event.currentTarget, level = button.getAttribute('data-level');
    const isActive = button.classList.toggle('active');
    if (isActive) activeLevels.push(level); else activeLevels = activeLevels.filter(l => l !== level);
    activeLevels.sort((a, b) => ['agency', 'subagency', 'office', 'prime', 'sub'].indexOf(a) - ['agency', 'subagency', 'office', 'prime', 'sub'].indexOf(b));
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
//     console.log("Active Levels:", activeLevels);

    if (currentVizType) updateVisualization(currentVizType); else applyFiltersAndDraw(); // Update current view
    
    updateDataTable(); // Update table based on level change
    if (isTouchDevice() && window.navigator.vibrate) window.navigator.vibrate(30);
}
function changeAgency() {
    const selector = document.getElementById('agency-selector'); if (!selector) return;
    const agency = selector.value; console.log(`Agency changing to: ${agency}`);

    // Reset slider and state
    minContractValue = DEFAULT_MIN_VALUE; userChangedMinValue = false;
    const slider = document.getElementById('min-value'); const display = document.getElementById('min-value-display');
    if (slider) slider.value = minContractValue; if (display) display.textContent = formatCurrencyWithSuffix(minContractValue);

    // Reset focus states
    currentFocusNode = null; currentMapFocusState = null;

    // Reset all filter values
    currentSubAgencyFilter = ''; // Added back
    currentOfficeFilter = '';
    currentNaicsFilter = ''; currentPrimeFilter = ''; currentSubFilter = ''; currentSearchTerm = '';

    // Reset filter UI elements
    const subAgencyFilter = document.getElementById('subagency-filter'); if (subAgencyFilter) subAgencyFilter.value = ""; // Added back
    const officeFilter = document.getElementById('office-filter'); if (officeFilter) officeFilter.value = "";
    const naicsFilter = document.getElementById('naics-filter'); if (naicsFilter) naicsFilter.value = "";
    const primeFilter = document.getElementById('prime-filter'); if (primeFilter) primeFilter.value = "";
    const subFilter = document.getElementById('sub-filter'); if (subFilter) subFilter.value = "";
    const searchInput = document.getElementById('data-search'); if (searchInput) searchInput.value = ""; const searchClearBtn = document.getElementById('search-clear-btn'); if (searchClearBtn) searchClearBtn.style.display = 'none';

    // Clear map focus etc.
    d3.select('#map-chart .states path.focused-state').classed('focused-state', false).attr('stroke', '#fff').attr('stroke-width', 0.5);
    closeInfoPanel(); updateBreadcrumb();

    // Load new agency data
    loadAgencyData(agency);
}

function resetFilters(triggerRedraw = true) {
//     console.log("Resetting all filters...");
    currentSearchTerm = ''; const searchInput = document.getElementById('data-search'); if (searchInput) searchInput.value = ''; const clearButton = document.getElementById('search-clear-btn'); if (clearButton) clearButton.style.display = 'none';
    topNFilterValue = 0;

    // Reset SubAgency Filter (Added back)
    currentSubAgencyFilter = '';
    const subAgencyFilter = document.getElementById('subagency-filter');
    if (subAgencyFilter) subAgencyFilter.value = "";

    // Reset Office Filter
    currentOfficeFilter = '';
    const officeFilter = document.getElementById('office-filter');
    if (officeFilter) officeFilter.value = "";

    // Reset other filters
    currentNaicsFilter = ''; const naicsFilter = document.getElementById('naics-filter'); if (naicsFilter) naicsFilter.value = "";
    currentPrimeFilter = ''; const primeFilter = document.getElementById('prime-filter'); if (primeFilter) primeFilter.value = "";
    currentSubFilter = ''; const subFilter = document.getElementById('sub-filter'); if (subFilter) subFilter.value = "";

    userChangedMinValue = false;

    // Reset Min Value Slider
    const slider = document.getElementById('min-value'); const display = document.getElementById('min-value-display');
    if (slider && display) { minContractValue = (currentVizType === 'choropleth') ? CHOROPLETH_MIN_VALUE : DEFAULT_MIN_VALUE; slider.value = minContractValue; display.textContent = formatCurrencyWithSuffix(minContractValue); }

    // Reset Levels (Add subagency back)
    activeLevels = ['agency', 'subagency', 'office', 'prime', 'sub'];
    document.querySelectorAll('#level-filters button').forEach(button => {
        const level = button.getAttribute('data-level');
        if (activeLevels.includes(level)) { button.classList.add('active'); button.setAttribute('aria-pressed', 'true'); }
        else { button.classList.remove('active'); button.setAttribute('aria-pressed', 'false'); }
    });

    // Reset Focus
    currentFocusNode = null; closeInfoPanel(); currentMapFocusState = null;
    d3.select('#map-chart .states path.focused-state').classed('focused-state', false).attr('stroke', '#fff').attr('stroke-width', 0.5);
    updateBreadcrumb();

    // Update UI elements
    if (rawData && rawData.length > 0 && triggerRedraw) { console.log("Reset Filters triggering redraw..."); processData(); }
    else if (triggerRedraw) { updateActiveFiltersDisplay(); updateDataTable(); }
    if (triggerRedraw) showNotification('All filters have been reset.', 'info');
}
// Theme toggle functionality
function toggleTheme(event) {
    if (event) event.preventDefault();

    const isLightModeNow = document.body.classList.toggle('light-mode'); // Toggle returns true if class was added (now light)
    const themeToggle = document.getElementById('theme-toggle');
    const iconSpan = themeToggle ? themeToggle.querySelector('.material-symbols-outlined') : null;

    if (themeToggle && iconSpan) {
        if (isLightModeNow) {
            iconSpan.textContent = 'dark_mode'; // Show moon icon
            themeToggle.setAttribute('aria-label', 'Switch to Dark Mode');
            themeToggle.setAttribute('aria-pressed', 'false');
            updateThemeColor('#F4F2F6');
        } else {
            iconSpan.textContent = 'light_mode'; // Show sun icon
            themeToggle.setAttribute('aria-label', 'Switch to Light Mode');
            themeToggle.setAttribute('aria-pressed', 'true');
            updateThemeColor('#252327');
        }
    }

    // Redraw current visualization for better theme compatibility
    if (currentVizType) updateVisualization(currentVizType);
    else if (currentSankeyData) drawSankeyDiagram(currentSankeyData); // Fallback
}

// Update stats display - Calls Donut and BAR chart functions with Entity Type
function updateStatsDisplay() {
    // Select containers and elements
    const totalValEl = document.getElementById('total-value');
    const naicsContainer = document.getElementById('naics-donut-chart');
    const primeContainer = document.getElementById('top-primes-bar-chart'); // Correct ID for bar chart
    const subContainer = document.getElementById('top-subs-bar-chart');     // Correct ID for bar chart
    const primeTitleEl = document.getElementById('prime-chart-title');
    const subTitleEl = document.getElementById('sub-chart-title');

    // Check if core data structure and necessary stats/nodes are ready
    if (!processedData || !processedData.stats || !processedData.nodes) {
        console.warn("Stats display update skipped: processedData not fully ready.");
        // Reset displays
        if (totalValEl) totalValEl.textContent = '$0';
        if (naicsContainer) naicsContainer.innerHTML = '<span class="chart-placeholder">No data</span>';
        if (primeContainer) primeContainer.innerHTML = '<span class="chart-placeholder">No data</span>';
        if (subContainer) subContainer.innerHTML = '<span class="chart-placeholder">No data</span>';
        // Reset titles (use the new function to ensure consistency even with 0)
        if (primeTitleEl) primeTitleEl.innerHTML = `0 Primes w/ Subs <span style="font-weight:normal; font-size:0.8em;">(Top 5 by Value)</span>`;
        if (subTitleEl) subTitleEl.innerHTML = `0 Total Subs <span style="font-weight:normal; font-size:0.8em;">(Top 5 by Value)</span>`;
        return; // Exit if no data to display
    }

    // --- Update Total Value (Text KPI - Uses Filtered Value) ---
    if (totalValEl) {
        totalValEl.textContent = formatCurrencyWithSuffix(processedData.stats.totalContractValue);
    } else {
        console.warn("Stats element 'total-value' not found.");
    }

    // --- Draw NAICS Donut Chart (Uses Filtered Data) ---
    if (naicsContainer && processedData.stats.filteredNaicsBreakdown) {
        if (typeof drawNaicsDonut === 'function') {
            drawNaicsDonut(processedData.stats.filteredNaicsBreakdown, 'naics-donut-chart', 5);
        } else { /* Handle error */ }
    } else { /* Handle missing container or data */ }

    // --- Draw Top 5 Primes Bar Chart (Uses Filtered Data) ---
    if (primeContainer && processedData.nodes.prime) {
         if (typeof drawTopNBarChart === 'function') {
             drawTopNBarChart(
                 processedData.nodes.prime, // Filtered Nodes
                 'top-primes-bar-chart',    // Container ID
                 'prime-chart-title',       // Title Element ID
                 processedData.stats.uniquePrimeContractorCount, // Filtered Count
                 'prime',                   // <<< Entity Type Parameter >>>
                 5                          // Top N
             );
         } else {
              console.error("drawTopNBarChart function is not defined.");
              if (primeContainer) primeContainer.innerHTML = '<span class="chart-placeholder">Chart Error</span>';
              // Fallback title update if function missing
              if (primeTitleEl) primeTitleEl.innerHTML = `${processedData.stats.uniquePrimeContractorCount.toLocaleString()} Primes w/ Subs <span style="font-weight:normal; font-size:0.8em;">(Top 5 by Filtered Value)</span>`;
         }
    } else { /* Handle missing container or data */ }

    // --- Draw Top 5 Subs Bar Chart (Uses Filtered Data) ---
     if (subContainer && processedData.nodes.sub) {
        if (typeof drawTopNBarChart === 'function') {
            drawTopNBarChart(
                processedData.nodes.sub, // Filtered Nodes
                'top-subs-bar-chart',    // Container ID
                'sub-chart-title',       // Title Element ID
                processedData.stats.uniqueSubcontractorCount, // Filtered Count
                'sub',                     // <<< Entity Type Parameter >>>
                5                          // Top N
            );
        } else {
              console.error("drawTopNBarChart function is not defined.");
              if (subContainer) subContainer.innerHTML = '<span class="chart-placeholder">Chart Error</span>';
              // Fallback title update if function missing
              if (subTitleEl) subTitleEl.innerHTML = `${processedData.stats.uniqueSubcontractorCount.toLocaleString()} Total Subcontractors <span style="font-weight:normal; font-size:0.8em;">(Top 5 by Filtered Value)</span>`;
        }
     } else { /* Handle missing container or data */ }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    // Adjust maxLength check to avoid negative substring index if maxLength is small
    if (maxLength <= 3) return text.length > maxLength ? text.substring(0, maxLength) : text;
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}
// Ensure you have these helper functions available in your code:
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '$?';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function truncateText(text, maxLength) {
    if (!text) return '';
    // Adjust maxLength check to avoid negative substring index if maxLength is small
    if (maxLength <= 3) return text.length > maxLength ? text.substring(0, maxLength) : text;
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

function loadAgencyData(agency) {
    console.log(`Loading data for agency: ${agency}`);
    showLoading();
    currentAgency = agency;
    currentFocusNode = null;
    rawData = [];
    processedData = null;
    currentSankeyData = null;
    
    // Check if this is a prime contract dataset
    const isPrimeData = agency.endsWith('_primes');
    
    // Determine the correct file path
    const dataUrl = `https://subhoodata.s3.amazonaws.com/data/${agency}.csv`;
    console.log(`Attempting to load: ${dataUrl}`);
    
    Papa.parse(dataUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: function(results) {
            console.log(`CSV parsing complete for ${agency}. Rows: ${results.data.length}`);
            
            if (results.errors?.length > 0) {
                console.warn("CSV Errors:", results.errors);
                showNotification(`CSV parsed with ${results.errors.length} errors.`, 'warning');
            }
            
            if (!results.data || results.data.length === 0) {
                console.error(`No data loaded from ${dataUrl}`);
                rawData = [];
                processedData = null;
                processData();
                hideLoading();
                showNotification(`No data found for ${agency}.`, 'error');
                return;
            }

            // If this is prime contract data, adapt it to the expected format
            if (isPrimeData) {
                console.log("Adapting prime contract data to subaward format");
                rawData = adaptPrimeContractData(results.data);
            } else {
                // Regular subaward data, no adaptation needed
                rawData = results.data;
            }

            // Populate filter dropdowns based on raw data
            populateFilterDropdowns();

            // Process the data for charts/tables etc.
            processData();

            // Hide loading after processing completes
            hideLoading();
        },
        error: function(error, file) {
            console.error(`Error loading CSV: ${file}`, error);
            rawData = [];
            processedData = null;
            processData();
            hideLoading();
            showNotification(`Failed to load data for ${agency}.`, 'error');
        }
    });
}
// Process data for visualizations - Updated to handle both subaward and prime contract data
function processData() {
    //console.log("Starting processData...");
    const isPrimeData = currentAgency && currentAgency.endsWith('_primes');

    if (!rawData || rawData.length === 0) {
        console.warn("processData called with no rawData.");
        processedData = { // Reset structure including subagency
            nodes: { agency: [], subagency: [], office: [], prime: [], sub: [] },
            links: { agencyToSub: [], subToOffice: [], officeToContractor: [], contractorToSubcontractor: [] },
            stats: { totalContractValue: 0, totalPrimeContracts: 0, totalSubContracts: 0, primaryNaics: { code:'N/A', desc:'', value:0 }, uniquePrimeContractorCount: 0, uniqueSubcontractorCount: 0, filteredNaicsBreakdown: [] },
            unfilteredNodes: { prime: [], sub: [] }, unfilteredNaics: [] };
        updateStatsDisplay(); updateDataTable();
        displayTopNTable([], 'top-primes-container', 'Top Prime Contractors', 10);
        displayTopNTable([], 'top-subs-container', isPrimeData ? 'No Subcontractor Data' : 'Top Subcontractors', 10);
        displayNaicsTable([], 'naics-container', 'Top NAICS Codes', 5);
        if (currentVizType) updateVisualization(currentVizType);
        return;
    }

    // Calculate Unfiltered Aggregates with prime/subaward awareness
    const unfilteredPrimeMap = new Map(); 
    const unfilteredSubMap = new Map(); 
    const unfilteredNaicsValueMap = new Map();
    
    rawData.forEach((row) => {
        // For prime data, the "subaward_amount" contains the prime contract value
        const primeName = row['prime_awardee_name']?.trim() || 'Unknown Prime Contractor'; 
        const subName = isPrimeData ? null : (row['subawardee_name']?.trim() || 'Unknown Subcontractor'); 
        const contractValue = typeof row['subaward_amount'] === 'number' ? 
            row['subaward_amount'] : 
            parseFloat(String(row['subaward_amount'] || '0').replace(/[^0-9.-]+/g, '')) || 0; 
        
        const naicsCode = row['prime_award_naics_code']?.toString().trim() || 'Unknown'; 
        const naicsDesc = row['prime_award_naics_description']?.trim() || 'Unknown'; 
        
        if (contractValue <= 0) return;
        
        // Always process prime contractors
        if (primeName !== 'Unknown Prime Contractor') {
            if (!unfilteredPrimeMap.has(primeName)) {
                unfilteredPrimeMap.set(primeName, {
                    id: `prime-${primeName}`,
                    name: primeName,
                    type: 'prime',
                    value: 0
                });
            }
            unfilteredPrimeMap.get(primeName).value += contractValue;
        }
        
        // Only process subcontractors for subaward data
        if (!isPrimeData && subName && subName !== 'Unknown Subcontractor') {
            if (!unfilteredSubMap.has(subName)) {
                unfilteredSubMap.set(subName, {
                    id: `sub-${subName}`,
                    name: subName,
                    type: 'sub',
                    value: 0
                });
            }
            unfilteredSubMap.get(subName).value += contractValue;
        }
        
        // Process NAICS data for all types
        if (naicsCode && naicsCode !== 'Unknown' && naicsCode !== 'N/A' && naicsCode !== '') {
            const key = `${naicsCode} - ${naicsDesc || 'No Description'}`;
            unfilteredNaicsValueMap.set(key, (unfilteredNaicsValueMap.get(key) || 0) + contractValue);
        }
    });
    
    const unfilteredPrimeNodes = Array.from(unfilteredPrimeMap.values()).sort((a, b) => b.value - a.value);
    const unfilteredSubNodes = Array.from(unfilteredSubMap.values()).sort((a, b) => b.value - a.value);
    const unfilteredNaicsBreakdown = Array.from(unfilteredNaicsValueMap, ([k, v]) => {
        const p = k.split(' - ');
        return {
            code: p[0],
            desc: p.slice(1).join(' - ').trim() || 'No Description',
            value: v
        };
    }).sort((a, b) => b.value - a.value);

    // Get Filtered Data using the corrected function
    const dataToProcess = getFilteredTableData();

    // --- Process Filtered Data (Re-integrate SubAgency) ---
    const agencyMap = new Map(), 
          subAgencyMap = new Map(), 
          officeMap = new Map(), 
          primeMap = new Map(), 
          subMap = new Map();
          
    const agencyToSubMap = new Map(), 
          subToOfficeMap = new Map(), 
          officeToContractorMap = new Map(), 
          contractorToSubcontractorMap = new Map();

    let totalContractValue = 0;
    let totalPrimeContractsFiltered = new Set();
    let totalSubContractsFiltered = new Set();
    const uniquePrimeNamesFiltered = new Set();
    const uniqueSubNamesFiltered = new Set();
    const filteredNaicsValueMap = new Map();

    dataToProcess.forEach((row) => {
        const rawAgencyName = row['prime_award_awarding_agency_name']?.trim();
        const rawSubAgencyName = row['prime_award_awarding_sub_agency_name']?.trim();
        const rawOfficeName = row['prime_award_awarding_office_name']?.trim();
        const rawPrimeName = row['prime_awardee_name']?.trim();
        const rawSubName = isPrimeData ? null : row['subawardee_name']?.trim();

        const agencyName = rawAgencyName || 'Unknown Agency';
        const subAgencyName = rawSubAgencyName || 'Unknown Sub-Agency';
        const officeName = rawOfficeName || 'Unknown Office';
        const primeName = rawPrimeName || 'Unknown Prime Contractor';
        const subName = isPrimeData ? null : (rawSubName || 'Unknown Subcontractor');

        const contractValue = typeof row['subaward_amount'] === 'number' ? 
            row['subaward_amount'] : 
            parseFloat(String(row['subaward_amount'] || '0').replace(/[^0-9.-]+/g, '')) || 0;
            
        const primeValue = typeof row['prime_award_amount'] === 'number' ? 
            row['prime_award_amount'] : 
            parseFloat(String(row['prime_award_amount'] || '0').replace(/[^0-9.-]+/g, '')) || 0;
            
        const permalink = row['usaspending_permalink'] || '#';
        const naicsCode = row['prime_award_naics_code']?.toString().trim() || 'Unknown';
        const naicsDesc = row['prime_award_naics_description']?.trim() || 'Unknown Description';
        const popState = row['subaward_primary_place_of_performance_state_code'] ||
                         row['primary_place_of_performance_state_code'] ||
                         row['place_of_performance_state'] || 
                         row['pop_state'] || 
                         row['prime_award_pop_state'] || 
                         'Unknown';

        // Skip row if essential hierarchy is missing OR value is zero
        if (contractValue <= 0 || 
            agencyName === 'Unknown Agency' || 
            subAgencyName === 'Unknown Sub-Agency' || 
            officeName === 'Unknown Office' || 
            primeName === 'Unknown Prime Contractor' || 
            (subName === 'Unknown Subcontractor' && !isPrimeData)) return;

        // Stats Calculation - Adapt for prime vs subaward data
        totalContractValue += contractValue;
        totalPrimeContractsFiltered.add(`${primeName}|${officeName}`);
        
        if (!isPrimeData) {
            totalSubContractsFiltered.add(`${subName}|${primeName}`);
        }
        
        if (primeName !== 'Unknown Prime Contractor') {
            uniquePrimeNamesFiltered.add(primeName);
        }
        
        if (!isPrimeData && subName !== 'Unknown Subcontractor') {
            uniqueSubNamesFiltered.add(subName);
        }

        // Node Creation
        if (!agencyMap.has(agencyName)) {
            agencyMap.set(agencyName, {
                id: `agency-${agencyName}`,
                name: agencyName,
                type: 'agency',
                value: 0,
                acronym: extractAcronym(agencyName)
            });
        }
        agencyMap.get(agencyName).value += contractValue;
        const canonicalAgencyName = agencyMap.get(agencyName).name;

        if (subAgencyName !== 'Unknown Sub-Agency') {
            if (!subAgencyMap.has(subAgencyName)) {
                subAgencyMap.set(subAgencyName, {
                    id: `subagency-${subAgencyName}`,
                    name: subAgencyName,
                    type: 'subagency',
                    value: 0,
                    parent: canonicalAgencyName,
                    acronym: extractAcronym(subAgencyName)
                });
            }
            subAgencyMap.get(subAgencyName).value += contractValue;
        }
        const canonicalSubAgencyName = subAgencyMap.has(subAgencyName) ? 
                                       subAgencyMap.get(subAgencyName).name : 
                                       'Unknown Sub-Agency';

        if (officeName !== 'Unknown Office' && canonicalSubAgencyName !== 'Unknown Sub-Agency') {
            if (!officeMap.has(officeName)) {
                officeMap.set(officeName, {
                    id: `office-${officeName}`,
                    name: officeName,
                    type: 'office',
                    value: 0,
                    parent: canonicalSubAgencyName
                });
            }
            officeMap.get(officeName).value += contractValue;
        }
        const canonicalOfficeName = officeMap.has(officeName) ? 
                                    officeMap.get(officeName).name : 
                                    'Unknown Office';

        if (primeName !== 'Unknown Prime Contractor' && canonicalOfficeName !== 'Unknown Office') {
            if (!primeMap.has(primeName)) {
                primeMap.set(primeName, {
                    id: `prime-${primeName}`,
                    name: primeName,
                    type: 'prime',
                    value: 0,
                    parent: canonicalOfficeName,
                    popState: popState
                });
            }
            primeMap.get(primeName).value += contractValue;
        }
        const canonicalPrimeName = primeMap.has(primeName) ? 
                                   primeMap.get(primeName).name : 
                                   'Unknown Prime Contractor';

        // Only create sub nodes and contractor-to-subcontractor links for subaward data
        if (!isPrimeData && subName !== 'Unknown Subcontractor' && canonicalPrimeName !== 'Unknown Prime Contractor') {
            if (!subMap.has(subName)) {
                subMap.set(subName, {
                    id: `sub-${subName}`,
                    name: subName,
                    type: 'sub',
                    value: 0,
                    parent: canonicalPrimeName,
                    popState: popState
                });
            }
            subMap.get(subName).value += contractValue;
        }

        // Link Creation - Adjust for prime vs subaward data
        const agencyId = `agency-${canonicalAgencyName}`;
        const subAgencyId = subAgencyName !== 'Unknown Sub-Agency' ? 
                           `subagency-${canonicalSubAgencyName}` : null;
        const officeId = officeName !== 'Unknown Office' ? 
                         `office-${canonicalOfficeName}` : null;
        const primeId = primeName !== 'Unknown Prime Contractor' ? 
                        `prime-${canonicalPrimeName}` : null;
        const subId = !isPrimeData && subName !== 'Unknown Subcontractor' ? 
                      `sub-${subName}` : null;

        // Agency to SubAgency links
        if (agencyId && subAgencyId) {
            const k = `${agencyId}|${subAgencyId}`;
            if (!agencyToSubMap.has(k)) {
                agencyToSubMap.set(k, {
                    source: agencyId,
                    target: subAgencyId,
                    value: 0,
                    details: {
                        sourceType: 'agency',
                        targetType: 'subagency',
                        permalink
                    }
                });
            }
            agencyToSubMap.get(k).value += contractValue;
        }

        // SubAgency to Office links
        if (subAgencyId && officeId) {
            const k = `${subAgencyId}|${officeId}`;
            if (!subToOfficeMap.has(k)) {
                subToOfficeMap.set(k, {
                    source: subAgencyId,
                    target: officeId,
                    value: 0,
                    details: {
                        sourceType: 'subagency',
                        targetType: 'office',
                        permalink
                    }
                });
            }
            subToOfficeMap.get(k).value += contractValue;
        }

        // Office to Prime links
        if (officeId && primeId) {
            const k = `${officeId}|${primeId}`;
            if (!officeToContractorMap.has(k)) {
                officeToContractorMap.set(k, {
                    source: officeId,
                    target: primeId,
                    value: 0,
                    details: {
                        sourceType: 'office',
                        targetType: 'prime',
                        naicsCode,
                        naicsDesc,
                        permalink,
                        popState
                    }
                });
            }
            officeToContractorMap.get(k).value += contractValue;
        }

        // Prime to Sub links (only for subaward data)
        if (!isPrimeData && primeId && subId) {
            const k = `${primeId}|${subId}`;
            const pct = (primeValue > 0) ? 
                         ((contractValue / primeValue) * 100).toFixed(2) + '%' : 'N/A';
                         
            if (!contractorToSubcontractorMap.has(k)) {
                contractorToSubcontractorMap.set(k, {
                    source: primeId,
                    target: subId,
                    value: 0,
                    details: {
                        sourceType: 'prime',
                        targetType: 'sub',
                        naicsCode,
                        naicsDesc,
                        subValue: contractValue,
                        primeValue,
                        percentage: pct,
                        permalink,
                        popState
                    }
                });
            }
            contractorToSubcontractorMap.get(k).value += contractValue;
        }

        // Aggregate Filtered NAICS Data
        if (naicsCode && naicsCode !== 'Unknown' && naicsCode !== 'N/A' && naicsCode !== '') {
            const key = `${naicsCode} - ${naicsDesc}`;
            filteredNaicsValueMap.set(key, (filteredNaicsValueMap.get(key) || 0) + contractValue);
        }
    }); // End dataToProcess.forEach

    // Finalize Filtered NAICS Breakdown
    const filteredNaicsBreakdown = Array.from(filteredNaicsValueMap, ([k, v]) => {
        const p = k.split(' - ');
        return {
            code: p[0],
            desc: p.slice(1).join(' - ').trim() || 'No Description',
            value: v
        };
    }).sort((a, b) => b.value - a.value);
    
    let primaryNaics = { code: 'N/A', desc: '', value: 0 };
    if (filteredNaicsBreakdown.length > 0) {
        primaryNaics = filteredNaicsBreakdown[0];
    }

    // Store processed data
    processedData = {
        nodes: {
            agency: Array.from(agencyMap.values()),
            subagency: Array.from(subAgencyMap.values()).sort((a, b) => b.value - a.value),
            office: Array.from(officeMap.values()).sort((a, b) => b.value - a.value),
            prime: Array.from(primeMap.values()).sort((a, b) => b.value - a.value),
            sub: Array.from(subMap.values()).sort((a, b) => b.value - a.value)
        },
        links: {
            agencyToSub: Array.from(agencyToSubMap.values()),
            subToOffice: Array.from(subToOfficeMap.values()),
            officeToContractor: Array.from(officeToContractorMap.values()),
            contractorToSubcontractor: Array.from(contractorToSubcontractorMap.values())
        },
        stats: {
            totalContractValue,
            totalPrimeContracts: totalPrimeContractsFiltered.size,
            totalSubContracts: totalSubContractsFiltered.size,
            primaryNaics,
            filteredNaicsBreakdown,
            uniquePrimeContractorCount: uniquePrimeNamesFiltered.size,
            uniqueSubcontractorCount: uniqueSubNamesFiltered.size,
            isPrimeContractData: isPrimeData
        },
        unfilteredNodes: {
            prime: unfilteredPrimeNodes,
            sub: unfilteredSubNodes
        },
        unfilteredNaics: unfilteredNaicsBreakdown
    };

    // --- Update UI ---
    //console.log(`processData finished. Data type: ${isPrimeData ? 'Prime Contracts' : 'Subawards'}`);
    updateStatsDisplay();
    updateDataTable();
    
    // Update analysis tables
    displayTopNTable(processedData.unfilteredNodes.prime, 'top-primes-container', 'Top Prime Contractors', 10);
    
if (isPrimeData) {
    // For prime data, keep the heading but don't show a notification
    document.getElementById('top-subs-container').innerHTML = `
        <h3>Subcontractor Data</h3>
        <!-- Empty element to maintain spacing but hide notification -->
        <div style="height: 20px;"></div>
    `;
    
    // Alternative option: Hide the entire container
    // document.getElementById('top-subs-container').style.display = 'none';
} else {
    // For subaward data, display normal sub table
    displayTopNTable(processedData.unfilteredNodes.sub, 'top-subs-container', 'Top Subcontractors', 10);
}
    
    displayNaicsTable(processedData.unfilteredNaics, 'naics-container', 'Top NAICS Codes', 7);
    updateActiveFiltersDisplay();
    
    // Update expiring contracts if function exists
    if (typeof updateExpiringContracts === 'function') {
        updateExpiringContracts(rawData);
    } else {
        console.warn("updateExpiringContracts function not defined yet.");
    }
    
    // Generate and display insights
    const insights = generateInsights(processedData, allExpiringContracts, processedData.stats.totalContractValue);
    displayInsights(insights);
    
    // Update visualization
    if (currentVizType) {
        updateVisualization(currentVizType);
    } else {
        applyFiltersAndDraw();
    }
}
// Helper function to set up stats card tooltips
function setupStatsCardTooltips() {
//     console.log("Setting up stats card tooltips");
    const statsCards = document.querySelectorAll('.stats-card');
    const tooltip = d3.select('#tooltip');
    if (!tooltip.node()) {
        console.warn("Tooltip element #tooltip not found");
        return;
    }

    statsCards.forEach(card => {
        card.addEventListener('mouseover', function(event) {
            const cardTitleElement = this.querySelector('h4');
            const cardValueElement = this.querySelector('p'); // Try to find P tag
            const chartContainerElement = this.querySelector('.stats-chart-container'); // Check for chart container

            if (!cardTitleElement) return; // Skip if no title

            const cardType = cardTitleElement.textContent;
            let cardValueText = cardValueElement ? cardValueElement.textContent : ""; // Get text only if P exists
            let tooltipContent = `<h4>${cardType}</h4>`;

            // --- Specific Tooltip Content Logic ---
            // Add value only if it was found in a p tag (e.g., for Total Value card)
            if (cardValueElement && cardValueText) {
                 tooltipContent += `<p><strong>Value:</strong> ${cardValueText}</p>`;
            }

            // Add specific details based on card type if data is available
            if (processedData && processedData.stats) {
                if (cardType.includes('NAICS') && processedData.stats.primaryNaics && processedData.stats.primaryNaics.code !== 'N/A') {
                    const pNaics = processedData.stats.primaryNaics;
                    const totalValue = processedData.stats.totalContractValue || 0;
                    const percent = totalValue > 0 ? ((pNaics.value / totalValue) * 100).toFixed(1) : 0;
                    tooltipContent = `<h4>${pNaics.code} - ${pNaics.desc || 'Primary NAICS'}</h4>`; // More descriptive title
                    tooltipContent += `<p><strong>Value:</strong> ${formatCurrency(pNaics.value)} (${percent}%)</p>`;
                    // Add Top 2-3 NAICS for context in tooltip
                    if (processedData.stats.filteredNaicsBreakdown && processedData.stats.filteredNaicsBreakdown.length > 1) {
                         tooltipContent += `<p style="margin-top: 5px; border-top: 1px solid var(--color-outline-variant); padding-top: 5px;"><strong>Other Top NAICS:</strong><br/>`;
                         processedData.stats.filteredNaicsBreakdown.slice(1, 4).forEach(n => {
                             tooltipContent += `- ${n.code} (${formatCurrency(n.value)})<br/>`;
                         });
                         tooltipContent += `</p>`;
                    }

                } else if (cardType.includes('Prime') && processedData.nodes?.prime) {
                    tooltipContent = `<h4>${cardTitleElement.innerHTML}</h4>`; // Use innerHTML to get count
                    const topPrimes = processedData.nodes.prime.slice(0, 3);
                    if (topPrimes.length > 0) {
                        tooltipContent += `<p style="margin-top: 5px; border-top: 1px solid var(--color-outline-variant); padding-top: 5px;"><strong>Top by Value:</strong><br/>`;
                        topPrimes.forEach(p => {
                             tooltipContent += `- ${p.name} (${formatCurrency(p.value)})<br/>`;
                        });
                        tooltipContent += `</p>`;
                    }
                } else if (cardType.includes('Subcontractor') && processedData.nodes?.sub) {
                     tooltipContent = `<h4>${cardTitleElement.innerHTML}</h4>`; // Use innerHTML to get count
                     const topSubs = processedData.nodes.sub.slice(0, 3);
                    if (topSubs.length > 0) {
                        tooltipContent += `<p style="margin-top: 5px; border-top: 1px solid var(--color-outline-variant); padding-top: 5px;"><strong>Top by Value:</strong><br/>`;
                        topSubs.forEach(s => {
                             tooltipContent += `- ${s.name} (${formatCurrency(s.value)})<br/>`;
                        });
                         tooltipContent += `</p>`;
                    }
                }
                 // Add tooltip content for Total Value card if needed (already handled by initial value add)
                 // else if (cardType.includes('Total SubContract Value') && cardValueElement) {
                 //    // Optional: Add extra details for total value card if desired
                 // }

            }
            // --- End Specific Tooltip Content ---

            tooltip.html(tooltipContent).classed('visible', true).attr('aria-hidden', 'false');
            positionTooltip(tooltip, event); // Ensure this helper exists
        });
        card.addEventListener('mousemove', (event) => {
            // Check if tooltip should be visible before repositioning
            if (tooltip.classed('visible')) {
                 positionTooltip(tooltip, event);
            }
        });
        card.addEventListener('mouseout', () => {
             hideTooltip(); // Ensure this helper exists
        });
    });
}

// Updated version with proper handling of subaward and prime contract datasets
async function discoverAgencies() {
    console.log("Discovering agencies (including prime contract data)...");
    const agencySelector = document.getElementById('agency-selector');
    if (!agencySelector) return;
    agencySelector.innerHTML = '';

    // *** Define agencies in organized arrays ***
    const subawardAgencies = [
        // --- Department of Defense (DoD) ---
        { value: 'army',     label: 'Army' },
        { value: 'navy',     label: 'Navy' },
        { value: 'usmc',     label: 'Marine Corps' },
        { value: 'airforce', label: 'Air Force' },
        { value: 'dla',      label: 'DLA' },          // Defense Logistics Agency
        { value: 'disa',     label: 'DISA' },         // Defense Information Systems Agency
        { value: 'mda',      label: 'MDA' },          // Missile Defense Agency
        { value: 'socom',    label: 'USSOCOM' },      // Special Operations Command
        { value: 'uscc',     label: 'Cyber Command' },// US Cyber Command
        { value: 'md',       label: 'Maryland' },
        // --- Major Civilian Agencies ---
        { value: 'hhs',      label: 'HHS' },          // Health and Human Services
        { value: 'va',       label: 'VA' },           // Veterans Affairs
        { value: 'dhs',      label: 'DHS' },          // Homeland Security
        { value: 'cbp',      label: 'CBP' },          // Customs and Border Protection (under DHS)
        { value: 'treasury', label: 'Treasury' },
        { value: 'epa',      label: 'EPA' },
        { value: 'faa',      label: 'FAA' },
        { value: 'doj',      label: 'Dept of Justice' },
        { value: 'dol',      label: 'Dept of Labor' },
        { value: 'doc',      label: 'Dept of Commerce' },
        { value: 'doe',      label: 'Dept of Energy' },
        { value: 'ssa',      label: 'Social Security' },
        { value: 'dos',      label: 'Dept of State' },
        { value: 'dot',      label: 'Dept of Transportation' },
        { value: 'usda',     label: 'USDA' },         // Dept of Agriculture
        // --- Other Independent / Significant ---
        { value: 'gsa',      label: 'GSA' },          // General Services Administration
        { value: 'nasa',     label: 'NASA' }
    ];
    
    const primeAgencies = [
        { value: 'epa_primes', label: 'EPA - Prime Contracts' },
		{ value: 'dhs_primes', label: 'DHS - Prime Contracts' },
        // Add other prime contract datasets as they become available
    ];
    
    // Combine both types with group headers
    const allAgencies = [
        // Group header for subaward data
        { value: '', label: '--- Subaward Data ---', disabled: true },
        ...subawardAgencies,
        // Group header for prime contract data
        { value: '', label: '--- Prime Contracts (Huge Files!) ---', disabled: true },
        ...primeAgencies
    ];

    // Use the full defined list of all agencies
    if (allAgencies.length > 0) {
        allAgencies.forEach(agency => {
            const option = document.createElement('option');
            option.value = agency.value;
            option.textContent = agency.label;
            if (agency.disabled) {
                option.disabled = true;
            }
            agencySelector.appendChild(option);
        });

        // Find a valid initial agency (must have a value and not be disabled)
        const validAgencies = allAgencies.filter(a => a.value && !a.disabled);
        const initialAgency = validAgencies.find(a => a.value === currentAgency) ? 
            currentAgency : (validAgencies.length > 0 ? validAgencies[0].value : '');

        currentAgency = initialAgency; // Update global state 
        agencySelector.value = initialAgency; // Set dropdown value
        loadAgencyData(initialAgency);
    } else {
        console.error("No agencies available to populate dropdown.");
    }
}
// Show/Hide loading indicator
function showLoading() {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.style.display = 'flex';
        loader.setAttribute('aria-hidden', 'false');
    }
}

function hideLoading() {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.style.display = 'none';
        loader.setAttribute('aria-hidden', 'true');
    }
}

function getTopPerformanceStates(limit = 3) {
    if (!rawData || rawData.length === 0) return [];
    
    const isPrimeData = currentAgency && currentAgency.endsWith('_primes');
    const statePerformance = {};
    
    // Always use CHOROPLETH_MIN_VALUE for map-related functions
    rawData.forEach(row => {
        const contractValue = typeof row.subaward_amount === 'number' ? 
            row.subaward_amount : 
            parseFloat(String(row.subaward_amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
        
        // Use CHOROPLETH_MIN_VALUE here for map stats
        if (contractValue < CHOROPLETH_MIN_VALUE) return;
        
        // Handle both prime and subaward field mappings
        const stateCode = row.subaward_primary_place_of_performance_state_code || 
                          row.primary_place_of_performance_state_code ||
                          row.place_of_performance_state || 
                          row.pop_state || 
                          row.prime_award_pop_state;
                          
        if (!stateCode || stateCode.length !== 2) return;
        
        const stateKey = stateCode.toUpperCase();
        statePerformance[stateKey] = (statePerformance[stateKey] || 0) + contractValue;
    });
    
    const sortedStates = Object.entries(statePerformance)
        .map(([code, value]) => ({ code, name: getStateFullName(code), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
        
    return sortedStates;
}
function getTopContractorsForState(stateAbbr, limit = 3, type = 'all') {
    if (!rawData || rawData.length === 0) return [];
    
    // Check if we're displaying prime contract data
    const isPrimeData = currentAgency && currentAgency.endsWith('_primes');
    const contractors = {};

    rawData.forEach(row => {
        // Handle both prime and subaward field mappings for state code
        const popState = row.subaward_primary_place_of_performance_state_code || 
                         row.primary_place_of_performance_state_code ||
                         row.place_of_performance_state || 
                         row.pop_state || 
                         row.prime_award_pop_state;
                         
        // Ensure popState is valid and matches the target state
        if (!popState || typeof popState !== 'string' || popState.toUpperCase().trim() !== stateAbbr) return;

        const contractValue = typeof row.subaward_amount === 'number' ? 
            row.subaward_amount : 
            parseFloat(String(row.subaward_amount || '0').replace(/[^0-9.-]+/g, '')) || 0;

        // Apply current filters
        let includeRow = true;
        
        // Search Filter - Handle both data types
        if (currentSearchTerm) {
            const fields = [
                row['prime_award_awarding_agency_name'],
                row['prime_award_awarding_sub_agency_name'],
                row['prime_award_awarding_office_name'],
                row['prime_awardee_name'],
                isPrimeData ? null : row['subawardee_name'], // Only include for subaward data
                row['prime_award_naics_code']?.toString(),
                row['prime_award_naics_description']
            ].filter(Boolean); // Filter out null values
            
            if (!fields.some(field => field && typeof field === 'string' && field.toLowerCase().includes(currentSearchTerm))) {
                includeRow = false;
            }
        }

        // SubAgency Filter Check
        if (includeRow && currentSubAgencyFilter && row['prime_award_awarding_sub_agency_name'] !== currentSubAgencyFilter) {
            includeRow = false;
        }

        // Office Filter Check
        if (includeRow && currentOfficeFilter && row['prime_award_awarding_office_name'] !== currentOfficeFilter) {
            includeRow = false;
        }

        // NAICS Filter Check
        if (includeRow && currentNaicsFilter && row['prime_award_naics_code']?.toString() !== currentNaicsFilter) {
            includeRow = false;
        }

        // Prime Filter Check
        if (includeRow && currentPrimeFilter && row['prime_awardee_name'] !== currentPrimeFilter) {
            includeRow = false;
        }

        // Sub Filter Check - only apply for subaward data
        if (!isPrimeData && includeRow && currentSubFilter && row['subawardee_name'] !== currentSubFilter) {
            includeRow = false;
        }

        // Min Value Check (Use $0 for map helpers)
        if (contractValue <= 0) { // Exclude zero or negative
            includeRow = false;
        }

        if (!includeRow) return; // Skip row if any filter excludes it

        // Aggregate contractor values if row is included
        const primeContractor = row.prime_awardee_name?.trim() || 'Unknown Prime';
        
        // For prime data, we only have prime contractors
        const subContractor = isPrimeData ? null : (row.subawardee_name?.trim() || 'Unknown Sub');

        // Always process prime contractors
        if ((type === 'all' || type === 'prime') && primeContractor !== 'Unknown Prime') {
            contractors[primeContractor] = (contractors[primeContractor] || 0) + contractValue;
        }
        
        // Only process subcontractors for subaward data
        if (!isPrimeData && (type === 'all' || type === 'sub') && subContractor !== 'Unknown Sub') {
            contractors[subContractor] = (contractors[subContractor] || 0) + contractValue;
        }
    });

    // If requesting only sub contractors but this is prime data, return empty array
    if (isPrimeData && type === 'sub') {
        return [];
    }

    // Convert aggregated data to array, sort, and slice
    const sortedContractors = Object.entries(contractors)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
        
    return sortedContractors;
}

// --- Corrected displayTopNTable Function ---
function displayTopNTable(nodes, containerId, title, topN = 5) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container element not found: #${containerId}`);
        return;
    }
    
    const validNodes = Array.isArray(nodes) ? nodes : [];
    const topNodes = validNodes.slice(0, topN); 
    const agencyDisplayName = getAgencyDisplayName();
    let tableHTML = `<h3>${title} for ${agencyDisplayName}</h3>`;
    
    if (topNodes.length === 0) {
        tableHTML += `<p class="empty-message">No data available.</p>`;
    } else {
        const maxValue = topNodes.length > 0 ? topNodes[0].value : 1; 

        tableHTML += `<table class="analysis-table"><thead><tr><th>Rank</th><th>Name</th><th>Value</th><th class="relative-value-header">Relative Value</th></tr></thead><tbody>`; 
        
        topNodes.forEach((node, index) => {
            const percentage = maxValue > 0 ? Math.min(100, (node.value / maxValue) * 100) : 0; 
            
            tableHTML += `<tr>
                            <td>${index + 1}</td>
                            <td>${truncateText(node.name || 'N/A', 40)}</td>
                            <td>${formatCurrency(node.value || 0)}</td>
                            <td class="spark-bar-cell"> 
                                <div class="spark-bar" style="width: ${percentage}%;" title="${formatCurrency(node.value || 0)}"></div>
                            </td>
                          </tr>`;
        });
        tableHTML += `</tbody></table>`;
    }
    
    container.innerHTML = tableHTML;
}
// --- Corrected displayNaicsTable Function ---
function displayNaicsTable(naicsData, containerId, title, topN = 5) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container element not found: #${containerId}`);
        return;
    }
    
    const validNaics = Array.isArray(naicsData) ? naicsData : [];
    const topNaics = validNaics.slice(0, topN); 
    const agencyDisplayName = getAgencyDisplayName();
    let tableHTML = `<h3>${title} for ${agencyDisplayName}</h3>`;
    
    if (topNaics.length === 0) {
        tableHTML += `<p class="empty-message">No NAICS data available.</p>`;
    } else {
        const maxValue = topNaics.length > 0 ? topNaics[0].value : 1; 

        tableHTML += `<table class="analysis-table"><thead><tr><th>Rank</th><th>NAICS</th><th>Value</th><th class="relative-value-header">Relative Value</th></tr></thead><tbody>`;
        
        topNaics.forEach((item, index) => {
            const percentage = maxValue > 0 ? Math.min(100, (item.value / maxValue) * 100) : 0; 

            tableHTML += `<tr>
                            <td>${index + 1}</td>
 
                            <td>${item.code || 'N/A'}&nbsp;-&nbsp;${item.desc ? `<span class="naics-desc">${truncateText(item.desc, 60)}</span>` : ''}</td>
                            <td>${formatCurrency(item.value || 0)}</td>
                            <td class="spark-bar-cell">
                                <div class="spark-bar" style="width: ${percentage}%;" title="${formatCurrency(item.value || 0)}"></div>
                            </td>
                          </tr>`;
	    });
        tableHTML += `</tbody></table>`;
    }
    
    container.innerHTML = tableHTML;
}
/**
 * Aggregates expiring contract data by month for the next 6 months.
 * @param {Array} expiringContracts - The allExpiringContracts array.
 * @returns {Array} - Array of objects like [{month: 'Apr 2025', value: 12345}, ...]
 */
function aggregateExpiringValueByMonth(expiringContracts) {
    const monthlyTotals = new Map();
    const today = new Date();
    today.setDate(1); // Start from the beginning of the current month
    today.setHours(0, 0, 0, 0);

    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(today.getMonth() + 6);

    // Initialize map for the next 6 months
    for (let i = 0; i < 6; i++) {
        const monthDate = new Date(today);
        monthDate.setMonth(today.getMonth() + i);
        const monthKey = `${monthDate.toLocaleString('default', { month: 'short' })} ${monthDate.getFullYear()}`;
        monthlyTotals.set(monthKey, 0);
    }

    // Aggregate data
    expiringContracts.forEach(contract => {
        // Ensure endDate is a valid Date object
        if (contract.endDate instanceof Date && !isNaN(contract.endDate)) {
             // Only include contracts ending within the next 6 months (relative to start of current month)
             if(contract.endDate >= today && contract.endDate < sixMonthsLater) {
                const monthKey = `${contract.endDate.toLocaleString('default', { month: 'short' })} ${contract.endDate.getFullYear()}`;
                if (monthlyTotals.has(monthKey)) {
                    monthlyTotals.set(monthKey, monthlyTotals.get(monthKey) + contract.amount);
                }
                // Note: If a contract ends outside the explicit 6 months we initialized, it won't be added.
             }
        }
    });

    // Convert map to sorted array
    const sortedMonths = Array.from(monthlyTotals.keys()).sort((a, b) => {
         // Sort chronologically
         const dateA = new Date(a);
         const dateB = new Date(b);
         return dateA - dateB;
    });
    
    return sortedMonths.map(monthKey => ({
        month: monthKey,
        value: monthlyTotals.get(monthKey)
    }));
}
/**
 * Draws a bar chart for expiring contract value by month.
 * @param {Array} data - Aggregated data from aggregateExpiringValueByMonth.
 * Example: [{month: 'Apr 2025', value: 123}, ...]
 * @param {string} containerId - The ID of the div container for the chart.
 */
function drawExpiringValueByMonthChart(data, containerId) {
    const container = d3.select(`#${containerId}`);
    container.html(''); // Clear placeholder/previous chart

    if (!data || data.length === 0) {
        container.html('<span class="chart-placeholder" style="display: block; text-align: center; padding: 20px; font-style: italic;">No expiring contracts found in the next 6 months.</span>');
        return;
    }

    // --- Chart Setup ---
    const containerNode = container.node();
    if (!containerNode) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 70 }; // Adjusted margins
    const width = containerNode.clientWidth - margin.left - margin.right;
    // Use fixed height or calculate based on container
    const height = 200 - margin.top - margin.bottom; // Example fixed height calculation

     // Ensure positive dimensions
     if (width <= 0 || height <= 0) {
        console.warn(`Container #${containerId} too small for chart.`);
        container.html('<span class="chart-placeholder" style="display: block; text-align: center; padding: 10px;">Chart area too small</span>');
        return; // Stop if dimensions are invalid
    }

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Scales ---
    const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value) || 1]).nice() // Use nice() for better axis
        .range([height, 0]);

    // --- Axes ---
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => formatCurrencyWithSuffix(d)); // Use K/M/B suffix

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text") // Style axis text
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", ".15em")
          .attr("transform", "rotate(-30)")
          .style("font-size", "9px")
          .style("fill", "var(--color-on-surface-variant)");

    svg.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text") // Style axis text
            .style("font-size", "10px")
            .style("fill", "var(--color-on-surface-variant)");

    // Style axis lines and ticks (optional)
    svg.selectAll(".domain").attr("stroke", "var(--color-outline-variant)");
    svg.selectAll(".tick line").attr("stroke", "var(--color-outline-variant)");


    // --- Bars ---
    const tooltip = d3.select('#tooltip'); // Get tooltip element

    svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
          .attr("class", "bar")
          .attr("x", d => x(d.month))
          .attr("y", d => y(d.value))
          .attr("width", x.bandwidth())
          .attr("height", d => height - y(d.value))
          .attr("fill", "var(--app-accent-color)") // Use accent color
          .style("cursor", "pointer")
          .on('mouseover', function(event, d) {
              d3.select(this).attr('fill', 'var(--accent-dark)'); // Darker on hover
              if (tooltip.node()) {
                  tooltip.html(`<h4>${d.month}</h4><p>Expiring Value: <strong>${formatCurrency(d.value)}</strong></p>`)
                      .classed('visible', true)
                      .attr('aria-hidden', 'false');
                  positionTooltip(tooltip, event);
              }
          })
          .on('mousemove', function(event){
               if (tooltip.node() && tooltip.classed('visible')) {
                  positionTooltip(tooltip, event);
               }
          })
          .on('mouseout', function() {
              d3.select(this).attr('fill', 'var(--app-accent-color)'); // Back to original
              if (tooltip.node()) {
                  hideTooltip();
              }
          });
}


/**
 * Filters raw data for potentially expiring contracts above a threshold,
 * stores the full list, and triggers the initial display.
 * Uses potential end date and robust date parsing.
 * @param {Array} data - The raw, unfiltered data array (rawData).
 */
function updateExpiringContracts(data) {
    const container = document.getElementById('expiring-table-content');
    const loadMoreButton = document.getElementById('load-more-expiring');
    const exportButton = document.getElementById('export-expiring-csv');
	const expiringTitleElement = document.getElementById('expiring-title');
    if (expiringTitleElement) {
        const agencyDisplayName = getAgencyDisplayName(); 
        expiringTitleElement.textContent = `Expiring ${agencyDisplayName} Contracts`;
    } else {
        console.warn("Expiring contracts title element (#expiring-title) not found.");
    }
    
    // Ensure required elements exist
    if (!container || !loadMoreButton || !exportButton) {
        console.error("Expiring contracts UI elements not found. Cannot update list.");
        if (container) container.innerHTML = '<p class="empty-message">Error: UI element missing.</p>';
        return;
    }

//     console.log("Filtering potentially expiring contracts...");
    container.innerHTML = '<p class="empty-message">Checking data...</p>';
    loadMoreButton.style.display = 'none';
    exportButton.style.display = 'none';

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="empty-message">No contract data available.</p>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const thresholdDate = new Date();
    thresholdDate.setMonth(today.getMonth() + 6); // 6 months from now
    thresholdDate.setHours(23, 59, 59, 999); // End of the threshold day

    try {
        // Filter by date AND amount threshold
        allExpiringContracts = data.filter(row => {
            const potentialEndDateStr = row.prime_award_period_of_performance_potential_end_date;
            const amount = typeof row.subaward_amount === 'number' ? row.subaward_amount : 0;

            // --- Amount Check ---
            if (amount < expiringAmountThreshold) {
                return false;
            }
            // --- End Amount Check ---

            // --- Date Check ---
            if (!potentialEndDateStr || typeof potentialEndDateStr !== 'string') {
                return false;
            }

            // --- Improved Date Parsing ---
            let potentialEndDate;
            // 1. Prioritize YYYY-MM-DD
            if (potentialEndDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                potentialEndDate = new Date(potentialEndDateStr + 'T00:00:00'); // Add time part
            }
            // 2. Try MM/DD/YYYY (less reliable)
            else if (potentialEndDateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                 potentialEndDate = new Date(potentialEndDateStr);
            }
            // 3. Generic fallback
            else {
                 potentialEndDate = new Date(potentialEndDateStr);
            }

            // 4. ***Crucial Validity Check***
            if (isNaN(potentialEndDate)) {
                 return false; // Filter out rows with unparseable dates
            }

            // Check range
            return potentialEndDate >= today && potentialEndDate <= thresholdDate;
            // --- End Date Check ---

        }).map(row => {
            // --- Map Data - Parse date ONCE more carefully ---
            const potentialEndDateStr = row.prime_award_period_of_performance_potential_end_date;
            let finalEndDate;
            let formattedDateStr = 'Invalid Date';

            // Repeat parsing logic to ensure consistency
            if (potentialEndDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                finalEndDate = new Date(potentialEndDateStr + 'T00:00:00');
            } else if (potentialEndDateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                finalEndDate = new Date(potentialEndDateStr);
            } else {
                finalEndDate = new Date(potentialEndDateStr);
            }

            // Format ONLY if the date object is valid
            if (!isNaN(finalEndDate)) {
                formattedDateStr = finalEndDate.toLocaleDateString(); // Use locale format
            }

            // Return object with all needed fields
            return {
                prime: row.prime_awardee_name || 'N/A',
                sub: row.subawardee_name || 'N/A',
                amount: typeof row.subaward_amount === 'number' ? row.subaward_amount : 0,
                endDate: !isNaN(finalEndDate) ? finalEndDate : null, // Store valid Date object or null
                endDateStr: formattedDateStr, // Store formatted string
                agency: row.prime_award_awarding_agency_name || 'N/A',
                permalink: row.usaspending_permalink || '#',
                subAgency: row.prime_award_awarding_sub_agency_name || 'N/A',
                office: row.prime_award_awarding_office_name || 'N/A',
                naicsCode: row.prime_award_naics_code || 'N/A',
                subAwardDesc: row.subaward_description || 'N/A'
            };
        }).filter(item => item.endDate !== null) // Safety filter for any parsing fails in map
          .sort(compareValues(expiringSortKey, expiringSortDirection)); // Sort by initial/current sort key

		try {
      const monthlyData = aggregateExpiringValueByMonth(allExpiringContracts);
      drawExpiringValueByMonthChart(monthlyData, 'expiring-value-by-month-chart');
    } catch (chartError) {
        console.error("Error creating expiring value chart:", chartError);
        // Optionally display error in chart container
        d3.select('#expiring-value-by-month-chart')
            .html('<span class="chart-placeholder error">Could not load chart</span>');
    }
        displayedExpiringCount = 0; // Reset count before displaying
        container.innerHTML = ''; // Clear "Checking data..." message
        displayExpiringContracts(); // Call dedicated display function

        // --- Show/Hide Export button based on results ---
        if (allExpiringContracts.length > 0) {
             exportButton.style.display = 'inline-flex';
             exportButton.disabled = false;
        } else {
             exportButton.style.display = 'none';
             exportButton.disabled = true;
        }

    } catch (error) {
         console.error("Error processing expiring contracts:", error);
         container.innerHTML = '<p class="empty-message">Error processing expiring contracts data.</p>';
         exportButton.style.display = 'none'; // Hide export on error too
    }
}
// Defined globally or near display/load functions
const expiringTableColumns = [
    { key: 'endDateStr', header: 'Potential End', sortable: true, dataKey: 'endDate' },
    { key: 'subAgency', header: 'Sub Agency', sortable: true, truncate: 30 },      // Added truncate
    { key: 'office', header: 'Office', sortable: true, truncate: 30 },           // Added truncate
    { key: 'prime', header: 'Prime Contractor', sortable: true, truncate: 35 }, // Added truncate
    { key: 'sub', header: 'Subcontractor', sortable: true, truncate: 35 },    // Added truncate
    { key: 'amount', header: 'Sub Amount', sortable: true, align: 'right', format: 'currency' },
    { key: 'subAwardDesc', header: 'Sub Description', sortable: false, truncate: 50 }, // Added truncate
    { key: 'naicsCode', header: 'NAICS', sortable: true },
    { key: 'permalink', header: 'USAspending Link', sortable: false, align: 'center', format: 'link'}
];


/**
 * Displays the currently visible portion of expiring contracts in a sortable table
 * and manages the Load More button & Export button. Includes truncation.
 */
function displayExpiringContracts() {
    const container = document.getElementById('expiring-table-content');
    const loadMoreButton = document.getElementById('load-more-expiring');
    const exportButton = document.getElementById('export-expiring-csv');

    if (!container || !loadMoreButton || !exportButton) {
        console.error("Missing UI elements for displayExpiringContracts.");
        if (container) container.innerHTML = '<p class="empty-message">Error: UI element missing.</p>';
        return;
    }

    const countToShow = (displayedExpiringCount === 0) ? itemsPerLoad : displayedExpiringCount;
    const itemsToDisplay = allExpiringContracts.slice(0, countToShow);

    let tableHTML = '';

    if (itemsToDisplay.length === 0 && displayedExpiringCount === 0) {
         tableHTML = `<p class="empty-message">No contracts found potentially expiring > ${formatCurrency(expiringAmountThreshold)} in the next 6 months.</p>`;
         loadMoreButton.style.display = 'none';
         exportButton.style.display = 'none';
         exportButton.disabled = true;
         // displayedExpiringCount remains 0
    } else if (itemsToDisplay.length === 0 && displayedExpiringCount > 0) {
         console.warn("displayExpiringContracts called with 0 items to display but non-zero displayed count.");
         tableHTML = container.innerHTML; // Keep existing HTML
    } else {
        // Build Table HTML
        tableHTML = `<table class="expiring-contracts-table"><thead><tr>`;

        // Generate Headers using shared array
        expiringTableColumns.forEach(col => {
            let classes = '';
            let attrs = '';
            let headerContent = col.header;
            if (col.align) classes += ` align-${col.align}`;
            if (col.sortable) {
                classes += ' sortable';
                attrs += ` data-sort-key="${col.dataKey || col.key}"`;
                if ((col.dataKey || col.key) === expiringSortKey) {
                    classes += ` sorted-${expiringSortDirection}`;
                }
            }
            tableHTML += `<th class="${classes.trim()}" ${attrs}>${headerContent}</th>`;
        });

        tableHTML += `</tr></thead><tbody>`;

        // Generate Rows using shared array
        itemsToDisplay.forEach(item => {
            tableHTML += `<tr>`;
            expiringTableColumns.forEach(col => {
                let cellValue = item[col.key] ?? 'N/A';
                let cellClasses = col.align ? `align-${col.align}` : '';
                const originalValueTitle = (typeof item[col.key] === 'string' || typeof item[col.key] === 'number') ? `title="${String(item[col.key]).replace(/"/g, '&quot;')}"` : ''; // Get title before formatting/truncating

                // Apply formatting/truncation based on column definition
                if (col.format === 'currency') {
                    cellValue = formatCurrency(cellValue);
                    cellClasses += ' amount';
                } else if (col.format === 'link') {
                    const isValidLink = cellValue && cellValue !== '#' && typeof cellValue === 'string' && cellValue.startsWith('http');
                    cellValue = isValidLink ? `<a href="${cellValue}" class="detail-link" target="_blank" rel="noopener noreferrer" title="View on USAspending.gov">View</a>` : 'N/A';
                    cellClasses += ' align-center';
                } else {
                    // --- Apply Truncation ---
                    if (col.truncate && typeof truncateText === 'function') {
                        cellValue = truncateText(String(cellValue), col.truncate);
                    }
                    // --- End Truncation ---
                    cellClasses += ` cell-${col.key}`;
                }
                 tableHTML += `<td class="${cellClasses.trim()}" ${originalValueTitle}>${cellValue}</td>`;
            });
            tableHTML += `</tr>`;
        });

        tableHTML += `</tbody></table>`;

        // Update display count
        displayedExpiringCount = itemsToDisplay.length;

        // Manage Buttons
        if (allExpiringContracts.length > displayedExpiringCount) {
            loadMoreButton.textContent = `Load More (${allExpiringContracts.length - displayedExpiringCount} remaining)`;
            loadMoreButton.style.display = 'inline-flex';
            loadMoreButton.disabled = false;
        } else {
            loadMoreButton.style.display = 'none';
        }
        exportButton.style.display = 'inline-flex';
        exportButton.disabled = false;
    }

    // --- Update Display ---
    container.innerHTML = tableHTML;
    attachExpiringTableSortListener(); // Re-attach listener after modifying innerHTML
}

/**
 * Appends the next batch of expiring contracts to the table when "Load More" is clicked. Includes truncation.
 */
function loadMoreExpiringContracts() {
    const loadMoreButton = document.getElementById('load-more-expiring');
    const tableBody = document.querySelector('#expiring-table-content .expiring-contracts-table tbody');

    // Guard clauses
    if (!tableBody) {
        console.error("Cannot find expiring contracts table body to append rows.");
        if(loadMoreButton) loadMoreButton.style.display = 'none';
        return;
    }
    if (!loadMoreButton || allExpiringContracts.length <= displayedExpiringCount) {
        console.warn("Load More called, but no more items or button not found.");
        if(loadMoreButton) loadMoreButton.style.display = 'none';
        return;
    }

    loadMoreButton.disabled = true;
    loadMoreButton.textContent = 'Loading...';

    const currentItemCount = displayedExpiringCount; // Use the tracked count
    const nextLimit = currentItemCount + itemsToAdd;
    const itemsToAppend = allExpiringContracts.slice(currentItemCount, nextLimit);

    if (itemsToAppend.length === 0) {
//         console.log("No more items to append (slice returned empty).");
        loadMoreButton.style.display = 'none';
        loadMoreButton.disabled = false;
        return;
    }

    // Generate HTML table rows only for the new items
    const itemsToAddHTML = itemsToAppend.map(item => {
         // Use the shared expiringTableColumns array
         let rowHTML = `<tr>`;
         expiringTableColumns.forEach(col => {
             let cellValue = item[col.key] ?? 'N/A';
             let cellClasses = col.align ? `align-${col.align}` : '';
             const originalValueTitle = (typeof item[col.key] === 'string' || typeof item[col.key] === 'number') ? `title="${String(item[col.key]).replace(/"/g, '&quot;')}"` : ''; // Get title before formatting/truncating

             // Apply formatting/truncation based on column definition
             if (col.format === 'currency') {
                 cellValue = formatCurrency(cellValue);
                 cellClasses += ' amount';
             } else if (col.format === 'link') {
                 const isValidLink = cellValue && cellValue !== '#' && typeof cellValue === 'string' && cellValue.startsWith('http');
                 cellValue = isValidLink ? `<a href="${cellValue}" class="detail-link" target="_blank" rel="noopener noreferrer" title="View on USAspending.gov">View</a>` : 'N/A';
                 cellClasses += ' align-center';
             } else {
                  // --- Apply Truncation ---
                  if (col.truncate && typeof truncateText === 'function') {
                       cellValue = truncateText(String(cellValue), col.truncate);
                  }
                  // --- End Truncation ---
                  cellClasses += ` cell-${col.key}`;
             }
             rowHTML += `<td class="${cellClasses.trim()}" ${originalValueTitle}>${cellValue}</td>`;
         });
         rowHTML += `</tr>`;
         return rowHTML;
    }).join('');

    // Append new rows to the existing table body
    tableBody.insertAdjacentHTML('beforeend', itemsToAddHTML);

    // Update count based on the new total number of items expected to be shown
    displayedExpiringCount = Math.min(nextLimit, allExpiringContracts.length);

    // --- Manage Load More Button State After Loading ---
    if (allExpiringContracts.length > displayedExpiringCount) {
         loadMoreButton.textContent = `Load More (${allExpiringContracts.length - displayedExpiringCount} remaining)`;
         loadMoreButton.disabled = false; // Re-enable
    } else {
         loadMoreButton.style.display = 'none'; // Hide button if all loaded
    }
}
/**
 * Handles clicks on the expiring contracts table headers for sorting.
 * Uses event delegation.
 */
function handleExpiringHeaderClick(event) {
    const header = event.target.closest('th.sortable'); // Find clicked sortable header
    if (!header) return; // Exit if click wasn't on a sortable header

    const key = header.dataset.sortKey; // Get the sort key from data attribute
    if (!key) return;

//     console.log(`Expiring Table Sort: Clicked on ${key}`);

    if (expiringSortKey === key) {
        // Toggle direction if same key clicked
        expiringSortDirection = expiringSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Change key, default to ascending
        expiringSortKey = key;
        expiringSortDirection = 'asc';
    }
//     console.log(`Expiring Table New Sort: key=${expiringSortKey}, direction=${expiringSortDirection}`);

    // Re-sort the *full* list of contracts
    allExpiringContracts.sort(compareValues(expiringSortKey, expiringSortDirection));

    // Reset displayed count and re-render the table from the beginning
    displayedExpiringCount = 0; // Reset to show initial page size after sort
    displayExpiringContracts(); // Re-render the table
}

/**
 * Attaches the sort listener to the expiring table container using event delegation.
 * Should be called after the table HTML is inserted into the DOM.
 */
function attachExpiringTableSortListener() {
    const container = document.getElementById('expiring-table-content');
    if (!container) return;

    // Remove previous listener to avoid duplicates if re-rendering often
    container.removeEventListener('click', handleExpiringHeaderClick);
    // Add new listener
    container.addEventListener('click', handleExpiringHeaderClick);
//     console.log("Attached expiring table sort listener.");
}
/**
 * Exports the currently filtered list of all expiring contracts to a CSV file,
 * including Agency and other relevant columns with updated headers.
 * @param {Array} data - The raw, unfiltered data array (rawData).
 */
function exportExpiringContractsCSV() {
    // Use the globally stored list of all expiring contracts that meet criteria
    if (!allExpiringContracts || allExpiringContracts.length === 0) {
        showNotification("No expiring contracts data to export.", "warning");
        return;
    }

//     console.log(`Exporting ${allExpiringContracts.length} expiring contracts to CSV.`);

    // --- Define columns and headers for the CSV export ---
    // Updated to include Agency again and match desired order
    const exportColumns = [
        { key: 'endDateStr', header: 'Potential End Date' },
        { key: 'agency', header: 'Awarding Agency' },           // <<< ADDED BACK
        { key: 'subAgency', header: 'Awarding Sub Agency' },
        { key: 'office', header: 'Awarding Office' },
        { key: 'prime', header: 'Prime Contractor Name' },
        { key: 'sub', header: 'Subcontractor Name' },        // Updated Header
        { key: 'amount', header: 'Subaward Amount' },
        { key: 'subAwardDesc', header: 'Subaward Description' },
        { key: 'naicsCode', header: 'NAICS Code' },
        { key: 'permalink', header: 'USAspending Link' }     // Updated Header
    ];
    // --- End Column Definition ---

    // Helper function to escape CSV fields correctly
    const escapeCSV = (field) => {
        if (field === null || field === undefined) return '';
        const string = String(field);
        // Quote fields containing quotes, commas, or newlines
        if (string.includes('"') || string.includes(',') || string.includes('\n')) {
            return `"${string.replace(/"/g, '""')}"`;
        }
        return string;
    };

    // Create header row
    const headerRow = exportColumns.map(col => escapeCSV(col.header)).join(',');

    // Create data rows using the FULL allExpiringContracts list
    const dataRows = allExpiringContracts.map(item => {
        // Map data item properties to the columns defined above
        return exportColumns.map(col => {
            // Use the correct key to get data from the item object
            let value = item[col.key];
            // Special handling for amount (export raw number)
            if (col.key === 'amount' && typeof value === 'number') {
                return value;
            }
            return escapeCSV(value); // Escape other fields
        }).join(',');
    });

    // Combine header and data rows
    const csvContent = [headerRow, ...dataRows].join('\n');

    // Create and trigger download link
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    link.setAttribute('href', url);
    // Update filename if desired
    link.setAttribute('download', `expiring_contracts_${currentAgency}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up blob URL

//     console.log(`CSV export initiated for expiring contracts.`);
    showNotification('Expiring contracts CSV export started.', 'info');
}
// Helper function to show a notification
function showNotification(message, type = 'info') {
    let c = document.getElementById('notification-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'notification-container';
        Object.assign(c.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '1000',
            maxWidth: '90vw'
        });
        document.body.appendChild(c);
    }
    
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `<div class="notification-content">${message}</div><button class="notification-close" aria-label="Dismiss">&times;</button>`;
    Object.assign(n.style, {
        backgroundColor: type === 'error' ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-primary-container)',
        color: type === 'error' ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-on-primary-container)',
        padding: '10px 16px',
        marginBottom: '10px',
        borderRadius: '8px',
        boxShadow: 'var(--md-sys-elevation-2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        animation: 'notification-slide-in 0.3s ease forwards',
        opacity: '0',
        transform: 'translateX(20px)'
    });
    
    const b = n.querySelector('.notification-close');
    Object.assign(b.style, {
        background: 'none',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        marginLeft: '10px',
        opacity: '0.7'
    });
    
    const close = () => {
        n.style.animation = 'notification-slide-out 0.3s ease forwards';
        setTimeout(() => n.remove(), 300);
    };
    
    b.addEventListener('click', close);
    
    if (type !== 'error') {
        setTimeout(() => {
            if (n.parentNode) close();
        }, 5000);
    }
    
    c.appendChild(n);
    
    setTimeout(() => {
        n.style.opacity = '1';
        n.style.transform = 'translateX(0)';
    }, 10);
    
    if (!document.getElementById('notification-keyframes')) {
        const s = document.createElement('style');
        s.id = 'notification-keyframes';
        s.textContent = `
            @keyframes notification-slide-in {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes notification-slide-out {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(20px); }
            }
        `;
        document.head.appendChild(s);
    }
}

/* Utility Functions */


// Helper function to format currency with K/M suffix

// Helper function to format currency with K/M/B suffix
function formatCurrencyWithSuffix(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        // Try converting if it's a string-like number
        try {
            const cleanedValue = String(value).replace(/[^\d.-]+/g, ''); // Allow negative sign and decimal
            value = parseFloat(cleanedValue);
            if (isNaN(value)) return '$0'; // Failed conversion
        } catch(e) {
            return '$0'; // Error during conversion
        }
    }

    if (Math.abs(value) >= 1000000000) {
        return `$${(value / 1000000000).toFixed(2)}B`; // Two decimal places for billions
    } else if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`; // One decimal place for millions
    } else if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`; // No decimal places for thousands
    } else {
        // Format values less than 1000 or negative values close to 0
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }
}





// Helper function to format currency
function formatCurrency(value) { 
    if (typeof value !== 'number' || isNaN(value)) return '$?'; 
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    }).format(value); 
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) { 
    if (!string || typeof string !== 'string') return ''; 
    return string.charAt(0).toUpperCase() + string.slice(1); 
}

// Truncate text helper
function truncateText(text, maxLength) { 
    if (!text) return ''; 
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text; 
}

/** Attempts to extract an acronym (e.g., "DHS") */
function extractAcronym(nameString) { 
    if (!nameString || typeof nameString !== 'string') return null; 
    const acronymMatch = nameString.match(/\(([A-Z]{2,})\)$/); 
    return (acronymMatch && acronymMatch[1]) ? acronymMatch[1] : null; 
}

// Get State Full Name
function getStateFullName(abbr) { 
    const stateNames = { 
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 
        'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 
        'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 
        'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 
        'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 
        'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
        'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
        'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
        'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
        'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
        'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
        'PR': 'Puerto Rico', 'VI': 'Virgin Islands', 'GU': 'Guam',
        'AS': 'American Samoa', 'MP': 'Northern Mariana Islands'
    };
    return stateNames[abbr] || abbr;
}

// Gets the display name (label) of the currently selected agency
function getAgencyDisplayName() {
    const selector = document.getElementById('agency-selector');
    if (!selector) return currentAgency ? currentAgency.toUpperCase() : 'N/A';
    const selectedOption = selector.options[selector.selectedIndex];
    if (selectedOption) return selectedOption.textContent;
    return currentAgency ? currentAgency.toUpperCase() : 'N/A';
}

/**
 * Creates a comparison function for Array.sort(), handling dates, numbers, and strings.
 * @param {string} key - The property key to sort by.
 * @param {string} [direction='asc'] - Sort direction ('asc' or 'desc').
 * @returns {function} - The comparison function for use with sort().
 */
function compareValues(key, direction = 'asc') {
    return function innerSort(a, b) {
        // Get values safely, handling potential missing properties
        const valA = a.hasOwnProperty(key) ? a[key] : null;
        const valB = b.hasOwnProperty(key) ? b[key] : null;

        let comparison = 0;

        // Handle null/undefined values (push them to the end typically)
        if (valA === null || valA === undefined) comparison = (valB === null || valB === undefined) ? 0 : 1;
        else if (valB === null || valB === undefined) comparison = -1;

        // --- Specific Type Handling ---
        // 1. Date Objects (check if the key is 'endDate' or if value is a Date instance)
        else if (key === 'endDate' || (valA instanceof Date && valB instanceof Date)) {
             // Ensure both are valid dates before comparing getTime()
             const timeA = !isNaN(valA) ? valA.getTime() : null;
             const timeB = !isNaN(valB) ? valB.getTime() : null;

             if (timeA === null && timeB === null) comparison = 0;
             else if (timeA === null) comparison = 1; // Put invalid dates after valid ones
             else if (timeB === null) comparison = -1;
             else comparison = timeA - timeB; // Correct chronological comparison
        }
        // 2. Numbers (check for specific keys OR if types are number)
        else if (key === 'subaward_amount' || key === 'amount' || (typeof valA === 'number' && typeof valB === 'number')) {
            // Explicitly handle numeric comparison
            const numA = Number(valA); // Convert just in case
            const numB = Number(valB);
            if (isNaN(numA) && isNaN(numB)) comparison = 0;
            else if (isNaN(numA)) comparison = 1; // Put NaN after numbers
            else if (isNaN(numB)) comparison = -1;
            else comparison = numA - numB; // Correct numerical comparison
        }
        // 3. Strings (Fallback)
        else {
            comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
        }
        // --- End Specific Type Handling ---

        // Apply direction
        return (direction === 'desc' ? (comparison * -1) : comparison);
    };
}
// Handles clicking on a table header to change sorting
function handleHeaderClick(key) {
    if (!key) return;
//     console.log(`Header click: Sorting by ${key}`);
    
    if (tableSortKey === key) {
        tableSortDirection = tableSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        tableSortKey = key;
        tableSortDirection = 'asc';
    }
    
//     console.log(`New sort state: key=${tableSortKey}, direction=${tableSortDirection}`);
    updateDataTable();
}

// Utility functions for device detection
function isMobileDevice() {
    return window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}
/**
 * Draws a Donut chart for Top N NAICS + Other.
 * - Shows external labels/lines.
 * - Shows small "Top NAICS [Code]" text in the center.
 * - Disables tooltips on donut slices.
 * @param {Array} naicsData - Array of {code, desc, value} objects, sorted descending.
 * @param {string} containerId - The ID of the div container for the chart.
 * @param {number} topN - Number of top categories to show separately.
 */
function drawNaicsDonut(naicsData, containerId, topN = 5) {
    const container = d3.select(`#${containerId}`);
    container.html(''); // Clear previous content

    // --- Basic Data Check ---
    if (!naicsData || !Array.isArray(naicsData)) {
        console.warn("drawNaicsDonut: Invalid naicsData input", naicsData);
        container.html('<span class="chart-placeholder">Invalid data</span>');
        return;
    }
     if (naicsData.length === 0) {
        container.html('<span class="chart-placeholder">No NAICS data</span>');
        return;
    }

    // --- Prepare Data: Top N + Other ---
    const topNData = naicsData.slice(0, topN);
    const otherValue = d3.sum(naicsData.slice(topN), d => d.value);
    const chartData = [...topNData];
    let hasOther = false;
    if (otherValue > 0) {
        chartData.push({ code: "Other", desc: "All Other NAICS Codes", value: otherValue });
        hasOther = true;
    }
    // Get data for the top slice for center text (assumes input is sorted)
    const topSliceData = naicsData[0];

    if (chartData.length === 1 && hasOther) { container.html('<span class="chart-placeholder">Value primarily in "Other" NAICS</span>'); return; }
    if (chartData.length === 0 || !topSliceData) { container.html('<span class="chart-placeholder">No Top NAICS data</span>'); return; }


// --- Chart Setup ---
    const containerNode = container.node();
    if (!containerNode) {
        console.error(`drawNaicsDonut: Container node #${containerId} not found.`);
        return;
    }
    const width = containerNode.clientWidth;
    // Use a fixed minimum or the CSS height as fallback. Let's use 130px consistent with CSS.
    const height = Math.max(130, containerNode.clientHeight || 130);
    // ***** CHANGE HERE *****
    const margin = 5; // Reduced margin allows for larger radius (Default was 20)
    // *********************
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.68; // Adjust thickness (0.55 means hole is 55% of radius)

    // Check if dimensions are valid after margin adjustment
    if (width <= 0 || height <= 0 || radius <= 10) { // Added height check
        console.warn(`Container #${containerId} too small or zero dimensions. Width: ${width}, Height: ${height}, Radius: ${radius}`);
        // Ensure container has *some* height even if chart doesn't draw
        container.style('height', '130px'); // Set fallback height based on CSS expectation
        container.html('<span class="chart-placeholder">Chart area too small</span>');
        return;
    }
    // Explicitly set the container height like in the bar chart function
container.style('height', `${height}px`);

    // Append the SVG element ONCE, apply styles/attributes
    const svgElement = container.append("svg")      // Append the <svg>
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "hidden");               // Apply overflow hidden here

    // Append the main <g> group to the svgElement, and store it in the 'svg' variable
    const svg = svgElement.append("g")              // Append <g> to the SVG we just created
        .attr("transform", `translate(${width / 2},${height / 2})`); // Apply transform to the group

    const donutColors = monochromaticPurpleScale.range();
	const color = d3.scaleOrdinal(donutColors);

    const pie = d3.pie()
        .padAngle(0.005)
        .value(d => d.value)
        .sort(null); // Respect data order (Top N first)

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius);

    // Arc for label positioning calculation
    const outerArc = d3.arc()
        .innerRadius(radius * 0.9) // Position lines relative to new radius
        .outerRadius(radius * 0.9);
		
    // --- Draw Arcs ---
    const arcs = svg.selectAll(".arc-path")
        .data(pie(chartData))
        .join("path")
          .attr("class", "arc-path")
          .attr("fill", (d, i) => color(i % donutColors.length))
          .attr("d", arc)
          .attr("stroke", "var(--color-surface)")
          .style("stroke-width", "1px");
          // .style("cursor", "pointer"); // Cursor removed as hover is disabled

    // --- Tooltips on Arcs DISABLED ---
    // arcs.on('mouseover', function(event, d) { ... })
    // .on('mouseout', function() { ... });

    // --- Add Center Text ---
    const centerText = svg.append("text")
        .attr("text-anchor", "middle")
        .style("font-family", "var(--font-primary)")
        .style("fill", "var(--color-on-surface)")
        .attr("dy", "-0.3em"); // Adjust vertical centering slightly

    centerText.append("tspan")
        .attr("x", 0)
        .attr("dy", 0)
        .style("font-size", "0.8em") // Smaller label text
        .style("fill", "var(--color-on-surface-variant)")
        .text("Top NAICS");

    centerText.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.2em")
        .style("font-size", "0.9em") // Smaller code text
        .style("font-weight", "600")
        .text(topSliceData.code); // Use the code from the top slice data

    if (window.innerWidth > 600) {
        // Only draw lines and external labels if NOT on mobile

        const labelThreshold = 0.07; // Slices smaller than 7% won't get labels
        const labelData = pie(chartData).filter(d => (d.endAngle - d.startAngle) / (2 * Math.PI) > labelThreshold);

        if (labelData.length > 0) {
            const labelGroup = svg.append("g").attr("class", "labels");
            const lineGroup = svg.append("g").attr("class", "lines");
            const smallDescStyle = "font-size: 0.85em; fill: var(--color-on-surface-variant);";

            // Draw Polylines
            lineGroup.selectAll('polyline')
                .data(labelData)
                .join('polyline')
                  .attr('stroke', 'var(--color-on-surface-variant, #999)')
                  .style('fill', 'none')
                  .attr('stroke-width', 1)
                  .attr('points', d => {
                      const posA = arc.centroid(d);
                      const posB = outerArc.centroid(d);
                      const posC = outerArc.centroid(d);
                      const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                      posC[0] = (radius + 5) * (midangle < Math.PI ? 1 : -1);
                      return [posA, posB, posC];
                   });

            // Draw Text Labels (Code + Description)
            const textLabels = labelGroup.selectAll('text')
                .data(labelData)
                .join('text')
                  .attr('transform', d => {
                      const pos = outerArc.centroid(d);
                      const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                      pos[0] = (radius + 10) * (midangle < Math.PI ? 1 : -1);
                      return `translate(${pos})`;
                   })
                  .style('text-anchor', d => {
                      const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                      return (midangle < Math.PI ? 'start' : 'end');
                   })
                  .style('font-size', '10px')
                  .style('fill', 'var(--color-on-surface)')
                  .attr('dy', '-0.3em');

            // Add NAICS Code tspan
            textLabels.append('tspan')
                .attr('x', 0)
                .text(d => d.data.code);

            // Add Description tspan (if not "Other")
            textLabels.filter(d => d.data.code !== "Other")
                .append('tspan')
                  .attr('x', 0)
                  .attr('dy', '1.1em')
                  .attr('style', smallDescStyle)
                  .text(d => truncateText(d.data.desc, 20));

        } // End: if (labelData.length > 0)

    } else {
        // Fallback handled by center text
	}
}

/**
 * Draws a Horizontal Bar chart for Top N items, adjusting margin for labels.
 * @param {Array} nodesData - Array of {name, value} objects, sorted descending.
 * @param {string} containerId - The ID of the div container for the chart.
 * @param {string} countLabelId - The ID of the h4 element to update with the count.
 * @param {number} totalCount - The total count to display in the title.
 * @param {string} entityType - Type of entity ('prime' or 'sub') for title text.
 * @param {number} topN - Number of top items to show.
 */
function drawTopNBarChart(nodesData, containerId, countLabelId, totalCount, entityType, topN = 5) {
    const container = d3.select(`#${containerId}`);
    container.html(''); // Clear previous chart/placeholder
    const countLabel = document.getElementById(countLabelId); // Get the H4 element

    // --- Update the card title (H4 element) ---
    if (countLabel) {
        if (entityType === 'prime') {
            // Construct label text specifically for prime
            const labelText = totalCount === 1 ? 'Prime w/ Subs' : 'Primes w/ Subs';
            // Set Prime title
            countLabel.innerHTML = `${totalCount.toLocaleString()} ${labelText}`;
        } else if (entityType === 'sub') {
            // Set Sub title directly
            countLabel.innerHTML = `${totalCount.toLocaleString()} Total Subs`;
        } else {
             // Fallback title
            const labelText = 'Items'; // Define fallback label text here
            countLabel.innerHTML = `${totalCount.toLocaleString()} ${labelText}`;
        }
    }

    // --- Handle No Data Case ---
    if (!nodesData || nodesData.length === 0) {
        container.html('<span class="chart-placeholder">No data</span>');
        // Update title to show 0 count (or appropriate text) even if no data for chart
        if (countLabel) {
             if (entityType === 'prime') {
                 // Set Prime title for 0 count
                 countLabel.innerHTML = `0 Primes w/ Subs`;
             } else if (entityType === 'sub') {
                 // Set Sub title consistently
                 countLabel.innerHTML = `Total Subs`;
             } else {
                  // Fallback title for 0 count
                  countLabel.innerHTML = `0 Items`;
             }
        }
        return; // Exit the function early if no data
    }

    const chartData = nodesData.slice(0, topN);

   // --- Bar Chart Setup ---
const containerNode = container.node();
 if (!containerNode) return;

 const marginTop = 5;
 const marginRight = 10;
 const marginBottom = 5; // No X-axis needed for bars
 const defaultBarHeight = 18; // Bar height
 const minChartHeight = 60;
 // Define a fixed margin for where the bars should start, leaving space for labels
 const fixedBarStartMargin = 85; // Space for labels + gap (Adjustable)

 const width = containerNode.clientWidth;
 let height = Math.max(minChartHeight, chartData.length * defaultBarHeight + marginTop + marginBottom);

 // --- Dynamic Margin Calculation REMOVED ---
 // const initialMarginLeft = 80;
 // let marginLeft = initialMarginLeft;
 // const labelPadding = 5;
 // const tempSvg = d3.select("body").append("svg")... etc ...
 // marginLeft = Math.min(width * 0.5, Math.max(initialMarginLeft, maxLabelWidth + labelPadding));
 // console.log(`Adjusted marginLeft for ${containerId} to: ${marginLeft}`);

 // Set final container height
 container.style('height', `${height}px`);

 // --- Create Final SVG ---
 const svg = container.append("svg")
     .attr("width", width)
     .attr("height", height)
     .attr("viewBox", [0, 0, width, height]);

 // --- Scales ---
 // Adjust X range based on the FIXED margin
 const x = d3.scaleLinear()
     .domain([0, d3.max(chartData, d => d.value) || 1]).nice()
     // Use the fixed margin for the start of the range
     .range([fixedBarStartMargin, width - marginRight]);

 const y = d3.scaleBand()
     .domain(chartData.map(d => d.name))
     .range([marginTop, height - marginBottom])
     .padding(0.15);

 // --- Draw Bars ---
 svg.append("g")
     .attr("fill", "var(--app-accent-color)")
   .selectAll("rect")
   .data(chartData)
   .join("rect")
     // Bars now start relative to the fixed margin via the scale
     .attr("x", x(0))
     .attr("y", d => y(d.name))
     .attr("width", d => Math.max(0, x(d.value) - x(0))) // Width calculation is correct
     .attr("height", y.bandwidth())
     .style("cursor", "pointer")
     .on('mouseover', function(event, d) {
         const tooltip = d3.select('#tooltip');
         // Use formatCurrency for the tooltip value display
         let content = `<h4>${d.name}</h4><p><strong>Value:</strong> ${formatCurrency(d.value)}</p>`;
         tooltip.html(content).classed('visible', true).attr('aria-hidden', 'false');
         positionTooltip(tooltip, event);
         d3.select(this).attr('fill', 'var(--primary-dark)'); // Use appropriate hover color
     })
     .on('mouseout', function() {
         hideTooltip();
         d3.select(this).attr('fill', 'var(--app-accent-color)');
     });

 // --- Draw Y-axis Labels (Company Names) ---
 svg.append("g")
     .attr("class", "y-axis-labels")
     .style("font-size", "10px")
      // Position labels near left edge
     .attr("transform", `translate(5, 0)`) // Start labels 5px from left
   .selectAll("text")
   .data(chartData)
   .join("text")
     .attr("x", 0) // x=0 within the translated group
     .attr("y", d => y(d.name) + y.bandwidth() / 2) // Center vertically
     .attr("dy", "0.35em")
     .attr("text-anchor", "start") // Left-align text
     .style("fill", "var(--color-on-surface)")
     // Truncate text to 8 characters
     .text(d => truncateText(d.name, 12))
     .style("cursor", "default")
     .append("title") // Add full name on hover
       .text(d => d.name);
}
/**
 * Adapts prime contract data to the expected subaward data format
 * @param {Array} primeData - Raw data from the prime contracts CSV
 * @returns {Array} - Adapted data matching the expected subaward schema
 */
function adaptPrimeContractData(primeData) {
    if (!primeData || !Array.isArray(primeData)) {
        console.error("Invalid prime contract data provided");
        return [];
    }
    
    return primeData.map(row => {
        // For each prime contract, create an adapted record
        return {
            // Direct field mappings
            prime_awardee_name: row.recipient_name || 'Unknown Prime Contractor',
            prime_award_awarding_agency_name: row.awarding_agency_name || 'Unknown Agency',
            prime_award_awarding_sub_agency_name: row.awarding_sub_agency_name || 'Unknown Sub-Agency',
            prime_award_awarding_office_name: row.awarding_office_name || 'Unknown Office',
            prime_award_naics_code: row.naics_code || 'Unknown',
            prime_award_naics_description: row.naics_description || 'Unknown',
            prime_award_period_of_performance_potential_end_date: row.period_of_performance_current_end_date || null,
            
            // Specially handled fields
            subawardee_name: null, // Prime data doesn't have subcontractors
            subaward_amount: row.current_total_value_of_award || 0,
            subaward_primary_place_of_performance_state_code: row.primary_place_of_performance_state_code || 'Unknown',
            subaward_place_of_performance_cd_current: row.prime_award_transaction_place_of_performance_cd_current || 'Unknown',
            usaspending_permalink: row.usaspending_permalink || '#',
            
            // Derived fields
            subaward_description: row.transaction_description || row.prime_award_base_transaction_description || 'No description available',
            subawardee_business_types: 'Prime Contract', // Flag to indicate this is a prime
            
            // Add a field to distinguish prime contracts from subawards
            is_prime_contract: true
        };
    });
}