/**
 * Comprehensive Fix for Missing Functions
 * This script fixes all missing functions required by the snapshot generator
 * and ensures it works correctly with agency dataset changes
 */
(function() {
  console.log("Installing comprehensive function fix...");
  
  // 1. Fix for processContractLeaders
  if (typeof window.processContractLeaders !== 'function') {
    window.processContractLeaders = function(data) {
      console.log("Using patched processContractLeaders function");
      
      // Check for empty data
      if (!data || data.length === 0) {
        return [];
      }
      
      // Group by prime contractors (by name)
      const primeGroups = {};
      
      data.forEach(row => {
        const primeName = row.primeName || row.recipient_name || "Unknown";
        if (!primeGroups[primeName]) {
          primeGroups[primeName] = {
            siName: primeName,
            numAwards: 0,
            totalValue: 0,
            contracts: []
          };
        }
        
        // Increment counters and add contract
        primeGroups[primeName].numAwards++;
        primeGroups[primeName].totalValue += parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0);
        primeGroups[primeName].contracts.push(row);
      });
      
      // Convert to array and calculate additional metrics
      const leaders = Object.values(primeGroups).map(group => {
        // Calculate average contract value
        const avgValue = group.numAwards > 0 ? group.totalValue / group.numAwards : 0;
        
        // Calculate average duration
        let totalDuration = 0;
        let contractsWithDuration = 0;
        
        group.contracts.forEach(contract => {
          if (contract.parsedStartDate && contract.parsedEndDate) {
            const duration = calculateDurationDays(contract.parsedStartDate, contract.parsedEndDate);
            if (duration > 0) {
              totalDuration += duration;
              contractsWithDuration++;
            }
          } else if (contract.period_of_performance_start_date && contract.period_of_performance_current_end_date) {
            const duration = calculateDurationDays(
              contract.period_of_performance_start_date, 
              contract.period_of_performance_current_end_date
            );
            if (duration > 0) {
              totalDuration += duration;
              contractsWithDuration++;
            }
          }
        });
        
        const avgDuration = contractsWithDuration > 0 ? totalDuration / contractsWithDuration : 0;
        
        // Find dominant NAICS
        const naicsCounts = {};
        
        group.contracts.forEach(contract => {
          // Count NAICS codes if available
          if (contract.naicsCode || contract.naics_code) {
            const naicsKey = contract.naicsCode || contract.naics_code;
            naicsCounts[naicsKey] = (naicsCounts[naicsKey] || 0) + 1;
          }
        });
        
        // Find most common NAICS
        let dominantNaics = { code: null, desc: null, count: 0 };
        
        Object.entries(naicsCounts).forEach(([code, count]) => {
          if (count > dominantNaics.count) {
            // Find a contract with this NAICS to get the description
            const contractWithNaics = group.contracts.find(c => (c.naicsCode === code) || (c.naics_code === code));
            const desc = contractWithNaics ? 
              (contractWithNaics.naicsDesc || contractWithNaics.naics_description) : 
              "Unknown";
            
            dominantNaics = {
              code: code,
              desc: desc,
              count: count
            };
          }
        });
        
        // Get a sample contract ID for linking
        const sampleContract = group.contracts[0];
        const sampleContractId = sampleContract ? 
          (sampleContract.contractId || sampleContract.contract_award_unique_key) : null;
        
        // Collect all unique contract keys
        const uniqueContractKeys = new Set();
        group.contracts.forEach(contract => {
          const key = contract.contractId || contract.contract_award_unique_key;
          if (key) uniqueContractKeys.add(key);
        });
        
        return {
          siName: group.siName,
          numAwards: group.numAwards,
          totalValue: group.totalValue,
          avgValue: avgValue,
          avgDurationDays: Math.round(avgDuration),
          dominantNaics: dominantNaics.code ? dominantNaics : null,
          sampleContractId: sampleContractId,
          uniqueContractKeys: Array.from(uniqueContractKeys)
        };
      });
      
      // Sort by total value (descending)
      leaders.sort((a, b) => b.totalValue - a.totalValue);
      
      return leaders;
    };
  }
  
  // 2. Fix for processTavTcvData
  if (typeof window.processTavTcvData !== 'function') {
    window.processTavTcvData = function(data) {
      console.log("Using patched processTavTcvData function");
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Process all contracts to find TAV/TCV data
      const result = data.map(row => {
        return {
          id: row.contractId || row.contract_award_unique_key || '',
          primeName: row.primeName || row.recipient_name || 'Unknown',
          tcv: parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0),
          tav: parseSafeFloat(row.obligatedValue || row.total_dollars_obligated || 0),
          potentialTcv: parseSafeFloat(row.potentialValue || row.potential_total_value_of_award || 0)
        };
      })
      .filter(contract => contract.tcv > 0)
      .sort((a, b) => b.tcv - a.tcv)
      .slice(0, 7); // Take top 7
      
      return result;
    };
  }
  
  // 3. Fix for processExpiringData
  if (typeof window.processExpiringData !== 'function') {
    window.processExpiringData = function(data) {
      console.log("Using patched processExpiringData function");
      
      if (!data || data.length === 0) {
        return [];
      }
      
      const today = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(today.getMonth() + 6);
      
      // Find contracts expiring in the next 6 months
      return data.filter(row => {
        let endDate = null;
        
        // Try various date fields
        if (row.parsedEndDate && row.parsedEndDate instanceof Date) {
          endDate = row.parsedEndDate;
        } else if (row.period_of_performance_current_end_date) {
          endDate = parseDate(row.period_of_performance_current_end_date);
        } else if (row.endDate) {
          endDate = parseDate(row.endDate);
        }
        
        return endDate && endDate >= today && endDate <= sixMonthsFromNow;
      })
      .map(row => {
        // Get end date
        let endDate = null;
        if (row.parsedEndDate && row.parsedEndDate instanceof Date) {
          endDate = row.parsedEndDate;
        } else if (row.period_of_performance_current_end_date) {
          endDate = parseDate(row.period_of_performance_current_end_date);
        } else if (row.endDate) {
          endDate = parseDate(row.endDate);
        }
        
        return {
          award_id_piid: row.contractId || row.award_id_piid || row.contract_award_unique_key || '',
          recipient_name: row.primeName || row.recipient_name || 'Unknown',
          transaction_description: row.description || row.transaction_description || 'No description',
          period_of_performance_current_end_date: row.endDate || row.period_of_performance_current_end_date || '',
          period_of_performance_current_end_date_parsed: endDate,
          current_total_value_of_award: parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0),
          contract_award_unique_key: row.contractId || row.contract_award_unique_key || '',
          naics_code: row.naicsCode || row.naics_code || '',
          naics_description: row.naicsDesc || row.naics_description || '',
          formatted_end_date: endDate ? endDate.toLocaleDateString() : 'Unknown'
        };
      })
      .sort((a, b) => {
        if (a.period_of_performance_current_end_date_parsed && b.period_of_performance_current_end_date_parsed) {
          return a.period_of_performance_current_end_date_parsed - b.period_of_performance_current_end_date_parsed;
        }
        return 0;
      });
    };
  }
  
  // 4. Fix for processSankeyData
  if (typeof window.processSankeyData !== 'function') {
    window.processSankeyData = function(data) {
      console.log("Using patched processSankeyData function");
      
      if (!data || data.length === 0) {
        return { nodes: [], links: [] };
      }
      
      // Get unique subagencies
      const subAgencies = new Set();
      data.forEach(row => {
        const agency = row.subAgencyName || row.awarding_sub_agency_name;
        if (agency && agency.toLowerCase() !== 'unknown sub-agency' && agency.toLowerCase() !== 'unknown') {
          subAgencies.add(agency);
        }
      });
      
      // Get unique primes
      const primes = new Set();
      data.forEach(row => {
        const prime = row.primeName || row.recipient_name;
        if (prime) primes.add(prime);
      });
      
      // Take top prime contractors by value
      const primeValues = {};
      data.forEach(row => {
        const prime = row.primeName || row.recipient_name;
        if (!prime) return;
        primeValues[prime] = (primeValues[prime] || 0) + 
          parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0);
      });
      
      // Sort primes by value and take top 10
      const topPrimes = Object.entries(primeValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name);
      
      // Create nodes array
      const nodes = [];
      
      // Add agency nodes
      Array.from(subAgencies).forEach(agency => {
        nodes.push({ name: truncateText(agency, 30), type: 'agency' });
      });
      
      // Add prime nodes
      topPrimes.forEach(prime => {
        nodes.push({ name: truncateText(prime, 30), type: 'prime' });
      });
      
      // Create links array
      const links = [];
      const agencyIndices = {};
      const primeIndices = {};
      
      // Map names to indices
      let indexCounter = 0;
      Array.from(subAgencies).forEach(agency => {
        agencyIndices[agency] = indexCounter++;
      });
      
      topPrimes.forEach(prime => {
        primeIndices[prime] = indexCounter++;
      });
      
      // Create links from agencies to primes
      data.forEach(row => {
        const agency = row.subAgencyName || row.awarding_sub_agency_name;
        const prime = row.primeName || row.recipient_name;
        
        if (!agency || !prime || 
            !agencyIndices.hasOwnProperty(agency) || 
            !primeIndices.hasOwnProperty(prime)) {
          return;
        }
        
        const value = parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0);
        if (value <= 0) return;
        
        // Check if a link already exists between these nodes
        const existingLinkIndex = links.findIndex(link => 
          link.source === agencyIndices[agency] && link.target === primeIndices[prime]
        );
        
        if (existingLinkIndex >= 0) {
          // Add to existing link
          links[existingLinkIndex].value += value;
        } else {
          // Create new link
          links.push({
            source: agencyIndices[agency],
            target: primeIndices[prime],
            value: value
          });
        }
      });
      
      return { nodes, links };
    };
  }
  
  // 5. Fix for processMapData
  if (typeof window.processMapData !== 'function') {
    window.processMapData = function(data) {
      console.log("Using patched processMapData function");
      
      if (!data || data.length === 0) {
        return {};
      }
      
      // Create a map to store state-level aggregates
      const stateData = {};
      
      data.forEach(row => {
        // Try to get state code from various fields
        let stateCode = row.popStateCode || 
                        row.place_of_performance_state_code || 
                        row.prime_award_transaction_place_of_performance_state_fips_code;
        
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
        
        stateData[stateCode].value += parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0);
        stateData[stateCode].count += 1;
      });
      
      return stateData;
    };
  }
  
  // 6. Helper functions that might be missing
  if (typeof window.parseSafeFloat !== 'function') {
    window.parseSafeFloat = function(value) {
      if (value === null || value === undefined || value === '') return 0;
      const cleanedString = String(value).replace(/[^0-9.-]+/g,'');
      const num = parseFloat(cleanedString);
      return isNaN(num) ? 0 : num;
    };
  }
  
  if (typeof window.calculateDurationDays !== 'function') {
    window.calculateDurationDays = function(startDateStr, endDateStr) {
      const start = parseDate(startDateStr);
      const end = parseDate(endDateStr);
      
      // Ensure both dates are valid
      if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || 
          isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return 0;
      }
      
      // Calculate difference in days
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Add 1 to include both start and end date
      
      return diffDays > 0 ? diffDays : 0;
    };
  }
  
  if (typeof window.parseDate !== 'function') {
    window.parseDate = function(dateString) {
      if (!dateString || typeof dateString !== 'string') return null;
      
      // If already a Date object, return it
      if (dateString instanceof Date && !isNaN(dateString.getTime())) return dateString;
      
      try {
        // Try ISO format
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) return date;
        
        // Try MM/DD/YYYY format
        if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const parts = dateString.split('/');
          const newDate = new Date(parts[2], parts[0] - 1, parts[1]);
          if (!isNaN(newDate.getTime())) return newDate;
        }
        
        // Try other formats if needed
        
        return null;
      } catch (e) {
        console.error(`Error parsing date: "${dateString}"`, e);
        return null;
      }
    };
  }
  
  if (typeof window.truncateText !== 'function') {
    window.truncateText = function(text, maxLength) {
      if (!text) return '';
      const stringText = String(text);
      return stringText.length > maxLength ? stringText.substring(0, maxLength - 3) + '...' : stringText;
    };
  }
  
  // 7. Fix for calculateAverageARR
  if (typeof window.calculateAverageARR !== 'function') {
    window.calculateAverageARR = function(data) {
      console.log("Using patched calculateAverageARR function");
      
      const resultDiv = document.getElementById('arr-result');
      const loadingDiv = document.getElementById('arr-loading');
      const errorDiv = document.getElementById('arr-error');
      const noDataDiv = document.getElementById('arr-no-data');
      
      if (!resultDiv || !loadingDiv || !errorDiv || !noDataDiv) {
        console.error("ARR display elements not found");
        return;
      }
      
      // Reset UI elements
      resultDiv.style.display = 'none';
      loadingDiv.style.display = 'block';
      errorDiv.style.display = 'none';
      noDataDiv.style.display = 'none';
      
      try {
        // Check for empty data
        if (!data || data.length === 0) {
          loadingDiv.style.display = 'none';
          noDataDiv.style.display = 'block';
          resultDiv.textContent = '$0 / yr';
          resultDiv.style.display = 'block';
          return;
        }
        
        // Filter contracts with valid dates and values
        const validContracts = data.filter(row => {
          // Check if has value
          const value = parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0);
          if (value <= 0) return false;
          
          // Check if has dates
          let startDate = null;
          let endDate = null;
          
          if (row.parsedStartDate && row.parsedEndDate) {
            startDate = row.parsedStartDate;
            endDate = row.parsedEndDate;
          } else if (row.period_of_performance_start_date && row.period_of_performance_current_end_date) {
            startDate = parseDate(row.period_of_performance_start_date);
            endDate = parseDate(row.period_of_performance_current_end_date);
          } else if (row.startDate && row.endDate) {
            startDate = parseDate(row.startDate);
            endDate = parseDate(row.endDate);
          }
          
          return startDate && endDate && endDate > startDate;
        });
        
        if (validContracts.length === 0) {
          loadingDiv.style.display = 'none';
          noDataDiv.style.display = 'block';
          resultDiv.textContent = '$0 / yr';
          resultDiv.style.display = 'block';
          return;
        }
        
        // Calculate ARR for each contract and average
        let totalARR = 0;
        
        validContracts.forEach(contract => {
          // Get value
          const value = parseSafeFloat(contract.contractValue || contract.current_total_value_of_award || 0);
          
          // Get dates
          let startDate = null;
          let endDate = null;
          
          if (contract.parsedStartDate && contract.parsedEndDate) {
            startDate = contract.parsedStartDate;
            endDate = contract.parsedEndDate;
          } else if (contract.period_of_performance_start_date && contract.period_of_performance_current_end_date) {
            startDate = parseDate(contract.period_of_performance_start_date);
            endDate = parseDate(contract.period_of_performance_current_end_date);
          } else if (contract.startDate && contract.endDate) {
            startDate = parseDate(contract.startDate);
            endDate = parseDate(contract.endDate);
          }
          
          // Calculate duration in days
          const durationDays = calculateDurationDays(startDate, endDate);
          
          // Calculate annualized value
          const arr = (value / durationDays) * 365.25;
          
          totalARR += arr;
        });
        
        // Calculate average ARR
        const averageARR = totalARR / validContracts.length;
        
        // Format and display result
        resultDiv.textContent = formatConciseCurrency(averageARR) + " / yr";
        resultDiv.style.display = 'block';
        loadingDiv.style.display = 'none';
        
      } catch (error) {
        console.error("Error calculating ARR:", error);
        errorDiv.textContent = `Error calculating ARR: ${error.message}`;
        errorDiv.style.display = 'block';
        loadingDiv.style.display = 'none';
      }
    };
    
    // Helper for formatting currency
    if (typeof window.formatConciseCurrency !== 'function') {
      window.formatConciseCurrency = function(value) {
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
      };
    }
  }
  
  // 8. Fix for buildCombinedSankeyData if it's needed
  if (typeof window.buildCombinedSankeyData !== 'function') {
    window.buildCombinedSankeyData = function(primeData, subData) {
      console.log("Using patched buildCombinedSankeyData function");
      
      // Create a merged Sankey visualization
      console.log("Building combined Sankey data...");
      
      // Get top agencies
      const agencies = new Set();
      primeData.forEach(row => {
        const agency = row.subAgencyName || row.awarding_sub_agency_name;
        if (agency) agencies.add(agency);
      });
      subData.forEach(row => {
        const agency = row.subAgencyName || row.awarding_sub_agency_name;
        if (agency) agencies.add(agency);
      });
      
      // Get top prime contractors
      const primeValues = {};
      primeData.forEach(row => {
        const prime = row.primeName || row.recipient_name;
        if (!prime) return;
        primeValues[prime] = (primeValues[prime] || 0) + 
          parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0);
      });
      subData.forEach(row => {
        const prime = row.primeName;
        if (!prime) return;
        primeValues[prime] = (primeValues[prime] || 0) + 
          parseSafeFloat(row.contractValue || row.subaward_amount || 0);
      });
      
      // Get top subcontractors
      const subValues = {};
      subData.forEach(row => {
        const sub = row.subName || row.subawardee_name;
        if (!sub) return;
        subValues[sub] = (subValues[sub] || 0) + 
          parseSafeFloat(row.contractValue || row.subaward_amount || 0);
      });
      
      // Sort and take top 10 of each
      const topAgencies = Array.from(agencies).slice(0, 10);
      const topPrimes = Object.entries(primeValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name]) => name);
      const topSubs = Object.entries(subValues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name);
      
      // Create nodes array
      const nodes = [];
      
      // Add agency nodes
      topAgencies.forEach(agency => {
        nodes.push({ name: truncateText(agency, 30), type: 'agency' });
      });
      
      // Add prime nodes
      topPrimes.forEach(prime => {
        nodes.push({ name: truncateText(prime, 30), type: 'prime' });
      });
      
      // Add sub nodes
      topSubs.forEach(sub => {
        nodes.push({ name: truncateText(sub, 30), type: 'sub' });
      });
      
      // Create links array
      const links = [];
      const nodeMap = {};
      
      // Create node index map
      nodes.forEach((node, i) => {
        nodeMap[node.name] = i;
      });
      
      // Create links from agencies to primes
      const agencyPrimeLinks = {};
      
      // Process agency to prime links from both datasets
      const processAgencyPrimeLink = (agency, prime, value) => {
        if (!agency || !prime || 
          !nodeMap.hasOwnProperty(truncateText(agency, 30)) || 
          !nodeMap.hasOwnProperty(truncateText(prime, 30))) {
          return;
        }
        
        const linkKey = `${agency}|${prime}`;
        
        if (!agencyPrimeLinks[linkKey]) {
          agencyPrimeLinks[linkKey] = {
            source: nodeMap[truncateText(agency, 30)],
            target: nodeMap[truncateText(prime, 30)],
            value: 0
          };
        }
        
        agencyPrimeLinks[linkKey].value += value;
      };
      
      primeData.forEach(row => {
        const agency = row.subAgencyName || row.awarding_sub_agency_name;
        const prime = row.primeName || row.recipient_name;
        const value = parseSafeFloat(row.contractValue || row.current_total_value_of_award || 0);
        processAgencyPrimeLink(agency, prime, value);
      });
      
      subData.forEach(row => {
        const agency = row.subAgencyName;
        const prime = row.primeName;
        const value = parseSafeFloat(row.contractValue || row.subaward_amount || 0);
        processAgencyPrimeLink(agency, prime, value);
      });
      
      // Add agency-prime links to the links array
      Object.values(agencyPrimeLinks).forEach(link => {
        if (link.value > 0) {
          links.push(link);
        }
      });
      
      // Create links from primes to subs
      const primeSubLinks = {};
      
      subData.forEach(row => {
        const prime = row.primeName;
        const sub = row.subName || row.subawardee_name;
        
        if (!prime || !sub || 
          !nodeMap.hasOwnProperty(truncateText(prime, 30)) || 
          !nodeMap.hasOwnProperty(truncateText(sub, 30))) {
          return;
        }
        
        const linkKey = `${prime}|${sub}`;
        
        if (!primeSubLinks[linkKey]) {
          primeSubLinks[linkKey] = {
            source: nodeMap[truncateText(prime, 30)],
            target: nodeMap[truncateText(sub, 30)],
            value: 0
          };
        }
        
        primeSubLinks[linkKey].value += parseSafeFloat(row.contractValue || row.subaward_amount || 0);
      });
      
      // Add prime-sub links to the links array
      Object.values(primeSubLinks).forEach(link => {
        if (link.value > 0) {
          links.push(link);
        }
      });
      
      return { nodes, links };
    };
  }
  
  // 9. Make sure snapshot buttons correctly access the current model
  function fixSnapshotButtons() {
    // Find existing buttons
    const fullButton = document.getElementById('snapshot-button');
    const inlineButton = document.getElementById('inline-snapshot-button');
    
    // Fix full snapshot button
    if (fullButton) {
      // Remove existing event listeners by cloning
      const newFullButton = fullButton.cloneNode(true);
      if (fullButton.parentNode) {
        fullButton.parentNode.replaceChild(newFullButton, fullButton);
      }
      
      // Add new event listener
      newFullButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("Full snapshot button clicked - using latest unifiedModel");
        
        // Always use the latest unifiedModel
        if (!window.unifiedModel) {
          alert("No data loaded. Please select an agency dataset first.");
          return;
        }
        
        // Use viewAgencySnapshot if it exists
        if (typeof window.viewAgencySnapshot === 'function') {
          window.viewAgencySnapshot();
        } else {
          // Fallback to direct HTML generation
          const html = window.generateAgencySnapshotHTML(window.unifiedModel);
          const newWindow = window.open('', '_blank');
          newWindow.document.write(html);
          newWindow.document.close();
        }
      });
    }
    
    // Fix inline snapshot button
    if (inlineButton) {
      // Remove existing event listeners by cloning
      const newInlineButton = inlineButton.cloneNode(true);
      if (inlineButton.parentNode) {
        inlineButton.parentNode.replaceChild(newInlineButton, inlineButton);
      }
      
      // Add new event listener
      newInlineButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("Inline snapshot button clicked - using latest unifiedModel");
        
        // Always use the latest unifiedModel
        if (!window.unifiedModel) {
          alert("No data loaded. Please select an agency dataset first.");
          return;
        }
        
        // Use viewInlineAgencySnapshot if it exists
        if (typeof window.viewInlineAgencySnapshot === 'function') {
          window.viewInlineAgencySnapshot();
        } else {
          // Fallback to alert
          alert("Quick snapshot view is not available. Please use the full snapshot button instead.");
        }
      });
    }
  }
  
  // 10. Add hooks to detect dataset changes
  function addDatasetChangeHooks() {
    // Hook into loadSingleDataset
    if (typeof window.loadSingleDataset === 'function') {
      const originalLoadSingleDataset = window.loadSingleDataset;
      window.loadSingleDataset = function(dataset) {
        // Call original function
        originalLoadSingleDataset.apply(this, arguments);
        
        // Fix snapshot buttons after dataset loads
        setTimeout(function() {
          console.log("Dataset loaded, fixing snapshot buttons");
          fixSnapshotButtons();
        }, 1500);
      };
      console.log("Successfully hooked into loadSingleDataset");
    }
    
    // Hook into loadCombinedDatasets
    if (typeof window.loadCombinedDatasets === 'function') {
      const originalLoadCombinedDatasets = window.loadCombinedDatasets;
      window.loadCombinedDatasets = function(datasetIds) {
        // Call original function
        originalLoadCombinedDatasets.apply(this, arguments);
        
        // Fix snapshot buttons after dataset loads
        setTimeout(function() {
          console.log("Combined datasets loaded, fixing snapshot buttons");
          fixSnapshotButtons();
        }, 2000);
      };
      console.log("Successfully hooked into loadCombinedDatasets");
    }
    
    // Add dataset selection change handler
    const datasetSelect = document.getElementById('dataset-select');
    if (datasetSelect) {
      datasetSelect.addEventListener('change', function() {
        // Fix snapshot buttons after a new dataset is selected
        setTimeout(function() {
          console.log("Dataset selection changed, fixing snapshot buttons");
          fixSnapshotButtons();
        }, 500);
      });
    }
  }
  
  // 11. Run the fix
  console.log("Running all fixes now...");
  
  // Fix snapshot buttons first
  fixSnapshotButtons();
  
  // Add dataset change hooks
  addDatasetChangeHooks();
  
  // Rerun visualization update with fixed functions
  if (typeof window.applyFiltersAndUpdateVisuals === 'function') {
    console.log("Re-running visualization update with fixed functions");
    setTimeout(function() {
      try {
        window.applyFiltersAndUpdateVisuals();
      } catch (e) {
        console.error("Error updating visualizations:", e);
      }
    }, 500);
  }
  
  console.log("All fixes applied successfully");
})();