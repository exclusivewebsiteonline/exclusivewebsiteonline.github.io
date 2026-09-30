/* Free preview popup: open/close, light validation, AJAX (JSON) submit to Web3Forms. Without JS the form still works (:target + normal POST). */
(function () {
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var CONTACT = 'hello@exclusivewebsite.online';
  var THANKS = 'Your site is in the works! You\u2019ll receive an email with your preview as soon as it\u2019s done.';
  var modal = document.getElementById('preview');
  var form = document.getElementById('preview-form');
  var body = document.getElementById('preview-body');
  if (!modal || !form) return;
  document.documentElement.classList.add('js');
  form.setAttribute('novalidate', '');
  var lastFocus = null;
  var $ = function (id) { return document.getElementById(id); };

  function focusables() { return [].slice.call(modal.querySelectorAll('a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"])')); }
  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    setTimeout(function () { var f = $('f-shop'); (f || modal.querySelector('.modal-close')).focus(); }, 30);
  }
  function close(e) {
    if (e) e.preventDefault();
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    if (location.hash === '#preview') history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  [].forEach.call(document.querySelectorAll('.js-preview'), function (a) { a.addEventListener('click', open); });
  [].forEach.call(modal.querySelectorAll('.modal-close, .modal-backdrop'), function (a) { a.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') close(e);
    if (e.key === 'Tab') {
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  if (location.hash === '#preview') open();

  /* ---- validation ---- */
  // Accepts etsy.com/shop/NAME (any country path, query), NAME.etsy.com, or a plain shop name. Returns NAME or null.
  function parseShop(v) {
    v = (v || '').trim().replace(/^@/, '');
    if (!v) return null;
    var m = v.match(/^(?:https?:\/\/)?(?:www\.|m\.)?etsy\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?shop\/([A-Za-z0-9]+)\/?(?:[?#].*)?$/i);
    if (m) return m[1];
    m = v.match(/^(?:https?:\/\/)?([A-Za-z0-9]+)\.etsy\.com\/?(?:[?#].*)?$/i);
    if (m && !/^(www|m|help|blog)$/i.test(m[1])) return m[1];
    if (/^[A-Za-z0-9]{2,40}$/.test(v)) return v;
    return null;
  }
  function parseIg(v) {
    v = (v || '').trim();
    if (!v) return '';
    var m = v.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?(?:[?#].*)?$/i);
    if (m) v = m[1];
    v = v.replace(/^@/, '');
    return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : null;
  }
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function setErr(input, msg) {
    var el = $(input.id + '-err');
    if (el) el.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.closest('.field').classList.toggle('has-error', !!msg);
  }
  function validate() {
    var ok = true, first = null;
    var shop = $('f-shop'), email = $('f-email'), ig = $('f-ig');
    var shopName = parseShop(shop.value);
    if (!shop.value.trim()) { setErr(shop, 'Please enter your Etsy shop link or shop name.'); ok = false; first = first || shop; }
    else if (!shopName) { setErr(shop, 'That doesn\u2019t look like an Etsy shop. Try etsy.com/shop/YourShop or just YourShop.'); ok = false; first = first || shop; }
    else setErr(shop, '');
    if (!email.value.trim()) { setErr(email, 'Please enter your email address.'); ok = false; first = first || email; }
    else if (!EMAIL.test(email.value.trim())) { setErr(email, 'Please check your email address.'); ok = false; first = first || email; }
    else setErr(email, '');
    var igName = parseIg(ig.value);
    if (igName === null) { setErr(ig, 'Enter your handle, like @yourshop.'); ok = false; first = first || ig; }
    else setErr(ig, '');
    if (first) first.focus();
    return ok ? { shop: shopName, ig: igName } : null;
  }
  ['f-shop', 'f-email', 'f-ig'].forEach(function (id) {
    $(id).addEventListener('input', function () { if (this.getAttribute('aria-invalid') === 'true') setErr(this, ''); });
  });

  /* ---- submit ---- */
  var errBox = $('f-error'), btn = $('f-submit');
  function showError() {
    errBox.innerHTML = 'Sorry, something went wrong and your request wasn\u2019t sent. Please try again, or email us at <a href="mailto:' + CONTACT + '?subject=Free%20preview%20request">' + CONTACT + '</a> with your Etsy shop link.';
    errBox.hidden = false;
    btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;
    var v = validate(); if (!v) return;
    var data = {
      etsy_shop: 'https://www.etsy.com/shop/' + v.shop,
      email: $('f-email').value.trim(),
      access_key: form.elements.access_key.value,
      subject: 'New preview request: ' + v.shop,
      from_name: 'Exclusive Website Online',
      botcheck: $('f-honey').checked
    };
    if (v.ig) data.instagram = '@' + v.ig;
    var name = $('f-name').value.trim(); if (name) data.first_name = name;
    btn.disabled = true; btn.textContent = 'Sending\u2026';
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.j.success) !== 'true') throw new Error((res.j && res.j.message) || 'failed');
        body.innerHTML = '<div class="thanks" tabindex="-1"><div class="thanks-mark" aria-hidden="true">&#10003;</div><h2 id="preview-title">Thank you!</h2><p>' + THANKS + '</p><button type="button" class="btn btn-outline" id="thanks-close">Close</button></div>';
        var t = body.querySelector('.thanks'); t.focus();
        $('thanks-close').addEventListener('click', close);
      })
      .catch(function () { showError(); btn.disabled = false; btn.textContent = 'Send my request'; });
  });
})();
