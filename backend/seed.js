import { connectMongoDB } from "./config/db.js";
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
  PropertyImage,
} from "./models/index.js";
import {
  LANDLORDS,
  TENANTS,
  PROPERTIES,
  LEASES,
  PAYMENTS,
  MAINTENANCE_REQUESTS,
  SECURITY_DEPOSITS,
  UTILITY_BILLS,
  EXPENSES,
  DOCUMENTS,
  COMPLAINTS,
  NOTIFICATIONS,
} from "./seed-data/db.js";
import { generateGalleryForProperty } from "./seed-data/propertyGalleries.js";

export async function seedAllData() {
  console.log(
    "🌱 Populating complete Tamil Nadu rental database into MongoDB...",
  );

  // 1. Seed Users
  const defaultUsers = [
    {
      email: "admin@propconnect.com",
      password: "admin123",
      role: "admin",
      name: "Admin User",
      entity_id: null,
      location: "Chennai, TN",
    },
    {
      email: "karthik.raja@mail.com",
      password: "land123",
      role: "landlord",
      name: "Karthik Raja",
      entity_id: "LDL001",
      entityId: "LDL001",
      location: "Coimbatore, TN",
    },
    {
      email: "sanjitha.raja@gmail.com",
      password: "google123",
      role: "landlord",
      name: "Sanjitha Raja",
      entity_id: "LDL002",
      entityId: "LDL002",
      location: "Chennai, TN",
    },
    {
      email: "divya.priya@mail.com",
      password: "tenant123",
      role: "tenant",
      name: "Divya Priya",
      entity_id: "TEN001",
      entityId: "TEN001",
      location: "T. Nagar, Chennai",
    },
    {
      email: "arjun.kumar@mail.com",
      password: "tenant123",
      role: "tenant",
      name: "Arjun Kumar",
      entity_id: "TEN002",
      entityId: "TEN002",
      location: "Peelamedu, Coimbatore",
    },
    {
      email: "meena.suresh@mail.com",
      password: "tenant123",
      role: "tenant",
      name: "Meena Suresh",
      entity_id: "TEN003",
      entityId: "TEN003",
      location: "KK Nagar, Madurai",
    },
  ];

  await User.deleteMany({});
  await User.insertMany(defaultUsers);

  // 2. Seed Landlords
  const formattedLandlords = LANDLORDS.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    location: l.location,
    status: l.status || "Verified",
    propertiesCount: l.propertiesCount || 0,
    properties_count: l.propertiesCount || 0,
    totalUnits: l.totalUnits || 0,
    total_units: l.totalUnits || 0,
  }));
  await Landlord.deleteMany({});
  await Landlord.insertMany(formattedLandlords);

  // 3. Seed Tenants
  const formattedTenants = TENANTS.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    propertyId: t.propertyId,
    property_id: t.propertyId,
    leaseId: t.leaseId,
    lease_id: t.leaseId,
    location: t.location,
    company: t.company,
    status: t.status || "Active",
  }));
  await Tenant.deleteMany({});
  await Tenant.insertMany(formattedTenants);

  // 4. Seed Properties
  const formattedProperties = PROPERTIES.map((p) => {
    // Infer or clean locality
    let locality = p.locality || "";
    if (!locality && p.location) {
      const loc = p.location;
      if (loc.includes("T. Nagar")) locality = "T. Nagar";
      else if (loc.includes("OMR")) locality = "OMR";
      else if (loc.includes("Velachery")) locality = "Velachery";
      else if (loc.includes("Mylapore")) locality = "Mylapore";
      else if (loc.includes("Peelamedu")) locality = "Peelamedu";
      else if (loc.includes("Race Course")) locality = "Race Course";
      else if (loc.includes("Saravanampatti")) locality = "Saravanampatti";
      else if (loc.includes("KK Nagar") || loc.includes("K.K. Nagar"))
        locality = "KK Nagar";
      else if (loc.includes("Thillai Nagar")) locality = "Thillai Nagar";
      else if (loc.includes("Fairlands")) locality = "Fairlands";
      else if (loc.includes("Alagapuram")) locality = "Alagapuram";
      else if (loc.includes("Porur")) locality = "Porur";
      else if (loc.includes("Vadapalani")) locality = "Vadapalani";
      else if (loc.includes("Tambaram")) locality = "Tambaram";
      else if (loc.includes("Medavakkam")) locality = "Medavakkam";
      else if (loc.includes("Pallikaranai")) locality = "Pallikaranai";
      else if (loc.includes("Navalur")) locality = "OMR";
      else if (loc.includes("ECR")) locality = "ECR";
      else locality = p.city || "Chennai";
    }

    // Default nearby facilities if missing
    let nearbyFacilities = Array.isArray(p.nearbyFacilities)
      ? p.nearbyFacilities
      : [];
    if (nearbyFacilities.length === 0) {
      if (p.city === "Chennai") {
        nearbyFacilities = [
          "School",
          "Metro",
          "Hospital",
          "Bus stop",
          "Shopping",
          "Market",
          "IT park",
        ];
      } else if (p.city === "Coimbatore") {
        nearbyFacilities = [
          "College",
          "School",
          "Hospital",
          "Bus stop",
          "Market",
        ];
      } else {
        nearbyFacilities = [
          "School",
          "Hospital",
          "Bus stop",
          "Market",
          "Temple/church/mosque",
        ];
      }
    }

    return {
      id: p.id,
      name: p.name || p.title || "Property Unit",
      building: p.building || "",
      unit: p.unit || "",
      address: p.address || p.location || "",
      location: p.location || p.address || "",
      locality,
      city: p.city || "Chennai",
      district: p.district || p.city || "Chennai",
      state: p.state || "Tamil Nadu",
      type: p.type || "Apartment",
      rent: Number(p.rent || 0),
      deposit: Number(p.deposit || 0),
      status: p.status || "Available",
      landlordId: p.landlordId || "LDL001",
      landlord_id: p.landlordId || "LDL001",
      tenantId: p.tenantId || null,
      tenant_id: p.tenantId || null,
      bedrooms: Number(p.bedrooms || 1),
      bathrooms: Number(p.bathrooms || 1),
      balconies: Number(p.balconies || 1),
      sqft: Number(p.sqft || p.area || 500),
      furnishing: p.furnishing || "Unfurnished",
      floor: p.floor || "1st",
      facing: p.facing || "East (Vastu Compliant)",
      parking:
        p.parking ||
        (p.amenities?.some((a) => a.includes("Parking"))
          ? "Covered Car Parking"
          : "Open Parking"),
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      nearbyFacilities,
      description:
        p.description ||
        `${p.name} is a premier residential property in ${locality}, ${p.city}. Featuring modern construction, abundant natural light, and society amenities for comfortable living.`,
      petFriendly: Boolean(p.petFriendly),
      availableUnits: Number(
        p.availableUnits || (p.status === "Available" ? 1 : 0),
      ),
      totalUnits: Number(p.totalUnits || 1),
      builder: p.builder || "Signature Promoters TN",
      image:
        p.image ||
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      images: generateGalleryForProperty(p),
    };
  });
  await Property.deleteMany({});
  await Property.insertMany(formattedProperties);

  // 4.1 Seed PropertyImage Media Collection
  const allPropertyImages = [];
  for (const prop of formattedProperties) {
    if (prop.images && prop.images.length > 0) {
      for (const img of prop.images) {
        allPropertyImages.push({
          id: img.id || `IMG_${prop.id}_${img.order || Math.random()}`,
          propertyId: prop.id,
          url: img.url,
          category: img.category || "Exterior",
          caption: img.caption || "",
          order: img.order || 0,
        });
      }
    }
  }
  await PropertyImage.deleteMany({});
  if (allPropertyImages.length > 0) {
    await PropertyImage.insertMany(allPropertyImages);
    console.log(
      `📸 Populated ${allPropertyImages.length} property gallery photos across ${formattedProperties.length} properties.`,
    );
  }

  // 5. Seed Leases
  const formattedLeases = LEASES.map((ls) => ({
    id: ls.id,
    propertyId: ls.propertyId,
    property_id: ls.propertyId,
    tenantId: ls.tenantId,
    tenant_id: ls.tenantId,
    landlordId: ls.landlordId || "LDL001",
    landlord_id: ls.landlordId || "LDL001",
    startDate: ls.startDate || "",
    start_date: ls.startDate || "",
    endDate: ls.endDate || "",
    end_date: ls.endDate || "",
    monthlyRent: Number(ls.monthlyRent || 0),
    monthly_rent: Number(ls.monthlyRent || 0),
    depositAmount: Number(ls.depositAmount || 0),
    deposit_amount: Number(ls.depositAmount || 0),
    status: ls.status || "Active",
    paymentCycle: ls.paymentCycle || "Monthly",
    payment_cycle: ls.paymentCycle || "Monthly",
    termMonths: ls.termMonths || 11,
    term_months: ls.termMonths || 11,
    agreementDoc: ls.agreementDoc || "",
    agreement_doc: ls.agreementDoc || "",
  }));
  await Lease.deleteMany({});
  await Lease.insertMany(formattedLeases);

  // 6. Seed Payments
  const formattedPayments = PAYMENTS.map((py) => ({
    id: py.id,
    tenantId: py.tenantId,
    tenant_id: py.tenantId,
    propertyId: py.propertyId,
    property_id: py.propertyId,
    tenantName: py.tenantName || "",
    tenant_name: py.tenantName || "",
    propertyName: py.propertyName || "",
    property_name: py.propertyName || "",
    month: py.month || "",
    amount: Number(py.amount || 0),
    status: py.status || "Paid",
    date: py.date || "",
    dueDate: py.dueDate || "",
    due_date: py.dueDate || "",
    paidDate: py.paidDate || py.date || "",
    paid_date: py.paidDate || py.date || "",
    method: py.method || "UPI",
    invoiceNo: py.invoiceNo || `INV-${py.id}`,
    invoice_no: py.invoiceNo || `INV-${py.id}`,
    receiptUrl: py.receiptUrl || "",
    receipt_url: py.receiptUrl || "",
  }));
  await Payment.deleteMany({});
  await Payment.insertMany(formattedPayments);

  // 7. Seed Maintenance Requests
  const formattedMaintenance = MAINTENANCE_REQUESTS.map((m) => ({
    id: m.id,
    propertyId: m.propertyId,
    property_id: m.propertyId,
    tenantId: m.tenantId,
    tenant_id: m.tenantId,
    title: m.title || m.issue || "Maintenance Ticket",
    description: m.description || m.issue || "",
    category: m.category || "General",
    priority: m.priority || "Medium",
    status: m.status || "Open",
    date: m.date || "",
    assignedTo: m.assignedTo || null,
    assigned_to: m.assignedTo || null,
    estimatedCost: Number(m.estimatedCost || 0),
    estimated_cost: Number(m.estimatedCost || 0),
  }));
  await MaintenanceRequest.deleteMany({});
  await MaintenanceRequest.insertMany(formattedMaintenance);

  // 8. Seed Security Deposits
  const formattedDeposits = SECURITY_DEPOSITS.map((d) => ({
    id: d.id,
    tenantId: d.tenantId,
    tenant_id: d.tenantId,
    propertyId: d.propertyId,
    property_id: d.propertyId,
    amount: Number(d.amount || 0),
    status: d.status || "Held in Escrow",
    dateReceived: d.dateReceived || "",
    date_received: d.dateReceived || "",
    returnStatus: d.returnStatus || "Not Applicable",
    return_status: d.returnStatus || "Not Applicable",
    refundAmount: Number(d.refundAmount || 0),
    refund_amount: Number(d.refundAmount || 0),
  }));
  await SecurityDeposit.deleteMany({});
  await SecurityDeposit.insertMany(formattedDeposits);

  // 9. Seed Utility Bills
  const formattedUtility = UTILITY_BILLS.map((u) => ({
    id: u.id,
    propertyId: u.propertyId,
    property_id: u.propertyId,
    tenantId: u.tenantId,
    tenant_id: u.tenantId,
    type: u.type || "Electricity",
    amount: Number(u.amount || 0),
    billDate: u.billDate || "",
    bill_date: u.billDate || "",
    dueDate: u.dueDate || "",
    due_date: u.dueDate || "",
    status: u.status || "Paid",
  }));
  await UtilityBill.deleteMany({});
  await UtilityBill.insertMany(formattedUtility);

  // 10. Seed Expenses
  const formattedExpenses = EXPENSES.map((e) => ({
    id: e.id,
    propertyId: e.propertyId,
    property_id: e.propertyId,
    category: e.category || "Maintenance",
    amount: Number(e.amount || 0),
    description: e.description || "",
    date: e.date || "",
    paidTo: e.paidTo || "",
    paid_to: e.paidTo || "",
  }));
  await Expense.deleteMany({});
  await Expense.insertMany(formattedExpenses);

  // 11. Seed Complaints
  const formattedComplaints = COMPLAINTS.map((c) => ({
    id: c.id,
    tenantId: c.tenantId || null,
    tenant_id: c.tenantId || null,
    tenantName: c.tenantName || c.tenant_name || "Tenant",
    tenant_name: c.tenantName || c.tenant_name || "Tenant",
    propertyId: c.propertyId || null,
    property_id: c.propertyId || null,
    property: c.propertyName || c.property || "Apartment",
    propertyName: c.propertyName || c.property || "Apartment",
    subject: c.subject || c.issue || "Complaint",
    issue: c.issue || c.subject || "Complaint",
    priority: c.priority || "Medium",
    status: c.status || "Open",
    date: c.date || "",
  }));
  await Complaint.deleteMany({});
  await Complaint.insertMany(formattedComplaints);

  // 12. Seed Documents
  const formattedDocs = DOCUMENTS.map((doc) => ({
    id: doc.id,
    name: doc.name || doc.title || "Document",
    title: doc.title || doc.name || "Document",
    type: doc.type || "PDF",
    relatedTo: doc.relatedTo || "",
    propertyId: doc.propertyId || null,
    property_id: doc.propertyId || null,
    tenantId: doc.tenantId || null,
    tenant_id: doc.tenantId || null,
    url: doc.url || "",
    uploadedOn: doc.uploadedOn || doc.uploadedAt || "",
    uploadedAt: doc.uploadedAt || doc.uploadedOn || "",
    uploaded_at: doc.uploadedAt || doc.uploadedOn || "",
    status: doc.status || "Verified",
  }));
  await Document.deleteMany({});
  await Document.insertMany(formattedDocs);

  // 13. Seed Notifications
  const formattedNotifications = NOTIFICATIONS.map((n) => ({
    id: n.id,
    userId: n.userId || null,
    user_id: n.userId || null,
    title: n.title || n.textKey || "Notification",
    message: n.message || n.meta || "",
    textKey: n.textKey || "",
    meta: n.meta || "",
    time: n.time || "",
    type: n.type || "info",
    isRead: Boolean(n.isRead),
    is_read: Boolean(n.isRead),
  }));
  await Notification.deleteMany({});
  await Notification.insertMany(formattedNotifications);

  console.log(
    "✅ Finished populating all 13 MongoDB collections successfully!",
  );
  console.log(
    "👉 In MongoDB Compass, connect to 'mongodb://127.0.0.1:27017' and click on 'propconnect_db' to see all collections!",
  );
}

// Standalone execution: node seed.js
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("seed.js")
) {
  try {
    const conn = await connectMongoDB();
    if (conn) {
      await seedAllData();
      process.exit(0);
    } else {
      console.warn("⚠️ Cannot seed: MongoDB connection is not active.");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}
