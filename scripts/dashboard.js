/**
 * Advanced Dynamic Dashboard Logic
 * Injects massive data-rich custom layouts based on 10 specific roles.
 */

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role") || "Guest Agent";

  // Set UI Labels
  document.getElementById("dashRoleLabel").textContent = role;
  document.getElementById("dashWelcomeLabel").textContent =
    `Welcome, ${role.split(" ")[0]}`;

  const widgetsContainer = document.getElementById("dynamicWidgets");

  // --- 10 Dedicated Role Configurations ---
  const roleConfigs = {
    "Warehouse Manager": `
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header">
          <span class="metric-title">Critical Inventory Alerts</span>
          <span class="status-badge danger">3 Action Required</span>
        </div>
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Category</th><th>Current Stock</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Paracetamol 500mg</td><td>Pain Relief</td><td style="color:#ff5f56; font-weight:bold;">120 Units (Low)</td><td><button class="btn-yellow" style="padding: 5px 10px; font-size: 0.8rem;">Reorder</button></td></tr>
            <tr><td>Amoxicillin 500mg</td><td>Antibiotics</td><td style="color:#ff5f56; font-weight:bold;">50 Units (Critical)</td><td><button class="btn-yellow" style="padding: 5px 10px; font-size: 0.8rem;">Reorder</button></td></tr>
            <tr><td>Insulin Glargine</td><td>Chronic Care</td><td style="color:#ffbd2e; font-weight:bold;">400 Units (Warn)</td><td><button class="btn-yellow" style="padding: 5px 10px; font-size: 0.8rem;">Monitor</button></td></tr>
          </tbody>
        </table>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Active SKUs</span><span class="metric-icon">📦</span></div>
        <div class="metric-val">14,290</div>
        <div class="metric-trend positive">↑ 2.4% from last week</div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Warehouse Capacity</span><span class="metric-icon">🏢</span></div>
        <div class="metric-val">82%</div>
        <div class="progress-container"><div class="progress-bar" style="width: 82%; background: var(--yellow-accent);"></div></div>
      </div>
    `,
    "Quality Assurance": `
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Compliance Score</span><span class="metric-icon">🛡️</span></div>
        <div class="metric-val" style="color: #27c93f;">99.8%</div>
        <div class="metric-trend positive">Passes all FDA protocols</div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Pending Spectrometry</span><span class="metric-icon">🔬</span></div>
        <div class="metric-val" style="color: #ffbd2e;">12 Batches</div>
        <button class="btn-primary" style="margin-top: 15px; width: 100%;">Authorize Scan</button>
      </div>
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Active Quarantine Zone</span><span class="status-badge warning">Restricted Access</span></div>
        <table class="data-table">
          <thead><tr><th>Batch ID</th><th>Product</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>#8821-X</td><td>Ceftriaxone Inj</td><td>Temperature Fluctuation</td><td><span class="status-badge danger">Destroying</span></td></tr>
            <tr><td>#9910-B</td><td>Ibuprofen 400mg</td><td>Packaging Defect</td><td><span class="status-badge warning">Reviewing</span></td></tr>
          </tbody>
        </table>
      </div>
    `,
    "Cold Chain Logistics": `
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Global Fleet Sensors (Live)</span><span class="status-badge success">All Systems Nominal</span></div>
        <table class="data-table">
          <thead><tr><th>Unit ID</th><th>Cargo Type</th><th>Target Temp</th><th>Current Temp</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>TRK-092</td><td>Vaccines</td><td>2.0°C - 8.0°C</td><td style="color:#00e5ff; font-family:monospace; font-weight:bold;">3.4°C</td><td><span class="status-badge success">Stable</span></td></tr>
            <tr><td>TRK-114</td><td>Insulin</td><td>2.0°C - 8.0°C</td><td style="color:#00e5ff; font-family:monospace; font-weight:bold;">4.1°C</td><td><span class="status-badge success">Stable</span></td></tr>
            <tr><td>WH-SEC-B</td><td>Biologicals</td><td>-20.0°C</td><td style="color:#ffbd2e; font-family:monospace; font-weight:bold;">-18.2°C</td><td><span class="status-badge warning">Adjusting</span></td></tr>
          </tbody>
        </table>
        <div class="system-scan-bar" style="position:absolute; top:0; bottom:0; width: 4px; background: rgba(0,229,255,0.4); box-shadow: 0 0 10px rgba(0,229,255,0.8); z-index: 10;"></div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Avg Network Variance</span><span class="metric-icon">❄️</span></div>
        <div class="metric-val" style="color: #00e5ff;">±0.4°C</div>
        <p style="color: var(--text-muted); font-size:0.85rem; margin-top:5px;">Excellent stability rating.</p>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Active Cooling Units</span><span class="metric-icon">🔋</span></div>
        <div class="metric-val">124 / 124</div>
        <div class="progress-container"><div class="progress-bar" style="width: 100%; background: #00e5ff;"></div></div>
      </div>
    `,
    "Field Sales Agent": `
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Regional Pipeline (Q3)</span><span class="status-badge info">Updated 2m ago</span></div>
        <div style="display:flex; height: 120px; align-items:flex-end; gap: 10px; margin-top: 20px; border-bottom: 2px solid var(--glass-border); padding-bottom: 10px;">
          <div style="flex:1; background: var(--blue-primary); height: 40%; border-radius: 4px 4px 0 0;" title="Week 1"></div>
          <div style="flex:1; background: var(--blue-primary); height: 60%; border-radius: 4px 4px 0 0;" title="Week 2"></div>
          <div style="flex:1; background: var(--blue-primary); height: 30%; border-radius: 4px 4px 0 0;" title="Week 3"></div>
          <div style="flex:1; background: var(--yellow-accent); height: 90%; border-radius: 4px 4px 0 0; box-shadow: 0 0 15px var(--yellow-glow);" title="Current Week"></div>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Monthly Quota</span><span class="metric-icon">💰</span></div>
        <div class="metric-val">₦18.4M</div>
        <div class="progress-container"><div class="progress-bar" style="width: 85%; background: var(--yellow-accent);"></div></div>
        <div style="text-align:right; font-size: 0.8rem; margin-top: 5px; color: var(--text-muted);">85% Attained</div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Pending Contracts</span><span class="metric-icon">📄</span></div>
        <div class="metric-val">4</div>
        <button class="btn-primary" style="margin-top: 15px; width: 100%;">Review Documents</button>
      </div>
    `,
    "Dispatch Unit": `
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Live Dispatch Queue</span><span class="status-badge warning">High Volume</span></div>
        <table class="data-table">
          <thead><tr><th>Order ID</th><th>Destination</th><th>Priority</th><th>Status</th><th>Driver</th></tr></thead>
          <tbody>
            <tr><td>#ORD-9921</td><td>General Hospital Alpha</td><td><span class="status-badge danger">CRITICAL</span></td><td>Loading</td><td>Pending</td></tr>
            <tr><td>#ORD-9922</td><td>City Pharmacy</td><td><span class="status-badge info">Standard</span></td><td>In Transit</td><td>Unit 14</td></tr>
            <tr><td>#ORD-9923</td><td>Mainland Clinic</td><td><span class="status-badge warning">Express</span></td><td>Awaiting Packaging</td><td>--</td></tr>
          </tbody>
        </table>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Orders Dispatched Today</span><span class="metric-icon">🚚</span></div>
        <div class="metric-val">142</div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Avg Fulfillment Time</span><span class="metric-icon">⏱️</span></div>
        <div class="metric-val">22m 14s</div>
        <div class="metric-trend positive">↓ 2m faster than avg</div>
      </div>
    `,
    Procurement: `
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Active Supplier POs</span><span class="metric-icon">📑</span></div>
        <div class="metric-val">12</div>
        <div class="metric-trend neutral">Waiting on 3 shipments</div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Capital Expenditure (Q3)</span><span class="metric-icon">💵</span></div>
        <div class="metric-val">₦450.2M</div>
        <div class="progress-container"><div class="progress-bar" style="width: 60%; background: var(--blue-primary);"></div></div>
      </div>
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Global Pharma Index</span><span class="status-badge info">API Connected</span></div>
        <p style="color: var(--text-muted); margin-bottom: 15px;">Live pricing fluctuations for bulk raw materials.</p>
        <div style="font-family: monospace; display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.3); border-left: 2px solid #27c93f; margin-bottom: 5px;"><span>Amoxicillin APIs</span><span style="color:#27c93f;">$14.20 / kg (↓ 1.2%)</span></div>
        <div style="font-family: monospace; display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.3); border-left: 2px solid #ff5f56; margin-bottom: 5px;"><span>Ibuprofen APIs</span><span style="color:#ff5f56;">$8.90 / kg (↑ 4.1%)</span></div>
      </div>
    `,
    "Billing & Accounts": `
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Outstanding Receivables</span><span class="status-badge danger">₦12.4M Overdue</span></div>
        <table class="data-table">
          <thead><tr><th>Client</th><th>Invoice</th><th>Amount</th><th>Days Overdue</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Westside Clinic</td><td>#INV-001</td><td>₦4.2M</td><td style="color:#ff5f56;">14 Days</td><td><button class="btn-yellow" style="padding: 5px; font-size: 0.8rem;">Send Reminder</button></td></tr>
            <tr><td>Prime Pharmacy</td><td>#INV-002</td><td>₦8.2M</td><td style="color:#ffbd2e;">2 Days</td><td><button class="btn-yellow" style="padding: 5px; font-size: 0.8rem;">Send Reminder</button></td></tr>
          </tbody>
        </table>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Today's Revenue</span><span class="metric-icon">💳</span></div>
        <div class="metric-val" style="color: var(--yellow-accent);">₦2.1M</div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Cleared Funds</span><span class="metric-icon">🏦</span></div>
        <div class="metric-val" style="color: #27c93f;">₦145.8M</div>
      </div>
    `,
    Pharmacovigilance: `
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Adverse Event Reports</span><span class="metric-icon">⚠️</span></div>
        <div class="metric-val" style="color: #ff5f56;">2</div>
        <button class="btn-primary" style="margin-top: 15px; width:100%; background:#ff5f56; color:#fff;">Investigate</button>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Global Recalls Tracking</span><span class="metric-icon">🌐</span></div>
        <div class="metric-val">0</div>
        <div class="metric-trend positive">No IYKMAVIAN distributed SKUs affected.</div>
      </div>
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Drug Origin Tracing</span><span class="status-badge info">Blockchain Synced</span></div>
        <p style="color: var(--text-muted); margin-bottom: 15px;">Enter SKU to verify manufacturer cryptographic signature.</p>
        <div style="display: flex; gap: 10px;">
          <input type="text" placeholder="Enter Serial/Batch ID..." style="flex:1; padding: 10px; background: var(--bg-panel); border: 1px solid var(--glass-border); color: #fff;">
          <button class="btn-primary" style="padding: 10px 20px;">Trace</button>
        </div>
      </div>
    `,
    "Fleet Captain": `
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Live Route Map (Topographic GPS)</span><span class="status-badge success">Tracking Active</span></div>
        <div style="height: 350px; background: rgba(0,68,255,0.05); border: 1px solid var(--blue-primary); border-radius: 8px; margin-top: 15px; display:flex; flex-direction:column; align-items:center; justify-content:center; color: var(--blue-light);">
          <div style="font-size: 3rem; margin-bottom: 10px;">🗺️</div>
          [Encrypted Geospatial View Active]
          <div style="display:flex; gap: 20px; margin-top: 20px;">
            <span style="color:#0f0;">● 12 Trucks Moving</span>
            <span style="color:#ffbd2e;">● 2 Trucks Idling</span>
          </div>
        </div>
        <div class="system-scan-bar" style="position:absolute; top:0; bottom:0; width: 4px; background: rgba(0,229,255,0.3); box-shadow: 0 0 15px rgba(0,229,255,0.8); z-index: 10;"></div>
      </div>
    `,
    "Compliance Officer": `
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">NAFDAC / FDA Audits</span><span class="metric-icon">📋</span></div>
        <div class="metric-val">100%</div>
        <div class="metric-trend positive">All licenses up to date.</div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Staff Training Matrix</span><span class="metric-icon">🧑‍💻</span></div>
        <div class="metric-val">94%</div>
        <div class="progress-container"><div class="progress-bar" style="width: 94%; background: #27c93f;"></div></div>
      </div>
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header"><span class="metric-title">Regulatory Document Portal</span><span class="status-badge info">Secure Vault</span></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
          <button class="btn-primary" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--glass-border);">View Operating Licenses</button>
          <button class="btn-primary" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--glass-border);">Import/Export Permits</button>
          <button class="btn-primary" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--glass-border);">Controlled Substance Logs</button>
          <button class="btn-primary" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--glass-border);">Facility Insurance</button>
        </div>
      </div>
    `,
    "Pharmacist (Demo)": `
      <div class="metric-card" style="grid-column: 1/-1;">
        <div class="metric-header">
          <span class="metric-title">Clinical Prescription Queue</span>
          <span class="status-badge warning">5 Awaiting Scan</span>
        </div>
        <table class="data-table">
          <thead><tr><th>Patient/Clinic</th><th>Document</th><th>AI Verification</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>Pharmacy Plus</td><td>rx_8821.pdf</td><td><span class="status-badge success">98% Match</span></td><td><button class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem;">Verify</button></td></tr>
            <tr><td>Medplus Clinic</td><td>rx_9901.jpg</td><td><span class="status-badge warning">Low Res</span></td><td><button class="btn-yellow" style="padding: 5px 10px; font-size: 0.8rem;">Manual Review</button></td></tr>
            <tr><td>General Hospital</td><td>rx_7720.pdf</td><td><span class="status-badge danger">Expired?</span></td><td><button class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem; background: #ff5f56;">Reject</button></td></tr>
          </tbody>
        </table>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Orders Authorized Today</span><span class="metric-icon">✅</span></div>
        <div class="metric-val">28</div>
      </div>
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">Controlled Substances Audit</span><span class="metric-icon">📑</span></div>
        <div class="metric-val" style="color: #27c93f;">Compliant</div>
      </div>
    `,
  };

  // Default fallback if role isn't matched
  const defaultWidgets = `
      <div class="metric-card">
        <div class="metric-header"><span class="metric-title">System Status</span></div>
        <div class="metric-val" style="color: #0f0;">Optimal</div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 10px;">Global systems online.</p>
      </div>
  `;

  // Inject HTML
  widgetsContainer.innerHTML = roleConfigs[role] || defaultWidgets;
});
