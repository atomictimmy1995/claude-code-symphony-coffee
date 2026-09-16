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
  // These refs live in the progress summary, which the section renders only when
  // the collection has products. They are deliberately NOT declared as
  // requiredRefs: an empty or unset collection is a valid state, and Component
  // throws MissingRefError for any required ref it cannot find, which would take
  // the component down on a page that is otherwise fine.

  /** @type {(() => void) | null} */
  #boundRefresh = null;

  connectedCallback() {
    super.connectedCallback();

    // Nothing to track without the summary, so don't hold a document listener.
    if (!this.#hasProgressUi()) return;

    this.#boundRefresh = this.#refresh.bind(this);
    document.addEventListener(ThemeEvents.cartUpdate, this.#boundRefresh);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (!this.#boundRefresh) return;

    document.removeEventListener(ThemeEvents.cartUpdate, this.#boundRefresh);
    this.#boundRefresh = null;
  }

  /**
   * Whether the progress summary is present in the DOM.
   * @returns {boolean}
   */
  #hasProgressUi() {
    const { progressBar, progressFill, progressText, statusText, checkoutButton } = this.refs;

    return Boolean(progressBar && progressFill && progressText && statusText && checkoutButton);
  }

  get minimumUnits() {
    return parseInt(this.dataset.minimumUnits || '0', 10);
  }

  /** @returns {Set<string>} */
  get wholesaleVariantIds() {
    const raw = this.dataset.wholesaleVariantIds;
    if (!raw) return new Set();

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();

      return new Set(parsed.filter(Boolean).map(/** @param {string|number} id */ (id) => String(id)));
    } catch {
      // Malformed attribute shouldn't take the progress bar down with it.
      return new Set();
    }
  }

  async #refresh() {
    if (!this.#hasProgressUi()) return;

    let cart;

    try {
      const response = await fetch(`${Theme.routes.cart_url}.js`);
      if (!response.ok) return;

      cart = await response.json();
    } catch {
      // A dropped connection mid-add shouldn't surface as an unhandled rejection.
      // The last rendered total stays on screen, and the next cart:update retries.
      return;
    }

    if (!Array.isArray(cart?.items)) return;

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
