// Simplified agency-snapshot-generator.js

(function() {
    console.log("Simplified Agency Snapshot Generator Loaded.");

    // --- Utility Functions ---
    function formatCurrencyShort(value, defaultIfNaN = '$0') {
        if (value === null || value === undefined) return defaultIfNaN;
        const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : Number(value);
        if (isNaN(numValue)) return defaultIfNaN;

        if (Math.abs(numValue) >= 1.0e+9) return `$${(numValue / 1.0e+9).toFixed(1)}B`;
        if (Math.abs(numValue) >= 1.0e+6) return `$${(numValue / 1.0e+6).toFixed(1)}M`;
        if (Math.abs(numValue) >= 1.0e+3) return `$${(numValue / 1.0e+3).toFixed(1)}K`;
        return `$${numValue.toFixed(0)}`;
    }

    function calculateDurationDays(startDateStr, endDateStr) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) +1; // Inclusive
        return diffDays;
    }

    // --- Data Extraction Functions ---
    function getAgencyInfo(model) {
        const agencyName = model.agencies && Object.keys(model.agencies).length > 0 ?
            Object.values(model.agencies).sort((a, b) => (b.value || 0) - (a.value || 0))[0]?.name : "Unknown Agency";
        const totalAwarded = model.stats?.totalContractValue || 0;
        return { agencyName, totalAwarded };
    }

    function getTopNAICSInfo(model, topN = 5) {
        const naicsAggregates = {};
        let totalValueAllNaics = 0;
        if (!model || !model.contracts) return { topNaicsCode: "N/A", topNaicsDescription: "N/A", dominantNaicsText: "N/A", distribution: [] };

        Object.values(model.contracts).forEach(contract => {
            if (contract.naicsCode && contract.value > 0) {
                if (!naicsAggregates[contract.naicsCode]) {
                    naicsAggregates[contract.naicsCode] = {
                        code: contract.naicsCode,
                        description: contract.naicsDesc || "N/A",
                        value: 0,
                    };
                }
                naicsAggregates[contract.naicsCode].value += contract.value;
                totalValueAllNaics += contract.value;
            }
        });

        const sortedNaics = Object.values(naicsAggregates).sort((a, b) => b.value - a.value);
        const chartData = [];
        const topItems = sortedNaics.slice(0, topN);

        topItems.forEach(n => {
            chartData.push({
                code: n.code,
                description: n.description,
                percentage: totalValueAllNaics > 0 ? Math.round((n.value / totalValueAllNaics) * 100) : 0,
            });
        });
        
        if (sortedNaics.length > topN) {
            const otherValue = sortedNaics.slice(topN).reduce((sum, item) => sum + item.value, 0);
            if (otherValue > 0) {
                chartData.push({
                    code: "Other",
                    description: "Various Other NAICS",
                    percentage: totalValueAllNaics > 0 ? Math.round((otherValue / totalValueAllNaics) * 100) : 0,
                });
            }
        }
        
        const topNaicsOverall = sortedNaics.length > 0 ? sortedNaics[0] : { code: "N/A", description: "Not Available" };
        const dominantNaicsText = sortedNaics.slice(0, 2).map(n => `${n.code} (${(n.description || "N/A").substring(0,25)}...)`).join(', ');

        return {
            topNaicsCode: topNaicsOverall.code,
            topNaicsDescription: topNaicsOverall.description,
            dominantNaicsText: dominantNaicsText,
            distribution: chartData // For the doughnut chart
        };
    }

    function getExpiringContractsInfo(model, monthsAhead = 6, listLimit = 5) {
        const expiring = { count: 0, value: 0, list: [] };
        if (!model || !model.contracts) return expiring;

        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setMonth(today.getMonth() + monthsAhead);

        const expiringList = Object.values(model.contracts)
            .filter(contract => {
                if (!contract.endDate) return false;
                const endDate = contract.endDate instanceof Date ? contract.endDate : new Date(contract.endDate);
                return !isNaN(endDate.getTime()) && endDate >= today && endDate <= futureDate;
            })
            .map(contract => ({
                id: contract.id || "N/A",
                contractor: model.primes && model.primes[contract.primeId] ? model.primes[contract.primeId].name : "Unknown",
                description: contract.description || "No description",
                endDate: (contract.endDate instanceof Date ? contract.endDate : new Date(contract.endDate)).toLocaleDateString('en-US'),
                value: contract.value || 0
            }))
            .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

        expiring.count = expiringList.length;
        expiring.value = expiringList.reduce((sum, contract) => sum + contract.value, 0);
        expiring.list = expiringList.slice(0, listLimit);
        return expiring;
    }

    function getTopPrimeContractors(model, tableLimit = 10, chartLimit = 7) {
        const primes = { table: [], chartData: { labels: [], values: [] } };
        if (!model || !model.primes || Object.keys(model.primes).length === 0) return primes;

        const sortedPrimes = Object.values(model.primes)
            .map(prime => {
                let avgDuration = 0;
                let dominantNaicsCode = "N/A";
                let dominantNaicsDesc = "";
                let awards = 0;
                const contractIds = prime.contracts instanceof Set ? Array.from(prime.contracts) : (prime.contracts || []);
                
                awards = contractIds.length;
                if (awards > 0 && model.contracts) {
                    let totalDuration = 0;
                    let durationCount = 0;
                    const naicsCounts = {};

                    contractIds.forEach(contractId => {
                        const contract = model.contracts[contractId];
                        if (contract) {
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
                    if (durationCount > 0) avgDuration = Math.round(totalDuration / durationCount);
                    if (Object.keys(naicsCounts).length > 0) {
                        dominantNaicsCode = Object.keys(naicsCounts).reduce((a, b) => naicsCounts[a] > naicsCounts[b] ? a : b);
                        const sampleContractWithNaics = contractIds.map(id => model.contracts[id]).find(c => c && c.naicsCode === dominantNaicsCode);
                        dominantNaicsDesc = sampleContractWithNaics ? (sampleContractWithNaics.naicsDesc || "").substring(0,30) + "..." : "";
                    }
                }
                return {
                    name: prime.name || "Unknown Prime",
                    value: prime.value || 0,
                    awards: awards,
                    avgDuration: avgDuration,
                    primaryNaics: `${dominantNaicsCode}${dominantNaicsDesc ? ' - ' + dominantNaicsDesc : ''}`
                };
            })
            .filter(p => p.value > 0)
            .sort((a, b) => b.value - a.value);

        primes.table = sortedPrimes.slice(0, tableLimit);
        const chartPrimes = sortedPrimes.slice(0, chartLimit);
        primes.chartData.labels = chartPrimes.map(p => p.name.length > 15 ? p.name.substring(0,12)+'...' : p.name);
        primes.chartData.values = chartPrimes.map(p => p.value);
        return primes;
    }

    function getTopSubContractor(model) {
        if (!model || !model.subs || Object.keys(model.subs).length === 0) return "N/A";
        const sortedSubs = Object.values(model.subs).sort((a, b) => (b.value || 0) - (a.value || 0));
        return sortedSubs.length > 0 ? sortedSubs[0].name : "N/A";
    }

    function getTAVTCVData(model, limit = 7) {
        if (!model || !model.contracts) return [];
        return Object.values(model.contracts)
            .filter(contract => contract.value > 0 && contract.raw)
            .map(contract => {
                const primeName = model.primes && model.primes[contract.primeId] ? model.primes[contract.primeId].name : "Unknown";
                const desc = contract.description || `Contract with ${primeName}`;
                return {
                    name: desc.length > 30 ? desc.substring(0, 27) + '...' : desc,
                    tav: parseFloat(contract.raw.obligatedValue || 0),
                    tcvRemainder: Math.max(0, parseFloat(contract.value || 0) - parseFloat(contract.raw.obligatedValue || 0)),
                    totalTcv: parseFloat(contract.value || 0) // For tooltip
                };
            })
            .sort((a, b) => b.totalTcv - a.totalTcv)
            .slice(0, limit);
    }

    function getARRInfo(model, targetNaicsCode) {
        const result = { arr: 0, avgContractSize: 0, avgDurationYears: 0, naicsCode: targetNaicsCode || "N/A", naicsDesc: "N/A" };
        if (!model || !model.contracts || !targetNaicsCode) return result;

        const relevantContracts = Object.values(model.contracts)
            .filter(c => c.naicsCode === targetNaicsCode && c.value > 0 && c.startDate && c.endDate);

        if (relevantContracts.length === 0) return result;

        result.naicsDesc = (relevantContracts[0].naicsDesc || "N/A").substring(0,40) + "...";
        let totalValue = 0;
        let totalDurationDays = 0;
        let validDurationCount = 0;

        relevantContracts.forEach(c => {
            totalValue += c.value;
            const duration = calculateDurationDays(c.startDate, c.endDate);
            if (duration > 0) {
                totalDurationDays += duration;
                validDurationCount++;
            }
        });

        if (relevantContracts.length > 0) result.avgContractSize = totalValue / relevantContracts.length;
        if (validDurationCount > 0) result.avgDurationYears = (totalDurationDays / validDurationCount) / 365.25;
        if (result.avgDurationYears > 0) result.arr = result.avgContractSize / result.avgDurationYears;
        return result;
    }

    function getGeoDistributionInfo(model) {
        if (!model || !model.contracts) return "Geographic data not available.";
        const stateCounts = {};
        Object.values(model.contracts).forEach(contract => {
            const stateCode = contract.raw?.popStateCode || contract.raw?.prime_award_transaction_place_of_performance_state_fips_code;
            if (stateCode) stateCounts[stateCode] = (stateCounts[stateCode] || 0) + 1;
        });
        const sortedStates = Object.entries(stateCounts).sort(([,a],[,b]) => b-a).slice(0,3).map(([code]) => code); // Placeholder for state names
        if (sortedStates.length === 0) return "Geographic data not available.";
        return `Contract work is often performed in ${sortedStates.join(', ')}.`;
    }

    // --- Main Snapshot Data Aggregation ---
    function aggregateSnapshotData() {
        const model = window.unifiedModel;
        if (!model) {
            alert("Agency data (unifiedModel) not found. Please load an agency on the main page first.");
            return null;
        }
        // Ensure model has basic structure to prevent errors
        model.stats = model.stats || { totalContractValue: 0 };
        model.primes = model.primes || {};
        model.subs = model.subs || {};
        model.contracts = model.contracts || {};
        model.agencies = model.agencies || {};

        const agencyInfo = getAgencyInfo(model);
        const topNAICSInfo = getTopNAICSInfo(model);
        const expiringContractsInfo = getExpiringContractsInfo(model);
        const topPrimes = getTopPrimeContractors(model);
        const arrInfo = getARRInfo(model, topNAICSInfo.topNaicsCode);

        return {
            agencyName: agencyInfo.agencyName,
            updateDateMonthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            currentDateFormatted: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            totalAwardedFY: formatCurrencyShort(agencyInfo.totalAwarded), // Assuming FY24 based on placeholder
            expiringCount: expiringContractsInfo.count,
            expiringValueFormatted: formatCurrencyShort(expiringContractsInfo.value),
            topPrimeName: topPrimes.table.length > 0 ? topPrimes.table[0].name : "N/A",
            topSubName: getTopSubContractor(model),
            mostUsedNaicsCode: topNAICSInfo.topNaicsCode,
            mostUsedNaicsFullText: `${topNAICSInfo.topNaicsCode}${topNAICSInfo.topNaicsDescription && topNAICSInfo.topNaicsDescription !== "N/A" ? ' - ' + topNAICSInfo.topNaicsDescription : ''}`,
            dominantNaicsTextShort: topNAICSInfo.dominantNaicsText,
            geoDistributionText: getGeoDistributionInfo(model),
            arrForTopNaics: formatCurrencyShort(arrInfo.arr),
            arrNaicsCode: arrInfo.naicsCode,
            primeContractorsChart: topPrimes.chartData,
            naicsDistributionChart: { labels: topNAICSInfo.distribution.map(n => n.code), values: topNAICSInfo.distribution.map(n => n.percentage) },
            tavTcvChart: getTAVTCVData(model),
            topPrimesTableData: topPrimes.table,
            expiringContractsTableData: expiringContractsInfo.list,
            arrEstimatorData: {
                arrFormatted: formatCurrencyShort(arrInfo.arr),
                naicsCode: arrInfo.naicsCode,
                naicsDescription: arrInfo.naicsDesc,
                avgContractSizeFormatted: formatCurrencyShort(arrInfo.avgContractSize),
                avgDurationText: `${arrInfo.avgDurationYears > 0 ? arrInfo.avgDurationYears.toFixed(1) : '0'} years`,
            }
        };
    }

    // --- HTML Generation ---
    function generateFullHtml(data) {
        if (!data) return "<p>Error: Data for snapshot is missing.</p>";

        const primeRowsHtml = data.topPrimesTableData.map(p => `
            <tr>
                <td>${p.name}</td>
                <td class="number-cell">${formatCurrencyShort(p.value)}</td>
                <td class="number-cell">${p.awards}</td>
                <td class="number-cell">${p.avgDuration} days</td>
                <td>${p.primaryNaics.substring(0,50)}...</td>
            </tr>`).join('');

        const expiringRowsHtml = data.expiringContractsTableData.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${c.contractor}</td>
                <td>${(c.description || "N/A").substring(0,50)}...</td>
                <td>${c.endDate}</td>
                <td class="number-cell">${formatCurrencyShort(c.value)}</td>
            </tr>`).join('');

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.agencyName} Snapshot</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
    <style>
        :root {
            --color-primary: #9A949B; --color-secondary: #7A747B; --color-tertiary: #B6B1B7;
            --color-background: #F9F9F9; --color-surface: #FFFFFF; --color-border: #DDDDDD;
            --color-text-primary: #222222; --color-text-secondary: #555555; --color-text-tertiary: #B3B3B3;
            --spacing-xs: 8px; --spacing-sm: 12px; --spacing-md: 16px; --spacing-lg: 24px; --spacing-xl: 32px;
            --border-radius-sm: 4px; --border-radius-md: 8px; --border-radius-lg: 12px;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --color-primary: #A59FA8; --color-secondary: #908A91; --color-tertiary: #767077;
                --color-background: #1E1E1E; --color-surface: #2B2B2B; --color-border: #444444;
                --color-text-primary: #F5F5F5; --color-text-secondary: #C8C8C8; --color-text-tertiary: #767077;
            }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background-color: var(--color-background); color: var(--color-text-primary); padding: var(--spacing-md); margin: 0; line-height: 1.5; }
        .agency-snapshot { max-width: 1200px; margin: 0 auto; padding: var(--spacing-lg); background-color: var(--color-surface); border-radius: var(--border-radius-lg); box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .snapshot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg); padding-bottom: var(--spacing-md); border-bottom: 1px solid var(--color-border); }
        .snapshot-header h1 { font-size: 24px; font-weight: 700; }
        .snapshot-header p { color: var(--color-text-secondary); font-size: 14px; margin-top: var(--spacing-xs); }
        .snapshot-date { color: var(--color-text-secondary); font-size: 14px; padding: var(--spacing-xs) var(--spacing-sm); background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); }
        .quick-intel { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--spacing-md); margin-bottom: var(--spacing-lg); }
        .stat-card { background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); padding: var(--spacing-md); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .stat-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 18px; font-weight: 700; color: var(--color-text-primary); }
        .grid-layout { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--spacing-md); margin-bottom: var(--spacing-lg); }
        .grid-col-6 { grid-column: span 6; } .grid-col-4 { grid-column: span 4; } .grid-col-8 { grid-column: span 8; } .grid-col-12 { grid-column: span 12; }
        .chart-container { background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); padding: var(--spacing-md); height: 320px; position: relative; }
        .chart-container h2 { font-size: 16px; margin-bottom: var(--spacing-md); font-weight: 600; text-align: center; }
        .table-container { background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); padding: var(--spacing-md); margin-bottom: var(--spacing-lg); overflow-x: auto; }
        .table-container h2 { font-size: 16px; margin-bottom: var(--spacing-md); font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead th { text-align: left; padding: var(--spacing-sm); font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); background-color: var(--color-surface); }
        tbody td { padding: var(--spacing-sm); border-bottom: 1px solid var(--color-border); color: var(--color-text-primary); }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background-color: rgba(0,0,0,0.02); }
        .number-cell { text-align: right; font-variant-numeric: tabular-nums; }
        .insights { background-color: var(--color-surface-variant, #f8f9fa); border: 1px solid var(--color-border); border-radius: var(--border-radius-md); padding: var(--spacing-lg); margin-bottom: var(--spacing-lg); }
        .insights h2 { font-size: 18px; margin-bottom: var(--spacing-md); color: var(--color-text-primary); } .insights p { margin-bottom: var(--spacing-md); font-size: 14px; color: var(--color-text-secondary); }
        .insights ul { margin-left: var(--spacing-lg); margin-bottom: var(--spacing-md); list-style-type: disc; padding-left: var(--spacing-md); } .insights li { margin-bottom: var(--spacing-xs); font-size: 14px; color: var(--color-text-secondary); }
        .insights strong { color: var(--color-text-primary); font-weight: 600; }
        .footer { text-align: center; color: var(--color-text-tertiary); font-size: 12px; margin-top: var(--spacing-xl); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border); }
        @media (max-width: 768px) {
            body { padding: var(--spacing-sm); }
            .agency-snapshot { padding: var(--spacing-md); }
            .grid-layout { grid-template-columns: 1fr; }
            .grid-col-6, .grid-col-4, .grid-col-8, .grid-col-12 { grid-column: span 1; }
            .chart-container { height: 280px; }
            .snapshot-header { flex-direction: column; align-items: flex-start; gap: var(--spacing-sm); }
            .snapshot-date { margin-top: var(--spacing-md); }
            .quick-intel { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>
<div class="agency-snapshot">
    <header class="snapshot-header">
        <div>
            <h1>${data.agencyName} Snapshot</h1>
            <p>Updated: ${data.updateDateMonthYear}</p>
        </div>
        <div class="snapshot-date">${data.currentDateFormatted}</div>
    </header>

    <section class="insights">
        <h2>Executive Summary</h2>
        <p>The ${data.agencyName} obligated approximately <strong>${data.totalAwardedFY}</strong> recently, with a notable focus on ${data.mostUsedNaicsFullText}. The agency currently has <strong>${data.expiringCount}</strong> awards, valued at <strong>${data.expiringValueFormatted}</strong>, set to expire in the next 6 months, indicating potential upcoming opportunities.</p>
        <h3 style="margin-top: var(--spacing-md); margin-bottom: var(--spacing-xs); font-size: 16px;">Key Insights</h3>
        <ul>
            <li><strong>Top Prime Contractor:</strong> ${data.topPrimeName} leads in prime contract awards.</li>
            <li><strong>Top Subcontractor:</strong> ${data.topSubName} is a significant subcontractor in this ecosystem.</li>
            <li><strong>Dominant NAICS:</strong> Key service areas include: ${data.dominantNaicsTextShort}.</li>
            <li><strong>Geographic Focus:</strong> ${data.geoDistributionText}</li>
            <li><strong>ARR Estimate:</strong> For ${data.arrNaicsCode}, the Average Annual Run Rate (ARR) is estimated around ${data.arrForTopNaics}.</li>
        </ul>
    </section>

    <section class="quick-intel">
        <div class="stat-card"><div class="stat-label">Top Prime</div><div class="stat-value">${data.topPrimeName}</div></div>
        <div class="stat-card"><div class="stat-label">Top Sub</div><div class="stat-value">${data.topSubName}</div></div>
        <div class="stat-card"><div class="stat-label">Top NAICS</div><div class="stat-value">${data.mostUsedNaicsCode}</div></div>
        <div class="stat-card"><div class="stat-label">Total Obligated</div><div class="stat-value">${data.totalAwardedFY}</div></div>
        <div class="stat-card"><div class="stat-label">Expiring Soon</div><div class="stat-value">${data.expiringCount} awards | ${data.expiringValueFormatted}</div></div>
    </section>

    <div class="grid-layout">
        <div class="grid-col-6"><div class="chart-container"><h2>Top 7 Prime Contractors (by Value)</h2><canvas id="contractors-chart"></canvas></div></div>
        <div class="grid-col-6"><div class="chart-container"><h2>NAICS Distribution (by Value %)</h2><canvas id="naics-chart"></canvas></div></div>
    </div>
    <div class="grid-layout"><div class="grid-col-12"><div class="chart-container"><h2>Top Contracts: TAV vs TCV</h2><canvas id="tav-tcv-chart"></canvas></div></div></div>

    <div class="table-container"><h2>Top 10 Prime Contractors</h2><table><thead><tr><th>Contractor</th><th>Total Value</th><th>Awards</th><th>Avg Duration</th><th>Primary NAICS</th></tr></thead><tbody>${primeRowsHtml}</tbody></table></div>
    <div class="table-container"><h2>Expiring Contracts (Next 6 Months)</h2><table><thead><tr><th>Contract ID</th><th>Contractor</th><th>Description</th><th>End Date</th><th>Value</th></tr></thead><tbody>${expiringRowsHtml}</tbody></table></div>

    <div class="grid-layout">
        <div class="grid-col-8"><div class="chart-container"><h2>Contract Work Geographic Distribution</h2><div id="map-chart" style="height: 100%; display:flex; align-items:center; justify-content:center;"><p style="color: var(--color-text-secondary); text-align:center;">${data.geoDistributionText}<br><em style="font-size:0.9em;">(Detailed map visualization not included in this snapshot format)</em></p></div></div></div>
        <div class="grid-col-4"><div class="chart-container"><h2>ARR Estimator</h2><div style="text-align: center; padding-top: 20px; height:100%; display:flex; flex-direction:column; justify-content:center;">
            <div style="font-size: 28px; font-weight: 700; margin-bottom: var(--spacing-sm); color: var(--color-primary);">${data.arrEstimatorData.arrFormatted}</div>
            <p style="color: var(--color-text-secondary); font-size: 13px;">For NAICS ${data.arrEstimatorData.naicsCode} (${data.arrEstimatorData.naicsDescription})</p>
            <p style="color: var(--color-text-secondary); font-size: 13px;">Avg. Contract: ${data.arrEstimatorData.avgContractSizeFormatted} over ${data.arrEstimatorData.avgDurationText}</p>
            <p style="font-size: 11px; color: var(--color-text-tertiary); margin-top: var(--spacing-md); padding: 0 var(--spacing-xs);">(ARR = Avg. Contract Value ÷ Avg. Duration. Ballpark estimate.)</p>
        </div></div></div>
    </div>
    <footer class="footer"><p>Data from USAspending.gov | Generated with Subhoo.com | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></footer>
</div>
<script>
    // Helper for chart currency formatting
    function formatCurrencyForChart(value) {
        if (value === null || value === undefined) return '$0';
        const numValue = Number(value);
        if (isNaN(numValue)) return '$0';
        if (Math.abs(numValue) >= 1.0e+9) return '$' + (numValue / 1.0e+9).toFixed(1) + 'B';
        if (Math.abs(numValue) >= 1.0e+6) return '$' + (numValue / 1.0e+6).toFixed(1) + 'M';
        if (Math.abs(numValue) >= 1.0e+3) return '$' + (numValue / 1.0e+3).toFixed(0) + 'K'; // No decimal for K
        return '$' + numValue.toFixed(0);
    }

    // Contractors Chart
    const contractorsChartData = ${JSON.stringify(data.primeContractorsChart)};
    const contractorsCtx = document.getElementById('contractors-chart').getContext('2d');
    new Chart(contractorsCtx, {
        type: 'bar',
        data: {
            labels: contractorsChartData.labels,
            datasets: [{ label: 'Contract Value', data: contractorsChartData.values, backgroundColor: 'rgba(154, 148, 155, 0.7)', borderColor: 'rgba(154, 148, 155, 1)', borderWidth: 1 }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatCurrencyForChart(ctx.raw) }}}, scales: { x: { beginAtZero: true, ticks: { callback: val => formatCurrencyForChart(val) }}}}
    });

    // NAICS Chart
    const naicsChartData = ${JSON.stringify(data.naicsDistributionChart)};
    const naicsCtx = document.getElementById('naics-chart').getContext('2d');
    new Chart(naicsCtx, {
        type: 'doughnut',
        data: {
            labels: naicsChartData.labels,
            datasets: [{ data: naicsChartData.values, backgroundColor: ['#9A949B', '#7A747B', '#B6B1B7', '#C8C2C9', '#DBD5DB', '#EDEAED', '#A59FA8'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth:12, padding:10, font: {size: 10}, generateLabels: chart => chart.data.labels.map((label, i) => ({ text: label + ' (' + chart.data.datasets[0].data[i] + '%)', fillStyle: chart.data.datasets[0].backgroundColor[i], index: i }))}}, tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.raw + '%' }}}}
    });

    // TAV vs TCV Chart
    const tavTcvChartData = ${JSON.stringify(data.tavTcvChart)};
    const tavTcvCtx = document.getElementById('tav-tcv-chart').getContext('2d');
    new Chart(tavTcvCtx, {
        type: 'bar',
        data: {
            labels: tavTcvChartData.map(d => d.name),
            datasets: [
                { label: 'TAV (Obligated)', data: tavTcvChartData.map(d => d.tav), backgroundColor: 'rgba(154, 148, 155, 0.7)', stack: 'Stack 0' },
                { label: 'TCV Remainder', data: tavTcvChartData.map(d => d.tcvRemainder), backgroundColor: 'rgba(182, 177, 183, 0.7)', stack: 'Stack 0' }
            ]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', callbacks: { label: ctx => ctx.dataset.label + ': ' + formatCurrencyForChart(ctx.raw), footer: items => { let total = 0; if(items[0]) { const dataIndex = items[0].dataIndex; total = tavTcvChartData[dataIndex].totalTcv; } return 'Total TCV: ' + formatCurrencyForChart(total);}}}}, scales: { x: { stacked: true, beginAtZero: true, ticks: { callback: val => formatCurrencyForChart(val) }}, y: { stacked: true, ticks: { font: {size: 10}} }}}
    });
<\/script>
</body></html>`;
    }

    // --- Main Event Handling ---
    function createAndDisplaySnapshot() {
        console.log("Attempting to create and display snapshot...");
        const snapshotDataObject = aggregateSnapshotData();
        if (snapshotDataObject) {
            const snapshotHtml = generateFullHtml(snapshotDataObject);
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(''); // Clear previous content if reusing window
                newWindow.document.write(snapshotHtml);
                newWindow.document.close();
                console.log("Snapshot displayed in new window.");
            } else {
                alert("Popup blocked. Please allow popups for this site to view the snapshot.");
            }
        } else {
            console.error("Failed to generate snapshot data object. Ensure an agency is loaded on the main page.");
        }
    }

    // --- Button Setup ---
    function setupSnapshotButtonOnMainPage() {
        const buttonId = 'subhoo-agency-snapshot-btn';
        let existingBtn = document.getElementById(buttonId);
        if (existingBtn) return; // Button already exists

        const targetContainer = document.querySelector('.side-panel .input-select:last-of-type'); // Try to place it after filters
        const parent = targetContainer ? targetContainer.parentNode : document.querySelector('.side-panel'); // Fallback to side-panel
        
        if (parent) {
            const btn = document.createElement('button');
            btn.id = buttonId;
            btn.textContent = 'View Agency Snapshot';
            btn.style.marginTop = '15px';
            btn.style.width = '100%';
            btn.style.padding = '10px';
            btn.style.backgroundColor = 'var(--color-primary)';
            btn.style.color = 'var(--color-on-primary, white)';
            btn.style.border = 'none';
            btn.style.borderRadius = 'var(--border-radius-md)';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '14px';
            btn.style.fontWeight = '600';

            btn.addEventListener('click', createAndDisplaySnapshot);
            
            if (targetContainer && targetContainer.nextSibling) {
                 parent.insertBefore(btn, targetContainer.nextSibling);
            } else {
                 parent.appendChild(btn);
            }
            console.log("Snapshot button added to UI.");
        } else {
            console.warn("Could not find a suitable container to attach the snapshot button on the main page.");
        }
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(setupSnapshotButtonOnMainPage, 1000));
    } else {
        setTimeout(setupSnapshotButtonOnMainPage, 1000); // Delay to ensure main page elements are ready
    }

    // Expose for external calls if needed
    window.triggerSubhooAgencySnapshot = createAndDisplaySnapshot;

})();