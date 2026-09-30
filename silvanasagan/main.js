/* Exclusive Website Online shop template: small progressive-enhancement script.
   Without JS: forms post to subscribe.php (thank-you page) and shop buttons are plain shop links. */
(function () {
  'use strict';

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Anonymous visit counter ----------
     Only when the page has <meta name="ew-stats" content="(endpoint)"> (config stats_enabled; never in static previews).
     Sends: event, page path, referring page, ?utm_source, touch-Mac hint, automated-browser flag. No cookies, no IDs;
     the server keeps daily totals only (see the stats partial in partials/). */
  var statsMeta = document.querySelector('meta[name="ew-stats"]');
  var statsUrl = statsMeta && statsMeta.getAttribute('content');
  function stat(e) {
    if (!statsUrl || !window.URLSearchParams) return;
    try {
      var d = new URLSearchParams();
      d.append('e', e);
      if (e === 'view') {
        var utm = /[?&]utm_source=([^&#]*)/.exec(location.search);
        d.append('p', location.pathname);
        d.append('r', document.referrer || '');
        d.append('u', utm ? decodeURIComponent(utm[1].replace(/\+/g, ' ')) : '');
        d.append('t', navigator.maxTouchPoints > 1 ? '1' : '0');
      }
      d.append('w', navigator.webdriver ? '1' : '0');
      if (navigator.sendBeacon && navigator.sendBeacon(statsUrl, d)) return;
      if (window.fetch) fetch(statsUrl, { method: 'POST', body: d, keepalive: true, credentials: 'omit' }).catch(function () {});
    } catch (err) {}
  }
  if (statsUrl) {
    if (document.prerendering) document.addEventListener('prerenderingchange', function () { stat('view'); }, { once: true });
    else stat('view');
    // Every "Shop now" / shop link click (popup or not). Clicks inside the popup are counted separately.
    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a.js-shop');
      if (link && !link.closest('#shop-modal')) stat('shop');
    }, true);
  }

  if (!window.fetch || !window.FormData) return;

  /* ---------- Remember signup / "no thanks" for 30 days ---------- */
  var KEY = 'ew_shop_gate';
  var TTL = 30 * 24 * 60 * 60 * 1000;
  function remember(state) {
    try { localStorage.setItem(KEY, JSON.stringify({ state: state, t: Date.now() })); } catch (e) {}
  }
  function remembered() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && Date.now() - v.t < TTL) return v.state;
      if (v) localStorage.removeItem(KEY);
    } catch (e) {}
    return null;
  }

  /* ---------- Signup forms (inline + popup share this) ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function initForm(form) {
    form.noValidate = true; // JS validates; without JS the browser's native checks apply
    var msg = form.querySelector('.form-msg');
    var btn = form.querySelector('button[type="submit"]');
    var email = form.querySelector('input[type="email"]');
    var success = document.querySelector(form.getAttribute('data-success'));
    var btnText = btn.textContent;

    function showError(text) { msg.textContent = text; msg.classList.add('is-error'); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = '';
      msg.classList.remove('is-error');
      email.removeAttribute('aria-invalid');

      if (!EMAIL_RE.test(email.value.trim())) {
        email.setAttribute('aria-invalid', 'true');
        email.focus();
        showError('Please enter a valid email address.');
        return;
      }

      var data = new FormData(form);
      data.append('ajax', '1');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (json) {
          if (json && json.ok) {
            remember('subscribed');
            var step = form.closest('.modal-step');
            var hideEl = step && step.getAttribute('data-step') === 'form' ? step : form;
            if (json.code) {
              // New signups get a short thank-you (the title already says "You're in!"); repeat signups see the server's note.
              success.querySelector('.js-msg').textContent = /already/i.test(json.message || '') ? json.message : 'Thank you for supporting a small studio.';
              success.querySelector('.js-code').textContent = json.code;
            } else {
              // Honeypot path: thank them, reveal nothing.
              success.querySelector('.js-msg').textContent = 'Thank you!';
              var row = success.querySelector('.code-row'); if (row) row.hidden = true;
              var lbl = success.querySelector('.code-label'); if (lbl) lbl.hidden = true;
            }
            hideEl.hidden = true;
            success.hidden = false;
            success.focus();
          } else {
            showError((json && json.message) || 'Something went wrong. Please try again.');
          }
        })
        .catch(function () { showError('Network problem. Please check your connection and try again.'); })
        .then(function () { btn.disabled = false; btn.textContent = btnText; });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('form.js-signup'), initForm);

  /* ---------- Copy code buttons ---------- */
  document.addEventListener('click', function (e) {
    var copy = e.target.closest && e.target.closest('.js-copy');
    if (!copy) return;
    var code = copy.parentNode.querySelector('.js-code').textContent;
    var done = function () { copy.textContent = 'Copied!'; setTimeout(function () { copy.textContent = 'Copy'; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, function () {});
    }
  });

  /* ---------- Shop popup ---------- */
  var modal = document.getElementById('shop-modal');
  if (!modal || typeof modal.showModal !== 'function') return; // old browser: links just work

  var lastFocus = null;
  var dismissedThisVisit = false; // closed with X/Esc/backdrop: don't nag again this page view
  var skip = modal.querySelector('.js-skip');
  var cont = modal.querySelector('.js-continue');

  function focusables() {
    return Array.prototype.filter.call(
      modal.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function openModal(href, opener) {
    lastFocus = opener || document.activeElement;
    skip.href = href;
    cont.href = href;
    document.documentElement.classList.add('modal-open');
    modal.showModal();
    stat('popup');
    var first = modal.querySelector('[data-step="form"]:not([hidden]) input[type="email"]') || focusables()[0];
    if (first) first.focus();
  }

  function closeModal() {
    if (!modal.open) return;
    modal.close();
  }

  modal.addEventListener('close', function () {
    document.documentElement.classList.remove('modal-open');
    dismissedThisVisit = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });

  // Esc fires "cancel" natively; close buttons + backdrop clicks:
  modal.addEventListener('click', function (e) {
    if (e.target === modal || (e.target.closest && e.target.closest('[data-close]'))) closeModal();
  });

  // Focus trap (Tab / Shift+Tab stay inside the popup)
  modal.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  skip.addEventListener('click', function () { remember('dismissed'); stat('nothanks'); });

  // Any shop button: show popup unless already signed up / said no thanks recently.
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a.js-shop');
    if (!link || modal.contains(link)) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (remembered() || dismissedThisVisit) return; // go straight to the shop
    e.preventDefault();
    openModal(link.href, link);
  });
})();

/* ---------- Testimonials slider ----------
   Native horizontal scroll-snap track (swipe/drag/trackpad work without JS).
   JS adds prev/next, dots, and gentle auto-advance that pauses on hover, focus,
   touch, when off-screen or the tab is hidden, and never runs with prefers-reduced-motion.
   The Pause/Play button stops it for good (WCAG 2.2.2). */
(function () {
  var root = document.querySelector('[data-slider]');
  if (!root) return;
  var track = root.querySelector('.t-track');
  var slides = Array.prototype.slice.call(track.children);
  var prev = root.querySelector('[data-prev]'), next = root.querySelector('[data-next]');
  var toggle = root.querySelector('[data-toggle]');
  var dotsWrap = root.querySelector('.t-dots');
  if (slides.length < 2) { root.querySelector('.t-controls').hidden = true; return; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var INTERVAL = 6000, timer = null, hovering = false, focused = false, touching = false, visible = true, stopped = false;

  root.querySelector('.t-controls').hidden = false;
  slides.forEach(function (s, i) {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
  });

  function step() { return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth; }
  function perView() { return Math.max(1, Math.round(track.clientWidth / step())); }
  function pages() { return Math.max(1, slides.length - perView() + 1); }
  function current() { return Math.min(pages() - 1, Math.round(track.scrollLeft / step())); }
  function go(i, smooth) {
    var n = pages();
    i = (i + n) % n;
    var left = slides[i].offsetLeft - slides[0].offsetLeft;
    var behavior = (smooth === false || (reduce && reduce.matches)) ? 'auto' : 'smooth';
    try { track.scrollTo({ left: left, behavior: behavior }); } catch (e) { track.scrollLeft = left; }
  }

  var dots = [];
  function buildDots() {
    dotsWrap.innerHTML = ''; dots = [];
    for (var i = 0; i < pages(); i++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 't-dot';
      b.setAttribute('aria-label', 'Show review ' + (i + 1));
      (function (k) { b.addEventListener('click', function () { go(k); }); })(i);
      dotsWrap.appendChild(b); dots.push(b);
    }
    sync();
  }
  function sync() {
    var c = current();
    dots.forEach(function (d, i) { if (i === c) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  }

  function canRun() { return !stopped && !hovering && !focused && !touching && visible && !document.hidden && !(reduce && reduce.matches); }
  function schedule() {
    clearTimeout(timer);
    if (canRun()) timer = setTimeout(function () { go(current() + 1); schedule(); }, INTERVAL);
  }
  function setStopped(v) {
    stopped = v;
    toggle.setAttribute('aria-pressed', v ? 'true' : 'false');
    toggle.setAttribute('aria-label', v ? 'Play automatic slide show' : 'Pause automatic slide show');
    toggle.querySelector('.i-pause').style.display = v ? 'none' : '';
    toggle.querySelector('.i-play').style.display = v ? '' : 'none';
    schedule();
  }

  prev.addEventListener('click', function () { go(current() - 1); });
  next.addEventListener('click', function () { go(current() + 1); });
  toggle.addEventListener('click', function () { setStopped(!stopped); });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
  });
  var raf = 0;
  track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
  root.addEventListener('mouseenter', function () { hovering = true; schedule(); });
  root.addEventListener('mouseleave', function () { hovering = false; schedule(); });
  root.addEventListener('focusin', function () { focused = true; schedule(); });
  root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) { focused = false; schedule(); } });
  track.addEventListener('touchstart', function () { touching = true; schedule(); }, { passive: true });
  track.addEventListener('touchend', function () { setTimeout(function () { touching = false; schedule(); }, 4000); }, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  if (reduce && reduce.addEventListener) reduce.addEventListener('change', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; schedule(); }, { threshold: 0.3 }).observe(root);
  }
  var rs = 0;
  window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(buildDots, 150); });

  // Reduced motion: no auto-advance at all, so the Pause/Play button isn't needed.
  if (reduce && reduce.matches) { stopped = true; toggle.hidden = true; } else setStopped(false);
  buildDots();
})();
