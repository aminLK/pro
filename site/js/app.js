/* ===================================================================
   VELORAH — logique applicative
   =================================================================== */
(function () {
  "use strict";

  const cars = window.VELORAH_CARS || [];
  const options = window.VELORAH_OPTIONS || [];
  const euro = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* -------------------------------------------------- Header scroll */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* -------------------------------------------------- Mobile nav */
  const nav = $("#nav");
  const navToggle = $("#navToggle");
  const closeNav = () => { nav.classList.remove("is-open"); navToggle.classList.remove("is-open"); navToggle.setAttribute("aria-expanded", "false"); };
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });
  $$(".nav__link, .nav__cta", nav).forEach((a) => a.addEventListener("click", closeNav));

  /* -------------------------------------------------- Reveal on scroll */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  const observeReveal = (root = document) => $$("[data-reveal]", root).forEach((el) => io.observe(el));
  observeReveal();

  /* -------------------------------------------------- Animated counters */
  const counters = $$("[data-count]");
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const isRating = target === 49;
      const dur = 1400; const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * eased);
        el.textContent = isRating ? (val / 10).toFixed(1) : val.toLocaleString("fr-FR") + (target >= 1000 ? "+" : "");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((c) => counterIO.observe(c));

  /* -------------------------------------------------- Dates par défaut */
  const todayISO = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
  const sStart = $("#s-start"), sEnd = $("#s-end");
  sStart.min = todayISO(0); sStart.value = todayISO(1);
  sEnd.min = todayISO(1); sEnd.value = todayISO(4);
  sStart.addEventListener("change", () => {
    sEnd.min = sStart.value;
    if (sEnd.value < sStart.value) sEnd.value = sStart.value;
  });

  /* -------------------------------------------------- Rendu de la flotte */
  const grid = $("#fleetGrid");
  const emptyMsg = $("#fleetEmpty");

  const carCard = (car) => `
    <article class="car" data-cat="${car.category}" data-type="${car.type}" data-reveal>
      <div class="car__media">
        ${car.badge ? `<span class="car__badge">${car.badge}</span>` : ""}
        <span class="car__cat">${car.category}</span>
        <img class="car__img" src="${car.img}" alt="${car.name}" loading="lazy"
             onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,#1d2230,#11141c)'" />
      </div>
      <div class="car__body">
        <div class="car__top">
          <h3 class="car__name">${car.name}</h3>
          <span class="car__rating">★ ${car.rating.toFixed(1)}</span>
        </div>
        <div class="car__specs">
          <span class="car__spec">${car.seats} places</span>
          <span class="car__spec">${car.transmission}</span>
          <span class="car__spec">${car.fuel}</span>
        </div>
        <div class="car__foot">
          <div class="car__price"><b>${euro(car.price)}</b><span>par jour · tout inclus</span></div>
          <button class="btn btn--gold" data-book="${car.id}">Réserver</button>
        </div>
      </div>
    </article>`;

  const renderFleet = (filter = "all") => {
    const list = filter === "all" ? cars : cars.filter((c) => c.category === filter || c.type === filter);
    grid.innerHTML = list.map(carCard).join("");
    emptyMsg.hidden = list.length > 0;
    observeReveal(grid);
  };
  renderFleet();

  /* -------------------------------------------------- Filtres */
  $("#filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    $$(".filter").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    renderFleet(btn.dataset.filter);
  });

  /* -------------------------------------------------- Search bar -> flotte */
  $("#searchBar").addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("fleet").scrollIntoView({ behavior: "smooth" });
  });

  /* ==================================================================
     Modal de réservation
     ================================================================== */
  const modal = $("#bookingModal");
  const modalBody = $("#modalBody");
  let lastFocus = null;

  const openModal = (car) => {
    lastFocus = document.activeElement;
    modalBody.innerHTML = bookingForm(car);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    wireBookingForm(car);
  };
  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };

  modal.addEventListener("click", (e) => { if (e.target.matches("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });

  // Ouverture depuis n'importe quel bouton "Réserver"
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-book]");
    if (!btn) return;
    const car = cars.find((c) => c.id === btn.dataset.book);
    if (car) openModal(car);
  });

  /* ---- Formulaire de réservation ---- */
  const bookingForm = (car) => `
    <div class="bm__hero">
      <img src="${car.img}" alt="${car.name}"
           onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,#1d2230,#11141c)'" />
      <div class="bm__title"><h3>${car.name}</h3><span>${car.category} · ${euro(car.price)} / jour</span></div>
    </div>
    <form class="bm__body" id="bookForm" novalidate>
      <div class="bm__row">
        <div class="bm__field">
          <label for="b-start">Date de départ</label>
          <input type="date" id="b-start" required min="${todayISO(0)}" value="${sStart.value}" />
        </div>
        <div class="bm__field">
          <label for="b-end">Date de retour</label>
          <input type="date" id="b-end" required min="${todayISO(1)}" value="${sEnd.value}" />
        </div>
      </div>
      <div class="bm__row">
        <div class="bm__field">
          <label for="b-name">Nom complet</label>
          <input type="text" id="b-name" required placeholder="Jean Dupont" />
        </div>
        <div class="bm__field">
          <label for="b-email">E-mail</label>
          <input type="email" id="b-email" required placeholder="jean@exemple.fr" />
        </div>
      </div>

      <label class="bm__field" style="margin-bottom:1rem">
        <span style="font-size:.76rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted-2)">Niveau de protection</span>
      </label>
      <div class="bm__options" id="bmOptions">
        ${options.map((o, i) => `
          <label class="bm__opt ${i === 0 ? "is-sel" : ""}">
            <input type="radio" name="ins" value="${o.id}" ${i === 0 ? "checked" : ""} />
            <span class="bm__opt-main"><b>${o.label}</b><span>${o.desc}</span></span>
            <span class="bm__opt-price">${o.price === 0 ? "Inclus" : "+" + euro(o.price) + "/j"}</span>
          </label>`).join("")}
      </div>

      <div class="bm__error" id="bmError"></div>

      <div class="bm__summary" id="bmSummary"></div>

      <button type="submit" class="btn btn--gold btn--block">Confirmer la réservation</button>
    </form>`;

  const dayCount = (a, b) => {
    const d1 = new Date(a), d2 = new Date(b);
    if (isNaN(d1) || isNaN(d2)) return 0;
    return Math.max(0, Math.round((d2 - d1) / 86400000));
  };

  const wireBookingForm = (car) => {
    const form = $("#bookForm");
    const start = $("#b-start"), end = $("#b-end");
    const summary = $("#bmSummary"), error = $("#bmError");
    const optWrap = $("#bmOptions");

    const selectedOption = () => options.find((o) => o.id === (form.querySelector("input[name=ins]:checked") || {}).value) || options[0];

    const updateSummary = () => {
      const days = dayCount(start.value, end.value);
      const opt = selectedOption();
      const base = days * car.price;
      const insurance = days * opt.price;
      const subtotal = base + insurance;
      const fees = days > 0 ? 19 : 0; // frais de service fixes
      const total = subtotal + fees;
      summary.innerHTML = `
        <div class="bm__line"><span>${euro(car.price)} × ${days} jour${days > 1 ? "s" : ""}</span><span>${euro(base)}</span></div>
        <div class="bm__line"><span>${opt.label}${opt.price ? ` (${euro(opt.price)}/j)` : ""}</span><span>${euro(insurance)}</span></div>
        <div class="bm__line"><span>Frais de service</span><span>${euro(fees)}</span></div>
        <div class="bm__line total"><span>Total</span><b>${euro(total)}</b></div>`;
      return { days, total, opt };
    };

    start.addEventListener("change", () => { end.min = start.value; if (end.value < start.value) end.value = start.value; updateSummary(); });
    end.addEventListener("change", updateSummary);
    optWrap.addEventListener("change", () => {
      $$(".bm__opt", optWrap).forEach((l) => l.classList.toggle("is-sel", l.querySelector("input").checked));
      updateSummary();
    });
    updateSummary();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      error.textContent = "";
      const { days, total, opt } = updateSummary();
      const name = $("#b-name").value.trim();
      const email = $("#b-email").value.trim();

      if (days < 1) { error.textContent = "La date de retour doit être après la date de départ."; return; }
      if (!name) { error.textContent = "Merci d'indiquer votre nom."; return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { error.textContent = "Merci d'indiquer un e-mail valide."; return; }

      const ref = "VLR-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      // Sauvegarde locale (démo)
      try {
        const bookings = JSON.parse(localStorage.getItem("velorah_bookings") || "[]");
        bookings.push({ ref, car: car.name, start: start.value, end: end.value, days, total, option: opt.label, name, email, at: Date.now() });
        localStorage.setItem("velorah_bookings", JSON.stringify(bookings));
      } catch (_) {}

      modalBody.innerHTML = `
        <div class="bm__success">
          <div class="bm__check">✓</div>
          <h3>Réservation confirmée !</h3>
          <p>Merci ${name.split(" ")[0]}. Un e-mail récapitulatif a été envoyé à <strong>${email}</strong>.</p>
          <div class="bm__ref">Référence ${ref}</div>
          <p style="margin-bottom:1.6rem"><strong>${car.name}</strong> · ${days} jour${days > 1 ? "s" : ""} · ${euro(total)}</p>
          <button class="btn btn--ghost" data-close>Fermer</button>
        </div>`;
    });
  };

  /* -------------------------------------------------- Formulaire contact */
  const contactForm = $("#contactForm");
  const contactMsg = $("#contactMsg");
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = contactForm.name.value.trim().split(" ")[0] || "";
    contactForm.reset();
    contactMsg.hidden = false;
    contactMsg.textContent = `Merci ${name} ! Un conseiller Velorah vous rappelle sous 1 heure.`;
  });

  /* -------------------------------------------------- Année footer */
  $("#year").textContent = new Date().getFullYear();
})();
