/**
 * Agency Snapshot Generator
 * 
 * This script generates a comprehensive agency snapshot based on data from the unified model.
 * It extracts real data about contractors, contracts, NAICS codes, and more to create
 * a one-page HTML report that can be used by Business Development Representatives.
 */

// Calculate duration in days between two dates
function calculateDurationDays(startDate, endDate) {
  // Parse dates if they're strings
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }
  
  // Calculate difference in milliseconds and convert to days
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Add 1 to include both start and end date
  
  return diffDays > 0 ? diffDays : 0;
}

// Format currency for display
function formatCurrencyShort(value) {
  if (!value) return '$0';
  
  if (typeof value === 'string' && value.startsWith('$')) {
    return value; // Already formatted
  }
  
  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  
  if (isNaN(numValue)) return '$0';
  
  if (numValue >= 1000000000) {
    return `$${(numValue / 1000000000).toFixed(1)}B`;
  } else if (numValue >= 1000000) {
    return `$${(numValue / 1000000).toFixed(1)}M`;
  } else if (numValue >= 1000) {
    return `$${(numValue / 1000).toFixed(1)}K`;
  }
  
  return `$${numValue.toFixed(0)}`;
}

// Function to get top prime contractors
function getTopContractorsFromModel(model, limit = 10) {
  if (!model || !model.primes) {
    return [];
  }
  
  // Sort prime contractors by value and take top ones
  return Object.values(model.primes)
    .map(prime => {
      // Calculate number of contracts
      const contractCount = prime.contracts ? prime.contracts.size : 0;
      
      // Calculate number of subcontractors
      const subCount = prime.subcontractors ? prime.subcontractors.size : 0;
      
      // Find dominant NAICS
      const naicsCounts = {};
      let dominantNaics = { code: "Unknown", desc: "Unknown", count: 0 };
      
      if (prime.contracts && model.contracts) {
        // Check contracts associated with this prime
        Array.from(prime.contracts).forEach(contractId => {
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
      }
      
      // Get avg contract duration
      let totalDuration = 0;
      let durationCount = 0;
      
      if (prime.contracts && model.contracts) {
        Array.from(prime.contracts).forEach(contractId => {
          const contract = model.contracts[contractId];
          if (contract && contract.startDate && contract.endDate) {
            const duration = calculateDurationDays(contract.startDate, contract.endDate);
            if (duration > 0) {
              totalDuration += duration;
              durationCount++;
            }
          }
        });
      }
      
      const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
      
      return {
        name: prime.name,
        value: prime.value || 0,
        awards: contractCount,
        avgDuration: avgDuration,
        primaryNaics: dominantNaics.code + ' - ' + dominantNaics.desc
      };
    })
    .filter(contractor => contractor.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

// Function to get NAICS distribution
function getNaicsDistributionFromModel(model) {
  if (!model || !model.contracts) {
    return [];
  }
  
  // Group contracts by NAICS code
  const naicsCounts = {};
  let totalValue = 0;
  
  Object.values(model.contracts).forEach(contract => {
    if (contract.naicsCode && contract.value) {
      if (!naicsCounts[contract.naicsCode]) {
        naicsCounts[contract.naicsCode] = {
          code: contract.naicsCode,
          description: contract.naicsDesc || "Unknown",
          value: 0
        };
      }
      naicsCounts[contract.naicsCode].value += contract.value;
      totalValue += contract.value;
    }
  });
  
  // Convert to array, calculate percentages, and sort
  const naicsDistribution = Object.values(naicsCounts)
    .map(item => {
      return {
        ...item,
        percentage: totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0
      };
    })
    .sort((a, b) => b.value - a.value);
  
  // Take top 5 and group rest as "Other"
  const topNaics = naicsDistribution.slice(0, 5);
  
  const otherValue = naicsDistribution.slice(5).reduce((sum, item) => sum + item.value, 0);
  const otherPercentage = totalValue > 0 ? Math.round((otherValue / totalValue) * 100) : 0;
  
  if (otherValue > 0) {
    topNaics.push({
      code: "Other",
      description: "Various Other NAICS",
      value: otherValue,
      percentage: otherPercentage
    });
  }
  
  return topNaics;
}

// Function to get top contracts with TAV/TCV
function getTopContractsFromModel(model, limit = 7) {
  if (!model || !model.contracts) {
    return [];
  }
  
  // Get contracts with obligated and potential values
  return Object.values(model.contracts)
    .filter(contract => contract.value > 0 && contract.raw)
    .map(contract => {
      const prime = model.primes[contract.primeId];
      const tavValue = Number(contract.raw.obligatedValue || 0);
      const tcvValue = Number(contract.value || 0);
      const description = contract.description || (prime ? prime.name + " Contract" : "Unknown Contract");
      
      return {
        name: description.length > 30 ? description.substring(0, 27) + '...' : description,
        description: description,
        contractor: prime ? prime.name : "Unknown",
        tav: tavValue,
        tcv: tcvValue,
        tcvRemainder: Math.max(0, tcvValue - tavValue)
      };
    })
    .sort((a, b) => b.tcv - a.tcv)
    .slice(0, limit);
}

// Function to get expiring contracts
function getExpiringContractsFromModel(model, monthsAhead = 6) {
  if (!model || !model.contracts) {
    return { count: 0, value: 0, list: [] };
  }
  
  const today = new Date();
  const futureDate = new Date();
  futureDate.setMonth(today.getMonth() + monthsAhead);
  
  // Find contracts expiring in the specified time frame
  const expiringContracts = Object.values(model.contracts)
    .filter(contract => {
      if (!contract.endDate) return false;
      const endDate = new Date(contract.endDate);
      return !isNaN(endDate.getTime()) && endDate >= today && endDate <= futureDate;
    })
    .map(contract => {
      const prime = model.primes[contract.primeId];
      return {
        id: contract.id,
        contractor: prime ? prime.name : "Unknown",
        description: contract.description || "No description",
        endDate: contract.endDate instanceof Date ? 
          contract.endDate.toLocaleDateString() : 
          new Date(contract.endDate).toLocaleDateString(),
        value: contract.value || 0
      };
    })
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  
  // Calculate total value
  const totalValue = expiringContracts.reduce((sum, contract) => sum + contract.value, 0);
  
  return {
    count: expiringContracts.length,
    value: totalValue,
    list: expiringContracts.slice(0, 5) // Top 5 for display
  };
}

// Function to calculate ARR
function getARREstimateFromModel(model, naicsCode = null) {
  if (!model || !model.contracts) {
    return { arr: "0", avgContractSize: "0", avgDuration: "0", naicsCode: "Unknown" };
  }
  
  // If NAICS code is not provided, find the most common one
  if (!naicsCode) {
    const naicsCounts = {};
    Object.values(model.contracts).forEach(contract => {
      if (contract.naicsCode) {
        naicsCounts[contract.naicsCode] = (naicsCounts[contract.naicsCode] || 0) + 1;
      }
    });
    
    // Find most common NAICS
    let maxCount = 0;
    Object.entries(naicsCounts).forEach(([code, count]) => {
      if (count > maxCount) {
        maxCount = count;
        naicsCode = code;
      }
    });
  }
  
  // Filter contracts by NAICS code
  const contractsWithNaics = Object.values(model.contracts)
    .filter(contract => contract.naicsCode === naicsCode && contract.value > 0);
  
  if (contractsWithNaics.length === 0) {
    return { arr: "0", avgContractSize: "0", avgDuration: "0", naicsCode: naicsCode || "Unknown" };
  }
  
  // Calculate average contract size
  const totalValue = contractsWithNaics.reduce((sum, contract) => sum + contract.value, 0);
  const avgContractSize = totalValue / contractsWithNaics.length;
  
  // Calculate average duration in years
  let totalDurationDays = 0;
  let contractsWithDuration = 0;
  
  contractsWithNaics.forEach(contract => {
    if (contract.startDate && contract.endDate) {
      const durationDays = calculateDurationDays(contract.startDate, contract.endDate);
      if (durationDays > 0) {
        totalDurationDays += durationDays;
        contractsWithDuration++;
      }
    }
  });
  
  const avgDurationDays = contractsWithDuration > 0 ? totalDurationDays / contractsWithDuration : 0;
  const avgDurationYears = avgDurationDays / 365;
  
  // Calculate ARR
  const arr = avgDurationYears > 0 ? avgContractSize / avgDurationYears : 0;
  
  // Get NAICS description
  let naicsDesc = "Unknown";
  for (const contract of contractsWithNaics) {
    if (contract.naicsDesc) {
      naicsDesc = contract.naicsDesc;
      break;
    }
  }
  
  return {
    arr: arr,
    avgContractSize: avgContractSize,
    avgDurationYears: avgDurationYears,
    naicsCode: naicsCode,
    naicsDesc: naicsDesc
  };
}

// Function to get agency name
function getAgencyNameFromModel(model) {
  if (!model || !model.agencies) {
    return "Unknown Agency";
  }
  
  // Get the agency with the highest value
  let highestValue = 0;
  let agencyName = "Unknown Agency";
  
  Object.values(model.agencies).forEach(agency => {
    if (agency.value > highestValue) {
      highestValue = agency.value;
      agencyName = agency.name;
    }
  });
  
  return agencyName;
}

// Function to get geographic distribution
function getGeographicDistributionFromModel(model) {
  if (!model || !model.contracts) {
    return "No geographic data available";
  }
  
  // Create a map of state codes to contract counts and values
  const stateData = {};
  
  Object.values(model.contracts).forEach(contract => {
    if (contract.raw && contract.raw.popStateCode) {
      const stateCode = contract.raw.popStateCode;
      if (!stateData[stateCode]) {
        stateData[stateCode] = { count: 0, value: 0 };
      }
      stateData[stateCode].count += 1;
      stateData[stateCode].value += contract.value || 0;
    }
  });
  
  // Get top 3 states by value
  const topStates = Object.entries(stateData)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 3)
    .map(([code, data]) => {
      // Convert state code to name (simplified mapping for example)
      const stateMap = {
        "VA": "Virginia",
        "MD": "Maryland",
        "DC": "DC",
        "TX": "Texas",
        "GA": "Georgia",
        "CA": "California",
        // Add more as needed
      };
      
      return stateMap[code] || code;
    });
  
  if (topStates.length === 0) {
    return "No geographic data available";
  }
  
  // This would be more sophisticated in reality, looking for clusters
  return `Place of Performance data shows clusters in ${topStates.join(', ')}.`;
}

// Main function to generate comprehensive snapshot data from the model
function generateSnapshotFromModel(model) {
  // Fetch top NAICS to use in ARR calculation
  const naicsDistribution = getNaicsDistributionFromModel(model);
  const topNaicsCode = naicsDistribution.length > 0 ? naicsDistribution[0].code : null;
  
  // Get ARR estimate for the top NAICS
  const arrEstimate = getARREstimateFromModel(model, topNaicsCode);
  
  // Get expiring contracts
  const expiringContracts = getExpiringContractsFromModel(model);
  
  // Get top contractors
  const topContractors = getTopContractorsFromModel(model);
  
  return {
    agencyName: getAgencyNameFromModel(model),
    updateDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    totalAwarded: formatCurrencyShort(model.stats?.totalContractValue || 0),
    expiringContracts: {
      count: expiringContracts.count,
      value: formatCurrencyShort(expiringContracts.value)
    },
    topPrime: topContractors.length > 0 ? topContractors[0].name : "Unknown",
    topSub: Object.values(model.subs || {})
      .sort((a, b) => (b.value || 0) - (a.value || 0))[0]?.name || "Unknown",
    topNaics: topNaicsCode + (arrEstimate.naicsDesc ? ` – ${arrEstimate.naicsDesc}` : ""),
    topPrimeContractors: topContractors,
    naicsDistribution: naicsDistribution,
    topContracts: getTopContractsFromModel(model),
    expiringContractsList: expiringContracts.list,
    contractWorkLocations: getGeographicDistributionFromModel(model),
    arrEstimate: {
      arr: formatCurrencyShort(arrEstimate.arr),
      avgContractSize: formatCurrencyShort(arrEstimate.avgContractSize),
      avgDuration: `${Math.round(arrEstimate.avgDurationYears)} years`,
      naicsCode: topNaicsCode
    }
  };
}

// Function to generate the complete HTML for an agency snapshot
function generateAgencySnapshotHTML(model) {
  // Extract data from model
  const data = generateSnapshotFromModel(model);
  
  // Format currency for HTML display
  function formatCurrency(value) {
    if (!value) return '$0';
    
    // For numeric values
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    
    // For pre-formatted strings (already have $ sign)
    if (typeof value === 'string' && value.startsWith('$')) {
      return value;
    }
    
    // Default - try to parse and format
    return '$' + value;
  }
  
  // Creating HTML template with real data
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.agencyName} Snapshot</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>

  <style>
    :root {
      /* Colors */
      --color-primary: #9A949B;
      --color-secondary: #7A747B;
      --color-tertiary: #B6B1B7;
      --color-background: #F9F9F9;
      --color-surface: #FFFFFF;
      --color-border: #DDDDDD;
      --color-text-primary: #222222;
      --color-text-secondary: #555555;
      --color-text-tertiary: #B3B3B3;
      
      /* Spacing */
      --spacing-xs: 8px;
      --spacing-sm: 12px;
      --spacing-md: 16px;
      --spacing-lg: 24px;
      --spacing-xl: 32px;
      
      /* Border radius */
      --border-radius-sm: 4px;
      --border-radius-md: 8px;
      --border-radius-lg: 12px;
    }
    
    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      :root {
        --color-primary: #A59FA8;
        --color-secondary: #908A91;
        --color-tertiary: #767077;
        --color-background: #1E1E1E;
        --color-surface: #2B2B2B;
        --color-border: #444444;
        --color-text-primary: #F5F5F5;
        --color-text-secondary: #C8C8C8;
        --color-text-tertiary: #767077;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--color-background);
      color: var(--color-text-primary);
      padding: 0;
      margin: 0;
      line-height: 1.5;
    }
    
    .agency-snapshot {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--spacing-lg);
      background-color: var(--color-surface);
      border-radius: var(--border-radius-lg);
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    
    .snapshot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
    }
    
    .snapshot-header h1 {
      font-size: 24px;
      font-weight: 700;
    }
    
    .snapshot-header p {
      color: var(--color-text-secondary);
      font-size: 14px;
      margin-top: var(--spacing-xs);
    }
    
    .snapshot-date {
      color: var(--color-text-secondary);
      font-size: 14px;
      padding: var(--spacing-xs) var(--spacing-sm);
      background-color: rgba(0,0,0,0.05);
      border-radius: var(--border-radius-sm);
    }
    
    .quick-intel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }
    
    .stat-card {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-md);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-xs);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text-primary);
    }
    
    .grid-layout {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }
    
    .grid-col-6 {
      grid-column: span 6;
    }
    
    .grid-col-4 {
      grid-column: span 4;
    }
    
    .grid-col-8 {
      grid-column: span 8;
    }
    
    .grid-col-12 {
      grid-column: span 12;
    }
    
    .chart-container {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-md);
      height: 300px;
      position: relative;
    }
    
    .chart-container h2 {
      font-size: 16px;
      margin-bottom: var(--spacing-md);
      font-weight: 600;
    }
    
    .table-container {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      overflow: hidden;
    }
    
    .table-container h2 {
      font-size: 16px;
      margin-bottom: var(--spacing-md);
      font-weight: 600;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    thead th {
      text-align: left;
      padding: var(--spacing-sm);
      font-weight: 600;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-border);
    }
    
    tbody td {
      padding: var(--spacing-sm);
      border-bottom: 1px solid var(--color-border);
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    .number-cell {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    
    .insights {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }
    
    .insights h2 {
      font-size: 18px;
      margin-bottom: var(--spacing-md);
    }
    
    .insights p {
      margin-bottom: var(--spacing-md);
      font-size: 14px;
    }
    
    .insights ul {
      margin-left: var(--spacing-lg);
      margin-bottom: var(--spacing-md);
    }
    
    .insights li {
      margin-bottom: var(--spacing-xs);
      font-size: 14px;
    }
    
    .footer {
      text-align: center;
      color: var(--color-text-tertiary);
      font-size: 12px;
      margin-top: var(--spacing-xl);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--color-border);
    }
    
    @media (max-width: 768px) {
      .grid-layout {
        grid-template-columns: 1fr;
      }
      
      .grid-col-6, .grid-col-4, .grid-col-8, .grid-col-12 {
        grid-column: span 1;
      }
      
      .chart-container {
        height: 250px;
      }
      
      .snapshot-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .snapshot-date {
        margin-top: var(--spacing-md);
      }
      
      .quick-intel {
        grid-template-columns: 1fr 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="agency-snapshot">
    <header class="snapshot-header">
      <div>
        <h1>${data.agencyName} Snapshot</h1>
        <p>Updated: ${data.updateDate}</p>
      </div>
      <div class="snapshot-date" id="current-date"></div>
    </header>
    
    <section class="insights">
      <h2>Executive Summary</h2>
      <p>The ${data.agencyName} spent <strong>${data.totalAwarded}</strong> in FY24, with a significant focus on ${data.topNaics}. The agency has <strong>${data.expiringContracts.count}</strong> awards worth <strong>${data.expiringContracts.value}</strong> expiring in the next 6 months, presenting near-term opportunities.</p>
      
      <h3 style="margin-top: var(--spacing-md); margin-bottom: var(--spacing-xs); font-size: 16px;">Key Insights</h3>
      <ul>
        <li>${data.topPrime} leads prime contract awards, while ${data.topSub} is the top subcontractor</li>
        <li>Professional services (${data.naicsDistribution[0]?.code || 'N/A'}, ${data.naicsDistribution[1]?.code || 'N/A'}) dominate the NAICS distribution</li>
        <li>${data.contractWorkLocations}</li>
        <li>Average annual run rate (ARR) for ${data.arrEstimate.naicsCode} is approximately ${data.arrEstimate.arr}</li>
      </ul>
    </section>
    
    <section class="quick-intel">
      <div class="stat-card">
        <div class="stat-label">Top Prime</div>
        <div class="stat-value">${data.topPrime}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Top Sub</div>
        <div class="stat-value">${data.topSub}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Most Used NAICS</div>
        <div class="stat-value">${data.naicsDistribution[0]?.code || 'N/A'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Awarded (FY24)</div>
        <div class="stat-value">${data.totalAwarded}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Expiring Soon</div>
        <div class="stat-value">${data.expiringContracts.count} awards | ${data.expiringContracts.value}</div>
      </div>
    </section>
    
    <div class="grid-layout">
      <div class="grid-col-6">
        <div class="chart-container">
          <h2>Top 7 Prime Contractors</h2>
          <canvas id="contractors-chart"></canvas>
        </div>
      </div>
      <div class="grid-col-6">
        <div class="chart-container">
          <h2>NAICS Distribution</h2>
          <canvas id="naics-chart"></canvas>
        </div>
      </div>
    </div>
    
    <div class="grid-layout">
      <div class="grid-col-12">
        <div class="chart-container">
          <h2>Top Contracts: TAV vs TCV</h2>
          <canvas id="tav-tcv-chart"></canvas>
        </div>
      </div>
    </div>
    
    <div class="table-container">
      <h2>Top 10 Prime Contractors</h2>
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
        <tbody>
          ${data.topPrimeContractors.map(contractor => `
            <tr>
              <td>${contractor.name}</td>
              <td class="number-cell">${formatCurrency(contractor.value)}</td>
              <td class="number-cell">${contractor.awards}</td>
              <td class="number-cell">${contractor.avgDuration} days</td>
              <td>${contractor.primaryNaics}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="table-container">
      <h2>Expiring Contracts (Next 6 Months)</h2>
      <table>
        <thead>
          <tr>
            <th>Contract ID</th>
            <th>Contractor</th>
            <th>Description</th>
            <th>End Date</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${data.expiringContractsList.map(contract => `
            <tr>
              <td>${contract.id}</td>
              <td>${contract.contractor}</td>
              <td>${contract.description}</td>
              <td>${contract.endDate}</td>
              <td class="number-cell">${formatCurrency(contract.value)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="grid-layout">
      <div class="grid-col-8">
        <div class="chart-container">
          <h2>Contract Work Geographic Distribution</h2>
          <div id="map-chart" style="height: 100%;">
            <p style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--color-text-secondary);">
              ${data.contractWorkLocations}
            </p>
          </div>
        </div>
      </div>
      <div class="grid-col-4">
        <div class="chart-container">
          <h2>ARR Estimator</h2>
          <div style="text-align: center; padding-top: 40px;">
            <div style="font-size: 32px; font-weight: 700; margin-bottom: 16px; color: var(--color-primary);">${data.arrEstimate.arr}</div>
            <p style="color: var(--color-text-secondary); font-size: 14px; margin-top: 32px;">
              For NAICS ${data.arrEstimate.naicsCode}, average contract size is ${data.arrEstimate.avgContractSize} over ${data.arrEstimate.avgDuration}
            </p>
            <p style="font-size: 12px; color: var(--color-text-tertiary); margin-top: 16px;">
              (ARR = Total Value ÷ Duration. This is a ballpark average—real results vary by scope, pricing, and delivery.)
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <footer class="footer">
      <p>Data from USAspending.gov | Generated with Subhoo.com</p>
    </footer>
  </div>

  <script>
    // Set current date
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    // Function to format currency
    function formatCurrency(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    
    // Top contractors chart
    const contractorsCtx = document.getElementById('contractors-chart').getContext('2d');
    const contractorsChart = new Chart(contractorsCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(data.topPrimeContractors.slice(0, 7).map(c => c.name.length > 10 ? c.name.substring(0, 10) + '...' : c.name))},
        datasets: [{
          label: 'Contract Value',
          data: ${JSON.stringify(data.topPrimeContractors.slice(0, 7).map(c => c.value))},
          backgroundColor: '#9A949B',
          borderColor: '#FFFFFF',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return formatCurrency(context.raw);
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (value >= 1000000000) {
                  return '$' + value / 1000000000 + 'B';
                } else if (value >= 1000000) {
                  return '$' + value / 1000000 + 'M';
                }
                return formatCurrency(value);
              }
            }
          }
        }
      }
    });
    
    // NAICS distribution chart
    const naicsCtx = document.getElementById('naics-chart').getContext('2d');
    const naicsChart = new Chart(naicsCtx, {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(data.naicsDistribution.map(n => n.code))},
        datasets: [{
          data: ${JSON.stringify(data.naicsDistribution.map(n => n.percentage))},
          backgroundColor: [
            '#9A949B',
            '#7A747B',
            '#B6B1B7',
            '#C8C2C9',
            '#DBD5DB',
            '#EDEAED'
          ],
          borderColor: '#FFFFFF',
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
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map(function(label, i) {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    
                    return {
                      text: label + ' - ' + data.datasets[0].data[i] + '%',
                      fillStyle: style.backgroundColor,
                      strokeStyle: style.borderColor,
                      lineWidth: style.borderWidth,
                      hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return label + ': ' + value + '%';
              }
            }
          }
        }
      }
    });
    
    // TAV vs TCV chart
    const tavTcvCtx = document.getElementById('tav-tcv-chart').getContext('2d');
    const tavTcvChart = new Chart(tavTcvCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(data.topContracts.map(c => c.name))},
        datasets: [
          {
            label: 'TAV (Obligated)',
            data: ${JSON.stringify(data.topContracts.map(c => c.tav))},
            backgroundColor: '#9A949B',
            borderColor: '#FFFFFF',
            borderWidth: 1,
            stack: 'Stack 0'
          },
          {
            label: 'TCV Remainder',
            data: ${JSON.stringify(data.topContracts.map(c => c.tcvRemainder))},
            backgroundColor: '#B6B1B7',
            borderColor: '#FFFFFF',
            borderWidth: 1,
            stack: 'Stack 0'
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.raw || 0;
                return label + ': ' + formatCurrency(value);
              },
              footer: function(tooltipItems) {
                let sum = 0;
                tooltipItems.forEach(function(tooltipItem) {
                  sum += tooltipItem.parsed.x;
                });
                return 'Total: ' + formatCurrency(sum);
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (value >= 1000000000) {
                  return '$' + value / 1000000000 + 'B';
                } else if (value >= 1000000) {
                  return '$' + value / 1000000 + 'M';
                }
                return formatCurrency(value);
              }
            }
          },
          y: {
            stacked: true
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

// Function to create a snapshot for the current agency and open it in a new window
function viewAgencySnapshot() {
  // Get the unified model from the global scope
  const model = window.unifiedModel;
  
  // Generate the HTML for the agency snapshot
  const html = generateAgencySnapshotHTML(model);
  
  // Open the HTML in a new window
  const newWindow = window.open('', '_blank');
  newWindow.document.write(html);
  newWindow.document.close();
}

// Add a button to the UI to generate and view the agency snapshot
function addSnapshotButton() {
  // Find a good place to add the button (e.g., next to the refresh button)
  const refreshButton = document.getElementById('refresh-button');
  if (!refreshButton || !refreshButton.parentNode) {
    console.warn("Could not find refresh button to add snapshot button next to it");
    return;
  }
  
  // Create the snapshot button
  const snapshotButton = document.createElement('button');
  snapshotButton.id = 'snapshot-button';
  snapshotButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
    Generate Snapshot
  `;
  snapshotButton.style.marginLeft = '8px';
  
  // Add click event to generate and view the snapshot
  snapshotButton.addEventListener('click', viewAgencySnapshot);
  
  // Add button next to the refresh button
  refreshButton.parentNode.appendChild(snapshotButton);
}

// Initialize the snapshot functionality when the page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("Adding snapshot button to UI");
  setTimeout(addSnapshotButton, 1000); // Wait for the UI to fully load
});

// Export functions for use elsewhere
window.generateSnapshotFromModel = generateSnapshotFromModel;
window.generateAgencySnapshotHTML = generateAgencySnapshotHTML;
window.viewAgencySnapshot = viewAgencySnapshot;
// Add this function to display the snapshot inside the current page
function viewInlineAgencySnapshot() {
  try {
    // Check if the unified model exists
    const model = window.unifiedModel;
    if (!model) {
      alert("Please load a dataset first");
      return;
    }
    
    // Generate the HTML content
    const snapshotData = generateSnapshotFromModel(model);
    
    // Create a modal container
    const modalContainer = document.createElement('div');
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modalContainer.style.zIndex = '9999';
    modalContainer.style.overflow = 'auto';
    modalContainer.style.display = 'flex';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.padding = '20px';
    
    // Create content frame
    const contentFrame = document.createElement('div');
    contentFrame.style.backgroundColor = 'var(--color-surface, white)';
    contentFrame.style.borderRadius = '8px';
    contentFrame.style.maxWidth = '1200px';
    contentFrame.style.width = '100%';
    contentFrame.style.maxHeight = '90vh';
    contentFrame.style.overflowY = 'auto';
    contentFrame.style.position = 'relative';
    contentFrame.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.zIndex = '1';
    closeButton.style.color = 'var(--color-text-secondary, gray)';
    closeButton.onclick = function() {
      document.body.removeChild(modalContainer);
    };
    
    // Add export button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export as HTML';
    exportButton.style.position = 'absolute';
    exportButton.style.top = '10px';
    exportButton.style.right = '50px';
    exportButton.style.padding = '5px 10px';
    exportButton.style.backgroundColor = 'var(--color-primary, #9A949B)';
    exportButton.style.color = 'white';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '4px';
    exportButton.style.cursor = 'pointer';
    exportButton.onclick = function() {
      const html = generateAgencySnapshotHTML(model);
      const blob = new Blob([html], {type: 'text/html'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${snapshotData.agencyName}_Snapshot.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    
    // Add snapshot content 
    const snapshotContent = document.createElement('div');
    snapshotContent.innerHTML = `
      <div style="padding: 30px;">
        <h1 style="font-size: 24px; margin-bottom: 5px;">${snapshotData.agencyName} Snapshot</h1>
        <p style="color: gray; margin-bottom: 20px;">Updated: ${snapshotData.updateDate}</p>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
          <h2 style="font-size: 18px; margin-bottom: 10px;">Executive Summary</h2>
          <p>The ${snapshotData.agencyName} spent <strong>${snapshotData.totalAwarded}</strong> in FY24, with ${snapshotData.expiringContracts.count} awards worth ${snapshotData.expiringContracts.value} expiring in the next 6 months.</p>
          <ul style="margin-top: 10px; margin-left: 20px;">
            <li>${snapshotData.topPrime} leads prime contract awards</li>
            <li>${snapshotData.topSub} is the top subcontractor</li>
            <li>Most used NAICS: ${snapshotData.topNaics}</li>
            <li>ARR for ${snapshotData.arrEstimate.naicsCode}: ${snapshotData.arrEstimate.arr}</li>
          </ul>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
          ${snapshotData.topPrimeContractors.slice(0, 5).map(contractor => `
            <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px;">
              <div style="font-size: 18px; font-weight: bold;">${contractor.name}</div>
              <div style="font-size: 20px; color: var(--color-primary, #9A949B); margin: 5px 0;">${formatCurrencyShort(contractor.value)}</div>
              <div style="font-size: 12px; color: gray;">${contractor.awards} awards • ${contractor.avgDuration} days avg</div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 18px; margin-bottom: 10px;">Expiring Contracts (Next 6 Months)</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Contractor</th>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Description</th>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">End Date</th>
                <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${snapshotData.expiringContractsList.map(contract => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${contract.contractor}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${contract.description}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${contract.endDate}</td>
                  <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee;">${formatCurrencyShort(contract.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="text-align: center; font-size: 12px; color: gray; margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">
          Data from USAspending.gov | Generated with Subhoo.com
        </div>
      </div>
    `;
    
    contentFrame.appendChild(closeButton);
    contentFrame.appendChild(exportButton);
    contentFrame.appendChild(snapshotContent);
    modalContainer.appendChild(contentFrame);
    document.body.appendChild(modalContainer);
    
  } catch (error) {
    console.error("Error generating inline snapshot:", error);
    alert(`An error occurred: ${error.message}`);
  }
}

// Helper function for the inline snapshot
function formatCurrencyShort(value) {
  if (!value) return '$0';
  
  if (typeof value === 'string' && value.startsWith('$')) {
    return value; // Already formatted
  }
  
  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  
  if (isNaN(numValue)) return '$0';
  
  if (numValue >= 1000000000) {
    return `$${(numValue / 1000000000).toFixed(1)}B`;
  } else if (numValue >= 1000000) {
    return `$${(numValue / 1000000).toFixed(1)}M`;
  } else if (numValue >= 1000) {
    return `$${(numValue / 1000).toFixed(1)}K`;
  }
  
  return `$${numValue.toFixed(0)}`;
}

// Add a new button for the inline snapshot
function addInlineSnapshotButton() {
  // Find the refresh button
  const refreshButton = document.getElementById('refresh-button');
  if (!refreshButton || !refreshButton.parentNode) {
    console.warn("Could not find refresh button to add snapshot button next to it");
    return;
  }
  
  // Create the inline snapshot button
  const inlineButton = document.createElement('button');
  inlineButton.id = 'inline-snapshot-button';
  inlineButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
    Quick Snapshot
  `;
  inlineButton.style.marginLeft = '8px';
  
  // Add click event directly
  inlineButton.onclick = function() {
    console.log("Inline button clicked");
    viewInlineAgencySnapshot();
  };
  
  // Add button next to the refresh button
  refreshButton.parentNode.appendChild(inlineButton);
  console.log("Inline snapshot button added");
}

// Add the inline button
addInlineSnapshotButton();
// Agency Snapshot Integration - Complete Solution
(function() {
  console.log("Initializing agency snapshot integration...");
  
  // Ensure the snapshot generator functions are properly exposed
  function ensureSnapshotFunctions() {
    // Make sure the core functions are available in the global scope
    if (typeof window.generateSnapshotFromModel !== 'function' && 
        typeof generateSnapshotFromModel === 'function') {
      window.generateSnapshotFromModel = generateSnapshotFromModel;
    }
    
    if (typeof window.generateAgencySnapshotHTML !== 'function' && 
        typeof generateAgencySnapshotHTML === 'function') {
      window.generateAgencySnapshotHTML = generateAgencySnapshotHTML;
    }
    
    // Add the view functions if they don't exist
    if (typeof window.viewAgencySnapshot !== 'function') {
      window.viewAgencySnapshot = function() {
        console.log("Generating full agency snapshot...");
        // Get the unified model from the global scope
        const model = window.unifiedModel;
        if (!model) {
          alert("Please load a dataset first");
          return;
        }
        
        // Generate the HTML for the agency snapshot
        const html = window.generateAgencySnapshotHTML(model);
        
        // Open the HTML in a new window
        const newWindow = window.open('', '_blank');
        newWindow.document.write(html);
        newWindow.document.close();
      };
    }
    
    if (typeof window.viewInlineAgencySnapshot !== 'function') {
      window.viewInlineAgencySnapshot = function() {
        try {
          console.log("Generating inline agency snapshot...");
          // Check if the unified model exists
          const model = window.unifiedModel;
          if (!model) {
            alert("Please load a dataset first");
            return;
          }
          
          // Generate the snapshot data
          const snapshotData = window.generateSnapshotFromModel(model);
          
          // Create a modal container
          const modalContainer = document.createElement('div');
          modalContainer.style.position = 'fixed';
          modalContainer.style.top = '0';
          modalContainer.style.left = '0';
          modalContainer.style.width = '100%';
          modalContainer.style.height = '100%';
          modalContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
          modalContainer.style.zIndex = '9999';
          modalContainer.style.overflow = 'auto';
          modalContainer.style.display = 'flex';
          modalContainer.style.justifyContent = 'center';
          modalContainer.style.padding = '20px';
          
          // Create content frame
          const contentFrame = document.createElement('div');
          contentFrame.style.backgroundColor = 'var(--color-surface, white)';
          contentFrame.style.borderRadius = '8px';
          contentFrame.style.maxWidth = '1200px';
          contentFrame.style.width = '100%';
          contentFrame.style.maxHeight = '90vh';
          contentFrame.style.overflowY = 'auto';
          contentFrame.style.position = 'relative';
          contentFrame.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
          
          // Add close button
          const closeButton = document.createElement('button');
          closeButton.textContent = '✕';
          closeButton.style.position = 'absolute';
          closeButton.style.top = '10px';
          closeButton.style.right = '10px';
          closeButton.style.backgroundColor = 'transparent';
          closeButton.style.border = 'none';
          closeButton.style.fontSize = '24px';
          closeButton.style.cursor = 'pointer';
          closeButton.style.zIndex = '1';
          closeButton.style.color = 'var(--color-text-secondary, gray)';
          closeButton.onclick = function() {
            document.body.removeChild(modalContainer);
          };
          
          // Add export button
          const exportButton = document.createElement('button');
          exportButton.textContent = 'Export as HTML';
          exportButton.style.position = 'absolute';
          exportButton.style.top = '10px';
          exportButton.style.right = '50px';
          exportButton.style.padding = '5px 10px';
          exportButton.style.backgroundColor = 'var(--color-primary, #9A949B)';
          exportButton.style.color = 'white';
          exportButton.style.border = 'none';
          exportButton.style.borderRadius = '4px';
          exportButton.style.cursor = 'pointer';
          exportButton.onclick = function() {
            const html = window.generateAgencySnapshotHTML(model);
            const blob = new Blob([html], {type: 'text/html'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${snapshotData.agencyName}_Snapshot.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          };
          
          // Add snapshot content 
          const snapshotContent = document.createElement('div');
          snapshotContent.innerHTML = `
            <div style="padding: 30px;">
              <h1 style="font-size: 24px; margin-bottom: 5px;">${snapshotData.agencyName} Snapshot</h1>
              <p style="color: gray; margin-bottom: 20px;">Updated: ${snapshotData.updateDate}</p>
              
              <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                <h2 style="font-size: 18px; margin-bottom: 10px;">Executive Summary</h2>
                <p>The ${snapshotData.agencyName} spent <strong>${snapshotData.totalAwarded}</strong> in FY24, with ${snapshotData.expiringContracts.count} awards worth ${snapshotData.expiringContracts.value} expiring in the next 6 months.</p>
                <ul style="margin-top: 10px; margin-left: 20px;">
                  <li>${snapshotData.topPrime} leads prime contract awards</li>
                  <li>${snapshotData.topSub} is the top subcontractor</li>
                  <li>Most used NAICS: ${snapshotData.topNaics}</li>
                  <li>ARR for ${snapshotData.arrEstimate.naicsCode}: ${snapshotData.arrEstimate.arr}</li>
                </ul>
              </div>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                ${snapshotData.topPrimeContractors.slice(0, 5).map(contractor => `
                  <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                    <div style="font-size: 18px; font-weight: bold;">${contractor.name}</div>
                    <div style="font-size: 20px; color: var(--color-primary, #9A949B); margin: 5px 0;">${formatCurrencyShort(contractor.value)}</div>
                    <div style="font-size: 12px; color: gray;">${contractor.awards} awards • ${contractor.avgDuration} days avg</div>
                  </div>
                `).join('')}
              </div>
              
              <div style="margin-bottom: 20px;">
                <h2 style="font-size: 18px; margin-bottom: 10px;">Expiring Contracts (Next 6 Months)</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #f5f5f5;">
                      <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Contractor</th>
                      <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Description</th>
                      <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">End Date</th>
                      <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${snapshotData.expiringContractsList.map(contract => `
                      <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${contract.contractor}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${contract.description}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${contract.endDate}</td>
                        <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee;">${formatCurrencyShort(contract.value)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <div style="text-align: center; font-size: 12px; color: gray; margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">
                Data from USAspending.gov | Generated with Subhoo.com
              </div>
            </div>
          `;
          
          contentFrame.appendChild(closeButton);
          contentFrame.appendChild(exportButton);
          contentFrame.appendChild(snapshotContent);
          modalContainer.appendChild(contentFrame);
          document.body.appendChild(modalContainer);
          
        } catch (error) {
          console.error("Error generating inline snapshot:", error);
          alert(`An error occurred: ${error.message}`);
        }
      };
    }
    
    // Ensure the formatCurrencyShort helper is available
    if (typeof window.formatCurrencyShort !== 'function') {
      window.formatCurrencyShort = function(value) {
        if (!value) return '$0';
        
        if (typeof value === 'string' && value.startsWith('$')) {
          return value; // Already formatted
        }
        
        // Convert to number if it's a string
        const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
        
        if (isNaN(numValue)) return '$0';
        
        if (numValue >= 1000000000) {
          return `$${(numValue / 1000000000).toFixed(1)}B`;
        } else if (numValue >= 1000000) {
          return `$${(numValue / 1000000).toFixed(1)}M`;
        } else if (numValue >= 1000) {
          return `$${(numValue / 1000).toFixed(1)}K`;
        }
        
        return `$${numValue.toFixed(0)}`;
      };
    }
    
    console.log("Snapshot functions verified and exposed as needed");
  }
  
  // Add snapshot buttons to the UI
  function addSnapshotButtons() {
    // Find a good place to add the buttons
    const refreshButton = document.getElementById('refresh-button');
    if (!refreshButton || !refreshButton.parentNode) {
      console.warn("Could not find refresh button to add snapshot buttons next to it");
      return;
    }
    
    // Remove any existing snapshot buttons first
    const existingButtons = document.querySelectorAll('#snapshot-button, #inline-snapshot-button');
    existingButtons.forEach(btn => {
      if (btn && btn.parentNode) {
        btn.parentNode.removeChild(btn);
      }
    });
    
    // Create the snapshot button for new window
    const snapshotButton = document.createElement('button');
    snapshotButton.id = 'snapshot-button';
    snapshotButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      Generate Snapshot
    `;
    snapshotButton.style.marginLeft = '8px';
    
    // Create the inline snapshot button
    const inlineButton = document.createElement('button');
    inlineButton.id = 'inline-snapshot-button';
    inlineButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      Quick Snapshot
    `;
    inlineButton.style.marginLeft = '8px';
    
    // Add click events directly
    snapshotButton.addEventListener('click', function() {
      console.log("Full snapshot button clicked");
      window.viewAgencySnapshot();
    });
    
    inlineButton.addEventListener('click', function() {
      console.log("Quick snapshot button clicked");
      window.viewInlineAgencySnapshot();
    });
    
    // Add buttons next to the refresh button
    refreshButton.parentNode.appendChild(snapshotButton);
    refreshButton.parentNode.appendChild(inlineButton);
    
    console.log("Snapshot buttons added to UI");
  }
  
  // Main initialization
  function initialize() {
    // Step 1: Ensure snapshot functions are available
    ensureSnapshotFunctions();
    
    // Step 2: Add snapshot buttons to the UI
    addSnapshotButtons();
    
    console.log("Agency snapshot integration complete!");
  }
  
  // Run the initialization
  initialize();
})();