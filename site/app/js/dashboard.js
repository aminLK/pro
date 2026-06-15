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
    overview: ["Tableau de bord", "Vue d'ensemble de l'activité — 12 derniers mois"],
    fleet: ["Flotte", "120 véhicules · valeur, occupation et score de risque"],
    bookings: ["Réservations", "Locations confirmées, en cours et terminées"],
    insurance: ["Assurance & Risque", "Sinistralité, scoring télématique et prime estimée"],
    simulator: ["Simulateur de prime", "Ajustez les paramètres, la prime se recalcule en direct"],
    map: ["Carte d'activité", "Flotte, réservations et sinistres par ville"],
    report: ["Rapport assureur", "Synthèse prête à présenter à votre compagnie"],
  };
  const views = { overview: renderOverview, fleet: renderFleet, bookings: renderBookings, insurance: renderInsurance, simulator: renderSimulator, map: renderMap, report: renderReport };

  function go(name) {
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

    view.innerHTML = `
      <div class="grid kpis">
        ${kpi({ label: "Chiffre d'affaires (12 mois)", value: eur1(revTotal), delta: "+18,4% vs N-1", up: true, icon: "€" })}
        ${kpi({ label: "Taux d'occupation flotte", value: avgUtil + " %", delta: "+5,2 pts", up: true, icon: "◴" })}
        ${kpi({ label: "Locations actives", value: num(active), delta: "+12 aujourd'hui", up: true, icon: "▤" })}
        ${kpi({ label: "Ratio sinistres / primes", value: ins.lossRatio + " %", delta: "-6,1 pts", up: true, icon: "◈" })}
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
          <p>Velorah équipe 100% de sa flotte de capteurs de conduite. Le scoring comportemental
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
      const r = 4 + (d.vehicles / maxV) * 9;
      return `<g class="mk" data-city="${c}" transform="translate(${x},${y})">
        <circle class="mk__halo" r="${r + 8}"></circle>
        <circle class="mk__dot" r="${r}"></circle>
        <text class="mk__lbl" y="${-r - 6}">${c}</text>
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
     VUE — Rapport assureur
     ================================================================ */
  function renderReport() {
    const ins = DB.insurance, today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    view.innerHTML = `
      <div class="report">
        <div class="report__head">
          <div><span class="brand__name">VELORAH<small>Pro</small></span><div class="report p" style="margin-top:.4rem;color:var(--muted)">Dossier de souscription flotte · ${today}</div></div>
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
           Velorah sollicite une <strong style="color:var(--text)">prime indexée sur le risque réel</strong>.</p>
        <div class="stat-line"><span>Réduction de prime demandée</span><b style="color:var(--gold-2)">-${ins.premiumDiscountPct}%</b></div>
        <div class="stat-line"><span>Économie annuelle estimée</span><b style="color:var(--gold-2)">${euro(ins.estimatedSaving)}</b></div>

        <p class="report__sig">Document généré automatiquement par Velorah Pro à partir des données d'exploitation et de télématique. Chiffres de démonstration.</p>
      </div>`;
    $("#dlReport").addEventListener("click", () => { window.print && toast("PDF prêt", "Utilisez la boîte d'impression pour enregistrer en PDF."); setTimeout(() => window.print(), 300); });
  }

  /* ---------- Déconnexion ---------- */
  const logoutBtn = $("#logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => { try { sessionStorage.removeItem("velorah_auth"); } catch (_) {} window.location.href = "login.html"; });

  /* ---------- Boot ---------- */
  go("overview");
})();
