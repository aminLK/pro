/* ===================================================================
   Velorah SaaS — jeu de données métier (démo / pitch assureurs).
   Données pseudo-aléatoires déterministes pour un rendu réaliste.
   =================================================================== */
(function () {
  "use strict";

  // RNG déterministe (mulberry32) -> chiffres stables d'une session à l'autre
  let seed = 20260615;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  const months = ["Juil", "Août", "Sept", "Oct", "Nov", "Déc", "Janv", "Févr", "Mars", "Avr", "Mai", "Juin"];

  /* ---- Flotte (référence partagée avec le site vitrine) ---- */
  const models = [
    { model: "Renault Twingo E-Tech", cat: "Citadine", price: 39, value: 24000 },
    { model: "Peugeot 208", cat: "Citadine", price: 42, value: 22000 },
    { model: "Mercedes Classe C", cat: "Berline", price: 89, value: 52000 },
    { model: "BMW Série 5", cat: "Berline", price: 99, value: 68000 },
    { model: "Hyundai Tucson", cat: "SUV", price: 79, value: 41000 },
    { model: "BMW X5", cat: "SUV", price: 129, value: 92000 },
    { model: "Tesla Model 3", cat: "Électrique", price: 95, value: 48000 },
    { model: "Porsche Taycan", cat: "Sport", price: 249, value: 135000 },
    { model: "Porsche 911 Carrera", cat: "Sport", price: 299, value: 142000 },
    { model: "Mercedes Classe S", cat: "Luxe", price: 219, value: 128000 },
    { model: "Range Rover Autobiography", cat: "Luxe", price: 239, value: 155000 },
    { model: "Kia EV6 GT", cat: "Électrique", price: 109, value: 56000 },
  ];
  const cities = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nice"];
  const statusList = ["Disponible", "En location", "Maintenance"];

  const fleet = [];
  for (let i = 0; i < 120; i++) {
    const m = models[i % models.length];
    const riskBase = m.cat === "Sport" ? 64 : m.cat === "Luxe" ? 58 : m.cat === "SUV" ? 46 : 38;
    fleet.push({
      id: "VH-" + String(1000 + i),
      plate: `${pick(["AA", "BG", "CV", "DR", "EF", "GH"])}-${ri(100, 999)}-${pick(["AA", "BC", "ZZ", "RT", "LM"])}`,
      model: m.model,
      cat: m.cat,
      city: pick(cities),
      value: m.value,
      pricePerDay: m.price,
      status: rnd() < 0.55 ? "En location" : rnd() < 0.85 ? "Disponible" : "Maintenance",
      odometer: ri(5000, 78000),
      utilization: ri(48, 94),                       // % d'occupation
      riskScore: Math.min(99, riskBase + ri(-12, 16)), // 0-100, + = + risqué
      driverScore: ri(72, 98),                        // score conduite télématique
      claims: rnd() < 0.18 ? ri(1, 2) : 0,            // nb de sinistres 12 mois
      year: ri(2021, 2025),
    });
  }

  /* ---- Réservations récentes ---- */
  const firstNames = ["Camille", "Yacine", "Sophie", "Lucas", "Inès", "Thomas", "Léa", "Hugo", "Nadia", "Marc", "Chloé", "Karim"];
  const lastNames = ["Durand", "Benali", "Martin", "Petit", "Moreau", "Garcia", "Rossi", "Faure", "Hamdi", "Lopez"];
  const bookings = [];
  for (let i = 0; i < 24; i++) {
    const v = fleet[ri(0, fleet.length - 1)];
    const days = ri(1, 9);
    const start = new Date(2026, 5, ri(1, 14));
    const end = new Date(start); end.setDate(end.getDate() + days);
    bookings.push({
      ref: "VLR-" + (4000 + i),
      client: `${pick(firstNames)} ${pick(lastNames)}`,
      vehicle: v.model,
      vehicleId: v.id,
      city: v.city,
      start, end, days,
      amount: days * v.pricePerDay + 19,
      status: rnd() < 0.62 ? "Confirmée" : rnd() < 0.85 ? "En cours" : "Terminée",
    });
  }
  bookings.sort((a, b) => b.start - a.start);

  /* ---- Séries temporelles (12 mois) ---- */
  const revenue = [];
  let base = 142000;
  for (let i = 0; i < 12; i++) { base += ri(-9000, 22000); revenue.push(Math.max(90000, base)); }
  const utilizationSeries = months.map(() => ri(62, 89));
  const bookingsSeries = months.map(() => ri(180, 420));

  /* ---- Assurance & risque ---- */
  const totalFleetValue = fleet.reduce((s, v) => s + v.value, 0);
  const totalClaims = fleet.reduce((s, v) => s + v.claims, 0);
  const premiumAnnual = Math.round(totalFleetValue * 0.046); // ~4.6% de la valeur
  const claimsCost = totalClaims * 4200 + 38000;             // coût sinistres estimé
  const lossRatio = +((claimsCost / premiumAnnual) * 100).toFixed(1); // S/P %
  const avgDriverScore = Math.round(fleet.reduce((s, v) => s + v.driverScore, 0) / fleet.length);
  const avgRisk = Math.round(fleet.reduce((s, v) => s + v.riskScore, 0) / fleet.length);
  // Réduction de prime estimée grâce à la télématique (meilleur score => plus de remise)
  const premiumDiscountPct = Math.round((avgDriverScore - 70) * 0.7 + (75 - avgRisk) * 0.25);
  const claimsByType = [
    { label: "Bris de glace", value: 41, color: window.Charts ? Charts.COLORS.blue : "#6aa6ff" },
    { label: "Carrosserie", value: 28, color: window.Charts ? Charts.COLORS.gold : "#c8a45c" },
    { label: "Vol / tentative", value: 12, color: window.Charts ? Charts.COLORS.violet : "#a98bff" },
    { label: "Corporel", value: 7, color: window.Charts ? Charts.COLORS.red : "#ef6f6f" },
    { label: "Autre", value: 12, color: "#5d6678" },
  ];
  const lossRatioSeries = months.map((_, i) => Math.max(28, lossRatio + Math.round((rnd() - 0.5) * 24) - i * 0.6));

  /* ================================================================
     Fleet Navira — sourcing, sinistres, particuliers, enchères
     ================================================================ */
  const now = Date.now();
  const energies = ["Électrique", "Hybride", "Diesel", "Essence"];
  const plModels = ["Renault T High", "Mercedes Actros", "Volvo FH", "Iveco S-Way", "Scania R450"];
  const vulModels = ["Renault Master", "Iveco Daily", "Fiat Ducato", "Mercedes Sprinter"];

  /* ---- Segments véhicules (tous types confondus, y compris médical) ---- */
  const SEGMENTS = ["VL", "VUL", "PL", "Médical"]; // léger, utilitaire, poids lourd, ambulance/VSL
  const brands = ["Renault", "Peugeot", "Mercedes", "BMW", "Volvo", "Tesla"];

  // Modèles cohérents par marque et par segment (un concessionnaire ne propose que sa marque)
  const BRAND_MODELS = {
    Renault: { VL: ["Clio", "Captur", "Mégane E-Tech"], VUL: ["Kangoo", "Trafic", "Master"], PL: ["Renault T High", "Renault C"], "Médical": ["Master Ambulance", "Trafic VSL"] },
    Peugeot: { VL: ["208", "2008", "308"], VUL: ["Partner", "Expert", "Boxer"], PL: [], "Médical": ["Boxer Ambulance", "Expert VSL"] },
    Mercedes: { VL: ["Classe A", "Classe B", "GLA"], VUL: ["Citan", "Vito", "Sprinter"], PL: ["Actros", "Atego"], "Médical": ["Sprinter Ambulance", "Vito VSL"] },
    BMW: { VL: ["Série 1", "Série 2", "X1"], VUL: [], PL: [], "Médical": [] },
    Volvo: { VL: ["XC40", "V60"], VUL: [], PL: ["Volvo FH", "Volvo FM"], "Médical": [] },
    Tesla: { VL: ["Model 3", "Model Y"], VUL: [], PL: [], "Médical": [] },
  };

  const dealerDefs = [
    { name: "AutoPro Île-de-France", city: "Paris", brand: "Peugeot" },
    { name: "TruckCenter Rhône", city: "Lyon", brand: "Volvo" },
    { name: "Méditerranée Mercedes", city: "Marseille", brand: "Mercedes" },
    { name: "Sud-Ouest Mobilité", city: "Bordeaux", brand: "Renault" },
    { name: "Nord Trucks", city: "Lille", brand: "Volvo" },
    { name: "Riviera BMW", city: "Nice", brand: "BMW" },
    // Pour l'exemple Tourcoing / Roubaix / Renault :
    { name: "Renault Tourcoing", city: "Tourcoing", brand: "Renault" },
    { name: "Renault Roubaix", city: "Roubaix", brand: "Renault" },
    // Spécialistes médical (ambulances / VSL)
    { name: "Ambulances Services Nord", city: "Lille", brand: "Mercedes", medical: true },
    { name: "VSL Tourcoing Santé", city: "Tourcoing", brand: "Renault", medical: true },
  ];

  const dealers = dealerDefs.map((def, i) => {
    const pools = BRAND_MODELS[def.brand];
    // segments réellement proposés par la marque
    let segs = SEGMENTS.filter((seg) => pools[seg] && pools[seg].length);
    if (def.medical) segs = ["Médical", "VUL"].filter((seg) => pools[seg] && pools[seg].length);
    const stock = [];
    segs.forEach((seg) => {
      const n = def.medical ? ri(1, 2) : ri(1, 2);
      for (let k = 0; k < n; k++) {
        stock.push({
          type: seg, energy: pick(energies),
          model: pick(pools[seg]),
          qty: ri(1, 6), deliveryH: ri(3, 22),
        });
      }
    });
    return {
      id: "CC-" + (200 + i), name: def.name, city: def.city, brand: def.brand, medical: !!def.medical, stock,
      available: stock.reduce((s, x) => s + x.qty, 0),
      avgDeliveryH: Math.round(stock.reduce((s, x) => s + x.deliveryH, 0) / stock.length),
      rating: +(4.3 + rnd() * 0.6).toFixed(1),
    };
  });

  // Stock déterministe pour les cas de démonstration (rend le matching reproductible)
  const ensureStock = (name, item) => {
    const d = dealers.find((x) => x.name === name);
    if (d) { d.stock.unshift(item); d.available += item.qty; }
  };
  ensureStock("Renault Tourcoing", { type: "VL", energy: "Diesel", model: "Clio", qty: 3, deliveryH: 4 });
  ensureStock("Renault Roubaix", { type: "VL", energy: "Diesel", model: "Mégane E-Tech", qty: 2, deliveryH: 5 });
  ensureStock("Nord Trucks", { type: "PL", energy: "Diesel", model: "Volvo FH", qty: 4, deliveryH: 8 });
  ensureStock("VSL Tourcoing Santé", { type: "Médical", energy: "Diesel", model: "Master Ambulance", qty: 2, deliveryH: 5 });

  /* ---- Sinistres (claims) — pipeline de déblocage ---- */
  const insurers = ["AXA", "Allianz", "Groupama", "MAIF", "Generali", "MACIF"];
  const claimStages = ["Déclaré", "Solution identifiée", "Débloqué", "Livré"];
  const reasons = ["Collision", "Bris de glace majeur", "Vol", "Incendie", "Panne immobilisante"];
  const claimCategories = ["Citadine", "Berline", "SUV", "Utilitaire"];
  const motifs = ["Collision", "Bris de glace majeur", "Vol", "Incendie", "Panne immobilisante", "Mise aux normes (non conforme)"];
  const mkContract = (courtesy) => ({ courtesy, category: pick(claimCategories), maxDays: pick([15, 30, 30, 45]) });
  const claims = [];

  // Cas de démo 1 : l'exemple Tourcoing / Roubaix / Renault (VL de courtoisie)
  claims.push({
    ref: "SIN-70512", insurer: "Groupama", client: "Camille Dehaene", city: "Tourcoing",
    brand: "Renault", needType: "VL", needQty: 1, energy: "Diesel", reason: "Collision",
    declaredAt: now - 2 * 3600e3, slaHours: 24, stage: 0, status: claimStages[0],
    assigned: null, unlockedInH: null, covered: true, contract: mkContract(true),
  });
  // Cas de démo 2 : transport — 2 camions, mise aux normes
  claims.push({
    ref: "SIN-70488", insurer: "Allianz", client: "Transports Lefebvre", city: "Lille",
    brand: "Volvo", needType: "PL", needQty: 2, energy: "Diesel", reason: "Mise aux normes (non conforme)",
    declaredAt: now - 5 * 3600e3, slaHours: 48, stage: 1, status: claimStages[1],
    assigned: null, unlockedInH: null, covered: true, contract: mkContract(true),
  });
  // Cas de démo 3 : médical — ambulance
  claims.push({
    ref: "SIN-70533", insurer: "MAIF", client: "Centre de soins Roubaix", city: "Roubaix",
    brand: "Mercedes", needType: "Médical", needQty: 1, energy: "Diesel", reason: "Panne immobilisante",
    declaredAt: now - 1.5 * 3600e3, slaHours: 24, stage: 0, status: claimStages[0],
    assigned: null, unlockedInH: null, covered: true, contract: mkContract(true),
  });

  for (let i = 0; i < 9; i++) {
    const type = pick(["VL", "VL", "VUL", "PL", "Médical"]);
    const sla = pick([24, 24, 48]);
    const declaredAgoH = ri(1, sla - 1);
    const stage = ri(0, 3);
    const covered = rnd() < 0.82;
    claims.push({
      ref: "SIN-" + (70000 + ri(100, 999)),
      insurer: pick(insurers),
      client: `${pick(firstNames)} ${pick(lastNames)}`,
      city: pick(cities),
      brand: pick(brands),
      needType: type,
      needQty: type === "PL" && rnd() < 0.3 ? 2 : 1,
      energy: pick(energies),
      reason: pick(motifs),
      declaredAt: now - declaredAgoH * 3600e3,
      slaHours: sla,
      stage,
      status: claimStages[stage],
      assigned: stage >= 2 ? pick(dealers).name : null,
      unlockedInH: stage >= 2 ? ri(4, sla - 2) : null,
      covered,
      contract: mkContract(covered ? rnd() < 0.9 : rnd() < 0.4),
    });
  }

  /* ---- Particuliers offreurs ---- */
  const providers = [];
  for (let i = 0; i < 8; i++) {
    const type = pick(["VL", "VL", "PL"]);
    providers.push({
      name: `${pick(firstNames)} ${pick(lastNames)}`,
      city: pick(cities), type, energy: pick(energies),
      model: type === "PL" ? pick(vulModels) : pick(models).model,
      status: rnd() < 0.5 ? "Disponible" : "En mission",
      missions: ri(0, 14),
      earnings: ri(180, 2600),
      rating: +(4 + rnd()).toFixed(1),
    });
  }

  /* ---- Marketplace inversé : enchères urgentes ---- */
  const bidders = dealerDefs.map((d) => d.name).concat(["Particulier · K. Hamdi", "Particulier · L. Petit", "Flotte Express PL"]);
  const auctions = [];
  for (let i = 0; i < 5; i++) {
    const type = pick(["VL", "PL", "PL"]);
    const need = type === "PL"
      ? pick(["PL frigorifique 19T", "Tracteur routier 44T", "Fourgon 20m³", "Benne TP 8x4"])
      : pick(["Berline 5 places", "SUV 7 places", "Citadine électrique", "Utilitaire L2H2"]);
    const deadlineH = pick([6, 12, 24]);
    const budget = type === "PL" ? ri(280, 520) : ri(90, 210);
    const bids = [];
    for (let b = 0; b < ri(2, 5); b++) {
      bids.push({
        provider: pick(bidders),
        price: budget - ri(0, type === "PL" ? 120 : 60),
        deliveryH: ri(2, deadlineH),
        kind: rnd() < 0.4 ? "Particulier" : "Concession",
      });
    }
    bids.sort((a, b) => a.price - b.price);
    auctions.push({
      ref: "ENC-" + (900 + i), need, type, energy: pick(energies),
      city: pick(cities), insurer: pick(insurers),
      deadlineAt: now + deadlineH * 3600e3,
      budgetMax: budget + (type === "PL" ? 40 : 20),
      bids, status: i === 0 ? "Attribuée" : "Ouverte",
    });
  }

  /* ---- KPIs sinistres ---- */
  const unlocked = claims.filter((c) => c.stage >= 2);
  const avgUnlockH = Math.round(unlocked.reduce((s, c) => s + (c.unlockedInH || 0), 0) / (unlocked.length || 1));
  const under24 = Math.round((unlocked.filter((c) => (c.unlockedInH || 99) <= 24).length / (unlocked.length || 1)) * 100);

  /* ---- Maintenance / inspections véhicules ---- */
  const inspectionItems = ["Disques", "Plaquettes avant", "Plaquettes arrière", "Pneumatiques", "Niveaux (huile/liquides)", "Carrosserie", "Éclairage"];
  const inspStates = ["Bon", "À surveiller", "À remplacer"];
  // photo de démonstration générée localement (data-URI, fonctionne hors-ligne)
  const photoPh = (label, color) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#1b2130'/><rect x='8' y='8' width='184' height='124' rx='8' fill='none' stroke='${color}' stroke-opacity='.5'/><circle cx='100' cy='58' r='22' fill='none' stroke='${color}' stroke-width='3'/><text x='100' y='112' font-family='Arial' font-size='13' fill='${color}' text-anchor='middle'>${label}</text></svg>`);
  const mkInspection = (v, mech, driver, agoH, states) => ({
    id: "INS-" + (5000 + Math.floor(rnd() * 9000)),
    vehicleId: v.id, model: v.model, plate: v.plate, city: v.city,
    mechanic: mech, driver, odometer: v.odometer, at: now - agoH * 3600e3,
    items: inspectionItems.map((it, i) => ({ label: it, state: states[i] || "Bon" })),
    photos: [photoPh("Avant", "#6aa6ff"), photoPh("Freins", "#c8a45c"), photoPh("Pneu AV", "#5ec27a")],
    comment: "",
  });
  const inspections = [
    mkInspection(fleet[2], "Karim B. (méca.)", "Transp. Lefebvre", 3, ["À remplacer", "À surveiller", "Bon", "Bon", "Bon", "Bon", "Bon"]),
    mkInspection(fleet[5], "Sophie M. (méca.)", "L. Petit", 26, ["Bon", "Bon", "Bon", "À remplacer", "À surveiller", "Bon", "Bon"]),
    mkInspection(fleet[7], "Marc R. (méca.)", "K. Hamdi", 52, ["Bon", "Bon", "Bon", "Bon", "Bon", "À surveiller", "Bon"]),
  ];
  inspections[0].comment = "Disques voilés à l'avant, remplacement nécessaire avant remise en service.";
  inspections[1].comment = "Pneus avant sous le témoin d'usure, à changer.";

  window.VELORAH_DB = {
    months, fleet, bookings, cities, models, statusList,
    series: { revenue, utilization: utilizationSeries, bookings: bookingsSeries, lossRatio: lossRatioSeries },
    insurance: {
      totalFleetValue, totalClaims, premiumAnnual, claimsCost, lossRatio,
      avgDriverScore, avgRisk, premiumDiscountPct, claimsByType,
      estimatedSaving: Math.round((premiumAnnual * premiumDiscountPct) / 100),
    },
    dealers, claims, providers, auctions, insurers, energies, claimStages, brands,
    inspections, inspectionItems, inspStates, photoPh,
    ops: { avgUnlockH, under24, openClaims: claims.filter((c) => c.stage < 3).length, dealerStock: dealers.reduce((s, d) => s + d.available, 0) },
  };
})();
