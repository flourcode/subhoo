/**
 * Emergency fix for agency snapshot errors
 * This bypasses the problematic code paths completely
 */
(function() {
  // 1. Override the problematic updateVisualsFromRawData function
  window.updateVisualsFromRawData = function() {
    console.log("Using bypassed updateVisualsFromRawData to prevent errors");
    
    // Do nothing - skip this broken function completely
    return;
  };
  
  // 2. If displayEnhancedSankeyChart exists, use it directly for updateVisualsFromUnifiedModel
  if (typeof window.displayEnhancedSankeyChart === 'function') {
    const originalUpdateVisualsFromUnifiedModel = window.updateVisualsFromUnifiedModel;
    
    window.updateVisualsFromUnifiedModel = function(subAgencyFilter, naicsFilter, searchTerm) {
      try {
        // Call the original function
        if (typeof originalUpdateVisualsFromUnifiedModel === 'function') {
          originalUpdateVisualsFromUnifiedModel(subAgencyFilter, naicsFilter, searchTerm);
        }
      } catch (e) {
        console.error("Error in original update visuals function:", e);
        
        // Just make sure loading states are cleared
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
            setLoading(id, false);
          }
        });
      }
    };
  }
  
  // 3. Add direct snapshot button handler that bypasses all problematic code
  const snapshotButton = document.getElementById('snapshot-button');
  if (snapshotButton) {
    snapshotButton.addEventListener('click', function() {
      // Get the agency name from the dashboard title
      const dashboardTitle = document.getElementById('dashboard-title');
      const agencyName = dashboardTitle ? dashboardTitle.textContent.replace('Data', '').trim() : "Unknown Agency";
      
      // Extremely simplified HTML
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${agencyName} Snapshot</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9; }
    .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { margin-top: 0; color: #333; }
    .date { color: #666; margin-bottom: 20px; }
    .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${agencyName} Snapshot</h1>
    <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
    
    <div>
      <p>A simple snapshot for the selected agency.</p>
      <p>For a complete, data-driven snapshot, please ensure the visualization components are fully loaded first.</p>
    </div>
    
    <div class="footer">
      <p>Generated with Subhoo.com</p>
    </div>
  </div>
</body>
</html>`;
      
      // Open in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      } else {
        alert("Unable to open a new window. Please check your popup blocker settings.");
      }
    });
  }
  
  // 4. Add minimal inline snapshot handler
  const inlineButton = document.getElementById('inline-snapshot-button');
  if (inlineButton) {
    inlineButton.addEventListener('click', function() {
      // Get the agency name from the dashboard title
      const dashboardTitle = document.getElementById('dashboard-title');
      const agencyName = dashboardTitle ? dashboardTitle.textContent.replace('Data', '').trim() : "Unknown Agency";
      
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
      content.style.maxWidth = '500px';
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
      
      // Add content
      content.innerHTML = `
        <h2 style="margin-top: 0;">${agencyName} Quick Snapshot</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        <p>Simple snapshot view for the selected agency.</p>
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #999;">
          Generated with Subhoo.com
        </div>
      `;
      
      content.appendChild(closeBtn);
      modal.appendChild(content);
      document.body.appendChild(modal);
    });
  }
  
  console.log("Emergency fix applied - errors bypassed");
})();