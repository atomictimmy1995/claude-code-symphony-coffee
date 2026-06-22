document.addEventListener('DOMContentLoaded', function () {
  const selectors = document.querySelectorAll('.instrument-family-selector');

  selectors.forEach(function (selector) {
    const sectionId = selector.dataset.sectionId;
    const cards = selector.querySelectorAll('.ifs-family-card');
    const preview = document.getElementById('ifs-preview-' + sectionId);
    const previewLabel = document.getElementById('ifs-preview-label-' + sectionId);
    const previewTitle = document.getElementById('ifs-preview-title-' + sectionId);
    const previewDesc = document.getElementById('ifs-preview-desc-' + sectionId);
    const familyInput = document.getElementById('ifs-family-input-' + sectionId);
    const cta = document.getElementById('ifs-cta-' + sectionId);
    const form = document.getElementById('ifs-form-' + sectionId);

    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        selectFamily(card);
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectFamily(card);
        }
      });
    });

    function selectFamily(card) {
      cards.forEach(function (c) {
        c.classList.remove('is-selected');
        c.setAttribute('aria-checked', 'false');
      });

      card.classList.add('is-selected');
      card.setAttribute('aria-checked', 'true');

      const familyName = card.querySelector('.ifs-family-name').textContent.trim();
      const previewTitleText = card.dataset.previewTitle;
      const previewDescText = card.dataset.previewDesc;

      previewLabel.textContent = monthName + ' — ' + familyName.toLowerCase() + ' family';
      previewTitle.textContent = previewTitleText;
      previewDesc.textContent = previewDescText;
      preview.removeAttribute('hidden');

      familyInput.value = familyName;

      cta.removeAttribute('disabled');
      cta.setAttribute('aria-disabled', 'false');
      cta.textContent = 'Join the ' + familyName + ' family \u2192';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!familyInput.value) return;

      const originalText = cta.textContent;
      cta.textContent = 'Adding to cart...';
      cta.setAttribute('disabled', true);

      const formData = new FormData(form);

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(formData.get('id')),
          quantity: 1,
          selling_plan: parseInt(formData.get('selling_plan')),
          properties: {
            'Instrument Family': formData.get('properties[Instrument Family]')
          }
        })
      })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(data.description || 'Cart error');
          });
        }
        return res.json();
      })
      .then(function () {
        cta.textContent = 'Added to cart!';
        setTimeout(function () {
          window.location.href = '/cart';
        }, 800);
      })
      .catch(function (err) {
        console.error('Symphony Coffee — cart error:', err);
        cta.removeAttribute('disabled');
        cta.setAttribute('aria-disabled', 'false');
        cta.textContent = originalText;
        alert('Something went wrong adding to cart. Please try again.');
      });
    });
  });
});
