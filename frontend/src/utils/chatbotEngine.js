import {
  PAYMENTS,
  COMPLAINTS,
  MAINTENANCE_REQUESTS,
  LEASES,
  PROPERTIES,
  TENANTS,
  DOCUMENTS,
  SECURITY_DEPOSITS,
  UTILITY_BILLS,
  propertyById,
  tenantById,
  landlordById,
} from "../data/db.js";

function getUserEntityId(user) {
  return user?.entityId || user?.entity_id || (user?.role === "tenant" ? "TEN001" : "LDL001");
}

/* Restrict a flat list of records down to what this user is allowed to see, based on their role. */
function scopeToUser(records, user) {
  const entityId = getUserEntityId(user);
  if (user?.role === "tenant") {
    return records.filter((r) => r.tenantId === entityId || r.relatedTo === entityId);
  }
  if (user?.role === "landlord") {
    return records.filter((r) => r.property?.landlordId === entityId || r.landlordId === entityId || r.property?.landlordId === "LDL001");
  }
  return records; // admin sees everything
}

function withProperty(list) {
  return list.map((r) => ({ ...r, property: propertyById(r.propertyId) }));
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

// 1. Payments Handler
function handlePayments(user, t, isTamil) {
  const entityId = getUserEntityId(user);
  const myPayments = PAYMENTS.filter((p) => p.tenantId === entityId);
  const pending = myPayments.filter((p) => p.status !== "Paid");

  if (user?.role === "tenant") {
    if (pending.length === 0) {
      return isTamil
        ? "✅ உங்களுக்கு நிலுவைத் தொகை எதுவும் இல்லை! அனைத்து வாடகைக் கட்டணங்களும் செலுத்தப்பட்டுவிட்டன."
        : "✅ You have no pending payments! All your rent invoices are up to date.";
    }

    const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);
    const pendingLines = pending
      .map((p) => `• ${p.propertyName} (${p.month}): ${fmtMoney(p.amount)} — [${p.status}] (Due: ${p.dueDate || "05th"})`)
      .join("\n");

    const paidRecent = myPayments
      .filter((p) => p.status === "Paid")
      .slice(0, 3)
      .map((p) => `✓ ${p.propertyName} (${p.month}): ${fmtMoney(p.amount)} [Paid on ${p.paidDate || "03rd"}]`)
      .join("\n");

    return isTamil
      ? `💰 மொத்த நிலுவைத் தொகை: ${fmtMoney(totalPending)}\n\nநிலுவையில் உள்ள கட்டணங்கள்:\n${pendingLines}\n\nசமீபத்தில் செலுத்தப்பட்டவை:\n${paidRecent}`
      : `💰 Total Pending Amount: ${fmtMoney(totalPending)}\n\nPending Invoices:\n${pendingLines}\n\nRecent Paid Invoices:\n${paidRecent}\n\n👉 You can click "Pay Now" on the My Payments page to settle pending dues.`;
  }

  // For landlord / admin
  const scoped = scopeToUser(withProperty(PAYMENTS), user).filter((p) => p.status !== "Paid");
  if (scoped.length === 0) return t("botNoPendingPayments");

  const total = scoped.reduce((sum, p) => sum + p.amount, 0);
  const lines = scoped
    .slice(0, 6)
    .map((p) => `• ${p.id} — ${tenantById(p.tenantId)?.name || p.tenantName} (${p.month}): ${fmtMoney(p.amount)} [${p.status}]`)
    .join("\n");

  return `${t("botPendingPaymentsIntro")} ${fmtMoney(total)}\n\n${lines}`;
}

// 2. Rent Details Handler
function handleRentDetails(user, t, isTamil) {
  const entityId = getUserEntityId(user);
  const activeLease = LEASES.find((l) => l.tenantId === entityId && l.status === "Active") || LEASES.find((l) => l.tenantId === entityId);

  if (!activeLease) {
    return isTamil ? "செயலில் உள்ள வாடகை ஒப்பந்தம் கிடைக்கவில்லை." : "No active lease found for rent schedule.";
  }

  const prop = propertyById(activeLease.propertyId);
  const myPayments = PAYMENTS.filter((p) => p.tenantId === entityId);
  const currentPending = myPayments.find((p) => p.status !== "Paid");

  if (isTamil) {
    return `💰 வாடகை மற்றும் கட்டண அட்டவணை:
• குடியிருப்பு: ${prop?.name || activeLease.propertyName}
• மாத வாடகை: ${fmtMoney(activeLease.rent)}/மாதம்
• வாடகை செலுத்தும் தேதி: ஒவ்வொரு மாதமும் 5-ஆம் தேதிக்குள்
• தற்போதைய நிலை: ${currentPending ? `நிலுவை உள்ளது (${currentPending.month} - ${fmtMoney(currentPending.amount)})` : "அனைத்தும் செலுத்தப்பட்டுவிட்டது"}
• பாதுகாப்பு முன்பணம்: ${fmtMoney(activeLease.deposit)} (முழுமையாக செலுத்தப்பட்டது)`;
  }

  return `💰 Rent & Payment Schedule:
• Property: ${prop?.name || activeLease.propertyName}
• Monthly Rent: ${fmtMoney(activeLease.rent)}/month
• Due Date: On or before the 5th of every month
• Current Status: ${currentPending ? `Pending for ${currentPending.month} (${fmtMoney(currentPending.amount)})` : "All cleared!"}
• Security Deposit: ${fmtMoney(activeLease.deposit)} (Paid & held securely)`;
}

// 3. Property Details Handler (Tenant-Aware)
function handlePropertyDetails(user, t, isTamil) {
  const entityId = getUserEntityId(user);

  if (user?.role === "tenant") {
    const activeLease = LEASES.find((l) => l.tenantId === entityId && l.status === "Active") || LEASES.find((l) => l.tenantId === entityId);
    const prop = activeLease ? propertyById(activeLease.propertyId) : PROPERTIES.find((p) => p.tenantId === entityId);
    const landlord = prop ? landlordById(prop.landlordId) : null;
    const additionalUnits = LEASES.filter((l) => l.tenantId === entityId && l.id !== activeLease?.id && l.status === "Active");

    if (!prop) {
      return isTamil ? "உங்கள் சொத்து விவரங்கள் கிடைக்கவில்லை." : "Could not locate your assigned property records.";
    }

    const amenitiesList = prop.amenities ? prop.amenities.join(", ") : "Covered Parking, Lift, Metro Water";
    const extraUnitsText = additionalUnits.length > 0
      ? `\n• Additional Leased Units: ${additionalUnits.map((u) => u.propertyName).join(", ")}`
      : "";

    if (isTamil) {
      return `🏠 உங்கள் குடியிருப்பு சொத்து விவரங்கள்:
• சொத்து பெயர்: ${prop.name} (${prop.id})
• முகவரி: ${prop.location}
• வகை: ${prop.bedrooms ? `${prop.bedrooms} BHK` : "Residential"}, ${prop.area} sq.ft (${prop.furnishing})
• மாத வாடகை: ${fmtMoney(prop.rent)}/மாதம்
• பாதுகாப்பு முன்பணம்: ${fmtMoney(prop.deposit)}
• வீட்டு உரிமையாளர்: ${landlord?.name || "Karthik Raja"} (தொடர்பு: ${landlord?.phone || "98765 43210"})
• முக்கிய வசதிகள்: ${amenitiesList}${extraUnitsText}`;
    }

    return `🏠 Your Assigned Property Details:
• Property Name: ${prop.name} (${prop.id})
• Address: ${prop.location}
• Type & Size: ${prop.bedrooms ? `${prop.bedrooms} BHK` : "Residential"}, ${prop.area} sq.ft (${prop.furnishing})
• Monthly Rent: ${fmtMoney(prop.rent)}/mo
• Security Deposit: ${fmtMoney(prop.deposit)}
• Landlord: ${landlord?.name || "Karthik Raja"} (Phone: ${landlord?.phone || "98765 43210"}, Email: ${landlord?.email || "karthik.raja@mail.com"})
• Amenities: ${amenitiesList}${extraUnitsText}`;
  }

  // Landlord or Admin
  const scoped = user?.role === "landlord"
    ? PROPERTIES.filter((p) => p.landlordId === entityId || p.landlordId === "LDL001")
    : PROPERTIES;
  return `${t("botPropertyCountIntro")} ${scoped.length} (Occupied: ${scoped.filter((p) => p.status === "Occupied").length}, Available: ${scoped.filter((p) => p.status === "Available").length})`;
}

// 4. Landlord Info Handler
function handleLandlordInfo(user, t, isTamil) {
  const entityId = getUserEntityId(user);
  const lease = LEASES.find((l) => l.tenantId === entityId);
  const prop = lease ? propertyById(lease.propertyId) : PROPERTIES[0];
  const landlord = prop ? landlordById(prop.landlordId) : landlordById("LDL001");

  if (!landlord) {
    return isTamil ? "வீட்டு உரிமையாளர் விவரங்கள் கிடைக்கவில்லை." : "Landlord details unavailable.";
  }

  if (isTamil) {
    return `👤 உங்கள் வீட்டு உரிமையாளர் விவரங்கள்:
• பெயர்: ${landlord.name}
• தொலைபேசி: ${landlord.phone}
• மின்னஞ்சல்: ${landlord.email}
• இருப்பிடம்: ${landlord.location}
• போர்ட்டல் நிலை: சரிபார்க்கப்பட்டது (Verified)`;
  }

  return `👤 Landlord Contact Details:
• Name: ${landlord.name}
• Phone: ${landlord.phone}
• Email: ${landlord.email}
• Location: ${landlord.location}
• Status: Verified Property Owner`;
}

// 5. Utility Bills Handler
function handleUtilityBills(user, t, isTamil) {
  const myBills = UTILITY_BILLS.filter((b) => b.propertyId === "TN101");

  if (myBills.length === 0) {
    return isTamil ? "பயன்பாட்டு கட்டண விவரங்கள் எதுவும் இல்லை." : "No utility bills recorded.";
  }

  const billLines = myBills
    .slice(0, 5)
    .map((b) => `• ${b.type}: ${fmtMoney(b.amount)} — [${b.status}] (Due: ${b.dueDate})`)
    .join("\n");

  if (isTamil) {
    return `⚡ மின்சாரம் மற்றும் பயன்பாட்டுக் கட்டணங்கள் (TNEB & Water):
${billLines}
👉 மின் கட்டணத்தை TNEB இணையதளம் அல்லது போர்ட்டல் வழியாக செலுத்தலாம்.`;
  }

  return `⚡ Utility & Electricity (TNEB) Bills:
${billLines}
👉 Electricity payments are tracked through TNEB consumer connection.`;
}

// 6. Security Deposits Handler
function handleDeposits(user, t, isTamil) {
  const entityId = getUserEntityId(user);
  const deposits = SECURITY_DEPOSITS.filter((d) => d.tenantId === entityId);

  if (deposits.length === 0) {
    return isTamil ? "முன்பண விவரங்கள் எதுவும் கிடைக்கவில்லை." : "No security deposits on record.";
  }

  const total = deposits.reduce((sum, d) => sum + d.amount, 0);
  const lines = deposits
    .map((d) => `• ${d.description || "Security Deposit"}: ${fmtMoney(d.amount)} [${d.status}]`)
    .join("\n");

  if (isTamil) {
    return `🛡️ உங்கள் பாதுகாப்பு முன்பண விவரங்கள் (மொத்தம்: ${fmtMoney(total)}):
${lines}
✅ அனைத்து முன்பணங்களும் முறையாக பெறப்பட்டு பாதுகாக்கப்பட்டுள்ளன. குத்தகை முடிவில் திருப்பித் தரப்படும்.`;
  }

  return `🛡️ Security Deposit Summary (Total: ${fmtMoney(total)}):
${lines}
✅ All deposits are verified and held safely. Refundable upon lease completion as per rental terms.`;
}

// 7. Complaints Handler
function handleComplaints(user, t, isTamil) {
  const entityId = getUserEntityId(user);
  const myComplaints = COMPLAINTS.filter((c) => c.tenantId === entityId);

  if (myComplaints.length === 0) {
    return isTamil ? "✅ எந்தவொரு புகார்களும் நிலுவையில் இல்லை." : t("botNoUnresolvedComplaints");
  }

  const openList = myComplaints.filter((c) => c.status !== "Resolved");
  const resolvedList = myComplaints.filter((c) => c.status === "Resolved");

  const openLines = openList.length > 0
    ? openList.map((c) => `• ${c.id}: ${c.subject} [${c.status}]`).join("\n")
    : "None (All active complaints resolved!)";

  const resolvedLines = resolvedList
    .slice(0, 3)
    .map((c) => `✓ ${c.id}: ${c.subject} [Resolved]`)
    .join("\n");

  if (isTamil) {
    return `📋 உங்கள் புகார்கள் நிலை:
செயலில் உள்ள புகார்கள்:
${openLines}

தீர்க்கப்பட்டவை:
${resolvedLines}
👉 புதிய புகார் பதிவு செய்ய "My Complaints" பக்கத்தில் "+ New Complaint" கிளிக் செய்யவும்.`;
  }

  return `📋 Complaints Status:
Active / Unresolved:
${openLines}

Recently Resolved:
${resolvedLines}
👉 To lodge a new complaint, use "+ New Complaint" in the Complaints tab.`;
}

// 8. Maintenance Handler
function handleMaintenance(user, t, isTamil) {
  const entityId = getUserEntityId(user);
  const myMnt = MAINTENANCE_REQUESTS.filter((m) => m.tenantId === entityId);

  if (myMnt.length === 0) {
    return isTamil ? "✅ நிலுவையில் பராமரிப்பு கோரிக்கைகள் எதுவும் இல்லை." : t("botNoOpenMaintenance");
  }

  const pending = myMnt.filter((m) => m.status !== "Completed");
  const completed = myMnt.filter((m) => m.status === "Completed");

  const pendingLines = pending.length > 0
    ? pending.map((m) => `• ${m.id}: ${m.issueText} — Priority: ${m.priority} [${m.status}] (Raised: ${m.date})`).join("\n")
    : "None (All requests completed!)";

  const compLines = completed
    .slice(0, 3)
    .map((m) => `✓ ${m.id}: ${m.issueText} [Completed on ${m.date}]`)
    .join("\n");

  if (isTamil) {
    return `🔧 பராமரிப்பு கோரிக்கைகள்:
நிலுவையில் உள்ளவை:
${pendingLines}

முடிக்கப்பட்டவை:
${compLines}
👉 புதிய கோரிக்கைக்கு "My Maintenance" பக்கத்தில் "+ Raise Request" கிளிக் செய்யவும்.`;
  }

  return `🔧 Maintenance Requests Status:
Open / In Progress:
${pendingLines}

Recently Completed:
${compLines}
👉 You can raise new issues anytime from the My Maintenance page.`;
}

// 9. Lease Handler
function handleLease(user, t, isTamil) {
  const entityId = getUserEntityId(user);
  const myLeases = LEASES.filter((l) => l.tenantId === entityId);

  if (myLeases.length === 0) {
    return isTamil ? "உங்களுக்கான குத்தகை ஒப்பந்தம் கிடைக்கவில்லை." : t("botNoLease");
  }

  const active = myLeases.filter((l) => l.status === "Active");
  const completed = myLeases.filter((l) => l.status === "Completed");

  const activeLines = active
    .map((l) => `• ${l.id} (${l.propertyName}): ${fmtMoney(l.rent)}/mo | Valid: ${l.startDate} to ${l.endDate} [${l.status}]`)
    .join("\n");

  const pastLines = completed.length > 0
    ? `\nPast Leases:\n` + completed.map((l) => `• ${l.id} (${l.propertyName}): Valid: ${l.startDate} to ${l.endDate} [${l.status}]`).join("\n")
    : "";

  if (isTamil) {
    return `📄 உங்கள் குத்தகை விவரங்கள்:
செயலில் உள்ள குத்தகைகள்:
${activeLines}
${pastLines}`;
  }

  return `📄 Your Lease Agreements & Tenancy Records:
Active Leases:
${activeLines}
${pastLines}
👉 View full contract agreements on the My Lease page.`;
}

// 10. Documents Handler
function handleDocuments(user, t, isTamil) {
  const entityId = getUserEntityId(user);
  const docs = DOCUMENTS.filter((d) => d.relatedTo === entityId || d.relatedTo === "TN101");

  if (docs.length === 0) {
    return isTamil ? "ஆவணங்கள் எதுவும் பதிவு செய்யப்படவில்லை." : "No documents found on record.";
  }

  const lines = docs
    .slice(0, 6)
    .map((d) => `• ${d.name} (${d.type}) — [${d.status}]`)
    .join("\n");

  if (isTamil) {
    return `📄 சரிபார்க்கப்பட்ட ஆவணங்கள்:
${lines}
✅ அனைத்து ஆவணங்களும் வெற்றிகரமாக சரிபார்க்கப்பட்டுவிட்டன.`;
  }

  return `📄 Verified Documents On File:
${lines}
✅ All documents are fully verified in compliance with Tamil Nadu Tenancy guidelines.`;
}

// 11. Help / Capabilities
function handleHelp(user, t, isTamil) {
  if (isTamil) {
    return `🤖 நான் உங்களுக்கு உதவக்கூடிய பகுதிகள்:
1. 💰 வாடகை & நிலுவைத் தொகை ("வாடகை எவ்வளவு", "நிலுவை கட்டணம்")
2. 🏠 குடியிருப்பு விவரங்கள் ("எனது வீடு", "சொத்து விவரங்கள்")
3. 👤 வீட்டு உரிமையாளர் தொடர்பு ("உரிமையாளர் யார்", "தொலைபேசி எண்")
4. ⚡ மின் கட்டணம் & பயன்பாடுகள் ("TNEB பில்", "மின் கட்டணம்")
5. 🛡️ முன்பணம் ("பாதுகாப்பு முன்பணம்", "டெபாசிட்")
6. 🔧 பராமரிப்பு நிலை ("பராமரிப்பு கோரிக்கைகள்", "பழுது")
7. 📋 புகார்கள் ("புகார் நிலை", "தீர்க்கப்படாத புகார்கள்")
8. 📄 குத்தகை மற்றும் ஆவணங்கள் ("குத்தகை விவரங்கள்", "ஆவணங்கள்")`;
  }

  return `🤖 Here is what I can assist you with:
1. 💰 Rent & Dues — Ask "What is my rent?", "When is rent due?", or "What do I owe?"
2. 🏠 Property Details — Ask "What is my property?", "Flat details", or "Amenities"
3. 👤 Landlord Info — Ask "Who is my landlord?" or "Landlord contact phone"
4. ⚡ Utility & EB Bills — Ask "Show utility bills" or "Electricity TNEB bill"
5. 🛡️ Security Deposit — Ask "How much is my deposit?"
6. 🔧 Maintenance Requests — Ask "Any pending maintenance?" or "Fix status"
7. 📋 Complaints — Ask "What complaints are open?"
8. 📄 Lease & Documents — Ask "When does my lease end?" or "My KYC documents"`;
}

// Main Natural Language Dispatcher
export function getBotReply(rawQuery, user, t, lang = "en") {
  const q = (rawQuery || "").toLowerCase().trim();
  const isTamil = lang === "ta" || /[\u0B80-\u0BFF]/.test(rawQuery);

  // 1. Greetings
  if (/^(hi|hello|hey|vanakkam|good\s+morning|good\s+evening)\b/.test(q) || /(வணக்கம்|ஹலோ|காலை\s+வணக்கம்)/.test(q)) {
    return t("botGreeting");
  }

  // 2. Thanks
  if (/(thank|thanks|nandri|great|awesome)/.test(q) || /(நன்றி|மிக்க\s+நன்றி)/.test(q)) {
    return t("botThanks");
  }

  // 3. Help & Menu
  if (/(help|what can you do|menu|options|commands|guide|features)/.test(q) || /(உதவி|வழிகாட்ட|என்ன\s+செய்யலாம்)/.test(q)) {
    return handleHelp(user, t, isTamil);
  }

  // 4. Landlord / Owner queries
  if (/(landlord|owner|karthik|who is my landlord|landlord phone|landlord contact|owner contact|call landlord)/.test(q) || /(உரிமையாளர்|வீட்டு\s+உரிமையாளர்)/.test(q)) {
    return handleLandlordInfo(user, t, isTamil);
  }

  // 5. Utility Bills / Electricity / TNEB / Water
  if (/(utilit|electric|tneb|water bill|eb bill|metro water|power bill|eb charges)/.test(q) || /(மின்\s*கட்டணம்|மின்சாரம்|தண்ணீர்\s*பில்|பயன்பாடு)/.test(q)) {
    return handleUtilityBills(user, t, isTamil);
  }

  // 6. Security Deposits / Advance
  if (/(deposit|advance|caution deposit|security money|deposit receipt)/.test(q) || /(முன்பணம்|டெபாசிட்|காப்பீட்டுத்\s*தொகை)/.test(q)) {
    return handleDeposits(user, t, isTamil);
  }

  // 7. Rent queries specifically
  if (/(how much.*rent|what is my rent|rent amount|rent due|monthly rent|when.*rent)/.test(q) || /(வாடகை\s+எவ்வளவு|மாத\s+வாடகை|வாடகை\s+தேதி)/.test(q) || q === "rent" || q === "வாடகை") {
    return handleRentDetails(user, t, isTamil);
  }

  // 8. General Payments / Invoices / Outstanding / Owe
  if (/(pay|due|owe|outstanding|invoice|receipt|pending payment|how much.*pay)/.test(q) || /(கட்டணம்|நிலுவை|செலுத்த|பணம்|விலைப்பட்டியல்)/.test(q)) {
    return handlePayments(user, t, isTamil);
  }

  // 9. Maintenance / Repairs
  if (/(maintenance|repair|request|issue|plumb|tap|leak|wiring|ac|chimney|fan|lock)/.test(q) || /(பராமரிப்பு|பழுது|பிரச்சனை|கசிவு|மின்விசிறி)/.test(q)) {
    return handleMaintenance(user, t, isTamil);
  }

  // 10. Complaints
  if (/(complaint|grievance|dispute|noise|garbage|intercom)/.test(q) || /(புகார்|புகார்கள்)/.test(q)) {
    return handleComplaints(user, t, isTamil);
  }

  // 11. Documents / KYC / Agreements
  if (/(document|kyc|agreement|aadhaar|pan|id proof|verification)/.test(q) || /(ஆவணம்|ஆவணங்கள்|சான்றிதழ்|ஒப்பந்தம்)/.test(q)) {
    return handleDocuments(user, t, isTamil);
  }

  // 12. Lease specifics
  if (/(lease|contract|tenancy|renewal|expiry)/.test(q) || /(குத்தகை|குத்தகைக்காலம்)/.test(q)) {
    return handleLease(user, t, isTamil);
  }

  // 13. Property / Flat / Unit / Address / Amenities
  if (/(propert|flat|apartment|house|home|unit|address|where do i live|amenit|facilities|parking bay|storage unit)/.test(q) || /(சொத்து|வீடு|பிளாட்|முகவரி|வசதிகள்)/.test(q)) {
    return handlePropertyDetails(user, t, isTamil);
  }

  // 14. Fallback with helpful actionable suggestions
  return t("botFallback");
}
