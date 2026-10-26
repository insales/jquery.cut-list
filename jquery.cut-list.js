(function () {
  // src/defaults.js
  var defaults = {
    moreBtnTitle: 'Еще',
    showMoreOnHover: false,
    alwaysVisibleElem: void 0,
    onBeforeCalc: function () {},
    onBeforeOpen: function () {},
    onOpen: function () {},
    onBeforeClose: function () {},
    onClose: function () {},
    resizeDelay: 50,
    minWidth: null,
  };
  // src/dropdown-position.js
  function getDropdownPosition({
    dropdownHeight,
    dropdownLeft,
    triggerTop,
    triggerBottom,
    scrollTop,
    viewportHeight,
    documentHeight,
  }) {
    const fitsAbove = triggerTop - scrollTop >= dropdownHeight;
    const fitsInViewportBelow = viewportHeight - (triggerBottom - scrollTop) >= dropdownHeight;
    const fitsInDocumentBelow = documentHeight - triggerBottom >= dropdownHeight;
    return {
      above: fitsAbove && (!fitsInViewportBelow || !fitsInDocumentBelow),
      alignLeft: dropdownLeft < 0,
    };
  }
  // src/dropdown.js
  function createElement($, title, tagName) {
    const element = $(`<${tagName} class="cut-list__elem cut-list__dropdown"></${tagName}>`).hide();
    const drop = $('<div class="cut-list__drop"></div>').appendTo(element);
    $('<div class="cut-list__drop-toggle" role="button" tabindex="0" aria-expanded="false"></div>')
      .html(title)
      .appendTo(drop);
    $('<div class="cut-list__more"><div class="cut-list__more-content"></div></div>').appendTo(
      drop,
    );
    return element;
  }
  var Dropdown = class {
    constructor($, list, options, namespace) {
      this.$ = $;
      this.list = list;
      this.options = options;
      this.namespace = namespace;
      this.phase = 'closed';
      this.operation = 0;
      this.destroying = false;
      this.destroyed = false;
      this.document = list[0].ownerDocument;
      this.window = this.document.defaultView;
      const tagName = /^(UL|OL)$/.test(list[0].tagName) ? 'li' : 'div';
      this.element = createElement($, options.moreBtnTitle, tagName);
      this.drop = this.element.find('.cut-list__drop');
      this.toggle = this.element.find('.cut-list__drop-toggle');
      this.panel = this.element.find('.cut-list__more');
      this.content = this.element.find('.cut-list__more-content');
    }
    get isOpen() {
      return this.element.hasClass('is-show');
    }
    mount() {
      if (this.element.parent()[0] === this.list[0]) return;
      this.content.empty();
      this.list.append(this.element);
      this.bindEvents();
    }
    setExpanded(expanded) {
      this.element.toggleClass('is-show', expanded);
      this.toggle.attr('aria-expanded', String(expanded));
    }
    open() {
      if (this.destroyed || this.destroying || this.phase === 'opening' || this.isOpen) return;
      const operation = ++this.operation;
      this.phase = 'opening';
      this.setExpanded(true);
      this.panel.removeClass('is-top is-left').css('visibility', 'hidden').show();
      this.options.onBeforeCalc(this.list);
      if (!this.isOpening(operation)) return;
      this.updatePosition();
      this.options.onBeforeOpen(this.list);
      if (!this.isOpening(operation)) return;
      this.panel.css('visibility', 'visible');
      this.phase = 'open';
      this.options.onOpen(this.list);
    }
    isOpening(operation) {
      return !this.destroyed && this.operation === operation && this.phase === 'opening';
    }
    close() {
      if (this.destroyed || this.phase === 'closing' || !this.isOpen) return;
      this.operation++;
      this.phase = 'closing';
      this.options.onBeforeClose(this.list);
      if (this.phase === 'closing') this.finishClose();
    }
    finishClose() {
      this.setExpanded(false);
      this.panel.hide().removeClass('is-top is-left');
      this.phase = 'closed';
      this.options.onClose(this.list);
    }
    toggleOpen() {
      if (this.isOpen) this.close();
      else this.open();
    }
    updatePosition() {
      const trigger = this.toggle[0].getBoundingClientRect();
      const panel = this.panel[0].getBoundingClientRect();
      const position = getDropdownPosition({
        dropdownHeight: panel.height,
        dropdownLeft: panel.left,
        triggerTop: trigger.top,
        triggerBottom: trigger.bottom,
        scrollTop: 0,
        viewportHeight: this.$(this.window).height(),
        documentHeight: this.$(this.document).height() - this.$(this.window).scrollTop(),
      });
      this.panel.toggleClass('is-top', position.above);
      this.panel.toggleClass('is-left', position.alignLeft);
    }
    bindEvents() {
      this.drop.add(this.toggle).off(this.namespace);
      this.toggle
        .on(`click${this.namespace}`, () => this.toggleOpen())
        .on(`keydown${this.namespace}`, (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.toggleOpen();
          }
        });
      if (this.options.showMoreOnHover)
        this.drop
          .on(`mouseenter${this.namespace}`, () => {
            if (this.canHover()) this.open();
          })
          .on(`mouseleave${this.namespace}`, () => {
            if (this.canHover()) this.close();
          });
    }
    canHover() {
      return !this.window.matchMedia || this.window.matchMedia('(hover: hover)').matches;
    }
    closeAndFocus() {
      if (this.isOpen) {
        this.close();
        this.toggle.trigger('focus');
      }
    }
    contains(target) {
      return this.element[0].contains(target);
    }
    destroy() {
      if (this.destroyed || this.destroying) return;
      this.destroying = true;
      if (this.phase === 'closing') this.finishClose();
      else this.close();
      this.operation++;
      this.destroyed = true;
      this.phase = 'destroyed';
      this.element.find('*').addBack().off(this.namespace);
      this.element.remove();
    }
  };
  // src/layout.js
  function getHiddenIndices(
    widths,
    availableWidth,
    dropdownWidth,
    alwaysVisibleIndex = -1,
    gap = 0,
  ) {
    if (
      widths.reduce((total, width) => total + width, 0) + Math.max(0, widths.length - 1) * gap <=
      availableWidth
    )
      return [];
    const keepPriority =
      alwaysVisibleIndex >= 0 && widths[alwaysVisibleIndex] + dropdownWidth + gap <= availableWidth;
    let usedWidth = dropdownWidth + (keepPriority ? widths[alwaysVisibleIndex] + gap : 0);
    let overflow = false;
    const hiddenIndices = [];
    for (const [index, width] of widths.entries()) {
      if (keepPriority && index === alwaysVisibleIndex) continue;
      usedWidth += width + gap;
      overflow = overflow || usedWidth > availableWidth;
      if (overflow) hiddenIndices.push(index);
    }
    return hiddenIndices;
  }
  // src/measurements.js
  function getColumnGap($, element) {
    const value = element.css('column-gap');
    if (!value || value === 'normal') return 0;
    if (value.endsWith('px')) return parseFloat(value) || 0;
    if (value.endsWith('%')) return ((parseFloat(value) || 0) * element.width()) / 100;
    const probe = $('<div></div>')
      .css({
        width: value,
        flex: '0 0 auto',
        height: 0,
        minWidth: 0,
        maxWidth: 'none',
        padding: 0,
        margin: 0,
        border: 0,
        visibility: 'hidden',
      })
      .appendTo(element);
    const width = probe.width();
    probe.remove();
    return width;
  }
  // src/list.js
  var LIST_CLASSES = ['cut-list', 'cut-list-ready', 'with-more-items'];
  var itemOwners = /* @__PURE__ */ new WeakMap();
  var CutList = class {
    constructor($, element, options, namespace) {
      this.$ = $;
      this.element = $(element);
      this.options = options;
      this.destroying = false;
      this.destroyed = false;
      this.slots = /* @__PURE__ */ new Map();
      this.attributes = /* @__PURE__ */ new Map();
      this.originalClasses = LIST_CLASSES.filter((name) => this.element.hasClass(name));
      this.dropdown = new Dropdown($, this.element, options, namespace);
      this.element.addClass('cut-list cut-list-ready');
      this.dropdown.mount();
      this.redraw();
    }
    redraw() {
      if (this.destroyed || this.destroying) return;
      const focused = this.element[0].ownerDocument.activeElement;
      const hadFocus = this.element[0].contains(focused);
      this.dropdown.close();
      if (this.destroyed || this.destroying) return;
      this.restoreItems();
      this.dropdown.mount();
      const items = this.prepareItems();
      if (!this.isHorizontal()) {
        this.setOverflow(false);
        this.restoreFocus(focused, hadFocus);
        return;
      }
      this.dropdown.element.show();
      const visibleItems = items.filter((item) => this.$(item).css('display') !== 'none');
      const hiddenIndices = getHiddenIndices(
        visibleItems.map((item) => this.$(item).outerWidth(true)),
        this.element.width(),
        this.dropdown.element.outerWidth(true),
        this.getPriorityIndex(visibleItems),
        getColumnGap(this.$, this.element),
      );
      hiddenIndices.forEach((index) => this.moveToDropdown(visibleItems[index]));
      this.setOverflow(hiddenIndices.length > 0);
      this.restoreFocus(focused, hadFocus);
    }
    isHorizontal() {
      const display = this.element.css('display');
      const direction = this.element.css('flex-direction');
      return (
        ['flex', 'inline-flex'].includes(display) &&
        !direction.startsWith('column') &&
        this.element.width() > 0
      );
    }
    prepareItems() {
      const items = this.element.children().not(this.dropdown.element).toArray();
      const currentItems = new Set(items);
      this.attributes.forEach((attributes, item) => {
        if (!currentItems.has(item)) this.releaseItem(item);
      });
      items.forEach((item, index) => {
        if (!this.attributes.has(item)) {
          var _itemOwners$get;
          (_itemOwners$get = itemOwners.get(item)) === null ||
            _itemOwners$get === void 0 ||
            _itemOwners$get.releaseItem(item);
          this.attributes.set(item, {
            index: item.getAttribute('data-index'),
            hadItemClass: this.$(item).hasClass('cut-list__elem'),
          });
          itemOwners.set(item, this);
        }
        this.$(item).addClass('cut-list__elem').attr('data-index', index);
      });
      return items;
    }
    getPriorityIndex(items) {
      if (!this.options.alwaysVisibleElem) return -1;
      const matches = this.element
        .find(this.options.alwaysVisibleElem)
        .not(this.dropdown.element.find('*'));
      if (matches.length > 1)
        console.warn(
          'Внимание! Вами назначено несколько alwaysVisibleElem, будет использоваться только первый.',
        );
      return items.findIndex((item) => item === matches[0] || this.$.contains(item, matches[0]));
    }
    moveToDropdown(item) {
      const slot = item.ownerDocument.createComment('cut-list item');
      item.before(slot);
      this.slots.set(item, slot);
      this.$(item).appendTo(this.dropdown.content);
    }
    restoreItems() {
      this.slots.forEach((slot, item) => {
        if (item.parentNode === this.dropdown.content[0] && slot.parentNode === this.element[0])
          slot.replaceWith(item);
        else slot.remove();
      });
      this.slots.clear();
    }
    setOverflow(overflowing) {
      this.element.toggleClass('with-more-items', overflowing);
      this.dropdown.element.toggle(overflowing);
    }
    restoreAttributes() {
      this.attributes.forEach((attributes, item) => this.releaseItem(item));
    }
    releaseItem(item) {
      var _this$slots$get;
      const attributes = this.attributes.get(item);
      if (!attributes) return;
      if (itemOwners.get(item) === this) {
        this.$(item).toggleClass('cut-list__elem', attributes.hadItemClass);
        if (attributes.index === null) item.removeAttribute('data-index');
        else item.setAttribute('data-index', attributes.index);
        itemOwners.delete(item);
      }
      (_this$slots$get = this.slots.get(item)) === null ||
        _this$slots$get === void 0 ||
        _this$slots$get.remove();
      this.slots.delete(item);
      this.attributes.delete(item);
    }
    restoreFocus(focused, hadFocus) {
      if (!hadFocus || !focused.isConnected || !this.element[0].contains(focused)) return;
      const target = this.dropdown.content[0].contains(focused) ? this.dropdown.toggle[0] : focused;
      if (target.ownerDocument.activeElement !== target) target.focus({ preventScroll: true });
    }
    destroy() {
      if (this.destroyed || this.destroying) return;
      this.destroying = true;
      const focused = this.element[0].ownerDocument.activeElement;
      const hadFocus = this.element[0].contains(focused);
      this.dropdown.close();
      this.restoreItems();
      this.restoreAttributes();
      this.dropdown.destroy();
      this.element.removeClass(LIST_CLASSES.join(' ')).addClass(this.originalClasses.join(' '));
      this.restoreFocus(focused, hadFocus);
      this.destroyed = true;
    }
  };
  // src/resize-controller.js
  var ResizeController = class {
    constructor({ $, window, document, elements, namespace, delay, onResize }) {
      this.$ = $;
      this.window = window;
      this.document = document;
      this.elements = elements;
      this.namespace = namespace;
      this.delay = delay;
      this.onResize = onResize;
      this.observers = [];
      this.timers = /* @__PURE__ */ new Map();
      this.listening = false;
      this.handleContentResize = () => this.schedule('content', this.delay);
      this.handleWindowResize = (event) => {
        if (event.target === this.window) this.schedule('window', 300);
      };
    }
    start() {
      var _this$document$fonts;
      if (this.listening) return;
      this.listening = true;
      this.$(this.window).on(
        `resize${this.namespace} orientationchange${this.namespace}`,
        this.handleWindowResize,
      );
      this.bindElements();
      (_this$document$fonts = this.document.fonts) === null ||
        _this$document$fonts === void 0 ||
        _this$document$fonts.addEventListener('loadingdone', this.handleContentResize);
    }
    bindElements() {
      this.elements.on(`resize${this.namespace}`, this.handleContentResize);
      this.elements.each((index, element) => {
        element.addEventListener('load', this.handleContentResize, true);
      });
    }
    unbindElements() {
      this.elements.off(`resize${this.namespace}`);
      this.elements.each((index, element) => {
        element.removeEventListener('load', this.handleContentResize, true);
      });
    }
    observe() {
      this.unobserve();
      if (!this.window.ResizeObserver) return;
      this.elements.each((index, element) => {
        let previousWidth = this.$(element).width();
        const observer = new this.window.ResizeObserver(() => {
          const width = this.$(element).width();
          if (width !== previousWidth) {
            previousWidth = width;
            this.handleContentResize();
          }
        });
        observer.observe(element);
        this.observers.push(observer);
      });
    }
    unobserve() {
      this.observers.forEach((observer) => observer.disconnect());
      this.observers = [];
      this.cancel('content');
    }
    setElements(elements) {
      const observing = this.observers.length > 0;
      this.unbindElements();
      this.unobserve();
      this.elements = elements;
      if (this.listening) this.bindElements();
      if (observing) this.observe();
    }
    schedule(key, delay) {
      if (!this.listening) return;
      this.cancel(key);
      this.timers.set(
        key,
        setTimeout(() => {
          this.timers.delete(key);
          this.onResize();
        }, delay),
      );
    }
    cancel(key) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    stop() {
      var _this$document$fonts2;
      this.listening = false;
      this.$(this.window).off(this.namespace);
      this.unbindElements();
      (_this$document$fonts2 = this.document.fonts) === null ||
        _this$document$fonts2 === void 0 ||
        _this$document$fonts2.removeEventListener('loadingdone', this.handleContentResize);
      this.unobserve();
      this.cancel('window');
    }
  };
  // src/insales-cut-list.js
  var DATA_KEY = 'InsalesCutList';
  var nextInstanceId = 0;
  function createInsalesCutList($, window, document) {
    return class InsalesCutList {
      constructor(elements, options) {
        this.elements = $([...new Set($(elements).toArray())]);
        this.suspendedElements = /* @__PURE__ */ new Set();
        this.options = $.extend({}, defaults, options);
        this.namespace = `.cutList${++nextInstanceId}`;
        this.lists = [];
        this.initialized = false;
        this.destroyed = false;
        this.resize = new ResizeController({
          $,
          window,
          document,
          elements: this.elements,
          namespace: this.namespace,
          delay: this.options.resizeDelay,
          onResize: () => this.checkScreenWidth(),
        });
        this.handleDocumentClick = (event) => this.closeOutsideDropdowns(event.target);
        this.handleDocumentKeydown = (event) => {
          if (event.key === 'Escape') this.lists.forEach((list) => list.dropdown.closeAndFocus());
        };
        this.claimElements();
        this.checkScreenWidth();
      }
      claimElements() {
        new Set(this.elements.toArray().map((element) => $.data(element, DATA_KEY))).forEach(
          (owner) =>
            owner === null || owner === void 0 ? void 0 : owner.releaseElements(this.elements),
        );
        this.elements.each((index, element) => $.data(element, DATA_KEY, this));
      }
      checkScreenWidth() {
        if (this.destroyed || this.activeElements.length === 0) return;
        if (this.options.minWidth > 0 && $(window).width() <= this.options.minWidth) {
          this.teardownLists();
          this.resize.start();
        } else if (this.initialized) this.redrawList();
        else this.initializeActiveLists();
      }
      get activeElements() {
        return this.elements.filter((index, element) => !this.suspendedElements.has(element));
      }
      initializeActiveLists() {
        const existing = new Set(this.lists.map((list) => list.element[0]));
        this.activeElements.each((index, element) => {
          if (!existing.has(element))
            this.lists.push(new CutList($, element, this.options, this.namespace));
        });
        this.initialized = this.lists.length > 0;
        if (!this.initialized) return;
        $(document)
          .off(this.namespace)
          .on(`click${this.namespace}`, this.handleDocumentClick)
          .on(`keydown${this.namespace}`, this.handleDocumentKeydown);
        this.resize.start();
        this.resize.observe();
      }
      init() {
        this.teardownLists();
        this.destroyed = false;
        this.suspendedElements.clear();
        this.resize.setElements(this.elements);
        this.initializeActiveLists();
      }
      setup() {
        this.destroyed = false;
        this.suspendedElements.clear();
        this.resize.setElements(this.elements);
        if (
          this.initialized &&
          !(this.options.minWidth > 0 && $(window).width() <= this.options.minWidth)
        )
          this.initializeActiveLists();
        this.checkScreenWidth();
      }
      setupElements(elements) {
        this.elements
          .filter(elements)
          .each((index, element) => this.suspendedElements.delete(element));
        if (this.activeElements.length === 0) return;
        this.destroyed = false;
        this.resize.setElements(this.activeElements);
        if (this.options.minWidth > 0 && $(window).width() <= this.options.minWidth) {
          this.teardownLists();
          this.resize.start();
        } else {
          const selectedLists = this.lists.filter((list) => $(elements).is(list.element));
          this.initializeActiveLists();
          selectedLists.forEach((list) => list.redraw());
        }
      }
      destroyElements(elements) {
        const removed = this.elements.filter(elements);
        removed.each((index, element) => this.suspendedElements.add(element));
        this.removeLists(removed);
        this.resize.setElements(this.activeElements);
        if (this.activeElements.length === 0) this.destroy();
      }
      removeLists(elements) {
        this.lists = this.lists.filter((list) => {
          if (!elements.is(list.element)) return true;
          list.destroy();
          return false;
        });
        this.initialized = this.lists.length > 0;
        if (!this.initialized) $(document).off(this.namespace);
      }
      redrawList() {
        if (this.initialized) this.lists.forEach((list) => list.redraw());
      }
      closeOutsideDropdowns(target) {
        this.lists.forEach((list) => {
          if (!list.dropdown.contains(target)) list.dropdown.close();
        });
      }
      releaseElements(elements) {
        const removed = this.elements.filter(elements);
        this.removeLists(removed);
        removed.each((index, element) => this.suspendedElements.delete(element));
        this.elements = this.elements.not(removed);
        this.resize.setElements(this.activeElements);
        if (this.activeElements.length === 0) this.destroy();
      }
      teardownLists() {
        this.resize.unobserve();
        $(document).off(this.namespace);
        this.lists.forEach((list) => list.destroy());
        this.lists = [];
        this.initialized = false;
      }
      destroy() {
        this.destroyed = true;
        this.elements.each((index, element) => this.suspendedElements.add(element));
        this.resize.stop();
        this.teardownLists();
      }
    };
  }
  // src/index.js
  var $ = window.jQuery;
  var InsalesCutList = createInsalesCutList($, window, document);
  $.fn.cutList = function (options) {
    return this.each(function () {
      if (!$.data(this, 'InsalesCutList')) new InsalesCutList(this, options);
    });
  };
  $.fn.cutList.setup = function (elements, options = {}) {
    return $(elements).each(function () {
      const instance = $.data(this, DATA_KEY);
      if (instance) instance.setupElements(this);
      else new InsalesCutList(this, options);
    });
  };
  $.fn.cutList.destroy = function (elements) {
    return $(elements).each(function () {
      const instance = $.data(this, DATA_KEY);
      if (instance) instance.destroyElements(this);
    });
  };
  window.InsalesCutList = InsalesCutList;
})();
