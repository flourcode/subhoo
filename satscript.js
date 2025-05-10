// app.js - New API-Driven Version
document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const USASPENDING_API_BASE_URL = 'https://api.usaspending.gov';

    // (FIELD_MAP will likely change or be less relevant as API responses are structured JSON, not flat CSV rows)
    // const FIELD_MAP = { ... }; // You'll map from API JSON fields instead

    // --- DOM ELEMENTS ---
    const agencySelectEl = document.getElementById('dataset-select'); // Assuming you rename this or use a new ID
    const searchInput = document.getElementById('search-input');
    const subAgencyFilterEl = document.getElementById('sub-agency-filter');
    const naicsFilterEl = document.getElementById('naics-filter');
    const applyFiltersBtn = document.getElementById('apply-filters-btn'); // Or a "Load Agency" button
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const statusBanner = document.getElementById('status-banner');
    const dashboardContainer = document.getElementById('dashboard-container');
    if(document.getElementById('current-year')) {
        document.getElementById('current-year').textContent = new Date().getFullYear();
    }


    // --- GLOBAL STATE ---
    let unifiedModel = null; // This will be built from API responses
    let chartInstances = {};
    let isLoading = false;
    let availableAgencies = []; // To store {name, toptier_code}

    // --- UTILITY FUNCTIONS ---
    // (Keep your existing parseSafeFloat, parseDate, calculateDurationDays, formatCurrencyShort, truncateText, getCssVar)
    function formatCurrencyShort(value, defaultIfNaN = '$0') {
        if (value === null || value === undefined) return defaultIfNaN;
        const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : Number(value);
        if (isNaN(numValue)) return defaultIfNaN;
        if (Math.abs(numValue) >= 1.0e+9) return `$${(numValue / 1.0e+9).toFixed(1)}B`;
        if (Math.abs(numValue) >= 1.0e+6) return `$${(numValue / 1.0e+6).toFixed(1)}M`;
        if (Math.abs(numValue) >= 1.0e+3) return `$${(numValue / 1.0e+3).toFixed(0)}K`;
        return `$${numValue.toFixed(0)}`;
    }
    // ... include other necessary utility functions ...

    // --- API SERVICE ---
    async function fetchUSAspendingData(endpoint, options = {}, isPost = false, body = null) {
        const url = `${USASPENDING_API_BASE_URL}${endpoint}`;
        const fetchOptions = {
            method: isPost ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };
        if (isPost && body) {
            fetchOptions.body = JSON.stringify(body);
        }

        console.log(`Workspaceing from API: ${fetchOptions.method} ${url}`, body || '');
        updateStatus(`Workspaceing data from ${url.substring(0,50)}...`, 'info');

        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                const errorData = await response.text(); // Try to get error body
                console.error(`API Error ${response.status} for ${url}:`, errorData);
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}. Details: ${errorData.substring(0,100)}`);
            }
            const data = await response.json();
            console.log(`Received data from ${url}:`, data);
            return data;
        } catch (error) {
            console.error(`Error in fetchUSAspendingData for ${url}:`, error);
            updateStatus(`API Error: ${error.message}`, 'error');
            throw error;
        }
    }

    // --- DATA PROCESSING ---
    function transformAgencyOverviewForModel(apiData, agencyCode) {
        // Example transformation - you'll need to adapt based on actual API response
        // This would be part of building your `unifiedModel`
        const modelFragment = {
            agencyId: agencyCode,
            agencyName: apiData.agency_name || "Unknown Agency",
            totalObligation: apiData.total_obligations || 0, // Example field
            activeFy: apiData.active_fy, // Example
            // ... other relevant overview fields
        };
        console.log("Transformed Agency Overview:", modelFragment);
        return modelFragment;
    }
    
    function transformAwardsDataForModel(awardsResults) {
        // This will be a complex function to transform paged award data (from e.g. /api/v2/search/spending_by_award/)
        // into structures suitable for your unifiedModel (contracts, primes, subs connections etc.)
        // It will involve mapping API fields to your model fields.
        // For example, if awardsResults is an array of award objects:
        let contracts = {};
        let primes = {};
        // ... iterate through awardsResults.results ...
        // map fields, create prime objects, contract objects
        // This is where much of the CSV processing logic gets replaced by API JSON processing.
        console.log("Transforming awards data (stub)...", awardsResults);
        return { contracts, primes /*, potentially other entities */ };
    }


    // --- UI RENDERING & DATA AGGREGATION FOR VIEW ---
    // (Keep/Adapt your aggregateDataForDashboardView, renderMainDashboard, D3 render functions, Chart.js init)
    // These will now consume data derived from API responses transformed into your unifiedModel structure.
    // For example, aggregateDataForDashboardView will take the API-sourced unifiedModel.
    // renderMainDashboard will take the output of aggregateDataForDashboardView.

    // --- APP INITIALIZATION & EVENT LISTENERS ---
    async function populateAgencySelector() {
        try {
            updateStatus('Fetching agency list...', 'info');
            const data = await fetchUSAspendingData('/api/v2/references/toptier_agencies/');
            if (data && data.results) {
                availableAgencies = data.results.map(agency => ({
                    name: `${agency.agency_name} (${agency.toptier_code})`,
                    toptier_code: agency.toptier_code,
                    agency_id: agency.agency_id // useful for some other endpoints
                })).sort((a, b) => a.name.localeCompare(b.name));

                agencySelectEl.innerHTML = '<option value="">Select an Agency...</option>';
                availableAgencies.forEach(agency => {
                    const option = document.createElement('option');
                    option.value = agency.toptier_code; // Use toptier_code as value
                    option.textContent = agency.name;
                    option.dataset.agencyId = agency.agency_id; // Store agency_id if needed
                    agencySelectEl.appendChild(option);
                });
                updateStatus('Agency list loaded. Please select an agency.', 'success', true);
            } else {
                throw new Error("Agency list format unexpected or empty.");
            }
        } catch (error) {
            console.error('Failed to populate agency selector:', error);
            updateStatus('Could not load agency list. Please refresh.', 'error');
            agencySelectEl.innerHTML = '<option value="">Error loading agencies</option>';
        }
    }

    async function handleAgencySelectionAndLoad() {
        const selectedToptierCode = agencySelectEl.value;
        if (!selectedToptierCode || isLoading) {
            if (!selectedToptierCode) updateStatus('Please select an agency code from the dropdown.', 'info');
            return;
        }

        isLoading = true;
        applyFiltersBtn.disabled = true;
        dashboardContainer.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Loading data for selected agency...</p></div>`;
        unifiedModel = { // Reset or initialize unified model structure
            agencies: {}, subAgencies: {}, offices: {}, primes: {}, subs: {},
            contracts: {}, subcontracts: {},
            relationships: { agencyToPrime: [], primeToSub: [] },
            stats: { totalObligation: 0 /* other stats */ } // Use obligation from API
        };

        try {
            // Example: Fetch Agency Overview
            const agencyOverviewData = await fetchUSAspendingData(`/api/v2/agency/${selectedToptierCode}/`);
            const agencyInfo = transformAgencyOverviewForModel(agencyOverviewData, selectedToptierCode);
            unifiedModel.agencies[agencyInfo.agencyId] = { // Basic agency structure
                id: agencyInfo.agencyId,
                name: agencyInfo.agencyName,
                value: agencyInfo.totalObligation, // Using 'value' for consistency with old model
                // ... add other details from agencyInfo ...
            };
            unifiedModel.stats.totalObligation = agencyInfo.totalObligation; // Update overall stats


            // TODO: FETCH DETAILED AWARD DATA (Primes)
            // This is the most complex part. You'll use an endpoint like /api/v2/search/spending_by_award/
            // It requires a POST request with a filter body.
            // It will return paginated results.
            const fiscalYear = new Date().getFullYear(); // Or from a UI selector
            const awardsFilterBody = {
                "filters": {
                    "time_period": [{ "fiscal_year": String(fiscalYear) }],
                    "agencies": [{ "type": "awarding", "tier": "toptier", "toptier_code": selectedToptierCode }]
                },
                "fields": [ // Request specific fields you need
                    "award_id", "recipient_name", "period_of_performance_start_date", 
                    "period_of_performance_current_end_date", "total_obligation", // "Award Amount" in API
                    "naics_code", "naics_description", "place_of_performance_state_code",
                    "awarding_sub_agency_name", "awarding_office_name"
                    // Add other fields relevant to your 'contract' objects
                ],
                "page": 1,
                "limit": 100, // Max is 100 per page usually, or specified by API
                "order": "desc",
                "sort": "total_obligation"
            };

            let allAwards = [];
            let currentPage = 1;
            let hasNextPage = true;
            updateStatus(`Workspaceing awards for ${agencyInfo.agencyName} (FY${fiscalYear})...`, 'info');

            // Simplified pagination loop (check API docs for actual pagination fields like 'has_next', 'next_page_token')
            // This is a conceptual loop for spending_by_award. Some APIs use `page` and `limit`.
            // while(hasNextPage) {
            // awardsFilterBody.page = currentPage;
            // const awardsPageData = await fetchUSAspendingData('/api/v2/search/spending_by_award/', {}, true, awardsFilterBody);
            // if (awardsPageData && awardsPageData.results) {
            // allAwards = allAwards.concat(awardsPageData.results);
            // hasNextPage = awardsPageData.page_metadata ? awardsPageData.page_metadata.has_next_page : false; // Adjust to actual API response
            // currentPage++;
            // if (hasNextPage) updateStatus(`Workspaceing awards page ${currentPage}...`, 'info');
            // } else {
            // hasNextPage = false;
            // }
            // if (currentPage > 10) { // Safety break for this example for very large agencies
            //     console.warn("Pagination stopped after 10 pages for example.");
            //     hasNextPage = false;
            // }
            // }
            // console.log(`Workspaceed ${allAwards.length} total prime award records.`);
            // const { contracts, primes } = transformAwardsDataForModel(allAwards); // Your new transformation logic
            // unifiedModel.contracts = contracts;
            // unifiedModel.primes = primes;
            // (This part above for fetching all awards is a MAJOR task and needs careful implementation of pagination & transformation)


            // TODO: FETCH SUB-AWARD DATA (if needed, after getting prime award IDs)
            // For each prime award, you might call /api/v2/subawards/ with appropriate filters.


            // For now, let's assume unifiedModel gets populated by stubs or simplified calls
            // Replace with actual complex data processing logic
            if(Object.keys(unifiedModel.agencies).length === 0) { // If no agency info could be made
                 unifiedModel = { // Provide a minimal structure to prevent errors downstream
                    agencies: {[selectedToptierCode]: {id: selectedToptierCode, name: "Selected Agency (Details Pending)", value:0, contracts: new Set()}},
                    subAgencies: {}, offices: {}, primes: {}, subs: {}, contracts: {}, subcontracts: {},
                    relationships: { agencyToPrime: [], primeToSub: [] },
                    stats: { totalObligation: 0, allNaics: new Map(), allSubAgencies: new Set() }
                };
            }


            // Populate filter dropdowns based on the data that *would* be in unifiedModel
            // For example, if /api/v2/agency/CODE/sub_agency/ gave you sub-agencies, populate from that.
            // If /api/v2/references/naics/ or autocomplete gave you NAICS, populate from that.
            // This part needs to be rethought based on actual API call sequences.
            // For now, let's assume a simplified population or defer it.
            // populateFilterDropdowns(unifiedModel); // This will need data from the API calls

            // Prepare data for the view and render
            // const displayData = aggregateDataForDashboardView(unifiedModel); // This function also needs to be adapted for API data
            // renderMainDashboard(displayData);
            // For now, just show basic agency info:
            dashboardContainer.innerHTML = `
                <div class="snapshot-header"><h2>${unifiedModel.agencies[selectedToptierCode]?.name || 'Agency Data'}</h2></div>
                <p>Total Obligation (from overview): ${formatCurrencyShort(unifiedModel.stats.totalObligation)}</p>
                <p><em>Further data fetching and processing for awards, NAICS, Geo, etc. would populate the full dashboard.</em></p>
                <p><strong>Next Steps:</strong>
                    <ul>
                        <li>Implement paginated fetching for <code>/api/v2/search/spending_by_award/</code>.</li>
                        <li>Transform its results into your <code>unifiedModel.contracts</code> and <code>unifiedModel.primes</code>.</li>
                        <li>Fetch subawards using <code>/api/v2/subawards/</code>.</li>
                        <li>Adapt <code>aggregateDataForDashboardView</code> and D3 data prep functions for the new API-driven <code>unifiedModel</code>.</li>
                    </ul>
                </p>`;


            updateStatus(`Basic overview for ${agencyInfo.agencyName} loaded. Detailed award data fetch is next.`, 'success', true);

        } catch (error) {
            console.error('Error handling agency selection and loading:', error);
            updateStatus(`Error loading agency data: ${error.message}`, 'error');
            dashboardContainer.innerHTML = `<p class="dashboard-loading">Failed to load agency data. ${error.message}</p>`;
        } finally {
            isLoading = false;
            applyFiltersBtn.disabled = false;
        }
    }

    function updateStatus(message, type = 'info', autoDismiss = false) {
        // ... (same as your working version)
        if (!statusBanner) return;
        statusBanner.textContent = message;
        statusBanner.className = `status-${type}`;
        if (statusBanner.dismissTimer) clearTimeout(statusBanner.dismissTimer);
        if (autoDismiss) {
            statusBanner.dismissTimer = setTimeout(() => {
                if (statusBanner.textContent === message) {
                    statusBanner.textContent = 'Ready.';
                    statusBanner.className = 'status-info';
                }
            }, 4000);
        }
    }
    
    function initTheme() { /* ... same as before ... */ }


    // --- INITIALIZATION ---
    async functioninitializeApp() {
        initTheme();
        await populateAgencySelector(); // Fetch agencies on load
        agencySelectEl.addEventListener('change', handleAgencySelectionAndLoad);
        applyFiltersBtn.addEventListener('click', handleAgencySelectionAndLoad); // Or a more specific filter function later
        // Other event listeners for search, filters would eventually call a function that re-queries APIs or filters client-side data

        updateStatus('App initialized. Select an agency to load data from USAspending.gov API.', 'info');
    }

    initializeApp();
});