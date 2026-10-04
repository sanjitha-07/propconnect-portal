// frontend/src/utils/clientMatchingEngine.js
// Client-side mirror of PropConnect Smart Matching Engine

export function parseBudgetRange(budgetStr, customMin, customMax) {
  if (customMin !== undefined && customMax !== undefined && (customMin > 0 || customMax > 0)) {
    return { min: Number(customMin) || 0, max: Number(customMax) || Infinity };
  }

  if (!budgetStr) return { min: 0, max: Infinity };
  const clean = budgetStr.replace(/[₹,\s]/g, "");

  if (clean.includes("10000–20000") || clean.includes("10000-20000")) return { min: 10000, max: 20000 };
  if (clean.includes("20000–30000") || clean.includes("20000-30000")) return { min: 20000, max: 30000 };
  if (clean.includes("30000–50000") || clean.includes("30000-50000")) return { min: 30000, max: 50000 };
  if (clean.includes("50000+") || clean.includes("50000")) return { min: 50000, max: 200000 };

  const matches = clean.match(/(\d+)[^\d]+(\d+)/);
  if (matches) {
    return { min: Number(matches[1]), max: Number(matches[2]) };
  }

  return { min: 0, max: Infinity };
}

function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function rankPropertiesClient(properties, preferences = {}) {
  const {
    city = "",
    locality = "",
    propertyType = "",
    bhk = "",
    familyMembers = 0,
    budgetRange = "",
    budgetMin,
    budgetMax,
    furnishing = "",
    amenities = [],
    nearby = [],
    additionalRequirements = "",
  } = preferences;

  const { min: targetMinRent, max: targetMaxRent } = parseBudgetRange(budgetRange, budgetMin, budgetMax);
  const targetCityNorm = normalize(city);
  const targetLocalityNorm = normalize(locality);
  const targetTypeNorm = normalize(propertyType);
  const targetFurnishingNorm = normalize(furnishing);
  const numFamily = Number(familyMembers) || 0;
  const userAmenities = Array.isArray(amenities) ? amenities : [];
  const userNearby = Array.isArray(nearby) ? nearby : [];
  const freeText = (additionalRequirements || "").toLowerCase();

  return properties.map((prop) => {
    let score = 0;
    let maxPossible = 0;
    const reasons = [];
    const considerations = [];

    const propCity = prop.city || "";
    const propLocality = prop.locality || prop.location || prop.address || "";
    const propType = prop.type || "Apartment";
    const propBedrooms = Number(prop.bedrooms || 0);
    const propRent = Number(prop.rent || 0);
    const propFurnishing = prop.furnishing || "Unfurnished";
    const propStatus = prop.status || "Available";
    const propAmenities = Array.isArray(prop.amenities) ? prop.amenities : [];
    const propNearby = Array.isArray(prop.nearbyFacilities) ? prop.nearbyFacilities : [];
    const propDesc = (prop.description || "").toLowerCase();
    const propName = (prop.name || "").toLowerCase();

    // 1. City
    maxPossible += 25;
    if (targetCityNorm) {
      if (targetCityNorm === "other") {
        const majorCities = ["chennai", "coimbatore", "madurai", "trichy", "salem"];
        if (!majorCities.includes(normalize(propCity))) {
          score += 25;
          reasons.push(`✓ Located in ${propCity} (Tamil Nadu region)`);
        } else {
          score += 5;
        }
      } else if (normalize(propCity) === targetCityNorm) {
        score += 25;
        reasons.push(`✓ Located in ${propCity}`);
      } else {
        score += 0;
        considerations.push(`Located in ${propCity} rather than ${city}`);
      }
    } else {
      score += 25;
    }

    // 2. Locality
    if (targetLocalityNorm && targetLocalityNorm !== "all") {
      maxPossible += 15;
      const combinedLocNorm = normalize(`${propLocality} ${propCity} ${propName}`);
      if (combinedLocNorm.includes(targetLocalityNorm)) {
        score += 15;
        reasons.push(`✓ Located in preferred area (${locality})`);
      } else {
        score += 5;
      }
    }

    // 3. BHK
    maxPossible += 25;
    if (bhk && bhk !== "all") {
      let reqBhk = 0;
      if (bhk.includes("1")) reqBhk = 1;
      else if (bhk.includes("2")) reqBhk = 2;
      else if (bhk.includes("3")) reqBhk = 3;
      else if (bhk.includes("4")) reqBhk = 4;

      if (reqBhk > 0) {
        if (reqBhk === 4 && propBedrooms >= 4) {
          score += 25;
          reasons.push(`✓ ${propBedrooms} BHK (meets your 4+ BHK requirement)`);
        } else if (propBedrooms === reqBhk) {
          score += 25;
          reasons.push(`✓ Exact ${propBedrooms} BHK match`);
        } else if (Math.abs(propBedrooms - reqBhk) === 1) {
          score += 14;
          considerations.push(`${propBedrooms} BHK (${reqBhk} BHK was preferred)`);
        } else {
          score += 4;
        }
      } else {
        score += 20;
      }
    } else {
      score += 25;
    }

    // 4. Budget
    maxPossible += 25;
    if (targetMinRent > 0 || targetMaxRent < Infinity) {
      if (propRent >= targetMinRent && propRent <= targetMaxRent) {
        score += 25;
        reasons.push(`✓ Within your budget (₹${propRent.toLocaleString("en-IN")}/mo)`);
      } else if (propRent < targetMinRent) {
        score += 23;
        reasons.push(`✓ Below your budget (Great value at ₹${propRent.toLocaleString("en-IN")}/mo)`);
      } else if (propRent <= targetMaxRent * 1.12) {
        score += 14;
        considerations.push(`₹${propRent.toLocaleString("en-IN")}/mo (slightly above budget range)`);
      } else {
        score += 4;
      }
    } else {
      score += 25;
    }

    // 5. Family
    if (numFamily > 0) {
      maxPossible += 8;
      if (numFamily <= 2 && propBedrooms >= 1) {
        score += 8;
        reasons.push(`✓ Ideal for ${numFamily} occupant${numFamily > 1 ? "s" : ""}`);
      } else if (numFamily <= 4 && propBedrooms >= 2) {
        score += 8;
        reasons.push(`✓ Comfortable size for a family of ${numFamily}`);
      } else if (numFamily > 4 && propBedrooms >= 3) {
        score += 8;
        reasons.push(`✓ Spacious layout for family of ${numFamily}+`);
      } else {
        score += 4;
      }
    }

    // 6. Property Type
    if (targetTypeNorm && targetTypeNorm !== "all") {
      maxPossible += 10;
      const pTypeNorm = normalize(propType);
      if (pTypeNorm.includes(targetTypeNorm) || targetTypeNorm.includes(pTypeNorm)) {
        score += 10;
        reasons.push(`✓ Property type: ${propType}`);
      } else if (targetTypeNorm === "apartment" && pTypeNorm === "flat") {
        score += 10;
        reasons.push(`✓ Property type: ${propType}`);
      } else if (targetTypeNorm === "gatedcommunity" && (propDesc.includes("gated") || propAmenities.some((a) => a.toLowerCase().includes("gated")))) {
        score += 10;
        reasons.push(`✓ Gated community enclave`);
      } else {
        score += 3;
      }
    }

    // 7. Furnishing
    if (targetFurnishingNorm && targetFurnishingNorm !== "nopreference" && targetFurnishingNorm !== "all") {
      maxPossible += 10;
      const pFurnNorm = normalize(propFurnishing);
      if (pFurnNorm.includes(targetFurnishingNorm)) {
        score += 10;
        reasons.push(`✓ Furnishing: ${propFurnishing}`);
      } else if (targetFurnishingNorm.includes("semi") && pFurnNorm.includes("furn")) {
        score += 8;
        reasons.push(`✓ Furnishing: ${propFurnishing}`);
      } else {
        score += 4;
        considerations.push(`Unit is ${propFurnishing}`);
      }
    }

    // 8. Amenities
    if (userAmenities.length > 0) {
      const amenWeight = 18;
      maxPossible += amenWeight;
      let matchedAmenities = 0;

      userAmenities.forEach((desired) => {
        const dNorm = normalize(desired);
        const hasAmenity = propAmenities.some((a) => {
          const aNorm = normalize(a);
          return aNorm.includes(dNorm) || dNorm.includes(aNorm);
        });

        if (hasAmenity) {
          matchedAmenities++;
          if (matchedAmenities <= 4) {
            reasons.push(`✓ ${desired} available`);
          }
        }
      });

      const amenFraction = matchedAmenities / userAmenities.length;
      score += Math.round(amenWeight * amenFraction);
    }

    // 9. Nearby
    if (userNearby.length > 0) {
      const nearbyWeight = 16;
      maxPossible += nearbyWeight;
      let matchedNearby = 0;

      userNearby.forEach((desired) => {
        const dNorm = normalize(desired);
        const hasNearby = propNearby.some((n) => {
          const nNorm = normalize(n);
          return nNorm.includes(dNorm) || dNorm.includes(nNorm);
        }) || propDesc.includes(desired.toLowerCase());

        if (hasNearby) {
          matchedNearby++;
          if (matchedNearby <= 3) {
            reasons.push(`✓ Near ${desired.toLowerCase()}`);
          }
        }
      });

      const nearbyFraction = matchedNearby / userNearby.length;
      score += Math.round(nearbyWeight * nearbyFraction);
    }

    // 10. Availability
    maxPossible += 10;
    if (propStatus.toLowerCase() === "available") {
      score += 10;
      reasons.push("✓ Ready for move-in (Available)");
    } else {
      score += 4;
    }

    // 11. Free-Text Keyword Matching
    if (freeText && freeText.trim()) {
      const keywords = ["school", "pet", "dog", "cat", "pool", "gym", "balcony", "terrace", "sea", "beach", "lift", "parking", "security", "hospital", "metro", "vastu", "family"];
      let bonusPts = 0;
      const combinedText = `${propDesc} ${propName} ${propAmenities.join(" ")} ${propNearby.join(" ")}`.toLowerCase();

      keywords.forEach((kw) => {
        if (freeText.includes(kw) && combinedText.includes(kw)) {
          bonusPts += 2;
        }
      });

      if (bonusPts > 0) {
        const awarded = Math.min(bonusPts, 8);
        score += awarded;
        maxPossible += 8;
        reasons.push("✓ Matches your specific notes");
      }
    }

    const rawRatio = maxPossible > 0 ? score / maxPossible : 0.7;
    let matchPercentage = Math.round(rawRatio * 100);
    if (matchPercentage > 98) matchPercentage = 98;
    if (matchPercentage < 45) matchPercentage = 45;

    let matchLabel = "Good Match";
    if (matchPercentage >= 90) matchLabel = "Best Match";
    else if (matchPercentage >= 80) matchLabel = "Excellent Match";
    else if (matchPercentage >= 70) matchLabel = "Good Match";
    else matchLabel = "Fair Match";

    return {
      ...prop,
      matchScore: matchPercentage,
      matchPercentage: `${matchPercentage}%`,
      matchLabel,
      reasons: reasons.slice(0, 7),
      considerations: considerations.slice(0, 3),
    };
  }).sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (a.status === "Available" && b.status !== "Available") return -1;
    if (b.status === "Available" && a.status !== "Available") return 1;
    return a.rent - b.rent;
  });
}
