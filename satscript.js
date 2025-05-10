document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---

    // Copied from your original wednesday.js and assigned to DATASETS_CONFIG
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

    // Copied from your original wednesday.js and assigned to FIELD_MAP
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


    // --- DOM ELEMENTS ---
    const datasetSelect = document.getElementById('dataset-select');
    const searchInput = document.getElementById('search-input');
    const subAgencyFilterEl = document.getElementById('sub-agency-filter');
    const naicsFilterEl = document.getElementById('naics-filter');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const statusBanner = document.getElementById('status-banner');
    const dashboardContainer = document.getElementById('dashboard-container');
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // --- GLOBAL STATE ---
    let rawData = { primes: [], subs: [] };
    let unifiedModel = null;
    let chartInstances = {}; // To keep track of Chart.js instances for destruction
    let isLoading = false;

    // --- UTILITY FUNCTIONS (Copied and adapted from your wednesday.js) ---

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
            let date = null;
            
            // Try ISO 8601 format (YYYY-MM-DD)
            if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
                date = new Date(dateString);
                if (!isNaN(date.getTime())) return date;
            }
            
            // Try MM/DD/YYYY format
            if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = dateString.split('/');
                date = new Date(parts[2], parseInt(parts[0], 10) - 1, parseInt(parts[1], 10)); // Ensure parts are parsed as integers
                if (!isNaN(date.getTime())) return date;
            }
            
            // Try date-fns if available (though for a lighter app, you might remove this dependency)
            if (typeof dateFns !== 'undefined' && dateFns.parseISO) { // Check for specific function
                const parsedDate = dateFns.parseISO(dateString);
                if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) return parsedDate;
            }
            
            // Last resort: browser's native parsing
            date = new Date(dateString);
            if (!isNaN(date.getTime())) return date;
            
            // Fallback for fiscal year format like "FY18" or "FY 2018" (from original)
            const fyMatch = dateString.match(/FY\s*(\d{2,4})/i);
            if (fyMatch) {
                let year = parseInt(fyMatch[1], 10);
                if (year < 100) year += 2000; // Assume 20xx for 2-digit years
                return new Date(year, 9, 1); // October 1st of the fiscal year
            }
            
            // console.warn(`Could not parse date: "${dateString}"`); // Optional: keep for debugging
            return null;
        } catch (e) {
            // console.error(`Error parsing date: "${dateString}"`, e); // Optional: keep for debugging
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
        
        if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 0;
        }
        // Use date-fns if available (consider removing for lighter app if date-fns isn't strictly needed elsewhere)
        if (typeof dateFns !== 'undefined' && dateFns.differenceInDays) { // Check for specific function
            return dateFns.differenceInDays(end, start) + 1;
        } else {
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays > 0 ? diffDays : 0;
        }
    }

    // Adapted from your formatConciseCurrency for the "short" format
    function formatCurrencyShort(value, defaultIfNaN = '$0') {
        if (value === null || value === undefined) return defaultIfNaN;
        const numValue = typeof value === 'string' ? parseSafeFloat(value) : Number(value);

        if (isNaN(numValue)) return defaultIfNaN;
        
        if (Math.abs(numValue) >= 1000000) {
            return `~$${(numValue / 1000000).toFixed(1)}M`;
        } else if (Math.abs(numValue) >= 1000) {
            return `~$${(numValue / 1000).toFixed(1)}K`;
        } else {
            return `~$${numValue.toFixed(0)}`;
        }
    }
    
    // Standard currency formatter (if needed for non-short display)
    function formatCurrencyStandard(value, defaultIfNaN = '$ -') {
        if (value === null || value === undefined) return defaultIfNaN;
        const numValue = typeof value === 'string' ? parseSafeFloat(value) : Number(value);
        if (isNaN(numValue)) return defaultIfNaN;
        return numValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }


    function truncateText(text, maxLength) {
        if (!text) return '';
        const stringText = String(text);
        return stringText.length > maxLength ? stringText.substring(0, maxLength - 3) + '...' : stringText;
    }

    function getCssVar(varName) {
        // Simplified for the new app, assuming variables are always defined in style.css
        // or provide very basic fallbacks.
        try {
            const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            if (!value) {
                // console.warn(`CSS variable ${varName} not found or empty.`);
                // Basic fallbacks, align with your new style.css defaults
                if (varName === '--color-text-secondary') return '#555555';
                if (varName === '--color-primary') return '#6A5ACD';
                if (varName === '--color-border') return '#D9DEE3';
                if (varName === '--color-surface') return '#FFFFFF';
                return '#cccccc'; // Generic fallback
            }
            return value;
        } catch (e) {
            // console.warn(`Could not get CSS variable ${varName}: ${e.message}`);
            return '#cccccc'; // Generic fallback
        }
    }

    // --- DATA SERVICE (Fetching) ---
    async function fetchDataset(datasetConfig) {
        const csvUrl = `${S3_BASE_URL}${datasetConfig.id}.csv`;
        updateStatus(`Workspaceing ${datasetConfig.name}...`, 'info');
        try {
            const response = await fetch(csvUrl, { mode: 'cors', cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP error ${response.status} for ${datasetConfig.name}`);
            const csvText = await response.text();
            const parseResult = Papa.parse(csvText, { header: true, dynamicTyping: false, skipEmptyLines: 'greedy', transformHeader: h => h.trim() });
            if (parseResult.errors.length > 0) console.warn(`Parsing errors in ${datasetConfig.name}:`, parseResult.errors);
            return parseResult.data;
        } catch (error) {
            console.error(`Error fetching ${datasetConfig.name}:`, error);
            updateStatus(`Error fetching ${datasetConfig.name}: ${error.message}`, 'error');
            throw error; // Re-throw to be caught by caller
        }
    }
// In app.js (replace your existing getGeoDistributionInfo function)

function getGeoDistributionInfo(model) {
    console.log("getGeoDistributionInfo: Starting to process geographic data...");
    if (!model || !model.contracts || Object.keys(model.contracts).length === 0) {
        console.log("getGeoDistributionInfo: No model or contracts data found.");
        return "Place of Performance data not available.";
    }

    const stateValues = {}; // Stores aggregated contract values per FIPS code

    Object.values(model.contracts).forEach((contract, index) => {
        if (!contract || !contract.raw) {
            // console.log(`Contract ${index} missing raw data.`);
            return;
        }

        // Try to get a state identifier from various possible fields
        let stateIdentifierRaw = contract.raw.popStateCode || // Primary field from your FIELD_MAP
                               contract.raw.prime_award_transaction_place_of_performance_state_fips_code ||
                               contract.raw.place_of_performance_state_code;

        if (!stateIdentifierRaw) {
            // console.log(`Contract ${contract.id || 'ID missing'} (raw index ${index}): No state identifier found in raw data.`);
            return;
        }

        let fipsCode = null;
        const identifierStr = String(stateIdentifierRaw).trim().toUpperCase();
        // console.log(`Contract ${contract.id || 'ID missing'} (raw index ${index}): Raw State ID='${stateIdentifierRaw}', Processed ID='${identifierStr}'`);

        // Attempt to normalize identifierStr to a 2-digit FIPS code
        if (/^\d{1,2}$/.test(identifierStr)) { // If it's 1 or 2 digits (e.g., "6", "12")
            fipsCode = identifierStr.padStart(2, '0');
            // console.log(`  Normalized as direct FIPS: '${fipsCode}'`);
        } else if (identifierStr.length === 2 && FIPS_TO_STATE_NAME[identifierStr]) { // If it's already a valid 2-char FIPS key (e.g. "06")
             fipsCode = identifierStr;
             // console.log(`  Recognized as existing FIPS key: '${fipsCode}'`);
        }
        // Add more normalization if needed based on your data, e.g. for 2-letter state codes to FIPS
        // For example, if you often have "VA" instead of "51":
        else if (identifierStr.length === 2 && !/^\d+$/.test(identifierStr)) { // Is it a 2-letter state abbreviation (e.g. "VA")?
            const foundEntry = Object.entries(FIPS_TO_STATE_NAME).find(
                ([key, name]) => name.toUpperCase().split(' ').some(part => part.length === 2 && part === identifierStr) || // Exact match for an abbreviation part
                                name.match(new RegExp(`\\b${identifierStr}\\b`, 'i')) || // Try to match as an abbreviation
                                (key.length === 2 && FIPS_TO_STATE_NAME[key].toUpperCase().substring(0,2) === identifierStr) // Match first two letters of full name
            );
             if (foundEntry) {
                fipsCode = foundEntry[0];
                // console.log(`  Normalized 2-letter abbr '${identifierStr}' to FIPS: '${fipsCode}'`);
            } else {
                // console.log(`  Could not normalize 2-letter abbr: '${identifierStr}'`);
            }
        }


        if (fipsCode && FIPS_TO_STATE_NAME[fipsCode]) {
            if (!stateValues[fipsCode]) {
                stateValues[fipsCode] = 0;
            }
            stateValues[fipsCode] += (contract.value || 0);
            // console.log(`  Added value for FIPS '${fipsCode}' (${FIPS_TO_STATE_NAME[fipsCode]}). Total now: ${stateValues[fipsCode]}`);
        } else if (fipsCode) {
            // console.warn(`  FIPS code '${fipsCode}' (from raw '${stateIdentifierRaw}') not found in FIPS_TO_STATE_NAME map.`);
        } else {
            // console.warn(`  Could not derive a valid FIPS code from raw state identifier: '${stateIdentifierRaw}'`);
        }
    });

    if (Object.keys(stateValues).length === 0) {
        console.log("getGeoDistributionInfo: No state values aggregated.");
        return "No specific geographic concentration identified from available contract data.";
    }

    const sortedStateNames = Object.entries(stateValues)
        .sort(([, valueA], [, valueB]) => valueB - valueA)
        .slice(0, 3) // Top 3 states by aggregated value
        .map(([fipsCode]) => {
            const stateName = FIPS_TO_STATE_NAME[fipsCode];
            if (!stateName) {
                console.warn(`getGeoDistributionInfo - Final Mapping: FIPS code '${fipsCode}' could not be mapped to a state name!`);
                return `Code ${fipsCode}`; // Fallback if still not found
            }
            return stateName;
        });

    console.log("getGeoDistributionInfo: Top states by value:", sortedStateNames);

    if (sortedStateNames.length === 0) {
        return "No specific geographic concentration identified.";
    }
    
    return `Key Places of Performance include: ${sortedStateNames.join(', ')}.`;
}
 // --- DATA PROCESSOR ---
    function processRawDataset(rawRows, datasetType) { // datasetType is 'primes' or 'subs'
        return rawRows.map(row => {
            const cleanRow = { _sourceType: datasetType };
            for (const key in row) {
                if (Object.prototype.hasOwnProperty.call(row, key)) {
                    const value = row[key];
                    cleanRow[key] = typeof value === 'string' ? value.trim() : value;
                }
            }
            for (const field in FIELD_MAP) {
                const sourceField = FIELD_MAP[field][datasetType];
                if (sourceField && cleanRow[sourceField] !== undefined) {
                    cleanRow[field] = cleanRow[sourceField];
                }
            }
            cleanRow.contractValue = parseSafeFloat(cleanRow.contractValue);
            if (datasetType === 'primes') {
                cleanRow.obligatedValue = parseSafeFloat(cleanRow.obligatedValue);
                cleanRow.potentialValue = parseSafeFloat(cleanRow.potentialValue);
            }
            cleanRow.parsedStartDate = parseDate(cleanRow.startDate);
            cleanRow.parsedEndDate = parseDate(cleanRow.endDate);
            return cleanRow;
        });
    }

    function buildUnifiedModelFromProcessed(processedPrimes, processedSubs) {
        const model = {
            agencies: {}, subAgencies: {}, offices: {}, primes: {}, subs: {}, contracts: {}, subcontracts: {},
            relationships: { agencyToPrime: [], primeToSub: [] },
            stats: { totalContractValue: 0, totalPrimeContracts: 0, totalSubContracts: 0, allNaics: new Map(), allSubAgencies: new Set() }
        };

        // Process Primes (simplified from wednesday.js buildUnifiedModel)
        (processedPrimes || []).forEach((row, idx) => {
            if (!row.contractValue || row.contractValue <= 0) return;
            const agencyName = row.agencyName || "Unknown Agency";
            const agencyId = `agency-${sanitizeId(agencyName)}`;
            if (!model.agencies[agencyId]) model.agencies[agencyId] = { id: agencyId, name: agencyName, value: 0, contracts: new Set() };
            model.agencies[agencyId].value += row.contractValue;
            model.stats.allSubAgencies.add(row.subAgencyName || "N/A");

            const primeName = row.primeName || "Unknown Prime";
            const primeId = `prime-${sanitizeId(primeName)}-${idx}`; // Add index for more uniqueness if names repeat
            if (!model.primes[primeId]) model.primes[primeId] = { id: primeId, name: primeName, value: 0, contracts: new Set(), subs: new Set() };
            model.primes[primeId].value += row.contractValue;

            const contractId = row.contractId || `prime_contract_${idx}`;
            model.contracts[contractId] = {
                id: contractId, value: row.contractValue, primeId: primeId, agencyId: agencyId,
                description: row.description, naicsCode: row.naicsCode, naicsDesc: row.naicsDesc,
                startDate: row.parsedStartDate, endDate: row.parsedEndDate, raw: row,
                subAgencyName: row.subAgencyName, officeName: row.officeName
            };
            model.agencies[agencyId].contracts.add(contractId);
            model.primes[primeId].contracts.add(contractId);
            model.stats.totalContractValue += row.contractValue;
            if(row.naicsCode && row.naicsDesc) model.stats.allNaics.set(row.naicsCode, row.naicsDesc);

            // Simplified relationship
            model.relationships.agencyToPrime.push({ source: agencyId, target: primeId, value: row.contractValue, contractId });
        });

        // Process Subs (simplified)
        (processedSubs || []).forEach((row, idx) => {
            if (!row.contractValue || row.contractValue <= 0) return;
            const primeName = row.primeName || "Unknown Prime";
            // Attempt to find matching primeId, otherwise create a placeholder if necessary.
            // This part needs careful handling if subs can exist without matching primes in the primes dataset.
            // For simplicity, we'll assume primes are mostly defined by the primes dataset or create a placeholder.
            let primeNode = Object.values(model.primes).find(p => p.name === primeName);
            let primeId;
            if (primeNode) {
                primeId = primeNode.id;
            } else {
                primeId = `prime-${sanitizeId(primeName)}-suboriginated-${idx}`;
                model.primes[primeId] = { id: primeId, name: primeName, value: 0, contracts: new Set(), subs: new Set() };
            }


            const subName = row.subName || "Unknown Sub";
            const subId = `sub-${sanitizeId(subName)}-${idx}`;
            if (!model.subs[subId]) model.subs[subId] = { id: subId, name: subName, value: 0 };
            model.subs[subId].value += row.contractValue;
            model.primes[primeId].subs.add(subId); // Link sub to prime

            const subcontractId = row.subcontractId || `sub_contract_${idx}`;
            model.subcontracts[subcontractId] = {
                id: subcontractId, value: row.contractValue, primeId: primeId, subId: subId,
                description: row.description, naicsCode: row.naicsCode, naicsDesc: row.naicsDesc, // Note: subs often don't have own NAICS in source
                startDate: row.parsedStartDate, endDate: row.parsedEndDate, raw: row
            };
             if(row.naicsCode && row.naicsDesc) model.stats.allNaics.set(row.naicsCode, row.naicsDesc); // If sub has NAICS
             model.stats.allSubAgencies.add(row.subAgencyName || "N/A");


            model.relationships.primeToSub.push({ source: primeId, target: subId, value: row.contractValue, subcontractId });
        });
        model.stats.totalPrimeContracts = Object.keys(model.contracts).length;
        model.stats.totalSubContracts = Object.keys(model.subcontracts).length;

        return model;
    }

    function sanitizeId(text) {
        if (!text) return 'unknown';
        return String(text).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
    }

    function aggregateDataForDashboardView(model) {
        // This function will be very similar to the one developed in the previous step for agency-snapshot-generator.js
        // It calls helpers like getAgencyInfo, getTopNAICSInfo, getExpiringContractsInfo, etc.
        // Ensure these helper functions are defined within this scope or passed `model`.

        // Placeholder for the actual helper functions that you'd copy/adapt:
        const getAgencyInfo = (m) => {
            const agencyName = m.agencies && Object.keys(m.agencies).length > 0 ? Object.values(m.agencies).sort((a,b) => (b.value||0) - (a.value||0))[0]?.name : "Selected Agency";
            return { agencyName, totalAwarded: m.stats?.totalContractValue || 0 };
        };
        const getTopNAICSInfo = (m, topN=5) => {
            const naicsAggregates = {}; let totalValueAllNaics = 0;
            Object.values(m.contracts || {}).forEach(c => {
                if(c.naicsCode && c.value > 0){
                    if(!naicsAggregates[c.naicsCode]) naicsAggregates[c.naicsCode] = {code: c.naicsCode, description: c.naicsDesc || "N/A", value: 0};
                    naicsAggregates[c.naicsCode].value += c.value; totalValueAllNaics += c.value;
                }
            });
            const sorted = Object.values(naicsAggregates).sort((a,b)=>b.value-a.value);
            const chartD = sorted.slice(0,topN).map(n=>({code:n.code, desc:n.description, pct: totalValueAllNaics>0 ? Math.round(n.value/totalValueAllNaics*100):0}));
            if(sorted.length > topN) { const otherV = sorted.slice(topN).reduce((s,i)=>s+i.value,0); if(otherV>0) chartD.push({code:"Other",desc:"Others",pct:totalValueAllNaics>0?Math.round(otherV/totalValueAllNaics*100):0});}
            const topNOverall = sorted.length>0?sorted[0]:{code:"N/A",description:"N/A"};
            const domText = sorted.slice(0,2).map(n=>`${n.code} (${truncateText(n.description,15)})`).join('; ');
            return {topNaicsCode:topNOverall.code, topNaicsDescription:topNOverall.description, dominantNaicsText:domText, distribution:chartD};
        };
        const getExpiringContractsInfo = (m, monthsAhead=6, limit=5) => {
            const exp = {count:0, value:0, list:[]}; if(!m || !m.contracts) return exp;
            const today = new Date(); const future = new Date(today); future.setMonth(today.getMonth()+monthsAhead);
            const expList = Object.values(m.contracts).filter(c=>{
                if(!c.endDate) return false; const eD = c.endDate instanceof Date ? c.endDate : parseDate(c.endDate);
                return eD && !isNaN(eD.getTime()) && eD >= today && eD <= future;
            }).map(c=>({id:c.raw?.contract_award_unique_key || c.id || "N/A", contractor:m.primes[c.primeId]?.name || "N/A", description:truncateText(c.description,40), endDate: (c.endDate instanceof Date ? c.endDate : parseDate(c.endDate))?.toLocaleDateString('en-US') || "N/A", value:c.value||0}))
            .sort((a,b)=>new Date(a.endDate)-new Date(b.endDate));
            exp.count=expList.length; exp.value=expList.reduce((s,c)=>s+c.value,0); exp.list=expList.slice(0,limit); return exp;
        };
        const getTopPrimeContractors = (m, tableLimit=10, chartLimit=7) => {
            const ps = {table:[], chartData:{labels:[],values:[]}}; if(!m || !m.primes || Object.keys(m.primes).length === 0) return ps;
            const sortedPrimes = Object.values(m.primes).map(p=>{
                let avgDur=0, domCode="N/A", domDesc="", awds=0, repConId=null;
                const conIds = p.contracts instanceof Set ? Array.from(p.contracts) : (p.contracts || []); awds = conIds.length;
                if(awds>0 && m.contracts){
                    let totDur=0, durCt=0; const naicsCts={};
                    conIds.forEach((cId,ix)=>{ const con=m.contracts[cId]; if(con){ if(ix===0)repConId=con.raw?.contract_award_unique_key || con.id; if(con.startDate&&con.endDate){const d=calculateDurationDays(con.startDate,con.endDate); if(d>0){totDur+=d; durCt++;}} if(con.naicsCode)naicsCts[con.naicsCode]=(naicsCts[con.naicsCode]||0)+1;}});
                    if(durCt>0)avgDur=Math.round(totDur/durCt); if(Object.keys(naicsCts).length>0){domCode=Object.keys(naicsCts).reduce((a,b)=>naicsCts[a]>naicsCts[b]?a:b); const sCon=conIds.map(id=>m.contracts[id]).find(c=>c&&c.naicsCode===domCode); domDesc=sCon?truncateText(sCon.naicsDesc,20):"";}
                } return {name:p.name||"N/A",value:p.value||0,awards:awds,avgDuration:avgDur,primaryNaics:`${domCode}${domDesc?' - '+domDesc:''}`,usaspendingLink:repConId?`https://www.usaspending.gov/award/${repConId}`:null};
            }).filter(p=>p.value>0).sort((a,b)=>b.value-a.value);
            ps.table=sortedPrimes.slice(0,tableLimit); const chartPs=sortedPrimes.slice(0,chartLimit);
            ps.chartData.labels=chartPs.map(p=>truncateText(p.name,15)); ps.chartData.values=chartPs.map(p=>p.value); return ps;
        };
        const getTopSubContractor = (m) => { if(!m||!m.subs||Object.keys(m.subs).length===0) return "N/A"; const sorted=Object.values(m.subs).sort((a,b)=>(b.value||0)-(a.value||0)); return sorted.length>0?sorted[0].name:"N/A";};
        const getTAVTCVData = (m, limit=7) => {
            if(!m||!m.contracts)return[];
            return Object.values(m.contracts).filter(c=>c.value>0&&c.raw).map(c=>{const pN=m.primes[c.primeId]?.name||"N/A"; const d=c.description||`Contract with ${pN}`; return{id:c.raw?.contract_award_unique_key||c.id||"N/A",name:truncateText(d,30),tav:parseSafeFloat(c.raw.obligatedValue),tcvRemainder:Math.max(0,parseSafeFloat(c.value)-parseSafeFloat(c.raw.obligatedValue)),totalTcv:parseSafeFloat(c.value)};})
            .sort((a,b)=>b.totalTcv-a.totalTcv).slice(0,limit);
        };
        const getARRInfo = (m, targetNaics) => {
            const res={arr:0,avgContractSize:0,avgDurationYears:0,naicsCode:targetNaics||"N/A",naicsDesc:"N/A"};if(!m||!m.contracts||!targetNaics)return res;
            const relCons=Object.values(m.contracts).filter(c=>c.naicsCode===targetNaics&&c.value>0&&c.startDate&&c.endDate); if(relCons.length===0)return res;
            res.naicsDesc=truncateText(relCons[0].naicsDesc,40); let totV=0,totDD=0,valDC=0;
            relCons.forEach(c=>{totV+=c.value; const dur=calculateDurationDays(c.startDate,c.endDate); if(dur>0){totDD+=dur;valDC++;}});
            if(relCons.length>0)res.avgContractSize=totV/relCons.length; if(valDC>0)res.avgDurationYears=(totDD/valDC)/365.25; if(res.avgDurationYears>0)res.arr=res.avgContractSize/res.avgDurationYears; return res;
        };
        const getGeoDistributionInfo = (m) => {
            if(!m||!m.contracts)return "Geo data N/A."; const sCts={}; Object.values(m.contracts).forEach(c=>{const sCo=c.raw?.popStateCode||c.raw?.prime_award_transaction_place_of_performance_state_fips_code; if(sCo)sCts[sCo]=(sCts[sCo]||0)+1;});
            const sortedSt=Object.entries(sCts).sort(([,a],[,b])=>b-a).slice(0,3).map(([code])=>code); if(sortedSt.length===0)return "No specific geo focus."; return `Key PoPs: ${sortedSt.join(', ')}.`;
        };
         const getRelationshipSummary = (m, limit = 3) => {
            if (!m || !m.relationships || !m.relationships.primeToSub || m.relationships.primeToSub.length === 0) return "Limited prime-sub relationship data in this view.";
            const topRels = m.relationships.primeToSub.sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,limit);
            if(topRels.length === 0) return "No significant prime-sub relationships in top data.";
            const summaryLines = topRels.map(rel => {
                const pN = m.primes[rel.source]?.name || "N/A Prime";
                const sN = m.subs[rel.target]?.name || "N/A Sub";
                return `<li>${truncateText(pN,20)} often subs to ${truncateText(sN,20)} (${formatCurrencyShort(rel.value)}).</li>`;
            });
            return `<ul>${summaryLines.join('')}</ul>`;
        };

        const agencyI = getAgencyInfo(model);
        const topNAICSI = getTopNAICSInfo(model);
        const expiringI = getExpiringContractsInfo(model);
        const topPrimesI = getTopPrimeContractors(model);
        const arrI = getARRInfo(model, topNAICSI.topNaicsCode);

        return {
            agencyName: agencyI.agencyName,
            updateDateMonthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            currentDateFormatted: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            totalAwardedFY: formatCurrencyShort(agencyI.totalAwarded),
            expiringCount: expiringI.count,
            expiringValueFormatted: formatCurrencyShort(expiringI.value),
            topPrimeName: topPrimesI.table.length > 0 ? topPrimesI.table[0].name : "N/A",
            topSubName: getTopSubContractor(model),
            mostUsedNaicsCode: topNAICSI.topNaicsCode,
            mostUsedNaicsFullText: `${topNAICSI.topNaicsCode}${topNAICSI.topNaicsDescription !== 'N/A' ? ' - ' + topNAICSI.topNaicsDescription : ''}`,
            dominantNaicsTextShort: topNAICSI.dominantNaicsText,
            geoDistributionText: getGeoDistributionInfo(model),
            arrForTopNaics: formatCurrencyShort(arrI.arr),
            arrNaicsCode: arrI.naicsCode,
            primeContractorsChart: topPrimesI.chartData,
            naicsDistributionChart: { labels: topNAICSI.distribution.map(n => n.code), values: topNAICSI.distribution.map(n => n.pct) },
            tavTcvChart: getTAVTCVData(model),
            topPrimesTableData: topPrimesI.table,
            expiringContractsTableData: expiringI.list,
            arrEstimatorData: {
                arrFormatted: formatCurrencyShort(arrI.arr), naicsCode: arrI.naicsCode,
                naicsDescription: arrI.naicsDesc, avgContractSizeFormatted: formatCurrencyShort(arrI.avgContractSize),
                avgDurationText: `${arrI.avgDurationYears > 0 ? arrI.avgDurationYears.toFixed(1) : '0'} years`,
            },
            relationshipSummary: getRelationshipSummary(model),
            // For D3 charts, pass the model or specifically processed data
            mapChartData: processMapDataForD3(model), // You'll need to define this
            dendrogramChartData: prepareHierarchyDataForD3(model) // You'll need to define this
        };
    }
function renderMainDashboard(data) {
    if (!dashboardContainer) {
        console.error("FATAL: dashboardContainer DOM element not found in renderMainDashboard.");
        return;
    }
    if (!data) {
        console.error("renderMainDashboard: No display data provided.");
        dashboardContainer.innerHTML = `<p class="dashboard-loading">Error: Missing data for dashboard rendering.</p>`;
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
        // ... (The rest of your HTML generation logic for primeRowsHtml, expiringRowsHtml, etc.)
        const primeRowsHtml = (data.topPrimesTableData || []).map(p => `<tr><td>${p.usaspendingLink ? `<a href="${p.usaspendingLink}" target="_blank">${truncateText(p.name,30)}</a>` : truncateText(p.name,30)}</td><td class="number-cell">${formatCurrencyShort(p.value)}</td><td class="number-cell">${p.awards}</td><td class="number-cell">${p.avgDuration} days</td><td>${truncateText(p.primaryNaics, 40)}</td></tr>`).join('');
        const expiringRowsHtml = (data.expiringContractsTableData || []).map(c => `<tr><td>${c.id !== "N/A" ? `<a href="https://www.usaspending.gov/award/${c.id}" target="_blank">${c.id}</a>` : 'N/A'}</td><td>${truncateText(c.contractor,30)}</td><td>${truncateText(c.description,40)}</td><td>${c.endDate}</td><td class="number-cell">${formatCurrencyShort(c.value)}</td></tr>`).join('');
        const tavTcvChartDataForScript = JSON.stringify((data.tavTcvChart || []).map(d => ({...d, link: d.id !== "N/A" ? `https://www.usaspending.gov/award/${d.id}` : null })));

        // Ensure all parts of 'data' are checked for existence before being used in template literals
        const html = `
            <div class="snapshot-header">
                <div><h2>${data.agencyName || 'Agency'} Dashboard</h2><p>Data as of: ${data.updateDateMonthYear || 'N/A'}</p></div>
                <div class="snapshot-date">Generated: ${data.currentDateFormatted || 'N/A'}</div>
            </div>
            <section class="insights">
                <h3>Executive Summary</h3>
                <p>Approx. recent obligations: <strong>${data.totalAwardedFY || '$0'}</strong>. Key NAICS: <strong>${data.mostUsedNaicsFullText || 'N/A'}</strong>.
                   Expiring soon: <strong>${data.expiringCount || 0}</strong> awards (<strong>${data.expiringValueFormatted || '$0'}</strong>) in next 6 months.</p>
                <h4>Key Intelligence:</h4>
                <ul>
                    <li>Top Prime: ${data.topPrimeName || 'N/A'}</li><li>Top Sub: ${data.topSubName || 'N/A'}</li>
                    <li>Dominant Services: ${data.dominantNaicsTextShort || 'N/A'}</li><li>ARR for ${data.arrNaicsCode || 'N/A'}: ~${data.arrForTopNaics || '$0'}</li>
                    <li>Place of Performance: ${data.geoDistributionText || 'N/A'}</li>
                </ul>
            </section>
            <section class="opportunity-snapshot">
                 <h3>Opportunity Triggers</h3>
                 <ul>
                    <li>Target <strong>${data.expiringCount || 0} expiring contracts (${data.expiringValueFormatted || '$0'})</strong> for near-term pursuits.</li>
                    <li>Explore teaming with/competing against <strong>${data.topPrimeName || 'N/A'}</strong>.</li>
                    <li>Investigate needs within <strong>${data.mostUsedNaicsCode || 'N/A'}</strong>.</li>
                 </ul>
            </section>
            <section class="quick-intel">
                <div class="stat-card"><div class="stat-label">Top Prime</div><div class="stat-value">${data.topPrimeName || 'N/A'}</div></div>
                <div class="stat-card"><div class="stat-label">Top Sub</div><div class="stat-value">${data.topSubName || 'N/A'}</div></div>
                <div class="stat-card"><div class="stat-label">Top NAICS</div><div class="stat-value">${data.mostUsedNaicsCode || 'N/A'}</div></div>
                <div class="stat-card"><div class="stat-label">Total Obligated</div><div class="stat-value">${data.totalAwardedFY || '$0'}</div></div>
                <div class="stat-card"><div class="stat-label">Expiring Soon</div><div class="stat-value">${data.expiringCount || 0} | ${data.expiringValueFormatted || '$0'}</div></div>
            </section>
            
            <div class="layout-grid">
                <div class="col-span-6 content-section"><h3 class="chart-title">Top 7 Primes</h3><div class="chart-wrapper"><canvas id="main-contractors-chart"></canvas></div></div>
                <div class="col-span-6 content-section"><h3 class="chart-title">NAICS Distribution (%)</h3><div class="chart-wrapper"><canvas id="main-naics-chart"></canvas></div></div>
            </div>
            <div class="layout-grid">
                <div class="col-span-12 content-section"><h3 class="chart-title">Top Contracts: TAV vs TCV</h3><div class="chart-wrapper"><canvas id="main-tav-tcv-chart"></canvas></div></div>
            </div>
            <div class="layout-grid">
                <div class="col-span-8 content-section"><h3 class="chart-title">Geographic Distribution (PoP)</h3><div id="main-map-viz" class="d3-chart-wrapper"><div class="loading-placeholder">Initializing Map...</div></div></div>
                <div class="col-span-4 content-section"><h3 class="chart-title">ARR Estimator</h3>
                    <div style="text-align:center; padding:10px; height:300px; display:flex; flex-direction:column; justify-content:center;">
                        <div style="font-size:26px; font-weight:700; color:var(--color-primary); margin-bottom:10px;">${data.arrEstimatorData?.arrFormatted || '$0'}</div>
                        <p style="font-size:13px; color:var(--color-text-secondary);">For NAICS ${data.arrEstimatorData?.naicsCode || 'N/A'} (${data.arrEstimatorData?.naicsDescription || 'N/A'})</p>
                        <p style="font-size:13px; color:var(--color-text-secondary); margin-top:5px;">Avg. Contract: ${data.arrEstimatorData?.avgContractSizeFormatted || '$0'} over ${data.arrEstimatorData?.avgDurationText || 'N/A'}</p>
                    </div>
                </div>
            </div>
            <div class="layout-grid">
                <div class="col-span-12 content-section"><h3 class="chart-title">Key Relationships</h3><div id="main-dendrogram-viz" class="d3-chart-wrapper-large"><div class="loading-placeholder">Initializing Relationships...</div></div></div>
            </div>
            <div class="content-section table-wrapper"><h3>Top 10 Primes</h3><table><thead><tr><th>Contractor</th><th>Total Value</th><th>Awards</th><th>Avg Duration</th><th>Primary NAICS</th></tr></thead><tbody>${primeRowsHtml}</tbody></table></div>
            <div class="content-section table-wrapper"><h3>Expiring Contracts (Next 6 Months)</h3><table><thead><tr><th>ID</th><th>Contractor</th><th>Description</th><th>End Date</th><th>Value</th></tr></thead><tbody>${expiringRowsHtml}</tbody></table></div>
            <section class="insights"><h3>Relationship Insights</h3>${data.relationshipSummary || '<p>No specific relationship insights available.</p>'}</section>
        `;

        dashboardContainer.innerHTML = html; // This is the critical line to replace loading message
        console.log("renderMainDashboard: HTML injected.");
        dashboardContainer.classList.remove('dashboard-loading'); // Explicitly remove if class was used

        // Initialize Chart.js charts
        const chartFontColor = getCssVar('--color-text-secondary'); Chart.defaults.color = chartFontColor; Chart.defaults.borderColor = getCssVar('--color-border');
        
        const contractorsChartData = data.primeContractorsChart || { labels: [], values: [] };
        if(document.getElementById('main-contractors-chart')) chartInstances.primes = new Chart(document.getElementById('main-contractors-chart').getContext('2d'), { type: 'bar', data: { labels: contractorsChartData.labels, datasets: [{label:'Value',data:contractorsChartData.values, backgroundColor:getCssVar('--color-primary')}]}, options: {indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>formatCurrencyShort(c.raw)}}},scales:{x:{ticks:{callback:v=>formatCurrencyShort(v)}},y:{ticks:{font:{size:10}}}}}});
        
        const naicsChartData = data.naicsDistributionChart || { labels: [], values: [] };
        if(document.getElementById('main-naics-chart')) chartInstances.naics = new Chart(document.getElementById('main-naics-chart').getContext('2d'), { type: 'doughnut', data: { labels: naicsChartData.labels, datasets: [{data:naicsChartData.values, backgroundColor:['#6A5ACD','#483D8B','#7B68EE','#9370DB','#8A2BE2','#BA55D3']}]}, options: {responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{boxWidth:10,font:{size:10},generateLabels:c=>c.data.labels.map((l,i)=>({text:`${l} (${c.data.datasets[0].data[i]}%)`,fillStyle:c.data.datasets[0].backgroundColor[i]}))}},tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw}%`}}}}});
        
        if(document.getElementById('main-tav-tcv-chart')) {
            const tavTcvData = JSON.parse(tavTcvChartDataForScript); 
            chartInstances.tavTcv = new Chart(document.getElementById('main-tav-tcv-chart').getContext('2d'), {
                type: 'bar', data: { labels: tavTcvData.map(d=>d.name), datasets: [{label:'TAV',data:tavTcvData.map(d=>d.tav),backgroundColor:getCssVar('--color-primary'),stack:'s0'},{label:'TCV Remainder',data:tavTcvData.map(d=>d.tcvRemainder),backgroundColor:getCssVar('--color-accent'),stack:'s0'}]},
                options: {indexAxis:'y',responsive:true,maintainAspectRatio:false, onClick:(e,els)=>{if(els.length>0){const idx=els[0].index; const link=tavTcvData[idx].link; if(link)window.open(link,'_blank');}}, onHover:(e,el)=>{if(e.native && e.native.target) e.native.target.style.cursor = el[0] && tavTcvData[el[0].index].link ? 'pointer':'default';}, plugins:{legend:{position:'bottom'},tooltip:{mode:'index',callbacks:{label:c=>`${c.dataset.label}: ${formatCurrencyShort(c.raw)}`, footer:items=>{let total=0; if(items[0]){const dIdx=items[0].dataIndex; total=tavTcvData[dIdx].totalTcv;} return `Total TCV: ${formatCurrencyShort(total)}`;}}}},scales:{x:{stacked:true,ticks:{callback:v=>formatCurrencyShort(v)}},y:{stacked:true,ticks:{font:{size:10}}}}}
            });
        }
        console.log("renderMainDashboard: Chart.js charts initialized.");

        // Call D3 rendering functions
        if(data.mapChartData && Object.keys(data.mapChartData).length > 0) {
            renderMap(data.mapChartData, 'main-map-viz');
        } else {
             const mapVizContainer = document.getElementById('main-map-viz');
             if(mapVizContainer) mapVizContainer.innerHTML = '<p class="loading-placeholder">Map data not available for this selection.</p>';
        }
        console.log("renderMainDashboard: Map rendering attempted.");

        if(data.dendrogramChartData && data.dendrogramChartData.children && data.dendrogramChartData.children.length > 0 && (data.dendrogramChartData.children[0].name !== "No detailed prime/sub data available in this view." && data.dendrogramChartData.children[0].name !== "No Agency Data")) {
            renderDendrogram(data.dendrogramChartData, 'main-dendrogram-viz');
        } else {
            const dendroVizContainer = document.getElementById('main-dendrogram-viz');
            if(dendroVizContainer) dendroVizContainer.innerHTML = '<p class="loading-placeholder">Relationship data not available for this selection.</p>';
        }
        console.log("renderMainDashboard: Dendrogram rendering attempted.");

    } catch (renderError) {
        console.error("Error during renderMainDashboard HTML generation or chart/D3 init:", renderError);
        dashboardContainer.innerHTML = `<p class="dashboard-loading">Critical error rendering dashboard: ${renderError.message}. Please check console.</p>`;
        updateStatus('Error rendering dashboard.', 'error');
    }
}

    // --- D3 VISUALS (Adapted from wednesday.js, ensure they target specific div IDs) ---
    function processMapDataForD3(model) { // This is your 'processMapDataFromModel'
        if (!model || !model.contracts) return {};
        const stateData = {};
        Object.values(model.contracts).forEach(contract => {
            const stateCode = contract.raw?.popStateCode || contract.raw?.prime_award_transaction_place_of_performance_state_fips_code;
            if (stateCode) {
                const normCode = String(stateCode).trim().toUpperCase().padStart(2,'0');
                if (!stateData[normCode]) stateData[normCode] = { value: 0, count: 0 };
                stateData[normCode].value += contract.value || 0;
                stateData[normCode].count++;
            }
        });
        return stateData;
    }

    function renderMap(mapData, targetDivId) {
        const container = document.getElementById(targetDivId);
        if (!container) { console.error(`Map container #${targetDivId} not found.`); return; }
        container.innerHTML = ''; // Clear previous

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 400;
        if (width <= 0 || height <=0 || !mapData || Object.keys(mapData).length === 0) {
            container.innerHTML = '<p class="loading-placeholder">No geographic data to display.</p>'; return;
        }

        const svg = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);
        const values = Object.values(mapData).map(d => d.value);
        const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, d3.max(values) || 1]);
        const path = d3.geoPath();

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip") // Add a class for styling
            .style("position", "absolute").style("visibility", "hidden").style("background", "rgba(0,0,0,0.7)").style("color", "white")
            .style("padding", "5px").style("border-radius", "3px").style("font-size", "12px").style("pointer-events", "none");

        d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
            const states = topojson.feature(us, us.objects.states);
            const projection = d3.geoAlbersUsa().fitSize([width, height], states);
            path.projection(projection);

            svg.append("g")
                .selectAll("path")
                .data(states.features)
                .join("path")
                .attr("fill", d => { const fips = d.id.padStart(2,'0'); return mapData[fips] ? colorScale(mapData[fips].value) : '#ccc'; })
                .attr("d", path)
                .attr("stroke", "#fff").attr("stroke-width", 0.5)
                .on("mouseover", function(event, d) {
                    d3.select(this).attr("fill-opacity", 0.7);
                    const fips = d.id.padStart(2,'0');
                    const stateInfo = mapData[fips];
                    tooltip.style("visibility", "visible")
                           .html(`${d.properties.name}<br>Value: ${stateInfo ? formatCurrencyShort(stateInfo.value) : 'N/A'}<br>Contracts: ${stateInfo ? stateInfo.count : 'N/A'}`);
                })
                .on("mousemove", (event) => tooltip.style("top",(event.pageY-10)+"px").style("left",(event.pageX+10)+"px"))
                .on("mouseout", function() { d3.select(this).attr("fill-opacity", 1); tooltip.style("visibility", "hidden"); });
        }).catch(error => {
            console.error("Error loading map topojson:", error);
            container.innerHTML = '<p class="loading-placeholder">Error loading map data.</p>';
        });
         // Basic legend (conceptual)
        const legendData = colorScale.ticks(5).map(tick => ({color: colorScale(tick), value: tick}));
        const legend = svg.append("g").attr("transform", `translate(${width - 120}, ${height - 100})`);
        legend.selectAll("rect").data(legendData).enter().append("rect")
            .attr("y", (d,i)=> i * 15).attr("width", 15).attr("height", 15).attr("fill", d=>d.color);
        legend.selectAll("text").data(legendData).enter().append("text")
            .attr("x", 20).attr("y", (d,i)=> i * 15 + 12).text(d=>formatCurrencyShort(d.value)).attr("font-size","10px").attr("fill", getCssVar('--color-text-secondary'));
    }

// In app.js, replace the previous prepareHierarchyDataForD3

function prepareHierarchyDataForD3(model) {
    if (!model || !model.agencies || Object.keys(model.agencies).length === 0) {
        console.warn("Hierarchy data: Model or agencies are missing.");
        return { name: "No Agency Data",id:"root", children: [] };
    }
    console.log("Preparing D3 Hierarchy: Agency -> SubAgency -> Prime -> Subcontractor");

    const rootNode = {
        name: "Federal Ecosystem", // Root name
        id: "root-hierarchy",
        type: "root",
        children: []
    };

    // Consider the top N agencies by value, or a selected one if filtering is implemented later
    const topAgencies = Object.values(model.agencies)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 2); // Limit to top 2 agencies for broader view, or 1 for focused

    topAgencies.forEach(agency => {
        const agencyNode = {
            name: truncateText(agency.name, 30),
            id: agency.id,
            value: agency.value || 0,
            type: 'agency',
            children: []
        };

        // Find SubAgencies for this Agency:
        // Method 1: If subAgencies have parentId linking to agency.id
        // Method 2: Infer from contracts (contract.agencyId === agency.id, then collect unique contract.subAgencyName)
        const subAgenciesForThisAgency = {}; // Store as { name: { value: X, primeIds: Set() } }

        Object.values(model.contracts || {}).forEach(contract => {
            if (contract.agencyId === agency.id && contract.subAgencyName && contract.primeId) {
                if (!subAgenciesForThisAgency[contract.subAgencyName]) {
                    subAgenciesForThisAgency[contract.subAgencyName] = {
                        name: contract.subAgencyName,
                        value: 0,
                        primeIds: new Set() // Store prime IDs associated with this SubAgency under this Agency
                    };
                }
                subAgenciesForThisAgency[contract.subAgencyName].value += (contract.value || 0);
                subAgenciesForThisAgency[contract.subAgencyName].primeIds.add(contract.primeId);
            }
        });
        
        const topSubAgencies = Object.values(subAgenciesForThisAgency)
            .sort((a,b) => b.value - a.value)
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
                .sort((a,b) => (b.value || 0) - (a.value || 0))
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
        rootNode.children.push({ name: "No hierarchical data to display.", id:"placeholder-h", value: 1, type: 'placeholder' });
    }
    return rootNode;
}
function renderDendrogram(hierarchyData, targetDivId) {
    const container = document.getElementById(targetDivId);
    if (!container) { console.error(`Dendrogram container #${targetDivId} not found.`); return; }
    container.innerHTML = ''; // Clear previous content

    const { width, height } = container.getBoundingClientRect();

    if (width <= 0 || height <= 0 || !hierarchyData || hierarchyData.children.length === 0 ||
        (hierarchyData.children.length === 1 && hierarchyData.children[0].id === 'placeholder-h')) {
        container.innerHTML = '<p class="loading-placeholder">No hierarchical relationship data to display for this selection.</p>';
        return;
    }

    const margin = { top: 20, right: 120, bottom: 20, left: 120 }; // Adjust left margin for root labels
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]) // Standard viewBox
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy(hierarchyData, d => d.children);
    root.sum(d => Math.max(1, d.value || 0)); // Ensure nodes have a value
    root.sort((a,b) => (b.height - a.height) || (b.value - a.value)); // Sort by depth then value


    // Use d3.tree for a tidier layout, d3.cluster for a more compact one
    const treeLayout = d3.tree().size([innerHeight, innerWidth]); // [height, width] for horizontal
    treeLayout(root);

    // Links
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke", getCssVar('--color-border'))
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("d", d3.linkHorizontal() // Use linkHorizontal
            .x(d => d.y) // Depth is y in horizontal
            .y(d => d.x)); // Position along height is x

    // Nodes
    const node = svg.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.y},${d.x})`); // Swap x and y for horizontal

    const nodeColors = {
        root: getCssVar('--color-text-primary'),
        agency: getCssVar('--color-primary'),
        subagency: getCssVar('--color-accent'),
        prime: getCssVar('--color-secondary'),
        sub: getCssVar('--color-tertiary'),
        placeholder: getCssVar('--color-text-tertiary')
    };

    node.append("circle")
        .attr("fill", d => nodeColors[d.data.type] || getCssVar('--color-text-tertiary'))
        .attr("r", d => d.depth === 0 ? 6 : d.children ? 4.5 : 3.5);

    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.children ? -8 : 8) // Position text based on whether it has children
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name)
        .style("font-size", d => d.depth === 0 ? "12px" : d.depth <= 2 ? "10px" : "9px")
        .style("fill", getCssVar('--color-text-secondary'))
        .clone(true).lower()
        .attr("stroke", "white"); // Halo for better readability

    // Add simple tooltip (optional enhancement)
    const tooltip = d3.select("body").selectAll(".d3-tooltip").data([null]).join("div") // Ensure only one tooltip
        .attr("class", "d3-tooltip")
        .style("position", "absolute").style("visibility", "hidden")
        .style("background", "rgba(0,0,0,0.8)").style("color", "white")
        .style("padding", "5px 8px").style("border-radius", "4px")
        .style("font-size", "12px").style("pointer-events", "none").style("z-index", "100");

    node.on("mouseover", (event, d) => {
        tooltip.style("visibility", "visible")
            .html(`<strong>${d.data.name}</strong><br>Type: ${d.data.type}<br>Value: ${formatCurrencyShort(d.data.value || d.value)}`)
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px");
        d3.select(event.currentTarget).select("circle").attr("r", (d.children ? 4.5 : 3.5) + 2);
    })
    .on("mouseout", (event, d) => {
        tooltip.style("visibility", "hidden");
        d3.select(event.currentTarget).select("circle").attr("r", d.children ? 4.5 : 3.5);
    });
}
    // --- APP INITIALIZATION & EVENT LISTENERS ---
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
        Object.values(agencyGroups).sort((a,b) => a.name.localeCompare(b.name)).forEach(group => {
            const optGroup = document.createElement('optgroup');
            optGroup.label = group.name;
            const primeDataset = group.datasets.find(d => d.type === 'primes');
            const subDataset = group.datasets.find(d => d.type === 'subs');

            if (primeDataset && subDataset) { // Offer combined
                const combinedOpt = document.createElement('option');
                combinedOpt.value = `combined:${primeDataset.id},${subDataset.id}`;
                combinedOpt.textContent = `${group.name} (Primes & Subs)`;
                optGroup.appendChild(combinedOpt);
            }
            group.datasets.forEach(ds => {
                const option = document.createElement('option');
                option.value = ds.id;
                option.textContent = ds.name;
                optGroup.appendChild(option);
            });
            datasetSelect.appendChild(optGroup);
        });
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
            Array.from(model.stats.allSubAgencies).sort().forEach(subAgency => {
                 if(subAgency && subAgency !== "N/A") {
                    const option = document.createElement('option');
                    option.value = subAgency;
                    option.textContent = subAgency;
                    subAgencyFilterEl.appendChild(option);
                }
            });
        }
    }
// Refined handleDatasetSelection
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
    dashboardContainer.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Loading data for selected agency...</p></div>`;
    rawData = { primes: [], subs: [] };
    unifiedModel = null;
    // Clear filter options before repopulating
    naicsFilterEl.innerHTML = '<option value="">All NAICS</option>';
    subAgencyFilterEl.innerHTML = '<option value="">All Sub-Agencies</option>';

    let datasetsToLoadConfigs = [];
    if (selectedValue.startsWith('combined:')) {
        const ids = selectedValue.split(':')[1].split(',');
        datasetsToLoadConfigs = ids.map(id => DATASETS_CONFIG.find(ds => ds.id === id)).filter(Boolean);
    } else {
        const singleConfig = DATASETS_CONFIG.find(ds => ds.id === selectedValue);
        if (singleConfig) datasetsToLoadConfigs.push(singleConfig);
    }

    if (datasetsToLoadConfigs.length === 0) {
        updateStatus('Invalid dataset selection.', 'error');
        dashboardContainer.innerHTML = `<p class="dashboard-loading">Invalid dataset selected. Please choose another.</p>`;
        isLoading = false;
        applyFiltersBtn.disabled = false;
        return;
    }

    try {
        const agencyDisplayNames = datasetsToLoadConfigs.map(d => d.name).join(' & ');
        updateStatus(`Workspaceing ${agencyDisplayNames}...`, 'info');

        for (const config of datasetsToLoadConfigs) {
            const fetchedData = await fetchDataset(config);
            const processed = processRawDataset(fetchedData, config.type);
            if (config.type === 'primes') rawData.primes = rawData.primes.concat(processed);
            else if (config.type === 'subs') rawData.subs = rawData.subs.concat(processed);
        }
        console.log("handleDatasetSelection: Raw data fetched and processed.");

        unifiedModel = buildUnifiedModelFromProcessed(rawData.primes, rawData.subs);
        console.log("handleDatasetSelection: Unified model built.");

        if (unifiedModel) {
            populateFilterDropdowns(unifiedModel);
            console.log("handleDatasetSelection: Filters populated.");
            applyFiltersAndRedraw(); // This will render the dashboard
            // Status update will be handled by applyFiltersAndRedraw or its catch block
        } else {
            throw new Error("Failed to build the unified model.");
        }

    } catch (error) {
        console.error("Error during handleDatasetSelection:", error);
        updateStatus(`Failed to load data: ${error.message}`, 'error');
        dashboardContainer.innerHTML = `<p class="dashboard-loading">Error loading data: ${error.message}. Please check console and try again.</p>`;
    } finally {
        isLoading = false;
        applyFiltersBtn.disabled = false;
        console.log("handleDatasetSelection: Operation finished.");
    }
}

// Refined applyFiltersAndRedraw
function applyFiltersAndRedraw() {
    if (!unifiedModel) {
        updateStatus('No data available to apply filters. Please select an agency.', 'info');
        dashboardContainer.innerHTML = `<p class="dashboard-loading">No data loaded. Please select an agency.</p>`;
        return;
    }

    console.log("applyFiltersAndRedraw: Preparing to filter and redraw dashboard...");
    // Don't set dashboardContainer.innerHTML to a loading message here,
    // as handleDatasetSelection already does for the initial load.
    // For subsequent filter applications, the UI will just update.
    // If filtering is slow, a more subtle indicator or statusBanner update is better.
    updateStatus('Applying filters and updating view...', 'info');


    try {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedSubAgency = subAgencyFilterEl.value;
        const selectedNaics = naicsFilterEl.value;

        let filteredPrimesList = rawData.primes; // Start with full raw data for filtering
        let filteredSubsList = rawData.subs;

        if (searchTerm) {
            const st = searchTerm;
            filteredPrimesList = rawData.primes.filter(c =>
                Object.values(c).some(val => String(val).toLowerCase().includes(st))
            );
            filteredSubsList = rawData.subs.filter(c =>
                Object.values(c).some(val => String(val).toLowerCase().includes(st))
            );
        }
        if (selectedSubAgency) {
            filteredPrimesList = filteredPrimesList.filter(c => c.subAgencyName === selectedSubAgency);
            filteredSubsList = filteredSubsList.filter(c => c.subAgencyName === selectedSubAgency);
        }
        if (selectedNaics) {
            filteredPrimesList = filteredPrimesList.filter(c => c.naicsCode === selectedNaics);
            filteredSubsList = filteredSubsList.filter(c => c.naicsCode === selectedNaics);
        }
        
        console.log(`applyFiltersAndRedraw: Filtered to ${filteredPrimesList.length} primes, ${filteredSubsList.length} subs.`);
        const filteredDisplayModel = buildUnifiedModelFromProcessed(filteredPrimesList, filteredSubsList);
        console.log("applyFiltersAndRedraw: Built filteredDisplayModel.");

        const displayData = aggregateDataForDashboardView(filteredDisplayModel); // aggregateDataForDashboardView MUST be robust
        console.log("applyFiltersAndRedraw: Aggregated displayData.");

        if (displayData) {
            renderMainDashboard(displayData); // This function updates dashboardContainer.innerHTML
            updateStatus('Dashboard updated successfully.', 'success', true);
        } else {
            throw new Error("Could not prepare data for display after filtering.");
        }
    } catch (error) {
        console.error("Error during applyFiltersAndRedraw:", error);
        // If renderMainDashboard fails, the dashboardContainer might be left in an inconsistent state
        // or with the old loading message if this is the first load.
        dashboardContainer.innerHTML = `<p class="dashboard-loading">An error occurred while updating the view: ${error.message}. Check console.</p>`;
        updateStatus(`Error updating view: ${error.message}`, 'error');
    }
    // isLoading is managed by the orchestrating function (handleDatasetSelection for full load)
    // For direct filter clicks, if applyFiltersAndRedraw were async, it would manage its own isLoading.
    // Since it's synchronous after data is loaded, the main isLoading is sufficient.
}  
function updateStatus(message, type = 'info', autoDismiss = false) {
    if (!statusBanner) return; // Ensure statusBanner exists
    statusBanner.textContent = message;
    statusBanner.className = `status-${type}`; // e.g., status-info, status-success, status-error
    
    // Clear any existing auto-dismiss timer
    if (statusBanner.dismissTimer) {
        clearTimeout(statusBanner.dismissTimer);
    }

    if (autoDismiss) {
        statusBanner.dismissTimer = setTimeout(() => {
            if (statusBanner.textContent === message) { // Only clear if it's still the same message
                statusBanner.textContent = 'Ready.';
                statusBanner.className = 'status-info';
            }
        }, 3000);
    }
}

    function initTheme() {
        const savedTheme = localStorage.getItem('dashboard-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('dashboard-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
            // Re-render charts if necessary as colors might change (if CSS vars are used by charts)
            if(unifiedModel) applyFiltersAndRedraw();
        });
    }


    // --- INITIALIZATION ---
    initTheme();
    populateDatasetSelector();
    datasetSelect.addEventListener('change', handleDatasetSelection);
    applyFiltersBtn.addEventListener('click', applyFiltersAndRedraw);
    // Optional: auto-apply filters on input change with debounce
    let searchDebounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(applyFiltersAndRedraw, 500);
    });
    subAgencyFilterEl.addEventListener('change', applyFiltersAndRedraw);
    naicsFilterEl.addEventListener('change', applyFiltersAndRedraw);

    updateStatus('App initialized. Select an agency.', 'info');
});