/* STATIC PREVIEW ONLY (GitHub Pages has no PHP).
   Signup forms are handled entirely in the browser: nothing is sent or stored anywhere.
   Stands in for subscribe.php by answering main.js's request locally with the same reply the real site gives. */
(function () {
  'use strict';
  var OFFER = {"code": "IRA10", "label": "10% off your first order"};
  var SENTINEL = '#preview-signup';
  var realFetch = window.fetch;

  // Never let a signup form submit natively (main.js normally cancels it; this is a safety net).
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.matches && f.matches('form.js-signup')) e.preventDefault();
  }, true);

  if (!realFetch || !window.Response || !window.FormData) return; // main.js won't run either; buttons stay disabled

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf(SENTINEL) === -1) return realFetch.apply(this, arguments);
    var hp = '';
    try { var b = init && init.body; hp = b && b.get ? String(b.get('website') || '').trim() : ''; } catch (e) {}
    var payload = hp
      ? { ok: true, message: 'Thanks! Check your inbox soon.' }            // honeypot: same as the real server
      : { ok: true, message: 'You\u2019re in! Here\u2019s your code \u2014 thank you for supporting a small studio.',
          code: OFFER.code, label: OFFER.label };
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }, 350);
    });
  };

  Array.prototype.forEach.call(document.querySelectorAll('[data-preview-disabled]'), function (btn) {
    btn.disabled = false;
    btn.removeAttribute('data-preview-disabled');
  });
})();
