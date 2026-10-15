import { CartAddEvent } from '@theme/events';

class CartRecommendationsComponent extends HTMLElement {
  connectedCallback() {
    this.container = this.querySelector('.cart-recommendations__slider');

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
    if (this.navInitialized) return;
    this.navInitialized = true;

    this.addEventListener('click', (e) => {
      const prevBtn = e.target.closest('.cart-recommendations__nav--prev');
      const nextBtn = e.target.closest('.cart-recommendations__nav--next');

      if (prevBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.scrollSlider(-1);
      } else if (nextBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.scrollSlider(1);
      }
    });

    if (this.dataset.autoplay === 'true') {
      this.startAutoplay();
    }
  }

  scrollSlider(direction) {
    if (!this.container) {
      this.container = this.querySelector('.cart-recommendations__slider');
    }
    if (!this.container) return;

    const card = this.container.querySelector('.cart-recommendations__card');
    const scrollAmount = card ? (card.getBoundingClientRect().width + 12) : 200;

    this.container.scrollBy({
      left: direction * scrollAmount,
      behavior: 'smooth'
    });
  }

  startAutoplay() {
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
    this.autoplayInterval = setInterval(() => {
      this.scrollSlider(1);
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
            ${imageSrc ? `<img src="${imageSrc}" alt="${product.title}" loading="lazy" class="cart-recommendations__image">` : `<div class="cart-recommendations__placeholder"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
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
              ${isSingleVariant ? `
                <button 
                  type="button" 
                  class="cart-recommendations__add-btn js-quick-add"
                  data-variant-id="${firstVariant ? firstVariant.id : ''}"
                  data-product-url="/products/${product.handle}"
                >
                  Add to cart
                </button>
              ` : `
                <a 
                  href="/products/${product.handle}"
                  class="cart-recommendations__add-btn js-select-options"
                >
                  Select Size
                </a>
              `}
            ` : ''}
          </div>
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

    // Multi-variant "Select Size" redirects directly to product page
    this.querySelectorAll('.js-select-options').forEach(btn => {
      btn.onclick = (e) => {
        const url = btn.getAttribute('href') || btn.dataset.productUrl;
        if (url) {
          window.location.href = url;
        }
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
      const cartItemsComponents = document.querySelectorAll('cart-items-component');
      const sectionIds = [];
      cartItemsComponents.forEach((comp) => {
        if (comp.dataset && comp.dataset.sectionId) {
          sectionIds.push(comp.dataset.sectionId);
        }
      });

      const bodyData = {
        items: [{ id: parseInt(variantId, 10), quantity: 1 }]
      };
      if (sectionIds.length > 0) {
        bodyData.sections = sectionIds.join(',');
      }

      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      if (!res.ok) return false;

      const data = await res.json();

      const cartRes = await fetch('/cart.js');
      const cartData = cartRes.ok ? await cartRes.json() : undefined;

      document.dispatchEvent(new CustomEvent('cart:updated'));
      document.dispatchEvent(
        new CartAddEvent(cartData, variantId.toString(), {
          source: 'cart-recommendations',
          itemCount: 1,
          sections: data.sections,
        })
      );

      return true;
    } catch (err) {
      console.error('Failed to add variant to cart', err);
      return false;
    }
  }
}

if (!customElements.get('cart-recommendations')) {
  customElements.define('cart-recommendations', CartRecommendationsComponent);
}
