import { Component } from '@theme/component';
import { VariantSelectedEvent, VariantUpdateEvent } from '@theme/events';
import { morph, MORPH_OPTIONS } from '@theme/morph';
import { OverflowList } from '@theme/overflow-list';
import { yieldToMainThread, getViewParameterValue, ResizeNotifier } from '@theme/utilities';

/**
 * @typedef {object} VariantPickerRefs
 * @property {HTMLFieldSetElement[]} fieldsets - The fieldset elements.
 * @property {HTMLElement} [overflowList] - The overflow list element.
 */

/**
 * A custom element that manages a variant picker.
 *
 * @template {import('@theme/component').Refs} [TRefs=VariantPickerRefs]
 * @extends Component<TRefs>
 */
export default class VariantPicker extends Component {
  /** @type {string | undefined} */
  #pendingRequestUrl;

  /** @type {AbortController | undefined} */
  #abortController;

  /** @type {number[][]} */
  #checkedIndices = [];

  /** @type {HTMLInputElement[][]} */
  #radios = [];

  #resizeObserver = new ResizeNotifier(() => this.updateVariantPickerCss());

  initRadiosAndCheckedIndices() {
    this.#radios = [];
    this.#checkedIndices = [];
    const fieldsets = /** @type {HTMLFieldSetElement[]} */ (this.refs.fieldsets || []);

    fieldsets.forEach((fieldset) => {
      const radios = Array.from(fieldset?.querySelectorAll('input') ?? []);
      this.#radios.push(radios);

      const initialCheckedIndex = radios.findIndex((radio) => radio.dataset.currentChecked === 'true' || radio.checked);
      this.#checkedIndices.push(initialCheckedIndex !== -1 ? [initialCheckedIndex] : []);
    });
  }

  initSizeChart() {
    const trigger = this.querySelector('[data-size-chart-trigger]');
    const dialog = this.querySelector('.size-chart-modal');

    if (!trigger || !dialog) return;

    // --- Dynamic Size Chart Rendering start ---
    const shirtScript = this.querySelector('.shirt-size-chart-data');
    const bottomScript = this.querySelector('.bottom-size-chart-data');
    const dynamicContainer = dialog.querySelector('.size-chart-dynamic-tables');

    if (dynamicContainer) {
      dynamicContainer.innerHTML = '';
      
      let shirtData = null;
      let bottomData = null;

      if (shirtScript && shirtScript.textContent.trim()) {
        try {
          shirtData = JSON.parse(shirtScript.textContent);
        } catch (e) {
          console.error('Error parsing shirt size chart JSON:', e);
        }
      }

      if (bottomScript && bottomScript.textContent.trim()) {
        try {
          bottomData = JSON.parse(bottomScript.textContent);
        } catch (e) {
          console.error('Error parsing bottom size chart JSON:', e);
        }
      }

      const activeUnitBtn = dialog.querySelector('.size-chart-unit-btn.active');
      const activeUnit = activeUnitBtn ? activeUnitBtn.dataset.unit : 'cm';

      const helper_renderShirtTable = (data, container) => {
        if (!data) return;
        
        let title = "";
        let unit = "cm";
        let headers = [];
        let rows = [];
        
        if (Array.isArray(data)) {
          rows = data;
          if (rows.length > 0) {
            headers = Object.keys(rows[0]);
          }
        } else {
          title = data.title || "";
          unit = data.unit || "cm";
          
          if (Array.isArray(data.rows)) {
            if (data.rows.length > 0 && Array.isArray(data.rows[0])) {
              headers = data.headers || [];
              rows = data.rows;
            } else if (data.rows.length > 0 && typeof data.rows[0] === 'object') {
              rows = data.rows;
              headers = Object.keys(rows[0]);
            }
          } else if (Array.isArray(data.data)) {
            rows = data.data;
            if (rows.length > 0) {
              if (Array.isArray(rows[0])) {
                headers = data.headers || [];
              } else {
                headers = Object.keys(rows[0]);
              }
            }
          }
        }
        
        if (headers.length === 0 && rows.length > 0) {
          if (Array.isArray(rows[0])) {
            headers = ["Size"];
            for (let i = 1; i < rows[0].length; i++) {
              headers.push(`Header ${i}`);
            }
          } else {
            headers = Object.keys(rows[0]);
          }
        }

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'size-chart-dynamic-section shirt-section';
        
        if (title) {
          const titleEl = document.createElement('h4');
          titleEl.className = 'size-chart-fit-title';
          titleEl.textContent = title;
          sectionDiv.appendChild(titleEl);
        }
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'size-chart-modal__table-container';
        
        const table = document.createElement('table');
        table.className = 'size-chart-table';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(h => {
          const th = document.createElement('th');
          th.textContent = h;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        rows.forEach(row => {
          const tr = document.createElement('tr');
          if (Array.isArray(row)) {
            row.forEach((val, idx) => {
              const td = document.createElement('td');
              if (idx === 0) {
                td.textContent = val;
              } else {
                td.className = 'size-val';
                const numVal = parseFloat(val);
                if (!isNaN(numVal)) {
                  if (unit.toLowerCase() === 'inch' || unit.toLowerCase() === 'inches') {
                    td.dataset.inch = numVal;
                    td.dataset.cm = (numVal * 2.54).toFixed(1);
                  } else {
                    td.dataset.cm = numVal;
                    td.dataset.inch = (numVal * 0.393701).toFixed(1);
                  }
                  td.textContent = (activeUnit === 'cm') ? td.dataset.cm : td.dataset.inch;
                } else {
                  td.dataset.cm = val;
                  td.dataset.inch = val;
                  td.textContent = val;
                }
              }
              tr.appendChild(td);
            });
          } else {
            headers.forEach((h, idx) => {
              const td = document.createElement('td');
              const val = row[h];
              if (idx === 0) {
                td.textContent = val;
              } else {
                td.className = 'size-val';
                const numVal = parseFloat(val);
                if (!isNaN(numVal)) {
                  if (unit.toLowerCase() === 'inch' || unit.toLowerCase() === 'inches') {
                    td.dataset.inch = numVal;
                    td.dataset.cm = (numVal * 2.54).toFixed(1);
                  } else {
                    td.dataset.cm = numVal;
                    td.dataset.inch = (numVal * 0.393701).toFixed(1);
                  }
                  td.textContent = (activeUnit === 'cm') ? td.dataset.cm : td.dataset.inch;
                } else {
                  td.dataset.cm = val;
                  td.dataset.inch = val;
                  td.textContent = val;
                }
              }
              tr.appendChild(td);
            });
          }
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        sectionDiv.appendChild(tableContainer);
        
        const unitText = document.createElement('p');
        unitText.className = 'size-chart-unit-text';
        unitText.style.fontSize = '12px';
        unitText.style.color = 'var(--color-foreground-secondary, #666)';
        unitText.style.marginTop = '8px';
        unitText.style.marginBottom = '0';
        unitText.textContent = `Measurements in ${unit}`;
        sectionDiv.appendChild(unitText);
        
        container.appendChild(sectionDiv);
      };

      const helper_renderBottomTable = (data, container) => {
        if (!data) return;
        
        let fits = [];
        if (Array.isArray(data)) {
          fits = data;
        } else if (typeof data === 'object') {
          Object.keys(data).forEach(key => {
            if (data[key] && typeof data[key] === 'object' && (data[key].rows || data[key].measurements || Array.isArray(data[key]))) {
              fits.push({
                title: key,
                ...data[key]
              });
            }
          });
        }
        
        fits.forEach(fit => {
          let fitTitle = fit.title || fit.fit || fit.fit_name || "";
          let headers = [];
          let rows = [];
          let unit = fit.unit || "cm";
          
          if (Array.isArray(fit.headers)) {
            headers = fit.headers;
            if (Array.isArray(fit.rows)) {
              rows = fit.rows;
            }
          } else if (Array.isArray(fit.sizes)) {
            headers = ["Measurement", ...fit.sizes];
            if (fit.measurements) {
              if (Array.isArray(fit.measurements)) {
                fit.measurements.forEach(m => {
                  rows.push([m.name || m.measurement || "", ...m.values]);
                });
              } else if (typeof fit.measurements === 'object') {
                Object.keys(fit.measurements).forEach(mName => {
                  rows.push([mName, ...fit.measurements[mName]]);
                });
              }
            }
          } else if (Array.isArray(fit.rows)) {
            if (fit.rows.length > 0) {
              headers = Object.keys(fit.rows[0]);
              rows = fit.rows;
            }
          } else if (Array.isArray(fit)) {
            rows = fit;
            if (rows.length > 0) {
              headers = Object.keys(rows[0]);
            }
          }
          
          if (headers.length === 0 && rows.length > 0) {
            if (Array.isArray(rows[0])) {
              headers = ["Measurement"];
              for (let i = 1; i < rows[0].length; i++) {
                headers.push(`Size ${i}`);
              }
            } else {
              headers = Object.keys(rows[0]);
            }
          }
          
          const sectionDiv = document.createElement('div');
          sectionDiv.className = 'size-chart-dynamic-section bottom-fit-section';
          
          if (fitTitle) {
            const titleEl = document.createElement('h4');
            titleEl.className = 'size-chart-fit-title';
            titleEl.textContent = fitTitle;
            sectionDiv.appendChild(titleEl);
          }
          
          const tableContainer = document.createElement('div');
          tableContainer.className = 'size-chart-modal__table-container';
          
          const table = document.createElement('table');
          table.className = 'size-chart-table';
          
          const thead = document.createElement('thead');
          const headerRow = document.createElement('tr');
          headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
          table.appendChild(thead);
          
          const tbody = document.createElement('tbody');
          rows.forEach(row => {
            const tr = document.createElement('tr');
            if (Array.isArray(row)) {
              row.forEach((val, idx) => {
                const td = document.createElement('td');
                if (idx === 0) {
                  td.textContent = val;
                } else {
                  td.className = 'size-val';
                  const numVal = parseFloat(val);
                  if (!isNaN(numVal)) {
                    if (unit.toLowerCase() === 'inch' || unit.toLowerCase() === 'inches') {
                      td.dataset.inch = numVal;
                      td.dataset.cm = (numVal * 2.54).toFixed(1);
                    } else {
                      td.dataset.cm = numVal;
                      td.dataset.inch = (numVal * 0.393701).toFixed(1);
                    }
                    td.textContent = (activeUnit === 'cm') ? td.dataset.cm : td.dataset.inch;
                  } else {
                    td.dataset.cm = val;
                    td.dataset.inch = val;
                    td.textContent = val;
                  }
                }
                tr.appendChild(td);
              });
            } else {
              headers.forEach((h, idx) => {
                const td = document.createElement('td');
                const val = row[h];
                if (idx === 0) {
                  td.textContent = val;
                } else {
                  td.className = 'size-val';
                  const numVal = parseFloat(val);
                  if (!isNaN(numVal)) {
                    if (unit.toLowerCase() === 'inch' || unit.toLowerCase() === 'inches') {
                      td.dataset.inch = numVal;
                      td.dataset.cm = (numVal * 2.54).toFixed(1);
                    } else {
                      td.dataset.cm = numVal;
                      td.dataset.inch = (numVal * 0.393701).toFixed(1);
                    }
                    td.textContent = (activeUnit === 'cm') ? td.dataset.cm : td.dataset.inch;
                  } else {
                    td.dataset.cm = val;
                    td.dataset.inch = val;
                    td.textContent = val;
                  }
                }
                tr.appendChild(td);
              });
            }
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          tableContainer.appendChild(table);
          sectionDiv.appendChild(tableContainer);
          
          container.appendChild(sectionDiv);
        });
      };

      if (shirtData) {
        helper_renderShirtTable(shirtData, dynamicContainer);
      }
      if (bottomData) {
        helper_renderBottomTable(bottomData, dynamicContainer);
      }
    }
    // --- Dynamic Size Chart Rendering end ---

    if (this._openModalHandler) {
      trigger.removeEventListener('click', this._openModalHandler);
    }

    this._openModalHandler = () => {
      dialog.classList.remove('dialog-closing');
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      const closeBtn = dialog.querySelector('.size-chart-modal__close-btn');
      if (closeBtn) closeBtn.focus();
    };

    trigger.addEventListener('click', this._openModalHandler);

    const closeButtons = dialog.querySelectorAll('[data-size-chart-close]');

    const closeModal = () => {
      dialog.classList.add('dialog-closing');
      
      const handleTransitionEnd = () => {
        dialog.close();
        dialog.classList.remove('dialog-closing');
        document.body.style.overflow = '';
        trigger.focus();
        dialog.removeEventListener('animationend', handleTransitionEnd);
        dialog.removeEventListener('transitionend', handleTransitionEnd);
      };
      
      dialog.addEventListener('animationend', handleTransitionEnd);
      dialog.addEventListener('transitionend', handleTransitionEnd);
      
      // Fallback in case transition fails to trigger
      setTimeout(() => {
        if (dialog.open && dialog.classList.contains('dialog-closing')) {
          dialog.close();
          dialog.classList.remove('dialog-closing');
          document.body.style.overflow = '';
          trigger.focus();
        }
      }, 350);
    };

    closeButtons.forEach(btn => {
      btn.onclick = closeModal;
    });

    dialog.onclick = (event) => {
      if (event.target === dialog) {
        closeModal();
      }
    };

    dialog.onclose = () => {
      document.body.style.overflow = '';
    };

    // Smooth exit animation on Escape key press
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal();
    });

    // Accessibility: Focus trap within modal
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = dialog.querySelectorAll('button, .size-chart-unit-btn, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    });

    // Unit toggle switcher (cm / inches)
    const unitButtons = dialog.querySelectorAll('.size-chart-unit-btn');
    unitButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        unitButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const unit = btn.dataset.unit;
        const sizeVals = dialog.querySelectorAll('.size-val');
        sizeVals.forEach(cell => {
          if (unit === 'cm') {
            cell.textContent = cell.dataset.cm;
          } else {
            cell.textContent = cell.dataset.inch;
          }
        });
      });
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this._initTimeout = setTimeout(() => {
      this.initRadiosAndCheckedIndices();
      this.initSizeChart();
      this.updateInventoryStatus();
    }, 0);

    this.addEventListener('change', this.variantChanged.bind(this));
    this.#resizeObserver.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._initTimeout) {
      clearTimeout(this._initTimeout);
    }
    this.#resizeObserver.disconnect();
    const trigger = this.querySelector('[data-size-chart-trigger]');
    if (trigger && this._openModalHandler) {
      trigger.removeEventListener('click', this._openModalHandler);
    }
  }

  /**
   * Handles the variant change event.
   * @param {Event} event - The variant change event.
   */
  variantChanged(event) {
    if (!(event.target instanceof HTMLElement)) return;

    const selectedOption =
      event.target instanceof HTMLSelectElement ? event.target.options[event.target.selectedIndex] : event.target;

    if (!selectedOption) return;

    this.updateSelectedOption(event.target);
    this.dispatchEvent(new VariantSelectedEvent({
      id: selectedOption.dataset.optionValueId ?? '',
    }));

    const isOnProductPage =
      this.dataset.templateProductMatch === 'true' &&
      !event.target.closest('product-card') &&
      !event.target.closest('quick-add-dialog');

    // Morph the entire main content for combined listings child products, because changing the product
    // might also change other sections depending on recommendations, metafields, etc.
    const currentUrl = this.dataset.productUrl?.split('?')[0];
    const newUrl = selectedOption.dataset.connectedProductUrl;
    const loadsNewProduct = isOnProductPage && !!newUrl && newUrl !== currentUrl;
    const isOnFeaturedProductSection = Boolean(this.closest('featured-product-information'));

    const morphElementSelector = loadsNewProduct
      ? 'main'
      : isOnFeaturedProductSection
      ? 'featured-product-information'
      : undefined;

    this.fetchUpdatedSection(this.buildRequestUrl(selectedOption), morphElementSelector);

    const url = new URL(window.location.href);

    const variantId = selectedOption.dataset.variantId || null;

    if (isOnProductPage) {
      if (variantId) {
        url.searchParams.set('variant', variantId);
      } else {
        url.searchParams.delete('variant');
      }
    }

    // Change the path if the option is connected to another product via combined listing.
    if (loadsNewProduct) {
      url.pathname = newUrl;
    }

    if (url.href !== window.location.href) {
      yieldToMainThread().then(() => {
        history.replaceState({}, '', url.toString());
      });
    }

    this.updateInventoryStatus();
  }

  updateInventoryStatus() {
    const selectedVariantId = this.dataset.selectedVariantId || 
      this.querySelector('input[type="radio"]:checked')?.dataset.variantId || 
      this.querySelector('select.variant-option__select')?.value;

    const inventoryJsonElement = this.querySelector('[data-variant-inventory-json]');
    const statusElement = this.querySelector('[data-variant-inventory-status]');
    if (!inventoryJsonElement || !statusElement) return;

    try {
      const inventoryData = JSON.parse(inventoryJsonElement.textContent);
      let variantData = inventoryData[selectedVariantId];
      
      if (!variantData) {
        const checkedInput = this.querySelector('input[type="radio"]:checked');
        if (checkedInput && checkedInput.dataset.variantId) {
          variantData = inventoryData[checkedInput.dataset.variantId];
        }
      }
      if (!variantData) {
        const activeSelect = this.querySelector('select.variant-option__select');
        if (activeSelect) {
          const selectedOption = activeSelect.options[activeSelect.selectedIndex];
          if (selectedOption && selectedOption.dataset.variantId) {
            variantData = inventoryData[selectedOption.dataset.variantId];
          }
        }
      }

      if (variantData && variantData.inventory_management === 'shopify') {
        const qty = variantData.inventory_quantity;
        const policy = variantData.inventory_policy;
        const textSpan = statusElement.querySelector('.inventory-status-text');

        if (qty > 0 && qty <= 5) {
          textSpan.textContent = `🔥 Only ${qty} left in stock - order soon!`;
          statusElement.style.display = 'flex';
          statusElement.style.color = 'var(--color-lowstock, #d24646)';
        } else if (qty <= 0 && policy === 'continue') {
          textSpan.textContent = 'In stock (backorder available)';
          statusElement.style.display = 'flex';
          statusElement.style.color = '#b87333';
        } else if (qty <= 0) {
          textSpan.textContent = 'Sold out';
          statusElement.style.display = 'flex';
          statusElement.style.color = '#888888';
        } else {
          statusElement.style.display = 'none';
        }
      } else {
        statusElement.style.display = 'none';
      }
    } catch (e) {
      console.error("Error parsing variant inventory data:", e);
    }
  }

  /**
   * @typedef {object} FieldsetMeasurements
   * @property {HTMLFieldSetElement} fieldset
   * @property {number | undefined} currentIndex
   * @property {number | undefined} previousIndex
   * @property {number | undefined} currentWidth
   * @property {number | undefined} previousWidth
   */

  /**
   * Gets measurements for a single fieldset (read phase).
   * @param {number} fieldsetIndex
   * @returns {FieldsetMeasurements | null}
   */
  #getFieldsetMeasurements(fieldsetIndex) {
    const fieldsets = /** @type {HTMLFieldSetElement[]} */ (this.refs.fieldsets || []);
    const fieldset = fieldsets[fieldsetIndex];
    const checkedIndices = this.#checkedIndices[fieldsetIndex];
    const radios = this.#radios[fieldsetIndex];

    if (!radios || !checkedIndices || !fieldset) return null;

    const [currentIndex, previousIndex] = checkedIndices;

    return {
      fieldset,
      currentIndex,
      previousIndex,
      currentWidth: currentIndex !== undefined ? radios[currentIndex]?.parentElement?.offsetWidth : undefined,
      previousWidth: previousIndex !== undefined ? radios[previousIndex]?.parentElement?.offsetWidth : undefined,
    };
  }

  /**
   * Applies measurements to a fieldset (write phase).
   * @param {FieldsetMeasurements} measurements
   */
  #applyFieldsetMeasurements({ fieldset, currentWidth, previousWidth, currentIndex, previousIndex }) {
    if (currentWidth) {
      fieldset.style.setProperty('--pill-width-current', `${currentWidth}px`);
    } else if (currentIndex !== undefined) {
      fieldset.style.removeProperty('--pill-width-current');
    }

    if (previousWidth) {
      fieldset.style.setProperty('--pill-width-previous', `${previousWidth}px`);
    } else if (previousIndex !== undefined) {
      fieldset.style.removeProperty('--pill-width-previous');
    }
  }

  /**
   * Updates the fieldset CSS.
   * @param {number} fieldsetIndex - The fieldset index.
   */
  updateFieldsetCss(fieldsetIndex) {
    if (Number.isNaN(fieldsetIndex)) return;

    const measurements = this.#getFieldsetMeasurements(fieldsetIndex);
    if (measurements) {
      this.#applyFieldsetMeasurements(measurements);
    }
  }

  /**
   * Updates the selected option.
   * @param {string | Element} target - The target element.
   */
  updateSelectedOption(target) {
    if (typeof target === 'string') {
      const targetElement = this.querySelector(`[data-option-value-id="${target}"]`);

      if (!targetElement) throw new Error('Target element not found');

      target = targetElement;
    }

    if (target instanceof HTMLInputElement) {
      const fieldsetIndex = Number.parseInt(target.dataset.fieldsetIndex || '');
      const inputIndex = Number.parseInt(target.dataset.inputIndex || '');

      if (!Number.isNaN(fieldsetIndex) && !Number.isNaN(inputIndex)) {
        const fieldsets = /** @type {HTMLFieldSetElement[]} */ (this.refs.fieldsets || []);
        const fieldset = fieldsets[fieldsetIndex];
        const checkedIndices = this.#checkedIndices[fieldsetIndex];
        const radios = this.#radios[fieldsetIndex];

        if (radios && checkedIndices && fieldset) {
          // Clear previous checked states
          const [currentIndex, previousIndex] = checkedIndices;

          if (currentIndex !== undefined && radios[currentIndex]) {
            radios[currentIndex].dataset.previousChecked = 'false';
          }
          if (previousIndex !== undefined && radios[previousIndex]) {
            radios[previousIndex].dataset.previousChecked = 'false';
          }

          // Update checked indices array - keep only the last 2 selections
          checkedIndices.unshift(inputIndex);
          checkedIndices.length = Math.min(checkedIndices.length, 2);

          // Update the new states
          const newCurrentIndex = checkedIndices[0]; // This is always inputIndex
          const newPreviousIndex = checkedIndices[1]; // This might be undefined

          // newCurrentIndex is guaranteed to exist since we just added it
          if (newCurrentIndex !== undefined && radios[newCurrentIndex]) {
            radios[newCurrentIndex].dataset.currentChecked = 'true';
          }

          if (newPreviousIndex !== undefined && radios[newPreviousIndex]) {
            radios[newPreviousIndex].dataset.previousChecked = 'true';
            radios[newPreviousIndex].dataset.currentChecked = 'false';
          }

          this.updateFieldsetCss(fieldsetIndex);
        }
      }
      target.checked = true;
    }

    if (target instanceof HTMLSelectElement) {
      const newValue = target.value;
      const newSelectedOption = Array.from(target.options).find((option) => option.value === newValue);

      if (!newSelectedOption) throw new Error('Option not found');

      for (const option of target.options) {
        option.removeAttribute('selected');
      }

      newSelectedOption.setAttribute('selected', 'selected');
    }
  }

  /**
   * Builds the request URL.
   * @param {HTMLElement} selectedOption - The selected option.
   * @param {string | null} [source] - The source.
   * @param {string[]} [sourceSelectedOptionsValues] - The source selected options values.
   * @returns {string} The request URL.
   */
  buildRequestUrl(selectedOption, source = null, sourceSelectedOptionsValues = []) {
    // this productUrl and pendingRequestUrl will be useful for the support of combined listing. It is used when a user changes variant quickly and those products are using separate URLs (combined listing).
    // We create a new URL and abort the previous fetch request if it's still pending.
    let productUrl = selectedOption.dataset.connectedProductUrl || this.#pendingRequestUrl || this.dataset.productUrl;
    this.#pendingRequestUrl = productUrl;
    const params = [];
    const viewParamValue = getViewParameterValue();

    // preserve view parameter, if it exists, for alternative product view testing
    if (viewParamValue) params.push(`view=${viewParamValue}`);

    if (this.selectedOptionsValues.length && !source) {
      params.push(`option_values=${this.selectedOptionsValues.join(',')}`);
    } else if (source === 'product-card') {
      if (this.selectedOptionsValues.length) {
        params.push(`option_values=${sourceSelectedOptionsValues.join(',')}`);
      } else {
        params.push(`option_values=${selectedOption.dataset.optionValueId}`);
      }
    }

    // If variant-picker is a child of some specific sections, we need to append section_id=xxxx to the URL
    const SECTION_ID_MAP = {
      'quick-add-component': 'section-rendering-product-card',
      'swatches-variant-picker-component': 'section-rendering-product-card',
      'featured-product-information': this.closest('featured-product-information')?.id,
    };

    const closestSectionId = /** @type {keyof typeof SECTION_ID_MAP} | undefined */ (
      Object.keys(SECTION_ID_MAP).find((sectionId) => this.closest(sectionId))
    );

    if (closestSectionId) {
      if (productUrl?.includes('?')) {
        productUrl = productUrl.split('?')[0];
      }
      return `${productUrl}?section_id=${SECTION_ID_MAP[closestSectionId]}&${params.join('&')}`;
    }

    return `${productUrl}?${params.join('&')}`;
  }

  /**
   * Fetches the updated section.
   * @param {string} requestUrl - The request URL.
   * @param {string} [morphElementSelector] - The selector of the element to be morphed. By default, only the variant picker is morphed.
   */
  fetchUpdatedSection(requestUrl, morphElementSelector) {
    // We use this to abort the previous fetch request if it's still pending.
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    fetch(requestUrl, { signal: this.#abortController.signal })
      .then((response) => response.text())
      .then((responseText) => {
        this.#pendingRequestUrl = undefined;
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        // Defer is only useful for the initial rendering of the page. Remove it here.
        html.querySelector('overflow-list[defer]')?.removeAttribute('defer');

        const textContent = html.querySelector(`variant-picker script[type="application/json"]`)?.textContent;
        if (!textContent) return;

        let newProduct;

        if (morphElementSelector === 'main') {
          this.updateMain(html);
        } else if (morphElementSelector) {
          this.updateElement(html, morphElementSelector);
        } else {
          const { overflowList } = this.refs;
          const wasSwatchesExpanded =
            overflowList instanceof OverflowList && overflowList.getAttribute('disabled') === 'true';

          newProduct = this.updateVariantPicker(html);

          if (wasSwatchesExpanded) {
            const overflowListAfterMorph = overflowList;
            if (overflowListAfterMorph instanceof OverflowList) {
              overflowListAfterMorph.showAll();
            }
          }
        }

        // Dispatch for all paths so product-form-component can reset #variantChangeInProgress
        if (this.selectedOptionId) {
          this.dispatchEvent(
            new VariantUpdateEvent(JSON.parse(textContent), this.selectedOptionId, {
              html,
              productId: this.dataset.productId ?? '',
              newProduct,
            })
          );
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.warn('Fetch aborted by user');
        } else {
          console.error(error);
        }
      });
  }

  /**
   * @typedef {Object} NewProduct
   * @property {string} id
   * @property {string} url
   */

  /**
   * Re-renders the variant picker.
   * @param {Document | Element} newHtml - The new HTML.
   * @returns {NewProduct | undefined} Information about the new product if it has changed, otherwise undefined.
   */
  updateVariantPicker(newHtml) {
    /** @type {NewProduct | undefined} */
    let newProduct;

    const newVariantPickerSource = newHtml.querySelector(this.tagName.toLowerCase());

    if (!newVariantPickerSource) {
      throw new Error('No new variant picker source found');
    }

    // For combined listings, the product might have changed, so update the related data attribute.
    if (newVariantPickerSource instanceof HTMLElement) {
      const newProductId = newVariantPickerSource.dataset.productId;
      const newProductUrl = newVariantPickerSource.dataset.productUrl;

      if (newProductId && newProductUrl && this.dataset.productId !== newProductId) {
        newProduct = { id: newProductId, url: newProductUrl };
      }

      this.dataset.productId = newProductId;
      this.dataset.productUrl = newProductUrl;
    }

    morph(this, newVariantPickerSource, {
      ...MORPH_OPTIONS,
      getNodeKey: (node) => {
        if (!(node instanceof HTMLElement)) return undefined;
        const key = node.dataset.key;
        return key;
      },
    });
    this.initRadiosAndCheckedIndices();
    this.initSizeChart();
    this.updateVariantPickerCss();

    return newProduct;
  }

  updateVariantPickerCss() {
    const fieldsets = /** @type {HTMLFieldSetElement[]} */ (this.refs.fieldsets || []);

    // Batch all reads first across all fieldsets to avoid layout thrashing
    const measurements = fieldsets.map((_, index) => this.#getFieldsetMeasurements(index)).filter((m) => m !== null);

    // Batch all writes after all reads
    for (const measurement of measurements) {
      this.#applyFieldsetMeasurements(measurement);
    }
  }

  /**
   * Re-renders the desired element.
   * @param {Document} newHtml - The new HTML.
   * @param {string} elementSelector - The selector of the element to re-render.
   */
  updateElement(newHtml, elementSelector) {
    const element = this.closest(elementSelector);
    const newElement = newHtml.querySelector(elementSelector);

    if (!element || !newElement) {
      throw new Error(`No new element source found for ${elementSelector}`);
    }

    morph(element, newElement);
  }

  /**
   * Re-renders the entire main content.
   * @param {Document} newHtml - The new HTML.
   */
  updateMain(newHtml) {
    const main = document.querySelector('main');
    const newMain = newHtml.querySelector('main');

    if (!main || !newMain) {
      throw new Error('No new main source found');
    }

    morph(main, newMain);
  }

  /**
   * Gets the selected option.
   * @returns {HTMLInputElement | HTMLOptionElement | undefined} The selected option.
   */
  get selectedOption() {
    const selectedOption = this.querySelector('select option[selected], fieldset input:checked');

    if (!(selectedOption instanceof HTMLInputElement || selectedOption instanceof HTMLOptionElement)) {
      return undefined;
    }

    return selectedOption;
  }

  /**
   * Gets the selected option ID.
   * @returns {string | undefined} The selected option ID.
   */
  get selectedOptionId() {
    const { selectedOption } = this;
    if (!selectedOption) return undefined;
    const { optionValueId } = selectedOption.dataset;

    if (!optionValueId) {
      throw new Error('No option value ID found');
    }

    return optionValueId;
  }

  /**
   * Gets the selected options values.
   * @returns {string[]} The selected options values.
   */
  get selectedOptionsValues() {
    /** @type HTMLElement[] */
    const selectedOptions = Array.from(this.querySelectorAll('select option[selected], fieldset input:checked'));

    return selectedOptions.map((option) => {
      const { optionValueId } = option.dataset;

      if (!optionValueId) throw new Error('No option value ID found');

      return optionValueId;
    });
  }
}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}
