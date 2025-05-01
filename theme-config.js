// Theme Configuration Script
// This should be included after the main JS file

document.addEventListener('DOMContentLoaded', function() {
    console.log("Applying cohesive theme styling...");
    
    // Chart.js default configuration
    if (window.Chart) {
        Chart.defaults.color = '#efedf3';
        Chart.defaults.font.family = "'Inter', sans-serif";
        
        // Override default colors for all charts
        Chart.defaults.plugins.legend.labels.color = '#d7d4dc';
        Chart.defaults.borderColor = '#4e4554';
        Chart.defaults.backgroundColor = '#252327';
        
        // Set default color scheme for all charts
        const defaultColors = [
            '#9993A1', // Purple-300 (Primary)
            '#797484', // Purple-500 (Secondary)
            '#615C66', // Purple-600 (Outline)
            '#8e8a97', // Purple-400
            '#b5b0bd', // Purple-200
            '#4e4554'  // Purple-700
        ];
        
        Chart.defaults.plugins.colors = {
            enabled: true,
            forceOverride: true
        };
        
        // Override color helpers
        Chart.helpers.color = function(color, alpha) {
            // Simple helper to handle color with alpha
            if (alpha === undefined) alpha = 1;
            return color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        };
        
        // Set tooltips styling
        Chart.defaults.plugins.tooltip.backgroundColor = '#252327';
        Chart.defaults.plugins.tooltip.titleColor = '#efedf3';
        Chart.defaults.plugins.tooltip.bodyColor = '#d7d4dc';
        Chart.defaults.plugins.tooltip.borderColor = '#615C66';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
    }
    
    // Configure D3.js color scales for the choropleth map
    window.getChartColorScale = function(domain = [0, 1]) {
        return d3.scaleSequential()
            .domain(domain)
            .interpolator(d3.interpolate('#3b3340', '#9993A1'));
    };
    
    // Configure Sankey diagram colors
    window.getSankeyColors = function() {
        return {
            node: '#9993A1',
            link: '#797484',
            nodeBorder: '#252327',
            linkOpacity: 0.5,
            hoverOpacity: 0.8
        };
    };
    
    // Add these CSS variables to root
    document.documentElement.style.setProperty('--color-charts-primary', '#9993A1');
    document.documentElement.style.setProperty('--color-charts-secondary', '#797484');
    document.documentElement.style.setProperty('--color-charts-tertiary', '#4e4554');
    
    console.log("Theme styling applied successfully");
});

// Add helper function to get stylized bar chart options
window.getBarChartOptions = function(isHorizontal = true) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: isHorizontal ? 'y' : 'x',
        font: {
            family: "'Inter', sans-serif",
            size: 13
        },
        scales: {
            x: {
                beginAtZero: true,
                title: { display: false },
                ticks: {
                    callback: function(value) {
                        if (Math.abs(value) >= 1e6) {
                            return '$' + (value / 1e6).toFixed(1) + 'M';
                        } else if (Math.abs(value) >= 1e3) {
                            return '$' + (value / 1e3).toFixed(0) + 'K';
                        }
                        return value !== 0 ? formatCurrency(value) : '$0';
                    },
                    color: '#d7d4dc',
                    font: { size: 13 },
                    padding: 8,
                    maxTicksLimit: 6,
                },
                grid: {
                    display: false,
                    drawBorder: false,
                },
                border: {
                    display: false,
                }
            },
            y: {
                ticks: {
                    color: '#d7d4dc',
                    font: { 
                        size: 13,
                        weight: 'bold'
                    },
                    padding: 8,
                },
                grid: {
                    display: false,
                    drawBorder: false,
                },
                border: {
                    display: false,
                }
            }
        },
        plugins: {
            tooltip: {
                backgroundColor: '#252327',
                titleColor: '#efedf3',
                bodyColor: '#efedf3',
                borderColor: '#615C66',
                borderWidth: 1,
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                }
            },
            legend: {
                position: 'bottom',
                align: 'center',
                labels: {
                    color: '#efedf3',
                    boxWidth: 18,
                    padding: 20,
                    font: { 
                        size: 14,
                        weight: 'bold'
                    }
                }
            }
        },
        layout: {
            padding: { top: 16, bottom: 16, left: 12, right: 20 }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        }
    };
};

// Helper function for customizing d3.js sankey diagrams
window.configureSankeyDiagram = function(svg, sankeyData, width, height) {
    const margin = {top: 20, right: 20, bottom: 20, left: 20};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Get color configuration
    const colors = getSankeyColors();
    
    // Create the sankey generator
    const sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 1], [innerWidth - 1, innerHeight - 1]]);
    
    // Generate the sankey layout
    const { nodes, links } = sankey({
        nodes: sankeyData.nodes,
        links: sankeyData.links
    });
    
    // Create the main group element with margins
    const g = d3.select(svg)
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Add links
    g.append('g')
        .selectAll('path')
        .data(links)
        .enter()
        .append('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke', colors.link)
        .attr('stroke-opacity', colors.linkOpacity)
        .attr('fill', 'none')
        .on('mouseover', function() {
            d3.select(this).attr('stroke-opacity', colors.hoverOpacity);
        })
        .on('mouseout', function() {
            d3.select(this).attr('stroke-opacity', colors.linkOpacity);
        })
        .append('title')
        .text(d => `${d.source.name} → ${d.target.name}\n${formatCurrency(d.value)}`);
        
    // Add node labels
    g.append('g')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('x', d => d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.x0 < innerWidth / 2 ? 'start' : 'end')
        .text(d => d.name)
        .attr('font-size', '10px')
        .attr('fill', '#efedf3');
    
    return g;
};

// Helper function for customizing the choropleth map
window.configureMapColors = function(mapData) {
    if (!mapData || Object.keys(mapData).length === 0) return null;
    
    // Extract values for color scale domain
    const stateValues = Object.values(mapData).map(d => d.value);
    const maxValue = d3.max(stateValues) || 0;
    
    // Create color scale
    return d3.scaleSequential()
        .domain([0, maxValue])
        .interpolator(d3.interpolate('#3b3340', '#9993A1'));
};
    