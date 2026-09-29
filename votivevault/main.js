/* Exclusive Website Online shop template: small progressive-enhancement script.
   Without JS: forms post to subscribe.php (thank-you page) and shop buttons are plain shop links. */
(function () {
  'use strict';

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

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

  skip.addEventListener('click', function () { remember('dismissed'); });

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
