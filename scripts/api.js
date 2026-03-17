/**
 * IYKMAVIAN – Shared API Client
 * ══════════════════════════════
 * Base: http://localhost:5000
 *
 * Usage:
 *   const { data, error } = await API.get('/products');
 *   const { data, error } = await API.post('/auth/login', { email, password });
 *
 * Token management:
 *   - Reads  JWT from localStorage('iyk_token')
 *   - Auto-refreshes on 401 using localStorage('iyk_refresh')
 *   - Redirects to login page if refresh also fails
 */

const API = (() => {
  // Determine if running locally or live
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:";

  // Replace YOUR_LIVE_URL with your actual backend URL after deploying (e.g., https://api-iykmavian.onrender.com)
  const BASE = isLocal
    ? "http://localhost:5000/api"
    : "https://iykmavian-api.onrender.com/api";

  const LOGIN_PAGE = "superintendent-login.html";

  // ── Token helpers ──────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem("iyk_token");
  }
  function getRefresh() {
    return localStorage.getItem("iyk_refresh");
  }
  function setToken(t) {
    localStorage.setItem("iyk_token", t);
  }
  function setRefresh(r) {
    localStorage.setItem("iyk_refresh", r);
  }
  function clearAuth() {
    localStorage.removeItem("iyk_token");
    localStorage.removeItem("iyk_refresh");
    localStorage.removeItem("iyk_user");
  }

  function saveUser(user) {
    localStorage.setItem("iyk_user", JSON.stringify(user));
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("iyk_user"));
    } catch {
      return null;
    }
  }

  // ── Core fetch wrapper ─────────────────────────────────────────
  async function request(method, path, body = null, retried = false) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${BASE}${path}`, opts);
    } catch (err) {
      return {
        success: false,
        error: "Network error — is the server running?",
        data: null,
      };
    }

    // Token expired → try refresh once
    if (res.status === 401 && !retried) {
      const refreshed = await tryRefresh();
      if (refreshed) return request(method, path, body, true);
      // Refresh failed — redirect to login
      clearAuth();
      const current = window.location.pathname;
      if (!current.includes("login") && !current.includes("index")) {
        window.location.href = LOGIN_PAGE;
      }
      return {
        success: false,
        error: "Session expired. Please log in again.",
        data: null,
      };
    }

    let json;
    try {
      json = await res.json();
    } catch {
      json = { success: false, message: "Invalid server response." };
    }

    if (!res.ok) {
      return {
        success: false,
        error: json.message || `Error ${res.status}`,
        data: null,
      };
    }

    return { success: true, data: json, error: null };
  }

  // ── Token refresh ──────────────────────────────────────────────
  async function tryRefresh() {
    const refreshToken = getRefresh();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json.token) {
        setToken(json.token);
        if (json.refreshToken) setRefresh(json.refreshToken);
        return true;
      }
    } catch {
      /* silent */
    }
    return false;
  }

  // ── Public methods ─────────────────────────────────────────────
  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    patch: (path, body) => request("PATCH", path, body),
    delete: (path) => request("DELETE", path),

    // Auth helpers
    getToken,
    getRefresh,
    getUser,
    saveUser,
    setToken,
    setRefresh,
    clearAuth,
    isLoggedIn: () => !!getToken(),

    // Convenience: login
    async login(email, password) {
      const result = await request("POST", "/auth/login", { email, password });
      if (result.success && result.data.token) {
        setToken(result.data.token);
        setRefresh(result.data.refreshToken);
        saveUser(result.data.user);
      }
      return result;
    },

    // Convenience: logout
    async logout() {
      const refreshToken = getRefresh();
      if (refreshToken) {
        await request("POST", "/auth/logout", { refreshToken });
      }
      clearAuth();
    },

    // Convenience: check server health
    async health() {
      return request("GET", "/health");
    },
  };
})();

// Make available globally (or as module if bundled)
if (typeof module !== "undefined") module.exports = API;
