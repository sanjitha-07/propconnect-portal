// src/utils/apiClient.js
// Client interface to the Tenant & Landlord Management System REST API / MongoDB Backend

const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message || errJson.error) errorMsg = errJson.message || errJson.error;
    } catch {}
    throw new Error(errorMsg);
  }
  return await res.json();
}

// -------------------------------------------------------------
// Database Health & Live Status
// -------------------------------------------------------------
export async function fetchDbStatus() {
  try {
    return await request("/db/status");
  } catch (err) {
    return {
      status: "offline",
      readyState: "offline",
      engine: "MongoDB Compass",
      compassUri: "mongodb://127.0.0.1:27017",
      database: "propconnect_db",
      error: err.message,
    };
  }
}

export async function fetchStats() {
  try {
    return await request("/stats");
  } catch (err) {
    return null;
  }
}

export async function executeMongoQuery(payload) {
  try {
    const body = typeof payload === "string" ? { query: payload } : payload;
    return await request("/db/query", { method: "POST", body });
  } catch (err) {
    return { success: false, error: err.message };
  }
}
export const executeSqlQuery = executeMongoQuery;

// -------------------------------------------------------------
// Properties CRUD
// -------------------------------------------------------------
export async function fetchProperties() {
  try {
    return await request("/properties");
  } catch (err) {
    console.warn("fetchProperties fallback to local:", err.message);
    return null;
  }
}

export async function fetchPropertyById(id) {
  try {
    return await request(`/properties/${id}`);
  } catch (err) {
    return null;
  }
}

export async function createProperty(propertyData) {
  try {
    return await request("/properties", { method: "POST", body: propertyData });
  } catch (err) {
    console.warn("createProperty offline fallback:", err.message);
    return { ...propertyData, id: propertyData.id || `TN_${Date.now()}` };
  }
}

export async function updateProperty(id, propertyData) {
  try {
    return await request(`/properties/${id}`, { method: "PUT", body: propertyData });
  } catch (err) {
    console.warn("updateProperty offline fallback:", err.message);
    return { ...propertyData, id };
  }
}

export async function deleteProperty(id) {
  try {
    return await request(`/properties/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteProperty offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Tenants CRUD
// -------------------------------------------------------------
export async function fetchTenants() {
  try {
    return await request("/tenants");
  } catch (err) {
    console.warn("fetchTenants fallback to local:", err.message);
    return null;
  }
}

export async function createTenant(tenantData) {
  try {
    return await request("/tenants", { method: "POST", body: tenantData });
  } catch (err) {
    console.warn("createTenant offline fallback:", err.message);
    return { ...tenantData, id: tenantData.id || `TEN_${Date.now()}` };
  }
}

export async function updateTenant(id, tenantData) {
  try {
    return await request(`/tenants/${id}`, { method: "PUT", body: tenantData });
  } catch (err) {
    console.warn("updateTenant offline fallback:", err.message);
    return { ...tenantData, id };
  }
}

export async function deleteTenant(id) {
  try {
    return await request(`/tenants/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteTenant offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Landlords CRUD
// -------------------------------------------------------------
export async function fetchLandlords() {
  try {
    return await request("/landlords");
  } catch (err) {
    console.warn("fetchLandlords fallback to local:", err.message);
    return null;
  }
}

export async function createLandlord(landlordData) {
  try {
    return await request("/landlords", { method: "POST", body: landlordData });
  } catch (err) {
    console.warn("createLandlord offline fallback:", err.message);
    return { ...landlordData, id: landlordData.id || `LDL_${Date.now()}` };
  }
}

export async function updateLandlord(id, landlordData) {
  try {
    return await request(`/landlords/${id}`, { method: "PUT", body: landlordData });
  } catch (err) {
    console.warn("updateLandlord offline fallback:", err.message);
    return { ...landlordData, id };
  }
}

export async function deleteLandlord(id) {
  try {
    return await request(`/landlords/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteLandlord offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Leases CRUD
// -------------------------------------------------------------
export async function fetchLeases() {
  try {
    return await request("/leases");
  } catch (err) {
    console.warn("fetchLeases fallback to local:", err.message);
    return null;
  }
}

export async function createLease(leaseData) {
  try {
    return await request("/leases", { method: "POST", body: leaseData });
  } catch (err) {
    console.warn("createLease offline fallback:", err.message);
    return { ...leaseData, id: leaseData.id || `LSE_${Date.now()}` };
  }
}

export async function updateLease(id, leaseData) {
  try {
    return await request(`/leases/${id}`, { method: "PUT", body: leaseData });
  } catch (err) {
    console.warn("updateLease offline fallback:", err.message);
    return { ...leaseData, id };
  }
}

export async function deleteLease(id) {
  try {
    return await request(`/leases/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteLease offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Payments CRUD
// -------------------------------------------------------------
export async function fetchPayments(tenantId) {
  try {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    return await request(`/payments${query}`);
  } catch (err) {
    console.warn("fetchPayments fallback to local:", err.message);
    return null;
  }
}

export async function createPayment(paymentData) {
  try {
    return await request("/payments", { method: "POST", body: paymentData });
  } catch (err) {
    console.warn("createPayment offline fallback:", err.message);
    return { ...paymentData, id: paymentData.id || `PAY_${Date.now()}` };
  }
}

export async function updatePayment(id, paymentData) {
  try {
    return await request(`/payments/${id}`, { method: "PUT", body: paymentData });
  } catch (err) {
    console.warn("updatePayment offline fallback:", err.message);
    return { ...paymentData, id };
  }
}

export async function deletePayment(id) {
  try {
    return await request(`/payments/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deletePayment offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Maintenance Requests CRUD
// -------------------------------------------------------------
export async function fetchMaintenance() {
  try {
    return await request("/maintenance");
  } catch (err) {
    console.warn("fetchMaintenance fallback to local:", err.message);
    return null;
  }
}

export async function createMaintenanceRequest(ticketData) {
  try {
    return await request("/maintenance", { method: "POST", body: ticketData });
  } catch (err) {
    console.warn("createMaintenanceRequest offline fallback:", err.message);
    return { ...ticketData, id: ticketData.id || `MNT_${Date.now()}` };
  }
}

export async function updateMaintenanceRequest(id, ticketData) {
  try {
    return await request(`/maintenance/${id}`, { method: "PUT", body: ticketData });
  } catch (err) {
    console.warn("updateMaintenanceRequest offline fallback:", err.message);
    return { ...ticketData, id };
  }
}

export async function deleteMaintenanceRequest(id) {
  try {
    return await request(`/maintenance/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteMaintenanceRequest offline fallback:", err.message);
    return { success: true, id };
  }
}
export const createMaintenance = createMaintenanceRequest;
export const updateMaintenance = updateMaintenanceRequest;
export const deleteMaintenance = deleteMaintenanceRequest;

// -------------------------------------------------------------
// Complaints CRUD
// -------------------------------------------------------------
export async function fetchComplaints() {
  try {
    return await request("/complaints");
  } catch (err) {
    console.warn("fetchComplaints fallback to local:", err.message);
    return null;
  }
}

export async function createComplaint(complaintData) {
  try {
    return await request("/complaints", { method: "POST", body: complaintData });
  } catch (err) {
    console.warn("createComplaint offline fallback:", err.message);
    return { ...complaintData, id: complaintData.id || `CMP_${Date.now()}` };
  }
}

export async function updateComplaint(id, complaintData) {
  try {
    return await request(`/complaints/${id}`, { method: "PUT", body: complaintData });
  } catch (err) {
    console.warn("updateComplaint offline fallback:", err.message);
    return { ...complaintData, id };
  }
}

export async function deleteComplaint(id) {
  try {
    return await request(`/complaints/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteComplaint offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Security Deposits CRUD
// -------------------------------------------------------------
export async function fetchDeposits() {
  try {
    return await request("/deposits");
  } catch (err) {
    console.warn("fetchDeposits fallback to local:", err.message);
    return null;
  }
}

export async function createDeposit(depositData) {
  try {
    return await request("/deposits", { method: "POST", body: depositData });
  } catch (err) {
    console.warn("createDeposit offline fallback:", err.message);
    return { ...depositData, id: depositData.id || `DEP_${Date.now()}` };
  }
}

export async function updateDeposit(id, depositData) {
  try {
    return await request(`/deposits/${id}`, { method: "PUT", body: depositData });
  } catch (err) {
    console.warn("updateDeposit offline fallback:", err.message);
    return { ...depositData, id };
  }
}

export async function deleteDeposit(id) {
  try {
    return await request(`/deposits/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteDeposit offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Utility Bills CRUD
// -------------------------------------------------------------
export async function fetchUtilityBills() {
  try {
    return await request("/utility-bills");
  } catch (err) {
    console.warn("fetchUtilityBills fallback to local:", err.message);
    return null;
  }
}

export async function createUtilityBill(billData) {
  try {
    return await request("/utility-bills", { method: "POST", body: billData });
  } catch (err) {
    console.warn("createUtilityBill offline fallback:", err.message);
    return { ...billData, id: billData.id || `UB_${Date.now()}` };
  }
}

export async function updateUtilityBill(id, billData) {
  try {
    return await request(`/utility-bills/${id}`, { method: "PUT", body: billData });
  } catch (err) {
    console.warn("updateUtilityBill offline fallback:", err.message);
    return { ...billData, id };
  }
}

export async function deleteUtilityBill(id) {
  try {
    return await request(`/utility-bills/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteUtilityBill offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Expenses CRUD
// -------------------------------------------------------------
export async function fetchExpenses() {
  try {
    return await request("/expenses");
  } catch (err) {
    console.warn("fetchExpenses fallback to local:", err.message);
    return null;
  }
}

export async function createExpense(expenseData) {
  try {
    return await request("/expenses", { method: "POST", body: expenseData });
  } catch (err) {
    console.warn("createExpense offline fallback:", err.message);
    return { ...expenseData, id: expenseData.id || `EXP_${Date.now()}` };
  }
}

export async function updateExpense(id, expenseData) {
  try {
    return await request(`/expenses/${id}`, { method: "PUT", body: expenseData });
  } catch (err) {
    console.warn("updateExpense offline fallback:", err.message);
    return { ...expenseData, id };
  }
}

export async function deleteExpense(id) {
  try {
    return await request(`/expenses/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteExpense offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Documents CRUD
// -------------------------------------------------------------
export async function fetchDocuments() {
  try {
    return await request("/documents");
  } catch (err) {
    console.warn("fetchDocuments fallback to local:", err.message);
    return null;
  }
}

export async function createDocument(docData) {
  try {
    return await request("/documents", { method: "POST", body: docData });
  } catch (err) {
    console.warn("createDocument offline fallback:", err.message);
    return { ...docData, id: docData.id || `DOC_${Date.now()}` };
  }
}

export async function updateDocument(id, docData) {
  try {
    return await request(`/documents/${id}`, { method: "PUT", body: docData });
  } catch (err) {
    console.warn("updateDocument offline fallback:", err.message);
    return { ...docData, id };
  }
}

export async function deleteDocument(id) {
  try {
    return await request(`/documents/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("deleteDocument offline fallback:", err.message);
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Notifications
// -------------------------------------------------------------
export async function fetchNotifications() {
  try {
    return await request("/notifications");
  } catch (err) {
    return null;
  }
}

export async function markNotificationAsRead(id) {
  try {
    return await request(`/notifications/${id}/read`, { method: "PUT" });
  } catch (err) {
    return { success: true, id };
  }
}

// -------------------------------------------------------------
// Tenant Preference Discovery & Smart Matching API
// -------------------------------------------------------------
export async function matchProperties(preferences) {
  try {
    const res = await request("/properties/match", { method: "POST", body: preferences });
    return res.properties || [];
  } catch (err) {
    console.warn("matchProperties API error, fallback to client matching:", err.message);
    return null;
  }
}

export async function fetchTenantPreferences(userId) {
  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const res = await request(`/preferences${query}`);
    return res.preference || null;
  } catch (err) {
    // Check localStorage
    try {
      const saved = localStorage.getItem(`propconnect_pref_${userId || "current"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }
}

export async function saveTenantPreferences(preferences) {
  try {
    const res = await request("/preferences", { method: "POST", body: preferences });
    if (preferences.userId) {
      localStorage.setItem(`propconnect_pref_${preferences.userId}`, JSON.stringify(res.preference || preferences));
    }
    return res.preference;
  } catch (err) {
    if (preferences.userId) {
      localStorage.setItem(`propconnect_pref_${preferences.userId}`, JSON.stringify(preferences));
    }
    return preferences;
  }
}

// -------------------------------------------------------------
// Property-Aware Chat & Inquiry Assistance
// -------------------------------------------------------------
export async function askPropertyQuestion(propertyId, payload) {
  try {
    return await request(`/property-chat/${propertyId}/ask`, {
      method: "POST",
      body: payload,
    });
  } catch (err) {
    console.warn("askPropertyQuestion offline fallback:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function fetchPropertyChatHistory(propertyId, userId) {
  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const res = await request(`/property-chat/${propertyId}${query}`);
    return res.messages || [];
  } catch (err) {
    try {
      const cached = localStorage.getItem(`propconnect_chat_${propertyId}_${userId || "current"}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

export async function fetchRecentPropertyChats(userId) {
  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const res = await request(`/property-chat${query}`);
    return res.chats || [];
  } catch (err) {
    return [];
  }
}

// -------------------------------------------------------------
// Enquiries & Visit Bookings
// -------------------------------------------------------------
export async function createEnquiry(enquiryData) {
  try {
    return await request("/enquiries", { method: "POST", body: enquiryData });
  } catch (err) {
    console.warn("createEnquiry offline fallback:", err.message);
    return {
      success: true,
      enquiry: { ...enquiryData, id: `ENQ_${Date.now()}` },
    };
  }
}

export async function fetchEnquiries() {
  try {
    return await request("/enquiries");
  } catch (err) {
    return [];
  }
}

// -------------------------------------------------------------
// Authentication & Tenant Registration
// -------------------------------------------------------------
export async function registerTenant(tenantData) {
  try {
    return await request("/auth/register", {
      method: "POST",
      body: tenantData,
    });
  } catch (err) {
    return {
      success: false,
      message: err.message || "Failed to register tenant account",
    };
  }
}

// -------------------------------------------------------------
// Property Media & Gallery API
// -------------------------------------------------------------
export async function fetchPropertyImages(propertyId) {
  try {
    const res = await request(`/properties/${propertyId}/images`);
    return res.images || [];
  } catch (err) {
    console.warn("fetchPropertyImages fallback:", err.message);
    return [];
  }
}

// -------------------------------------------------------------
// Favorites / Saved Properties (Database-backed)
// -------------------------------------------------------------
export async function fetchFavorites(userId) {
  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const res = await request(`/favorites${query}`);
    return {
      propertyIds: res.propertyIds || [],
      favorites: res.favorites || [],
      properties: res.properties || [],
    };
  } catch (err) {
    console.warn("fetchFavorites fallback:", err.message);
    try {
      const stored = localStorage.getItem("propconnect_saved_favorites");
      const ids = stored ? JSON.parse(stored) : [];
      return { propertyIds: ids, favorites: [], properties: [] };
    } catch {
      return { propertyIds: [], favorites: [], properties: [] };
    }
  }
}

export async function toggleFavoriteApi(userId, propertyId, action) {
  try {
    const res = await request("/favorites", {
      method: "POST",
      body: { userId, propertyId, action },
    });
    return res;
  } catch (err) {
    console.warn("toggleFavoriteApi offline fallback:", err.message);
    return { success: false, error: err.message };
  }
}

export async function removeFavoriteApi(userId, propertyId) {
  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return await request(`/favorites/${propertyId}${query}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("removeFavoriteApi offline fallback:", err.message);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// System & User Theme & Customization Settings API
// -------------------------------------------------------------
export async function fetchThemeSettings() {
  try {
    const res = await request("/settings/theme");
    return res.settings || null;
  } catch (err) {
    console.warn("fetchThemeSettings offline fallback:", err.message);
    return null;
  }
}

export async function saveThemeSettings(settingsData) {
  try {
    const res = await request("/settings/theme", {
      method: "PUT",
      body: settingsData,
    });
    return res;
  } catch (err) {
    console.warn("saveThemeSettings offline fallback:", err.message);
    return { success: false, error: err.message };
  }
}

export async function fetchUserSettings(userId) {
  try {
    const res = await request(`/settings/user/${encodeURIComponent(userId)}`);
    return res.settings || null;
  } catch (err) {
    console.warn("fetchUserSettings offline fallback:", err.message);
    return null;
  }
}

export async function saveUserSettings(userId, settingsData) {
  try {
    const res = await request(`/settings/user/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: settingsData,
    });
    return res;
  } catch (err) {
    console.warn("saveUserSettings offline fallback:", err.message);
    return { success: false, error: err.message };
  }
}

