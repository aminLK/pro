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
     DeflectNumera — sourcing, sinistres, particuliers, enchères
     ================================================================ */
  const now = Date.now();
  const energies = ["Électrique", "Hybride", "Diesel", "Essence"];
  const plModels = ["Renault T High", "Mercedes Actros", "Volvo FH", "Iveco S-Way", "Scania R450"];
  const vulModels = ["Renault Master", "Iveco Daily", "Fiat Ducato", "Mercedes Sprinter"];

  /* ---- Concessionnaires (pool de sourcing) ---- */
  const brands = ["Renault", "Peugeot", "Mercedes", "BMW", "Volvo", "Tesla"];
  const dealerDefs = [
    { name: "AutoPro Île-de-France", city: "Paris", brand: "Peugeot" },
    { name: "TruckCenter Rhône", city: "Lyon", brand: "Volvo" },
    { name: "Méditerranée VL/PL", city: "Marseille", brand: "Mercedes" },
    { name: "Sud-Ouest Mobilité", city: "Bordeaux", brand: "Renault" },
    { name: "Nord Trucks", city: "Lille", brand: "Volvo" },
    { name: "Riviera Auto", city: "Nice", brand: "BMW" },
    // Pour l'exemple Tourcoing / Roubaix / Renault :
    { name: "Renault Tourcoing", city: "Tourcoing", brand: "Renault" },
    { name: "Renault Roubaix", city: "Roubaix", brand: "Renault" },
  ];
  const dealers = dealerDefs.map((def, i) => {
    const stock = [];
    for (let k = 0; k < ri(3, 5); k++) {
      const type = pick(["VL", "VL", "PL"]);
      stock.push({
        type, energy: pick(energies),
        model: type === "PL" ? pick(plModels) : (rnd() < 0.5 ? pick(vulModels) : pick(models).model),
        qty: ri(1, 6), deliveryH: ri(3, 22),
      });
    }
    // garantir au moins un VL dispo (cas courant véhicule de courtoisie)
    if (!stock.some((s) => s.type === "VL")) stock.push({ type: "VL", energy: pick(energies), model: pick(vulModels), qty: ri(1, 4), deliveryH: ri(3, 12) });
    return {
      id: "CC-" + (200 + i), name: def.name, city: def.city, brand: def.brand, stock,
      available: stock.reduce((s, x) => s + x.qty, 0),
      avgDeliveryH: Math.round(stock.reduce((s, x) => s + x.deliveryH, 0) / stock.length),
      rating: +(4.3 + rnd() * 0.6).toFixed(1),
    };
  });

  /* ---- Sinistres (claims) — pipeline de déblocage ---- */
  const insurers = ["AXA", "Allianz", "Groupama", "MAIF", "Generali", "MACIF"];
  const claimStages = ["Déclaré", "Solution identifiée", "Débloqué", "Livré"];
  const reasons = ["Collision", "Bris de glace majeur", "Vol", "Incendie", "Panne immobilisante"];
  const claimCategories = ["Citadine", "Berline", "SUV"];
  const mkContract = (courtesy) => ({ courtesy, category: pick(claimCategories), maxDays: pick([15, 30, 30, 45]) });
  const claims = [];

  // Cas de démonstration : exactement l'exemple Tourcoing / Roubaix / Renault
  claims.push({
    ref: "SIN-70512", insurer: "Groupama", client: "Camille Dehaene", city: "Tourcoing",
    brand: "Renault", needType: "VL", energy: "Diesel", reason: "Collision",
    declaredAt: now - 2 * 3600e3, slaHours: 24, stage: 0, status: claimStages[0],
    assigned: null, unlockedInH: null, covered: true, contract: mkContract(true),
  });

  for (let i = 0; i < 10; i++) {
    const type = pick(["VL", "VL", "VL", "PL"]);
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
      energy: pick(energies),
      reason: pick(reasons),
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

  window.VELORAH_DB = {
    months, fleet, bookings, cities, models, statusList,
    series: { revenue, utilization: utilizationSeries, bookings: bookingsSeries, lossRatio: lossRatioSeries },
    insurance: {
      totalFleetValue, totalClaims, premiumAnnual, claimsCost, lossRatio,
      avgDriverScore, avgRisk, premiumDiscountPct, claimsByType,
      estimatedSaving: Math.round((premiumAnnual * premiumDiscountPct) / 100),
    },
    dealers, claims, providers, auctions, insurers, energies, claimStages, brands,
    ops: { avgUnlockH, under24, openClaims: claims.filter((c) => c.stage < 3).length, dealerStock: dealers.reduce((s, d) => s + d.available, 0) },
  };
})();
