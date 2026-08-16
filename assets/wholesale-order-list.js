import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

/**
 * Tracks how many units from the wholesale collection are in the cart and reflects
 * progress toward the checkout minimum.
 *
 * @typedef {object} WholesaleOrderListRefs
 * @property {HTMLElement} progressBar
 * @property {HTMLElement} progressFill
 * @property {HTMLElement} progressText
 * @property {HTMLElement} statusText
 * @property {HTMLAnchorElement} checkoutButton
 *
 * @extends Component<WholesaleOrderListRefs>
 */
class WholesaleOrderListComponent extends Component {
  requiredRefs = ['progressBar', 'progressFill', 'progressText', 'statusText', 'checkoutButton'];

  /** @type {() => void} */
  #boundRefresh;

  connectedCallback() {
    super.connectedCallback();

    this.#boundRefresh = this.#refresh.bind(this);
    document.addEventListener(ThemeEvents.cartUpdate, this.#boundRefresh);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(ThemeEvents.cartUpdate, this.#boundRefresh);
  }

  get minimumUnits() {
    return parseInt(this.dataset.minimumUnits || '0', 10);
  }

  /** @returns {Set<string>} */
  get wholesaleVariantIds() {
    const raw = this.dataset.wholesaleVariantIds;
    if (!raw) return new Set();

    return new Set(
      JSON.parse(raw)
        .filter(Boolean)
        .map(/** @param {string|number} id */ (id) => String(id))
    );
  }

  async #refresh() {
    const response = await fetch(`${Theme.routes.cart_url}.js`);
    if (!response.ok) return;

    const cart = await response.json();
    const variantIds = this.wholesaleVariantIds;
    const units = cart.items.reduce(
      /** @param {number} total @param {{id: number, quantity: number}} item */
      (total, item) => (variantIds.has(String(item.id)) ? total + item.quantity : total),
      0
    );

    this.#render(units);
  }

  /** @param {number} units */
  #render(units) {
    const { progressBar, progressFill, progressText, statusText, checkoutButton } = this.refs;
    const minimum = this.minimumUnits;
    const meetsMinimum = units >= minimum;
    const percent = minimum > 0 ? Math.min((units / minimum) * 100, 100) : 0;

    progressFill.style.setProperty('--wholesale-progress', `${percent}%`);
    progressBar.setAttribute('aria-valuenow', String(units));

    progressText.textContent = (this.dataset.progressTemplate || '')
      .replace('__UNITS__', String(units))
      .replace('__MINIMUM__', String(minimum));

    statusText.textContent = meetsMinimum
      ? this.dataset.unlockedText || ''
      : (this.dataset.remainingTemplate || '').replace('__UNITS__', String(minimum - units));

    statusText.classList.toggle('wholesale-order-list__status--met', meetsMinimum);
    checkoutButton.classList.toggle('wholesale-order-list__checkout--disabled', !meetsMinimum);

    if (meetsMinimum) {
      checkoutButton.removeAttribute('aria-disabled');
      checkoutButton.removeAttribute('tabindex');
    } else {
      checkoutButton.setAttribute('aria-disabled', 'true');
      checkoutButton.setAttribute('tabindex', '-1');
    }
  }
}

if (!customElements.get('wholesale-order-list-component')) {
  customElements.define('wholesale-order-list-component', WholesaleOrderListComponent);
}
