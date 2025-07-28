// Global variables
let chart = null;
const scenarios = [
    { name: 'All Cash', description: 'Purchase home with cash, no financing' },
    { name: '80% Mortgage', description: '20% down payment, 80% conventional mortgage' },
    { name: '$750K Mtg + Box Spread', description: 'Mortgage up to deduction limit plus synthetic box spread' },
    { name: 'Securities Loan', description: 'Pledge securities as collateral with opportunity cost analysis' }
];

// Default values
const defaultInputs = {
    homePrice: 1850000,
    closingCosts: 2.3,
    propertyTax: 1.26,
    insurance: 24000,
    maintenance: 1.5,
    appreciation: 3.0,
    holdingPeriod: 10,
    mortgageRate: 6.9,
    deductionLimit: 750000,
    sofrRate: 4.33,
    investReturn: 7.0,
    taxOrdinary: 37.0,
    taxCapitalGains: 23.8,
    sellingCost: 7.0,
    securitiesLtv: 40,
    altReturnPe: 8.9,
    altReturnHf: 8.0,
    altReturnCredit: 10.0,
    altReturnRe: 9.5,
    altWeightPe: 30,
    altWeightHf: 25,
    altWeightCredit: 25,
    altWeightRe: 20
};

// Utility functions
function formatCurrency(value) {
    if (isNaN(value) || value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatPercent(value) {
    return value.toFixed(2) + '%';
}

function parseInputValue(id) {
    const element = document.getElementById(id);
    if (!element) return 0;
    const value = parseFloat(element.value);
    return isNaN(value) ? 0 : value;
}

// PMT function for mortgage calculations
function pmt(rate, nper, pv) {
    if (rate === 0) return -pv / nper;
    if (nper === 0) return 0;
    return -pv * (rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}

// Get current input values
function getInputs() {
    const inputs = {
        homePrice: parseInputValue('homePrice'),
        closingCosts: parseInputValue('closingCosts') / 100,
        propertyTax: parseInputValue('propertyTax') / 100,
        insurance: parseInputValue('insurance'),
        maintenance: parseInputValue('maintenance') / 100,
        appreciation: parseInputValue('appreciation') / 100,
        holdingPeriod: parseInputValue('holdingPeriod'),
        mortgageRate: parseInputValue('mortgageRate') / 100,
        deductionLimit: parseInputValue('deductionLimit'),
        sofrRate: parseInputValue('sofrRate') / 100,
        investReturn: parseInputValue('investReturn') / 100,
        taxOrdinary: parseInputValue('taxOrdinary') / 100,
        taxCapitalGains: parseInputValue('taxCapitalGains') / 100,
        sellingCost: parseInputValue('sellingCost') / 100,
        securitiesLtv: parseInputValue('securitiesLtv') / 100,
        altReturnPe: parseInputValue('altReturnPe') / 100,
        altReturnHf: parseInputValue('altReturnHf') / 100,
        altReturnCredit: parseInputValue('altReturnCredit') / 100,
        altReturnRe: parseInputValue('altReturnRe') / 100,
        altWeightPe: parseInputValue('altWeightPe') / 100,
        altWeightHf: parseInputValue('altWeightHf') / 100,
        altWeightCredit: parseInputValue('altWeightCredit') / 100,
        altWeightRe: parseInputValue('altWeightRe') / 100
    };
    
    // Auto-calculate derived rates
    inputs.boxSpreadRate = inputs.sofrRate + 0.005; // SOFR + 0.5%
    inputs.securitiesRate = inputs.sofrRate + 0.01; // SOFR + 1.0%
    
    // Calculate blended alternative return
    inputs.blendedAltReturn = (inputs.altReturnPe * inputs.altWeightPe) + 
                             (inputs.altReturnHf * inputs.altWeightHf) + 
                             (inputs.altReturnCredit * inputs.altWeightCredit) + 
                             (inputs.altReturnRe * inputs.altWeightRe);
    
    return inputs;
}

// Update auto-calculated fields
function updateCalculatedFields() {
    const sofrRate = parseInputValue('sofrRate');
    const boxSpreadElement = document.getElementById('boxSpreadRate');
    const securitiesElement = document.getElementById('securitiesRate');
    
    if (boxSpreadElement) {
        boxSpreadElement.value = (sofrRate + 0.5).toFixed(2);
    }
    if (securitiesElement) {
        securitiesElement.value = (sofrRate + 1.0).toFixed(2);
    }
}

// Calculate ownership costs (taxes, insurance, maintenance)
function calculateOwnershipCosts(inputs) {
    const annualPropertyTax = inputs.homePrice * inputs.propertyTax;
    const annualMaintenance = inputs.homePrice * inputs.maintenance;
    const totalAnnualCosts = annualPropertyTax + inputs.insurance + annualMaintenance;
    return totalAnnualCosts * inputs.holdingPeriod;
}

// Calculate home sale proceeds
function calculateHomeSaleProceeds(inputs) {
    const futureValue = inputs.homePrice * Math.pow(1 + inputs.appreciation, inputs.holdingPeriod);
    const sellingCosts = futureValue * inputs.sellingCost;
    return futureValue - sellingCosts;
}

// Scenario 1: All Cash
function calculateAllCash(inputs) {
    const upfrontCost = inputs.homePrice + (inputs.homePrice * inputs.closingCosts);
    const ownershipCosts = calculateOwnershipCosts(inputs);
    const homeSaleProceeds = calculateHomeSaleProceeds(inputs);
    const totalNetWorth = homeSaleProceeds - ownershipCosts;
    
    return {
        downPayment: inputs.homePrice,
        upfrontCost: upfrontCost,
        annualDebtService: 0,
        totalInterestCost: 0,
        portfolioGrowth: 0,
        homeSaleProceeds: homeSaleProceeds,
        totalNetWorth: totalNetWorth,
        netVsAllCash: 0
    };
}

// Scenario 2: 80% Mortgage
function calculateMortgage80(inputs) {
    const downPayment = inputs.homePrice * 0.2;
    const mortgageAmount = inputs.homePrice * 0.8;
    const closingCosts = inputs.homePrice * inputs.closingCosts;
    const upfrontCost = downPayment + closingCosts;
    
    const monthlyRate = inputs.mortgageRate / 12;
    const numPayments = inputs.holdingPeriod * 12;
    const monthlyPayment = pmt(monthlyRate, numPayments, mortgageAmount);
    const annualDebtService = Math.abs(monthlyPayment * 12);
    const totalInterestCost = (annualDebtService * inputs.holdingPeriod) - mortgageAmount;
    
    // Remaining cash for investment
    const remainingCash = inputs.homePrice - downPayment - closingCosts;
    const portfolioGrowth = remainingCash > 0 ? remainingCash * Math.pow(1 + inputs.investReturn, inputs.holdingPeriod) - remainingCash : 0;
    
    // Tax savings from mortgage interest deduction
    const deductibleAmount = Math.min(mortgageAmount, inputs.deductionLimit);
    const avgInterestRate = inputs.mortgageRate; // Simplified assumption
    const taxSavings = deductibleAmount * avgInterestRate * inputs.taxOrdinary * inputs.holdingPeriod * 0.5; // Average over period
    
    const ownershipCosts = calculateOwnershipCosts(inputs);
    const homeSaleProceeds = calculateHomeSaleProceeds(inputs);
    const totalNetWorth = portfolioGrowth + homeSaleProceeds - totalInterestCost - ownershipCosts + taxSavings;
    
    return {
        downPayment: downPayment,
        upfrontCost: upfrontCost,
        annualDebtService: annualDebtService,
        totalInterestCost: totalInterestCost,
        portfolioGrowth: portfolioGrowth,
        homeSaleProceeds: homeSaleProceeds,
        totalNetWorth: totalNetWorth,
        netVsAllCash: 0
    };
}

// Scenario 3: $750K Mortgage + Box Spread
function calculateMortgageBoxSpread(inputs) {
    const downPayment = inputs.homePrice * 0.2;
    const totalFinancing = inputs.homePrice * 0.8;
    const mortgageAmount = Math.min(inputs.deductionLimit, totalFinancing);
    const boxSpreadAmount = Math.max(0, totalFinancing - mortgageAmount);
    const closingCosts = inputs.homePrice * inputs.closingCosts;
    const upfrontCost = downPayment + closingCosts;
    
    // Mortgage portion
    const monthlyRate = inputs.mortgageRate / 12;
    const numPayments = inputs.holdingPeriod * 12;
    const monthlyMortgagePayment = mortgageAmount > 0 ? pmt(monthlyRate, numPayments, mortgageAmount) : 0;
    const annualMortgageService = Math.abs(monthlyMortgagePayment * 12);
    
    // Box spread portion
    const annualBoxSpreadCost = boxSpreadAmount * inputs.boxSpreadRate;
    const totalAnnualDebtService = annualMortgageService + annualBoxSpreadCost;
    
    const mortgageInterest = mortgageAmount > 0 ? (annualMortgageService * inputs.holdingPeriod) - mortgageAmount : 0;
    const boxSpreadInterest = annualBoxSpreadCost * inputs.holdingPeriod;
    const totalInterestCost = mortgageInterest + boxSpreadInterest;
    
    // Tax savings
    const taxSavings = (mortgageInterest * 0.5 + boxSpreadInterest) * inputs.taxOrdinary; // Mortgage interest averaged
    
    // Portfolio growth
    const remainingCash = inputs.homePrice - downPayment - closingCosts;
    const portfolioGrowth = remainingCash > 0 ? remainingCash * Math.pow(1 + inputs.investReturn, inputs.holdingPeriod) - remainingCash : 0;
    
    const ownershipCosts = calculateOwnershipCosts(inputs);
    const homeSaleProceeds = calculateHomeSaleProceeds(inputs);
    const totalNetWorth = portfolioGrowth + homeSaleProceeds - totalInterestCost - ownershipCosts + taxSavings;
    
    return {
        downPayment: downPayment,
        upfrontCost: upfrontCost,
        annualDebtService: totalAnnualDebtService,
        totalInterestCost: totalInterestCost,
        portfolioGrowth: portfolioGrowth,
        homeSaleProceeds: homeSaleProceeds,
        totalNetWorth: totalNetWorth,
        netVsAllCash: 0
    };
}

// Scenario 4: Securities Loan with Enhanced Opportunity Cost
function calculateSecuritiesLoan(inputs) {
    const downPayment = 0;
    const loanAmount = inputs.homePrice * 0.8; // 80% LTV on home
    const upfrontCost = inputs.homePrice * inputs.closingCosts;
    
    // Securities required to be pledged
    const pledgedSecurities = loanAmount / inputs.securitiesLtv;
    
    // Annual interest cost
    const annualInterest = loanAmount * inputs.securitiesRate;
    
    // Annual opportunity cost from missing alternative investments
    const annualOpportunityCost = pledgedSecurities * (inputs.blendedAltReturn - inputs.investReturn);
    
    // Total annual cost
    const totalAnnualCost = annualInterest + annualOpportunityCost;
    const totalInterestCost = totalAnnualCost * inputs.holdingPeriod;
    
    // Tax savings from securities loan interest (only on interest, not opportunity cost)
    const taxSavings = (annualInterest * inputs.holdingPeriod) * inputs.taxOrdinary;
    
    // Full portfolio growth since no cash used upfront (minus pledged securities)
    const availableForInvestment = inputs.homePrice - pledgedSecurities;
    const portfolioGrowth = availableForInvestment > 0 ? 
        availableForInvestment * Math.pow(1 + inputs.investReturn, inputs.holdingPeriod) - availableForInvestment : 0;
    
    const ownershipCosts = calculateOwnershipCosts(inputs);
    const homeSaleProceeds = calculateHomeSaleProceeds(inputs);
    const totalNetWorth = portfolioGrowth + homeSaleProceeds - totalInterestCost - ownershipCosts + taxSavings;
    
    return {
        downPayment: downPayment,
        upfrontCost: upfrontCost,
        annualDebtService: totalAnnualCost,
        totalInterestCost: totalInterestCost,
        portfolioGrowth: portfolioGrowth,
        homeSaleProceeds: homeSaleProceeds,
        totalNetWorth: totalNetWorth,
        netVsAllCash: 0,
        // Additional securities loan specific data
        loanAmount: loanAmount,
        pledgedSecurities: pledgedSecurities,
        annualInterest: annualInterest,
        annualOpportunityCost: annualOpportunityCost,
        blendedAltReturn: inputs.blendedAltReturn
    };
}

// Calculate all scenarios
function calculateAllScenarios() {
    try {
        const inputs = getInputs();
        
        const results = [
            calculateAllCash(inputs),
            calculateMortgage80(inputs),
            calculateMortgageBoxSpread(inputs),
            calculateSecuritiesLoan(inputs)
        ];
        
        // Calculate net vs all-cash for each scenario
        const allCashNetWorth = results[0].totalNetWorth;
        results.forEach(result => {
            result.netVsAllCash = result.totalNetWorth - allCashNetWorth;
        });
        
        return results;
    } catch (error) {
        console.error('Error in calculateAllScenarios:', error);
        return [];
    }
}

// Update the opportunity cost breakdown display
function updateOpportunityCostBreakdown() {
    const inputs = getInputs();
    const securitiesResult = calculateSecuritiesLoan(inputs);
    const opportunityDiv = document.getElementById('opportunityCostBreakdown');
    
    if (!opportunityDiv) return;
    
    const apparentCost = securitiesResult.annualInterest * inputs.holdingPeriod;
    const trueCost = securitiesResult.totalInterestCost;
    
    opportunityDiv.innerHTML = `
        <div class="cost-breakdown">
            <div class="cost-item">
                <div class="cost-item-label">Securities Loan Interest</div>
                <div class="cost-item-value">${formatCurrency(apparentCost)}</div>
                <div class="cost-item-annual">${formatCurrency(securitiesResult.annualInterest)}/year</div>
            </div>
            <div class="cost-item">
                <div class="cost-item-label">Opportunity Cost</div>
                <div class="cost-item-value">${formatCurrency(securitiesResult.annualOpportunityCost * inputs.holdingPeriod)}</div>
                <div class="cost-item-annual">${formatCurrency(securitiesResult.annualOpportunityCost)}/year</div>
            </div>
            <div class="cost-item total-cost-highlight">
                <div class="cost-item-label">Total True Cost</div>
                <div class="cost-item-value">${formatCurrency(trueCost)}</div>
                <div class="cost-item-annual">${formatCurrency(securitiesResult.totalAnnualCost)}/year</div>
            </div>
            <div class="cost-item">
                <div class="cost-item-label">Pledged Securities Required</div>
                <div class="cost-item-value">${formatCurrency(securitiesResult.pledgedSecurities)}</div>
                <div class="cost-item-annual">At ${formatPercent(inputs.securitiesLtv * 100)} LTV</div>
            </div>
        </div>
        
        <div class="blended-return-info">
            <div class="blended-return-title">Alternative Investment Portfolio Composition</div>
            <div class="return-breakdown">
                <div class="return-item">
                    <span>Private Equity (${formatPercent(inputs.altWeightPe * 100)}):</span>
                    <span>${formatPercent(inputs.altReturnPe * 100)}</span>
                </div>
                <div class="return-item">
                    <span>Hedge Funds (${formatPercent(inputs.altWeightHf * 100)}):</span>
                    <span>${formatPercent(inputs.altReturnHf * 100)}</span>
                </div>
                <div class="return-item">
                    <span>Private Credit (${formatPercent(inputs.altWeightCredit * 100)}):</span>
                    <span>${formatPercent(inputs.altReturnCredit * 100)}</span>
                </div>
                <div class="return-item">
                    <span>Real Estate (${formatPercent(inputs.altWeightRe * 100)}):</span>
                    <span>${formatPercent(inputs.altReturnRe * 100)}</span>
                </div>
            </div>
            <div class="blended-result">
                <strong>Blended Alternative Return: ${formatPercent(inputs.blendedAltReturn * 100)}</strong><br>
                <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    vs Standard Portfolio: ${formatPercent(inputs.investReturn * 100)} 
                    (Opportunity Cost: ${formatPercent((inputs.blendedAltReturn - inputs.investReturn) * 100)})
                </span>
            </div>
        </div>
        
        <div class="securities-analysis">
            <div class="securities-analysis-title">Securities Loan Reality Check</div>
            <p style="text-align: center; margin-bottom: var(--space-16); color: var(--color-text-secondary);">
                The true cost of securities loans is significantly higher when opportunity costs are included
            </p>
            <div class="analysis-comparison">
                <div class="analysis-item">
                    <div class="analysis-label">Apparent Annual Cost</div>
                    <div class="analysis-value apparent-cost">${formatCurrency(securitiesResult.annualInterest)}</div>
                </div>
                <div class="analysis-item">
                    <div class="analysis-label">True Annual Cost</div>
                    <div class="analysis-value true-cost">${formatCurrency(securitiesResult.totalAnnualCost)}</div>
                </div>
            </div>
        </div>
    `;
}

// Update the comparison table
function updateTable() {
    try {
        const results = calculateAllScenarios();
        const tbody = document.getElementById('comparisonTableBody');
        
        if (!tbody) {
            console.error('Table body element not found');
            return;
        }
        
        if (results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: var(--space-20); color: var(--color-error);">Error calculating scenarios</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        // Find best and worst scenarios
        let bestIndex = 0;
        let worstIndex = 0;
        for (let i = 1; i < results.length; i++) {
            if (results[i].totalNetWorth > results[bestIndex].totalNetWorth) {
                bestIndex = i;
            }
            if (results[i].totalNetWorth < results[worstIndex].totalNetWorth) {
                worstIndex = i;
            }
        }
        
        results.forEach((result, index) => {
            const row = document.createElement('tr');
            row.className = `scenario-row-${index}`;
            
            if (index === bestIndex) {
                row.classList.add('best-scenario');
            } else if (index === worstIndex) {
                row.classList.add('worst-scenario');
            }
            
            const netVsAllCashClass = result.netVsAllCash > 0 ? 'positive-value' : 
                                     result.netVsAllCash < 0 ? 'negative-value' : '';
            
            row.innerHTML = `
                <td class="scenario-name">${scenarios[index].name}</td>
                <td class="currency-cell">${formatCurrency(result.downPayment)}</td>
                <td class="currency-cell">${formatCurrency(result.upfrontCost)}</td>
                <td class="currency-cell">${formatCurrency(result.annualDebtService)}</td>
                <td class="currency-cell">${formatCurrency(result.totalInterestCost)}</td>
                <td class="currency-cell">${formatCurrency(result.portfolioGrowth)}</td>
                <td class="currency-cell">${formatCurrency(result.homeSaleProceeds)}</td>
                <td class="currency-cell">${formatCurrency(result.totalNetWorth)}</td>
                <td class="currency-cell ${netVsAllCashClass}">${formatCurrency(result.netVsAllCash)}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Update opportunity cost breakdown
        updateOpportunityCostBreakdown();
        
        // Update chart
        updateChart(results);
        
        // Update optimal scenario summary
        updateOptimalSummary(results, bestIndex);
    } catch (error) {
        console.error('Error updating table:', error);
    }
}

// Update the chart
function updateChart(results) {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) {
        console.error('Chart canvas element not found');
        return;
    }
    
    if (chart) {
        chart.destroy();
    }
    
    const chartData = {
        labels: scenarios.map(s => s.name),
        datasets: [{
            label: 'Total Net Worth After 10 Years',
            data: results.map(r => r.totalNetWorth),
            backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'],
            borderColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'],
            borderWidth: 2
        }]
    };
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Update optimal scenario summary
function updateOptimalSummary(results, bestIndex) {
    const optimalDiv = document.getElementById('optimalScenario');
    if (!optimalDiv) {
        console.error('Optimal scenario element not found');
        return;
    }
    
    const bestResult = results[bestIndex];
    const bestScenario = scenarios[bestIndex];
    
    optimalDiv.innerHTML = `
        <div class="optimal-scenario-name">${bestScenario.name}</div>
        <div class="optimal-details">${bestScenario.description}</div>
        <div style="margin-top: var(--space-12);">
            <strong>Total Net Worth:</strong> <span class="optimal-value">${formatCurrency(bestResult.totalNetWorth)}</span>
        </div>
        <div style="margin-top: var(--space-8);">
            <strong>Advantage over All-Cash:</strong> <span class="optimal-value ${bestResult.netVsAllCash > 0 ? 'positive-value' : ''}">${formatCurrency(bestResult.netVsAllCash)}</span>
        </div>
    `;
}

// Reset to default values - FIXED VERSION
function resetToDefaults() {
    try {
        console.log('Resetting to defaults...');
        
        // Set each input value individually and trigger events
        const inputElements = [
            { id: 'homePrice', value: defaultInputs.homePrice },
            { id: 'closingCosts', value: defaultInputs.closingCosts },
            { id: 'propertyTax', value: defaultInputs.propertyTax },
            { id: 'insurance', value: defaultInputs.insurance },
            { id: 'maintenance', value: defaultInputs.maintenance },
            { id: 'appreciation', value: defaultInputs.appreciation },
            { id: 'holdingPeriod', value: defaultInputs.holdingPeriod },
            { id: 'mortgageRate', value: defaultInputs.mortgageRate },
            { id: 'deductionLimit', value: defaultInputs.deductionLimit },
            { id: 'sofrRate', value: defaultInputs.sofrRate },
            { id: 'investReturn', value: defaultInputs.investReturn },
            { id: 'taxOrdinary', value: defaultInputs.taxOrdinary },
            { id: 'taxCapitalGains', value: defaultInputs.taxCapitalGains },
            { id: 'sellingCost', value: defaultInputs.sellingCost },
            { id: 'securitiesLtv', value: defaultInputs.securitiesLtv },
            { id: 'altReturnPe', value: defaultInputs.altReturnPe },
            { id: 'altReturnHf', value: defaultInputs.altReturnHf },
            { id: 'altReturnCredit', value: defaultInputs.altReturnCredit },
            { id: 'altReturnRe', value: defaultInputs.altReturnRe },
            { id: 'altWeightPe', value: defaultInputs.altWeightPe },
            { id: 'altWeightHf', value: defaultInputs.altWeightHf },
            { id: 'altWeightCredit', value: defaultInputs.altWeightCredit },
            { id: 'altWeightRe', value: defaultInputs.altWeightRe }
        ];
        
        inputElements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                console.log(`Reset ${id} to ${value}`);
                
                // Trigger change event to ensure the UI updates
                const event = new Event('input', { bubbles: true });
                element.dispatchEvent(event);
            } else {
                console.warn(`Element with id ${id} not found`);
            }
        });
        
        // Update calculated fields and table
        updateCalculatedFields();
        updateTable();
        
        console.log('Reset completed successfully');
    } catch (error) {
        console.error('Error resetting to defaults:', error);
    }
}

// Handle input changes with debouncing
let updateTimeout = null;
function handleInputChange(event) {
    try {
        // Clear existing timeout
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        
        // If SOFR rate changed, update calculated fields immediately
        if (event.target.id === 'sofrRate') {
            updateCalculatedFields();
        }
        
        // Debounce the table update for better performance
        updateTimeout = setTimeout(() => {
            updateTable();
        }, 100);
        
    } catch (error) {
        console.error('Error handling input change:', error);
    }
}

// Initialize the application
function init() {
    console.log('Initializing Enhanced Home Financing Calculator...');
    
    try {
        // Add event listeners to all inputs
        const inputs = document.querySelectorAll('.form-control');
        console.log(`Found ${inputs.length} input elements`);
        
        inputs.forEach((input, index) => {
            // Remove readonly attribute if it exists (except for calculated fields)
            if (!input.classList.contains('calculated-field')) {
                input.removeAttribute('readonly');
            }
            
            // Add multiple event listeners for better compatibility
            input.addEventListener('input', handleInputChange);
            input.addEventListener('change', handleInputChange);
            input.addEventListener('keyup', handleInputChange);
            
            console.log(`Added event listeners to input ${index + 1}: ${input.id}`);
        });
        
        // Reset button - Enhanced event listener
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Reset button clicked');
                resetToDefaults();
            });
            
            // Also add backup event listener
            resetBtn.addEventListener('mousedown', function(e) {
                if (e.button === 0) { // Left mouse button
                    e.preventDefault();
                    console.log('Reset button mousedown');
                    resetToDefaults();
                }
            });
            
            console.log('Reset button event listeners added');
        } else {
            console.error('Reset button not found');
        }
        
        // Initial calculations
        updateCalculatedFields();
        updateTable();
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Additional event listener for cases where DOMContentLoaded has already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}