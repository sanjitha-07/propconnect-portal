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
  ServiceProvider,
  PreferredProvider,
  FixItBooking,
  PropertyMaintenanceHistory,
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
  // 14. Seed FixIt Local Service Providers
  const fixitProviders = [
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
  await ServiceProvider.deleteMany({});
  await ServiceProvider.insertMany(fixitProviders);

  // 15. Seed Landlord Preferred Providers (Per Property & Category)
  const initialPreferred = [
    {
      id: "PREF_TN101_AC",
      propertyId: "TN101",
      landlordId: "LDL001",
      category: "AC",
      providerId: "PROV_AC_01",
      providerName: "Kumar AC Services",
      isSimulatedBusy: false,
      backupPolicy: "auto_recommend_fixit",
      customNotes: "Priority residential cooling contractor.",
    },
    {
      id: "PREF_TN101_EL",
      propertyId: "TN101",
      landlordId: "LDL001",
      category: "Electrical",
      providerId: "PROV_EL_01",
      providerName: "Suresh Electrical Works",
      isSimulatedBusy: false,
      backupPolicy: "auto_recommend_fixit",
      customNotes: "Handles all distribution board and inverter works.",
    },
    {
      id: "PREF_TN101_PL",
      propertyId: "TN101",
      landlordId: "LDL001",
      category: "Plumbing",
      providerId: "PROV_PL_01",
      providerName: "Raj Plumbing & Sanitary",
      isSimulatedBusy: false,
      backupPolicy: "auto_recommend_fixit",
      customNotes: "Emergency leakage contractor.",
    },
    {
      id: "PREF_TN101_CL",
      propertyId: "TN101",
      landlordId: "LDL001",
      category: "Cleaning",
      providerId: "PROV_CL_01",
      providerName: "CleanPro Facility Management",
      isSimulatedBusy: false,
      backupPolicy: "auto_recommend_fixit",
      customNotes: "Deep seasonal sanitation partner.",
    },
  ];
  await PreferredProvider.deleteMany({});
  await PreferredProvider.insertMany(initialPreferred);

  // 16. Seed Property Maintenance History Ledger (Exact Flat B-204 / Sai Kala #302 dataset)
  const initialHistory = [
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
  ];
  await PropertyMaintenanceHistory.deleteMany({});
  await PropertyMaintenanceHistory.insertMany(initialHistory);

  console.log(
    "✅ Finished populating all MongoDB collections + FixIt Local Unified Services & Maintenance Ledger successfully!",
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
