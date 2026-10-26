import $ from 'jquery';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInsalesCutList } from '../src/insales-cut-list.js';

window.jQuery = $;
await import('../src/index.js');

const InsalesCutList = createInsalesCutList($, window, document);
let instances;
let observers;
let viewportWidth;

function fixture(width = 100, itemWidths = [40, 40, 40], activeIndex = -1) {
  const root = $('<div></div>')
    .css({ width, display: 'flex', flexDirection: 'row' })
    .appendTo(document.body);
  itemWidths.forEach((itemWidth, index) => {
    $('<div></div>')
      .attr('id', `item-${index}`)
      .text(`Item ${index}`)
      .css({ width: itemWidth, margin: 0 })
      .toggleClass('active', index === activeIndex)
      .appendTo(root);
  });
  return root;
}

function create(root, options = {}) {
  const instance = new InsalesCutList(root, options);
  instances.push(instance);
  return instance;
}

function ids(elements) {
  return elements.toArray().map((element) => element.id);
}

function hidden(root) {
  return ids(root.find('.cut-list__more-content').children());
}

function click(root) {
  root.find('.cut-list__drop-toggle').trigger('click');
}

beforeEach(() => {
  instances = [];
  observers = [];
  viewportWidth = 1024;
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback) {
        this.notify = callback;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observers.push(this);
      }
    },
  );
  const width = $.fn.width;
  const outerWidth = $.fn.outerWidth;
  vi.spyOn($.fn, 'width').mockImplementation(function (...args) {
    return this[0] === window && !args.length ? viewportWidth : width.apply(this, args);
  });
  vi.spyOn($.fn, 'outerWidth').mockImplementation(function (...args) {
    return this.hasClass('cut-list__dropdown') ? 20 : outerWidth.apply(this, args);
  });
});

afterEach(() => {
  instances.forEach((instance) => instance.destroy());
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('layout and lifecycle', () => {
  it('moves only overflowing items and keeps the original nodes and handlers', () => {
    const root = fixture();
    const item = root.children().last();
    const handler = vi.fn();
    item.on('click', handler);
    create(root);
    expect(hidden(root)).toEqual(['item-2']);
    expect(root.find('.cut-list__more-content').children()[0]).toBe(item[0]);
    item.trigger('click');
    expect(handler).toHaveBeenCalledOnce();
    expect(root.hasClass('with-more-items')).toBe(true);
  });

  it('does not reserve space for a dropdown when all items fit exactly', () => {
    const root = fixture(120);
    create(root);
    expect(hidden(root)).toEqual([]);
    expect(root.find('.cut-list__dropdown').css('display')).toBe('none');
    expect(root.hasClass('with-more-items')).toBe(false);
  });

  it('includes fractional margins when measuring items', () => {
    const root = fixture(102, [30, 30, 30]);
    root.children().css({ marginLeft: '2.5px', marginRight: '2.5px' });
    create(root);
    expect(hidden(root)).toEqual(['item-2']);
  });

  it.each([0, 1, 2])('keeps the active item at index %s visible across redraws', (activeIndex) => {
    const root = fixture(100, [40, 40, 40], activeIndex);
    const instance = create(root, { alwaysVisibleElem: '.active' });
    expect(root.children('.active')).toHaveLength(1);
    instance.redrawList();
    expect(root.children('.active')).toHaveLength(1);
    instance.destroy();
    expect(ids(root.children())).toEqual(['item-0', 'item-1', 'item-2']);
  });

  it('resolves a priority selector inside a list item', () => {
    const root = fixture();
    root.children().last().append('<a class="current">Current</a>');
    create(root, { alwaysVisibleElem: '.current' });
    expect(root.children('#item-2')).toHaveLength(1);
    expect(hidden(root)).toEqual(['item-1']);
  });

  it('warns about several matches and keeps only the first as priority', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = fixture(60);
    root.children().slice(1).addClass('active');
    create(root, { alwaysVisibleElem: '.active' });
    expect(root.children('#item-1')).toHaveLength(1);
    expect(hidden(root)).toEqual(['item-0', 'item-2']);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('restores ordering on shrink, expansion and repeated initialization', () => {
    const root = fixture(100, [40, 40, 40, 40], 2);
    const instance = create(root, { alwaysVisibleElem: '.active' });
    root.width(200);
    instance.redrawList();
    expect(ids(root.children('.cut-list__elem').not('.cut-list__dropdown'))).toEqual([
      'item-0',
      'item-1',
      'item-2',
      'item-3',
    ]);
    expect(hidden(root)).toEqual([]);
    root.width(60);
    instance.redrawList();
    expect(hidden(root)).toEqual(['item-0', 'item-1', 'item-3']);
    instance.init();
    expect(root.children('.cut-list__dropdown')).toHaveLength(1);
    instance.destroy();
    expect(ids(root.children())).toEqual(['item-0', 'item-1', 'item-2', 'item-3']);
  });

  it('does not treat nested descendants with plugin classes as top-level items', () => {
    const root = fixture();
    root.children().first().append('<span class="cut-list__elem">Nested</span>');
    create(root);
    expect(hidden(root)).toEqual(['item-2']);
  });

  it('restores preexisting classes and data-index on destroy', () => {
    const root = fixture().addClass('custom cut-list');
    root.children().first().attr('data-index', 'original').addClass('cut-list__elem');
    const instance = create(root);
    instance.destroy();
    instance.destroy();
    expect(root.attr('class')).toBe('custom cut-list');
    expect(root.children().first().attr('data-index')).toBe('original');
    expect(root.children().first().hasClass('cut-list__elem')).toBe(true);
    expect(root.children().last().attr('data-index')).toBeUndefined();
    expect(root.children().last().hasClass('cut-list__elem')).toBe(false);
    expect(root.find('.cut-list__dropdown')).toHaveLength(0);
  });

  it('includes added items and does not resurrect removed items on redraw', () => {
    const root = fixture();
    const instance = create(root);
    root.append('<div id="new-item" style="width:40px">New</div>');
    instance.redrawList();
    expect(hidden(root)).toEqual(['item-2', 'new-item']);
    root.find('#item-2').remove();
    root.width(200);
    instance.redrawList();
    instance.destroy();
    expect(ids(root.children())).toEqual(['item-0', 'item-1', 'new-item']);
  });

  it('does not count CSS-hidden items or move them to the dropdown', () => {
    const root = fixture(100, [40, 500, 40]);
    root.children('#item-1').hide();
    create(root);
    expect(hidden(root)).toEqual([]);
    expect(root.children('#item-1')).toHaveLength(1);
  });

  it('restores inserted items at their actual positions', () => {
    const root = fixture();
    const instance = create(root);
    root.children('#item-1').before('<div id="new-item" style="width:40px"></div>');
    instance.redrawList();
    instance.destroy();
    expect(ids(root.children())).toEqual(['item-0', 'new-item', 'item-1', 'item-2']);
  });

  it('restores all items when responsive CSS changes the list to a column', () => {
    const root = fixture();
    const instance = create(root);
    root.css('flex-direction', 'column');
    instance.redrawList();
    expect(hidden(root)).toEqual([]);
    expect(root.children('.cut-list__elem').not('.cut-list__dropdown')).toHaveLength(3);
    root.css('flex-direction', 'row');
    instance.redrawList();
    expect(hidden(root)).toEqual(['item-2']);
  });

  it('recovers after an editor replaces the entire content of the same root', () => {
    const root = fixture();
    const instance = create(root);
    root.html('<div id="replacement" style="width:200px">Replacement</div>');
    instance.redrawList();
    expect(hidden(root)).toEqual(['replacement']);
    click(root);
    expect(root.find('.is-show')).toHaveLength(1);
    instance.destroy();
    expect(ids(root.children())).toEqual(['replacement']);
  });

  it('supports empty lists', () => {
    const root = fixture(100, []);
    const instance = create(root);
    expect(root.hasClass('with-more-items')).toBe(false);
    instance.destroy();
    expect(root.children()).toHaveLength(0);
  });
});

describe('dropdown interactions', () => {
  it('opens and closes by click with callbacks in order', () => {
    const root = fixture();
    const events = [];
    const options = Object.fromEntries(
      ['onBeforeCalc', 'onBeforeOpen', 'onOpen', 'onBeforeClose', 'onClose'].map((name) => [
        name,
        (element) => {
          expect(element[0]).toBe(root[0]);
          events.push(name);
        },
      ]),
    );
    create(root, { ...options, moreBtnTitle: '<span>More</span>' });
    expect(root.find('.cut-list__drop-toggle span').text()).toBe('More');
    click(root);
    expect(root.find('.cut-list__dropdown').hasClass('is-show')).toBe(true);
    expect(root.find('.cut-list__more').css('visibility')).toBe('visible');
    click(root);
    expect(root.find('.cut-list__dropdown').hasClass('is-show')).toBe(false);
    expect(root.find('.cut-list__more').css('display')).toBe('none');
    expect(events).toEqual(['onBeforeCalc', 'onBeforeOpen', 'onOpen', 'onBeforeClose', 'onClose']);
  });

  it('closes on outside click and ignores clicks inside the dropdown', () => {
    const root = fixture();
    const onClose = vi.fn();
    create(root, { onClose });
    click(root);
    root.find('.cut-list__more-content').trigger('click');
    expect(root.find('.is-show')).toHaveLength(1);
    $(document.body).trigger('click');
    $(document.body).trigger('click');
    expect(root.find('.is-show')).toHaveLength(0);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens and closes on hover', () => {
    const root = fixture();
    const onClose = vi.fn();
    create(root, { showMoreOnHover: true, onClose });
    root.find('.cut-list__drop').trigger('mouseenter');
    expect(root.find('.is-show')).toHaveLength(1);
    root.find('.cut-list__drop').trigger('mouseleave');
    expect(root.find('.is-show')).toHaveLength(0);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    [80, 100, true],
    [20, 100, false],
    [80, 200, false],
  ])('positions the menu for top=%s and viewport height=%s', (top, viewportHeight, above) => {
    const root = fixture().css('height', 10);
    const getBounds = Element.prototype.getBoundingClientRect;
    const height = $.fn.height;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.classList.contains('cut-list__drop-toggle')) {
        return new DOMRect(0, top, 20, 10);
      }
      if (this.classList.contains('cut-list__more')) {
        return new DOMRect(-10, top + 10, 150, parseFloat(this.style.height) || 0);
      }
      return getBounds.call(this);
    });
    vi.spyOn($.fn, 'height').mockImplementation(function (...args) {
      if (this[0] === window) {
        return viewportHeight;
      }
      if (this[0] === document) {
        return 1000;
      }
      return height.apply(this, args);
    });
    create(root, {
      onBeforeCalc: (element) => element.find('.cut-list__more').css('height', 60),
    });
    click(root);
    const more = root.find('.cut-list__more');
    expect(more.hasClass('is-top')).toBe(above);
    expect(more.hasClass('is-left')).toBe(true);
    click(root);
    expect(more.hasClass('is-top')).toBe(false);
    expect(more.hasClass('is-left')).toBe(false);
  });

  it('supports Enter, Space and Escape with synchronized aria-expanded', () => {
    const root = fixture();
    create(root);
    const toggle = root.find('.cut-list__drop-toggle');
    toggle.trigger($.Event('keydown', { key: 'Enter' }));
    expect(toggle.attr('aria-expanded')).toBe('true');
    toggle.trigger($.Event('keydown', { key: ' ' }));
    expect(toggle.attr('aria-expanded')).toBe('false');
    click(root);
    $(document).trigger($.Event('keydown', { key: 'Escape' }));
    expect(toggle.attr('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle[0]);
  });

  it('keeps event handlers of another instance after destroy', () => {
    const first = fixture();
    const second = fixture();
    const firstInstance = create(first);
    const onClose = vi.fn();
    create(second, { onClose });
    firstInstance.destroy();
    click(second);
    $(document.body).trigger('click');
    expect(second.find('.is-show')).toHaveLength(0);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('lays out and opens multiple lists passed to one constructor independently', () => {
    const first = fixture();
    const second = fixture(60);
    create(first.add(second));
    expect(hidden(first)).toEqual(['item-2']);
    expect(hidden(second)).toEqual(['item-1', 'item-2']);
    click(first);
    click(second);
    expect(first.find('.is-show')).toHaveLength(0);
    expect(second.find('.is-show')).toHaveLength(1);
  });
});

describe('resize and minWidth', () => {
  it('debounces observer notifications', () => {
    const root = fixture();
    create(root, { resizeDelay: 50 });
    observers[0].notify();
    root.width(200);
    observers[0].notify();
    vi.advanceTimersByTime(30);
    root.width(210);
    observers[0].notify();
    vi.advanceTimersByTime(49);
    expect(hidden(root)).toEqual(['item-2']);
    vi.advanceTimersByTime(1);
    expect(hidden(root)).toEqual([]);
  });

  it('skips the first notification separately for each observer', () => {
    create(fixture().add(fixture()));
    observers.forEach((observer) => observer.notify());
    expect(vi.getTimerCount()).toBe(0);
  });

  it('activates above minWidth, suspends at the boundary and reactivates', () => {
    const root = fixture();
    viewportWidth = 767;
    const instance = create(root, { minWidth: 767 });
    expect(instance.initialized).toBe(false);
    viewportWidth = 768;
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(instance.initialized).toBe(true);
    expect(hidden(root)).toEqual(['item-2']);
    viewportWidth = 767;
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(instance.initialized).toBe(false);
    expect(ids(root.children())).toEqual(['item-0', 'item-1', 'item-2']);
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    viewportWidth = 900;
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(instance.initialized).toBe(true);
    expect(root.find('.cut-list__dropdown')).toHaveLength(1);
  });

  it('cancels scheduled work and does not reactivate after explicit destroy', () => {
    const root = fixture();
    const instance = create(root, { minWidth: 767 });
    observers[0].notify();
    observers[0].notify();
    $(window).trigger('resize');
    instance.destroy();
    vi.advanceTimersByTime(1000);
    $(window).trigger('resize');
    vi.advanceTimersByTime(1000);
    expect(instance.initialized).toBe(false);
    expect(root.find('.cut-list__dropdown')).toHaveLength(0);
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('recalculates on the first observer delivery when the width has already changed', () => {
    const root = fixture();
    create(root);
    root.width(200);
    observers[0].notify();
    vi.advanceTimersByTime(50);
    expect(hidden(root)).toEqual([]);
  });

  it('responds to a widget resize signal and removes only its own handler', () => {
    const root = fixture();
    const widgetHandler = vi.fn();
    root.on('resize.widget', widgetHandler);
    const instance = create(root);
    root.children('#item-0').width(500);
    root.resize();
    vi.advanceTimersByTime(50);
    expect(hidden(root)).toContain('item-0');
    instance.destroy();
    root.resize();
    expect(widgetHandler).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores height-only observer notifications to avoid relayout loops', () => {
    const root = fixture();
    create(root);
    root.height(500);
    observers[0].notify();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('responds to orientationchange and stops after destroy', () => {
    const root = fixture();
    const instance = create(root, { minWidth: 767 });
    viewportWidth = 600;
    $(window).trigger('orientationchange');
    vi.advanceTimersByTime(300);
    expect(instance.initialized).toBe(false);
    instance.destroy();
    viewportWidth = 1000;
    $(window).trigger('orientationchange');
    vi.advanceTimersByTime(300);
    expect(instance.initialized).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falls back to window resize when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const root = fixture();
    create(root);
    root.width(200);
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(hidden(root)).toEqual([]);
  });
});

describe('jQuery API', () => {
  it('is chainable and initializes an element only once', () => {
    const root = fixture();
    expect(root.cutList()).toBe(root);
    const instance = $.data(root[0], 'InsalesCutList');
    instances.push(instance);
    root.cutList();
    expect($.data(root[0], 'InsalesCutList')).toBe(instance);
    expect(root.find('.cut-list__dropdown')).toHaveLength(1);
    expect(typeof window.InsalesCutList).toBe('function');
  });

  it('shares constructor instances with the jQuery API', () => {
    const root = fixture();
    const instance = create(root);
    expect($.data(root[0], 'InsalesCutList')).toBe(instance);
    root.cutList();
    expect(root.children('.cut-list__dropdown')).toHaveLength(1);
    $.fn.cutList.destroy(root);
    expect(instance.destroyed).toBe(true);
    expect(root.children()).toHaveLength(3);
  });

  it('replaces one list from a grouped constructor without stopping its sibling', () => {
    const first = fixture();
    const second = fixture();
    const grouped = create(first.add(second));
    const replacement = create(first);
    expect(first.children('.cut-list__dropdown')).toHaveLength(1);
    expect(grouped.elements.toArray()).toEqual(second.toArray());
    expect(grouped.initialized).toBe(true);
    replacement.destroy();
    click(second);
    expect(second.find('.is-show')).toHaveLength(1);
    grouped.destroy();
    expect(second.children()).toHaveLength(3);
  });

  it('supports static setup, destroy and setup again using stored options', () => {
    const root = fixture();
    $.fn.cutList.setup(root, { moreBtnTitle: 'Other' });
    const instance = $.data(root[0], 'InsalesCutList');
    instances.push(instance);
    $.fn.cutList.destroy(root);
    expect(root.find('.cut-list__dropdown')).toHaveLength(0);
    $.fn.cutList.setup(root);
    expect(instance.initialized).toBe(true);
    expect(root.find('.cut-list__drop-toggle').text()).toBe('Other');
  });

  it('respects minWidth when setup is called for a suspended instance', () => {
    viewportWidth = 700;
    const root = fixture();
    root.cutList({ minWidth: 767 });
    instances.push($.data(root[0], 'InsalesCutList'));
    $.fn.cutList.setup(root);
    expect(root.find('.cut-list__dropdown')).toHaveLength(0);
    viewportWidth = 900;
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(root.find('.cut-list__dropdown')).toHaveLength(1);
  });
});
