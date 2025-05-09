/**
 * Emergency bypass fix for agency snapshot
 * Maintains data access while avoiding problematic functions
 */
(function() {
  console.log("Installing emergency snapshot fix...");
  
  // Store original problematic functions
  const originalUpdateVisualsFromRawData = window.updateVisualsFromRawData;
  
  // Override problematic function to prevent errors
  window.updateVisualsFromRawData = function() {
    console.log("Bypassing problematic updateVisualsFromRawData function");
    // Do nothing - avoid calling broken code
    return;
  };
  
  // Direct snapshot generation for the current agency
  function createDirectSnapshotHTML() {
    try {
      // Get the agency name from the dashboard title
      const dashboardTitle = document.getElementById('dashboard-title');
      const agencyName = dashboardTitle ? dashboardTitle.textContent.replace('Data', '').trim() : "Unknown Agency";
      
      // Check if we have data
      if (!window.unifiedModel || !Object.keys(window.unifiedModel.contracts || {}).length) {
        throw new Error("No data loaded. Please select and load a dataset first.");
      }
      
      // Extract basic stats from unifiedModel
      const model = window.unifiedModel;
      const contractCount = Object.keys(model.contracts || {}).length;
      const totalValue = Object.values(model.contracts || {}).reduce((sum, contract) => sum + (contract.value || 0), 0);
      
      // Get top contractors (simple version)
      const primes = [];
      for (const primeId in model.primes || {}) {
        const prime = model.primes[primeId];
        if (prime && prime.name && prime.value) {
          primes.push({
            name: prime.name,
            value: prime.value
          });
        }
      }
      
      // Sort by value
      primes.sort((a, b) => b.value - a.value);
      const topPrimes = primes.slice(0, 10);
      
      // Format currency
      function formatCurrency(value) {
        if (!value) return '$0';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      }
      
      // Create HTML
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${agencyName} Snapshot</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f9f9f9;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    h2 {
      font-size: 18px;
      margin-top: 25px;
      margin-bottom: 15px;
    }
    .summary {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 15px;
      margin-bottom: 25px;
    }
    .stat-card {
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 15px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #4a6fa5;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      color: #999;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>${agencyName} Snapshot</h1>
        <p>Updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div id="current-date">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
    </header>
    
    <div class="summary">
      <h2>Executive Summary</h2>
      <p>The ${agencyName} has ${contractCount} contracts with a total value of ${formatCurrency(totalValue)}.</p>
      <p>${topPrimes.length > 0 ? `${topPrimes[0].name} is the leading prime contractor with ${formatCurrency(topPrimes[0].value)} in contracts.` : ""}</p>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Contracts</div>
        <div class="stat-value">${contractCount.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Value</div>
        <div class="stat-value">${formatCurrency(totalValue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Top Contractor</div>
        <div class="stat-value">${topPrimes.length > 0 ? topPrimes[0].name : "N/A"}</div>
      </div>
    </div>
    
    <h2>Top Prime Contractors</h2>
    <table>
      <thead>
        <tr>
          <th>Contractor</th>
          <th>Total Value</th>
        </tr>
      </thead>
      <tbody>
        ${topPrimes.map(prime => `
          <tr>
            <td>${prime.name}</td>
            <td>${formatCurrency(prime.value)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="footer">
      <p>Data from USAspending.gov | Generated with Subhoo.com</p>
    </div>
  </div>
</body>
</html>`;
      
      return html;
    } catch (error) {
      throw error;
    }
  }
  
  // Create inline snapshot modal with actual data
  function createInlineSnapshotModal() {
    try {
      // Check if we have data
      if (!window.unifiedModel || !Object.keys(window.unifiedModel.contracts || {}).length) {
        throw new Error("No data loaded. Please select and load a dataset first.");
      }
      
      // Get the agency name from the dashboard title
      const dashboardTitle = document.getElementById('dashboard-title');
      const agencyName = dashboardTitle ? dashboardTitle.textContent.replace('Data', '').trim() : "Unknown Agency";
      
      // Extract basic stats
      const model = window.unifiedModel;
      const contractCount = Object.keys(model.contracts || {}).length;
      const totalValue = Object.values(model.contracts || {}).reduce((sum, contract) => sum + (contract.value || 0), 0);
      
      // Format currency
      function formatCurrencyShort(value) {
        if (!value) return '$0';
        
        if (value >= 1000000000) {
          return `$${(value / 1000000000).toFixed(1)}B`;
        } else if (value >= 1000000) {
          return `$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `$${(value / 1000).toFixed(1)}K`;
        }
        
        return `$${value.toFixed(0)}`;
      }
      
      // Create modal
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      modal.style.zIndex = '9999';
      
      // Create content
      const content = document.createElement('div');
      content.style.backgroundColor = 'white';
      content.style.padding = '20px';
      content.style.borderRadius = '8px';
      content.style.maxWidth = '600px';
      content.style.width = '90%';
      content.style.maxHeight = '80vh';
      content.style.overflow = 'auto';
      content.style.position = 'relative';
      
      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '10px';
      closeBtn.style.right = '10px';
      closeBtn.style.border = 'none';
      closeBtn.style.background = 'transparent';
      closeBtn.style.fontSize = '20px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = function() {
        document.body.removeChild(modal);
      };
      
      // Add export button
      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Export Full Snapshot';
      exportBtn.style.position = 'absolute';
      exportBtn.style.top = '10px';
      exportBtn.style.right = '40px';
      exportBtn.style.padding = '5px 10px';
      exportBtn.style.backgroundColor = '#7A747B';
      exportBtn.style.color = 'white';
      exportBtn.style.border = 'none';
      exportBtn.style.borderRadius = '4px';
      exportBtn.style.cursor = 'pointer';
      exportBtn.onclick = function() {
        try {
          const html = createDirectSnapshotHTML();
          const blob = new Blob([html], {type: 'text/html'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${agencyName}_Snapshot.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          alert(error.message);
        }
      };
      
      // Get top contractors
      const primes = [];
      for (const primeId in model.primes || {}) {
        const prime = model.primes[primeId];
        if (prime && prime.name && prime.value) {
          primes.push({
            name: prime.name,
            value: prime.value
          });
        }
      }
      
      // Sort by value
      primes.sort((a, b) => b.value - a.value);
      const topPrimes = primes.slice(0, 5);
      
      // Add content HTML
      content.innerHTML += `
        <h2 style="margin-top: 0; padding-right: 150px;">${agencyName} Quick Snapshot</h2>
        <p style="color: #666; margin-bottom: 20px;">Generated on ${new Date().toLocaleDateString()}</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p>The ${agencyName} has <strong>${contractCount.toLocaleString()}</strong> contracts with a total value of <strong>${formatCurrencyShort(totalValue)}</strong>.</p>
          ${topPrimes.length > 0 ? `<p>${topPrimes[0].name} is the leading prime contractor with ${formatCurrencyShort(topPrimes[0].value)} in contracts.</p>` : ""}
        </div>
        
        <h3 style="margin-top: 20px;">Top Prime Contractors</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
          ${topPrimes.map(prime => `
            <div style="background-color: #f9f9f9; padding: 10px; border-radius: 6px;">
              <div style="font-weight: bold;">${prime.name}</div>
              <div style="color: #4a6fa5; font-size: 18px; margin-top: 5px;">${formatCurrencyShort(prime.value)}</div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;">
          Generated with Subhoo.com
        </div>
      `;
      
      content.appendChild(closeBtn);
      content.appendChild(exportBtn);
      modal.appendChild(content);
      document.body.appendChild(modal);
      
    } catch (error) {
      alert(error.message);
    }
  }
  
  // Override the snapshot buttons to use our direct approach
  const snapshotButton = document.getElementById('snapshot-button');
  if (snapshotButton) {
    // Remove existing listeners
    const newButton = snapshotButton.cloneNode(true);
    if (snapshotButton.parentNode) {
      snapshotButton.parentNode.replaceChild(newButton, snapshotButton);
    }
    
    // Add new listener
    newButton.addEventListener('click', function() {
      try {
        const html = createDirectSnapshotHTML();
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
        } else {
          alert("Unable to open a new window. Please check your popup blocker settings.");
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }
  
  // Override the inline snapshot button
  const inlineButton = document.getElementById('inline-snapshot-button');
  if (inlineButton) {
    // Remove existing listeners
    const newButton = inlineButton.cloneNode(true);
    if (inlineButton.parentNode) {
      inlineButton.parentNode.replaceChild(newButton, inlineButton);
    }
    
    // Add new listener
    newButton.addEventListener('click', createInlineSnapshotModal);
  }
  
  console.log("Simple direct snapshot functionality installed");
})();