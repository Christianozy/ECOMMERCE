/**
 * IYKMAVIAN – Superintendent Dashboard API Integration
 * Loads live KPIs, orders, and consultations from the backend.
 * Included AFTER api.js on superintendent-dashboard.html
 */

document.addEventListener("DOMContentLoaded", async () => {
  // ── Auth guard ─────────────────────────────────────────────────
  if (!API.isLoggedIn()) {
    window.location.href = "superintendent-login.html";
    return;
  }

  const user = API.getUser();
  if (user) {
    const nameEl = document.getElementById("suptName");
    if (nameEl) nameEl.textContent = user.name || "Superintendent";
    const roleEl = document.getElementById("suptRole");
    if (roleEl) roleEl.textContent = user.role || "Superintendent";
  }

  // ── Helpers ────────────────────────────────────────────────────
  function fmt(n) {
    if (n >= 1_000_000) return "₦" + (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return "₦" + (n / 1_000).toFixed(1) + "K";
    return "₦" + n.toLocaleString();
  }

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function showStatus(msg, type = "info") {
    const bar = document.getElementById("apiStatusBar");
    if (!bar) return;
    bar.textContent = msg;
    bar.className = `api-status-bar ${type}`;
    bar.style.display = "block";
    if (type === "success")
      setTimeout(() => (bar.style.display = "none"), 3000);
  }

  showStatus("🔄 Loading live data…");

  // ── 1. KPIs ────────────────────────────────────────────────────
  const kpiRes = await API.get("/dashboard/kpis");
  if (kpiRes.success) {
    const k = kpiRes.data;
    setEl("kpiTotalRevenue", fmt(k.totalRevenue || 0));
    setEl("kpiTotalOrders", k.totalOrders ?? "—");
    setEl("kpiPendingOrders", k.pendingOrders ?? "—");
    setEl("kpiTotalProducts", k.totalProducts ?? "—");
    setEl("kpiLowStock", k.lowStockCount ?? "—");
    setEl("kpiConsultations", k.pendingConsultations ?? "—");
    setEl("kpiStaffCount", k.staffCount ?? "—");
    setEl("kpiNewsletterSubs", k.newsletterSubs ?? "—");
    showStatus("✅ Live data loaded", "success");
  } else {
    showStatus("⚠️ Could not load KPIs: " + kpiRes.error, "error");
  }

  // ── 2. Recent Orders ───────────────────────────────────────────
  const ordRes = await API.get("/orders?limit=8&sort=created_at&order=desc");
  if (ordRes.success) {
    const tbody = document.getElementById("recentOrdersBody");
    if (tbody) {
      const orders = ordRes.data.orders || ordRes.data.data || [];
      tbody.innerHTML =
        orders.length === 0
          ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No orders yet.</td></tr>'
          : orders
              .map(
                (o) => `
            <tr>
              <td><code style="font-size:0.8rem">#${o.id.slice(0, 8)}</code></td>
              <td>${o.customer_name}</td>
              <td>${fmt(o.total)}</td>
              <td><span class="status-badge ${statusClass(o.status)}">${o.status}</span></td>
              <td><span class="status-badge ${statusClass(o.payment_status)}">${o.payment_status}</span></td>
            </tr>`,
              )
              .join("");
    }
  }

  // ── 3. Pending Consultations ────────────────────────────────────
  const conRes = await API.get("/consultations?status=pending&limit=5");
  if (conRes.success) {
    const tbody = document.getElementById("pendingConsultBody");
    if (tbody) {
      const cons = conRes.data.consultations || conRes.data.data || [];
      tbody.innerHTML =
        cons.length === 0
          ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No pending consultations.</td></tr>'
          : cons
              .map(
                (c) => `
            <tr>
              <td>${c.patient_name}</td>
              <td>${c.gender || "—"} / ${c.age || "—"}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.symptoms}</td>
              <td><span class="status-badge warning">${c.status}</span></td>
            </tr>`,
              )
              .join("");
    }
  }

  // ── Logout button ──────────────────────────────────────────────
  const logoutBtn = document.getElementById("suptLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await API.logout();
      window.location.href = "superintendent-login.html";
    });
  }

  function statusClass(s) {
    if (!s) return "";
    if (["delivered", "paid", "verified", "active", "completed"].includes(s))
      return "success";
    if (["pending", "pending_verify", "in_review"].includes(s))
      return "warning";
    if (["cancelled", "failed", "rejected", "suspended"].includes(s))
      return "danger";
    return "info";
  }
});
