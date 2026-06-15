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

  window.VELORAH_DB = {
    months, fleet, bookings, cities, models, statusList,
    series: { revenue, utilization: utilizationSeries, bookings: bookingsSeries, lossRatio: lossRatioSeries },
    insurance: {
      totalFleetValue, totalClaims, premiumAnnual, claimsCost, lossRatio,
      avgDriverScore, avgRisk, premiumDiscountPct, claimsByType,
      estimatedSaving: Math.round((premiumAnnual * premiumDiscountPct) / 100),
    },
  };
})();
