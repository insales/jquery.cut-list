import { Dropdown } from './dropdown.js';
import { getHiddenIndices } from './layout.js';
import { getColumnGap } from './measurements.js';

const LIST_CLASSES = ['cut-list', 'cut-list-ready', 'with-more-items'];
const itemOwners = new WeakMap();

export class CutList {
  constructor($, element, options, namespace) {
    this.$ = $;
    this.element = $(element);
    this.options = options;
    this.destroying = false;
    this.destroyed = false;
    this.slots = new Map();
    this.attributes = new Map();
    this.originalClasses = LIST_CLASSES.filter((name) => this.element.hasClass(name));
    this.dropdown = new Dropdown($, this.element, options, namespace);

    this.element.addClass('cut-list cut-list-ready');
    this.dropdown.mount();
    this.redraw();
  }

  redraw() {
    if (this.destroyed || this.destroying) {
      return;
    }

    const focused = this.element[0].ownerDocument.activeElement;
    const hadFocus = this.element[0].contains(focused);

    this.dropdown.close();
    if (this.destroyed || this.destroying) {
      return;
    }
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
      if (!currentItems.has(item)) {
        this.releaseItem(item);
      }
    });

    items.forEach((item, index) => {
      if (!this.attributes.has(item)) {
        itemOwners.get(item)?.releaseItem(item);
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
    if (!this.options.alwaysVisibleElem) {
      return -1;
    }

    const matches = this.element
      .find(this.options.alwaysVisibleElem)
      .not(this.dropdown.element.find('*'));

    if (matches.length > 1) {
      console.warn(
        'Внимание! Вами назначено несколько alwaysVisibleElem, будет использоваться только первый.',
      );
    }

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
      const canRestore =
        item.parentNode === this.dropdown.content[0] && slot.parentNode === this.element[0];

      if (canRestore) {
        slot.replaceWith(item);
      } else {
        slot.remove();
      }
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
    const attributes = this.attributes.get(item);
    if (!attributes) {
      return;
    }

    if (itemOwners.get(item) === this) {
      this.$(item).toggleClass('cut-list__elem', attributes.hadItemClass);

      if (attributes.index === null) {
        item.removeAttribute('data-index');
      } else {
        item.setAttribute('data-index', attributes.index);
      }
      itemOwners.delete(item);
    }

    this.slots.get(item)?.remove();
    this.slots.delete(item);
    this.attributes.delete(item);
  }

  restoreFocus(focused, hadFocus) {
    if (!hadFocus || !focused.isConnected || !this.element[0].contains(focused)) {
      return;
    }

    const target = this.dropdown.content[0].contains(focused) ? this.dropdown.toggle[0] : focused;
    if (target.ownerDocument.activeElement !== target) {
      target.focus({ preventScroll: true });
    }
  }

  destroy() {
    if (this.destroyed || this.destroying) {
      return;
    }

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
}
