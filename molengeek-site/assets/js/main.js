/* =====================================================================
   MolenGeek — JavaScript principal (vanilla, sans dépendance)
   Modules : thème, navigation, header, révélation au scroll,
             compteurs animés, filtres, validation du formulaire.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Thème clair / sombre — la préférence est mémorisée si possible.
     ------------------------------------------------------------------ */
  var THEME_KEY = 'molengeek-theme';

  function readStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function storeTheme(value) {
    try { localStorage.setItem(THEME_KEY, value); } catch (e) { /* mode privé */ }
  }

  function currentTheme() {
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) storeTheme(theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label',
        theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre');
    });
  }

  function initTheme() {
    var stored = readStoredTheme();
    if (stored === 'dark' || stored === 'light') applyTheme(stored, false);
    else applyTheme(currentTheme(), false);

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
      });
    });
  }

  /* ------------------------------------------------------------------
     Navigation mobile + lien actif
     ------------------------------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.getElementById('primary-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? '✕' : '☰';
      });

      nav.addEventListener('click', function (event) {
        if (event.target.closest('a')) {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = '☰';
        }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && nav.classList.contains('is-open')) {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = '☰';
          toggle.focus();
        }
      });
    }

    // Marque la page courante dans le menu.
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('#primary-nav a[href]').forEach(function (link) {
      var target = (link.getAttribute('href').split('/').pop() || '').split('#')[0].toLowerCase();
      if (target && target === page) link.setAttribute('aria-current', 'page');
    });
  }

  /* ------------------------------------------------------------------
     Ombre du header au défilement
     ------------------------------------------------------------------ */
  function initHeaderScroll() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var ticking = false;

    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }
    update();

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     Apparition progressive des blocs
     ------------------------------------------------------------------ */
  function initReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
        setTimeout(function () { el.classList.add('is-visible'); }, delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     Compteurs animés (data-count="1500")
     ------------------------------------------------------------------ */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var suffix = el.getAttribute('data-count-suffix') || '';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      el.textContent = target.toLocaleString('fr-BE') + suffix;
      return;
    }

    var duration = 1400;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString('fr-BE') + suffix;
      if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCount);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     Filtres génériques
     Barre : <div class="filters" data-filter-for="courses">
               <button class="filter-btn" data-filter="web">…</button>
     Cible : <div id="courses"><article data-category="web">…</article></div>
     ------------------------------------------------------------------ */
  function initFilters() {
    document.querySelectorAll('[data-filter-for]').forEach(function (bar) {
      var target = document.getElementById(bar.getAttribute('data-filter-for'));
      if (!target) return;

      var items = Array.prototype.slice.call(target.querySelectorAll('[data-category]'));
      var empty = document.querySelector('[data-empty-for="' + bar.getAttribute('data-filter-for') + '"]');
      var buttons = Array.prototype.slice.call(bar.querySelectorAll('[data-filter]'));

      function apply(value) {
        var visible = 0;
        items.forEach(function (item) {
          var categories = (item.getAttribute('data-category') || '').split(/\s+/);
          var show = value === 'all' || categories.indexOf(value) !== -1;
          item.hidden = !show;
          if (show) visible++;
        });
        buttons.forEach(function (btn) {
          btn.setAttribute('aria-pressed', String(btn.getAttribute('data-filter') === value));
        });
        if (empty) empty.hidden = visible !== 0;
      }

      bar.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-filter]');
        if (btn) apply(btn.getAttribute('data-filter'));
      });

      apply('all');
    });
  }

  /* ------------------------------------------------------------------
     Validation du formulaire de contact (côté client uniquement)
     ------------------------------------------------------------------ */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldError(input) {
    var value = input.value.trim();

    if (input.hasAttribute('required') && !value) {
      return 'Ce champ est obligatoire.';
    }
    if (input.type === 'email' && value && !EMAIL_RE.test(value)) {
      return 'Merci d’indiquer une adresse e-mail valide.';
    }
    var min = parseInt(input.getAttribute('minlength') || '0', 10);
    if (min && value && value.length < min) {
      return 'Encore un peu de détail : ' + min + ' caractères minimum.';
    }
    return '';
  }

  function showError(input, message) {
    var slot = document.getElementById(input.id + '-error');
    if (slot) slot.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;

    var status = form.querySelector('[data-form-status]');
    var inputs = Array.prototype.slice.call(
      form.querySelectorAll('input, textarea, select')
    ).filter(function (el) { return el.type !== 'hidden' && el.id; });

    inputs.forEach(function (input) {
      input.addEventListener('blur', function () { showError(input, fieldError(input)); });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') showError(input, fieldError(input));
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var firstInvalid = null;

      inputs.forEach(function (input) {
        var message = fieldError(input);
        showError(input, message);
        if (message && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        if (status) status.hidden = true;
        firstInvalid.focus();
        return;
      }

      // Aucun back-end n'est branché : on simule l'envoi.
      if (status) {
        var name = (form.querySelector('#nom') || {}).value || '';
        status.textContent = 'Merci ' + name.trim() + ' ! Votre message est bien pris en compte, '
          + 'l’équipe MolenGeek vous répond sous 2 jours ouvrables.';
        status.hidden = false;
      }
      form.reset();
      inputs.forEach(function (input) { showError(input, ''); });
    });
  }

  /* ------------------------------------------------------------------
     Année courante dans le pied de page
     ------------------------------------------------------------------ */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------------------------- Démarrage ---------------------------- */
  function init() {
    initTheme();
    initNav();
    initHeaderScroll();
    initReveal();
    initCounters();
    initFilters();
    initContactForm();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
