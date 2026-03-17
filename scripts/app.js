/**
 * IYKMAVIAN Pharmaceuticals Application Core Logic
 * Handles dynamic rendering, state, animations and interactivity.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- Scroll Header Change ---
  const header = document.getElementById("main-header");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // ── MOBILE HAMBURGER NAV ─────────────────────────────────────────
  // Drawer is body-level — never touches the desktop <ul>.
  // Desktop header layout is 100% unaffected.
  (function setupMobileNav() {
    const navContainer = document.querySelector(".nav-container");
    const navLinksUL = document.querySelector(".nav-links");
    if (!navContainer || !navLinksUL || navContainer.dataset.mobileInit) return;
    navContainer.dataset.mobileInit = "1";

    const overlay = document.createElement("div");
    overlay.className = "mobile-nav-overlay";
    document.body.appendChild(overlay);

    const burger = document.createElement("button");
    burger.className = "hamburger-btn";
    burger.setAttribute("aria-label", "Open navigation menu");
    burger.innerHTML = "<span></span><span></span><span></span>";
    navContainer.appendChild(burger);

    // Build drawer at body level
    const drawer = document.createElement("nav");
    drawer.className = "mobile-nav-drawer";
    drawer.setAttribute("aria-hidden", "true");

    // Header
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
    const closeBtnEl = document.createElement("button");
    closeBtnEl.className = "mobile-drawer-close";
    closeBtnEl.setAttribute("aria-label", "Close menu");
    closeBtnEl.innerHTML = "&#10005;";
    dHead.appendChild(closeBtnEl);
    drawer.appendChild(dHead);

    // Nav list cloned from desktop
    const dNav = document.createElement("ul");
    dNav.className = "mobile-drawer-nav";
    navLinksUL.querySelectorAll("li").forEach((li) => {
      const item = document.createElement("li");
      item.className = "mobile-nav-item";
      const ddTrigger = li.querySelector(".dropdown-trigger");
      if (ddTrigger) {
        const row = document.createElement("div");
        row.className = "mobile-dd-trigger-row";
        const lbl = document.createElement("span");
        lbl.className = "mobile-nav-label";
        lbl.textContent = ddTrigger.textContent.replace("▼", "").trim();
        const arw = document.createElement("span");
        arw.className = "mobile-dd-arrow";
        arw.innerHTML = "&#8250;";
        row.appendChild(lbl);
        row.appendChild(arw);
        item.appendChild(row);
        const sub = document.createElement("ul");
        sub.className = "mobile-dd-sub";
        li.querySelectorAll(".dropdown-item").forEach((di) => {
          const sli = document.createElement("li");
          const sa = document.createElement("a");
          sa.href = di.href;
          const ic = di.querySelector(".dropdown-item-icon");
          if (ic) {
            const s = document.createElement("span");
            s.className = "mobile-sub-icon";
            s.textContent = ic.textContent;
            sa.appendChild(s);
          }
          const t = document.createElement("span");
          const lbEl = di.querySelector(".dropdown-item-label");
          t.textContent = lbEl ? lbEl.textContent : di.textContent.trim();
          sa.appendChild(t);
          sli.appendChild(sa);
          sub.appendChild(sli);
        });
        item.appendChild(sub);
        row.addEventListener("click", () => {
          const was = item.classList.contains("mobile-dd-open");
          dNav
            .querySelectorAll(".mobile-nav-item.mobile-dd-open")
            .forEach((el) => el.classList.remove("mobile-dd-open"));
          if (!was) item.classList.add("mobile-dd-open");
        });
      } else {
        const a = li.querySelector("a");
        if (!a) return;
        const na = document.createElement("a");
        na.href = a.href;
        na.className = "mobile-nav-link";
        na.textContent = a.textContent.trim();
        if (a.classList.contains("active")) na.classList.add("active");
        item.appendChild(na);
      }
      dNav.appendChild(item);
    });
    drawer.appendChild(dNav);

    // Drawer footer — Catalogue CTA + Staff + Superintendent portals
    const dFoot = document.createElement("div");
    dFoot.className = "mobile-drawer-footer";

    // Browse Catalogue button
    const ctaEl = document.querySelector(".nav-actions a.btn-primary");
    if (ctaEl) {
      const cta = document.createElement("a");
      cta.href = ctaEl.href;
      cta.className = "mobile-drawer-cta";
      cta.textContent = "Browse Catalogue 📦";
      dFoot.appendChild(cta);
    }

    // Staff & Superintendent portal access buttons
    const portalRow = document.createElement("div");
    portalRow.className = "mobile-drawer-portal-row";

    const staffLink = document.createElement("a");
    staffLink.href = "staff-portal.html";
    staffLink.className = "mobile-drawer-portal-btn";
    staffLink.innerHTML = "<span>👤</span> Staff Portal";

    const suptLink = document.createElement("a");
    suptLink.href = "superintendent-login.html";
    suptLink.className = "mobile-drawer-portal-btn mobile-drawer-supt-btn";
    suptLink.innerHTML = "<span>🔐</span> Admin Login";

    portalRow.appendChild(staffLink);
    portalRow.appendChild(suptLink);
    dFoot.appendChild(portalRow);

    drawer.appendChild(dFoot);
    document.body.appendChild(drawer);

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
    closeBtnEl.addEventListener("click", closeNav);
    overlay.addEventListener("click", closeNav);
    drawer
      .querySelectorAll("a")
      .forEach((a) => a.addEventListener("click", closeNav));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) closeNav();
    });
  })();
  // ─────────────────────────────────────────────────────────────────

  // --- Theme Toggle Logic ---
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    const currentTheme = localStorage.getItem("iykmavian_theme");
    if (currentTheme) {
      document.documentElement.setAttribute("data-theme", currentTheme);
      themeToggleBtn.textContent = currentTheme === "light" ? "🌙" : "☀️";
    }

    themeToggleBtn.addEventListener("click", () => {
      let theme = document.documentElement.getAttribute("data-theme");
      if (theme === "light") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("iykmavian_theme", "dark");
        themeToggleBtn.textContent = "☀️";
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("iykmavian_theme", "light");
        themeToggleBtn.textContent = "🌙";
      }
    });
  }

  // --- Entrance Animations (Intersection Observer) ---
  const animateElements = document.querySelectorAll(".entrance-animation");
  const entranceObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = 1;
          entry.target.style.transform = "translateY(0) scale(1)";
          // Unobserve after animating
          entranceObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  // Init CSS styles for elements being observed
  animateElements.forEach((el) => {
    el.style.opacity = 0;
    el.style.transform = "translateY(30px) scale(0.95)";
    el.style.transition =
      "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
    entranceObserver.observe(el);
  });

  // --- Magnetic Button Effect ---
  const magneticBtns = document.querySelectorAll(
    ".btn-primary, .btn-yellow, .nav-item, .dash-nav-item",
  );
  magneticBtns.forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.05)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });

  // --- Elite Cursor Glow ---
  const atmos = document.querySelector(".atmospheric-bg");
  if (atmos) {
    const cursorGlow = document.createElement("div");
    cursorGlow.className = "cursor-glow";
    atmos.appendChild(cursorGlow);

    window.addEventListener("mousemove", (e) => {
      cursorGlow.style.left = e.clientX + "px";
      cursorGlow.style.top = e.clientY + "px";
    });
  }

  // --- Lazy Image Fade-In ---
  document.querySelectorAll("img[loading='lazy']").forEach((img) => {
    img.addEventListener("load", () => img.classList.add("loaded"));
    if (img.complete) img.classList.add("loaded");
  });

  // --- Section Slide-Up Observer ---
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("section-animate");
          sectionObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  document
    .querySelectorAll(".section-header, .cat-hero, .pg-hero")
    .forEach((el) => sectionObserver.observe(el));

  // --- Cart Drawer Logic ---
  const cartToggleBtn = document.getElementById("cartToggleBtn");
  const cartOverlay = document.getElementById("cartOverlay");
  const closeCartBtn = document.getElementById("closeCartBtn");

  const toggleCart = () => cartOverlay.classList.toggle("open");
  cartToggleBtn.addEventListener("click", toggleCart);
  closeCartBtn.addEventListener("click", toggleCart);

  // --- Mock Telepharmacy Widget ---
  const teleToggleBtn = document.getElementById("teleToggleBtn");
  const telePanel = document.getElementById("telePanel");
  const closeTeleBtn = document.getElementById("closeTeleBtn");

  const toggleTelePanel = () => telePanel.classList.toggle("active");
  teleToggleBtn.addEventListener("click", toggleTelePanel);
  closeTeleBtn.addEventListener("click", () =>
    telePanel.classList.remove("active"),
  );

  // --- Mega-Wholesale Product Data (Wholesale Units, MOQs, Hub Stock) ---
  const products = [
    {
      id: 1,
      name: "Amoxicillin Caps 500mg",
      category: "Antibiotics",
      price: 145000.0,
      unit: "Carton (50 Packs)",
      moq: 10,
      hubStock: { LAG: 450, ABJ: 120, PH: 85 },
      image:
        "https://images.unsplash.com/photo-1471864190281-ad5fe9bb0724?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: 2,
      name: "Azithromycin 250mg Case",
      category: "Antibiotics",
      price: 210000.0,
      unit: "Case (24 Packs)",
      moq: 5,
      hubStock: { LAG: 200, ABJ: 45, PH: 30 },
      image:
        "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: 21,
      name: "Amlodipine 5mg Bulk Master",
      category: "Chronic Care",
      price: 85000.0,
      unit: "Master Carton (100 Packs)",
      moq: 15,
      hubStock: { LAG: 1200, ABJ: 400, PH: 200 },
      image:
        "https://images.unsplash.com/photo-1584362193554-15f5a894562c?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: 30,
      name: "Insulin Glargine Cold-Chain",
      category: "Chronic Care",
      price: 1250000.0,
      unit: "Half Pallet (200 Units)",
      moq: 1,
      hubStock: { LAG: 15, ABJ: 4, PH: 2 },
      image:
        "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: 31,
      name: "Surgical Gloves Sterile Bulk",
      category: "Surgicals",
      price: 245000.0,
      unit: "Bulk Case (1000 Pairs)",
      moq: 10,
      hubStock: { LAG: 500, ABJ: 150, PH: 100 },
      image:
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: 40,
      name: "Institutional First Aid Hub",
      category: "Surgicals",
      price: 850000.0,
      unit: "Regional Kit (50 Units)",
      moq: 1,
      hubStock: { LAG: 25, ABJ: 10, PH: 5 },
      image:
        "https://images.unsplash.com/photo-1584908066896-dc6838a0bc9e?auto=format&fit=crop&w=400&q=80",
    },
  ];

  const productsGrid = document.querySelector(".products-grid");
  let currentFilter = "all";
  let currentSearch = "";
  let currentSort = "default";

  // Exposed globally so inline oninput/onchange can reach it
  window.filterAndSearch = function () {
    const searchEl = document.getElementById("catSearch");
    const sortEl = document.getElementById("catSort");
    if (searchEl) currentSearch = searchEl.value.toLowerCase();
    if (sortEl) currentSort = sortEl.value;
    renderProducts();
  };

  function renderProducts() {
    if (!productsGrid) return;
    productsGrid.innerHTML = "";

    let list =
      currentFilter === "all"
        ? [...products]
        : products.filter((p) => p.category === currentFilter);

    if (currentSearch) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(currentSearch) ||
          p.category.toLowerCase().includes(currentSearch),
      );
    }

    if (currentSort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (currentSort === "price-desc")
      list.sort((a, b) => b.price - a.price);
    else if (currentSort === "name-asc")
      list.sort((a, b) => a.name.localeCompare(b.name));

    const countEl = document.getElementById("productCount");
    if (countEl)
      countEl.textContent = `${list.length} product${list.length !== 1 ? "s" : ""} found`;

    if (list.length === 0) {
      productsGrid.innerHTML =
        '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:40px;">No products match your search. <a href="telepharmacy.html" style="color:var(--blue-light);">Ask a pharmacist →</a></p>';
      return;
    }

    list.forEach((product, index) => {
      const delay = (index % 12) * 80;
      const card = document.createElement("div");
      card.className = "product-card entrance-animation";
      card.style.animationDelay = `${delay}ms`;

      const lagosTag =
        product.hubStock && product.hubStock.LAG > 50
          ? '<span style="color:#27c93f;">● LAG</span>'
          : '<span style="color:#ff5f56;">○ LAG</span>';
      const abujaTag =
        product.hubStock && product.hubStock.ABJ > 10
          ? '<span style="color:#27c93f;">● ABJ</span>'
          : '<span style="color:#ff5f56;">○ ABJ</span>';

      card.innerHTML = `
        <div class="product-img-box">
          <div class="exclusive-badge">MOQ: ${product.moq || "Contact"} ${product.unit ? product.unit.split(" ")[0] : "Units"}</div>
          <img src="${product.image}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-cat">${product.category}</div>
        <h3 class="product-name">${product.name}</h3>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">
            Hub Availability: ${lagosTag} ${abujaTag}
        </div>
        <div class="product-info-grid" style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:10px;">
          <div class="product-price-box">
            <span style="font-size:0.72rem; color:var(--text-muted); display:block;">Wholesale per ${product.unit ? product.unit.split(" ")[0] : "Unit"}</span>
            <span class="product-price">₦${product.price.toLocaleString()}</span>
          </div>
          <button class="add-to-cart-btn" onclick="addToCart(${product.id})" style="width:auto; padding:0 15px; height:40px; font-size:0.85rem; border-radius:8px;">Add MOQ</button>
        </div>
      `;
      productsGrid.appendChild(card);
      entranceObserver.observe(card);
    });
  }

  // --- Filter Listeners ---
  const filterPills = document.querySelectorAll(".filter-pill");
  if (productsGrid && filterPills.length > 0) {
    filterPills.forEach((pill) => {
      pill.addEventListener("click", (e) => {
        // Remove active class from all
        filterPills.forEach((p) => p.classList.remove("active"));
        // Add active to clicked
        e.target.classList.add("active");

        currentFilter = e.target.getAttribute("data-filter");
        renderProducts();
      });
    });
  }

  // --- Cart State Management ---
  let cart = JSON.parse(localStorage.getItem("iykmavian_cart")) || [];
  const cartBadgeCount = document.getElementById("cartBadgeCount");
  const cartItemsContainer = document.querySelector(".cart-items");
  const cartTotalSum = document.getElementById("cartTotalSum");

  function saveCart() {
    localStorage.setItem("iykmavian_cart", JSON.stringify(cart));
  }

  window.addToCart = function (productId) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existing = cart.find((item) => item.id === productId);
    if (existing) {
      existing.quantity += product.moq || 1;
    } else {
      cart.push({ ...product, quantity: product.moq || 1 });
    }

    updateCart();
    saveCart();
    if (cartToggleBtn) {
      cartToggleBtn.style.transform = "scale(1.3)";
      setTimeout(() => {
        cartToggleBtn.style.transform = "scale(1)";
      }, 200);
    }
  };

  window.removeFromCart = function (productId) {
    cart = cart.filter((item) => item.id !== productId);
    updateCart();
    saveCart();
  };

  function updateCart() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadgeCount) cartBadgeCount.textContent = totalItems;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML =
        '<p style="text-align:center; color: var(--text-muted); margin-top: 40px;">No items in requisition.</p>';
      if (cartTotalSum) cartTotalSum.textContent = "₦0.00";
      return;
    }

    cartItemsContainer.innerHTML = cart
      .map(
        (item) => `
        <div class="cart-item">
          <div style="flex-grow: 1;">
            <div style="font-size: 0.9rem; font-weight: 600;">${item.name}</div>
            <div style="font-size: 0.75rem; color:var(--text-muted);">${item.quantity} units</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top:5px;">
              <div style="color: var(--blue-light); font-weight: 700;">₦${((item.price * item.quantity) / (item.moq || 1)).toLocaleString()}</div>
              <button onclick="removeFromCart(${item.id})" style="background: none; border: none; color: #ff5f56; cursor: pointer;">&times;</button>
            </div>
          </div>
        </div>
    `,
      )
      .join("");

    if (cartTotalSum)
      cartTotalSum.textContent = `₦${cart.reduce((a, b) => a + (b.price * b.quantity) / (b.moq || 1), 0).toLocaleString()}`;
  }

  window.gotoDemo = function (role) {
    if (role === "customer") window.location.href = "b2b-portal.html";
    if (role === "staff") window.location.href = "staff-portal.html";
    if (role === "superintendent")
      window.location.href = "superintendent-login.html";
  };
});
