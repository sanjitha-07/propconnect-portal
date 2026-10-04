import mongoose from "mongoose";

const defaultOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      if (!ret.id && ret._id) {
        ret.id = ret._id.toString();
      }
      return ret;
    },
  },
  toObject: { virtuals: true },
};

// 1. User Model
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "landlord", "tenant"], default: "tenant" },
    name: { type: String, required: true },
    entity_id: { type: String, default: null },
    entityId: { type: String, default: null },
    location: { type: String, default: "Tamil Nadu, India" },
  },
  defaultOptions
);

// 2. Landlord Model
const landlordSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    status: { type: String, default: "Verified" },
    propertiesCount: { type: Number, default: 0 },
    properties_count: { type: Number, default: 0 },
    totalUnits: { type: Number, default: 0 },
    total_units: { type: Number, default: 0 },
  },
  defaultOptions
);

// 3. Tenant Model
const tenantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    leaseId: { type: String, default: null },
    lease_id: { type: String, default: null },
    location: { type: String, default: "" },
    company: { type: String, default: "" },
    status: { type: String, default: "Active" },
  },
  defaultOptions
);

// 4. Property Model
const propertySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    building: { type: String, default: "" },
    unit: { type: String, default: "" },
    address: { type: String, default: "" },
    location: { type: String, default: "" },
    locality: { type: String, default: "" },
    city: { type: String, default: "Chennai" },
    district: { type: String, default: "Chennai" },
    state: { type: String, default: "Tamil Nadu" },
    type: { type: String, default: "Apartment" },
    rent: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    status: { type: String, default: "Available" },
    landlordId: { type: String, default: "LDL001" },
    landlord_id: { type: String, default: "LDL001" },
    tenantId: { type: String, default: null },
    tenant_id: { type: String, default: null },
    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    balconies: { type: Number, default: 1 },
    sqft: { type: Number, default: 500 },
    furnishing: { type: String, default: "Unfurnished" },
    floor: { type: String, default: "1st" },
    facing: { type: String, default: "East (Vastu Compliant)" },
    parking: { type: String, default: "Covered Car Parking" },
    amenities: { type: [String], default: [] },
    nearbyFacilities: { type: [String], default: [] },
    description: { type: String, default: "" },
    petFriendly: { type: Boolean, default: false },
    availableUnits: { type: Number, default: 1 },
    totalUnits: { type: Number, default: 1 },
    builder: { type: String, default: "" },
    image: { type: String, default: "" },
    images: {
      type: [
        {
          id: { type: String, default: "" },
          url: { type: String, required: true },
          category: { type: String, default: "Exterior" },
          caption: { type: String, default: "" },
          order: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
  },
  defaultOptions
);

// 5. Lease Model
const leaseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    tenantId: { type: String, default: null },
    tenant_id: { type: String, default: null },
    landlordId: { type: String, default: "LDL001" },
    landlord_id: { type: String, default: "LDL001" },
    startDate: { type: String, default: "" },
    start_date: { type: String, default: "" },
    endDate: { type: String, default: "" },
    end_date: { type: String, default: "" },
    monthlyRent: { type: Number, default: 0 },
    monthly_rent: { type: Number, default: 0 },
    depositAmount: { type: Number, default: 0 },
    deposit_amount: { type: Number, default: 0 },
    status: { type: String, default: "Active" },
    paymentCycle: { type: String, default: "Monthly" },
    payment_cycle: { type: String, default: "Monthly" },
    termMonths: { type: Number, default: 11 },
    term_months: { type: Number, default: 11 },
    agreementDoc: { type: String, default: "" },
    agreement_doc: { type: String, default: "" },
  },
  defaultOptions
);

// 6. Payment Model
const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, default: null },
    tenant_id: { type: String, default: null },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    tenantName: { type: String, default: "" },
    tenant_name: { type: String, default: "" },
    propertyName: { type: String, default: "" },
    property_name: { type: String, default: "" },
    month: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    status: { type: String, default: "Paid" },
    date: { type: String, default: "" },
    dueDate: { type: String, default: "" },
    due_date: { type: String, default: "" },
    paidDate: { type: String, default: "" },
    paid_date: { type: String, default: "" },
    method: { type: String, default: "UPI" },
    invoiceNo: { type: String, default: "" },
    invoice_no: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    receipt_url: { type: String, default: "" },
  },
  defaultOptions
);

// 7. Maintenance Request Model
const maintenanceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    tenantId: { type: String, default: "TEN001" },
    tenant_id: { type: String, default: "TEN001" },
    title: { type: String, default: "Maintenance Ticket" },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    priority: { type: String, default: "Medium" },
    status: { type: String, default: "Open" },
    date: { type: String, default: "" },
    assignedTo: { type: String, default: null },
    assigned_to: { type: String, default: null },
    estimatedCost: { type: Number, default: 0 },
    estimated_cost: { type: Number, default: 0 },
  },
  defaultOptions
);

// 8. Complaint Model
const complaintSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, default: null },
    tenant_id: { type: String, default: null },
    tenantName: { type: String, default: "Tenant" },
    tenant_name: { type: String, default: "Tenant" },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    property: { type: String, default: "Apartment" },
    propertyName: { type: String, default: "Apartment" },
    subject: { type: String, default: "" },
    issue: { type: String, default: "Complaint" },
    priority: { type: String, default: "Medium" },
    status: { type: String, default: "Open" },
    date: { type: String, default: "" },
  },
  defaultOptions
);

// 9. Security Deposit Model
const depositSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, default: null },
    tenant_id: { type: String, default: null },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    amount: { type: Number, default: 0 },
    status: { type: String, default: "Held in Escrow" },
    dateReceived: { type: String, default: "" },
    date_received: { type: String, default: "" },
    returnStatus: { type: String, default: "Not Applicable" },
    return_status: { type: String, default: "Not Applicable" },
    refundAmount: { type: Number, default: 0 },
    refund_amount: { type: Number, default: 0 },
  },
  defaultOptions
);

// 10. Utility Bill Model
const utilityBillSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    tenantId: { type: String, default: null },
    tenant_id: { type: String, default: null },
    type: { type: String, default: "Electricity" },
    amount: { type: Number, default: 0 },
    billDate: { type: String, default: "" },
    bill_date: { type: String, default: "" },
    dueDate: { type: String, default: "" },
    due_date: { type: String, default: "" },
    status: { type: String, default: "Paid" },
  },
  defaultOptions
);

// 11. Expense Model
const expenseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    category: { type: String, default: "Maintenance" },
    amount: { type: Number, default: 0 },
    description: { type: String, default: "" },
    date: { type: String, default: "" },
    paidTo: { type: String, default: "" },
    paid_to: { type: String, default: "" },
  },
  defaultOptions
);

// 12. Document Model
const documentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, default: "Document" },
    title: { type: String, default: "Document" },
    type: { type: String, default: "PDF" },
    relatedTo: { type: String, default: "" },
    propertyId: { type: String, default: null },
    property_id: { type: String, default: null },
    tenantId: { type: String, default: null },
    tenant_id: { type: String, default: null },
    url: { type: String, default: "" },
    uploadedOn: { type: String, default: "" },
    uploadedAt: { type: String, default: "" },
    uploaded_at: { type: String, default: "" },
    status: { type: String, default: "Verified" },
  },
  defaultOptions
);

// 13. Notification Model
const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, default: null },
    user_id: { type: String, default: null },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    textKey: { type: String, default: "" },
    meta: { type: String, default: "" },
    time: { type: String, default: "" },
    type: { type: String, default: "info" },
    isRead: { type: Boolean, default: false },
    is_read: { type: Boolean, default: false },
  },
  defaultOptions
);

// 14. Tenant Preference Model (Find Your Home / Discovery Flow)
const tenantPreferenceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    user_id: { type: String, default: null },
    city: { type: String, default: "Chennai" },
    locality: { type: String, default: "" },
    propertyType: { type: String, default: "Apartment" },
    bhk: { type: String, default: "2" },
    familyMembers: { type: Number, default: 2 },
    budgetRange: { type: String, default: "₹20,000–₹30,000" },
    budgetMin: { type: Number, default: 20000 },
    budgetMax: { type: Number, default: 30000 },
    furnishing: { type: String, default: "No preference" },
    amenities: { type: [String], default: [] },
    nearby: { type: [String], default: [] },
    maxDistance: { type: String, default: "Any distance" },
    additionalRequirements: { type: String, default: "" },
  },
  defaultOptions
);

// 15. Property-Aware Chat Conversation Model
const propertyChatSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    propertyId: { type: String, required: true, index: true },
    propertyName: { type: String, default: "" },
    language: { type: String, default: "en" },
    messages: [
      {
        sender: { type: String, enum: ["user", "assistant"], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        language: { type: String, default: "en" },
      },
    ],
    lastMessage: { type: String, default: "" },
  },
  defaultOptions
);

// 16. Landlord Enquiry & Visit Booking Model
const enquirySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    propertyId: { type: String, required: true, index: true },
    propertyName: { type: String, default: "" },
    tenantId: { type: String, default: "" },
    tenantName: { type: String, default: "" },
    tenantEmail: { type: String, default: "" },
    tenantPhone: { type: String, default: "" },
    landlordId: { type: String, default: "LDL001" },
    type: { type: String, default: "Schedule Visit" },
    preferredDate: { type: String, default: "" },
    preferredTime: { type: String, default: "" },
    message: { type: String, default: "" },
    status: { type: String, default: "Pending" },
    date: { type: String, default: "" },
  },
  defaultOptions
);

// 17. Property Image Media Model
const propertyImageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    propertyId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    category: { type: String, default: "Exterior" },
    caption: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  defaultOptions
);

// 18. Saved / Favorite Property Model
const favoriteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    tenantId: { type: String, default: "" },
    propertyId: { type: String, required: true, index: true },
    propertyName: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  defaultOptions
);

export const User = mongoose.model("User", userSchema);
export const Landlord = mongoose.model("Landlord", landlordSchema);
export const Tenant = mongoose.model("Tenant", tenantSchema);
export const Property = mongoose.model("Property", propertySchema);
export const Lease = mongoose.model("Lease", leaseSchema);
export const Payment = mongoose.model("Payment", paymentSchema);
export const MaintenanceRequest = mongoose.model("MaintenanceRequest", maintenanceSchema);
export const Complaint = mongoose.model("Complaint", complaintSchema);
export const SecurityDeposit = mongoose.model("SecurityDeposit", depositSchema);
export const UtilityBill = mongoose.model("UtilityBill", utilityBillSchema);
// 19. System Settings (Global Organization Theme & Customization)
const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    primaryColor: { type: String, default: "#1976D2" },
    fontFamily: { type: String, default: "Inter" },
    language: { type: String, default: "en" },
    fontSize: { type: String, default: "medium" },
    themeMode: { type: String, default: "light" },
    appName: { type: String, default: "PropConnect Management System" },
    currency: { type: String, default: "INR" },
    dateFormat: { type: String, default: "DD/MM/YYYY" },
    role: { type: String, default: "admin" },
    updatedBy: { type: String, default: "admin" },
    updatedAt: { type: Date, default: Date.now },
  },
  defaultOptions
);

export const Expense = mongoose.model("Expense", expenseSchema);
export const Document = mongoose.model("Document", documentSchema);
export const Notification = mongoose.model("Notification", notificationSchema);
export const TenantPreference = mongoose.model("TenantPreference", tenantPreferenceSchema);
export const PropertyChat = mongoose.model("PropertyChat", propertyChatSchema);
export const Enquiry = mongoose.model("Enquiry", enquirySchema);
export const PropertyImage = mongoose.model("PropertyImage", propertyImageSchema);
export const Favorite = mongoose.model("Favorite", favoriteSchema);
export const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);

export const models = {
  users: User,
  landlords: Landlord,
  tenants: Tenant,
  properties: Property,
  leases: Lease,
  payments: Payment,
  maintenance_requests: MaintenanceRequest,
  complaints: Complaint,
  security_deposits: SecurityDeposit,
  utility_bills: UtilityBill,
  expenses: Expense,
  documents: Document,
  notifications: Notification,
  preferences: TenantPreference,
  property_chats: PropertyChat,
  enquiries: Enquiry,
  property_images: PropertyImage,
  favorites: Favorite,
  saved_properties: Favorite,
  system_settings: SystemSetting,
};
