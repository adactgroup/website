(function () {
  window.dataLayer = window.dataLayer || [];

  function pushEvent(name, data) {
    window.dataLayer.push(Object.assign({
      event: name,
      page_path: window.location.pathname
    }, data || {}));
  }

  function isQuoteLink(link, text, href) {
    return link.classList.contains('js-quote-cta') ||
      href.indexOf('contact.html#contact-form') !== -1 ||
      text.indexOf('quote') !== -1;
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a, button');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var text = (link.textContent || '').trim();
    var textLower = text.toLowerCase();

    if (href.indexOf('tel:') === 0) {
      pushEvent('phone_click', {
        link_url: href,
        link_text: text
      });
      return;
    }

    if (href.indexOf('mailto:') === 0) {
      pushEvent('email_click', {
        link_url: href,
        link_text: text
      });
      return;
    }

    if (isQuoteLink(link, textLower, href)) {
      pushEvent('quote_button_click', {
        link_url: href,
        link_text: text
      });
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || form.id !== 'contact-form') return;

    pushEvent('quote_form_attempt', {
      form_id: form.id,
      form_action: form.getAttribute('action') || ''
    });
  });

  if (/\/(?:mockup-)?thank-you\.html$/.test(window.location.pathname)) {
    pushEvent('quote_form_submit', {
      form_id: 'contact-form',
      method: 'web3forms_redirect'
    });
  }
})();
