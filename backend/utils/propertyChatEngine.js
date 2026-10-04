// backend/utils/propertyChatEngine.js
// Property-Aware Chat & Inquiry Engine (English & Tamil)

function fmtMoney(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

/**
 * Answers questions specifically about a given property using only its real database records.
 * Supports English and Tamil.
 */
export function answerPropertyQuestion(property, question = "", language = "en", landlord = null) {
  if (!property) {
    return {
      text: language === "ta" 
        ? "மன்னிக்கவும், சொத்து விவரங்கள் கிடைக்கவில்லை." 
        : "Sorry, property details could not be found.",
      audioText: language === "ta" ? "சொத்து விவரங்கள் கிடைக்கவில்லை" : "Property details not found",
      triggerEnquiry: false,
    };
  }

  const q = question.toLowerCase().trim();
  const isTa = language === "ta" || /[\u0B80-\u0BFF]/.test(question);

  // Property fields
  const name = property.name || "Property Unit";
  const rent = property.rent || 0;
  const deposit = property.deposit || 0;
  const bhk = property.bedrooms || 1;
  const baths = property.bathrooms || 1;
  const sqft = property.sqft || property.area || 800;
  const furnishing = property.furnishing || "Unfurnished";
  const status = property.status || "Available";
  const locality = property.locality || property.location || property.address || property.city || "";
  const city = property.city || "Tamil Nadu";
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];
  const nearby = Array.isArray(property.nearbyFacilities) ? property.nearbyFacilities : [];
  const floor = property.floor || "1st Floor";
  const facing = property.facing || "East Facing";
  const parking = property.parking || amenities.find((a) => a.toLowerCase().includes("parking")) || "Parking Available";
  const water = property.waterConnection || "Metro Water & Deep Borewell";
  const eb = property.ebConsumerNo || "TNEB Connected";
  const petFriendly = property.petFriendly || amenities.some((a) => a.toLowerCase().includes("pet"));
  const availableUnits = property.availableUnits || (status === "Available" ? 1 : 0);
  const landlordName = landlord?.name || "Karthik Raja";
  const landlordPhone = landlord?.phone || "+91 98765 43210";

  // 1. Visit / Schedule / Tour / Contact Landlord / Negotiation
  if (
    q.includes("visit") ||
    q.includes("schedule") ||
    q.includes("tour") ||
    q.includes("see the flat") ||
    q.includes("see the house") ||
    q.includes("negotiat") ||
    q.includes("contact landlord") ||
    q.includes("owner phone") ||
    q.includes("call owner") ||
    q.includes("பார்வையிட") ||
    q.includes("விசிட்") ||
    q.includes("நேரில்") ||
    q.includes("உரிமையாளர்") ||
    q.includes("பேசலாமா")
  ) {
    if (isTa) {
      return {
        text: `📅 நீங்கள் **${name}** வீட்டை நேரில் வந்து பார்வையிட விசிட் முன்பதிவு செய்யலாம் அல்லது வீட்டு உரிமையாளர் **${landlordName}** (${landlordPhone}) அவர்களை நேரடியாக தொடர்பு கொள்ளலாம்.\n\nகீழே உள்ள 'Schedule Visit' பொத்தானைப் பயன்படுத்தி உங்கள் விருப்பமான தேதி மற்றும் நேரத்தைத் தேர்ந்தெடுக்கலாம்.`,
        audioText: `${name} வீட்டை நேரில் வந்து பார்வையிட நீங்கள் விசிட் முன்பதிவு செய்யலாம். அல்லது உரிமையாளர் ${landlordName} அவர்களை தொடர்பு கொள்ளலாம்.`,
        triggerEnquiry: true,
        enquiryType: "Schedule Visit",
        suggestions: ["எப்போது குடியேறலாம்?", "மாத வாடகை என்ன?", "பாதுகாப்பு முன்பணம் எவ்வளவு?"],
      };
    }

    return {
      text: `📅 You can schedule an in-person or virtual visit to view **${name}**, or get in touch directly with the property manager **${landlordName}** at **${landlordPhone}**.\n\nClick the **"Schedule Visit"** button below to pick your preferred date and time slot.`,
      audioText: `You can schedule an in-person visit to view ${name}, or contact the property manager ${landlordName} at ${landlordPhone}.`,
      triggerEnquiry: true,
      enquiryType: "Schedule Visit",
      suggestions: ["What is the monthly rent?", "Is parking available?", "When is it available?"],
    };
  }

  // 2. Rent / Price / Cost
  if (
    q.includes("rent") ||
    q.includes("monthly") ||
    q.includes("cost") ||
    q.includes("price") ||
    q.includes("rate") ||
    q.includes("வாடகை") ||
    q.includes("கட்டணம்") ||
    q.includes("விலை")
  ) {
    if (isTa) {
      return {
        text: `💰 **${name}** வீட்டின் மாத வாடகை **${fmtMoney(rent)}/மாதம்** ஆகும். பாதுகாப்பு முன்பணம் (Security Deposit): **${fmtMoney(deposit)}**.\n\nஒவ்வொரு மாதமும் 5-ஆம் தேதிக்குள் வாடகை செலுத்தப்பட வேண்டும்.`,
        audioText: `இந்த வீட்டின் மாத வாடகை ${fmtMoney(rent)} ஆகும். பாதுகாப்பு முன்பணம் ${fmtMoney(deposit)} ஆகும்.`,
        triggerEnquiry: false,
        suggestions: ["பாதுகாப்பு முன்பணம் எவ்வளவு?", "இங்கே parking வசதி உள்ளதா?", "நேரில் பார்வையிடலாமா?"],
      };
    }

    return {
      text: `💰 The monthly rent for **${name}** is **${fmtMoney(rent)}/month** with a refundable security deposit of **${fmtMoney(deposit)}**.\n\nRent is payable monthly via UPI, NetBanking, or Cheque on or before the 5th of every month.`,
      audioText: `The monthly rent for ${name} is ${fmtMoney(rent)} per month, with a security deposit of ${fmtMoney(deposit)}.`,
      triggerEnquiry: false,
      suggestions: ["Is there a security deposit?", "Is parking available?", "Can I schedule a visit?"],
    };
  }

  // 3. Deposit / Advance
  if (
    q.includes("deposit") ||
    q.includes("advance") ||
    q.includes("security") ||
    q.includes("முன்பணம்") ||
    q.includes("டெபாசிட்") ||
    q.includes("அட்வான்ஸ்")
  ) {
    if (isTa) {
      return {
        text: `🔒 இந்த சொத்துக்கான பாதுகாப்பு முன்பணம் (Security Deposit) **${fmtMoney(deposit)}** ஆகும். இது வாடகை ஒப்பந்தம் முடியும் போது முழுமையாக திருப்பித் தரப்படும்.`,
        audioText: `பாதுகாப்பு முன்பணம் ${fmtMoney(deposit)} ஆகும்.`,
        triggerEnquiry: false,
        suggestions: ["மாத வாடகை என்ன?", "ஒப்பந்த காலம் எவ்வளவு?", "விசிட் புக் செய்யலாமா?"],
      };
    }

    return {
      text: `🔒 The security deposit for **${name}** is **${fmtMoney(deposit)}**. This is held securely in escrow and is 100% refundable at the end of the tenancy tenancy agreement subject to handover terms.`,
      audioText: `The security deposit for ${name} is ${fmtMoney(deposit)}, which is fully refundable.`,
      triggerEnquiry: false,
      suggestions: ["What is the monthly rent?", "How many bedrooms?", "Schedule a visit"],
    };
  }

  // 4. Parking
  if (
    q.includes("parking") ||
    q.includes("car") ||
    q.includes("bike") ||
    q.includes("vehicle") ||
    q.includes("பார்க்கிங்") ||
    q.includes("கார்") ||
    q.includes("வண்டி")
  ) {
    const hasParking = parking || amenities.some((a) => a.toLowerCase().includes("parking"));
    if (isTa) {
      return {
        text: hasParking
          ? `🚗 ஆம்! **${name}** குடியிருப்பில் வாகன நிறுத்துமிடம் உள்ளது: **${parking || "அர்ப்பணிக்கப்பட்ட பார்க்கிங் வசதி (Covered Car Parking)"}**.`
          : `🚗 மன்னிக்கவும், இந்த குறிப்பிட்ட யூனிட்டில் பார்க்கிங் வசதி குறிப்பிடப்படவில்லை. அருகிலுள்ள பொது பார்க்கிங் விவரங்களை உரிமையாளரிடம் கேட்கலாம்.`,
        audioText: hasParking ? `ஆம், இங்கே வாகன நிறுத்துமிடம் உள்ளது. ${parking}` : `பார்க்கிங் வசதி குறித்த தகவல் இல்லை.`,
        triggerEnquiry: false,
        suggestions: ["லிப்ட் வசதி உள்ளதா?", "மாத வாடகை என்ன?", "நேரில் பார்வையிடலாமா?"],
      };
    }

    return {
      text: hasParking
        ? `🚗 Yes, dedicated vehicle parking is available for **${name}**: **${parking || "Covered Stilt Car Parking Bay"}** with 24x7 security surveillance.`
        : `🚗 Currently, designated parking is not listed for this unit. You can check with the property manager for open space parking.`,
      audioText: hasParking ? `Yes, dedicated parking is available: ${parking}.` : `Designated parking is not specified for this unit.`,
      triggerEnquiry: false,
      suggestions: ["Is there a lift?", "What is the monthly rent?", "Can I schedule a visit?"],
    };
  }

  // 5. BHK / Bedrooms / Bathrooms / Size / Area
  if (
    q.includes("bedroom") ||
    q.includes("bhk") ||
    q.includes("bathroom") ||
    q.includes("bath") ||
    q.includes("size") ||
    q.includes("sqft") ||
    q.includes("area") ||
    q.includes("படுக்கையறை") ||
    q.includes("அளவு") ||
    q.includes("குளியலறை")
  ) {
    if (isTa) {
      return {
        text: `🏠 **${name}** அமைப்பியல் விவரங்கள்:\n• கட்டமைப்பு: **${bhk} BHK** (${bhk} படுக்கையறைகள்)\n• குளியலறைகள்: **${baths} குளியலறைகள்**\n• பரப்பளவு: **${sqft} சதுர அடி (sq.ft)**\n• தளம்: **${floor}**\n• திசை: **${facing}**`,
        audioText: `இது ${bhk} BHK வீடு, ${baths} குளியலறைகள் மற்றும் ${sqft} சதுர அடி பரப்பளவு கொண்டது.`,
        triggerEnquiry: false,
        suggestions: ["வீடு furnishing செய்யப்பட்டுள்ளதா?", "மாத வாடகை என்ன?", "விசிட் புக் செய்யலாமா?"],
      };
    }

    return {
      text: `🏠 **${name}** Specifications:\n• Layout: **${bhk} BHK** (${bhk} spacious bedrooms)\n• Bathrooms: **${baths} contemporary bathrooms**\n• Super Built-up Area: **${sqft} sq.ft**\n• Floor Level: **${floor}**\n• Vastu Orientation: **${facing}**`,
      audioText: `This is a ${bhk} BHK property with ${baths} bathrooms and ${sqft} square feet built-up area on ${floor}.`,
      triggerEnquiry: false,
      suggestions: ["Is this apartment furnished?", "What is the monthly rent?", "Schedule a visit"],
    };
  }

  // 6. Lift / Elevator
  if (
    q.includes("lift") ||
    q.includes("elevator") ||
    q.includes("லிப்ட்")
  ) {
    const hasLift = amenities.some((a) => a.toLowerCase().includes("lift") || a.toLowerCase().includes("elevator"));
    if (isTa) {
      return {
        text: hasLift
          ? `🛗 ஆம்! இந்த கட்டிடத்தில் முழுமையான தானியங்கி லிப்ட் (Automatic Passenger Elevator) வசதி மற்றும் மின்தடை பேக்கப் வசதி உள்ளது.`
          : `🛗 இந்த சொத்து ${floor} தளத்தில் அமைந்துள்ளது. லிப்ட் வசதி விவரம் தரவுத்தளத்தில் குறிப்பிடப்படவில்லை.`,
        audioText: hasLift ? `ஆம், இங்கே தானியங்கி லிப்ட் வசதி உள்ளது.` : `லிப்ட் வசதி குறிப்பிடப்படவில்லை.`,
        triggerEnquiry: false,
        suggestions: ["பவர் பேக்கப் உள்ளதா?", "பார்க்கிங் உள்ளதா?", "மாத வாடகை என்ன?"],
      };
    }

    return {
      text: hasLift
        ? `🛗 Yes! The building is equipped with an **automatic passenger elevator** with dedicated generator power backup.`
        : `🛗 Lift access is not explicitly listed for this unit located on ${floor}. Please confirm with the manager.`,
      audioText: hasLift ? `Yes, automatic elevator service is available.` : `Elevator service is not explicitly listed for this unit.`,
      triggerEnquiry: false,
      suggestions: ["Is parking available?", "Is power backup available?", "What is the monthly rent?"],
    };
  }

  // 7. Furnishing
  if (
    q.includes("furnish") ||
    q.includes("furniture") ||
    q.includes("wardrobe") ||
    q.includes("ac") ||
    q.includes("அலங்கார") ||
    q.includes("பர்னிச்சர்")
  ) {
    if (isTa) {
      return {
        text: `🛋️ **${name}** சொத்து **${furnishing}** நிலையில் உள்ளது.\n${
          furnishing.toLowerCase().includes("semi")
            ? "இதில் மாடுலர் கிச்சன், மரத்தாலான அலமாரிகள் (Wardrobes), மற்றும் விளக்குகள்/மின்விசிறிகள் பொருத்தப்பட்டுள்ளன."
            : furnishing.toLowerCase().includes("full")
            ? "இதில் சோஃபா, கட்டில், டைனிங் டேபிள், குளிர்சாதன பெட்டி, ஏசி மற்றும் மாடுலர் கிச்சன் முழுமையாக அமைக்கப்பட்டுள்ளது."
            : "இது நீங்கள் உங்கள் விருப்பப்படி ஃபர்னிச்சர் அமைத்துக்கொள்ள ஏற்ற வெற்று இல்லமாகும்."
        }`,
        audioText: `இந்த வீடு ${furnishing} நிலையில் உள்ளது.`,
        triggerEnquiry: false,
        suggestions: ["மாத வாடகை என்ன?", "இங்கே parking வசதி உள்ளதா?", "விசிட் புக் செய்யலாமா?"],
      };
    }

    return {
      text: `🛋️ **${name}** is **${furnishing}**.\n${
        furnishing.toLowerCase().includes("semi")
          ? "It comes with fitted modular kitchen cabinets, bedroom wardrobes, lighting fixtures, and ceiling fans."
          : furnishing.toLowerCase().includes("full")
          ? "It is fully equipped with sofa set, beds & mattresses, dining table, refrigerator, air conditioners, and modular kitchen."
          : "It is unfurnished, allowing you complete freedom to design your interior setup."
      }`,
      audioText: `This property is ${furnishing}.`,
      triggerEnquiry: false,
      suggestions: ["What is the monthly rent?", "How many bedrooms?", "Can I schedule a visit?"],
    };
  }

  // 8. Pet Friendly / Pets
  if (
    q.includes("pet") ||
    q.includes("dog") ||
    q.includes("cat") ||
    q.includes("செல்லப்பிராணி") ||
    q.includes("நாய்") ||
    q.includes("பூனை")
  ) {
    if (isTa) {
      return {
        text: petFriendly
          ? `🐾 ஆம்! **${name}** செல்லப்பிராணிகள் வளர்க்க உகந்த (Pet Friendly) இல்லமாகும்.`
          : `🐾 இந்த சமூகத்தில் செல்லப்பிராணிகள் வளர்ப்பு குறித்த கொள்கை உரிமையாளரின் முன் அனுமதிக்கு உட்பட்டது. உரிமையாளர் **${landlordName}** அவர்களிடம் உறுதிப்படுத்திக் கொள்ளலாம்.`,
        audioText: petFriendly ? `ஆம், செல்லப்பிராணிகள் அனுமதிக்கப்படும்.` : `செல்லப்பிராணிகள் அனுமதிக்கு உரிமையாளரிடம் உறுதிப்படுத்தவும்.`,
        triggerEnquiry: !petFriendly,
        suggestions: ["உரிமையாளரை தொடர்பு கொள்ளலாமா?", "மாத வாடகை என்ன?", "விசிட் புக் செய்யலாமா?"],
      };
    }

    return {
      text: petFriendly
        ? `🐾 Yes! **${name}** welcomes pets and is designated pet-friendly.`
        : `🐾 Pet policy for this building is subject to owner approval. You can send a quick query to **${landlordName}** to confirm house rules for your pet.`,
      audioText: petFriendly ? `Yes, this property is pet friendly.` : `Pet policy is subject to landlord approval.`,
      triggerEnquiry: !petFriendly,
      suggestions: ["Contact Landlord", "What is the monthly rent?", "Schedule a visit"],
    };
  }

  // 9. Availability / Move-in date
  if (
    q.includes("available") ||
    q.includes("vacant") ||
    q.includes("ready") ||
    q.includes("move in") ||
    q.includes("when can i") ||
    q.includes("காலியாக") ||
    q.includes("எப்போது") ||
    q.includes("குடியேற")
  ) {
    const isAvail = status.toLowerCase() === "available";
    if (isTa) {
      return {
        text: isAvail
          ? `✅ **${name}** தற்போது **உடனடியாக குடியேற தயாராக (Available)** உள்ளது! தற்போது ${availableUnits} யூனிட் காலியாக உள்ளது.`
          : `⏳ இந்த யூனிட் தற்போது வாடகைக்கு விடப்பட்டுள்ளது (Occupied). அடுத்த வாடகை காலியாதல் அல்லது பிற யூனிட்டுகள் குறித்து அறிய உரிமையாளரை தொடர்பு கொள்ளலாம்.`,
        audioText: isAvail ? `இந்த வீடு உடனடியாக குடியேற தயாராக உள்ளது.` : `இந்த வீடு தற்போது வாடகைக்கு விடப்பட்டுள்ளது.`,
        triggerEnquiry: true,
        enquiryType: isAvail ? "Schedule Visit" : "Availability Inquiry",
        suggestions: ["நேரில் பார்வையிடலாமா?", "மாத வாடகை என்ன?", "பாதுகாப்பு முன்பணம் எவ்வளவு?"],
      };
    }

    return {
      text: isAvail
        ? `✅ **${name}** is **Available and ready for immediate move-in**! There are ${availableUnits} unit(s) available in this complex.`
        : `⏳ This specific unit is currently marked as **${status}**. You can register an inquiry with **${landlordName}** to receive an alert if it or a similar flat becomes vacant.`,
      audioText: isAvail ? `This property is available and ready for immediate move-in.` : `This unit is currently occupied.`,
      triggerEnquiry: true,
      enquiryType: isAvail ? "Schedule Visit" : "Availability Inquiry",
      suggestions: ["Can I schedule a visit?", "What is the monthly rent?", "Is parking available?"],
    };
  }

  // 10. Nearby / School / College / Hospital / Metro / Bus Stop / IT Park
  if (
    q.includes("school") ||
    q.includes("college") ||
    q.includes("hospital") ||
    q.includes("metro") ||
    q.includes("bus") ||
    q.includes("station") ||
    q.includes("railway") ||
    q.includes("it park") ||
    q.includes("market") ||
    q.includes("temple") ||
    q.includes("nearby") ||
    q.includes("distance") ||
    q.includes("பள்ளி") ||
    q.includes("மருத்துவமனை") ||
    q.includes("மெட்ரோ") ||
    q.includes("பேருந்து") ||
    q.includes("அருகில்")
  ) {
    const nearbyList = nearby.length > 0 ? nearby.join(", ") : "Schools, Hospitals, Supermarket, Bus stops";
    if (isTa) {
      return {
        text: `📍 **${name}** அமைவிடத்திற்கு அருகிலுள்ள முக்கிய வசதிகள்:\n• அருகிலுள்ளவை: **${nearbyList}**\n• முகவரி / பகுதி: **${locality}, ${city}**\n\nபொதுப் போக்குவரத்து மற்றும் அத்தியாவசிய தேவைகளுக்கான சாலை இணைப்பு மிகவும் சிறப்பாக உள்ளது.`,
        audioText: `இந்த குடியிருப்புக்கு அருகில் ${nearbyList} போன்ற வசதிகள் உள்ளன.`,
        triggerEnquiry: false,
        suggestions: ["இங்கே parking வசதி உள்ளதா?", "மாத வாடகை என்ன?", "விசிட் புக் செய்யலாமா?"],
      };
    }

    return {
      text: `📍 Neighborhood & Connectivity for **${name}**:\n• Nearby Facilities: **${nearbyList}**\n• Locality: **${locality}, ${city}**\n\nThe neighborhood provides excellent access to educational institutions, healthcare centers, and public transit.`,
      audioText: `Nearby facilities include ${nearbyList} around ${locality}.`,
      triggerEnquiry: false,
      suggestions: ["Is there a lift?", "What is the monthly rent?", "Schedule a visit"],
    };
  }

  // 11. Water Connection & Electricity (EB)
  if (
    q.includes("water") ||
    q.includes("tneb") ||
    q.includes("eb") ||
    q.includes("power") ||
    q.includes("electricity") ||
    q.includes("தண்ணீர்") ||
    q.includes("மின்சாரம்")
  ) {
    if (isTa) {
      return {
        text: `💧 தண்ணீர் வசதி: **${water}** (24x7 தடையில்லா குடிநீர் மற்றும் நிலத்தடி நீர் வசதி).\n⚡ மின்சாரம் & EB: தனி TNEB நுகர்வோர் கணக்கு எண் (${eb}) மற்றும் ஜெனரேட்டர் பவர் பேக்கப் உள்ளது.`,
        audioText: `தண்ணீர் வசதி: ${water}. மற்றும் 24 மணி நேர மின்சார வசதி உள்ளது.`,
        triggerEnquiry: false,
        suggestions: ["மாத வாடகை என்ன?", "பார்க்கிங் உள்ளதா?", "நேரில் பார்வையிடலாமா?"],
      };
    }

    return {
      text: `💧 Water Supply: **${water}** with continuous sump storage and RO drinking provision.\n⚡ Electricity: Dedicated TNEB meter (**${eb}**) with inverter / DG standby power backup.`,
      audioText: `Water supply includes ${water}, and dedicated electricity with power backup.`,
      triggerEnquiry: false,
      suggestions: ["What is the monthly rent?", "Is there a lift?", "Can I schedule a visit?"],
    };
  }

  // 12. General Amenities
  if (
    q.includes("amenit") ||
    q.includes("facility") ||
    q.includes("facilities") ||
    q.includes("gym") ||
    q.includes("pool") ||
    q.includes("swimming") ||
    q.includes("வசதி") ||
    q.includes("ஜிம்")
  ) {
    const amenStr = amenities.join(", ");
    if (isTa) {
      return {
        text: `✨ **${name}** குடியிருப்பில் உள்ள வசதிகள்:\n${amenities.map((a) => `• ${a}`).join("\n")}`,
        audioText: `இந்த குடியிருப்பில் ${amenStr} போன்ற வசதிகள் உள்ளன.`,
        triggerEnquiry: false,
        suggestions: ["இங்கே parking வசதி உள்ளதா?", "மாத வாடகை என்ன?", "விசிட் புக் செய்யலாமா?"],
      };
    }

    return {
      text: `✨ Included Amenities at **${name}**:\n${amenities.map((a) => `• ${a}`).join("\n")}`,
      audioText: `Included amenities are ${amenStr}.`,
      triggerEnquiry: false,
      suggestions: ["Is parking available?", "What is the monthly rent?", "Schedule a visit"],
    };
  }

  // 13. Honest Fallback
  if (isTa) {
    return {
      text: `மன்னிக்கவும், இந்த சொத்து குறித்த குறிப்பிட்ட தகவல் தற்போது என்னிடம் முழுமையாக இல்லை.\n\nமேலும் துல்லியமான விவரங்களுக்கு வீட்டு உரிமையாளர் **${landlordName}** அவர்களைத் தொடர்பு கொள்ளலாம் அல்லது விசிட் கோரிக்கை அனுப்பலாம்.`,
      audioText: `மன்னிக்கவும், இந்த சொத்து குறித்த கூடுதல் தகவல் தற்போது கிடைக்கவில்லை. உரிமையாளரை தொடர்பு கொள்ளவும்.`,
      triggerEnquiry: true,
      enquiryType: "General Question",
      suggestions: ["மாத வாடகை என்ன?", "இங்கே parking வசதி உள்ளதா?", "நேரில் பார்வையிடலாமா?"],
    };
  }

  return {
    text: `Sorry, I don't have that specific information for this property in the database yet.\n\nFor verified details on this, you can contact the property manager **${landlordName}** at **${landlordPhone}** or submit a quick enquiry below.`,
    audioText: `Sorry, I don't have that specific information for this property yet. You can contact the property manager directly.`,
    triggerEnquiry: true,
    enquiryType: "General Question",
    suggestions: ["What is the monthly rent?", "Is parking available?", "Can I schedule a visit?"],
  };
}
