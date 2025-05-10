document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const DATASETS_CONFIG = [
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

    // Field mapping between prime and sub contract datasets
    const FIELD_MAP = {
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

    const S3_BASE_URL = 'https://subhoodata.s3.us-east-1.amazonaws.com/data/';
// Update the CHART_COLORS array to use our new palette
const CHART_COLORS = [
    'var(--chart-color-1)',
    'var(--chart-color-2)',
    'var(--chart-color-3)',
    'var(--chart-color-4)',
    'var(--chart-color-5)',
    'var(--chart-color-6)',
    'var(--chart-color-7)',
    'var(--chart-color-8)',
];

// Create a consistent gradient palette for maps and heatmaps
const GRADIENT_COLORS = [
    'var(--map-color-1)',
    'var(--map-color-2)',
    'var(--map-color-3)',
    'var(--map-color-4)',
    'var(--map-color-5)',
    'var(--map-color-6)',
];

    // --- DOM Elements ---
    const datasetSelect = document.getElementById('dataset-select');
    const searchInput = document.getElementById('search-input');
    const subAgencyFilterEl = document.getElementById('sub-agency-filter');
    const naicsFilterEl = document.getElementById('naics-filter');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const statusBanner = document.getElementById('status-banner');
    const dashboardContainer = document.getElementById('dashboard-container');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const themeIcon = document.getElementById('theme-icon');
    
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // --- Global State ---
    let rawData = { primes: [], subs: [] };
    let unifiedModel = null;
    let chartInstances = {}; // For Chart.js instances
    let isLoading = false;

    // --- Utility Functions ---
    function parseSafeFloat(value) {
        if (value === null || value === undefined || value === '') return 0;
        const cleanedString = String(value).replace(/[^0-9.-]+/g,'');
        const num = parseFloat(cleanedString);
        return isNaN(num) ? 0 : num;
    }

    function parseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;
        
        if (dateString instanceof Date && !isNaN(dateString.getTime())) return dateString;
        
        try {
            let date = null;
            
            // Try ISO 8601 format (YYYY-MM-DD)
            if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
                date = new Date(dateString);
                if (!isNaN(date.getTime())) return date;
            }
            
            // Try MM/DD/YYYY format
            if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = dateString.split('/');
                date = new Date(parts[2], parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
                if (!isNaN(date.getTime())) return date;
            }
            
            // Check for dateFns availability
            if (typeof dateFns !== 'undefined' && dateFns.parseISO) {
                const parsedDate = dateFns.parseISO(dateString);
                if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) return parsedDate;
            }
            
            // Last resort: browser's native parsing
            date = new Date(dateString);
            if (!isNaN(date.getTime())) return date;
            
            // Fallback for fiscal year format (FY18 or FY 2018)
            const fyMatch = dateString.match(/FY\s*(\d{2,4})/i);
            if (fyMatch) {
                let year = parseInt(fyMatch[1], 10);
                if (year < 100) year += 2000; // Assume 20xx for 2-digit years
                return new Date(year, 9, 1); // October 1st of fiscal year
            }
            
            return null;
        } catch (e) {
            console.error(`Error parsing date: "${dateString}"`, e);
            return null;
        }
    }

    const FIPS_TO_STATE_NAME = {
        "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas", 
        "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware", 
        "11": "District of Columbia", "12": "Florida", "13": "Georgia", "15": "Hawaii", 
        "16": "Idaho", "17": "Illinois", "18": "Indiana", "19": "Iowa", 
        "20": "Kansas", "21": "Kentucky", "22": "Louisiana", "23": "Maine", 
        "24": "Maryland", "25": "Massachusetts", "26": "Michigan", "27": "Minnesota", 
        "28": "Mississippi", "29": "Missouri", "30": "Montana", "31": "Nebraska", 
        "32": "Nevada", "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", 
        "36": "New York", "37": "North Carolina", "38": "North Dakota", "39": "Ohio", 
        "40": "Oklahoma", "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island", 
        "45": "South Carolina", "46": "South Dakota", "47": "Tennessee", "48": "Texas", 
        "49": "Utah", "50": "Vermont", "51": "Virginia", "53": "Washington", 
        "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming",
        "60": "American Samoa", "66": "Guam", "69": "Northern Mariana Islands",
        "72": "Puerto Rico", "78": "U.S. Virgin Islands"
    };

    function calculateDurationDays(startDateStr, endDateStr) {
        const start = parseDate(startDateStr);
        const end = parseDate(endDateStr);
        
        if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || 
            isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 0;
        }
        
        // Use date-fns if available
        if (typeof dateFns !== 'undefined' && dateFns.differenceInDays) {
            return dateFns.differenceInDays(end, start) + 1;
        } else {
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays > 0 ? diffDays : 0;
        }
    }

    function formatCurrencyShort(value, defaultIfNaN = '$0') {
        if (value === null || value === undefined) return defaultIfNaN;
        const numValue = typeof value === 'string' ? parseSafeFloat(value) : Number(value);

        if (isNaN(numValue)) return defaultIfNaN;
        
        if (Math.abs(numValue) >= 1000000) {
            return `$${(numValue / 1000000).toFixed(1)}M`;
        } else if (Math.abs(numValue) >= 1000) {
            return `$${(numValue / 1000).toFixed(1)}K`;
        } else {
            return `$${numValue.toFixed(0)}`;
        }
    }
    
    function formatCurrencyStandard(value, defaultIfNaN = '$ -') {
        if (value === null || value === undefined) return defaultIfNaN;
        const numValue = typeof value === 'string' ? parseSafeFloat(value) : Number(value);
        if (isNaN(numValue)) return defaultIfNaN;
        return numValue.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD', 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
        });
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        const stringText = String(text);
        return stringText.length > maxLength ? stringText.substring(0, maxLength - 3) + '...' : stringText;
    }

    function getCssVar(varName) {
        try {
            const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            if (!value) {
                return null;
            }
            return value;
        } catch (e) {
            console.warn(`Could not get CSS variable ${varName}: ${e.message}`);
            return null;
        }
    }

    function sanitizeId(text) {
        if (!text) return 'unknown';
        return String(text).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
    }
// Update to the fetchDataset function
async function fetchDataset(datasetConfig) {
    const csvUrl = `${S3_BASE_URL}${datasetConfig.id}.csv`;
    updateStatus(`Loading ${datasetConfig.name}...`, 'info');
    
    try {
        console.log(`Attempting to fetch data from: ${csvUrl}`);
        
        const response = await fetch(csvUrl, { 
            mode: 'cors', 
            cache: 'no-cache',
            headers: {
                'Accept': 'text/csv,text/plain,*/*'
            }
        });
        
        if (!response.ok) {
            console.error(`HTTP error ${response.status} for ${datasetConfig.name}`);
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        if (!csvText || csvText.trim() === '') {
            console.error(`Empty response received for ${datasetConfig.name}`);
            throw new Error('Empty data received');
        }
        
        console.log(`Successfully fetched ${csvText.length} bytes for ${datasetConfig.name}`);
        console.log(`CSV sample: ${csvText.substring(0, 100)}...`);
        
        const parseResult = Papa.parse(csvText, { 
            header: true, 
            dynamicTyping: false, 
            skipEmptyLines: 'greedy', 
            transformHeader: h => h.trim() 
        });
        
        if (parseResult.errors.length > 0) {
            console.warn(`Parsing errors in ${datasetConfig.name}:`, parseResult.errors);
        }
        
        if (!parseResult.data || parseResult.data.length === 0) {
            console.error(`No data rows found in ${datasetConfig.name}`);
            throw new Error('No data rows found after parsing');
        }
        
        console.log(`Successfully parsed ${parseResult.data.length} rows for ${datasetConfig.name}`);
        return parseResult.data;
    } catch (error) {
        console.error(`Error fetching ${datasetConfig.name}:`, error);
        
        // Check for CORS errors (they often appear as TypeError or NetworkError)
        if (error instanceof TypeError && error.message.includes('Network') ||
            error.message.includes('CORS') || 
            error.message.includes('Failed to fetch')) {
            updateStatus(`CORS error fetching ${datasetConfig.name}. Check console for details.`, 'error');
            console.error('This appears to be a CORS issue. Make sure your S3 bucket has proper CORS configuration.');
        } else {
            updateStatus(`Error fetching ${datasetConfig.name}: ${error.message}`, 'error');
        }
        
        // For debugging - attempt to fetch with no-cors mode to see if resource exists
        try {
            const testResponse = await fetch(csvUrl, { mode: 'no-cors' });
            console.log('Resource exists but might have CORS issues:', testResponse);
        } catch (e) {
            console.error('Resource appears to be completely unavailable:', e);
        }
        
        // You could implement a fallback here to demo data if needed
        // return getDemoData(datasetConfig.type);
        
        throw error;
    }
}
    // --- Data Processor ---
    function processRawDataset(rawRows, datasetType) {
        return rawRows.map(row => {
            const cleanRow = { _sourceType: datasetType };
            
            // Clean and trim all string values
            for (const key in row) {
                if (Object.prototype.hasOwnProperty.call(row, key)) {
                    const value = row[key];
                    cleanRow[key] = typeof value === 'string' ? value.trim() : value;
                }
            }
            
            // Map fields according to our standardized structure
            for (const field in FIELD_MAP) {
                const sourceField = FIELD_MAP[field][datasetType];
                if (sourceField && cleanRow[sourceField] !== undefined) {
                    cleanRow[field] = cleanRow[sourceField];
                }
            }
            
            // Process numeric values
            cleanRow.contractValue = parseSafeFloat(cleanRow.contractValue);
            if (datasetType === 'primes') {
                cleanRow.obligatedValue = parseSafeFloat(cleanRow.obligatedValue);
                cleanRow.potentialValue = parseSafeFloat(cleanRow.potentialValue);
            }
            
            // Process dates
            cleanRow.parsedStartDate = parseDate(cleanRow.startDate);
            cleanRow.parsedEndDate = parseDate(cleanRow.endDate);
            
            return cleanRow;
        });
    }

    function buildUnifiedModelFromProcessed(processedPrimes, processedSubs) {
        const model = {
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
                totalSubContracts: 0, 
                allNaics: new Map(), 
                allSubAgencies: new Set() 
            }
        };

        // Process Prime contracts
        (processedPrimes || []).forEach((row, idx) => {
            if (!row.contractValue || row.contractValue <= 0) return;
            
            const agencyName = row.agencyName || "Unknown Agency";
            const agencyId = `agency-${sanitizeId(agencyName)}`;
            
            if (!model.agencies[agencyId]) {
                model.agencies[agencyId] = { 
                    id: agencyId, 
                    name: agencyName, 
                    value: 0, 
                    contracts: new Set() 
                };
            }
            
            model.agencies[agencyId].value += row.contractValue;
            model.stats.allSubAgencies.add(row.subAgencyName || "N/A");

            const primeName = row.primeName || "Unknown Prime";
            const primeId = `prime-${sanitizeId(primeName)}-${idx}`;
            
            if (!model.primes[primeId]) {
                model.primes[primeId] = { 
                    id: primeId, 
                    name: primeName, 
                    value: 0, 
                    contracts: new Set(), 
                    subs: new Set() 
                };
            }
            
            model.primes[primeId].value += row.contractValue;

            const contractId = row.contractId || `prime_contract_${idx}`;
            model.contracts[contractId] = {
                id: contractId,
                value: row.contractValue,
                primeId: primeId,
                agencyId: agencyId,
                description: row.description,
                naicsCode: row.naicsCode,
                naicsDesc: row.naicsDesc,
                startDate: row.parsedStartDate,
                endDate: row.parsedEndDate,
                raw: row,
                subAgencyName: row.subAgencyName,
                officeName: row.officeName
            };
            
            model.agencies[agencyId].contracts.add(contractId);
            model.primes[primeId].contracts.add(contractId);
            model.stats.totalContractValue += row.contractValue;
            
            if (row.naicsCode && row.naicsDesc) {
                model.stats.allNaics.set(row.naicsCode, row.naicsDesc);
            }

            // Record relationship
            model.relationships.agencyToPrime.push({ 
                source: agencyId, 
                target: primeId, 
                value: row.contractValue, 
                contractId 
            });
        });

        // Process Subcontracts
        (processedSubs || []).forEach((row, idx) => {
            if (!row.contractValue || row.contractValue <= 0) return;
            
            const primeName = row.primeName || "Unknown Prime";
            
            // Find or create prime node
            let primeNode = Object.values(model.primes).find(p => p.name === primeName);
            let primeId;
            
            if (primeNode) {
                primeId = primeNode.id;
            } else {
                primeId = `prime-${sanitizeId(primeName)}-suboriginated-${idx}`;
                model.primes[primeId] = { 
                    id: primeId, 
                    name: primeName, 
                    value: 0, 
                    contracts: new Set(), 
                    subs: new Set() 
                };
            }

            const subName = row.subName || "Unknown Sub";
            const subId = `sub-${sanitizeId(subName)}-${idx}`;
            
            if (!model.subs[subId]) {
                model.subs[subId] = { 
                    id: subId, 
                    name: subName, 
                    value: 0 
                };
            }
            
            model.subs[subId].value += row.contractValue;
            model.primes[primeId].subs.add(subId); // Link sub to prime

            const subcontractId = row.subcontractId || `sub_contract_${idx}`;
            model.subcontracts[subcontractId] = {
                id: subcontractId,
                value: row.contractValue,
                primeId: primeId,
                subId: subId,
                description: row.description,
                naicsCode: row.naicsCode,
                naicsDesc: row.naicsDesc,
                startDate: row.parsedStartDate,
                endDate: row.parsedEndDate,
                raw: row
            };
            
            if (row.naicsCode && row.naicsDesc) {
                model.stats.allNaics.set(row.naicsCode, row.naicsDesc);
            }
            
            model.stats.allSubAgencies.add(row.subAgencyName || "N/A");

            model.relationships.primeToSub.push({ 
                source: primeId, 
                target: subId, 
                value: row.contractValue, 
                subcontractId 
            });
        });

        model.stats.totalPrimeContracts = Object.keys(model.contracts).length;
        model.stats.totalSubContracts = Object.keys(model.subcontracts).length;

        return model;
    }

    // --- Dashboard View Data Aggregation ---
    function aggregateDataForDashboardView(model) {
        // Helper functions for data aggregation
        const getAgencyInfo = (m) => {
            const agencyName = m.agencies && Object.keys(m.agencies).length > 0 
                ? Object.values(m.agencies).sort((a,b) => (b.value||0) - (a.value||0))[0]?.name 
                : "Selected Agency";
            return { 
                agencyName, 
                totalAwarded: m.stats?.totalContractValue || 0 
            };
        };
        
        const getTopNAICSInfo = (m, topN = 5) => {
            const naicsAggregates = {};
            let totalValueAllNaics = 0;
            
            Object.values(m.contracts || {}).forEach(c => {
                if (c.naicsCode && c.value > 0) {
                    if (!naicsAggregates[c.naicsCode]) {
                        naicsAggregates[c.naicsCode] = {
                            code: c.naicsCode, 
                            description: c.naicsDesc || "N/A", 
                            value: 0
                        };
                    }
                    naicsAggregates[c.naicsCode].value += c.value;
                    totalValueAllNaics += c.value;
                }
            });
            
            const sorted = Object.values(naicsAggregates).sort((a,b) => b.value - a.value);
            const chartData = sorted.slice(0, topN).map(n => ({
                code: n.code, 
                desc: n.description, 
                pct: totalValueAllNaics > 0 ? Math.round(n.value/totalValueAllNaics*100) : 0
            }));
            
            // Add "Other" category if needed
            if (sorted.length > topN) { 
                const otherValue = sorted.slice(topN).reduce((sum, item) => sum + item.value, 0);
                if (otherValue > 0) {
                    chartData.push({
                        code: "Other",
                        desc: "Others",
                        pct: totalValueAllNaics > 0 ? Math.round(otherValue/totalValueAllNaics*100) : 0
                    });
                }
            }
            
            const topNOverall = sorted.length > 0 ? sorted[0] : {code: "N/A", description: "N/A"};
            const dominantText = sorted.slice(0, 2).map(n => 
                `${n.code} (${truncateText(n.description, 15)})`
            ).join('; ');
            
            return {
                topNaicsCode: topNOverall.code, 
                topNaicsDescription: topNOverall.description, 
                dominantNaicsText: dominantText, 
                distribution: chartData
            };
        };
        
        const getExpiringContractsInfo = (m, monthsAhead = 6, limit = 5) => {
            const expiringInfo = {
                count: 0, 
                value: 0, 
                list: []
            };
            
            if (!m || !m.contracts) return expiringInfo;
            
            const today = new Date();
            const future = new Date(today);
            future.setMonth(today.getMonth() + monthsAhead);
            
            const expiringList = Object.values(m.contracts)
                .filter(c => {
                    if (!c.endDate) return false;
                    const endDate = c.endDate instanceof Date ? c.endDate : parseDate(c.endDate);
                    return endDate && !isNaN(endDate.getTime()) && 
                           endDate >= today && endDate <= future;
                })
                .map(c => ({
                    id: c.raw?.contract_award_unique_key || c.id || "N/A", 
                    contractor: m.primes[c.primeId]?.name || "N/A", 
                    description: truncateText(c.description, 40), 
                    endDate: (c.endDate instanceof Date ? c.endDate : parseDate(c.endDate))?.toLocaleDateString('en-US') || "N/A", 
                    value: c.value || 0
                }))
                .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
            
            expiringInfo.count = expiringList.length;
            expiringInfo.value = expiringList.reduce((sum, c) => sum + c.value, 0);
            expiringInfo.list = expiringList.slice(0, limit);
            
            return expiringInfo;
        };
        
        const getTopPrimeContractors = (m, tableLimit = 10, chartLimit = 7) => {
            const primesData = {
                table: [], 
                chartData: {
                    labels: [],
                    values: []
                }
            };
            
            if (!m || !m.primes || Object.keys(m.primes).length === 0) return primesData;
            
            const sortedPrimes = Object.values(m.primes)
                .map(p => {
                    let avgDuration = 0, dominantCode = "N/A", dominantDesc = "", awardCount = 0, repContractId = null;
                    const contractIds = p.contracts instanceof Set ? Array.from(p.contracts) : (p.contracts || []);
                    awardCount = contractIds.length;
                    
                    if (awardCount > 0 && m.contracts) {
                        let totalDuration = 0, durationCount = 0;
                        const naicsCounts = {};
                        
                        contractIds.forEach((cId, index) => {
                            const contract = m.contracts[cId];
                            if (contract) {
                                if (index === 0) {
                                    repContractId = contract.raw?.contract_award_unique_key || contract.id;
                                }
                                
                                if (contract.startDate && contract.endDate) {
                                    const duration = calculateDurationDays(contract.startDate, contract.endDate);
                                    if (duration > 0) {
                                        totalDuration += duration;
                                        durationCount++;
                                    }
                                }
                                
                                if (contract.naicsCode) {
                                    naicsCounts[contract.naicsCode] = (naicsCounts[contract.naicsCode] || 0) + 1;
                                }
                            }
                        });
                        
                        if (durationCount > 0) {
                            avgDuration = Math.round(totalDuration / durationCount);
                        }
                        
                        if (Object.keys(naicsCounts).length > 0) {
                            dominantCode = Object.keys(naicsCounts).reduce((a, b) => 
                                naicsCounts[a] > naicsCounts[b] ? a : b
                            );
                            
                            const sampleContract = contractIds.map(id => m.contracts[id])
                                .find(c => c && c.naicsCode === dominantCode);
                            
                            dominantDesc = sampleContract ? truncateText(sampleContract.naicsDesc, 20) : "";
                        }
                    }
                    
                    return {
                        name: p.name || "N/A",
                        value: p.value || 0,
                        awards: awardCount,
                        avgDuration: avgDuration,
                        primaryNaics: `${dominantCode}${dominantDesc ? ' - ' + dominantDesc : ''}`,
                        usaspendingLink: repContractId ? `https://www.usaspending.gov/award/${repContractId}` : null
                    };
                })
                .filter(p => p.value > 0)
                .sort((a, b) => b.value - a.value);
            
            primesData.table = sortedPrimes.slice(0, tableLimit);
            
            const chartPrimes = sortedPrimes.slice(0, chartLimit);
            primesData.chartData.labels = chartPrimes.map(p => truncateText(p.name, 15));
            primesData.chartData.values = chartPrimes.map(p => p.value);
            
            return primesData;
        };
        
        const getTopSubContractor = (m) => {
            if (!m || !m.subs || Object.keys(m.subs).length === 0) return "N/A";
            const sorted = Object.values(m.subs).sort((a, b) => (b.value || 0) - (a.value || 0));
            return sorted.length > 0 ? sorted[0].name : "N/A";
        };
        
        const getTAVTCVData = (m, limit = 7) => {
            if (!m || !m.contracts) return [];
            
            return Object.values(m.contracts)
                .filter(c => c.value > 0 && c.raw)
                .map(c => {
                    const primeName = m.primes[c.primeId]?.name || "N/A";
                    const description = c.description || `Contract with ${primeName}`;
                    
                    return {
                        id: c.raw?.contract_award_unique_key || c.id || "N/A",
                        name: truncateText(description, 30),
                        tav: parseSafeFloat(c.raw.obligatedValue),
                        tcvRemainder: Math.max(0, parseSafeFloat(c.value) - parseSafeFloat(c.raw.obligatedValue)),
                        totalTcv: parseSafeFloat(c.value)
                    };
                })
                .sort((a, b) => b.totalTcv - a.totalTcv)
                .slice(0, limit);
        };
        
        const getARRInfo = (m, targetNaics) => {
            const result = {
                arr: 0,
                avgContractSize: 0,
                avgDurationYears: 0,
                naicsCode: targetNaics || "N/A",
                naicsDesc: "N/A"
            };
            
            if (!m || !m.contracts || !targetNaics) return result;
            
            const relevantContracts = Object.values(m.contracts)
                .filter(c => c.naicsCode === targetNaics && c.value > 0 && c.startDate && c.endDate);
            
            if (relevantContracts.length === 0) return result;
            
            result.naicsDesc = truncateText(relevantContracts[0].naicsDesc, 40);
            
            let totalValue = 0, totalDurationDays = 0, validDurationCount = 0;
            
            relevantContracts.forEach(c => {
                totalValue += c.value;
                const duration = calculateDurationDays(c.startDate, c.endDate);
                if (duration > 0) {
                    totalDurationDays += duration;
                    validDurationCount++;
                }
            });
            
            if (relevantContracts.length > 0) {
                result.avgContractSize = totalValue / relevantContracts.length;
            }
            
            if (validDurationCount > 0) {
                result.avgDurationYears = (totalDurationDays / validDurationCount) / 365.25;
            }
            
            if (result.avgDurationYears > 0) {
                result.arr = result.avgContractSize / result.avgDurationYears;
            }
            
            return result;
        };
        
        // Geographic distribution analysis
        function getGeoDistributionInfo(model) {
            console.log("[GeoInfo] Processing geographic data...");
            if (!model || !model.contracts || Object.keys(model.contracts).length === 0) {
                console.log("[GeoInfo] No model or contracts data found.");
                return "Place of Performance data not available.";
            }

            const stateAggregatedValues = {}; // Stores aggregated contract values, keyed by normalized FIPS code

            Object.values(model.contracts).forEach((contract, contractIndex) => {
                if (!contract || !contract.raw) {
                    return;
                }

                // Prioritize fields for state identifier
                let rawStateIdentifier = contract.raw.popStateCode || 
                                       contract.raw.prime_award_transaction_place_of_performance_state_fips_code ||
                                       contract.raw.place_of_performance_state_code;

                if (!rawStateIdentifier) {
                    return;
                }

                let normalizedFips = null;
                const identifierString = String(rawStateIdentifier).trim().toUpperCase();

                // 1. Check if it's a direct numeric FIPS code (1 or 2 digits)
                if (/^\d{1,2}$/.test(identifierString)) {
                    normalizedFips = identifierString.padStart(2, '0');
                }
                // 2. Check if it's already a valid key in our map (e.g., "06", "12")
                else if (FIPS_TO_STATE_NAME[identifierString]) {
                    normalizedFips = identifierString;
                }
                // 3. Check if it's a 2-letter state abbreviation (e.g., "CA", "FL")
                else if (identifierString.length === 2 && /^[A-Z]{2}$/.test(identifierString)) {
                    const fipsEntry = Object.entries(FIPS_TO_STATE_NAME).find(
                        ([fips, name]) => name.toUpperCase().startsWith(identifierString) || 
                                          name.split(' ').some(part => part.toUpperCase() === identifierString)
                    );
                    if (fipsEntry) {
                        normalizedFips = fipsEntry[0]; // The FIPS code (key)
                    }
                }
                // 4. Check if it's a full state name
                else if (identifierString.length > 2) { // Assume it might be a full name
                    const fipsEntry = Object.entries(FIPS_TO_STATE_NAME).find(
                        ([fips, name]) => name.toUpperCase() === identifierString
                    );
                    if (fipsEntry) {
                        normalizedFips = fipsEntry[0];
                    }
                }

                if (normalizedFips && FIPS_TO_STATE_NAME[normalizedFips]) {
                    if (!stateAggregatedValues[normalizedFips]) {
                        stateAggregatedValues[normalizedFips] = 0;
                    }
                    stateAggregatedValues[normalizedFips] += (contract.value || 0);
                }
            });

            if (Object.keys(stateAggregatedValues).length === 0) {
                console.log("[GeoInfo] No state values were successfully aggregated.");
                return "No specific geographic concentration identified from contract data.";
            }

            const topStatesDetails = Object.entries(stateAggregatedValues)
                .sort(([, valueA], [, valueB]) => valueB - valueA) // Sort by aggregated value
                .slice(0, 3);                                     // Top 3 states

            console.log("[GeoInfo] Top states data before mapping to names:", JSON.stringify(topStatesDetails));

            const stateNames = topStatesDetails.map(([fipsCode, value]) => {
                const name = FIPS_TO_STATE_NAME[fipsCode];
                if (!name) {
                    console.warn(`[GeoInfo] Final map lookup failed for FIPS: '${fipsCode}' (Value: ${value})`);
                    return `FIPS ${fipsCode}`;
                }
                return name;
            });

            if (stateNames.length === 0) {
                return "No specific geographic concentration identified.";
            }
            
            return `Key Places of Performance include: ${stateNames.join(', ')}.`;
        }
        
        const getRelationshipSummary = (m, limit = 3) => {
            if (!m || !m.relationships || !m.relationships.primeToSub || m.relationships.primeToSub.length === 0) {
                return "Limited prime-sub relationship data in this view.";
            }
            
            const topRelationships = m.relationships.primeToSub
                .sort((a, b) => (b.value || 0) - (a.value || 0))
                .slice(0, limit);
            
            if (topRelationships.length === 0) {
                return "No significant prime-sub relationships in top data.";
            }
            
            const summaryLines = topRelationships.map(rel => {
                const primeName = m.primes[rel.source]?.name || "N/A Prime";
                const subName = m.subs[rel.target]?.name || "N/A Sub";
                return `<li>${truncateText(primeName, 20)} often works with ${truncateText(subName, 20)} (${formatCurrencyShort(rel.value)})</li>`;
            });
            
            return `<ul class="relationship-list">${summaryLines.join('')}</ul>`;
        };

        // Process and aggregate the data
        const agencyInfo = getAgencyInfo(model);
        const topNAICSInfo = getTopNAICSInfo(model);
        const expiringInfo = getExpiringContractsInfo(model);
        const topPrimesInfo = getTopPrimeContractors(model);
        const arrInfo = getARRInfo(model, topNAICSInfo.topNaicsCode);

        // Return the aggregated data for dashboard rendering
        return {
            agencyName: agencyInfo.agencyName,
            updateDateMonthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            currentDateFormatted: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            totalAwardedFY: formatCurrencyShort(agencyInfo.totalAwarded),
            expiringCount: expiringInfo.count,
            expiringValueFormatted: formatCurrencyShort(expiringInfo.value),
            topPrimeName: topPrimesInfo.table.length > 0 ? topPrimesInfo.table[0].name : "N/A",
            topSubName: getTopSubContractor(model),
            mostUsedNaicsCode: topNAICSInfo.topNaicsCode,
            mostUsedNaicsFullText: `${topNAICSInfo.topNaicsCode}${topNAICSInfo.topNaicsDescription !== 'N/A' ? ' - ' + topNAICSInfo.topNaicsDescription : ''}`,
            dominantNaicsTextShort: topNAICSInfo.dominantNaicsText,
            geoDistributionText: getGeoDistributionInfo(model),
            arrForTopNaics: formatCurrencyShort(arrInfo.arr),
            arrNaicsCode: arrInfo.naicsCode,
            primeContractorsChart: topPrimesInfo.chartData,
            naicsDistributionChart: { 
                labels: topNAICSInfo.distribution.map(n => n.code), 
                values: topNAICSInfo.distribution.map(n => n.pct) 
            },
            tavTcvChart: getTAVTCVData(model),
            topPrimesTableData: topPrimesInfo.table,
            expiringContractsTableData: expiringInfo.list,
            arrEstimatorData: {
                arrFormatted: formatCurrencyShort(arrInfo.arr), 
                naicsCode: arrInfo.naicsCode,
                naicsDescription: arrInfo.naicsDesc, 
                avgContractSizeFormatted: formatCurrencyShort(arrInfo.avgContractSize),
                avgDurationText: `${arrInfo.avgDurationYears > 0 ? arrInfo.avgDurationYears.toFixed(1) : '0'} years`,
            },
            relationshipSummary: getRelationshipSummary(model),
            // For D3 charts
            mapChartData: processMapDataForD3(model),
            dendrogramChartData: prepareHierarchyDataForD3(model)
        };
    }

    // --- D3 Visualization Data Processing ---
    function processMapDataForD3(model) {
        if (!model || !model.contracts) return {};
        
        const stateData = {};
        
        Object.values(model.contracts).forEach(contract => {
            const stateCode = contract.raw?.popStateCode || 
                             contract.raw?.prime_award_transaction_place_of_performance_state_fips_code;
            
            if (stateCode) {
                const normCode = String(stateCode).trim().toUpperCase().padStart(2, '0');
                
                if (!stateData[normCode]) {
                    stateData[normCode] = { value: 0, count: 0 };
                }
                
                stateData[normCode].value += contract.value || 0;
                stateData[normCode].count++;
            }
        });
        
        return stateData;
    }

    function prepareHierarchyDataForD3(model) {
        if (!model || !model.agencies || Object.keys(model.agencies).length === 0) {
            console.warn("Hierarchy data: Model or agencies are missing.");
            return { name: "No Agency Data", id: "root", children: [] };
        }
        
        console.log("Preparing D3 Hierarchy: Agency -> SubAgency -> Prime -> Subcontractor");

        const rootNode = {
            name: "Federal Ecosystem",
            id: "root-hierarchy",
            type: "root",
            children: []
        };

        // Consider the top agencies by value
        const topAgencies = Object.values(model.agencies)
            .sort((a, b) => (b.value || 0) - (a.value || 0))
            .slice(0, 2); // Limit to top 2 agencies for visualization clarity

        topAgencies.forEach(agency => {
            const agencyNode = {
                name: truncateText(agency.name, 30),
                id: agency.id,
                value: agency.value || 0,
                type: 'agency',
                children: []
            };

            // Find SubAgencies for this Agency
            const subAgenciesForThisAgency = {};

            Object.values(model.contracts || {}).forEach(contract => {
                if (contract.agencyId === agency.id && contract.subAgencyName && contract.primeId) {
                    if (!subAgenciesForThisAgency[contract.subAgencyName]) {
                        subAgenciesForThisAgency[contract.subAgencyName] = {
                            name: contract.subAgencyName,
                            value: 0,
                            primeIds: new Set() // Store prime IDs associated with this SubAgency
                        };
                    }
                    subAgenciesForThisAgency[contract.subAgencyName].value += (contract.value || 0);
                    subAgenciesForThisAgency[contract.subAgencyName].primeIds.add(contract.primeId);
                }
            });
            
            const topSubAgencies = Object.values(subAgenciesForThisAgency)
                .sort((a, b) => b.value - a.value)
                .slice(0, 3); // Top 3 SubAgencies per Agency

            topSubAgencies.forEach(subAgencyData => {
                const subAgencyNode = {
                    name: truncateText(subAgencyData.name, 28),
                    id: `subagency-${sanitizeId(agency.name)}-${sanitizeId(subAgencyData.name)}`,
                    value: subAgencyData.value,
                    type: 'subagency',
                    children: []
                };

                const primesForThisSubAgency = Array.from(subAgencyData.primeIds)
                    .map(primeId => model.primes[primeId])
                    .filter(Boolean) // Ensure prime exists
                    .sort((a, b) => (b.value || 0) - (a.value || 0))
                    .slice(0, 5); // Top 5 Primes for this SubAgency

                primesForThisSubAgency.forEach(prime => {
                    const primeNode = {
                        name: truncateText(prime.name, 25),
                        id: prime.id,
                        value: prime.value || 0,
                        type: 'prime',
                        children: []
                    };

                    const subIds = prime.subs instanceof Set ? Array.from(prime.subs) : (prime.subs || []);
                    const topSubsForThisPrime = subIds
                        .map(subId => model.subs[subId])
                        .filter(Boolean)
                        .sort((a, b) => (b.value || 0) - (a.value || 0))
                        .slice(0, 3); // Top 3 Subs for this Prime

                    topSubsForThisPrime.forEach(sub => {
                        primeNode.children.push({
                            name: truncateText(sub.name, 20),
                            id: sub.id,
                            value: sub.value || 0,
                            type: 'sub'
                        });
                    });

                    if (primeNode.value > 0 || primeNode.children.length > 0) {
                        subAgencyNode.children.push(primeNode);
                    }
                });
                
                if (subAgencyNode.value > 0 || subAgencyNode.children.length > 0) {
                    agencyNode.children.push(subAgencyNode);
                }
            });

            if (agencyNode.value > 0 || agencyNode.children.length > 0) {
                rootNode.children.push(agencyNode);
            }
        });
        
        if (rootNode.children.length === 0) {
            rootNode.children.push({ 
                name: "No hierarchical data to display.", 
                id: "placeholder-h", 
                value: 1, 
                type: 'placeholder' 
            });
        }
        
        return rootNode;
    }

    // --- Dashboard Rendering ---
    function renderMainDashboard(data) {
        if (!dashboardContainer) {
            console.error("FATAL: dashboardContainer DOM element not found in renderMainDashboard.");
            return;
        }
        
        if (!data) {
            console.error("renderMainDashboard: No display data provided.");
            dashboardContainer.innerHTML = `<div class="loader"><p>Error: Missing data for dashboard rendering.</p></div>`;
            return;
        }

        console.log("renderMainDashboard: Starting to generate HTML...");
        
        // Destroy existing Chart.js instances
        Object.values(chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        chartInstances = {};

        try {
            // Create table rows HTML
            const primeRowsHtml = (data.topPrimesTableData || []).map(p => `
                <tr>
                    <td>${p.usaspendingLink ? `<a href="${p.usaspendingLink}" target="_blank">${truncateText(p.name, 30)}</a>` : truncateText(p.name, 30)}</td>
                    <td class="number-cell">${formatCurrencyShort(p.value)}</td>
                    <td class="number-cell">${p.awards}</td>
                    <td class="number-cell">${p.avgDuration} days</td>
                    <td>${truncateText(p.primaryNaics, 40)}</td>
                </tr>
            `).join('');
            
            const expiringRowsHtml = (data.expiringContractsTableData || []).map(c => `
                <tr>
                    <td>${c.id !== "N/A" ? `<a href="https://www.usaspending.gov/award/${c.id}" target="_blank">${c.id}</a>` : 'N/A'}</td>
                    <td>${truncateText(c.contractor, 30)}</td>
                    <td>${truncateText(c.description, 40)}</td>
                    <td>${c.endDate}</td>
                    <td class="number-cell">${formatCurrencyShort(c.value)}</td>
                </tr>
            `).join('');
            
            // JSON data for charts
            const tavTcvChartDataForScript = JSON.stringify((data.tavTcvChart || []).map(d => ({
                ...d, 
                link: d.id !== "N/A" ? `https://www.usaspending.gov/award/${d.id}` : null 
            })));

            // Main dashboard HTML template
            const html = `
                <div class="dashboard-grid">
                    <div class="col-span-12">
                        <div class="dashboard-header">
                            <div>
                                <h2 class="dashboard-title"><span class="dashboard-agency">${data.agencyName || 'Agency'}</span> Dashboard</h2>
                                <p class="dashboard-subtitle">Data as of: ${data.updateDateMonthYear || 'N/A'}</p>
                            </div>
                            <div class="date-indicator">${data.currentDateFormatted || 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div class="col-span-12">
                        <div class="insight-card">
                            <h3>Executive Summary</h3>
                            <p>Approx. recent obligations: <strong>${data.totalAwardedFY || '$0'}</strong>. Key NAICS: <strong>${data.mostUsedNaicsFullText || 'N/A'}</strong>.
Expiring soon: <strong>${data.expiringCount || 0}</strong> awards (<strong>${data.expiringValueFormatted || '$0'}</strong>) in next 6 months.</p>
<h4>Key Intelligence:</h4>
<ul>
    <li>Top Prime: <strong>${data.topPrimeName || 'N/A'}</strong></li>
    <li>Top Sub: <strong>${data.topSubName || 'N/A'}</strong></li>
    <li>Dominant Services: <strong>${data.dominantNaicsTextShort || 'N/A'}</strong></li>
    <li>ARR for ${data.arrNaicsCode || 'N/A'}: ~<strong>${data.arrForTopNaics || '$0'}</strong></li>
    <li>Place of Performance: ${data.geoDistributionText || 'N/A'}</li>
</ul>
</div>
</div>

<div class="col-span-12">
    <div class="insight-card">
        <h3>Opportunity Triggers</h3>
        <ul>
            <li>Target <strong>${data.expiringCount || 0} expiring contracts (${data.expiringValueFormatted || '$0'})</strong> for near-term pursuits.</li>
            <li>Explore teaming with/competing against <strong>${data.topPrimeName || 'N/A'}</strong>.</li>
            <li>Investigate needs within <strong>${data.mostUsedNaicsCode || 'N/A'}</strong>.</li>
        </ul>
    </div>
</div>

<div class="col-span-12">
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${data.topPrimeName || 'N/A'}</div>
            <div class="stat-label">Top Prime</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.topSubName || 'N/A'}</div>
            <div class="stat-label">Top Sub</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.mostUsedNaicsCode || 'N/A'}</div>
            <div class="stat-label">Top NAICS</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.totalAwardedFY || '$0'}</div>
            <div class="stat-label">Total Obligated</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.expiringCount || 0}</div>
            <div class="stat-label">Expiring Soon</div>
        </div>
    </div>
</div>

<div class="col-span-6">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">Top Primes</h3>
        </div>
        <div class="chart-container">
            <canvas id="main-contractors-chart"></canvas>
        </div>
    </div>
</div>

<div class="col-span-6">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">NAICS Distribution</h3>
        </div>
        <div class="chart-container">
            <canvas id="main-naics-chart"></canvas>
        </div>
    </div>
</div>

<div class="col-span-12">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">Top Contracts: TAV vs TCV</h3>
        </div>
        <div class="chart-container">
            <canvas id="main-tav-tcv-chart"></canvas>
        </div>
    </div>
</div>

<div class="col-span-8">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">Geographic Distribution (PoP)</h3>
        </div>
        <div id="main-map-viz" class="d3-container">
            <div class="loading-placeholder">Initializing Map...</div>
        </div>
    </div>
</div>

<div class="col-span-4">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">ARR Estimator</h3>
        </div>
        <div class="arr-estimator">
            <div class="arr-value">${data.arrEstimatorData?.arrFormatted || '$0'}</div>
            <div class="arr-details">
                <div class="arr-naics">For NAICS ${data.arrEstimatorData?.naicsCode || 'N/A'}</div>
                <div class="arr-naics">${data.arrEstimatorData?.naicsDescription || 'N/A'}</div>
                <div class="arr-metrics">Avg. Contract: ${data.arrEstimatorData?.avgContractSizeFormatted || '$0'} over ${data.arrEstimatorData?.avgDurationText || 'N/A'}</div>
            </div>
        </div>
    </div>
</div>

<div class="col-span-12">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">Key Relationships</h3>
        </div>
        <div id="main-dendrogram-viz" class="d3-container d3-container-large">
            <div class="loading-placeholder">Initializing Relationships...</div>
        </div>
    </div>
</div>

<div class="col-span-12">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">Top 10 Primes</h3>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Contractor</th>
                        <th>Total Value</th>
                        <th>Awards</th>
                        <th>Avg Duration</th>
                        <th>Primary NAICS</th>
                    </tr>
                </thead>
                <tbody>${primeRowsHtml}</tbody>
            </table>
        </div>
    </div>
</div>

<div class="col-span-12">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">Expiring Contracts (Next 6 Months)</h3>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Contractor</th>
                        <th>Description</th>
                        <th>End Date</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>${expiringRowsHtml}</tbody>
            </table>
        </div>
    </div>
</div>

<div class="col-span-12">
    <div class="card">
        <div class="chart-header">
            <h3 class="chart-title">Relationship Insights</h3>
        </div>
        <div class="relationship-insights">
            ${data.relationshipSummary || '<p>No specific relationship insights available.</p>'}
        </div>
    </div>
</div>
`;

dashboardContainer.innerHTML = html; 
console.log("renderMainDashboard: HTML injected.");
dashboardContainer.classList.remove('dashboard-loading'); 

// Initialize Chart.js charts
Chart.defaults.color = getCssVar('--color-text-secondary') || '#555555';
Chart.defaults.borderColor = getCssVar('--color-border') || '#e1e4e8';

// Contractors Chart
const contractorsChartData = data.primeContractorsChart || { labels: [], values: [] };
if (document.getElementById('main-contractors-chart')) {
    chartInstances.primes = new Chart(
        document.getElementById('main-contractors-chart').getContext('2d'), 
        { 
            type: 'bar', 
            data: { 
                labels: contractorsChartData.labels, 
                datasets: [{
                    label: 'Value',
                    data: contractorsChartData.values, 
                    backgroundColor: contractorsChartData.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
                }]
            }, 
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => formatCurrencyShort(c.raw)
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: getCssVar('--color-border') || '#e1e4e8'
                        },
                        ticks: {
                            callback: v => formatCurrencyShort(v)
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { size: 11 }
                        }
                    }
                }
            }
        }
    );
}

// NAICS Distribution Chart
const naicsChartData = data.naicsDistributionChart || { labels: [], values: [] };
if (document.getElementById('main-naics-chart')) {
    chartInstances.naics = new Chart(
        document.getElementById('main-naics-chart').getContext('2d'), 
        { 
            type: 'doughnut', 
            data: { 
                labels: naicsChartData.labels, 
                datasets: [{
                    data: naicsChartData.values, 
                    backgroundColor: naicsChartData.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                    borderColor: getCssVar('--color-surface') || 'white',
                    borderWidth: 1
                }]
            }, 
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            font: { size: 11 },
                            generateLabels: c => c.data.labels.map((l, i) => ({
                                text: `${l} (${c.data.datasets[0].data[i]}%)`,
                                fillStyle: CHART_COLORS[i % CHART_COLORS.length]
                            }))
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: c => `${c.label}: ${c.raw}%`
                        }
                    }
                }
            }
        }
    );
}

// TAV-TCV Chart
if (document.getElementById('main-tav-tcv-chart')) {
    const tavTcvData = JSON.parse(tavTcvChartDataForScript); 
    chartInstances.tavTcv = new Chart(
        document.getElementById('main-tav-tcv-chart').getContext('2d'), 
        {
            type: 'bar', 
            data: { 
                labels: tavTcvData.map(d => d.name), 
                datasets: [
                    {
                        label: 'TAV',
                        data: tavTcvData.map(d => d.tav),
                        backgroundColor: getCssVar('--chart-color-4') || '#f72585',
                        stack: 's0'
                    },
                    {
                        label: 'TCV Remainder',
                        data: tavTcvData.map(d => d.tcvRemainder),
                        backgroundColor: getCssVar('--chart-color-1') || '#4361ee',
                        stack: 's0'
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false, 
                onClick: (e, els) => {
                    if (els.length > 0) {
                        const idx = els[0].index; 
                        const link = tavTcvData[idx].link; 
                        if (link) window.open(link, '_blank');
                    }
                }, 
                onHover: (e, el) => {
                    if (e.native && e.native.target) {
                        e.native.target.style.cursor = el[0] && tavTcvData[el[0].index].link ? 'pointer' : 'default';
                    }
                }, 
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        callbacks: {
                            label: c => `${c.dataset.label}: ${formatCurrencyShort(c.raw)}`, 
                            footer: items => {
                                let total = 0; 
                                if (items[0]) {
                                    const dIdx = items[0].dataIndex; 
                                    total = tavTcvData[dIdx].totalTcv;
                                } 
                                return `Total TCV: ${formatCurrencyShort(total)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            color: getCssVar('--color-border') || '#e1e4e8'
                        },
                        ticks: {
                            callback: v => formatCurrencyShort(v)
                        }
                    },
                    y: {
                        stacked: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { size: 11 }
                        }
                    }
                }
            }
        }
    );
}

console.log("renderMainDashboard: Chart.js charts initialized.");

// Call D3 rendering functions for map and dendrogram
if (data.mapChartData && Object.keys(data.mapChartData).length > 0) {
    renderMap(data.mapChartData, 'main-map-viz');
} else {
    const mapVizContainer = document.getElementById('main-map-viz');
    if (mapVizContainer) {
        mapVizContainer.innerHTML = '<div class="loading-placeholder">Map data not available for this selection.</div>';
    }
}

if (data.dendrogramChartData && data.dendrogramChartData.children && 
    data.dendrogramChartData.children.length > 0 && 
    (data.dendrogramChartData.children[0].name !== "No detailed prime/sub data available in this view." && 
     data.dendrogramChartData.children[0].name !== "No Agency Data")) {
    renderDendrogram(data.dendrogramChartData, 'main-dendrogram-viz');
} else {
    const dendroVizContainer = document.getElementById('main-dendrogram-viz');
    if (dendroVizContainer) {
        dendroVizContainer.innerHTML = '<div class="loading-placeholder">Relationship data not available for this selection.</div>';
    }
}

console.log("renderMainDashboard: D3 visualizations attempted.");

        } catch (renderError) {
            console.error("Error during renderMainDashboard:", renderError);
            dashboardContainer.innerHTML = `
                <div class="loader">
                    <p>Critical error rendering dashboard: ${renderError.message}</p>
                    <p class="small">Please check console for details and try again</p>
                </div>
            `;
            updateStatus('Error rendering dashboard.', 'error');
        }
    }
function renderMap(mapData, targetDivId) {
    const container = document.getElementById(targetDivId);
    if (!container) { 
        console.error(`Map container #${targetDivId} not found.`); 
        return; 
    }
    
    container.innerHTML = ''; // Clear previous

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;
    
    if (width <= 0 || height <= 0 || !mapData || Object.keys(mapData).length === 0) {
        container.innerHTML = '<div class="loading-placeholder">No geographic data to display.</div>';
        return;
    }

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);
    
    const values = Object.values(mapData).map(d => d.value);
    
    // Create a consistent color scale using our gradient colors
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(values) || 1])
        .interpolator(d3.interpolateRgbBasis([
            getCssVar('--map-color-1') || '#caf0f8',
            getCssVar('--map-color-2') || '#90e0ef',
            getCssVar('--map-color-3') || '#48b5c4',
            getCssVar('--map-color-4') || '#0096c7',
            getCssVar('--map-color-5') || '#0077b6',
            getCssVar('--map-color-6') || '#023e8a'
        ]));
    
    const path = d3.geoPath();

    // Tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "d3-tooltip")
        .style("visibility", "hidden");

    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
        const states = topojson.feature(us, us.objects.states);
        const projection = d3.geoAlbersUsa().fitSize([width, height], states);
        path.projection(projection);

        svg.append("g")
            .selectAll("path")
            .data(states.features)
            .join("path")
            .attr("fill", d => { 
                const fips = d.id.padStart(2, '0'); 
                return mapData[fips] ? colorScale(mapData[fips].value) : getCssVar('--color-border') || '#e1e4e8'; 
            })
            .attr("d", path)
            .attr("stroke", getCssVar('--color-surface') || "white")
            .attr("stroke-width", 0.5)
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill-opacity", 0.7);
                const fips = d.id.padStart(2, '0');
                const stateInfo = mapData[fips];
                tooltip.style("visibility", "visible")
                       .html(`${d.properties.name}<br>Value: ${stateInfo ? formatCurrencyShort(stateInfo.value) : 'N/A'}<br>Contracts: ${stateInfo ? stateInfo.count : 'N/A'}`);
            })
            .on("mousemove", (event) => tooltip
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px"))
            .on("mouseout", function() { 
                d3.select(this).attr("fill-opacity", 1); 
                tooltip.style("visibility", "hidden"); 
            });
    }).catch(error => {
        console.error("Error loading map topojson:", error);
        container.innerHTML = '<div class="loading-placeholder">Error loading map data.</div>';
    });
    
    // Add a better legend with the new color palette
    const legendData = d3.range(6).map(i => ({
        color: GRADIENT_COLORS[i],
        value: i === 0 ? 0 : d3.max(values) * (i / 5)
    }));
    
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 120}, ${height - 120})`);
    
    legend.append("rect")
        .attr("width", 100)
        .attr("height", 100)
        .attr("fill", "white")
        .attr("opacity", 0.7)
        .attr("rx", 4)
        .attr("ry", 4);
    
    legend.append("text")
        .attr("x", 10)
        .attr("y", 20)
        .text("Contract Value")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", getCssVar('--color-text-primary') || '#333333');
    
    legendData.forEach((d, i) => {
        legend.append("rect")
            .attr("x", 10)
            .attr("y", 30 + i * 12)
            .attr("width", 12)
            .attr("height", 8)
            .attr("fill", d.color);
        
        legend.append("text")
            .attr("x", 26)
            .attr("y", 37 + i * 12)
            .text(formatCurrencyShort(d.value))
            .attr("font-size", "9px")
            .attr("fill", getCssVar('--color-text-secondary') || '#555555');
    });
}
function renderDendrogram(hierarchyData, targetDivId) {
    const container = document.getElementById(targetDivId);
    if (!container) { 
        console.error(`Dendrogram container #${targetDivId} not found.`); 
        return; 
    }
    
    container.innerHTML = ''; // Clear previous content

    const { width, height } = container.getBoundingClientRect();

    if (width <= 0 || height <= 0 || !hierarchyData || hierarchyData.children.length === 0 ||
        (hierarchyData.children.length === 1 && hierarchyData.children[0].id === 'placeholder-h')) {
        container.innerHTML = '<div class="loading-placeholder">No hierarchical relationship data to display for this selection.</div>';
        return;
    }

    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy(hierarchyData, d => d.children);
    root.sum(d => Math.max(1, d.value || 0));
    root.sort((a, b) => (b.height - a.height) || (b.value - a.value));

    // Tree layout for a hierarchical view
    const treeLayout = d3.tree().size([innerHeight, innerWidth]);
    treeLayout(root);

    // Links between nodes with gradient effect
    const linkGradient = svg.append("defs").selectAll("linearGradient")
        .data(root.links())
        .join("linearGradient")
        .attr("id", (d, i) => `link-gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d => d.source.y)
        .attr("y1", d => d.source.x)
        .attr("x2", d => d.target.y)
        .attr("y2", d => d.target.x);

    // Update node colors using our new color palette
    const nodeColors = {
        root: getCssVar('--chart-color-1') || '#4361ee',
        agency: getCssVar('--chart-color-2') || '#3a0ca3',
        subagency: getCssVar('--chart-color-3') || '#7209b7',
        prime: getCssVar('--chart-color-4') || '#f72585',
        sub: getCssVar('--chart-color-5') || '#4cc9f0',
        placeholder: getCssVar('--color-text-tertiary') || '#777777'
    };

    linkGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d => nodeColors[d.source.data.type] || nodeColors.root);

    linkGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d => nodeColors[d.target.data.type] || nodeColors.sub);

    // Links between nodes
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("stroke", (d, i) => `url(#link-gradient-${i})`)
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));

    // Nodes (circles)
    const node = svg.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.y},${d.x})`);

    // Add glow effect for nodes
    const defs = svg.append("defs");
    
    Object.entries(nodeColors).forEach(([type, color]) => {
        const filter = defs.append("filter")
            .attr("id", `glow-${type}`)
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
            
        filter.append("feGaussianBlur")
            .attr("stdDeviation", "2")
            .attr("result", "coloredBlur");
            
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode")
            .attr("in", "coloredBlur");
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");
    });

    node.append("circle")
        .attr("fill", d => nodeColors[d.data.type] || nodeColors.placeholder)
        .attr("r", d => d.depth === 0 ? 7 : d.children ? 5 : 4)
        .attr("filter", d => d.depth === 0 ? `url(#glow-${d.data.type || 'root'})` : null);

    // Node labels
    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.children ? -8 : 8)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name)
        .style("font-size", d => d.depth === 0 ? "12px" : d.depth <= 2 ? "10px" : "9px")
        .style("fill", getCssVar('--color-text-secondary') || '#555555')
        .clone(true)
        .lower()
        .attr("stroke", getCssVar('--color-surface') || "white")
        .attr("stroke-width", 3); // Text outline for better readability

    // Enhanced tooltip for more information
    const tooltip = d3.select("body")
        .selectAll(".d3-tooltip")
        .data([null])
        .join("div")
        .attr("class", "d3-tooltip")
        .style("visibility", "hidden");

    node.on("mouseover", (event, d) => {
        tooltip.style("visibility", "visible")
            .html(`
                <div style="font-weight:bold;color:${nodeColors[d.data.type] || '#333'}">
                    ${d.data.name}
                </div>
                <div>Type: ${d.data.type}</div>
                <div>Value: ${formatCurrencyShort(d.data.value || d.value)}</div>
                ${d.children ? `<div>Child nodes: ${d.children.length}</div>` : ''}
            `)
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px");
        
        d3.select(event.currentTarget).select("circle")
            .attr("r", (d.children ? 5 : 4) + 2)
            .attr("filter", `url(#glow-${d.data.type || 'placeholder'})`);
    })
    .on("mouseout", (event, d) => {
        tooltip.style("visibility", "hidden");
        d3.select(event.currentTarget).select("circle")
            .attr("r", d.depth === 0 ? 7 : d.children ? 5 : 4)
            .attr("filter", d.depth === 0 ? `url(#glow-${d.data.type || 'root'})` : null);
    });
}
function populateDatasetSelector() {
    // Group datasets by agency name (part before ' (')
    const agencyGroups = {};
    DATASETS_CONFIG.forEach(dataset => {
        const agencyName = dataset.name.split(' (')[0];
        if (!agencyGroups[agencyName]) {
            agencyGroups[agencyName] = { name: agencyName, datasets: [] };
        }
        agencyGroups[agencyName].datasets.push(dataset);
    });

    datasetSelect.innerHTML = '<option value="">Choose an agency...</option>';
    
    let socomCombinedValue = null; // Store the SOCOM combined value
    
    Object.values(agencyGroups)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(group => {
            const optGroup = document.createElement('optgroup');
            optGroup.label = group.name;
            
            const primeDataset = group.datasets.find(d => d.type === 'primes');
            const subDataset = group.datasets.find(d => d.type === 'subs');

            // Offer combined option if both prime and sub datasets exist
            if (primeDataset && subDataset) {
                const combinedOpt = document.createElement('option');
                const combinedValue = `combined:${primeDataset.id},${subDataset.id}`;
                combinedOpt.value = combinedValue;
                combinedOpt.textContent = `${group.name} (Primes & Subs)`;
                optGroup.appendChild(combinedOpt);
                
                // Check if this is SOCOM combined and store its value
                if (group.name === 'SOCOM') {
                    socomCombinedValue = combinedValue;
                }
            }
            
            // Add individual dataset options
            group.datasets.forEach(ds => {
                const option = document.createElement('option');
                option.value = ds.id;
                option.textContent = ds.name;
                optGroup.appendChild(option);
            });
            
            datasetSelect.appendChild(optGroup);
        });
        
    // If SOCOM combined value was found, preselect it and trigger loading
    if (socomCombinedValue) {
        datasetSelect.value = socomCombinedValue;
        // Trigger the loading after a short delay to ensure the UI is ready
        setTimeout(() => handleDatasetSelection(), 100);
    }
}
    function populateFilterDropdowns(model) {
        // NAICS Filter
        naicsFilterEl.innerHTML = '<option value="">All NAICS</option>';
        
        if (model && model.stats && model.stats.allNaics) {
            // Sort NAICS codes alphabetically for the dropdown
            const sortedNaics = Array.from(model.stats.allNaics.entries())
                .sort(([codeA], [codeB]) => codeA.localeCompare(codeB));

            sortedNaics.forEach(([code, desc]) => {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = `${code} - ${truncateText(desc, 50)}`;
                naicsFilterEl.appendChild(option);
            });
        }
        
        // Sub-Agency Filter
        subAgencyFilterEl.innerHTML = '<option value="">All Sub-Agencies</option>';
        
        if (model && model.stats && model.stats.allSubAgencies) {
            Array.from(model.stats.allSubAgencies)
                .sort()
                .forEach(subAgency => {
                    if (subAgency && subAgency !== "N/A") {
                        const option = document.createElement('option');
                        option.value = subAgency;
                        option.textContent = subAgency;
                        subAgencyFilterEl.appendChild(option);
                    }
                });
        }
    }

    async function fetchDataset(datasetConfig) {
    const csvUrl = `${S3_BASE_URL}${datasetConfig.id}.csv`;
    updateStatus(`Loading ${datasetConfig.name}...`, 'info');
    console.log(`Attempting to fetch data from: ${csvUrl}`);
    
    try {
        const response = await fetch(csvUrl, { 
            mode: 'cors', 
            cache: 'no-cache',
            headers: {
                'Accept': 'text/csv,text/plain,*/*'
            }
        });
        
        if (!response.ok) {
            const errorMsg = `HTTP error ${response.status} (${response.statusText})`;
            console.error(`${errorMsg} for ${datasetConfig.name}`);
            throw new Error(errorMsg);
        }
        
        const csvText = await response.text();
        
        if (!csvText || csvText.trim() === '') {
            throw new Error('Empty response received');
        }
        
        console.log(`Successfully fetched ${csvText.length} bytes for ${datasetConfig.name}`);
        
        const parseResult = Papa.parse(csvText, { 
            header: true, 
            dynamicTyping: false, 
            skipEmptyLines: 'greedy', 
            transformHeader: h => h.trim() 
        });
        
        if (parseResult.errors.length > 0) {
            console.warn(`Parsing errors in ${datasetConfig.name}:`, parseResult.errors);
        }
        
        if (!parseResult.data || parseResult.data.length === 0) {
            throw new Error('No data rows found after parsing CSV');
        }
        
        console.log(`Successfully parsed ${parseResult.data.length} rows for ${datasetConfig.name}`);
        return parseResult.data;
    } catch (error) {
        console.error(`Failed to fetch or parse data for ${datasetConfig.name}:`, error);
        
        // Check for common CORS issues
        if (error instanceof TypeError && 
            (error.message.includes('Failed to fetch') || 
             error.message.includes('NetworkError'))) {
            throw new Error(`Network or CORS error - check console and S3 bucket configuration`);
        }
        
        throw new Error(`${error.message} when loading ${datasetConfig.name}`);
    }
}

    function applyFiltersAndRedraw() {
        if (!unifiedModel) {
            updateStatus('No data available to apply filters. Please select an agency.', 'info');
            dashboardContainer.innerHTML = `
                <div class="loader">
                    <p>No data loaded. Please select an agency.</p>
                </div>
            `;
            return;
        }

        console.log("applyFiltersAndRedraw: Preparing to filter and redraw dashboard...");
        updateStatus('Applying filters and updating view...', 'info');

        try {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const selectedSubAgency = subAgencyFilterEl.value;
            const selectedNaics = naicsFilterEl.value;

            let filteredPrimesList = rawData.primes; // Start with full raw data for filtering
            let filteredSubsList = rawData.subs;

            // Apply search filter
            if (searchTerm) {
                filteredPrimesList = rawData.primes.filter(c =>
                    Object.values(c).some(val => String(val).toLowerCase().includes(searchTerm))
                );
                
                filteredSubsList = rawData.subs.filter(c =>
                    Object.values(c).some(val => String(val).toLowerCase().includes(searchTerm))
                );
            }
            
            // Apply sub-agency filter
            if (selectedSubAgency) {
                filteredPrimesList = filteredPrimesList.filter(c => 
                    c.subAgencyName === selectedSubAgency
                );
                
                filteredSubsList = filteredSubsList.filter(c => 
                    c.subAgencyName === selectedSubAgency
                );
            }
            
            // Apply NAICS filter
            if (selectedNaics) {
                filteredPrimesList = filteredPrimesList.filter(c => 
                    c.naicsCode === selectedNaics
                );
                
                filteredSubsList = filteredSubsList.filter(c => 
                    c.naicsCode === selectedNaics
                );
            }
            
            console.log(`applyFiltersAndRedraw: Filtered to ${filteredPrimesList.length} primes, ${filteredSubsList.length} subs.`);
            
            // Build a new model from the filtered data
            const filteredDisplayModel = buildUnifiedModelFromProcessed(filteredPrimesList, filteredSubsList);
            console.log("applyFiltersAndRedraw: Built filteredDisplayModel.");

            // Aggregate data for dashboard visualization
            const displayData = aggregateDataForDashboardView(filteredDisplayModel);
            console.log("applyFiltersAndRedraw: Aggregated displayData.");

            if (displayData) {
                renderMainDashboard(displayData); // This function updates dashboardContainer.innerHTML
                updateStatus('Dashboard updated successfully.', 'success', true);
            } else {
                throw new Error("Could not prepare data for display after filtering.");
            }
        } catch (error) {
            console.error("Error during applyFiltersAndRedraw:", error);
            // If renderMainDashboard fails, ensure we show an error message
            dashboardContainer.innerHTML = `
                <div class="loader">
                    <p>An error occurred while updating the view: ${error.message}</p>
                    <p class="small">Check console for details</p>
                </div>
            `;
            updateStatus(`Error updating view: ${error.message}`, 'error');
        }
    }

    function updateStatus(message, type = 'info', autoDismiss = false) {
        if (!statusBanner) return;
        
        statusBanner.textContent = message;
        statusBanner.className = `status-${type}`; // e.g., status-info, status-success, status-error
        
        // Clear any existing auto-dismiss timer
        if (statusBanner.dismissTimer) {
            clearTimeout(statusBanner.dismissTimer);
        }

        if (autoDismiss) {
            statusBanner.dismissTimer = setTimeout(() => {
                if (statusBanner.textContent === message) { // Only clear if it's still the same message
                    statusBanner.textContent = 'Ready';
                    statusBanner.className = 'status-info';
                }
            }, 3000);
        }
    }

    // --- Theme Handling ---
    function initTheme() {
        const savedTheme = localStorage.getItem('dashboard-theme');
        
        // Apply saved theme or system preference
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark-theme');
            themeIcon.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
            `;
        } else {
            themeIcon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
        }
        
        // Set up theme toggle event
        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark-theme');
            const isDarkMode = document.documentElement.classList.contains('dark-theme');
            
            // Update theme icon
            if (isDarkMode) {
                themeIcon.innerHTML = `
                    <circle cx="12" cy="12" r="5"></circle>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                `;
            } else {
                themeIcon.innerHTML = `
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                `;
            }
            
            // Save preference
            localStorage.setItem('dashboard-theme', isDarkMode ? 'dark' : 'light');
            
            // Re-render charts if model exists (as colors might change)
            if (unifiedModel) {
                applyFiltersAndRedraw();
            }
        });
    }

    // --- Mobile Menu Handling ---
    function initMobileMenu() {
        // Toggle sidebar visibility on mobile
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
        
        // Close sidebar when clicking close button
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                e.target !== mobileMenuToggle && 
                !mobileMenuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
        
        // Close sidebar after selecting an option on mobile
        datasetSelect.addEventListener('change', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    }
async function handleDatasetSelection() {
    const selectedValue = datasetSelect.value;
    
    if (!selectedValue) {
        updateStatus('Please select an agency.', 'info');
        return;
    }
    
    if (isLoading) {
        updateStatus('Operation in progress, please wait...', 'info');
        return; // Prevent concurrent operations
    }

    isLoading = true;
    applyFiltersBtn.disabled = true;
    console.log(`handleDatasetSelection: Initiating load for ${selectedValue}`);
    
    dashboardContainer.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
            <p>Loading data for selected dataset...</p>
            <p class="small" id="loading-detail">Initializing...</p>
        </div>
    `;
    
    const loadingDetail = document.getElementById('loading-detail');
    
    rawData = { primes: [], subs: [] };
    unifiedModel = null;
    
    // Clear filter options before repopulating
    naicsFilterEl.innerHTML = '<option value="">All NAICS</option>';
    subAgencyFilterEl.innerHTML = '<option value="">All Sub-Agencies</option>';

    let datasetsToLoadConfigs = [];
    
    if (selectedValue.startsWith('combined:')) {
        const ids = selectedValue.split(':')[1].split(',');
        datasetsToLoadConfigs = ids
            .map(id => DATASETS_CONFIG.find(ds => ds.id === id))
            .filter(Boolean);
    } else {
        const singleConfig = DATASETS_CONFIG.find(ds => ds.id === selectedValue);
        if (singleConfig) datasetsToLoadConfigs.push(singleConfig);
    }

    if (datasetsToLoadConfigs.length === 0) {
        updateStatus('Invalid dataset selection.', 'error');
        dashboardContainer.innerHTML = `
            <div class="loader">
                <p>Invalid dataset selected. Please choose another.</p>
            </div>
        `;
        isLoading = false;
        applyFiltersBtn.disabled = false;
        return;
    }

    try {
        const agencyDisplayNamesText = datasetsToLoadConfigs.map(d => d.name).join(' & ');
        updateStatus(`Loading ${agencyDisplayNamesText}...`, 'info');
        
        if (loadingDetail) {
            loadingDetail.textContent = `Preparing to load ${datasetsToLoadConfigs.length} dataset(s)...`;
        }

        for (const [index, config] of datasetsToLoadConfigs.entries()) {
            if (loadingDetail) {
                loadingDetail.textContent = `Loading dataset ${index + 1}/${datasetsToLoadConfigs.length}: ${config.name}...`;
            }
            
            try {
                const fetchedData = await fetchDataset(config);
                
                if (loadingDetail) {
                    loadingDetail.textContent = `Processing dataset: ${config.name}...`;
                }
                
                const processed = processRawDataset(fetchedData, config.type);
                
                if (config.type === 'primes') {
                    rawData.primes = rawData.primes.concat(processed);
                } else if (config.type === 'subs') {
                    rawData.subs = rawData.subs.concat(processed);
                }
                
                if (loadingDetail) {
                    loadingDetail.textContent = `Successfully loaded ${config.name} (${processed.length} records)`;
                }
            } catch (fetchError) {
                console.error(`Error loading dataset ${config.name}:`, fetchError);
                if (loadingDetail) {
                    loadingDetail.textContent = `Error loading ${config.name}: ${fetchError.message}`;
                }
                // Try to continue with other datasets if any
            }
        }
        
        if ((rawData.primes.length === 0 && rawData.subs.length === 0)) {
            throw new Error("No data was successfully loaded from any dataset.");
        }
        
        console.log("handleDatasetSelection: Raw data fetched and processed.");
        if (loadingDetail) {
            loadingDetail.textContent = "Building data model...";
        }

        unifiedModel = buildUnifiedModelFromProcessed(rawData.primes, rawData.subs);
        console.log("handleDatasetSelection: Unified model built.");

        if (unifiedModel) {
            if (loadingDetail) {
                loadingDetail.textContent = "Populating filters...";
            }
            
            populateFilterDropdowns(unifiedModel);
            console.log("handleDatasetSelection: Filters populated.");
            
            if (loadingDetail) {
                loadingDetail.textContent = "Rendering dashboard...";
            }
            
            applyFiltersAndRedraw(); // This will render the dashboard
        } else {
            throw new Error("Failed to build the unified model.");
        }

    } catch (error) {
        console.error("Error during handleDatasetSelection:", error);
        updateStatus(`Failed to load data: ${error.message}`, 'error');
        dashboardContainer.innerHTML = `
            <div class="loader">
                <p>Error loading data: ${error.message}</p>
                <p class="small">Please check console for details or try another dataset</p>
                <div class="error-details">
                    <p>Possible issues:</p>
                    <ul>
                        <li>Network connectivity problems</li>
                        <li>S3 bucket access restrictions</li>
                        <li>CORS configuration issues</li>
                        <li>CSV format problems</li>
                    </ul>
                </div>
            </div>
        `;
    } finally {
        isLoading = false;
        applyFiltersBtn.disabled = false;
        console.log("handleDatasetSelection: Operation finished.");
    }
}
 // --- Initialization ---
    function init() {
        // Initialize theme handling
        initTheme();
        
        // Initialize mobile menu
        initMobileMenu();
        
        // Populate dataset selector
        populateDatasetSelector();
        
        // Set up event listeners
        datasetSelect.addEventListener('change', handleDatasetSelection);
        applyFiltersBtn.addEventListener('click', applyFiltersAndRedraw);
        
        // Debounced search input handling
        let searchDebounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(applyFiltersAndRedraw, 500);
        });
        
        // Filter dropdown event listeners
        subAgencyFilterEl.addEventListener('change', applyFiltersAndRedraw);
        naicsFilterEl.addEventListener('change', applyFiltersAndRedraw);
        
        // Initial status message
        updateStatus('Select an agency to begin', 'info');
        
        // Handle window resize for responsive charts
        window.addEventListener('resize', () => {
            if (unifiedModel && Object.keys(chartInstances).length > 0) {
                // Resize charts (debounced)
                clearTimeout(window.resizeTimer);
                window.resizeTimer = setTimeout(() => {
                    Object.values(chartInstances).forEach(chart => {
                        if (chart && chart.resize) {
                            chart.resize();
                        }
                    });
                }, 250);
            }
        });
    }

    // Initialize the application
    init();
});