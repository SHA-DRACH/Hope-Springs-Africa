/* ==========================================================================
   Hope Springs Africa — Rebrand behaviours
   Vanilla ES6. No dependencies. Every feature degrades gracefully.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. Sticky header state
     ------------------------------------------------------------------ */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;

    // Publish the header's real height so the mobile panel, its backdrop and
    // scroll-padding all line up with it instead of the 76px design guess.
    function syncHeight() {
      document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
    }
    syncHeight();
    window.addEventListener('resize', syncHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeight);

    var ticking = false;
    function update() {
      header.classList.toggle('is-stuck', window.scrollY > 12);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     2. Mobile navigation
     ------------------------------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.querySelector('[data-nav]');
    if (!toggle || !nav) return;

    // Index each link so CSS can stagger its entrance.
    var links = Array.prototype.slice.call(nav.querySelectorAll('.nav__link'));
    links.forEach(function (link, i) { link.style.setProperty('--i', i); });

    // Tap-anywhere-to-close backdrop, inserted after the header.
    var scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    scrim.setAttribute('aria-hidden', 'true');
    nav.parentNode.parentNode.insertAdjacentElement('afterend', scrim);

    var lastFocus = null;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      scrim.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);

      if (open) {
        lastFocus = document.activeElement;
        // Let the panel finish sliding before pulling focus into it.
        window.setTimeout(function () {
          if (links[0]) links[0].focus({ preventScroll: true });
        }, 240);
      } else if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus({ preventScroll: true });
        lastFocus = null;
      }
    }

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

    toggle.addEventListener('click', function () { setOpen(!isOpen()); });
    scrim.addEventListener('click', function () { setOpen(false); });

    // Close when a destination is chosen.
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !isOpen()) return;
      setOpen(false);
    });

    // Keep Tab inside the open panel.
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !isOpen()) return;
      var focusables = nav.querySelectorAll('a[href], button:not([disabled])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        toggle.focus();
      }
    });

    // Reset when leaving the mobile breakpoint.
    var wide = window.matchMedia('(min-width: 901px)');
    var onChange = function (e) { if (e.matches && isOpen()) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else wide.addListener(onChange);
  }

  /* ------------------------------------------------------------------
     3. Scroll reveal — AOS (Animate On Scroll)
     ------------------------------------------------------------------
     The library ships in assets/vendor/. It is initialised here rather
     than inline so every page gets identical timing.
     ------------------------------------------------------------------ */
  function initAOS() {
    // Elements marked data-aos-stagger get a delay from their position
    // among their siblings, so a grid of cards arrives in sequence.
    document.querySelectorAll('[data-aos-stagger]').forEach(function (el) {
      var siblings = Array.prototype.slice.call(el.parentElement.children);
      var index = siblings.filter(function (n) {
        return n.hasAttribute && n.hasAttribute('data-aos-stagger');
      }).indexOf(el);
      if (index > 0) el.setAttribute('data-aos-delay', String(index * 90));
    });

    // Two-column feature rows read better arriving from their own side than
    // both sliding up together. Applied here so the markup stays uniform.
    if (window.matchMedia('(min-width: 900px)').matches) {
      document.querySelectorAll('.split').forEach(function (split) {
        var halves = Array.prototype.slice.call(split.children).filter(function (n) {
          return n.getAttribute('data-aos') === 'fade-up';
        });
        if (halves.length !== 2) return;
        var reversed = split.classList.contains('split--reverse');
        halves[0].setAttribute('data-aos', reversed ? 'fade-left' : 'fade-right');
        halves[1].setAttribute('data-aos', reversed ? 'fade-right' : 'fade-left');
      });
    }

    // The statistics band lands as one unit rather than drifting upward.
    document.querySelectorAll('.stats[data-aos]').forEach(function (el) {
      el.setAttribute('data-aos', 'zoom-in-up');
    });

    if (typeof window.AOS === 'undefined') {
      // Library missing (offline, moved file). The `html:not(.aos-ready)`
      // rule in main.css keeps every element visible, so bail quietly.
      return;
    }

    document.documentElement.classList.add('aos-ready');

    window.AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      offset: 90,
      delay: 0,
      once: true,
      mirror: false,
      anchorPlacement: 'top-bottom',
      disable: function () { return reduceMotion; }
    });

    // Images settle after init and change element offsets; recalculate.
    window.addEventListener('load', function () { window.AOS.refreshHard(); });
    document.querySelectorAll('img').forEach(function (img) {
      if (!img.complete) {
        img.addEventListener('load', function () { window.AOS.refreshHard(); }, { once: true });
      }
    });
  }

  /* ------------------------------------------------------------------
     4. Counting statistics
     ------------------------------------------------------------------ */
  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    function render(el, value) {
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      el.textContent = prefix + value.toLocaleString('en-US') + suffix;
    }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      if (reduceMotion) { render(el, target); return; }

      var duration = 1500;
      var start = null;

      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        // easeOutCubic
        var eased = 1 - Math.pow(1 - p, 3);
        render(el, Math.round(target * eased));
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
      nums.forEach(run);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    nums.forEach(function (el) {
      render(el, 0);
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     5. S.P.R.I.N.G.S. tab panel
     ------------------------------------------------------------------ */
  function initTabs() {
    var group = document.querySelector('[data-tabs]');
    if (!group) return;

    var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(group.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length) return;

    function select(index, focus) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.setAttribute('tabindex', on ? '0' : '-1');
        if (panels[i]) panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(next, true);
      });
    });

    select(0);
  }

  /* ------------------------------------------------------------------
     6. Mark the current page in the nav
     ------------------------------------------------------------------ */
  function initCurrentPage() {
    var here = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav] a[href]').forEach(function (a) {
      var target = a.getAttribute('href').split('/').pop();
      if (target && target === here) a.setAttribute('aria-current', 'page');
    });
  }

  /* ------------------------------------------------------------------
     7. Demo form handling (no backend in this prototype)
     ------------------------------------------------------------------ */
  function initForms() {
    document.querySelectorAll('[data-demo-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = form.querySelector('[data-form-note]');
        if (note) {
          note.textContent = 'Prototype only — this form is not wired to a backend yet.';
          note.style.color = 'var(--clay-500)';
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     8. Graceful image fallback — Wix CDN assets can 404 or be renamed
     ------------------------------------------------------------------ */
  function initImageFallback() {
    document.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('error', function () {
        img.style.visibility = 'hidden';
        var box = img.parentElement;
        if (box && !box.classList.contains('brand') && !box.classList.contains('footer__brand')) {
          box.style.background = 'linear-gradient(135deg, var(--blue-700), var(--spring-600))';
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function boot() {
    initHeader();
    initNav();
    initAOS();
    initCounters();
    initTabs();
    initCurrentPage();
    initForms();
    initImageFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
