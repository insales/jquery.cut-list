import { getDropdownPosition } from './dropdown-position.js';

function createElement($, title, tagName) {
  const element = $(`<${tagName} class="cut-list__elem cut-list__dropdown"></${tagName}>`).hide();
  const drop = $('<div class="cut-list__drop"></div>').appendTo(element);

  $('<div class="cut-list__drop-toggle" role="button" tabindex="0" aria-expanded="false"></div>')
    .html(title)
    .appendTo(drop);

  $('<div class="cut-list__more"><div class="cut-list__more-content"></div></div>').appendTo(drop);

  return element;
}

export class Dropdown {
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
    if (this.element.parent()[0] === this.list[0]) {
      return;
    }

    this.content.empty();
    this.list.append(this.element);
    this.bindEvents();
  }

  setExpanded(expanded) {
    this.element.toggleClass('is-show', expanded);
    this.toggle.attr('aria-expanded', String(expanded));
  }

  open() {
    if (this.destroyed || this.destroying || this.phase === 'opening' || this.isOpen) {
      return;
    }

    const operation = ++this.operation;
    this.phase = 'opening';
    this.setExpanded(true);
    this.panel.removeClass('is-top is-left').css('visibility', 'hidden').show();

    this.options.onBeforeCalc(this.list);
    if (!this.isOpening(operation)) {
      return;
    }
    this.updatePosition();

    this.options.onBeforeOpen(this.list);
    if (!this.isOpening(operation)) {
      return;
    }

    this.panel.css('visibility', 'visible');
    this.phase = 'open';
    this.options.onOpen(this.list);
  }

  isOpening(operation) {
    return !this.destroyed && this.operation === operation && this.phase === 'opening';
  }

  close() {
    if (this.destroyed || this.phase === 'closing' || !this.isOpen) {
      return;
    }

    this.operation++;
    this.phase = 'closing';
    this.options.onBeforeClose(this.list);

    if (this.phase === 'closing') {
      this.finishClose();
    }
  }

  finishClose() {
    this.setExpanded(false);
    this.panel.hide().removeClass('is-top is-left');
    this.phase = 'closed';
    this.options.onClose(this.list);
  }

  toggleOpen() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
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

    if (this.options.showMoreOnHover) {
      this.drop
        .on(`mouseenter${this.namespace}`, () => {
          if (this.canHover()) {
            this.open();
          }
        })
        .on(`mouseleave${this.namespace}`, () => {
          if (this.canHover()) {
            this.close();
          }
        });
    }
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
    if (this.destroyed || this.destroying) {
      return;
    }

    this.destroying = true;
    if (this.phase === 'closing') {
      this.finishClose();
    } else {
      this.close();
    }

    this.operation++;
    this.destroyed = true;
    this.phase = 'destroyed';
    this.element.find('*').addBack().off(this.namespace);
    this.element.remove();
  }
}
