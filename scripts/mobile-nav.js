/**
 * IYKMAVIAN – Universal Mobile Navigation (v3)
 * ─────────────────────────────────────────────
 * 1. Public pages  → hamburger + slide-in drawer (appended to <body>, never
 *    touches the desktop <ul>, so desktop layout is 100% unaffected)
 * 2. Dashboard pages → sidebar toggle + slide-in panel
 *
 * Guards against double-init via data attributes.
 */
(function () {
  function initMobileNav() {
    // ══════════════════════════════════════════════════════════════
    //  1. PUBLIC PAGES — hamburger + slide-in nav drawer
    // ══════════════════════════════════════════════════════════════
    const navContainer = document.querySelector(".nav-container");
    const navLinksUL = document.querySelector(".nav-links"); // the actual <ul>

    if (navContainer && navLinksUL && !navContainer.dataset.mobileInit) {
      navContainer.dataset.mobileInit = "1";

      // ── dim backdrop ──────────────────────────────────────────
      const overlay = document.createElement("div");
      overlay.className = "mobile-nav-overlay";
      document.body.appendChild(overlay);

      // ── hamburger button (appended to navContainer, stays in header) ──
      const burger = document.createElement("button");
      burger.className = "hamburger-btn";
      burger.setAttribute("aria-label", "Open navigation menu");
      burger.innerHTML = "<span></span><span></span><span></span>";
      navContainer.appendChild(burger);

      // ── DRAWER — built as a separate element, NOT inside <ul> ──
      // This is the key fix: the drawer lives at body level, completely
      // independent from the desktop <ul> so desktop is untouched.
      const drawer = document.createElement("nav");
      drawer.className = "mobile-nav-drawer";
      drawer.setAttribute("aria-label", "Mobile navigation");
      drawer.setAttribute("aria-hidden", "true");

      // Drawer header strip
      const dHead = document.createElement("div");
      dHead.className = "mobile-drawer-head";

      const logoEl = document.querySelector(".brand-logo img");
      if (logoEl) {
        const logo = document.createElement("img");
        logo.src = logoEl.src;
        logo.alt = "IYKMAVIAN";
        logo.className = "mobile-drawer-logo";
        dHead.appendChild(logo);
      } else {
        const brand = document.createElement("span");
        brand.className = "mobile-drawer-brand";
        brand.textContent = "IYKMAVIAN";
        dHead.appendChild(brand);
      }

      const closeBtn = document.createElement("button");
      closeBtn.className = "mobile-drawer-close";
      closeBtn.setAttribute("aria-label", "Close navigation menu");
      closeBtn.innerHTML = "&#10005;";
      dHead.appendChild(closeBtn);
      drawer.appendChild(dHead);

      // Drawer nav list — clone the desktop <ul> links into our drawer
      const dNav = document.createElement("ul");
      dNav.className = "mobile-drawer-nav";

      // Walk the desktop nav items and rebuild them for the drawer
      navLinksUL.querySelectorAll("li").forEach((li) => {
        const clone = document.createElement("li");
        clone.className = "mobile-nav-item";

        // If it's a dropdown item
        const ddTrigger = li.querySelector(".dropdown-trigger");
        if (ddTrigger) {
          // Main trigger row
          const triggerRow = document.createElement("div");
          triggerRow.className = "mobile-dd-trigger-row";

          const label = document.createElement("span");
          label.className = "mobile-nav-label";
          // Strip the arrow character, keep just the text+emoji
          label.textContent = ddTrigger.textContent.replace("▼", "").trim();

          const arrow = document.createElement("span");
          arrow.className = "mobile-dd-arrow";
          arrow.innerHTML = "&#8250;"; // › chevron

          triggerRow.appendChild(label);
          triggerRow.appendChild(arrow);
          clone.appendChild(triggerRow);

          // Sub-menu
          const subMenu = document.createElement("ul");
          subMenu.className = "mobile-dd-sub";

          li.querySelectorAll(".dropdown-item").forEach((item) => {
            const subLi = document.createElement("li");
            const subA = document.createElement("a");
            subA.href = item.href;

            const icon = item.querySelector(".dropdown-item-icon");
            const labelEl = item.querySelector(".dropdown-item-label");

            if (icon) {
              const iconSpan = document.createElement("span");
              iconSpan.className = "mobile-sub-icon";
              iconSpan.textContent = icon.textContent;
              subA.appendChild(iconSpan);
            }
            const txt = document.createElement("span");
            txt.textContent = labelEl
              ? labelEl.textContent
              : item.textContent.trim();
            subA.appendChild(txt);

            subLi.appendChild(subA);
            subMenu.appendChild(subLi);
          });

          clone.appendChild(subMenu);

          // Toggle sub-menu on tap
          triggerRow.addEventListener("click", () => {
            const isOpen = clone.classList.contains("mobile-dd-open");
            dNav
              .querySelectorAll(".mobile-nav-item.mobile-dd-open")
              .forEach((el) => el.classList.remove("mobile-dd-open"));
            if (!isOpen) clone.classList.add("mobile-dd-open");
          });
        } else {
          // Plain link
          const a = li.querySelector("a");
          if (!a) return;
          const newA = document.createElement("a");
          newA.href = a.href;
          newA.className = "mobile-nav-link";
          newA.textContent = a.textContent.trim();
          if (a.classList.contains("active")) newA.classList.add("active");
          clone.appendChild(newA);
        }

        dNav.appendChild(clone);
      });

      drawer.appendChild(dNav);

      // Drawer footer — Catalogue CTA + Staff + Superintendent portals
      const dFoot = document.createElement("div");
      dFoot.className = "mobile-drawer-footer";
      const catalogueEl = document.querySelector(".nav-actions a.btn-primary");
      if (catalogueEl) {
        const ctaBtn = document.createElement("a");
        ctaBtn.href = catalogueEl.href;
        ctaBtn.className = "mobile-drawer-cta";
        ctaBtn.textContent = "Browse Catalogue 📦";
        dFoot.appendChild(ctaBtn);
      }

      // Staff & Superintendent portal buttons
      const portalRow = document.createElement("div");
      portalRow.className = "mobile-drawer-portal-row";

      const staffLnk = document.createElement("a");
      staffLnk.href = "staff-portal.html";
      staffLnk.className = "mobile-drawer-portal-btn";
      staffLnk.innerHTML = "<span>👤</span> Staff Portal";

      const suptLnk = document.createElement("a");
      suptLnk.href = "superintendent-login.html";
      suptLnk.className = "mobile-drawer-portal-btn mobile-drawer-supt-btn";
      suptLnk.innerHTML = "<span>🔐</span> Admin Login";

      portalRow.appendChild(staffLnk);
      portalRow.appendChild(suptLnk);
      dFoot.appendChild(portalRow);

      drawer.appendChild(dFoot);

      document.body.appendChild(drawer);

      // ── open / close ──────────────────────────────────────────
      const openNav = () => {
        drawer.classList.add("open");
        overlay.classList.add("open");
        burger.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
        document.body.classList.add("nav-open");
      };

      const closeNav = () => {
        drawer.classList.remove("open");
        overlay.classList.remove("open");
        burger.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
        document.body.classList.remove("nav-open");
      };

      burger.addEventListener("click", () =>
        drawer.classList.contains("open") ? closeNav() : openNav(),
      );
      closeBtn.addEventListener("click", closeNav);
      overlay.addEventListener("click", closeNav);
      drawer
        .querySelectorAll("a")
        .forEach((a) => a.addEventListener("click", closeNav));

      window.addEventListener("resize", () => {
        if (window.innerWidth > 768) closeNav();
      });

      // ── Desktop dropdown hover still works on the original <ul> ──
      // (unchanged — we never touched it)
    }

    // ══════════════════════════════════════════════════════════════
    //  2. DASHBOARD PAGES — sidebar toggle
    // ══════════════════════════════════════════════════════════════
    const dashSidebar = document.querySelector(".dash-sidebar, .tp-sidebar");
    const dashLayout = document.querySelector(
      ".dash-layout-advanced, .tp-layout",
    );

    if (dashSidebar && dashLayout && !dashLayout.dataset.mobileInit) {
      dashLayout.dataset.mobileInit = "1";

      const sideOverlay = document.createElement("div");
      sideOverlay.className = "dash-sidebar-overlay";
      document.body.appendChild(sideOverlay);

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "dash-sidebar-toggle";
      toggleBtn.setAttribute("aria-label", "Open sidebar menu");
      toggleBtn.innerHTML = "<span></span><span></span><span></span>";
      document.body.appendChild(toggleBtn);

      const openSidebar = () => {
        dashSidebar.classList.add("mobile-open");
        sideOverlay.style.display = "block";
        requestAnimationFrame(() => sideOverlay.classList.add("open"));
        toggleBtn.classList.add("open");
        document.body.classList.add("nav-open");
      };

      const closeSidebar = () => {
        dashSidebar.classList.remove("mobile-open");
        sideOverlay.classList.remove("open");
        setTimeout(() => {
          sideOverlay.style.display = "";
        }, 320);
        toggleBtn.classList.remove("open");
        document.body.classList.remove("nav-open");
      };

      toggleBtn.addEventListener("click", () =>
        dashSidebar.classList.contains("mobile-open")
          ? closeSidebar()
          : openSidebar(),
      );
      sideOverlay.addEventListener("click", closeSidebar);
      dashSidebar.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => {
          if (window.innerWidth <= 768) closeSidebar();
        }),
      );
      window.addEventListener("resize", () => {
        if (window.innerWidth > 768) closeSidebar();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileNav);
  } else {
    initMobileNav();
  }
})();
