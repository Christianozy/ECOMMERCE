# 🏥 IYKMAVIAN Local Demo Guide

Welcome to the **IYKMAVIAN Pharmaceutical Hub** demo environment. This setup allows you to test all features locally, including the Superintendent and Staff dashboards.

## 🚀 Quick Start

1. **Start the Demo**: Right-click `run-demo.ps1` in the root folder and select **"Run with PowerShell"**.
   - This will start the backend server on `http://localhost:5000`.
   - It will automatically open `index.html` in your default browser.

## 🔑 Demo Credentials

The database has been pre-seeded with the following accounts:

| Role                       | Email                  | Password             |
| :------------------------- | :--------------------- | :------------------- |
| **Superintendent** (Admin) | `admin@iykmavian.com`  | `Krilox@2026Secure!` |
| **Staff**                  | `staff@iykmavian.com`  | `Staff@2026`         |
| **Customer**               | `customer@example.com` | `Customer@2026`      |

## 🛠️ Features to Test

1. **Superintendent Dashboard**: Access via `superintendent-login.html`. View national distribution KPIs, approve logistics, and monitor regional integrity.
2. **Staff Portal**: Access via `staff-portal.html`. Manage warehouse inventory, process orders, and handle consultations.
3. **Storefront**: Browse 40+ pre-seeded pharmaceutical products, add to cart, and place mock orders.
4. **Telepharmacy**: Submit a consultation request and view it in the dashboards.
5. **Night/Day Mode**: Toggle the theme using the moon/sun icon in the top navigation.

## 📂 Recent Fixes Made

- **Krilox Web Module**: Fixed the broken `styles.css` and `toggle.js` files which were incorrectly containing HTML code.
- **Database**: Seeded `kriloxhub.db` with sample products, users, orders, and consultations.
- **API Integration**: Ensured the frontend scripts correctly point to the local backend.

## ❓ Troubleshooting

- **Server Not Starting**: If PowerShell says "Running scripts is disabled", open PowerShell as Administrator and run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- **Data Not Loading**: Ensure the terminal window opened by the script is still running. If you close it, the backend stops.
- **Styles Missing**: Refresh the page with `Ctrl+F5` to clear the cache.

---

_Created by Antigravity for IYKMAVIAN_
