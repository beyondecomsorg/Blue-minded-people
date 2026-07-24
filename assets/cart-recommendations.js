import { CartAddEvent } from '@theme/events';

class CartRecommendationsComponent extends HTMLElement {
  connectedCallback() {
    this.container = this.querySelector('.cart-recommendations__slider');
    this.prevBtn = this.querySelector('.cart-recommendations__nav--prev');
    this.nextBtn = this.querySelector('.cart-recommendations__nav--next');

    this.initSliderNav();
    this.initQuickAdd();

    if (this.dataset.productId && this.dataset.recommendationsUrl) {
      this.fetchRecommendations();
    }

    document.addEventListener(CartAddEvent.eventName, () => {
      setTimeout(() => this.fetchRecommendations(), 300);
    });
  }

  initSliderNav() {
    if (!this.container) return;

    if (this.prevBtn) {
      this.prevBtn.onclick = (e) => {
        e.preventDefault();
        this.container.scrollBy({ left: -220, behavior: 'smooth' });
      };
    }

    if (this.nextBtn) {
      this.nextBtn.onclick = (e) => {
        e.preventDefault();
        this.container.scrollBy({ left: 220, behavior: 'smooth' });
      };
    }

    if (this.dataset.autoplay === 'true') {
      this.startAutoplay();
    }
  }

  startAutoplay() {
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
    this.autoplayInterval = setInterval(() => {
      if (!this.container) return;
      const maxScrollLeft = this.container.scrollWidth - this.container.clientWidth;
      if (this.container.scrollLeft >= maxScrollLeft - 5) {
        this.container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        this.container.scrollBy({ left: 220, behavior: 'smooth' });
      }
    }, 4000);

    this.onmouseenter = () => clearInterval(this.autoplayInterval);
    this.onmouseleave = () => this.startAutoplay();
  }

  async fetchRecommendations() {
    const productId = this.dataset.productId;
    const limit = this.dataset.limit || 6;
    const recommendationsUrl = this.dataset.recommendationsUrl;

    if (!productId || !recommendationsUrl) return;

    try {
      const response = await fetch(`${recommendationsUrl}.json?product_id=${productId}&limit=${limit}`);
      if (!response.ok) return;

      const data = await response.json();
      const products = data.products || [];

      if (products.length > 0) {
        this.renderProducts(products);
      }
    } catch (err) {
      console.warn('CartRecommendations API fetch failed:', err);
    }
  }

  formatMoney(cents) {
    if (!cents) return '';
    let val = cents;
    if (typeof cents === 'string') {
      val = parseFloat(cents.replace(/[^0-9.]/g, '')) * 100;
    }
    if (isNaN(val)) return '';
    const amount = Math.round(val / 100).toLocaleString('en-IN');
    return `Rs. ${amount}`;
  }

  renderProducts(products) {
    if (!this.container || !products || products.length === 0) return;

    const showVendor = this.dataset.showVendor === 'true';
    const showCompareAt = this.dataset.showCompareAt === 'true';
    const showDiscount = this.dataset.showDiscount === 'true';
    const showQuickAdd = this.dataset.showQuickAdd === 'true';

    const itemsHtml = products.map(product => {
      const firstVariant = product.variants ? product.variants[0] : null;
      const isSingleVariant = product.variants && product.variants.length === 1;
      const priceVal = firstVariant ? firstVariant.price : 0;
      const compareVal = firstVariant ? firstVariant.compare_at_price : 0;
      const hasDiscount = compareVal && compareVal > priceVal;

      let discountPercent = 0;
      if (hasDiscount) {
        discountPercent = Math.round(((compareVal - priceVal) / compareVal) * 100);
      }

      const formattedPrice = this.formatMoney(priceVal);
      const formattedCompare = this.formatMoney(compareVal);
      const imageSrc = product.images && product.images.length > 0
        ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].src)
        : '';

      const variantsHtml = !isSingleVariant && product.variants ? product.variants.map(v => {
        const isAvailable = v.available !== false;
        return isAvailable
          ? `<button type="button" class="cart-recommendations__pill js-variant-pill" data-variant-id="${v.id}">${v.title}</button>`
          : `<button type="button" class="cart-recommendations__pill cart-recommendations__pill--disabled" disabled>${v.title}</button>`;
      }).join('') : '';

      return `
        <div class="cart-recommendations__card" data-product-id="${product.id}">
          <a href="/products/${product.handle}" class="cart-recommendations__image-link">
            ${imageSrc ? `<img src="${imageSrc}" alt="${product.title}" loading="lazy" class="cart-recommendations__image">` : ''}
            ${showDiscount && hasDiscount ? `<span class="cart-recommendations__discount-badge">-${discountPercent}%</span>` : ''}
          </a>
          <div class="cart-recommendations__info">
            ${showVendor && product.vendor ? `<span class="cart-recommendations__vendor">${product.vendor}</span>` : ''}
            <a href="/products/${product.handle}" class="cart-recommendations__title">${product.title}</a>
            <div class="cart-recommendations__price-row">
              <span class="cart-recommendations__price">${formattedPrice}</span>
              ${showCompareAt && hasDiscount ? `<span class="cart-recommendations__compare-price">${formattedCompare}</span>` : ''}
            </div>
            ${showQuickAdd ? `
              <button 
                type="button" 
                class="cart-recommendations__add-btn ${isSingleVariant ? 'js-quick-add' : 'js-select-options'}"
                data-variant-id="${firstVariant ? firstVariant.id : ''}"
                data-product-url="/products/${product.handle}"
              >
                ${isSingleVariant ? '+ Add' : 'Select Size'}
              </button>
            ` : ''}
          </div>

          ${!isSingleVariant ? `
            <div class="cart-recommendations__popover hidden" js-variant-popover>
              <div class="cart-recommendations__popover-header">
                <span class="cart-recommendations__popover-title">SELECT SIZE</span>
                <button type="button" class="cart-recommendations__popover-close" js-close-popover aria-label="Close">&times;</button>
              </div>
              <div class="cart-recommendations__popover-pills">
                ${variantsHtml}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    this.container.innerHTML = itemsHtml;
    this.initQuickAdd();
  }

  initQuickAdd() {
    // Single variant direct add
    this.querySelectorAll('.js-quick-add').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        const variantId = btn.dataset.variantId;
        if (!variantId) return;

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Adding...';

        const success = await this.addVariantToCart(variantId);
        if (success) {
          btn.textContent = 'Added!';
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = originalText;
          }, 1500);
        } else {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      };
    });

    // Multi-variant "Select Size" toggle popover
    this.querySelectorAll('.js-select-options').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const card = btn.closest('.cart-recommendations__card');
        if (!card) return;

        // Close any other open popovers
        this.querySelectorAll('[js-variant-popover]').forEach(p => {
          if (p.closest('.cart-recommendations__card') !== card) {
            p.classList.add('hidden');
          }
        });

        const popover = card.querySelector('[js-variant-popover]');
        if (popover) {
          popover.classList.toggle('hidden');
        }
      };
    });

    // Close button on popovers
    this.querySelectorAll('[js-close-popover]').forEach(closeBtn => {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        const popover = closeBtn.closest('[js-variant-popover]');
        if (popover) popover.classList.add('hidden');
      };
    });

    // Variant pills click inside popover
    this.querySelectorAll('.js-variant-pill').forEach(pill => {
      pill.onclick = async (e) => {
        e.preventDefault();
        const variantId = pill.dataset.variantId;
        if (!variantId) return;

        const popover = pill.closest('[js-variant-popover]');
        pill.classList.add('is-adding');
        const originalText = pill.textContent;
        pill.textContent = 'Adding...';

        const success = await this.addVariantToCart(variantId);
        if (success) {
          pill.classList.remove('is-adding');
          pill.classList.add('is-added');
          pill.textContent = 'Added!';
          setTimeout(() => {
            if (popover) popover.classList.add('hidden');
            pill.classList.remove('is-added');
            pill.textContent = originalText;
          }, 800);
        } else {
          pill.classList.remove('is-adding');
          pill.textContent = originalText;
        }
      };
    });
  }

  async addVariantToCart(variantId) {
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: parseInt(variantId, 10), quantity: 1 }] })
      });

      if (res.ok) {
        document.dispatchEvent(new CustomEvent('cart:updated'));
        document.dispatchEvent(new CartAddEvent({ resource: { item_count: 1 } }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add variant to cart', err);
      return false;
    }
  }
}

if (!customElements.get('cart-recommendations')) {
  customElements.define('cart-recommendations', CartRecommendationsComponent);
}
