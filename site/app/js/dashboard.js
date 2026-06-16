/* ===================================================================
   Velorah Pro — orchestrateur du cockpit
   =================================================================== */
(function () {
  "use strict";
  // Garde d'authentification (démo) : redirige vers la connexion si non authentifié.
  try { if (sessionStorage.getItem("velorah_auth") !== "1") { window.location.replace("login.html"); return; } } catch (_) {}
  const DB = window.VELORAH_DB;
  const C = window.Charts;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const euro = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const eur1 = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 1, notation: "compact" }).format(n);
  const num = (n) => new Intl.NumberFormat("fr-FR").format(n);
  const dt = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  /* ---------- Navigation ---------- */
  const view = $("#view");
  const titles = {
    overview: ["Tableau de bord", "Pilotage temps réel : sinistres, sourcing et SLA 24/48 h"],
    dealers: ["Concessionnaires", "Pool de sourcing tous types (VL, VUL, PL, médical) — stock et délais de mise à dispo"],
    fleet: ["Flotte & tracking", "120 véhicules · kilométrage, occupation et score de risque"],
    maintenance: ["Maintenance & photos", "Fiches d'inspection : photos, état des pièces, mécanicien"],
    claims: ["Sinistres · déblocage en 1 clic", "Identifiez et débloquez un véhicule de remplacement en < 24 h"],
    insurance: ["Assurance & Risque", "Sinistralité, scoring télématique et prime estimée"],
    simulator: ["Simulateur de prime", "Ajustez les paramètres, la prime se recalcule en direct"],
    providers: ["Véhicules à disposition", "Particuliers mettant leur véhicule au service des assurances"],
    auctions: ["Marketplace inversé — enchères urgentes", "Le besoin est posté, les fournisseurs enchérissent en direct"],
    livemap: ["Carte temps réel", "Sinistres en cours, concessions et livraisons en direct"],
    bookings: ["Réservations", "Locations confirmées, en cours et terminées"],
    map: ["Carte d'activité", "Flotte, réservations et sinistres par ville"],
    report: ["Rapport assureur", "Synthèse prête à présenter à votre compagnie"],
  };
  const views = { overview: renderOverview, dealers: renderDealers, fleet: renderFleet, maintenance: renderMaintenance, claims: renderClaims, insurance: renderInsurance, simulator: renderSimulator, providers: renderProviders, auctions: renderAuctions, livemap: renderLiveMap, bookings: renderBookings, map: renderMap, report: renderReport };

  /* ---------- Timers (compte à rebours live) ---------- */
  let timers = [];
  const clearTimers = () => { timers.forEach(clearInterval); timers = []; };
  const everySec = (fn) => { fn(); timers.push(setInterval(fn, 1000)); };
  function remain(targetMs) {
    const d = targetMs - Date.now();
    if (d <= 0) return { txt: "Échéance dépassée", cls: "crit", over: true };
    const h = Math.floor(d / 3600e3), m = Math.floor((d % 3600e3) / 60e3), s = Math.floor((d % 60e3) / 1000);
    return { txt: `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`, cls: h < 3 ? "crit" : h < 8 ? "warn" : "ok", over: false };
  }

  /* ---------- Modale générique ---------- */
  const dnModal = $("#dnModal"), dnBody = $("#dnModalBody");
  function openModal(html) { dnBody.innerHTML = `<div class="mbody">${html}</div>`; dnModal.classList.add("open"); dnModal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  function closeModal() { dnModal.classList.remove("open"); dnModal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  dnModal.addEventListener("click", (e) => { if (e.target.matches("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && dnModal.classList.contains("open")) closeModal(); });

  function go(name) {
    clearTimers();
    $$(".side-link").forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
    $("#viewTitle").textContent = titles[name][0];
    $("#viewSub").textContent = titles[name][1];
    view.innerHTML = "";
    view.classList.remove("view-enter"); void view.offsetWidth; view.classList.add("view-enter");
    (views[name] || renderOverview)();
    closeSidebar();
    window.scrollTo({ top: 0 });
  }
  $("#sideNav").addEventListener("click", (e) => { const b = e.target.closest(".side-link"); if (b) go(b.dataset.view); });

  /* ---------- Sidebar mobile ---------- */
  const sidebar = $("#sidebar"), scrim = $("#scrim");
  const openSidebar = () => { sidebar.classList.add("open"); scrim.classList.add("show"); };
  const closeSidebar = () => { sidebar.classList.remove("open"); scrim.classList.remove("show"); };
  $("#menuBtn").addEventListener("click", openSidebar);
  scrim.addEventListener("click", closeSidebar);

  /* ---------- Export / toast ---------- */
  $("#exportBtn").addEventListener("click", () => toast("Export généré", "Le rapport PDF de synthèse a été préparé et téléchargé."));
  function toast(title, msg) {
    let t = $(".toast"); if (t) t.remove();
    t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `<b>${title}</b><span>${msg}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3800);
  }

  /* ---------- Composants réutilisables ---------- */
  function kpi({ label, value, delta, up = true, icon }) {
    return `<div class="card kpi">
      <div class="kpi__top"><span class="kpi__label">${label}</span><span class="kpi__icon">${icon}</span></div>
      <div class="kpi__val">${value}</div>
      <div class="kpi__delta ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${delta}</div>
      <canvas class="kpi__spark"></canvas></div>`;
  }
  function statusTag(s) {
    const map = { "Disponible": "green", "En location": "gold", "En cours": "gold", "Confirmée": "green", "Terminée": "muted", "Maintenance": "red" };
    return `<span class="tag tag--${map[s] || "muted"}">${s}</span>`;
  }
  function riskTag(score) {
    const cls = score >= 60 ? "red" : score >= 45 ? "gold" : "green";
    const lbl = score >= 60 ? "Élevé" : score >= 45 ? "Modéré" : "Faible";
    return `<span class="tag tag--${cls}">${lbl} · ${score}</span>`;
  }

  /* ================================================================
     VUE — Tableau de bord
     ================================================================ */
  function renderOverview() {
    const s = DB.series, ins = DB.insurance;
    const revTotal = s.revenue.reduce((a, b) => a + b, 0);
    const active = DB.fleet.filter((v) => v.status === "En location").length;
    const avgUtil = Math.round(s.utilization.reduce((a, b) => a + b, 0) / s.utilization.length);

    const ops = DB.ops;
    view.innerHTML = `
      <div class="grid kpis">
        ${kpi({ label: "Sinistres ouverts", value: num(ops.openClaims), delta: "déblocage en cours", up: true, icon: "◈" })}
        ${kpi({ label: "Délai moyen de déblocage", value: ops.avgUnlockH + " h", delta: "objectif < 24 h", up: true, icon: "⚡" })}
        ${kpi({ label: "Sinistres résolus < 24 h", value: ops.under24 + " %", delta: "+9 pts", up: true, icon: "✓" })}
        ${kpi({ label: "Véhicules mobilisables", value: num(ops.dealerStock) + " + flotte", delta: "Tous types · multi-énergie", up: true, icon: "▤" })}
      </div>

      <div class="grid" style="grid-template-columns:1.6fr 1fr">
        <div class="card card--pad">
          <div class="card__head"><h3>Chiffre d'affaires mensuel</h3><span class="sub">en €</span></div>
          <div class="chart-wrap"><canvas id="cRev"></canvas></div>
        </div>
        <div class="card card--pad">
          <div class="card__head"><h3>Répartition des sinistres</h3><span class="sub">12 mois</span></div>
          <div class="chart-wrap"><canvas id="cClaims"></canvas></div>
          <div class="legend" id="claimsLegend"></div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="card card--pad">
          <div class="card__head"><h3>Taux d'occupation</h3><span class="sub">% / mois</span></div>
          <div class="chart-wrap chart-wrap--sm"><canvas id="cUtil"></canvas></div>
        </div>
        <div class="card card--pad">
          <div class="card__head"><h3>Volume de réservations</h3><span class="sub">par mois</span></div>
          <div class="chart-wrap chart-wrap--sm"><canvas id="cBook"></canvas></div>
        </div>
      </div>`;

    sparkAll();
    C.line($("#cRev"), { values: s.revenue, labels: DB.months, suffix: "" });
    C.donut($("#cClaims"), { segments: ins.claimsByType, centerLabel: num(ins.totalClaims), centerSub: "sinistres" });
    $("#claimsLegend").innerHTML = ins.claimsByType.map((c) => `<span><i style="background:${c.color}"></i>${c.label} · ${c.value}%</span>`).join("");
    C.bar($("#cUtil"), { values: s.utilization, labels: DB.months, suffix: "%", colorFor: () => C.COLORS.gold });
    C.line($("#cBook"), { values: s.bookings, labels: DB.months, area: true, color: C.COLORS.blue });
  }

  function sparkAll() {
    $$(".kpi__spark").forEach((cv) => {
      const data = Array.from({ length: 14 }, (_, i) => 40 + Math.sin(i / 2) * 12 + i * 1.5 + Math.random() * 8);
      C.sparkline(cv, data, C.COLORS.gold);
    });
  }

  /* ================================================================
     VUE — Flotte
     ================================================================ */
  function renderFleet() {
    view.innerHTML = `
      <div class="card card--pad">
        <div class="toolbar">
          <input id="fSearch" placeholder="Rechercher un modèle, une plaque, une ville…" />
          <select id="fCat"><option value="">Toutes catégories</option>${[...new Set(DB.fleet.map((v) => v.cat))].map((c) => `<option>${c}</option>`).join("")}</select>
          <select id="fStatus"><option value="">Tous statuts</option>${DB.statusList.map((s) => `<option>${s}</option>`).join("")}</select>
          <span class="pill" id="fCount"></span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Véhicule</th><th>Plaque</th><th>Ville</th><th>Statut</th>
              <th>Occupation</th><th>Score risque</th><th>Valeur</th>
            </tr></thead>
            <tbody id="fBody"></tbody>
          </table>
        </div>
      </div>`;

    const draw = () => {
      const q = $("#fSearch").value.toLowerCase();
      const cat = $("#fCat").value, st = $("#fStatus").value;
      const rows = DB.fleet.filter((v) =>
        (!cat || v.cat === cat) && (!st || v.status === st) &&
        (!q || (v.model + v.plate + v.city + v.id).toLowerCase().includes(q)));
      $("#fCount").textContent = rows.length + " véhicules";
      $("#fBody").innerHTML = rows.slice(0, 60).map((v) => `
        <tr>
          <td><div class="cell-strong">${v.model}</div><div class="mono" style="font-size:.78rem">${v.id} · ${v.cat} · ${v.year}</div></td>
          <td class="mono">${v.plate}</td>
          <td>${v.city}</td>
          <td>${statusTag(v.status)}</td>
          <td><div class="score"><div class="bar-mini"><i style="width:${v.utilization}%"></i></div><b>${v.utilization}%</b></div></td>
          <td>${riskTag(v.riskScore)}</td>
          <td class="mono">${euro(v.value)}</td>
        </tr>`).join("");
    };
    ["#fSearch", "#fCat", "#fStatus"].forEach((s) => $(s).addEventListener("input", draw));
    draw();
  }

  /* ================================================================
     VUE — Réservations
     ================================================================ */
  function renderBookings() {
    view.innerHTML = `
      <div class="card card--pad">
        <div class="toolbar">
          <input id="bSearch" placeholder="Client, véhicule, référence…" />
          <select id="bStatus"><option value="">Tous statuts</option><option>Confirmée</option><option>En cours</option><option>Terminée</option></select>
          <span class="pill" id="bCount"></span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Réf.</th><th>Client</th><th>Véhicule</th><th>Ville</th><th>Période</th><th>Durée</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody id="bBody"></tbody>
          </table>
        </div>
      </div>`;
    const draw = () => {
      const q = $("#bSearch").value.toLowerCase(), st = $("#bStatus").value;
      const rows = DB.bookings.filter((b) =>
        (!st || b.status === st) && (!q || (b.client + b.vehicle + b.ref).toLowerCase().includes(q)));
      $("#bCount").textContent = rows.length + " réservations";
      $("#bBody").innerHTML = rows.map((b) => `
        <tr>
          <td class="mono">${b.ref}</td>
          <td class="cell-strong">${b.client}</td>
          <td>${b.vehicle}</td>
          <td>${b.city}</td>
          <td class="mono">${dt(b.start)} → ${dt(b.end)}</td>
          <td>${b.days} j</td>
          <td class="mono cell-strong">${euro(b.amount)}</td>
          <td>${statusTag(b.status)}</td>
        </tr>`).join("");
    };
    ["#bSearch", "#bStatus"].forEach((s) => $(s).addEventListener("input", draw));
    draw();
  }

  /* ================================================================
     VUE — Assurance & Risque  (★ la pièce maîtresse)
     ================================================================ */
  function renderInsurance() {
    const ins = DB.insurance;
    // top 5 véhicules les plus risqués
    const risky = [...DB.fleet].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);
    const topDrivers = Math.round(DB.fleet.filter((v) => v.driverScore >= 90).length / DB.fleet.length * 100);

    view.innerHTML = `
      <div class="ins-hero">
        <div class="ins-banner">
          <h2>Économie de prime estimée grâce à la télématique</h2>
          <p>Fleet Navira équipe 100% de sa flotte de capteurs de conduite. Le scoring comportemental
             permet de négocier une prime indexée sur le risque réel — pas sur une moyenne de marché.</p>
          <div class="ins-figure"><b>${euro(ins.estimatedSaving)}</b><span>/ an &nbsp;·&nbsp; soit -${ins.premiumDiscountPct}% sur la prime</span></div>
          <div class="callout" style="margin-top:18px"><span>✓</span><div><b>Argument assureur :</b> un ratio S/P de ${ins.lossRatio}% (sous la barre des 70%) et un score conducteur moyen de ${ins.avgDriverScore}/100 placent la flotte dans le meilleur quartile de risque.</div></div>
        </div>
        <div class="card card--pad">
          <div class="card__head"><h3>Score de risque global</h3><span class="sub">flotte</span></div>
          <div class="gauge-wrap"><canvas id="cGauge"></canvas></div>
          <div class="legend"><span><i style="background:var(--green)"></i>Faible</span><span><i style="background:var(--gold)"></i>Modéré</span><span><i style="background:var(--red)"></i>Élevé</span></div>
        </div>
      </div>

      <div class="metric-row">
        <div class="metric"><div class="lbl">Valeur assurée de la flotte</div><div class="val">${eur1(ins.totalFleetValue)}</div><div class="foot tag tag--muted">120 véhicules</div></div>
        <div class="metric"><div class="lbl">Prime annuelle actuelle</div><div class="val">${euro(ins.premiumAnnual)}</div><div class="foot tag tag--gold">~4,6% de la valeur</div></div>
        <div class="metric"><div class="lbl">Coût des sinistres (12 mois)</div><div class="val">${euro(ins.claimsCost)}</div><div class="foot tag tag--green">Ratio S/P ${ins.lossRatio}%</div></div>
      </div>

      <div class="grid" style="grid-template-columns:1.4fr 1fr">
        <div class="card card--pad">
          <div class="card__head"><h3>Évolution du ratio sinistres / primes</h3><span class="sub">objectif &lt; 70%</span></div>
          <div class="chart-wrap"><canvas id="cLoss"></canvas></div>
        </div>
        <div class="card card--pad">
          <div class="card__head"><h3>Qualité de conduite</h3><span class="sub">télématique</span></div>
          <div class="progress-list">
            ${progress("Freinage souple", DB.insurance.avgDriverScore)}
            ${progress("Respect des vitesses", Math.min(99, ins.avgDriverScore + 4))}
            ${progress("Accélérations maîtrisées", ins.avgDriverScore - 5)}
            ${progress("Conducteurs « excellents » (≥90)", topDrivers)}
          </div>
        </div>
      </div>

      <div class="card card--pad">
        <div class="card__head"><h3>Véhicules à surveiller</h3><span class="sub">score de risque le plus élevé</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Véhicule</th><th>Ville</th><th>Sinistres (12 m)</th><th>Score conducteur</th><th>Score risque</th></tr></thead>
            <tbody>${risky.map((v) => `
              <tr>
                <td><div class="cell-strong">${v.model}</div><div class="mono" style="font-size:.78rem">${v.id} · ${v.plate}</div></td>
                <td>${v.city}</td>
                <td>${v.claims}</td>
                <td><div class="score"><div class="bar-mini"><i style="width:${v.driverScore}%"></i></div><b>${v.driverScore}</b></div></td>
                <td>${riskTag(v.riskScore)}</td>
              </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>`;

    C.gauge($("#cGauge"), { value: ins.avgRisk, max: 100, color: ins.avgRisk >= 60 ? C.COLORS.red : ins.avgRisk >= 45 ? C.COLORS.gold : C.COLORS.green, label: "indice / 100" });
    C.line($("#cLoss"), { values: DB.series.lossRatio.map((v) => Math.round(v)), labels: DB.months, suffix: "%", color: C.COLORS.green });
  }
  function progress(name, pct) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    const col = pct >= 85 ? "var(--green)" : pct >= 70 ? "var(--gold)" : "var(--red)";
    return `<div class="progress"><span class="name">${name}</span><span class="pct">${pct}%</span><div class="track"><i style="width:${pct}%;background:${col}"></i></div></div>`;
  }

  /* ================================================================
     VUE — Simulateur de prime  (★ argument de négociation)
     ================================================================ */
  function renderSimulator() {
    view.innerHTML = `
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="card card--pad">
          <div class="card__head"><h3>Paramètres de la flotte</h3><span class="sub">faites varier les curseurs</span></div>
          <div class="sim-controls" id="simControls">
            ${slider("count", "Nombre de véhicules", 10, 400, 120, "")}
            ${slider("value", "Valeur moyenne / véhicule", 15000, 160000, 80250, " €", 500)}
            ${slider("driver", "Score conducteur moyen", 55, 99, DB.insurance.avgDriverScore, " / 100")}
            ${slider("franchise", "Franchise par sinistre", 0, 3000, 800, " €", 100)}
            <div class="sim-toggle" id="telToggle">
              <label class="bm-check"><input type="checkbox" id="tel" checked> Télématique embarquée (100% de la flotte)</label>
            </div>
          </div>
        </div>

        <div class="card card--pad sim-result" id="simResult"><!-- live --></div>
      </div>

      <div class="card card--pad">
        <div class="card__head"><h3>Décomposition de la prime annuelle</h3><span class="sub">impact de chaque levier</span></div>
        <div class="chart-wrap chart-wrap--sm"><canvas id="cSim"></canvas></div>
      </div>`;

    const get = (id) => +$("#sim-" + id).value;
    const compute = () => {
      const count = get("count"), value = get("value"), driver = get("driver"), franchise = get("franchise");
      const tel = $("#tel").checked;
      // Taux de base : 5,2% de la valeur, atténué par une franchise plus élevée
      const baseRate = 0.052 - (franchise / 3000) * 0.012;
      const gross = count * value * baseRate;
      // Remise comportementale (télématique) : jusqu'à ~22%
      const telDiscount = tel ? Math.max(0, (driver - 60) / 100 * 0.55) : 0;
      // Bonus volume : grandes flottes mieux négociées
      const volDiscount = Math.min(0.08, count / 400 * 0.08);
      const totalDiscount = Math.min(0.4, telDiscount + volDiscount);
      const net = gross * (1 - totalDiscount);
      const saving = gross - net;
      return { count, value, driver, franchise, tel, gross, telDiscount, volDiscount, totalDiscount, net, saving };
    };

    const draw = () => {
      const r = compute();
      // libellés des curseurs
      $("#sim-count-out").textContent = num(r.count);
      $("#sim-value-out").textContent = euro(r.value);
      $("#sim-driver-out").textContent = r.driver + " / 100";
      $("#sim-franchise-out").textContent = euro(r.franchise);

      $("#simResult").innerHTML = `
        <div class="card__head"><h3>Prime estimée</h3><span class="sub">par an</span></div>
        <div class="sim-big">${euro(r.net)}<small>/ an</small></div>
        <div class="sim-saving ${r.saving > 0 ? "pos" : ""}">${r.saving > 0 ? "▼ " + euro(r.saving) + " économisés (-" + Math.round(r.totalDiscount * 100) + "%)" : "Aucune remise active"}</div>
        <div class="sim-lines">
          <div class="bm-line"><span>Prime brute (avant remises)</span><span>${euro(r.gross)}</span></div>
          <div class="bm-line"><span>Remise télématique</span><span>-${Math.round(r.telDiscount * 100)}%</span></div>
          <div class="bm-line"><span>Bonus volume flotte</span><span>-${Math.round(r.volDiscount * 100)}%</span></div>
          <div class="bm-line total"><span>Prime nette</span><b>${euro(r.net)}</b></div>
        </div>
        <div class="callout" style="margin-top:16px"><span>✓</span><div>À présenter : ${r.tel ? "la télématique" : "sans télématique, "} ${r.tel ? "génère " + Math.round(r.telDiscount * 100) + "% de remise comportementale" : "vous laissez " + euro(r.gross * 0.15) + "/an sur la table"}.</div></div>`;

      C.bar($("#cSim"), {
        values: [Math.round(r.gross), Math.round(r.gross * r.telDiscount), Math.round(r.gross * r.volDiscount), Math.round(r.net)],
        labels: ["Brute", "Rem. télé.", "Bonus vol.", "Nette"],
        suffix: "",
        colorFor: (i) => [C.COLORS.red, C.COLORS.gold, C.COLORS.blue, C.COLORS.green][i],
      });
    };
    $("#simControls").addEventListener("input", draw);
    draw();
  }
  function slider(id, label, min, max, val, suffix = "", step = 1) {
    return `<div class="sim-field">
      <div class="sim-field__top"><label>${label}</label><span class="sim-out" id="sim-${id}-out"></span></div>
      <input type="range" id="sim-${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-suffix="${suffix}" />
    </div>`;
  }

  /* ================================================================
     VUE — Carte d'activité (l'Hexagone stylisé)
     ================================================================ */
  function renderMap() {
    // agrégation par ville
    const byCity = {};
    DB.cities.forEach((c) => (byCity[c] = { vehicles: 0, value: 0, claims: 0, bookings: 0 }));
    DB.fleet.forEach((v) => { const c = byCity[v.city]; if (c) { c.vehicles++; c.value += v.value; c.claims += v.claims; } });
    DB.bookings.forEach((b) => { if (byCity[b.city]) byCity[b.city].bookings++; });
    // coordonnées approximatives (viewBox 0..100 x 0..120)
    const coords = { Paris: [50, 32], Lille: [55, 12], Lyon: [62, 66], Marseille: [66, 98], Bordeaux: [30, 78], Nice: [82, 92] };
    const maxV = Math.max(...DB.cities.map((c) => byCity[c].vehicles));

    const markers = DB.cities.map((c) => {
      const [x, y] = coords[c]; const d = byCity[c];
      const r = 2.4 + (d.vehicles / maxV) * 3.2;
      return `<g class="mk" data-city="${c}" transform="translate(${x},${y})">
        <circle class="mk__halo" r="${r + 4}"></circle>
        <circle class="mk__dot" r="${r}"></circle>
        <text class="mk__lbl" y="${-r - 2.4}">${c}</text>
        <text class="mk__cnt" y="${r + 4.2}">${d.vehicles} véh.</text>
      </g>`;
    }).join("");

    view.innerHTML = `
      <div class="grid" style="grid-template-columns:1.3fr 1fr">
        <div class="card card--pad">
          <div class="card__head"><h3>Implantation de la flotte</h3><span class="sub">survolez une ville</span></div>
          <div class="map-wrap">
            <svg viewBox="0 0 100 120" class="map-svg" preserveAspectRatio="xMidYMid meet">
              <path class="map-fr" d="M48 6 L60 9 L58 18 L68 22 L72 34 L86 40 L84 52 L90 64 L82 74 L86 90 L74 96 L66 108 L56 104 L48 110 L40 100 L28 96 L22 84 L12 74 L20 62 L14 50 L24 40 L22 28 L34 22 L40 12 Z"/>
              ${markers}
            </svg>
          </div>
        </div>
        <div class="card card--pad">
          <div class="card__head"><h3>Détail par ville</h3><span class="sub" id="mapHint">Toutes agences</span></div>
          <div class="table-wrap">
            <table><thead><tr><th>Ville</th><th>Véhicules</th><th>Locations</th><th>Sinistres</th><th>Valeur</th></tr></thead>
            <tbody id="mapBody">${DB.cities.map((c) => { const d = byCity[c]; return `
              <tr data-city="${c}"><td class="cell-strong">${c}</td><td>${d.vehicles}</td><td>${d.bookings}</td>
              <td>${d.claims ? `<span class="tag tag--red">${d.claims}</span>` : `<span class="tag tag--green">0</span>`}</td>
              <td class="mono">${eur1(d.value)}</td></tr>`; }).join("")}</tbody></table>
          </div>
        </div>
      </div>`;

    const highlight = (city) => {
      $$(".mk").forEach((m) => m.classList.toggle("is-on", m.dataset.city === city));
      $$("#mapBody tr").forEach((r) => r.classList.toggle("row-on", r.dataset.city === city));
      $("#mapHint").textContent = city ? "Agence de " + city : "Toutes agences";
    };
    $$(".mk").forEach((m) => { m.addEventListener("mouseenter", () => highlight(m.dataset.city)); m.addEventListener("mouseleave", () => highlight(null)); });
    $$("#mapBody tr").forEach((r) => { r.addEventListener("mouseenter", () => highlight(r.dataset.city)); r.addEventListener("mouseleave", () => highlight(null)); });
  }

  /* ================================================================
     VUE — Sinistres · déblocage en 1 clic  (★ cœur Fleet Navira)
     ================================================================ */
  const typeSlug = (t) => ({ "VL": "VL", "VUL": "VUL", "PL": "PL", "Médical": "MED" }[t] || "VL");
  const typeBadge = (t) => `<span class="type-badge type-${typeSlug(t)}">${t}</span>`;
  const tuneSlider = (k, label, min, max, val, step) => `
    <div class="sim-field">
      <div class="sim-field__top"><label>${label}</label><span class="sim-out" id="tune-${k}-out">${val}</span></div>
      <input type="range" data-w="${k}" id="tune-${k}" min="${min}" max="${max}" step="${step}" value="${val}" />
    </div>`;
  function stepper(stage) {
    const labels = DB.claimStages;
    let html = '<div class="stepper">';
    for (let i = 0; i < labels.length; i++) {
      const cls = i < stage ? "done" : i === stage ? "cur" : "";
      html += `<span class="dot ${cls}"></span>`;
      if (i < labels.length - 1) html += `<span class="seg ${i < stage ? "done" : ""}"></span>`;
    }
    html += '</div><div class="steplabels">' + labels.map((l) => `<span>${l}</span>`).join("") + "</div>";
    return html;
  }

  function renderClaims() {
    const ops = DB.ops;
    const head = `
      <div class="grid kpis">
        ${kpi({ label: "Sinistres ouverts", value: num(DB.claims.filter((c) => c.stage < 3).length), delta: "à traiter", up: true, icon: "◈" })}
        ${kpi({ label: "Délai moyen", value: ops.avgUnlockH + " h", delta: "< 24 h visé", up: true, icon: "⚡" })}
        ${kpi({ label: "Résolus < 24 h", value: ops.under24 + " %", delta: "SLA", up: true, icon: "✓" })}
        ${kpi({ label: "Véhicules mobilisables", value: num(ops.dealerStock), delta: "stock concession", up: true, icon: "▤" })}
      </div>`;

    const W = window.DeflectMatch.weights;
    view.innerHTML = head +
      `<div class="card card--pad" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
        <div><h3 style="font-size:1.05rem">File des sinistres</h3><span class="sub" style="color:var(--muted);font-size:.85rem">Moteur de matching « Hubert » : proximité + contrat + marque</span></div>
        <div style="display:flex;gap:.6rem">
          <button class="btn btn--ghost" id="tuneBtn">⚙ Réglages du moteur</button>
          <button class="btn btn--gold" id="declareBtn">+ Déclarer un sinistre</button>
        </div>
      </div>
      <div class="card card--pad" id="tunePanel" hidden>
        <div class="card__head"><h3>Pondération de l'algorithme</h3><span class="sub">l'impact est immédiat sur le prochain matching</span></div>
        <div class="sim-controls">
          ${tuneSlider("distance", "Poids de la proximité", 0, 0.6, W.distance, 0.01)}
          ${tuneSlider("eta", "Poids du délai de livraison", 0, 2, W.eta, 0.05)}
          ${tuneSlider("brand", "Bonus marque du contrat", 0, 30, W.brand, 1)}
          ${tuneSlider("energy", "Bonus énergie identique", 0, 20, W.energy, 1)}
        </div>
      </div>
      <div class="grid" id="claimList" style="gap:14px"></div>`;
    sparkAll();
    $("#declareBtn").addEventListener("click", () => openDeclare(() => renderList()));
    $("#tuneBtn").addEventListener("click", () => { const p = $("#tunePanel"); p.hidden = !p.hidden; });
    $("#tunePanel").addEventListener("input", (e) => {
      const k = e.target.dataset.w; if (!k) return;
      window.DeflectMatch.weights[k] = +e.target.value;
      $("#tune-" + k + "-out").textContent = e.target.value;
    });

    const renderList = () => {
      $("#claimList").innerHTML = DB.claims.map((c, i) => {
        const deadline = c.declaredAt + c.slaHours * 3600e3;
        const r = remain(deadline);
        const done = c.stage >= 2;
        const action = done
          ? `<div style="text-align:right"><div class="tag tag--green">Débloqué</div><div class="meta" style="color:var(--muted);font-size:.78rem;margin-top:.3rem">via ${c.assigned}</div></div>`
          : `<button class="btn btn--gold" data-unlock="${i}">⚡ Débloquer en 1 clic</button>`;
        return `<div class="claim">
          <div class="claim__head">
            <b>${c.ref} · ${c.reason}</b>
            <div class="meta">${c.insurer} — ${c.client} · ${c.city} ${c.covered ? "" : "· <span style='color:var(--gold-2)'>non couvert</span>"}</div>
            ${stepper(c.stage)}
          </div>
          <div class="claim__need">${typeBadge(c.needType)}${(c.needQty || 1) > 1 ? `<span class="tag tag--gold">×${c.needQty}</span>` : ""}<span class="tag tag--muted">${c.energy}</span><span class="tag tag--muted">SLA ${c.slaHours} h</span></div>
          <div class="countdown ${r.cls}" data-deadline="${deadline}">${r.txt}<small>temps restant SLA</small></div>
          <div>${action}</div>
        </div>`;
      }).join("");
    };
    renderList();

    // compte à rebours live
    everySec(() => {
      $$("[data-deadline]").forEach((el) => {
        const r = remain(+el.dataset.deadline);
        el.className = "countdown " + r.cls;
        el.innerHTML = r.txt + "<small>temps restant SLA</small>";
      });
    });

    // déblocage en 1 clic -> propose les véhicules sourcés
    $("#claimList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-unlock]");
      if (!btn) return;
      const claim = DB.claims[+btn.dataset.unlock];
      openUnlock(claim, +btn.dataset.unlock, renderList);
    });
  }

  function openUnlock(claim, idx, refresh) {
    const M = window.DeflectMatch;
    const elig = M.eligibility(claim.contract);

    // Garde contractuelle : pas de véhicule de courtoisie => pas de déblocage
    if (!elig.ok) {
      openModal(`
        <h3>Vérification du contrat — ${claim.ref}</h3>
        <p class="msub">${claim.client} · ${claim.insurer} · ${claim.city}</p>
        <div class="callout" style="background:var(--red-soft);border-color:rgba(239,111,111,.35)"><span>⚠</span><div><b>Non éligible.</b> ${elig.reason} Aucun véhicule ne peut être débloqué automatiquement.</div></div>
        <p class="msub" style="margin-top:1rem">Le dossier peut être basculé en marketplace inversé si l'assureur prend en charge à titre commercial.</p>
      `);
      return;
    }

    const ranked = M.rank({ city: claim.city, brand: claim.brand, needType: claim.needType, energy: claim.energy, qty: claim.needQty || 1 }, DB.dealers);
    const top = ranked.slice(0, 5);

    openModal(`
      <h3>Matching « Hubert » — ${claim.ref}</h3>
      <p class="msub">Besoin : ${typeBadge(claim.needType)}${(claim.needQty || 1) > 1 ? ` ×${claim.needQty}` : ""} ${claim.energy} · ${claim.brand} · ${claim.city} · <em>${claim.reason}</em></p>
      <div class="callout" style="margin-bottom:1.1rem"><span>✓</span><div>${elig.reason}</div></div>
      <p class="msub" style="margin-bottom:.6rem">Solutions classées par l'algorithme — <b>proximité + délai + marque du contrat</b> :</p>
      ${top.map((m, i) => `
        <div class="match" data-pick="${i}">
          <span class="match__rank">${i === 0 ? "★" : "#" + (i + 1)}</span>
          <div class="match__main">
            <b>${m.model} — ${m.dealer.name}</b>
            <span>${m.dealer.brand} · ${m.dealer.city} · ${m.energy}</span>
            <div class="match__reasons">${m.reasons.map((r) => `<span>${r}</span>`).join("")}</div>
          </div>
          <div class="match__eta"><span class="match__score">${m.score}</span><small>score</small><b>${m.etaH} h</b></div>
        </div>`).join("")}
    `);

    dnBody.querySelectorAll("[data-pick]").forEach((el) => el.addEventListener("click", () => {
      const m = top[+el.dataset.pick];
      claim.stage = 3; claim.status = "Livré"; claim.assigned = m.dealer.name; claim.unlockedInH = m.etaH;
      showJourney(claim, m);
      refresh();
    }));
  }

  // Parcours complet : confirmation animée jusqu'à la livraison
  function showJourney(claim, m) {
    openModal(`
      <div style="text-align:center">
        <div class="bm__check" style="margin:0 auto 1.1rem">✓</div>
        <h3>Solution débloquée en 1 clic</h3>
        <p class="msub" style="margin-bottom:1.4rem">${claim.ref} · ${claim.client} · ${claim.city}</p>
      </div>
      <div class="journey">
        ${["Sinistre déclaré", "Solution identifiée", "Concessionnaire mobilisé", "Véhicule livré"].map((s, i) => `
          <div class="jstep ${i <= 3 ? "done" : ""}"><span class="jdot">${i < 3 ? "✓" : "→"}</span><div><b>${s}</b>${i === 2 ? `<span>${m.dealer.name} · ${m.dealer.city}</span>` : i === 3 ? `<span>${m.model} · sous ${m.etaH} h · ${m.distanceKm} km</span>` : ""}</div></div>`).join("")}
      </div>
      <div class="logi">
        <div class="logi__pt"><span class="logi__dot logi__dot--start"></span><div><b>Départ</b><span>${m.dealer.name} · ${m.dealer.city}</span></div></div>
        <div class="logi__line"><span>${m.distanceKm} km · convoyage</span></div>
        <div class="logi__pt"><span class="logi__dot logi__dot--end"></span><div><b>Livraison</b><span>${claim.city} · ${claim.client}</span></div></div>
      </div>
      <div class="bm-line total" style="margin-top:1rem"><span>Délai total estimé</span><b>${m.etaH} h ${m.etaH <= claim.slaHours ? "· SLA respecté ✓" : ""}</b></div>
      <button class="btn btn--gold btn--block" data-close style="margin-top:1.2rem;width:100%">Terminer</button>
    `);
    toast("Solution débloquée ⚡", `${m.model} chez ${m.dealer.name} (${m.distanceKm} km) — livré sous ${m.etaH} h. SLA respecté.`);
  }

  // Formulaire de déclaration d'un sinistre (pré-rempli sur l'exemple Tourcoing)
  function openDeclare(refresh) {
    const opt = (arr, sel) => arr.map((x) => `<option ${x === sel ? "selected" : ""}>${x}</option>`).join("");
    openModal(`
      <h3>Déclarer un sinistre</h3>
      <p class="msub">Le besoin est qualifié, puis le moteur cherche la solution la plus proche et éligible.</p>
      <form id="declareForm">
        <div class="bm__row">
          <div class="bm__field"><label>Assuré(e)</label><input id="d-client" value="Camille Dehaene" required /></div>
          <div class="bm__field"><label>Assureur</label><select id="d-insurer">${opt(DB.insurers, "Groupama")}</select></div>
        </div>
        <div class="bm__row">
          <div class="bm__field"><label>Lieu du sinistre</label><select id="d-city">${opt(Object.keys(window.DeflectMatch.GEO), "Tourcoing")}</select></div>
          <div class="bm__field"><label>Marque (leasing)</label><select id="d-brand">${opt(DB.brands, "Renault")}</select></div>
        </div>
        <div class="bm__row">
          <div class="bm__field"><label>Gabarit</label><select id="d-type"><option value="VL">VL — véhicule léger</option><option value="VUL">VUL — utilitaire</option><option value="PL">PL — poids lourd</option><option value="Médical">Médical — ambulance / VSL</option></select></div>
          <div class="bm__field"><label>Énergie</label><select id="d-energy">${opt(DB.energies, "Diesel")}</select></div>
        </div>
        <div class="bm__row">
          <div class="bm__field"><label>Quantité</label><select id="d-qty"><option>1</option><option>2</option><option>3</option></select></div>
          <div class="bm__field"><label>Motif</label><select id="d-motif"><option>Collision</option><option>Panne immobilisante</option><option>Mise aux normes (non conforme)</option><option>Vol</option><option>Incendie</option></select></div>
        </div>
        <label class="bm-check" style="margin:.4rem 0 1.1rem"><input type="checkbox" id="d-courtesy" checked> Contrat avec véhicule de remplacement inclus</label>
        <button type="submit" class="btn btn--gold btn--block" style="width:100%">Qualifier &amp; rechercher une solution</button>
      </form>
    `);
    $("#declareForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const claim = {
        ref: "SIN-" + (70000 + Math.floor(Math.random() * 900 + 100)),
        insurer: $("#d-insurer").value, client: $("#d-client").value || "Assuré",
        city: $("#d-city").value, brand: $("#d-brand").value,
        needType: $("#d-type").value, needQty: +$("#d-qty").value || 1,
        energy: $("#d-energy").value, reason: $("#d-motif").value,
        declaredAt: Date.now(), slaHours: 24, stage: 0, status: DB.claimStages[0],
        assigned: null, unlockedInH: null, covered: true,
        contract: { courtesy: $("#d-courtesy").checked, category: "Berline", maxDays: 30 },
      };
      DB.claims.unshift(claim);
      refresh();
      openUnlock(claim, 0, refresh); // enchaîne directement sur le matching
    });
  }

  /* ================================================================
     VUE — Concessionnaires (sourcing)
     ================================================================ */
  function renderDealers() {
    view.innerHTML = `
      <div class="grid kpis">
        ${kpi({ label: "Concessionnaires partenaires", value: DB.dealers.length, delta: "réseau actif", up: true, icon: "▤" })}
        ${kpi({ label: "Véhicules mobilisables", value: num(DB.ops.dealerStock), delta: "VL · VUL · PL · Médical", up: true, icon: "▥" })}
        ${kpi({ label: "Délai moyen de mise à dispo", value: Math.round(DB.dealers.reduce((s, d) => s + d.avgDeliveryH, 0) / DB.dealers.length) + " h", delta: "objectif < 24 h", up: true, icon: "⚡" })}
        ${kpi({ label: "Couverture nationale", value: DB.cities.length + " villes", delta: "multi-énergie", up: true, icon: "◉" })}
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">
        ${DB.dealers.map((d) => `
          <div class="card">
            <div class="card__head"><h3>${d.name}</h3><span class="tag tag--gold">★ ${d.rating}</span></div>
            <div class="meta" style="color:var(--muted);font-size:.85rem;margin-bottom:.8rem">${d.city} · ${d.available} véhicules · délai moyen ${d.avgDeliveryH} h</div>
            ${d.stock.map((s) => `<div class="bid"><div class="bid__who">${typeBadge(s.type)} <span>${s.model}</span></div><span class="bid__delivery">${s.energy} ×${s.qty}</span><span class="bid__price" style="font-size:.85rem;color:var(--gold-2)">${s.deliveryH} h</span></div>`).join("")}
          </div>`).join("")}
      </div>`;
    sparkAll();
  }

  /* ================================================================
     VUE — Particuliers (véhicules à disposition)
     ================================================================ */
  function renderProviders() {
    const totalEarn = DB.providers.reduce((s, p) => s + p.earnings, 0);
    const dispo = DB.providers.filter((p) => p.status === "Disponible").length;
    view.innerHTML = `
      <div class="callout" style="background:var(--gold-soft);border-color:rgba(200,164,92,.3)"><span>◐</span><div><b>Particuliers</b> — mettez votre véhicule au service des assurances pendant un sinistre, et soyez rémunéré. Les équipes le réservent, le marketplace inversé fixe le prix.</div></div>
      <div class="grid kpis">
        ${kpi({ label: "Véhicules proposés", value: DB.providers.length, delta: dispo + " disponibles", up: true, icon: "◐" })}
        ${kpi({ label: "Revenus reversés", value: euro(totalEarn), delta: "aux particuliers", up: true, icon: "€" })}
        ${kpi({ label: "Note moyenne", value: (DB.providers.reduce((s, p) => s + +p.rating, 0) / DB.providers.length).toFixed(1) + " / 5", delta: "satisfaction", up: true, icon: "★" })}
        ${kpi({ label: "Missions réalisées", value: num(DB.providers.reduce((s, p) => s + p.missions, 0)), delta: "cumulées", up: true, icon: "✓" })}
      </div>
      <div class="card card--pad">
        <div class="table-wrap"><table>
          <thead><tr><th>Particulier</th><th>Véhicule</th><th>Ville</th><th>Statut</th><th>Missions</th><th>Note</th><th>Revenus</th></tr></thead>
          <tbody>${DB.providers.map((p) => `
            <tr><td class="cell-strong">${p.name}</td>
            <td>${typeBadge(p.type)} ${p.model} <span class="mono" style="font-size:.78rem">· ${p.energy}</span></td>
            <td>${p.city}</td><td>${statusTag(p.status === "Disponible" ? "Disponible" : "En cours")}</td>
            <td>${p.missions}</td><td>★ ${p.rating}</td><td class="mono cell-strong">${euro(p.earnings)}</td></tr>`).join("")}</tbody>
        </table></div>
      </div>`;
    sparkAll();
  }

  /* ================================================================
     VUE — Marketplace inversé (enchères urgentes)
     ================================================================ */
  let liveOn = true, flashRef = null;
  function renderAuctions() {
    const openCount = () => DB.auctions.filter((a) => a.status !== "Attribuée").length;
    view.innerHTML = `
      <div class="card card--pad" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
        <div style="display:flex;align-items:center;gap:.8rem">
          <span class="pill pill--live"><i></i>Enchères en direct</span>
          <span class="sub" style="color:var(--muted);font-size:.88rem"><b id="aucOpen">${openCount()}</b> enchères ouvertes · les offres tombent en temps réel</span>
        </div>
        <button class="btn btn--ghost" id="liveToggle">${liveOn ? "⏸ Mettre en pause" : "▶ Reprendre"}</button>
      </div>
      <div class="callout" style="background:rgba(106,166,255,.12);border-color:rgba(106,166,255,.3)"><span>⟳</span><div><b>Enchères inversées</b> — un assureur poste un besoin urgent. Concessionnaires et particuliers proposent prix + délai ; la meilleure offre l'emporte avant l'échéance.</div></div>
      <div class="grid" id="aucList" style="grid-template-columns:repeat(auto-fill,minmax(380px,1fr))"></div>`;

    const renderList = () => {
      $("#aucList").innerHTML = DB.auctions.map((a, ai) => {
        const r = remain(a.deadlineAt);
        const best = a.bids[0];
        const closed = a.status === "Attribuée" || r.over;
        return `<div class="auction ${flashRef === ai ? "auction--flash" : ""}" data-auc="${ai}">
          <div class="auction__top">
            <div><div class="auction__need">${typeBadge(a.type)} ${a.need}</div><div class="auction__meta">${a.ref} · ${a.insurer} · ${a.city} · ${a.energy} · budget max ${euro(a.budgetMax)}</div></div>
            <div class="countdown ${closed ? "" : r.cls}" data-deadline="${a.deadlineAt}" style="text-align:right">${closed ? "Clôturée" : r.txt}<small>${closed ? "attribuée" : "avant clôture"}</small></div>
          </div>
          <div class="auction__bids">
            <div class="auction__bidcount">${a.bids.length} offre${a.bids.length > 1 ? "s" : ""}</div>
            ${a.bids.slice(0, 5).map((b, bi) => `
              <div class="bid ${bi === 0 ? "best" : ""}">
                <div class="bid__who">${b.kind === "Particulier" ? "<span class='tag tag--muted'>Particulier</span>" : "<span class='tag tag--gold'>Concession</span>"} <span>${b.provider}</span></div>
                <span class="bid__delivery">sous ${b.deliveryH} h</span>
                <span class="bid__price" style="${bi === 0 ? "color:var(--green)" : ""}">${euro(b.price)}</span>
              </div>`).join("")}
          </div>
          <div class="auction__foot">
            ${closed
              ? `<span class="tag tag--green">Attribuée à ${best.provider} · ${euro(best.price)}</span>`
              : `<button class="btn btn--ghost" data-bid="${ai}">Enchérir</button><button class="btn btn--gold" data-award="${ai}">Attribuer au meilleur</button>`}
          </div>
        </div>`;
      }).join("");
      flashRef = null;
    };
    renderList();

    // Pause / reprise du flux d'enchères
    $("#liveToggle").addEventListener("click", () => { liveOn = !liveOn; $("#liveToggle").textContent = liveOn ? "⏸ Mettre en pause" : "▶ Reprendre"; });

    // Moteur d'enchères automatique : une offre tombe toutes les ~4 s
    let tick = 0;
    timers.push(setInterval(() => {
      if (!liveOn) return;
      const open = DB.auctions.map((a, i) => ({ a, i })).filter((x) => x.a.status !== "Attribuée" && !remain(x.a.deadlineAt).over);
      if (!open.length) return;
      const { a, i } = open[Math.floor(Math.random() * open.length)];
      const best = a.bids[0];
      const newPrice = Math.max(Math.round(best.price * 0.7), best.price - Math.round(best.price * (0.02 + Math.random() * 0.05)));
      if (newPrice >= best.price) return;
      a.bids.unshift({ provider: pick2(), price: newPrice, deliveryH: Math.max(2, best.deliveryH - (Math.random() < 0.5 ? 1 : 0)), kind: Math.random() < 0.45 ? "Particulier" : "Concession" });
      a.bids.sort((x, y) => x.price - y.price);
      flashRef = i;
      renderList();
      if (++tick % 2 === 0) toast("Nouvelle enchère 🔻", `${a.need} (${a.city}) : ${euro(a.bids[0].price)} sous ${a.bids[0].deliveryH} h.`);
    }, 4000));

    everySec(() => {
      $$("#aucList [data-deadline]").forEach((el) => {
        const a = DB.auctions.find((x) => x.deadlineAt == el.dataset.deadline);
        if (!a || a.status === "Attribuée") return;
        const r = remain(+el.dataset.deadline);
        el.className = "countdown " + r.cls; el.style.textAlign = "right";
        el.innerHTML = (r.over ? "Clôturée" : r.txt) + `<small>${r.over ? "attribuée" : "avant clôture"}</small>`;
      });
    });

    $("#aucList").addEventListener("click", (e) => {
      const bidBtn = e.target.closest("[data-bid]"), awBtn = e.target.closest("[data-award]");
      if (bidBtn) {
        const idx = +bidBtn.dataset.bid, a = DB.auctions[idx];
        const best = a.bids[0];
        const newPrice = Math.max(1, best.price - Math.round(best.price * 0.05));
        a.bids.unshift({ provider: pick2(), price: newPrice, deliveryH: Math.max(2, best.deliveryH - 1), kind: Math.random() < 0.5 ? "Particulier" : "Concession" });
        a.bids.sort((x, y) => x.price - y.price);
        flashRef = idx;
        renderList();
        toast("Nouvelle enchère", `Meilleure offre : ${euro(a.bids[0].price)} sous ${a.bids[0].deliveryH} h.`);
      } else if (awBtn) {
        const a = DB.auctions[+awBtn.dataset.award];
        a.status = "Attribuée";
        renderList();
        const oc = $("#aucOpen"); if (oc) oc.textContent = DB.auctions.filter((x) => x.status !== "Attribuée").length;
        toast("Enchère attribuée ✓", `${a.bids[0].provider} mobilisé pour ${a.need} — ${euro(a.bids[0].price)}.`);
      }
    });
  }
  const pick2 = () => ["AutoPro Île-de-France", "Particulier · M. Roux", "Flotte Express PL", "Particulier · S. Marin", "Nord Trucks"][Math.floor(Math.random() * 5)];

  /* ================================================================
     VUE — Carte temps réel
     ================================================================ */
  function renderLiveMap() {
    const GEO = window.DeflectMatch.GEO;
    const lonMin = -5, lonMax = 8.2, latMin = 42, latMax = 51.4, W = 120, H = 134, pad = 7;
    const px = (lon) => pad + ((lon - lonMin) / (lonMax - lonMin)) * (W - 2 * pad);
    const py = (lat) => pad + ((latMax - lat) / (latMax - latMin)) * (H - 2 * pad);
    const P = (city) => { const g = GEO[city]; return g ? [px(g.lon), py(g.lat)] : null; };

    // contour stylisé de l'Hexagone (projeté avec la même fonction)
    const FR = [[51.05, 2.37], [50.9, 1.85], [49.5, 0.1], [49.7, -1.6], [48.4, -4.79], [47.3, -2.5], [46.4, -1.8], [45.0, -1.1], [43.4, -1.5], [42.5, 3.0], [43.3, 5.4], [43.7, 7.5], [45.9, 6.9], [47.5, 7.6], [48.6, 7.8], [49.2, 5.9], [50.0, 4.2]];
    const frPath = FR.map(([la, lo], i) => `${i ? "L" : "M"}${px(lo).toFixed(1)} ${py(la).toFixed(1)}`).join(" ") + " Z";

    const active = DB.claims.filter((c) => c.assigned && c.stage >= 2)
      .map((c) => ({ c, d: DB.dealers.find((x) => x.name === c.assigned) }))
      .filter((x) => x.d && P(x.c.city) && P(x.d.city));
    const pending = DB.claims.filter((c) => c.stage < 2 && P(c.city));

    // marqueurs concessions (uniques par ville)
    const dealerCities = [...new Set(DB.dealers.map((d) => d.city))].filter((c) => P(c));
    const dealerMk = dealerCities.map((c) => { const [x, y] = P(c); return `<g transform="translate(${x},${y})"><rect class="lm-dealer" x="-2.2" y="-2.2" width="4.4" height="4.4" rx="1.2"/><text class="lm-lbl" y="-4">${c}</text></g>`; }).join("");

    const routes = active.map(({ c, d }, i) => {
      const [x0, y0] = P(d.city), [x1, y1] = P(c.city);
      const path = `M${x0} ${y0} L${x1} ${y1}`;
      return `<path class="lm-route" d="${path}"/>
        <circle class="lm-convoy" r="1.9"><animateMotion dur="${3 + (i % 3)}s" repeatCount="indefinite" path="${path}"/></circle>`;
    }).join("");

    const claimMk = active.map(({ c }) => { const [x, y] = P(c.city); return `<circle class="lm-claim" cx="${x}" cy="${y}" r="2.4"/>`; }).join("") +
      pending.map((c) => { const [x, y] = P(c.city); return `<g transform="translate(${x},${y})"><circle class="lm-pending-halo" r="5"/><circle class="lm-pending" r="2.4"/></g>`; }).join("");

    view.innerHTML = `
      <div class="grid kpis">
        ${kpi({ label: "Livraisons en transit", value: active.length, delta: "convoyage en cours", up: true, icon: "◎" })}
        ${kpi({ label: "Sinistres en attente", value: pending.length, delta: "à débloquer", up: true, icon: "◈" })}
        ${kpi({ label: "Concessions actives", value: dealerCities.length + " villes", delta: "réseau de sourcing", up: true, icon: "▤" })}
        ${kpi({ label: "Délai moyen restant", value: "—", delta: "live", up: true, icon: "⚡" })}
      </div>
      <div class="grid" style="grid-template-columns:1.25fr 1fr">
        <div class="card card--pad">
          <div class="card__head"><h3>Flux temps réel</h3><span class="pill pill--live"><i></i>En direct</span></div>
          <div class="map-wrap" style="height:420px">
            <svg viewBox="0 0 ${W} ${H}" class="map-svg" preserveAspectRatio="xMidYMid meet">
              <path class="map-fr" d="${frPath}"/>
              ${routes}${dealerMk}${claimMk}
            </svg>
          </div>
          <div class="legend"><span><i style="background:var(--gold)"></i>Concession</span><span><i style="background:var(--green)"></i>Livraison en transit</span><span><i style="background:var(--red)"></i>Sinistre en attente</span></div>
        </div>
        <div class="card card--pad">
          <div class="card__head"><h3>Livraisons en cours</h3><span class="sub">ETA en direct</span></div>
          <div id="lmList" style="display:flex;flex-direction:column;gap:.6rem"></div>
        </div>
      </div>`;
    sparkAll();

    const list = active.map(({ c, d }) => ({ c, d, deadline: c.declaredAt + (c.unlockedInH || 6) * 3600e3 }));
    $("#lmList").innerHTML = list.length ? list.map(({ c, d, deadline }) => `
      <div class="lm-row">
        <div>${typeBadge(c.needType)}<div class="lm-row__main"><b>${c.ref} · ${c.city}</b><span>${d.name} → ${c.city} · ${c.insurer}</span></div></div>
        <div class="countdown" data-deadline="${deadline}" data-lm style="text-align:right"></div>
      </div>`).join("") : `<p style="color:var(--muted)">Aucune livraison en transit. Débloquez un sinistre pour la voir apparaître ici.</p>`;

    everySec(() => {
      let minH = Infinity;
      $$("#lmList [data-lm]").forEach((el) => {
        const r = remain(+el.dataset.deadline);
        el.className = "countdown " + (r.over ? "ok" : r.cls); el.style.textAlign = "right";
        el.innerHTML = r.over ? "Livré ✓<small>SLA respecté</small>" : r.txt + "<small>ETA livraison</small>";
        if (!r.over) { const h = (+el.dataset.deadline - Date.now()) / 3600e3; if (h < minH) minH = h; }
      });
      const kEl = $$(".kpi__val")[3];
      if (kEl) kEl.textContent = minH === Infinity ? "—" : Math.max(0, Math.round(minH)) + " h";
    });
  }

  /* ================================================================
     VUE — Maintenance & photos (inspection véhicule)
     ================================================================ */
  const stateTag = (s) => `<span class="tag tag--${s === "Bon" ? "green" : s === "À surveiller" ? "gold" : "red"}">${s}</span>`;
  const toRepair = (insp) => insp.items.some((it) => it.state === "À remplacer");

  function renderMaintenance() {
    const dtl = (ms) => new Date(ms).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const renderList = () => {
      const photos = DB.inspections.reduce((s, i) => s + i.photos.length, 0);
      $("#mtKpis").innerHTML =
        kpi({ label: "Inspections", value: DB.inspections.length, delta: "fiches enregistrées", up: true, icon: "⚒" }) +
        kpi({ label: "Véhicules à réparer", value: DB.inspections.filter(toRepair).length, delta: "pièce(s) à remplacer", up: false, icon: "⚠" }) +
        kpi({ label: "Photos collectées", value: photos, delta: "preuves jointes", up: true, icon: "▣" }) +
        kpi({ label: "Dernière inspection", value: DB.inspections.length ? dtl(DB.inspections[0].at).split(" ").slice(0, 2).join(" ") : "—", delta: "à jour", up: true, icon: "✓" });
      sparkAll();

      $("#mtList").innerHTML = DB.inspections.map((insp) => `
        <div class="card insp">
          <div class="insp__head">
            <div><b>${insp.model}</b> <span class="mono" style="font-size:.78rem">${insp.vehicleId} · ${insp.plate} · ${insp.city}</span>
              <div class="meta" style="color:var(--muted);font-size:.82rem;margin-top:.2rem">${dtl(insp.at)} · ${insp.km || insp.odometer} km · méca. ${insp.mechanic} · chauffeur ${insp.driver}</div>
            </div>
            ${toRepair(insp) ? '<span class="tag tag--red">À réparer</span>' : '<span class="tag tag--green">Conforme</span>'}
          </div>
          <div class="insp__photos">${insp.photos.map((p) => `<img src="${p}" alt="photo" loading="lazy"/>`).join("")}</div>
          <div class="insp__items">${insp.items.map((it) => `<div class="insp__item"><span>${it.label}</span>${stateTag(it.state)}</div>`).join("")}</div>
          ${insp.comment ? `<div class="insp__comment">“${insp.comment}”</div>` : ""}
        </div>`).join("");
    };

    view.innerHTML = `
      <div class="callout" style="background:var(--gold-soft);border-color:rgba(200,164,92,.3)"><span>⚒</span><div><b>Maintenance & traçabilité</b> — à chaque véhicule envoyé, le chauffeur prend des photos et le mécanicien relève l'état des pièces (disques, plaquettes, pneus…). Tout est horodaté et conservé par véhicule.</div></div>
      <div class="grid kpis" id="mtKpis"></div>
      <div class="card card--pad" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
        <div><h3 style="font-size:1.05rem">Fiches d'inspection</h3><span class="sub" style="color:var(--muted);font-size:.85rem">photos + état des pièces + mécanicien</span></div>
        <button class="btn btn--gold" id="newInsp">+ Nouvelle inspection</button>
      </div>
      <div class="grid" id="mtList" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))"></div>`;
    renderList();
    $("#newInsp").addEventListener("click", () => openInspection(renderList));
  }

  function openInspection(refresh) {
    const opt = (arr) => arr.map((x) => `<option>${x}</option>`).join("");
    const vehOpts = DB.fleet.slice(0, 40).map((v) => `<option value="${v.id}">${v.id} · ${v.model} · ${v.plate}</option>`).join("");
    openModal(`
      <h3>Nouvelle inspection</h3>
      <p class="msub">Le chauffeur joint des photos, le mécanicien renseigne l'état des pièces.</p>
      <form id="inspForm">
        <div class="bm__row">
          <div class="bm__field"><label>Véhicule</label><select id="i-veh">${vehOpts}</select></div>
          <div class="bm__field"><label>Kilométrage relevé</label><input id="i-km" type="number" value="48250" min="0"/></div>
        </div>
        <div class="bm__row">
          <div class="bm__field"><label>Chauffeur / pro</label><input id="i-driver" value="" placeholder="Nom du conducteur"/></div>
          <div class="bm__field"><label>Mécanicien</label><input id="i-mech" value="" placeholder="Nom du mécanicien"/></div>
        </div>
        <label style="font-size:.74rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted-2)">Photos du véhicule</label>
        <label class="photo-drop" for="i-photos">📷 Cliquez pour ajouter des photos (avant, freins, pneus, dommages…)</label>
        <input id="i-photos" type="file" accept="image/*" multiple hidden/>
        <div class="photo-grid" id="i-preview"></div>
        <label style="font-size:.74rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted-2);margin-top:.4rem;display:block">État des pièces</label>
        <div class="insp__items" style="margin:.4rem 0 1rem">
          ${DB.inspectionItems.map((it, i) => `<div class="insp__item"><span>${it}</span><select class="i-state" data-label="${it}">${opt(DB.inspStates)}</select></div>`).join("")}
        </div>
        <div class="bm__field"><label>Commentaire mécanicien</label><textarea id="i-comment" rows="2" placeholder="Observations, pièces à remplacer…"></textarea></div>
        <div class="bm__error" id="i-err" style="margin-top:.6rem"></div>
        <button type="submit" class="btn btn--gold btn--block" style="width:100%;margin-top:.6rem">Enregistrer la fiche</button>
      </form>`);

    const photos = [];
    $("#i-photos").addEventListener("change", (e) => {
      [...e.target.files].forEach((f) => {
        const r = new FileReader();
        r.onload = () => { photos.push(r.result); $("#i-preview").insertAdjacentHTML("beforeend", `<img src="${r.result}" alt="photo"/>`); };
        r.readAsDataURL(f);
      });
    });

    $("#inspForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const veh = DB.fleet.find((v) => v.id === $("#i-veh").value) || DB.fleet[0];
      const items = [...dnBody.querySelectorAll(".i-state")].map((s) => ({ label: s.dataset.label, state: s.value }));
      const insp = {
        id: "INS-" + Math.floor(5000 + Math.random() * 9000),
        vehicleId: veh.id, model: veh.model, plate: veh.plate, city: veh.city,
        mechanic: $("#i-mech").value.trim() || "—", driver: $("#i-driver").value.trim() || "—",
        km: +$("#i-km").value || veh.odometer, odometer: veh.odometer, at: Date.now(),
        items, photos: photos.length ? photos.slice() : [DB.photoPh("Sans photo", "#6b7484")],
        comment: $("#i-comment").value.trim(),
      };
      DB.inspections.unshift(insp);
      try { localStorage.setItem("fleetnavira_inspections_count", DB.inspections.length); } catch (_) {}
      closeModal(); refresh();
      toast("Inspection enregistrée ⚒", `${insp.model} · ${insp.photos.length} photo(s) · ${items.filter((i) => i.state === "À remplacer").length} pièce(s) à remplacer.`);
    });
  }

  /* ================================================================
     VUE — Rapport assureur
     ================================================================ */
  function renderReport() {
    const ins = DB.insurance, today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    view.innerHTML = `
      <div class="report">
        <div class="report__head">
          <div><span class="brand__name">Fleet Navira</span><div class="report p" style="margin-top:.4rem;color:var(--muted)">Dossier de souscription flotte · ${today}</div></div>
          <button class="btn btn--gold" id="dlReport">Télécharger le PDF</button>
        </div>

        <h2>1. Profil de la flotte</h2>
        <div class="stat-line"><span>Nombre de véhicules</span><b>120</b></div>
        <div class="stat-line"><span>Valeur totale assurée</span><b>${euro(ins.totalFleetValue)}</b></div>
        <div class="stat-line"><span>Âge moyen du parc</span><b>2,3 ans</b></div>
        <div class="stat-line"><span>Taux d'équipement télématique</span><b>100%</b></div>

        <h2>2. Sinistralité</h2>
        <div class="stat-line"><span>Sinistres déclarés (12 mois)</span><b>${num(ins.totalClaims)}</b></div>
        <div class="stat-line"><span>Coût total des sinistres</span><b>${euro(ins.claimsCost)}</b></div>
        <div class="stat-line"><span>Prime annuelle actuelle</span><b>${euro(ins.premiumAnnual)}</b></div>
        <div class="stat-line"><span>Ratio sinistres / primes (S/P)</span><b style="color:var(--green)">${ins.lossRatio}%</b></div>

        <h2>3. Maîtrise du risque</h2>
        <p>La totalité de la flotte est équipée de boîtiers télématiques. Le scoring comportemental
           est suivi en temps réel et corrélé à la sinistralité.</p>
        <ul>
          <li>Score conducteur moyen : <strong style="color:var(--text)">${ins.avgDriverScore}/100</strong></li>
          <li>Indice de risque flotte : <strong style="color:var(--text)">${ins.avgRisk}/100</strong> (meilleur quartile du marché)</li>
          <li>Répartition des sinistres : ${ins.claimsByType.map((c) => `${c.label} ${c.value}%`).join(", ")}</li>
        </ul>

        <h2>4. Proposition</h2>
        <p>Sur la base d'un ratio S/P maîtrisé et d'un scoring conducteur supérieur à la moyenne,
           Fleet Navira sollicite une <strong style="color:var(--text)">prime indexée sur le risque réel</strong>.</p>
        <div class="stat-line"><span>Réduction de prime demandée</span><b style="color:var(--gold-2)">-${ins.premiumDiscountPct}%</b></div>
        <div class="stat-line"><span>Économie annuelle estimée</span><b style="color:var(--gold-2)">${euro(ins.estimatedSaving)}</b></div>

        <p class="report__sig">Document généré automatiquement par Fleet Navira à partir des données d'exploitation et de télématique. Chiffres de démonstration.</p>
      </div>`;
    $("#dlReport").addEventListener("click", () => { window.print && toast("PDF prêt", "Utilisez la boîte d'impression pour enregistrer en PDF."); setTimeout(() => window.print(), 300); });
  }

  /* ---------- Déconnexion ---------- */
  const logoutBtn = $("#logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => { try { sessionStorage.removeItem("velorah_auth"); } catch (_) {} window.location.href = "login.html"; });

  /* ---------- Boot ---------- */
  go("overview");
})();
