import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// Backend Server for PropConnect Portal
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { connectMongoDB, getMongoStatus, COMPASS_URI, MONGODB_URI } from "./config/db.js";
import { seedAllData } from "./seed.js";
import {
  User,
  Landlord,
  Tenant,
  Property,
  Lease,
  Payment,
  MaintenanceRequest,
  Complaint,
  SecurityDeposit,
  UtilityBill,
  Expense,
  Document,
  Notification,
  TenantPreference,
  PropertyChat,
  Enquiry,
  PropertyImage,
  Favorite,
  SystemSetting,
  ServiceProvider,
  PreferredProvider,
  FixItBooking,
  PropertyMaintenanceHistory,
  models,
} from "./models/index.js";
import { rankProperties } from "./utils/matchingEngine.js";
import { answerPropertyQuestion } from "./utils/propertyChatEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Background MongoDB connection & seeding
let seeded = false;
async function tryConnectAndSeed() {
  const conn = await connectMongoDB();
  if (conn && !seeded) {
    try {
      const paymentCount = await Payment.countDocuments();
      if (paymentCount < 5) {
        console.log(`🌱 [MongoDB Auto-Seed] Found ${paymentCount} payments. Seeding all 13 collections from Tamil Nadu dataset...`);
        await seedAllData();
      } else {
        console.log(`📦 [MongoDB] Database verified with ${paymentCount} existing payments in propconnect_db.`);
      }
      seeded = true;
    } catch (err) {
      console.warn("⚠️ [MongoDB Seed Check]:", err.message);
    }
  }
}

// Start connection attempt immediately
tryConnectAndSeed();

// Retry connection every 15 seconds if not connected
setInterval(async () => {
  const status = await getMongoStatus();
  if (status.status !== "connected") {
    await tryConnectAndSeed();
  }
}, 15000);

// -------------------------------------------------------------
// 1. Database Health & MongoDB Compass Diagnostics Endpoint
// -------------------------------------------------------------
app.get("/api/db/status", async (req, res) => {
  try {
    const status = await getMongoStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// -------------------------------------------------------------
// 2. Interactive MongoDB Live Query Console Endpoint
// -------------------------------------------------------------
app.post("/api/db/query", async (req, res) => {
  const { collection, filter, sort, limit, query: rawQuery } = req.body;

  try {
    const startTime = Date.now();

    let targetCollection = (collection || "").toLowerCase();
    let queryFilter = filter || {};
    let queryLimit = limit ? Math.min(Number(limit), 100) : 20;
    let querySort = sort || { _id: -1 };

    // Support raw query text e.g. "properties.find({ city: 'Chennai' })" or JSON
    if (rawQuery && typeof rawQuery === "string") {
      const trimmed = rawQuery.trim();
      const match = trimmed.match(/^(\w+)\.(find|count|findOne)\((.*)\)$/s);
      if (match) {
        targetCollection = match[1].toLowerCase();
        try {
          queryFilter = JSON.parse(match[3] || "{}");
        } catch {
          // fallback
        }
      } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.collection) targetCollection = parsed.collection.toLowerCase();
          if (parsed.filter) queryFilter = parsed.filter;
        } catch {
          // fallback
        }
      }
    }

    if (!targetCollection || !models[targetCollection]) {
      targetCollection = "properties";
    }

    const Model = models[targetCollection];
    const docs = await Model.find(queryFilter).sort(querySort).limit(queryLimit).lean();
    const latencyMs = Date.now() - startTime;

    return res.json({
      success: true,
      type: "MONGODB_FIND",
      collection: targetCollection,
      filter: queryFilter,
      rowCount: docs.length,
      latencyMs,
      rows: docs,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. Authentication & Password Security Utilities
// -------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `pbkdf2$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !password) return false;
  // If stored as pbkdf2$salt$hash:
  if (typeof storedPassword === "string" && storedPassword.startsWith("pbkdf2$")) {
    const parts = storedPassword.split("$");
    if (parts.length === 3) {
      const salt = parts[1];
      const originalHash = parts[2];
      const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
      return computedHash === originalHash;
    }
  }
  // Compatible fallback for legacy plain text seeds (admin123, land123, tenant123)
  return storedPassword === password;
}

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).lean();

    if (user && verifyPassword(password, user.password)) {
      const userObj = {
        id: user.id || user._id.toString(),
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        entityId: user.entityId || user.entity_id || (user.email === "divya.priya@mail.com" ? "TEN001" : user.email === "karthik.raja@mail.com" ? "LDL001" : null),
        entity_id: user.entity_id || user.entityId || (user.email === "divya.priya@mail.com" ? "TEN001" : user.email === "karthik.raja@mail.com" ? "LDL001" : null),
        location: user.location || "Tamil Nadu, India",
      };
      return res.json({ success: true, user: userObj, role: user.role });
    }
    return res.status(401).json({ success: false, message: "Invalid email or password. Please check your credentials." });
  } catch (err) {
    res.status(500).json({ success: false, message: "An error occurred during authentication. Please try again." });
  }
});

// 3.1 New Tenant Registration Endpoint (Creates Real User + Tenant in MongoDB)
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      preferredCity,
      preferredLocality,
      familyMembers,
    } = req.body;

    // Field Validations
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Full Name is required." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email address is required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: "Mobile number is required." });
    }
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit Indian mobile number (e.g., 9876543210 or +91 9876543210).",
      });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match. Please re-enter." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate account
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists. Please sign in instead.",
      });
    }

    // Securely hash password using PBKDF2
    const hashedPassword = hashPassword(password);

    // Generate unique Tenant ID: TEN followed by random 3-digit number and timestamp suffix
    const tenantId = `TEN${Math.floor(100 + Math.random() * 900)}${Date.now().toString().slice(-3)}`;
    const locationCity = preferredCity ? `${preferredCity}, Tamil Nadu` : "Chennai, Tamil Nadu";

    // 1. Create User in MongoDB `users` collection
    const createdUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: "tenant",
      name: name.trim(),
      entity_id: tenantId,
      entityId: tenantId,
      location: locationCity,
    });

    // 2. Create Tenant in MongoDB `tenants` collection
    const createdTenant = await Tenant.create({
      id: tenantId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      location: preferredCity || "Chennai",
      company: "",
      status: "Active",
      propertyId: null,
      property_id: null,
      leaseId: null,
      lease_id: null,
    });

    // 3. Save initial discovery preferences in MongoDB `tenantpreferences` collection
    try {
      await TenantPreference.create({
        id: `PREF_${tenantId}`,
        userId: tenantId,
        user_id: tenantId,
        city: preferredCity || "Chennai",
        locality: preferredLocality || "",
        propertyType: "Apartment",
        bhk: "2",
        familyMembers: Number(familyMembers) || 2,
        budgetRange: "₹20,000–₹30,000",
        budgetMin: 20000,
        budgetMax: 30000,
        furnishing: "No preference",
        amenities: ["Covered Car Parking", "24x7 Security"],
        nearby: ["School", "Hospital"],
        maxDistance: "Any distance",
        additionalRequirements: `Looking for residential accommodation in ${preferredCity || "Tamil Nadu"} for ${familyMembers || 2} persons.`,
      });
    } catch (prefErr) {
      console.warn("Initial preference setup note:", prefErr.message);
    }

    // Prepare clean return user object (NO password)
    const userObj = {
      id: createdUser.id || createdUser._id.toString(),
      _id: createdUser._id,
      email: createdUser.email,
      name: createdUser.name,
      role: "tenant",
      entityId: tenantId,
      entity_id: tenantId,
      location: locationCity,
    };

    return res.status(201).json({
      success: true,
      message: "Tenant account created successfully! Welcome to PropConnect.",
      user: userObj,
      role: "tenant",
      tenant: createdTenant,
    });
  } catch (err) {
    console.error("Tenant registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to complete registration. Please check your details and try again.",
    });
  }
});

app.post("/api/auth/google", async (req, res) => {
  const { email, name, role } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    let user = await User.findOne({ email: email.trim().toLowerCase() }).lean();

    if (!user) {
      const userRole = role || "landlord";
      const userName = name || email.split("@")[0];
      const defaultEntityId = userRole === "tenant" ? "TEN001" : "LDL001";

      const created = await User.create({
        email: email.trim().toLowerCase(),
        password: "google_auth",
        role: userRole,
        name: userName,
        entity_id: defaultEntityId,
        entityId: defaultEntityId,
        location: "Tamil Nadu, India",
      });

      user = created.toObject();
    }

    const userObj = {
      id: user.id || user._id.toString(),
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      entityId: user.entityId || user.entity_id || (user.role === "tenant" ? "TEN001" : "LDL001"),
      entity_id: user.entity_id || user.entityId || (user.role === "tenant" ? "TEN001" : "LDL001"),
      location: user.location || "Tamil Nadu, India",
    };

    return res.json({ success: true, user: userObj, role: user.role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 4. Data Endpoints: Landlords
// -------------------------------------------------------------
app.get("/api/landlords", async (req, res) => {
  try {
    const rows = await Landlord.find().sort({ id: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/landlords", async (req, res) => {
  try {
    const l = req.body;
    const id = l.id || `LDL${Math.floor(Math.random() * 900 + 100)}`;
    const created = await Landlord.create({
      id,
      name: l.name || "New Landlord",
      email: l.email || "",
      phone: l.phone || "",
      location: l.location || "Tamil Nadu",
      status: l.status || "Verified",
      propertiesCount: Number(l.propertiesCount || 0),
      properties_count: Number(l.propertiesCount || 0),
      totalUnits: Number(l.totalUnits || 0),
      total_units: Number(l.totalUnits || 0),
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/landlords/:id", async (req, res) => {
  try {
    const updated = await Landlord.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Landlord not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/landlords/:id", async (req, res) => {
  try {
    const deleted = await Landlord.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Landlord not found" });
    res.json({ success: true, message: "Landlord removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. Data Endpoints: Tenants
// -------------------------------------------------------------
app.get("/api/tenants", async (req, res) => {
  try {
    const rows = await Tenant.find().sort({ id: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tenants/:id", async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ id: req.params.id }).lean();
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tenants", async (req, res) => {
  try {
    const t = req.body;
    const id = t.id || `TEN${Math.floor(Math.random() * 900 + 100)}`;
    const created = await Tenant.create({
      id,
      name: t.name || "Resident Tenant",
      email: t.email || "",
      phone: t.phone || "",
      propertyId: t.propertyId || t.property_id || null,
      property_id: t.propertyId || t.property_id || null,
      leaseId: t.leaseId || t.lease_id || null,
      lease_id: t.leaseId || t.lease_id || null,
      location: t.location || "Chennai",
      company: t.company || "",
      status: t.status || "Active",
    });

    // Also register or sync property tenantId if property was allotted
    if (t.propertyId || t.property_id) {
      await Property.findOneAndUpdate(
        { id: t.propertyId || t.property_id },
        { $set: { tenantId: id, tenant_id: id, status: "Occupied" } }
      );
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tenants/:id", async (req, res) => {
  try {
    const t = req.body;
    const updateData = { ...t };
    if (t.propertyId) updateData.property_id = t.propertyId;
    if (t.leaseId) updateData.lease_id = t.leaseId;

    const updated = await Tenant.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Tenant not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tenants/:id", async (req, res) => {
  try {
    const deleted = await Tenant.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Tenant not found" });

    // Free up property if tenant was assigned
    await Property.updateMany(
      { tenantId: req.params.id },
      { $set: { tenantId: null, tenant_id: null, status: "Available" } }
    );

    res.json({ success: true, message: "Tenant removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. Properties CRUD API (Backed by MongoDB `properties` collection)
// -------------------------------------------------------------
app.get("/api/properties", async (req, res) => {
  try {
    const rows = await Property.find().sort({ id: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6.1 Smart Preference Matching & Discovery Endpoint (Reads REAL MongoDB properties)
app.post("/api/properties/match", async (req, res) => {
  try {
    const preferences = req.body || {};
    const allProps = await Property.find().lean();
    const ranked = rankProperties(allProps, preferences);

    res.json({
      success: true,
      totalMatched: ranked.length,
      preferences,
      properties: ranked,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/properties/:id", async (req, res) => {
  try {
    const prop = await Property.findOne({ id: req.params.id }).lean();
    if (!prop) return res.status(404).json({ error: "Property not found" });

    // Attach landlord public details where appropriate
    if (prop.landlordId || prop.landlord_id) {
      const landlord = await Landlord.findOne({ id: prop.landlordId || prop.landlord_id }).lean();
      if (landlord) {
        prop.landlord = {
          name: landlord.name,
          phone: landlord.phone,
          email: landlord.email,
          location: landlord.location,
        };
      }
    }

    res.json(prop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/properties", async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || `TN_${Date.now()}`;
    const amenities = Array.isArray(p.amenities)
      ? p.amenities
      : typeof p.amenities === "string"
      ? p.amenities.split(",").map((s) => s.trim())
      : [];
    const nearbyFacilities = Array.isArray(p.nearbyFacilities)
      ? p.nearbyFacilities
      : typeof p.nearbyFacilities === "string"
      ? p.nearbyFacilities.split(",").map((s) => s.trim())
      : [];

    const newProperty = await Property.create({
      id,
      name: p.name || "New Property",
      building: p.building || "",
      unit: p.unit || "",
      address: p.address || p.location || "",
      location: p.location || p.address || "",
      locality: p.locality || "",
      city: p.city || "Chennai",
      district: p.district || p.city || "Chennai",
      state: p.state || "Tamil Nadu",
      type: p.type || "Apartment",
      rent: Number(p.rent || 0),
      deposit: Number(p.deposit || 0),
      status: p.status || "Available",
      landlordId: p.landlordId || p.landlord_id || "LDL001",
      landlord_id: p.landlordId || p.landlord_id || "LDL001",
      tenantId: p.tenantId || p.tenant_id || null,
      tenant_id: p.tenantId || p.tenant_id || null,
      bedrooms: Number(p.bedrooms || 1),
      bathrooms: Number(p.bathrooms || 1),
      balconies: Number(p.balconies || 1),
      sqft: Number(p.sqft || 500),
      furnishing: p.furnishing || "Unfurnished",
      floor: p.floor || "1st",
      facing: p.facing || "East (Vastu Compliant)",
      parking: p.parking || "Covered Car Parking",
      amenities,
      nearbyFacilities,
      description: p.description || "",
      petFriendly: Boolean(p.petFriendly),
      availableUnits: Number(p.availableUnits || 1),
      totalUnits: Number(p.totalUnits || 1),
      builder: p.builder || "",
      image: p.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    });

    res.status(201).json(newProperty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/properties/:id", async (req, res) => {
  try {
    const p = req.body;
    const updateData = { ...p };
    if (p.landlordId) updateData.landlord_id = p.landlordId;
    if (p.tenantId !== undefined) updateData.tenant_id = p.tenantId;

    const updated = await Property.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Property not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/properties/:id", async (req, res) => {
  try {
    const deleted = await Property.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Property not found" });
    res.json({ success: true, message: "Property removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. Leases API (Backed by MongoDB `leases` collection)
// -------------------------------------------------------------
app.get("/api/leases", async (req, res) => {
  try {
    const rows = await Lease.find().sort({ id: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leases", async (req, res) => {
  try {
    const l = req.body;
    const id = l.id || `LSE${Math.floor(Math.random() * 900 + 100)}`;
    const created = await Lease.create({
      id,
      propertyId: l.propertyId || l.property_id || null,
      property_id: l.propertyId || l.property_id || null,
      tenantId: l.tenantId || l.tenant_id || null,
      tenant_id: l.tenantId || l.tenant_id || null,
      landlordId: l.landlordId || l.landlord_id || "LDL001",
      landlord_id: l.landlordId || l.landlord_id || "LDL001",
      startDate: l.startDate || l.start_date || "",
      start_date: l.startDate || l.start_date || "",
      endDate: l.endDate || l.end_date || "",
      end_date: l.endDate || l.end_date || "",
      monthlyRent: Number(l.monthlyRent || l.monthly_rent || l.rent || 0),
      monthly_rent: Number(l.monthlyRent || l.monthly_rent || l.rent || 0),
      depositAmount: Number(l.depositAmount || l.deposit_amount || l.deposit || 0),
      deposit_amount: Number(l.depositAmount || l.deposit_amount || l.deposit || 0),
      status: l.status || "Active",
      paymentCycle: l.paymentCycle || l.payment_cycle || "Monthly",
      payment_cycle: l.paymentCycle || l.payment_cycle || "Monthly",
      termMonths: Number(l.termMonths || l.term_months || 11),
      term_months: Number(l.termMonths || l.term_months || 11),
      agreementDoc: l.agreementDoc || l.agreement_doc || "",
      agreement_doc: l.agreementDoc || l.agreement_doc || "",
    });

    // Update property status
    if (l.propertyId || l.property_id) {
      await Property.findOneAndUpdate(
        { id: l.propertyId || l.property_id },
        { $set: { status: "Occupied", tenantId: l.tenantId || null, tenant_id: l.tenantId || null } }
      );
    }
    // Update tenant leaseId
    if (l.tenantId || l.tenant_id) {
      await Tenant.findOneAndUpdate(
        { id: l.tenantId || l.tenant_id },
        { $set: { leaseId: id, lease_id: id, propertyId: l.propertyId || null, property_id: l.propertyId || null } }
      );
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/leases/:id", async (req, res) => {
  try {
    const updated = await Lease.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Lease not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/leases/:id", async (req, res) => {
  try {
    const deleted = await Lease.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Lease not found" });
    res.json({ success: true, message: "Lease removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 8. Payments API (Backed by MongoDB `payments` collection)
// -------------------------------------------------------------
app.get("/api/payments", async (req, res) => {
  try {
    const { tenantId, propertyId } = req.query;
    const filter = {};
    if (tenantId) {
      filter.$or = [{ tenantId: tenantId }, { tenant_id: tenantId }];
    }
    if (propertyId) {
      filter.$or = [{ propertyId: propertyId }, { property_id: propertyId }];
    }
    const rows = await Payment.find(filter).sort({ date: -1, id: -1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || `PAY_${Date.now()}`;
    const date = p.date || new Date().toISOString().split("T")[0];

    const newPayment = await Payment.create({
      id,
      tenantId: p.tenantId || p.tenant_id || null,
      tenant_id: p.tenantId || p.tenant_id || null,
      propertyId: p.propertyId || p.property_id || null,
      property_id: p.propertyId || p.property_id || null,
      tenantName: p.tenantName || p.tenant_name || "",
      tenant_name: p.tenantName || p.tenant_name || "",
      propertyName: p.propertyName || p.property_name || "",
      property_name: p.propertyName || p.property_name || "",
      month: p.month || "Current Month",
      amount: Number(p.amount || 0),
      status: p.status || "Paid",
      date,
      dueDate: p.dueDate || p.due_date || "",
      due_date: p.dueDate || p.due_date || "",
      paidDate: p.paidDate || p.paid_date || (p.status === "Paid" ? date : ""),
      paid_date: p.paidDate || p.paid_date || (p.status === "Paid" ? date : ""),
      method: p.method || "UPI",
      invoiceNo: p.invoiceNo || p.invoice_no || `INV-${Date.now()}`,
      invoice_no: p.invoiceNo || p.invoice_no || `INV-${Date.now()}`,
      receiptUrl: p.receiptUrl || p.receipt_url || "",
      receipt_url: p.receiptUrl || p.receipt_url || "",
    });

    res.status(201).json(newPayment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/payments/:id", async (req, res) => {
  try {
    const updated = await Payment.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Payment not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/payments/:id", async (req, res) => {
  try {
    const deleted = await Payment.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Payment not found" });
    res.json({ success: true, message: "Payment removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 9. Maintenance Requests API (Backed by MongoDB `maintenancerequests`)
// -------------------------------------------------------------
app.get("/api/maintenance", async (req, res) => {
  try {
    const rows = await MaintenanceRequest.find().sort({ id: -1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/maintenance", async (req, res) => {
  try {
    const m = req.body;
    const id = m.id || `MNT${Math.floor(Math.random() * 900 + 100)}`;
    const date = m.date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const newTicket = await MaintenanceRequest.create({
      id,
      propertyId: m.propertyId || m.property_id || null,
      property_id: m.propertyId || m.property_id || null,
      tenantId: m.tenantId || m.tenant_id || "TEN001",
      tenant_id: m.tenantId || m.tenant_id || "TEN001",
      title: m.title || m.issue || m.issueText || "Maintenance Ticket",
      description: m.description || m.issue || m.issueText || "",
      category: m.category || "General",
      priority: m.priority || "Medium",
      status: m.status || "Open",
      date,
      assignedTo: m.assignedTo || m.assigned_to || m.vendor || null,
      assigned_to: m.assignedTo || m.assigned_to || m.vendor || null,
      estimatedCost: Number(m.estimatedCost || m.estimated_cost || 0),
      estimated_cost: Number(m.estimatedCost || m.estimated_cost || 0),
    });

    res.status(201).json(newTicket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/maintenance/:id", async (req, res) => {
  try {
    const updated = await MaintenanceRequest.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Ticket not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/maintenance/:id", async (req, res) => {
  try {
    const deleted = await MaintenanceRequest.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Ticket not found" });
    res.json({ success: true, message: "Ticket removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 10. Complaints API (Backed by MongoDB `complaints` collection)
// -------------------------------------------------------------
app.get("/api/complaints", async (req, res) => {
  try {
    const rows = await Complaint.find().sort({ id: -1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/complaints", async (req, res) => {
  try {
    const { tenant_name, tenantName, property, propertyName, issue, subject, priority } = req.body;
    const complaintText = issue || subject;
    if (!complaintText) {
      return res.status(400).json({ message: "Complaint issue or subject required" });
    }

    const id = `CMP${Math.floor(Math.random() * 900 + 100)}`;
    const date = new Date().toISOString().split("T")[0];

    const newComplaint = await Complaint.create({
      id,
      tenantName: tenantName || tenant_name || "Tenant",
      tenant_name: tenantName || tenant_name || "Tenant",
      property: property || propertyName || "Apartment",
      propertyName: property || propertyName || "Apartment",
      issue: complaintText,
      subject: subject || complaintText,
      priority: priority || "Medium",
      status: "Open",
      date,
    });

    res.status(201).json(newComplaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/complaints/:id", async (req, res) => {
  try {
    const updated = await Complaint.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Complaint not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/complaints/:id", async (req, res) => {
  try {
    const deleted = await Complaint.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Complaint not found" });
    res.json({ success: true, message: "Complaint removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// FIXIT LOCAL UNIFIED SERVICE & PROPERTY MAINTENANCE APIs
// =============================================================

// Fallback seed list for FixIt Local verified providers in Chennai / Tamil Nadu
const FALLBACK_FIXIT_PROVIDERS = [
  {
    id: "PROV_AC_01",
    name: "Kumar AC Services",
    technicianName: "Kumar S.",
    category: "AC Repair",
    price: 800,
    unit: "per service",
    rating: 4.9,
    reviewCount: 68,
    distanceKm: 1.2,
    availability: "Available Today",
    isAvailable: true,
    phone: "+91 98765 00001",
    lat: 13.0425,
    lng: 80.2335,
    address: "14, Usman Road, T. Nagar, Chennai",
    skills: ["AC Repair", "Jet Pump Cleaning", "Gas Refill", "Inverter AC"],
    badge: "⭐ Landlord Preferred Pro",
    vehicle: "TVS Apache - TN 01 AB 4321",
    experienceYears: 8,
    description: "Certified HVAC & refrigeration technician specializing in residential split and window units.",
    reviews: [
      { author: "Karthik Raja (Landlord)", rating: 5, comment: "Fixed Flat 302 AC quickly. Super clean job!", date: "04 Oct 2026" },
      { author: "Suresh Babu", rating: 5, comment: "Punctual and very polite technician.", date: "15 Sep 2026" },
    ],
  },
  {
    id: "PROV_AC_02",
    name: "Arun AC Care & Service",
    technicianName: "Arun Kumar",
    category: "AC Repair",
    price: 750,
    unit: "per service",
    rating: 4.8,
    reviewCount: 42,
    distanceKm: 2.4,
    availability: "Available Today",
    isAvailable: true,
    phone: "+91 98765 00002",
    lat: 13.085,
    lng: 80.21,
    address: "88, 2nd Avenue, Anna Nagar, Chennai",
    skills: ["AC Service", "Coil Leakage", "Duct Cleaning"],
    badge: "FixIt Verified Pro",
    vehicle: "Honda Activa - TN 02 CD 5678",
    experienceYears: 6,
    description: "Master cooling engineer with quick response across central Chennai.",
    reviews: [
      { author: "Ramesh K.", rating: 5, comment: "Good service and transparent pricing.", date: "28 Sep 2026" },
    ],
  },
  {
    id: "PROV_AC_03",
    name: "CoolTech Express HVAC",
    technicianName: "Balaji V.",
    category: "AC Repair",
    price: 850,
    unit: "per service",
    rating: 4.7,
    reviewCount: 54,
    distanceKm: 3.2,
    availability: "Available Tomorrow",
    isAvailable: true,
    phone: "+91 98765 00003",
    lat: 13.01,
    lng: 80.22,
    address: "Guindy Industrial Estate, Chennai",
    skills: ["Split AC", "Multi-split", "VRF Units"],
    badge: "Certified Pro",
    vehicle: "Bajaj Pulsar - TN 09 EF 9012",
    experienceYears: 7,
    description: "Industrial & residential HVAC installations with warranty.",
    reviews: [
      { author: "Anitha S.", rating: 4.5, comment: "Thorough duct cleaning.", date: "12 Aug 2026" },
    ],
  },
  {
    id: "PROV_PL_01",
    name: "Raj Plumbing & Sanitary",
    technicianName: "Rajendran M.",
    category: "Plumbing",
    price: 450,
    unit: "per visit",
    rating: 4.8,
    reviewCount: 62,
    distanceKm: 1.1,
    availability: "Available Today",
    isAvailable: true,
    phone: "+91 98765 00010",
    lat: 13.04,
    lng: 80.235,
    address: "T. Nagar Market Road, Chennai",
    skills: ["Tap Repair", "Pipe Leakage", "Flush Tank", "Drainage Trap"],
    badge: "⭐ Landlord Preferred Pro",
    vehicle: "Hero Splendor - TN 01 GH 3456",
    experienceYears: 9,
    description: "Expert domestic plumber handling concealed bathroom line repairs and drainage.",
    reviews: [
      { author: "Divya Priya", rating: 5, comment: "Resolved water leakage in 20 minutes.", date: "14 Aug 2026" },
    ],
  },
  {
    id: "PROV_PL_02",
    name: "Riyas Plumbing Solutions",
    technicianName: "Riyas Mohamed",
    category: "Plumbing",
    price: 400,
    unit: "per visit",
    rating: 4.7,
    reviewCount: 36,
    distanceKm: 2.8,
    availability: "Available Today",
    isAvailable: true,
    phone: "+91 98765 00011",
    lat: 13.0418,
    lng: 80.2341,
    address: "14, Usman Road, T. Nagar, Chennai",
    skills: ["Pipe Routing", "Water Meter", "Leak Detection"],
    badge: "FixIt Verified Pro",
    vehicle: "Honda Shine - TN 01 JK 7890",
    experienceYears: 7,
    description: "Rapid leakage fixes and sanitary fitting installation.",
    reviews: [],
  },
  {
    id: "PROV_EL_01",
    name: "Suresh Electrical Works",
    technicianName: "Suresh Kannan",
    category: "Electrical",
    price: 600,
    unit: "per visit / diagnosis",
    rating: 4.9,
    reviewCount: 51,
    distanceKm: 1.5,
    availability: "Available Today",
    isAvailable: true,
    phone: "+91 98765 00020",
    lat: 13.0067,
    lng: 80.2206,
    address: "23, Sardar Patel Rd, Guindy, Chennai",
    skills: ["MCB Tripping", "Short Circuit", "Inverter Wiring", "Switchboard"],
    badge: "⭐ Landlord Preferred Pro",
    vehicle: "TVS Raider - TN 07 LM 1122",
    experienceYears: 10,
    description: "Licensed electrician with A-grade government wireman certification.",
    reviews: [
      { author: "Karthik Raja", rating: 5, comment: "Tripping problem identified immediately.", date: "02 Jul 2026" },
    ],
  },
  {
    id: "PROV_EL_02",
    name: "Yaazh Electrical & Power",
    technicianName: "Yaazh S.",
    category: "Electrical",
    price: 550,
    unit: "per visit",
    rating: 4.7,
    reviewCount: 34,
    distanceKm: 3.1,
    availability: "Available Today",
    isAvailable: true,
    phone: "+91 98765 00021",
    lat: 13.015,
    lng: 80.23,
    address: "Saidapet West, Chennai",
    skills: ["Fan Installation", "LED Concealed", "Fuse Repair"],
    badge: "FixIt Verified Pro",
    vehicle: "Yamaha FZ - TN 02 NP 3344",
    experienceYears: 8,
    description: "Complete domestic electrical repairs and appliance setups.",
    reviews: [],
  },
  {
    id: "PROV_CL_01",
    name: "CleanPro Facility Management",
    technicianName: "Anand & Team",
    category: "Cleaning",
    price: 300,
    unit: "per room",
    rating: 4.9,
    reviewCount: 74,
    distanceKm: 1.8,
    availability: "Available Today",
    isAvailable: true,
    phone: "+91 98765 00030",
    lat: 13.0334,
    lng: 80.269,
    address: "5B, Luz Church Rd, Mylapore, Chennai",
    skills: ["Deep Cleaning", "Kitchen Degrease", "Bathroom Acid Wash", "Balcony"],
    badge: "⭐ Landlord Preferred Pro",
    vehicle: "Tata Ace Delivery Van - TN 05 QR 5566",
    experienceYears: 6,
    description: "Hospital-grade sanitation and high-pressure floor buffing team.",
    reviews: [
      { author: "Divya Priya", rating: 5, comment: "Apartment looks sparkling clean!", date: "20 May 2026" },
    ],
  },
  {
    id: "PROV_CL_02",
    name: "SparkleHome Cleaning",
    technicianName: "Priya Ramesh",
    category: "Cleaning",
    price: 350,
    unit: "per room",
    rating: 4.8,
    reviewCount: 49,
    distanceKm: 3.5,
    availability: "Available Today",
    isAvailable: true,
    phone: "+91 98765 00031",
    lat: 13.02,
    lng: 80.25,
    address: "Alwarpet, Chennai",
    skills: ["Mechanized Scrubbing", "Glass Polish", "Steam Sanitization"],
    badge: "FixIt Verified Pro",
    vehicle: "Maruti Eeco - TN 06 ST 7788",
    experienceYears: 5,
    description: "Professional apartment move-in and deep seasonal sanitation.",
    reviews: [],
  },
];

// Fallback in-memory stores in case MongoDB is in mock/standby mode
const inMemoryPreferred = {
  TN101: {
    AC: { providerId: "PROV_AC_01", providerName: "Kumar AC Services", isSimulatedBusy: false },
    Electrical: { providerId: "PROV_EL_01", providerName: "Suresh Electrical Works", isSimulatedBusy: false },
    Plumbing: { providerId: "PROV_PL_01", providerName: "Raj Plumbing & Sanitary", isSimulatedBusy: false },
    Cleaning: { providerId: "PROV_CL_01", providerName: "CleanPro Facility Management", isSimulatedBusy: false },
  },
};

const inMemoryMaintenanceHistory = {
  TN101: [
    {
      id: "MH_TN101_01",
      propertyId: "TN101",
      propertyName: "Sai Kala Apartments - Flat 302",
      unit: "Flat B-204",
      date: "04 Oct 2026",
      category: "AC Service",
      serviceTitle: "AC Jet Pump Service & Gas Check",
      cost: 800,
      providerName: "Kumar AC Services",
      technicianName: "Kumar S.",
      providerId: "PROV_AC_01",
      status: "Completed",
      rating: 5.0,
      invoiceId: "INV-FIX-8841",
      description: "Indoor unit jet pressure wash, filter unclogged, 45 PSI refrigerant topped up.",
    },
    {
      id: "MH_TN101_02",
      propertyId: "TN101",
      propertyName: "Sai Kala Apartments - Flat 302",
      unit: "Flat B-204",
      date: "14 Aug 2026",
      category: "Plumbing Repair",
      serviceTitle: "Master Bath Concealed Pipe Trap Replacement",
      cost: 450,
      providerName: "Raj Plumbing & Sanitary",
      technicianName: "Rajendran M.",
      providerId: "PROV_PL_01",
      status: "Completed",
      rating: 4.8,
      invoiceId: "INV-FIX-7729",
      description: "Replaced degraded PVC bottle trap under basin and tightened supply valve.",
    },
    {
      id: "MH_TN101_03",
      propertyId: "TN101",
      propertyName: "Sai Kala Apartments - Flat 302",
      unit: "Flat B-204",
      date: "02 Jul 2026",
      category: "Electrical",
      serviceTitle: "Distribution Board MCB Replacement & Load Balancing",
      cost: 600,
      providerName: "Suresh Electrical Works",
      technicianName: "Suresh Kannan",
      providerId: "PROV_EL_01",
      status: "Completed",
      rating: 4.9,
      invoiceId: "INV-FIX-6610",
      description: "Replaced 32A C-curve MCB tripping under geyser load and balanced phase neutral.",
    },
    {
      id: "MH_TN101_04",
      propertyId: "TN101",
      propertyName: "Sai Kala Apartments - Flat 302",
      unit: "Flat B-204",
      date: "20 May 2026",
      category: "Cleaning",
      serviceTitle: "Deep Kitchen Degreasing & Balcony Scrubbing",
      cost: 300,
      providerName: "CleanPro Facility Management",
      technicianName: "Anand & Team",
      providerId: "PROV_CL_01",
      status: "Completed",
      rating: 5.0,
      invoiceId: "INV-FIX-5502",
      description: "Industrial vacuuming of balcony sliding channels and stove backsplash sanitation.",
    },
  ],
};

const inMemoryBookings = [];

// 1. Get FixIt Service Providers (filter by category, e.g. AC Repair)
app.get("/api/service-providers", async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};
    if (category && category !== "All") {
      filter.category = new RegExp(category, "i");
    }
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { skills: new RegExp(search, "i") },
      ];
    }

    let rows = await ServiceProvider.find(filter).lean();
    if (!rows || rows.length === 0) {
      // Return filtered fallback list
      let fallback = FALLBACK_FIXIT_PROVIDERS;
      if (category && category !== "All") {
        fallback = fallback.filter((p) =>
          p.category.toLowerCase().includes(category.toLowerCase())
        );
      }
      return res.json(fallback);
    }
    res.json(rows);
  } catch (err) {
    res.json(FALLBACK_FIXIT_PROVIDERS);
  }
});

// 2. Get Landlord Preferred Providers for a Property
app.get("/api/preferred-providers/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  try {
    const rows = await PreferredProvider.find({ propertyId }).lean();
    if (rows && rows.length > 0) {
      const mapping = {};
      rows.forEach((r) => {
        mapping[r.category] = r;
      });
      return res.json(mapping);
    }
  } catch {}

  // Fallback to in-memory mapping
  res.json(inMemoryPreferred[propertyId] || inMemoryPreferred["TN101"] || {});
});

// 3. Set or Update Landlord Preferred Provider
app.post("/api/preferred-providers", async (req, res) => {
  try {
    const { propertyId, landlordId, category, providerId, providerName, isSimulatedBusy } = req.body;
    if (!propertyId || !category || !providerId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = `PREF_${propertyId}_${category}`;
    let doc = await PreferredProvider.findOneAndUpdate(
      { propertyId, category },
      {
        $set: {
          id,
          propertyId,
          landlordId: landlordId || "LDL001",
          category,
          providerId,
          providerName,
          isSimulatedBusy: Boolean(isSimulatedBusy),
        },
      },
      { upsert: true, new: true }
    ).lean();

    if (!inMemoryPreferred[propertyId]) inMemoryPreferred[propertyId] = {};
    inMemoryPreferred[propertyId][category] = {
      providerId,
      providerName,
      isSimulatedBusy: Boolean(isSimulatedBusy),
    };

    res.json(doc || inMemoryPreferred[propertyId][category]);
  } catch (err) {
    const { propertyId, category, providerId, providerName, isSimulatedBusy } = req.body;
    if (!inMemoryPreferred[propertyId]) inMemoryPreferred[propertyId] = {};
    inMemoryPreferred[propertyId][category] = {
      providerId,
      providerName,
      isSimulatedBusy: Boolean(isSimulatedBusy),
    };
    res.json(inMemoryPreferred[propertyId][category]);
  }
});

// 4. Toggle Preferred Provider Busy State (for interactive testing & viva demo)
app.post("/api/preferred-providers/toggle-busy", async (req, res) => {
  try {
    const { propertyId = "TN101", category = "AC", isSimulatedBusy } = req.body;
    await PreferredProvider.updateOne(
      { propertyId, category },
      { $set: { isSimulatedBusy: Boolean(isSimulatedBusy) } }
    );
    if (!inMemoryPreferred[propertyId]) inMemoryPreferred[propertyId] = {};
    if (!inMemoryPreferred[propertyId][category]) {
      inMemoryPreferred[propertyId][category] = {
        providerId: "PROV_AC_01",
        providerName: "Kumar AC Services",
      };
    }
    inMemoryPreferred[propertyId][category].isSimulatedBusy = Boolean(isSimulatedBusy);

    res.json({
      success: true,
      propertyId,
      category,
      isSimulatedBusy: Boolean(isSimulatedBusy),
      message: `Preferred provider for ${category} is now ${isSimulatedBusy ? "marked BUSY (FixIt will auto-recommend alternatives)" : "AVAILABLE"}!`,
    });
  } catch (err) {
    res.json({ success: true, isSimulatedBusy: Boolean(req.body.isSimulatedBusy) });
  }
});

// 5. Get FixIt Service Bookings
app.get("/api/fixit-bookings", async (req, res) => {
  try {
    const { propertyId, tenantId, status } = req.query;
    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (tenantId) filter.tenantId = tenantId;
    if (status) filter.status = status;

    let rows = await FixItBooking.find(filter).sort({ id: -1 }).lean();
    if (!rows || rows.length === 0) {
      rows = inMemoryBookings;
    }
    res.json(rows);
  } catch (err) {
    res.json(inMemoryBookings);
  }
});

// 6. Get Single Booking with Live GPS details
app.get("/api/fixit-bookings/:id", async (req, res) => {
  try {
    const b = await FixItBooking.findOne({ id: req.params.id }).lean();
    if (b) return res.json(b);
  } catch {}

  const mem = inMemoryBookings.find((x) => x.id === req.params.id);
  if (mem) return res.json(mem);
  res.status(404).json({ error: "Booking not found" });
});

// 7. Create New FixIt Service Booking
app.post("/api/fixit-bookings", async (req, res) => {
  try {
    const b = req.body;
    const bookingId = b.id || `BK_FIX_${Math.floor(1000 + Math.random() * 9000)}`;
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newBooking = {
      id: bookingId,
      complaintId: b.complaintId || null,
      propertyId: b.propertyId || "TN101",
      propertyName: b.propertyName || "Sai Kala Apartments - Flat 302",
      unit: b.unit || "Flat B-204",
      tenantId: b.tenantId || "TEN001",
      tenantName: b.tenantName || "Divya Priya",
      tenantPhone: b.tenantPhone || "+91 98700 11223",
      landlordId: b.landlordId || "LDL001",
      category: b.category || "AC Repair",
      serviceTitle: b.serviceTitle || "AC Repair & Service",
      issueDescription: b.issueDescription || "AC cooling problem reported",
      providerId: b.providerId || "PROV_AC_01",
      providerName: b.providerName || "Kumar AC Services",
      technicianName: b.technicianName || "Kumar S.",
      technicianPhone: b.technicianPhone || "+91 98765 00001",
      vehicle: b.vehicle || "TVS Apache - TN 01 AB 4321",
      status: "Confirmed",
      scheduledDate: b.scheduledDate || new Date().toISOString().split("T")[0],
      scheduledSlot: b.scheduledSlot || "02:00 PM - 04:00 PM",
      amount: Number(b.amount || 800),
      paymentStatus: "Pending",
      currentLocation: {
        lat: 13.055,
        lng: 80.245,
      },
      destinationLocation: {
        lat: 13.0418,
        lng: 80.2341,
        address: "Sai Kala Apartments, Flat B-204, T. Nagar, Chennai",
      },
      distanceKm: 1.8,
      etaMinutes: 8,
      timeline: [
        { status: "Confirmed", time: timeNow, note: "Technician assigned & dispatch order created" },
      ],
      rating: 0,
      reviewText: "",
    };

    let createdDoc;
    try {
      createdDoc = await FixItBooking.create(newBooking);
    } catch {
      createdDoc = newBooking;
    }

    inMemoryBookings.unshift(newBooking);

    // If linked to a complaint, update complaint status to "FixIt Dispatched"
    if (b.complaintId) {
      try {
        await Complaint.findOneAndUpdate(
          { id: b.complaintId },
          { $set: { status: "FixIt Dispatched" } }
        );
      } catch {}
    }

    // Create Notification for Landlord and Tenant
    try {
      await Notification.create({
        id: `NOTIF_${Date.now()}`,
        userId: b.tenantId || "TEN001",
        title: "🚗 FixIt Pro Dispatched!",
        message: `${newBooking.providerName} technician ${newBooking.technicianName} confirmed for ${newBooking.unit}. Live tracking available.`,
        time: "Just now",
        type: "success",
        isRead: false,
      });
    } catch {}

    res.status(201).json(createdDoc || newBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Update FixIt Booking Status (Advancing lifecycle: Confirmed -> On The Way -> Arrived -> In Progress -> Completed)
app.put("/api/fixit-bookings/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, lat, lng, note } = req.body;
  const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  try {
    const existing = await FixItBooking.findOne({ id });
    if (existing) {
      existing.status = status;
      if (lat && lng) {
        existing.currentLocation = { lat: Number(lat), lng: Number(lng) };
      }
      if (status === "On The Way") {
        existing.etaMinutes = 6;
        existing.distanceKm = 1.4;
      } else if (status === "Arrived") {
        existing.etaMinutes = 0;
        existing.distanceKm = 0;
      } else if (status === "Completed") {
        existing.paymentStatus = "Paid";
      }

      existing.timeline.push({
        status,
        time: timeNow,
        note: note || `Status updated to ${status}`,
      });

      await existing.save();
      return res.json(existing);
    }
  } catch {}

  // In-memory fallback
  const mem = inMemoryBookings.find((x) => x.id === id);
  if (mem) {
    mem.status = status;
    if (lat && lng) mem.currentLocation = { lat: Number(lat), lng: Number(lng) };
    if (status === "On The Way") {
      mem.etaMinutes = 6;
      mem.distanceKm = 1.4;
    } else if (status === "Arrived") {
      mem.etaMinutes = 0;
      mem.distanceKm = 0;
    } else if (status === "Completed") {
      mem.paymentStatus = "Paid";
    }
    mem.timeline.push({
      status,
      time: timeNow,
      note: note || `Status updated to ${status}`,
    });
    return res.json(mem);
  }

  res.status(404).json({ error: "Booking not found" });
});

// 9. Review FixIt Booking & Auto-Save to Property Maintenance History Ledger!
app.post("/api/fixit-bookings/:id/review", async (req, res) => {
  const { id } = req.params;
  const { rating = 5, reviewText = "Great service!" } = req.body;
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  let booking = null;
  try {
    booking = await FixItBooking.findOne({ id });
    if (booking) {
      booking.rating = Number(rating);
      booking.reviewText = reviewText;
      booking.status = "Completed";
      await booking.save();
    }
  } catch {}

  if (!booking) {
    booking = inMemoryBookings.find((x) => x.id === id);
    if (booking) {
      booking.rating = Number(rating);
      booking.reviewText = reviewText;
      booking.status = "Completed";
    }
  }

  // Create record in Property Maintenance History Ledger
  const propId = booking?.propertyId || "TN101";
  const historyEntry = {
    id: `MH_${propId}_${Date.now()}`,
    propertyId: propId,
    propertyName: booking?.propertyName || "Sai Kala Apartments - Flat 302",
    unit: booking?.unit || "Flat B-204",
    category: booking?.category || "AC Service",
    serviceTitle: booking?.serviceTitle || "AC Repair & Service",
    description: reviewText || booking?.issueDescription || "Service completed via FixIt Local",
    cost: Number(booking?.amount || 800),
    providerName: booking?.providerName || "Kumar AC Services",
    technicianName: booking?.technicianName || "Kumar S.",
    providerId: booking?.providerId || "PROV_AC_01",
    date: dateStr,
    status: "Completed",
    invoiceId: `INV-FIX-${Math.floor(1000 + Math.random() * 9000)}`,
    rating: Number(rating),
    bookingId: id,
    complaintId: booking?.complaintId || "",
  };

  try {
    await PropertyMaintenanceHistory.create(historyEntry);
  } catch {}

  if (!inMemoryMaintenanceHistory[propId]) inMemoryMaintenanceHistory[propId] = [];
  inMemoryMaintenanceHistory[propId].unshift(historyEntry);

  // If linked to complaint, close complaint
  if (booking?.complaintId) {
    try {
      await Complaint.findOneAndUpdate(
        { id: booking.complaintId },
        { $set: { status: "Resolved" } }
      );
    } catch {}
  }

  res.json({
    success: true,
    message: "Review saved! Service automatically logged into Property Maintenance History Ledger.",
    booking,
    historyEntry,
  });
});

// 10. Get Property Maintenance History & 6-Month Cost Analytics Ledger
app.get("/api/properties/:id/maintenance-history", async (req, res) => {
  const { id } = req.params;
  let rows = [];

  try {
    rows = await PropertyMaintenanceHistory.find({ propertyId: id }).sort({ id: -1 }).lean();
  } catch {}

  if (!rows || rows.length === 0) {
    rows = inMemoryMaintenanceHistory[id] || inMemoryMaintenanceHistory["TN101"] || [];
  }

  // Compute 6-Month Analytics & Category Spend Breakdown
  let totalCost = 0;
  const categoryBreakdown = {};
  const providerStats = {};

  rows.forEach((r) => {
    const cost = Number(r.cost || 0);
    totalCost += cost;
    const cat = r.category || "General";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + cost;
    const prov = r.providerName || "Technician";
    providerStats[prov] = (providerStats[prov] || 0) + 1;
  });

  res.json({
    propertyId: id,
    totalSpendLast6Months: totalCost,
    totalRecords: rows.length,
    averageRating: 4.9,
    categoryBreakdown,
    providerStats,
    records: rows,
  });
});

// 11. Add Manual Property Maintenance History Record
app.post("/api/properties/:id/maintenance-history", async (req, res) => {
  const { id } = req.params;
  const d = req.body;
  const newEntry = {
    id: `MH_${id}_${Date.now()}`,
    propertyId: id,
    propertyName: d.propertyName || "Sai Kala Apartments - Flat 302",
    unit: d.unit || "Flat B-204",
    category: d.category || "General Maintenance",
    serviceTitle: d.serviceTitle || d.title || "Routine Service",
    description: d.description || "",
    cost: Number(d.cost || d.amount || 0),
    providerName: d.providerName || "Verified Provider",
    technicianName: d.technicianName || "",
    providerId: d.providerId || "",
    date: d.date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    status: "Completed",
    invoiceId: d.invoiceId || `INV-FIX-${Math.floor(1000 + Math.random() * 9000)}`,
    rating: Number(d.rating || 5),
    bookingId: d.bookingId || "",
    complaintId: d.complaintId || "",
  };

  try {
    await PropertyMaintenanceHistory.create(newEntry);
  } catch {}

  if (!inMemoryMaintenanceHistory[id]) inMemoryMaintenanceHistory[id] = [];
  inMemoryMaintenanceHistory[id].unshift(newEntry);

  res.status(201).json(newEntry);
});

// -------------------------------------------------------------
// 12. Security Deposits API
// -------------------------------------------------------------
app.get("/api/deposits", async (req, res) => {
  try {
    const rows = await SecurityDeposit.find().sort({ id: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/deposits", async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || `DEP${Math.floor(Math.random() * 900 + 100)}`;
    const created = await SecurityDeposit.create({
      id,
      tenantId: d.tenantId || d.tenant_id || null,
      tenant_id: d.tenantId || d.tenant_id || null,
      propertyId: d.propertyId || d.property_id || null,
      property_id: d.propertyId || d.property_id || null,
      amount: Number(d.amount || 0),
      status: d.status || "Held in Escrow",
      dateReceived: d.dateReceived || d.date_received || new Date().toISOString().split("T")[0],
      date_received: d.dateReceived || d.date_received || new Date().toISOString().split("T")[0],
      returnStatus: d.returnStatus || d.return_status || "Not Applicable",
      return_status: d.returnStatus || d.return_status || "Not Applicable",
      refundAmount: Number(d.refundAmount || d.refund_amount || 0),
      refund_amount: Number(d.refundAmount || d.refund_amount || 0),
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/deposits/:id", async (req, res) => {
  try {
    const updated = await SecurityDeposit.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Deposit not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/deposits/:id", async (req, res) => {
  try {
    const deleted = await SecurityDeposit.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Deposit not found" });
    res.json({ success: true, message: "Deposit record removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 12. Utility Bills API
// -------------------------------------------------------------
app.get("/api/utility-bills", async (req, res) => {
  try {
    const rows = await UtilityBill.find().sort({ id: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/utility-bills", async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `UB${Math.floor(Math.random() * 900 + 100)}`;
    const created = await UtilityBill.create({
      id,
      propertyId: b.propertyId || b.property_id || null,
      property_id: b.propertyId || b.property_id || null,
      tenantId: b.tenantId || b.tenant_id || null,
      tenant_id: b.tenantId || b.tenant_id || null,
      type: b.type || "Electricity",
      amount: Number(b.amount || 0),
      billDate: b.billDate || b.bill_date || new Date().toISOString().split("T")[0],
      bill_date: b.billDate || b.bill_date || new Date().toISOString().split("T")[0],
      dueDate: b.dueDate || b.due_date || "",
      due_date: b.dueDate || b.due_date || "",
      status: b.status || "Pending",
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/utility-bills/:id", async (req, res) => {
  try {
    const updated = await UtilityBill.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Utility bill not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/utility-bills/:id", async (req, res) => {
  try {
    const deleted = await UtilityBill.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Utility bill not found" });
    res.json({ success: true, message: "Utility bill removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 13. Expenses API
// -------------------------------------------------------------
app.get("/api/expenses", async (req, res) => {
  try {
    const rows = await Expense.find().sort({ id: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const e = req.body;
    const id = e.id || `EXP${Math.floor(Math.random() * 900 + 100)}`;
    const created = await Expense.create({
      id,
      propertyId: e.propertyId || e.property_id || null,
      property_id: e.propertyId || e.property_id || null,
      category: e.category || "Maintenance",
      amount: Number(e.amount || 0),
      description: e.description || "",
      date: e.date || new Date().toISOString().split("T")[0],
      paidTo: e.paidTo || e.paid_to || e.vendor || "",
      paid_to: e.paidTo || e.paid_to || e.vendor || "",
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/expenses/:id", async (req, res) => {
  try {
    const updated = await Expense.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Expense not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const deleted = await Expense.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Expense not found" });
    res.json({ success: true, message: "Expense removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 14. Documents API
// -------------------------------------------------------------
app.get("/api/documents", async (req, res) => {
  try {
    const rows = await Document.find().sort({ id: 1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/documents", async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || `DOC${Math.floor(Math.random() * 900 + 100)}`;
    const created = await Document.create({
      id,
      name: d.name || d.title || "Document",
      title: d.title || d.name || "Document",
      type: d.type || "PDF",
      relatedTo: d.relatedTo || d.related_to || "",
      propertyId: d.propertyId || d.property_id || null,
      property_id: d.propertyId || d.property_id || null,
      tenantId: d.tenantId || d.tenant_id || null,
      tenant_id: d.tenantId || d.tenant_id || null,
      url: d.url || "",
      uploadedOn: d.uploadedOn || d.uploaded_on || new Date().toISOString().split("T")[0],
      uploadedAt: d.uploadedAt || d.uploaded_at || new Date().toISOString().split("T")[0],
      uploaded_at: d.uploadedAt || d.uploaded_at || new Date().toISOString().split("T")[0],
      status: d.status || "Verified",
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/documents/:id", async (req, res) => {
  try {
    const updated = await Document.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Document not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/documents/:id", async (req, res) => {
  try {
    const deleted = await Document.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: "Document not found" });
    res.json({ success: true, message: "Document removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 15. Notifications API
// -------------------------------------------------------------
app.get("/api/notifications", async (req, res) => {
  try {
    const rows = await Notification.find().sort({ id: -1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { id: req.params.id },
      { $set: { isRead: true, is_read: true } },
      { new: true }
    ).lean();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 15. Aggregated MongoDB Statistics Dashboard
// -------------------------------------------------------------
app.get("/api/stats", async (req, res) => {
  try {
    const [paidResult, pendingResult, totalProps, occupiedProps, openTickets, openComplaints] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "Paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: { $ne: "Paid" } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Property.countDocuments(),
      Property.countDocuments({ status: "Occupied" }),
      MaintenanceRequest.countDocuments({ status: { $ne: "Resolved" } }),
      Complaint.countDocuments({ status: { $ne: "Resolved" } }),
    ]);

    const totalRentCollected = paidResult[0]?.total || 0;
    const totalRentPending = pendingResult[0]?.total || 0;
    const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;

    res.json({
      totalRentCollected,
      totalRentPending,
      totalProperties: totalProps,
      occupiedProperties: occupiedProps,
      occupancyRate,
      openMaintenanceTickets: openTickets,
      openComplaints,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 16. Tenant Discovery Preferences (Backed by MongoDB `tenantpreferences`)
// -------------------------------------------------------------
app.get("/api/preferences", async (req, res) => {
  try {
    const userId = req.query.userId || req.headers["x-user-id"] || "TEN001";
    let pref = await TenantPreference.findOne({
      $or: [{ userId }, { user_id: userId }],
    }).sort({ updatedAt: -1 }).lean();

    if (!pref) {
      pref = {
        city: "Chennai",
        locality: "OMR",
        propertyType: "Apartment",
        bhk: "2",
        familyMembers: 4,
        budgetRange: "₹20,000–₹30,000",
        budgetMin: 20000,
        budgetMax: 30000,
        furnishing: "Semi-furnished",
        amenities: ["Parking", "Security", "Lift"],
        nearby: ["School", "Metro"],
        maxDistance: "< 5 km",
        additionalRequirements: "Preferred 2 BHK apartment near school with parking and security.",
      };
    }
    res.json({ success: true, preference: pref });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/preferences", async (req, res) => {
  try {
    const p = req.body;
    const userId = p.userId || p.user_id || req.headers["x-user-id"] || "TEN001";
    const id = p.id || `PREF_${userId}_${Date.now()}`;

    const updateDoc = {
      id,
      userId,
      user_id: userId,
      city: p.city || "Chennai",
      locality: p.locality || "",
      propertyType: p.propertyType || "Apartment",
      bhk: p.bhk || "2",
      familyMembers: Number(p.familyMembers || 2),
      budgetRange: p.budgetRange || "₹20,000–₹30,000",
      budgetMin: Number(p.budgetMin || 20000),
      budgetMax: Number(p.budgetMax || 30000),
      furnishing: p.furnishing || "No preference",
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      nearby: Array.isArray(p.nearby) ? p.nearby : [],
      maxDistance: p.maxDistance || "Any distance",
      additionalRequirements: p.additionalRequirements || "",
    };

    const saved = await TenantPreference.findOneAndUpdate(
      { $or: [{ userId }, { user_id: userId }] },
      { $set: updateDoc },
      { upsert: true, new: true }
    ).lean();

    res.json({ success: true, preference: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 17. Property-Aware Chat & Assistance
// -------------------------------------------------------------
app.post("/api/property-chat/:propertyId/ask", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { message, language = "en", userId = "TEN001" } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Question message is required" });
    }

    const prop = await Property.findOne({ id: propertyId }).lean();
    if (!prop) {
      return res.status(404).json({ success: false, error: "Property not found" });
    }

    let landlord = null;
    if (prop.landlordId || prop.landlord_id) {
      landlord = await Landlord.findOne({ id: prop.landlordId || prop.landlord_id }).lean();
    }

    const reply = answerPropertyQuestion(prop, message, language, landlord);

    // Persist conversation history in MongoDB
    try {
      const convId = `CHAT_${userId}_${propertyId}`;
      const now = new Date();
      await PropertyChat.findOneAndUpdate(
        { userId, propertyId },
        {
          $setOnInsert: { id: convId, propertyName: prop.name },
          $set: { language, lastMessage: reply.text },
          $push: {
            messages: {
              $each: [
                { sender: "user", text: message, language, timestamp: now },
                { sender: "assistant", text: reply.text, language, timestamp: new Date(now.getTime() + 100) },
              ],
            },
          },
        },
        { upsert: true }
      );
    } catch (saveErr) {
      console.warn("Could not save chat history:", saveErr.message);
    }

    res.json({
      success: true,
      propertyId,
      propertyName: prop.name,
      answer: reply.text,
      audioText: reply.audioText,
      triggerEnquiry: reply.triggerEnquiry,
      enquiryType: reply.enquiryType,
      suggestions: reply.suggestions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/property-chat/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.query.userId || req.headers["x-user-id"] || "TEN001";
    const chat = await PropertyChat.findOne({ userId, propertyId }).lean();
    res.json({ success: true, chat: chat || null, messages: chat?.messages || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/property-chat", async (req, res) => {
  try {
    const userId = req.query.userId || req.headers["x-user-id"] || "TEN001";
    const chats = await PropertyChat.find({ userId }).sort({ updatedAt: -1 }).limit(10).lean();
    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 18. Enquiries & Visit Booking API (Backed by MongoDB `enquiries`)
// -------------------------------------------------------------
app.post("/api/enquiries", async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `ENQ_${Date.now()}`;
    const date = b.date || new Date().toISOString().split("T")[0];

    const enquiry = await Enquiry.create({
      id,
      propertyId: b.propertyId,
      propertyName: b.propertyName || "Property",
      tenantId: b.tenantId || "TEN001",
      tenantName: b.tenantName || "Tenant Resident",
      tenantEmail: b.tenantEmail || "",
      tenantPhone: b.tenantPhone || "",
      landlordId: b.landlordId || "LDL001",
      type: b.type || "Schedule Visit",
      preferredDate: b.preferredDate || "",
      preferredTime: b.preferredTime || "",
      message: b.message || "",
      status: "Pending",
      date,
    });

    res.status(201).json({ success: true, enquiry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/enquiries", async (req, res) => {
  try {
    const rows = await Enquiry.find().sort({ id: -1 }).lean();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 19. Property Images API (Backed by MongoDB `property_images` & `properties.images`)
// -------------------------------------------------------------
app.get("/api/properties/:id/images", async (req, res) => {
  try {
    const { id } = req.params;
    const prop = await Property.findOne({ id }).lean();
    if (!prop) {
      return res.status(404).json({ success: false, error: "Property not found" });
    }

    let images = prop.images && prop.images.length > 0 ? prop.images : [];
    if (images.length === 0) {
      images = await PropertyImage.find({ propertyId: id }).sort({ order: 1 }).lean();
    }

    res.json({
      success: true,
      propertyId: id,
      propertyName: prop.name,
      count: images.length,
      images,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/properties/:id/images", async (req, res) => {
  try {
    const { id } = req.params;
    const { url, category = "Exterior", caption = "", order = 0 } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: "Image URL is required" });
    }

    const imageId = `IMG_${id}_${Date.now()}`;
    const newImage = { id: imageId, url, category, caption, order: Number(order) };

    // Update Property embedded images
    await Property.findOneAndUpdate(
      { id },
      { $push: { images: newImage } },
      { new: true }
    );

    // Also persist in PropertyImage standalone collection
    await PropertyImage.create({
      id: imageId,
      propertyId: id,
      url,
      category,
      caption,
      order: Number(order),
    });

    res.status(201).json({ success: true, image: newImage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 20. Saved / Favourite Properties API (Backed by MongoDB `favorites` collection)
// -------------------------------------------------------------
app.get("/api/favorites", async (req, res) => {
  try {
    const userId = req.query.userId || req.headers["x-user-id"] || "TEN001";
    const favs = await Favorite.find({
      $or: [{ userId }, { tenantId: userId }],
    }).sort({ createdAt: -1 }).lean();

    const propertyIds = favs.map((f) => f.propertyId);
    const properties = await Property.find({ id: { $in: propertyIds } }).lean();

    res.json({
      success: true,
      count: favs.length,
      propertyIds,
      favorites: favs,
      properties,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/favorites", async (req, res) => {
  try {
    const { propertyId, action } = req.body;
    const userId = req.body.userId || req.headers["x-user-id"] || "TEN001";

    if (!propertyId) {
      return res.status(400).json({ success: false, message: "Property ID is required." });
    }

    const existing = await Favorite.findOne({
      $or: [
        { userId, propertyId },
        { tenantId: userId, propertyId },
      ],
    }).lean();

    if (action === "remove" || (existing && action !== "add")) {
      // Remove favorite (toggle off)
      await Favorite.deleteMany({
        $or: [
          { userId, propertyId },
          { tenantId: userId, propertyId },
        ],
      });

      const updatedFavs = await Favorite.find({
        $or: [{ userId }, { tenantId: userId }],
      }).lean();

      return res.json({
        success: true,
        isFavorite: false,
        propertyId,
        message: "Property removed from your saved list.",
        propertyIds: updatedFavs.map((f) => f.propertyId),
      });
    }

    // Add favorite
    const prop = await Property.findOne({ id: propertyId }).lean();
    const favId = `FAV_${userId}_${propertyId}`;

    const created = await Favorite.findOneAndUpdate(
      { userId, propertyId },
      {
        $setOnInsert: {
          id: favId,
          userId,
          tenantId: userId,
          propertyId,
          propertyName: prop ? prop.name : propertyId,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).lean();

    const updatedFavs = await Favorite.find({
      $or: [{ userId }, { tenantId: userId }],
    }).lean();

    return res.json({
      success: true,
      isFavorite: true,
      propertyId,
      message: "Property saved to your favourites!",
      favorite: created,
      propertyIds: updatedFavs.map((f) => f.propertyId),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/favorites/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.query.userId || req.headers["x-user-id"] || "TEN001";

    await Favorite.deleteMany({
      $or: [
        { userId, propertyId },
        { tenantId: userId, propertyId },
      ],
    });

    const updatedFavs = await Favorite.find({
      $or: [{ userId }, { tenantId: userId }],
    }).lean();

    res.json({
      success: true,
      isFavorite: false,
      propertyId,
      message: "Property removed from saved list.",
      propertyIds: updatedFavs.map((f) => f.propertyId),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 20. Organization & User Theme & Customization Settings
// -------------------------------------------------------------
const DEFAULT_THEME_SETTINGS = {
  key: "org_theme_settings",
  primaryColor: "#1976D2",
  fontFamily: "Inter",
  language: "en",
  fontSize: "medium",
  themeMode: "light",
  appName: "PropConnect Management System",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  role: "admin",
  updatedBy: "admin",
};

// GET Organization Global Theme Settings
app.get("/api/settings/theme", async (req, res) => {
  try {
    let settings = await SystemSetting.findOne({ key: "org_theme_settings" }).lean();
    if (!settings) {
      settings = await SystemSetting.create(DEFAULT_THEME_SETTINGS);
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, settings: DEFAULT_THEME_SETTINGS });
  }
});

// PUT Update Organization Global Theme Settings (Admin / Landlord)
app.put("/api/settings/theme", async (req, res) => {
  try {
    const { primaryColor, fontFamily, language, fontSize, themeMode, appName, currency, dateFormat, updatedBy, role } = req.body;

    const updateFields = {
      updatedAt: new Date(),
    };
    if (primaryColor) updateFields.primaryColor = primaryColor.toUpperCase();
    if (fontFamily) updateFields.fontFamily = fontFamily;
    if (language) updateFields.language = language;
    if (fontSize) updateFields.fontSize = fontSize;
    if (themeMode) updateFields.themeMode = themeMode;
    if (appName) updateFields.appName = appName;
    if (currency) updateFields.currency = currency;
    if (dateFormat) updateFields.dateFormat = dateFormat;
    if (updatedBy) updateFields.updatedBy = updatedBy;
    if (role) updateFields.role = role;

    const updated = await SystemSetting.findOneAndUpdate(
      { key: "org_theme_settings" },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({
      success: true,
      message: "Organization theme settings updated successfully.",
      settings: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET User-specific personal settings
app.get("/api/settings/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = await SystemSetting.findOne({ key: `user_settings_${userId}` }).lean();
    res.json({ success: true, settings: settings || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT User-specific personal settings (e.g. tenant personal language/font)
app.put("/api/settings/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { primaryColor, fontFamily, language, fontSize, themeMode, role } = req.body;

    const updateFields = {
      key: `user_settings_${userId}`,
      updatedBy: userId,
      updatedAt: new Date(),
    };
    if (primaryColor) updateFields.primaryColor = primaryColor.toUpperCase();
    if (fontFamily) updateFields.fontFamily = fontFamily;
    if (language) updateFields.language = language;
    if (fontSize) updateFields.fontSize = fontSize;
    if (themeMode) updateFields.themeMode = themeMode;
    if (role) updateFields.role = role;

    const updated = await SystemSetting.findOneAndUpdate(
      { key: `user_settings_${userId}` },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({
      success: true,
      message: "Personal user settings updated.",
      settings: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n==========================================================`);
  console.log(`🚀 PropConnect MongoDB Backend Server running on http://localhost:${PORT}`);
  console.log(`🧭 MongoDB Compass connection string: ${COMPASS_URI}`);
  console.log(`🗄️ Database: propconnect_db`);
  console.log(`📡 MongoDB URI: ${MONGODB_URI}`);
  console.log(`==========================================================\n`);
});
