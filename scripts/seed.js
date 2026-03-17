/**
 * IYKMAVIAN Pharmaceuticals – Database Seed Script
 *
 * Run: node src/scripts/seed.js
 *
 * Seeds:
 *   ✔ Superintendent account
 *   ✔ Sample staff members
 *   ✔ Pharmaceutical product catalogue (40 products)
 *   ✔ Demo orders, payments, consultations, newsletter subs
 *   ✔ Sample supply requests
 */

"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");

async function seed() {
  console.log("\n🌱  Starting IYKMAVIAN database seed…\n");

  // ─── Clear existing demo data ──────────────────────────────────────────────
  const tables = [
    "staff_requests",
    "payments",
    "orders",
    "consultations",
    "newsletter",
    "products",
    "users",
  ];
  for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();
  console.log("   ✔ Cleared existing tables");

  // ─── Users ─────────────────────────────────────────────────────────────────
  const supPwd = process.env.SUPER_PASSWORD || "Admin@Iykma2026";
  const supEmail = process.env.SUPER_EMAIL || "admin@iykmavian.com";

  const staffAccounts = [
    {
      name: "Jane Doe",
      email: "jane@iykmavian.com",
      department: "Pharmacy",
      role: "staff",
      status: "active",
    },
    {
      name: "John Smith",
      email: "john@iykmavian.com",
      department: "Logistics",
      role: "staff",
      status: "on_leave",
    },
    {
      name: "Aisha Khan",
      email: "aisha@iykmavian.com",
      department: "Procurement",
      role: "staff",
      status: "active",
    },
    {
      name: "Miguel Santos",
      email: "miguel@iykmavian.com",
      department: "Quality Control",
      role: "staff",
      status: "suspended",
    },
    {
      name: "Lina Chen",
      email: "lina@iykmavian.com",
      department: "Inventory",
      role: "staff",
      status: "active",
    },
    {
      name: "Emeka Okafor",
      email: "emeka@iykmavian.com",
      department: "Sales",
      role: "staff",
      status: "active",
    },
    {
      name: "Fatima Yusuf",
      email: "fatima@iykmavian.com",
      department: "Finance",
      role: "staff",
      status: "active",
    },
  ];

  const insertUser = db.prepare(
    `INSERT INTO users (id, name, email, password, role, department, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const supHash = await bcrypt.hash(supPwd, 12);
  insertUser.run(
    uuidv4(),
    "Dr. Kavian Superintendent",
    supEmail,
    supHash,
    "superintendent",
    null,
    "active",
  );

  // Pre-hash staff password (synchronous inside transaction)
  const staffHash = await bcrypt.hash("Staff@2026", 12);
  const insertStaffTx = db.transaction((accounts) => {
    for (const acc of accounts) {
      insertUser.run(
        uuidv4(),
        acc.name,
        acc.email,
        staffHash,
        acc.role,
        acc.department,
        acc.status,
      );
    }
  });
  insertStaffTx(staffAccounts);
  console.log(
    `   ✔ Seeded ${staffAccounts.length + 1} users (1 superintendent + ${staffAccounts.length} staff)`,
  );

  // ─── Products ──────────────────────────────────────────────────────────────
  const products = [
    // Vitamins & Supplements
    [
      "Essential Multivitamins",
      "vitamins",
      2500,
      120,
      "Comprehensive daily multivitamin for adults.",
    ],
    [
      "Vitamin C 1000mg",
      "vitamins",
      1800,
      200,
      "High-dose Vitamin C for immune support.",
    ],
    [
      "Omega-3 Fish Oil 1000mg",
      "vitamins",
      3200,
      80,
      "Heart-healthy omega-3 fatty acids.",
    ],
    [
      "Vitamin D3 5000 IU",
      "vitamins",
      2200,
      150,
      "Essential for bone health and immunity.",
    ],
    [
      "B-Complex Forte",
      "vitamins",
      1600,
      180,
      "Complete B vitamin supplement.",
    ],
    [
      "Zinc & Selenium Tablets",
      "vitamins",
      1400,
      90,
      "Mineral support for immunity.",
    ],
    [
      "Iron + Folic Acid Capsules",
      "vitamins",
      1200,
      100,
      "Haematological support supplement.",
    ],
    // Analgesics & Antibiotics
    [
      "Paracetamol BP 500mg",
      "analgesics",
      1500,
      500,
      "Fast-acting pain and fever relief.",
    ],
    [
      "Ibuprofen 400mg Tablets",
      "analgesics",
      1700,
      300,
      "Anti-inflammatory pain relief.",
    ],
    [
      "Diclofenac Sodium 50mg",
      "analgesics",
      2000,
      200,
      "NSAID for musculoskeletal pain.",
    ],
    [
      "Amoxicillin Capsules 500mg",
      "antibiotics",
      4000,
      150,
      "Broad-spectrum penicillin antibiotic.",
    ],
    [
      "Amoxicillin-Clavulanate 625mg",
      "antibiotics",
      5500,
      80,
      "Augmented antibiotic for resistant infections.",
    ],
    [
      "Ciprofloxacin 500mg Tablets",
      "antibiotics",
      4800,
      100,
      "Fluoroquinolone for UTI and respiratory infections.",
    ],
    [
      "Doxycycline 100mg Capsules",
      "antibiotics",
      3600,
      120,
      "Broad-spectrum tetracycline antibiotic.",
    ],
    [
      "Metronidazole 400mg Tablets",
      "antibiotics",
      2200,
      180,
      "Anti-parasitic and anti-bacterial agent.",
    ],
    // Antihypertensives & Cardiac
    [
      "Amlodipine 5mg Tablets",
      "cardiac",
      2800,
      90,
      "Calcium channel blocker for hypertension.",
    ],
    [
      "Lisinopril 5mg Tablets",
      "cardiac",
      3000,
      70,
      "ACE inhibitor for blood pressure.",
    ],
    ["Losartan 50mg Tablets", "cardiac", 3400, 60, "ARB antihypertensive."],
    [
      "Atorvastatin 20mg Tablets",
      "cardiac",
      4200,
      50,
      "Statin for cholesterol management.",
    ],
    [
      "Aspirin Cardio 75mg",
      "cardiac",
      1200,
      200,
      "Low-dose aspirin for cardiovascular prevention.",
    ],
    // Antidiabetics
    [
      "Metformin 500mg Tablets",
      "antidiabetics",
      2000,
      150,
      "First-line oral hypoglycaemic agent.",
    ],
    [
      "Glibenclamide 5mg Tablets",
      "antidiabetics",
      1800,
      100,
      "Sulphonylurea antidiabetic.",
    ],
    [
      "Insulin (NPH) 100IU/ml",
      "antidiabetics",
      12000,
      40,
      "Intermediate-acting human insulin.",
    ],
    // Antimalarials
    [
      "Artemether-Lumefantrine 80/480mg",
      "antimalarials",
      3500,
      200,
      "First-line treatment for uncomplicated malaria.",
    ],
    [
      "Chloroquine Phosphate 250mg",
      "antimalarials",
      1500,
      150,
      "Classic antimalarial tablet.",
    ],
    // Dermatological
    [
      "Hydrocortisone Cream 1%",
      "dermatology",
      1800,
      80,
      "Mild corticosteroid for skin inflammation.",
    ],
    [
      "Clotrimazole Cream 1%",
      "dermatology",
      2000,
      70,
      "Antifungal cream for skin infections.",
    ],
    [
      "Calamine Lotion 100ml",
      "dermatology",
      1200,
      100,
      "Soothing lotion for rashes and insect bites.",
    ],
    // Medical Devices & Equipment
    [
      "Digital BP Monitor",
      "devices",
      28000,
      25,
      "Automatic upper arm blood pressure monitor.",
    ],
    [
      "Digital Thermometer",
      "devices",
      3500,
      80,
      "Fast, accurate digital thermometer.",
    ],
    [
      "Glucometer + 25 Strips",
      "devices",
      12500,
      35,
      "Blood glucose monitoring kit.",
    ],
    [
      "Pulse Oximeter",
      "devices",
      7500,
      50,
      "Fingertip SpO2 and heart rate monitor.",
    ],
    [
      "Nebulizer Machine",
      "devices",
      25000,
      15,
      "Compressor nebulizer for respiratory therapy.",
    ],
    [
      "Stethoscope (Dual Head)",
      "devices",
      18000,
      20,
      "Acoustic stethoscope for clinical use.",
    ],
    // First Aid
    [
      "Premium First Aid Kit",
      "first_aid",
      18000,
      30,
      "Comprehensive 50-piece first aid kit.",
    ],
    [
      "Surgical Gloves (Box of 100)",
      "first_aid",
      5500,
      60,
      "Latex examination gloves, powdered.",
    ],
    [
      "Nitrile Gloves (Box of 100)",
      "first_aid",
      6500,
      55,
      "Powder-free nitrile examination gloves.",
    ],
    [
      "Sterile Gauze Bandages",
      "first_aid",
      1500,
      200,
      "Absorbent sterile wound dressings.",
    ],
    [
      "Antiseptic Solution 500ml",
      "first_aid",
      2200,
      120,
      "Chlorhexidine antiseptic for wound care.",
    ],
    [
      "Disposable Syringes 5ml x10",
      "first_aid",
      1800,
      300,
      "Sterile single-use syringes with needles.",
    ],
  ];

  const insertProduct = db.prepare(
    `INSERT INTO products (id, name, category, price, stock, description, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const imgBase =
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80";
  const productIds = [];
  for (const [name, category, price, stock, description] of products) {
    const id = uuidv4();
    productIds.push(id);
    insertProduct.run(id, name, category, price, stock, description, imgBase);
  }
  console.log(`   ✔ Seeded ${products.length} products`);

  // ─── Orders ────────────────────────────────────────────────────────────────
  const orderStatuses = ["pending", "confirmed", "processing", "delivered"];
  const paymentStatuses = ["unpaid", "pending_verify", "paid"];
  const customers = [
    {
      name: "Dr. Adewale Bello",
      email: "adewale@hospital.ng",
      phone: "+2348012345678",
    },
    {
      name: "Pharm. Chika Eze",
      email: "chika@pharmacy.ng",
      phone: "+2348023456789",
    },
    {
      name: "Mrs. Ngozi Okonkwo",
      email: "ngozi@email.com",
      phone: "+2348034567890",
    },
    {
      name: "Mr. Tunde Adesanya",
      email: "tunde@clinic.ng",
      phone: "+2348045678901",
    },
    {
      name: "Dr. Amina Suleiman",
      email: "amina@hospital.ng",
      phone: "+2348056789012",
    },
  ];

  const insertOrder = db.prepare(
    `INSERT INTO orders (id, customer_name, customer_email, customer_phone, items_json, total, status, payment_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const orderIds = [];
  for (let i = 0; i < 8; i++) {
    const cust = customers[i % customers.length];
    const item = {
      id: productIds[i],
      name: products[i][0],
      price: products[i][2],
      quantity: Math.floor(Math.random() * 5) + 1,
    };
    const total = item.price * item.quantity;
    const id = uuidv4();
    orderIds.push(id);
    insertOrder.run(
      id,
      cust.name,
      cust.email,
      cust.phone,
      JSON.stringify([item]),
      total,
      orderStatuses[i % orderStatuses.length],
      paymentStatuses[i % paymentStatuses.length],
    );
  }
  console.log(`   ✔ Seeded 8 demo orders`);

  // ─── Payments ──────────────────────────────────────────────────────────────
  const insertPayment = db.prepare(
    `INSERT INTO payments (id, order_id, amount, method, reference, logged_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (let i = 0; i < 4; i++) {
    insertPayment.run(
      uuidv4(),
      orderIds[i],
      products[i][2] * 2,
      i % 2 === 0 ? "bank_transfer" : "paystack",
      `REF${Date.now()}${i}`,
      null, // logged_by: FK to users(id) — null for demo
      i < 2 ? "pending" : "verified",
    );
  }
  console.log(`   ✔ Seeded 4 demo payments`);

  // ─── Consultations ─────────────────────────────────────────────────────────
  const insertConsult = db.prepare(
    `INSERT INTO consultations (id, patient_name, age, gender, symptoms, medical_history, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  insertConsult.run(
    uuidv4(),
    "Mr. Bayo Adeleke",
    34,
    "Male",
    "Persistent headache and mild fever for 3 days.",
    "No known allergies",
    "pending",
  );
  insertConsult.run(
    uuidv4(),
    "Mrs. Kemi Lawson",
    28,
    "Female",
    "Skin rash on arms and legs, itchy.",
    "Allergic to penicillin",
    "in_review",
  );
  insertConsult.run(
    uuidv4(),
    "Mr. Chidi Nwosu",
    45,
    "Male",
    "High blood pressure, dizziness when standing.",
    "Hypertension (diagnosed 2022)",
    "completed",
  );
  insertConsult.run(
    uuidv4(),
    "Miss Zara Ibrahim",
    19,
    "Female",
    "Sore throat and difficulty swallowing.",
    "None",
    "pending",
  );
  console.log(`   ✔ Seeded 4 demo consultations`);

  // ─── Newsletter ────────────────────────────────────────────────────────────
  const insertNews = db.prepare(
    `INSERT INTO newsletter (id, email) VALUES (?, ?)`,
  );
  const emails = [
    "nurse.amaka@gmail.com",
    "drchukwu@yahoo.com",
    "pharmacist.titi@outlook.com",
    "health.abuja@gmail.com",
  ];
  for (const email of emails) insertNews.run(uuidv4(), email);
  console.log(`   ✔ Seeded ${emails.length} newsletter subscribers`);

  // ─── Staff Requests ─────────────────────────────────────────────────────────
  const insertReq = db.prepare(
    `INSERT INTO staff_requests (id, department, item, priority, requested_by, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insertReq.run(
    uuidv4(),
    "Pharmacy",
    "Amoxicillin 500mg (500 caps)",
    "high",
    "Jane Doe",
    "pending",
  );
  insertReq.run(
    uuidv4(),
    "Inventory",
    "Nitrile Gloves (10 boxes)",
    "normal",
    "Lina Chen",
    "pending",
  );
  insertReq.run(
    uuidv4(),
    "Quality Control",
    "Sterile Swabs (50 packs)",
    "normal",
    "Miguel Santos",
    "approved",
  );
  insertReq.run(
    uuidv4(),
    "Logistics",
    "Cold Chain Containers (5 units)",
    "high",
    "John Smith",
    "active",
  );
  console.log(`   ✔ Seeded 4 staff requests`);

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║       ✅  Seed completed successfully!            ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  🔑  Superintendent Login:                        ║`);
  console.log(`║      Email   : ${supEmail.padEnd(34)}║`);
  console.log(`║      Password: ${supPwd.padEnd(34)}║`);
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  👩‍⚕️  Staff Login (any staff account):             ║");
  console.log("║      Password: Staff@2026                        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
