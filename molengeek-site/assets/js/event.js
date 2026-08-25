/* =====================================================================
   MolenGeek — Landing événement : compte à rebours, agenda à onglets,
   navigation flottante, bandeau défilant, révélations au scroll.
   JavaScript vanilla, aucune dépendance.
   ===================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Compte à rebours
     Cible : <div data-countdown data-target-month="9" data-target-day="27">
     La prochaine occurrence de la date est calculée automatiquement,
     pour que la page ne périme jamais en démonstration.
     ------------------------------------------------------------------ */
  // Dernier jour <weekday> du mois donné (0 = dimanche … 5 = vendredi).
  function lastWeekdayOfMonth(year, month, weekday, hour) {
    var date = new Date(year, month, 0, hour, 0, 0); // dernier jour du mois
    while (date.getDay() !== weekday) date.setDate(date.getDate() - 1);
    return date;
  }

  // Le programme démarre un vendredi soir : on vise le dernier vendredi du mois,
  // et l'année suivante si la date est déjà passée. La page ne périme donc jamais.
  function nextOccurrence(month, weekday, hour) {
    var now = new Date();
    var candidate = lastWeekdayOfMonth(now.getFullYear(), month, weekday, hour);
    if (candidate.getTime() <= now.getTime()) {
      candidate = lastWeekdayOfMonth(now.getFullYear() + 1, month, weekday, hour);
    }
    return candidate;
  }

  function initCountdown() {
    var root = document.querySelector('[data-countdown]');
    if (!root) return;

    var target = nextOccurrence(
      parseInt(root.getAttribute('data-target-month'), 10) || 9,
      parseInt(root.getAttribute('data-target-weekday'), 10) || 5,
      parseInt(root.getAttribute('data-target-hour'), 10) || 18
    );

    var slots = {
      days: root.querySelector('[data-unit="days"]'),
      hours: root.querySelector('[data-unit="hours"]'),
      minutes: root.querySelector('[data-unit="minutes"]'),
      seconds: root.querySelector('[data-unit="seconds"]')
    };

    var dateLabel = document.querySelector('[data-countdown-date]');
    if (dateLabel) {
      dateLabel.textContent = target.toLocaleDateString('fr-BE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function tick() {
      var diff = Math.max(0, target.getTime() - Date.now());
      var totalSeconds = Math.floor(diff / 1000);
      var values = {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor(totalSeconds / 3600) % 24,
        minutes: Math.floor(totalSeconds / 60) % 60,
        seconds: totalSeconds % 60
      };
      Object.keys(slots).forEach(function (unit) {
        if (slots[unit]) slots[unit].textContent = pad(values[unit]);
      });
    }

    tick();
    window.setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------
     Agenda à onglets (pattern ARIA tabs, navigation au clavier)
     ------------------------------------------------------------------ */
  function initTabs() {
    var list = document.querySelector('[role="tablist"]');
    if (!list) return;

    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

    function select(tab, focus) {
      tabs.forEach(function (item) {
        var selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        var panel = document.getElementById(item.getAttribute('aria-controls'));
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    }

    list.addEventListener('click', function (event) {
      var tab = event.target.closest('[role="tab"]');
      if (tab) select(tab, false);
    });

    list.addEventListener('keydown', function (event) {
      var index = tabs.indexOf(document.activeElement);
      if (index === -1) return;
      var next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      else if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      else if (event.key === 'Home') next = tabs[0];
      else if (event.key === 'End') next = tabs[tabs.length - 1];
      if (next) { event.preventDefault(); select(next, true); }
    });

    select(tabs[0], false);
  }

  /* ------------------------------------------------------------------
     Navigation flottante : état « collé », menu mobile
     ------------------------------------------------------------------ */
  function initNav() {
    var nav = document.querySelector('.ev-nav');
    var links = document.getElementById('ev-nav-links');
    var burger = document.querySelector('[data-ev-burger]');

    if (nav) {
      var ticking = false;
      var update = function () {
        nav.classList.toggle('is-stuck', window.scrollY > 24);
        ticking = false;
      };
      update();
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
      }, { passive: true });
    }

    if (burger && links) {
      var close = function () {
        links.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.textContent = '☰';
      };
      burger.addEventListener('click', function () {
        var open = links.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
        burger.textContent = open ? '✕' : '☰';
      });
      links.addEventListener('click', function (event) {
        if (event.target.closest('a')) close();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && links.classList.contains('is-open')) {
          close();
          burger.focus();
        }
      });
    }
  }

  /* ------------------------------------------------------------------
     Bandeau défilant : duplication du groupe pour une boucle continue
     ------------------------------------------------------------------ */
  function initMarquee() {
    document.querySelectorAll('.ev-marquee__track').forEach(function (track) {
      var group = track.querySelector('.ev-marquee__group');
      if (!group || track.children.length > 1) return;
      var clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }

  /* ------------------------------------------------------------------
     Révélations au scroll
     ------------------------------------------------------------------ */
  function initReveal() {
    var items = document.querySelectorAll('[data-ev-reveal]');
    if (!items.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var delay = parseInt(entry.target.getAttribute('data-ev-delay') || '0', 10);
        window.setTimeout(function () { entry.target.classList.add('is-in'); }, delay);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     Barre d'inscription collante : apparaît après le hero
     ------------------------------------------------------------------ */
  function initStickyCta() {
    var bar = document.querySelector('.ev-sticky-cta');
    var hero = document.querySelector('.ev-hero');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { threshold: 0 });
    observer.observe(hero);
  }

  /* ---------------------------- Démarrage ---------------------------- */
  function init() {
    initCountdown();
    initTabs();
    initNav();
    initMarquee();
    initReveal();
    initStickyCta();
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
