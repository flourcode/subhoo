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
// Fix to ensure snapshot buttons are added properly
(function() {
  console.log("Initializing snapshot button fix...");
  
  // Function to make sure buttons are properly added
  function ensureSnapshotButtons() {
    // Check if buttons already exist
    const existingFullButton = document.getElementById('snapshot-button');
    const existingInlineButton = document.getElementById('inline-snapshot-button');
    
    // If both buttons exist, everything is working
    if (existingFullButton && existingInlineButton) {
      console.log("Snapshot buttons already exist");
      return;
    }
    
    console.log("Adding missing snapshot buttons");
    
    // Try both button-adding functions
    if (typeof addSnapshotButton === 'function') {
      addSnapshotButton();
    }
    
    if (typeof addInlineSnapshotButton === 'function') {
      addInlineSnapshotButton();
    }
    
    // Explicitly assign the click handlers to ensure they work
    setTimeout(() => {
      const fullButton = document.getElementById('snapshot-button');
      const inlineButton = document.getElementById('inline-snapshot-button');
      
      if (fullButton) {
        fullButton.onclick = function() {
          console.log("Full snapshot button clicked");
          if (typeof window.viewAgencySnapshot === 'function') {
            window.viewAgencySnapshot();
          } else if (typeof viewAgencySnapshot === 'function') {
            viewAgencySnapshot();
          }
        };
      }
      
      if (inlineButton) {
        inlineButton.onclick = function() {
          console.log("Inline snapshot button clicked");
          if (typeof window.viewInlineAgencySnapshot === 'function') {
            window.viewInlineAgencySnapshot();
          } else if (typeof viewInlineAgencySnapshot === 'function') {
            viewInlineAgencySnapshot();
          }
        };
      }
    }, 500);
  }
  
  // Check for model access function
  function checkModelAccess() {
    const model = window.unifiedModel;
    if (!model) {
      console.warn("No unified model found - buttons may not work until data is loaded");
    } else {
      console.log("Unified model found with data");
    }
  }
  
  // Run the fix now and also after page is fully loaded
  ensureSnapshotButtons();
  checkModelAccess();
  
  // Also run after a delay to catch any timing issues
  setTimeout(ensureSnapshotButtons, 2000);
  
  // And when the dataset select changes
  const datasetSelect = document.getElementById('dataset-select');
  if (datasetSelect) {
    datasetSelect.addEventListener('change', function() {
      // Wait for data to load
      setTimeout(ensureSnapshotButtons, 2000);
    });
  }
})();
// Fix for snapshot buttons to handle undefined model
(function() {
  console.log("Adding snapshot button fix for undefined model...");
  
  // Original viewAgencySnapshot relies on window.unifiedModel
  // Let's create a safer version that checks for model existence
  const originalViewAgencySnapshot = window.viewAgencySnapshot;
  
  // Replace with a safer version that checks if model exists
  window.viewAgencySnapshot = function() {
    console.log("Running enhanced viewAgencySnapshot with model check");
    
    // Try to get model from various possible locations
    const model = window.unifiedModel || window.model || window.dataModel;
    
    if (!model) {
      alert("No data loaded. Please select an agency dataset first.");
      return;
    }
    
    // Call original function with the model
    if (typeof originalViewAgencySnapshot === 'function') {
      try {
        // Either call with model parameter or set window.unifiedModel
        window.unifiedModel = model;
        originalViewAgencySnapshot();
      } catch (e) {
        console.error("Error in viewAgencySnapshot:", e);
        alert("Error generating snapshot: " + e.message);
      }
    }
  };
  
  // Similarly for inline snapshot
  const originalViewInlineAgencySnapshot = window.viewInlineAgencySnapshot;
  
  window.viewInlineAgencySnapshot = function() {
    console.log("Running enhanced viewInlineAgencySnapshot with model check");
    
    // Try to get model from various possible locations
    const model = window.unifiedModel || window.model || window.dataModel;
    
    if (!model) {
      alert("No data loaded. Please select an agency dataset first.");
      return;
    }
    
    // Call original function with the model
    if (typeof originalViewInlineAgencySnapshot === 'function') {
      try {
        // Either call with model parameter or set window.unifiedModel
        window.unifiedModel = model;
        originalViewInlineAgencySnapshot();
      } catch (e) {
        console.error("Error in viewInlineAgencySnapshot:", e);
        alert("Error generating inline snapshot: " + e.message);
      }
    }
  };
  
  // Handle click events for snapshot buttons
  function setupButtonHandlers() {
    // Look for snapshot buttons
    const fullButton = document.getElementById('snapshot-button');
    const inlineButton = document.getElementById('inline-snapshot-button');
    
    // Setup handlers for full snapshot button
    if (fullButton) {
      // Remove existing event listeners by cloning the button
      const newFullButton = fullButton.cloneNode(true);
      fullButton.parentNode.replaceChild(newFullButton, fullButton);
      
      // Add new event listener
      newFullButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("Full snapshot button clicked (fixed handler)");
        window.viewAgencySnapshot();
      });
    }
    
    // Setup handlers for inline snapshot button
    if (inlineButton) {
      // Remove existing event listeners by cloning the button
      const newInlineButton = inlineButton.cloneNode(true);
      inlineButton.parentNode.replaceChild(newInlineButton, inlineButton);
      
      // Add new event listener
      newInlineButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("Inline snapshot button clicked (fixed handler)");
        window.viewInlineAgencySnapshot();
      });
    }
  }
  
  // Run immediately
  setupButtonHandlers();
  
  // Also run after a delay to catch buttons added after this script runs
  setTimeout(setupButtonHandlers, 2000);
  
  // Also listen for dataset changes
  const datasetSelect = document.getElementById('dataset-select');
  if (datasetSelect) {
    datasetSelect.addEventListener('change', function() {
      // Wait for data to load then setup handlers
      setTimeout(setupButtonHandlers, 2000);
    });
  }
  
  // Define missing functions as no-ops to prevent errors
  if (typeof window.displayNaicsDonutChart !== 'function') {
    window.displayNaicsDonutChart = function() {
      console.log("displayNaicsDonutChart called but not implemented");
    };
  }
  
  if (typeof window.displayShareOfWalletChart !== 'function') {
    window.displayShareOfWalletChart = function() {
      console.log("displayShareOfWalletChart called but not implemented");
    };
  }
  
  console.log("Snapshot button fix complete");
})();
// Final comprehensive fix for all Subhoo dashboard issues
(function() {
  console.log("Adding comprehensive fix for all Subhoo dashboard issues...");
  
  // Fix for missing functions in the dashboard
  function fixMissingFunctions() {
    // Create empty implementations for missing chart functions
    const missingFunctions = [
      'displayNaicsDonutChart',
      'displayShareOfWalletChart',
      'initializePresetViews'
    ];
    
    missingFunctions.forEach(funcName => {
      if (typeof window[funcName] !== 'function') {
        window[funcName] = function() {
          console.log(`${funcName} called but not implemented`);
          return Array.isArray(arguments[0]) ? arguments[0] : [];
        };
      }
    });
    
    // Fix for the Enhanced Sankey Chart that's causing errors
    const originalDisplayEnhancedSankeyChart = window.displayEnhancedSankeyChart;
    
    window.displayEnhancedSankeyChart = function(model) {
      console.log("Running enhanced displayEnhancedSankeyChart with safety checks");
      
      try {
        // Check if model has the required properties
        if (!model) {
          console.warn("No model provided to displayEnhancedSankeyChart");
          return displayEmptySankeyChart();
        }
        
        // Add relationships if missing
        if (!model.relationships) {
          console.warn("Model missing relationships property, adding empty structure");
          model.relationships = {
            agencyToPrime: [],
            primeToSub: []
          };
        } else {
          // Ensure all required relationship properties exist
          if (!model.relationships.agencyToPrime) {
            model.relationships.agencyToPrime = [];
          }
          if (!model.relationships.primeToSub) {
            model.relationships.primeToSub = [];
          }
        }
        
        // Now call the original function with the fixed model
        if (typeof originalDisplayEnhancedSankeyChart === 'function') {
          return originalDisplayEnhancedSankeyChart(model);
        } else {
          // Simple fallback
          return displayEmptySankeyChart();
        }
      } catch (e) {
        console.error("Error in displayEnhancedSankeyChart:", e);
        return displayEmptySankeyChart();
      }
    };
    
    // Simple fallback for Sankey chart
    function displayEmptySankeyChart() {
      const container = document.getElementById('sankey-chart-container');
      if (!container) return;
      
      // Show a message instead of an error
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
          <svg width="100" height="100" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1" fill="none">
            <path d="M7 10a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4.5a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h3Z"></path>
            <path d="M19 14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h4.5a1 1 0 0 1 1 1v1a1 1 0 0 0 1 1h3Z"></path>
          </svg>
          <p style="margin-top: 15px; color: var(--color-text-secondary, #777);">
            Award Flow data not available
          </p>
        </div>
      `;
    }
    
    // Fix updateVisualsFromRawData to handle errors
    if (typeof window.updateVisualsFromRawData === 'function') {
      const originalUpdateVisualsFromRawData = window.updateVisualsFromRawData;
      
      window.updateVisualsFromRawData = function(subAgencyFilter, naicsFilter, searchTerm) {
        try {
          // Wrap in try-catch to prevent cascading errors
          return originalUpdateVisualsFromRawData(subAgencyFilter, naicsFilter, searchTerm);
        } catch (e) {
          console.error("Error in updateVisualsFromRawData:", e);
          
          // Disable loading states in all containers
          const containers = [
            'contract-leaders-table-container',
            'tav-tcv-chart-container',
            'expiring-contracts-table-container',
            'sankey-chart-container',
            'map-container',
            'circular-dendrogram-container',
            'naics-donut-chart-container'
          ];
          
          containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
              container.innerHTML = `
                <div style="padding: 15px; text-align: center; color: var(--color-text-secondary, #777);">
                  <p>Visualization unavailable</p>
                </div>
              `;
            }
          });
        }
      };
    }
  }
  
  // Fix for model in viewAgencySnapshot
  function fixSnapshotFunctions() {
    // Original functions
    const originalViewAgencySnapshot = window.viewAgencySnapshot;
    const originalViewInlineAgencySnapshot = window.viewInlineAgencySnapshot;
    
    // Replace viewAgencySnapshot with a safer version
    window.viewAgencySnapshot = function() {
      console.log("Running fixed viewAgencySnapshot");
      
      try {
        // Get data model from the appropriate source
        let model = null;
        
        // Try to find the model from various sources
        if (window.unifiedModel) {
          console.log("Using window.unifiedModel");
          model = window.unifiedModel;
        } else {
          console.log("Building model from raw data");
          // Build a simplified model
          model = buildModelFromAvailableData();
          
          // Set it so the original function can use it
          window.unifiedModel = model;
        }
        
        // Ensure the model has all required properties
        ensureModelStructure(model);
        
        // Now call the original function
        if (typeof originalViewAgencySnapshot === 'function') {
          return originalViewAgencySnapshot();
        } else {
          alert("Snapshot function not available");
        }
      } catch (e) {
        console.error("Error in viewAgencySnapshot:", e);
        alert("Error generating snapshot: " + e.message);
      }
    };
    
    // Replace viewInlineAgencySnapshot with a safer version
    window.viewInlineAgencySnapshot = function() {
      console.log("Running fixed viewInlineAgencySnapshot");
      
      try {
        // Get data model from the appropriate source
        let model = null;
        
        // Try to find the model from various sources
        if (window.unifiedModel) {
          console.log("Using window.unifiedModel");
          model = window.unifiedModel;
        } else {
          console.log("Building model from raw data");
          // Build a simplified model
          model = buildModelFromAvailableData();
          
          // Set it so the original function can use it
          window.unifiedModel = model;
        }
        
        // Ensure the model has all required properties
        ensureModelStructure(model);
        
        // Now call the original function
        if (typeof originalViewInlineAgencySnapshot === 'function') {
          return originalViewInlineAgencySnapshot();
        } else {
          alert("Inline snapshot function not available");
        }
      } catch (e) {
        console.error("Error in viewInlineAgencySnapshot:", e);
        alert("Error generating inline snapshot: " + e.message);
      }
    };
  }
  
  // Ensure model has all required properties
  function ensureModelStructure(model) {
    if (!model) {
      console.warn("No model to ensure structure for");
      return;
    }
    
    // Create any missing top-level properties
    const requiredProps = [
      'agencies', 'subAgencies', 'primes', 'subs', 'contracts', 'stats', 'relationships'
    ];
    
    requiredProps.forEach(prop => {
      if (!model[prop]) {
        console.log(`Adding missing ${prop} property to model`);
        model[prop] = prop === 'stats' ? { totalContractValue: 0 } :
                      prop === 'relationships' ? { agencyToPrime: [], primeToSub: [] } : {};
      }
    });
    
    // Ensure relationships structure
    if (!model.relationships.agencyToPrime) {
      model.relationships.agencyToPrime = [];
    }
    
    if (!model.relationships.primeToSub) {
      model.relationships.primeToSub = [];
    }
    
    // Make sure stats has required properties
    if (!model.stats.totalContractValue) {
      model.stats.totalContractValue = 0;
      
      // Calculate total contract value from contracts
      if (model.contracts) {
        model.stats.totalContractValue = Object.values(model.contracts)
          .reduce((sum, contract) => sum + (contract.value || 0), 0);
      }
    }
    
    return model;
  }
  
  // Build model from whatever data is available
  function buildModelFromAvailableData() {
    console.log("Attempting to build model from available data...");
    
    // Check if rawData exists
    if (window.rawData && (window.rawData.primes?.length > 0 || window.rawData.subs?.length > 0)) {
      return buildModelFromRawData(window.rawData);
    }
    
    // Try to extract data from DOM
    return buildModelFromDOM();
  }
  
  // Build model from raw data
  function buildModelFromRawData(rawData) {
    console.log("Building model from rawData...");
    
    // Create basic model structure
    const model = {
      agencies: {},
      subAgencies: {},
      primes: {},
      subs: {},
      contracts: {},
      stats: {
        totalContractValue: 0
      },
      relationships: {
        agencyToPrime: [],
        primeToSub: []
      }
    };
    
    // Process prime contracts
    if (rawData.primes && rawData.primes.length > 0) {
      rawData.primes.forEach((row, index) => {
        // Add agency
        const agencyName = row.agencyName || row.awarding_agency_name || "Unknown Agency";
        const agencyId = `agency-${agencyName.toLowerCase().replace(/\W+/g, '-')}`;
        
        if (!model.agencies[agencyId]) {
          model.agencies[agencyId] = {
            id: agencyId,
            name: agencyName,
            value: 0
          };
        }
        
        // Add subagency
        const subAgencyName = row.subAgencyName || row.awarding_sub_agency_name || "Unknown Sub-Agency";
        const subAgencyId = `subagency-${subAgencyName.toLowerCase().replace(/\W+/g, '-')}`;
        
        if (!model.subAgencies[subAgencyId]) {
          model.subAgencies[subAgencyId] = {
            id: subAgencyId,
            name: subAgencyName,
            value: 0,
            parentId: agencyId
          };
        }
        
        // Add prime
        const primeName = row.primeName || row.recipient_name || "Unknown Prime";
        const primeId = `prime-${primeName.toLowerCase().replace(/\W+/g, '-')}-${index}`;
        
        if (!model.primes[primeId]) {
          model.primes[primeId] = {
            id: primeId,
            name: primeName,
            value: 0,
            contracts: new Set()
          };
        }
        
        // Add contract
        const contractId = row.contractId || row.contract_award_unique_key || `contract-${index}`;
        const contractValue = parseFloat(row.contractValue || row.current_total_value_of_award || 0);
        
        model.contracts[contractId] = {
          id: contractId,
          primeId: primeId,
          agencyId: agencyId,
          subAgencyId: subAgencyId,
          value: contractValue,
          description: row.description || row.transaction_description || "No description",
          naicsCode: row.naicsCode || row.naics_code || "Unknown",
          naicsDesc: row.naicsDesc || row.naics_description || "Unknown",
          startDate: row.startDate || row.period_of_performance_start_date,
          endDate: row.endDate || row.period_of_performance_current_end_date,
          raw: row
        };
        
        // Update values
        model.agencies[agencyId].value += contractValue;
        model.subAgencies[subAgencyId].value += contractValue;
        model.primes[primeId].value += contractValue;
        model.primes[primeId].contracts.add(contractId);
        model.stats.totalContractValue += contractValue;
        
        // Add relationship
        model.relationships.agencyToPrime.push({
          source: agencyId,
          target: primeId,
          value: contractValue,
          contractId: contractId
        });
      });
      
      // Convert Sets to Arrays
      Object.values(model.primes).forEach(prime => {
        if (prime.contracts instanceof Set) {
          prime.contracts = Array.from(prime.contracts);
        }
      });
    }
    
    // Process subcontracts
    if (rawData.subs && rawData.subs.length > 0) {
      rawData.subs.forEach((row, index) => {
        // Check if we can find the prime
        const primeName = row.primeName || row.prime_awardee_name || "Unknown Prime";
        let primeId = null;
        
        // Look for existing prime
        for (const [id, prime] of Object.entries(model.primes)) {
          if (prime.name === primeName) {
            primeId = id;
            break;
          }
        }
        
        // If not found, create a new one
        if (!primeId) {
          primeId = `prime-${primeName.toLowerCase().replace(/\W+/g, '-')}-${index}`;
          
          model.primes[primeId] = {
            id: primeId,
            name: primeName,
            value: 0,
            contracts: []
          };
        }
        
        // Add sub
        const subName = row.subName || row.subawardee_name || "Unknown Sub";
        const subId = `sub-${subName.toLowerCase().replace(/\W+/g, '-')}-${index}`;
        
        if (!model.subs[subId]) {
          model.subs[subId] = {
            id: subId,
            name: subName,
            value: 0
          };
        }
        
        const subValue = parseFloat(row.contractValue || row.subaward_amount || 0);
        model.subs[subId].value += subValue;
        
        // Add relationship
        model.relationships.primeToSub.push({
          source: primeId,
          target: subId,
          value: subValue
        });
      });
    }
    
    return model;
  }
  
  // Build model from DOM elements
  function buildModelFromDOM() {
    console.log("Building model from DOM elements...");
    
    // Create basic model structure
    const model = {
      agencies: {},
      subAgencies: {},
      primes: {},
      subs: {},
      contracts: {},
      stats: {
        totalContractValue: 0
      },
      relationships: {
        agencyToPrime: [],
        primeToSub: []
      }
    };
    
    // Extract agency name from title
    const dashboardTitle = document.getElementById('dashboard-title');
    let agencyName = "Unknown Agency";
    let agencyId = "agency-unknown";
    
    if (dashboardTitle) {
      agencyName = dashboardTitle.textContent.replace('Data', '').trim();
      agencyId = `agency-${agencyName.toLowerCase().replace(/\W+/g, '-')}`;
      
      model.agencies[agencyId] = {
        id: agencyId,
        name: agencyName,
        value: 0
      };
    }
    
    // Add a default sub-agency
    const subAgencyId = `subagency-default`;
    model.subAgencies[subAgencyId] = {
      id: subAgencyId,
      name: `${agencyName} Main Office`,
      value: 0,
      parentId: agencyId
    };
    
    // Extract prime contractors from table
    const primeRows = document.querySelectorAll('#contract-leaders-table-container table tbody tr');
    let totalValue = 0;
    
    primeRows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const primeName = cells[0].textContent.trim();
        const primeId = `prime-${primeName.toLowerCase().replace(/\W+/g, '-')}-${index}`;
        
        // Extract value - parse from currency string
        let value = 0;
        const valueText = cells[1].textContent.trim();
        if (valueText) {
          // Remove currency symbol and commas
          const numStr = valueText.replace(/[$,]/g, '');
          value = parseFloat(numStr) || 0;
        }
        
        model.primes[primeId] = {
          id: primeId,
          name: primeName,
          value: value,
          contracts: []
        };
        
        // Create a dummy contract
        const contractId = `contract-${index}`;
        model.contracts[contractId] = {
          id: contractId,
          primeId: primeId,
          agencyId: agencyId,
          subAgencyId: subAgencyId,
          value: value,
          description: `${primeName} Contract`,
          naicsCode: "000000",
          naicsDesc: "Extracted from DOM",
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          raw: null
        };
        
        // Add to primes contracts array
        model.primes[primeId].contracts.push(contractId);
        
        // Add relationship
        model.relationships.agencyToPrime.push({
          source: agencyId,
          target: primeId,
          value: value,
          contractId: contractId
        });
        
        totalValue += value;
      }
    });
    
    // Update values
    model.agencies[agencyId].value = totalValue;
    model.subAgencies[subAgencyId].value = totalValue;
    model.stats.totalContractValue = totalValue;
    
    return model;
  }
  
  // Function to fix button event handlers
  function fixButtonHandlers() {
    // Look for snapshot buttons
    const fullButton = document.getElementById('snapshot-button');
    const inlineButton = document.getElementById('inline-snapshot-button');
    
    // Fix full snapshot button
    if (fullButton) {
      // Remove existing event listeners by cloning
      const newFullButton = fullButton.cloneNode(true);
      fullButton.parentNode.replaceChild(newFullButton, fullButton);
      
      // Add new event listener
      newFullButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("Full snapshot button clicked (fixed handler)");
        window.viewAgencySnapshot();
      });
    }
    
    // Fix inline snapshot button
    if (inlineButton) {
      // Remove existing event listeners by cloning
      const newInlineButton = inlineButton.cloneNode(true);
      inlineButton.parentNode.replaceChild(newInlineButton, inlineButton);
      
      // Add new event listener
      newInlineButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("Inline snapshot button clicked (fixed handler)");
        window.viewInlineAgencySnapshot();
      });
    }
  }
  
  // Apply all fixes
  fixMissingFunctions();
  fixSnapshotFunctions();
  fixButtonHandlers();
  
  // Also run button fixes after a delay
  setTimeout(fixButtonHandlers, 2000);
  
  // Also run when dataset changes
  const datasetSelect = document.getElementById('dataset-select');
  if (datasetSelect) {
    datasetSelect.addEventListener('change', function() {
      setTimeout(fixButtonHandlers, 2000);
    });
  }
  
  console.log("All fixes applied successfully");
})();