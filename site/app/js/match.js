/* ===================================================================
   DeflectMatch — moteur de matching sinistre → véhicule (« Hubert »)
   Algorithme déterministe, logique et mathématique :
     1. Contrôle d'éligibilité du contrat (droit au véhicule de courtoisie)
     2. Filtre par type (VL/PL) et disponibilité de stock
     3. Score par proximité géographique (Haversine), délai de livraison,
        correspondance de marque et d'énergie.
   La meilleure offre = la plus proche + la plus rapide + la marque du contrat.
   =================================================================== */
(function () {
  "use strict";

  // Coordonnées (lat, lon) — incl. agglomération lilloise pour l'exemple Tourcoing/Roubaix
  const GEO = {
    Paris: { lat: 48.8566, lon: 2.3522 },
    Lyon: { lat: 45.7640, lon: 4.8357 },
    Marseille: { lat: 43.2965, lon: 5.3698 },
    Bordeaux: { lat: 44.8378, lon: -0.5792 },
    Lille: { lat: 50.6292, lon: 3.0573 },
    Nice: { lat: 43.7102, lon: 7.2620 },
    Tourcoing: { lat: 50.7236, lon: 3.1610 },
    Roubaix: { lat: 50.6901, lon: 3.1817 },
    Lens: { lat: 50.4319, lon: 2.8300 },
    Valenciennes: { lat: 50.3590, lon: 3.5230 },
  };

  const toRad = (x) => (x * Math.PI) / 180;
  function distanceKm(a, b) {
    const A = GEO[a], B = GEO[b];
    if (!A || !B) return 600; // ville inconnue : pénalité forte
    const R = 6371;
    const dLat = toRad(B.lat - A.lat), dLon = toRad(B.lon - A.lon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(A.lat)) * Math.cos(toRad(B.lat)) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(s)));
  }

  // Éligibilité contractuelle : la cliente a-t-elle droit à un véhicule de remplacement ?
  function eligibility(contract) {
    if (!contract || !contract.courtesy)
      return { ok: false, reason: "Le contrat ne prévoit pas de véhicule de remplacement." };
    return { ok: true, reason: `Véhicule de courtoisie inclus — catégorie ${contract.category}, jusqu'à ${contract.maxDays} jours.` };
  }

  // Poids de l'algorithme — réglables en direct depuis le cockpit.
  // La proximité est le critère n°1 (la plus pénalisante par km).
  const weights = { distance: 0.28, eta: 0.6, brand: 14, energy: 6 };

  // Classement des solutions pour une demande donnée
  function rank(req, dealers) {
    const need = Math.max(1, req.qty || 1);
    const out = [];
    dealers.forEach((d) => {
      d.stock.forEach((s) => {
        if (s.type !== req.needType) return;          // bon gabarit (VL/VUL/PL/Médical)
        if (s.qty < need) return;                      // quantité disponible suffisante
        const dist = distanceKm(req.city, d.city);
        const driveH = Math.round(dist / 70);          // ~70 km/h de convoyage
        const etaH = s.deliveryH + driveH;             // dispo concession + acheminement
        const brandMatch = req.brand && d.brand === req.brand;
        const energyMatch = req.energy && s.energy === req.energy;

        let score = 100;
        score -= Math.min(42, dist * weights.distance); // proximité = critère n°1
        score -= Math.min(30, etaH * weights.eta);      // rapidité
        if (brandMatch) score += weights.brand;         // même marque que le leasing
        if (energyMatch) score += weights.energy;       // énergie identique
        score = Math.max(1, Math.round(score));

        out.push({
          dealer: d, model: s.model, type: s.type, energy: s.energy, qty: s.qty,
          distanceKm: dist, etaH, brandMatch, energyMatch, score,
          reasons: [
            `${dist} km`,
            `livraison ${etaH} h`,
            need > 1 ? `${s.qty} dispo (≥ ${need})` : `${s.qty} dispo`,
            brandMatch ? "marque du contrat ✓" : "autre marque",
            energyMatch ? "énergie ✓" : s.energy,
          ],
        });
      });
    });
    out.sort((a, b) => b.score - a.score || a.etaH - b.etaH);
    return out;
  }

  window.DeflectMatch = { GEO, distanceKm, eligibility, rank, weights };
})();
