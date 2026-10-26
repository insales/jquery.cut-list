import $ from 'jquery';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInsalesCutList } from '../src/insales-cut-list.js';

window.jQuery = $;
await import('../src/index.js');
const InsalesCutList = createInsalesCutList($, window, document);
let instances;
let viewportWidth;

function root() {
  return $(
    '<div style="display:flex;width:100px"><a style="width:70px">A</a><a style="width:70px">B</a></div>',
  ).appendTo(document.body);
}

function create(elements, options) {
  const instance = new InsalesCutList(elements, options);
  instances.push(instance);
  return instance;
}

beforeEach(() => {
  instances = [];
  viewportWidth = 1000;
  vi.useFakeTimers();
  const width = $.fn.width;
  vi.spyOn($.fn, 'width').mockImplementation(function (...args) {
    return this[0] === window && args.length === 0 ? viewportWidth : width.apply(this, args);
  });
});

afterEach(() => {
  instances.forEach((instance) => instance.destroy());
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('constructor selection', () => {
  it('does not initialize or subscribe globally for an empty selection', () => {
    const on = vi.spyOn($.fn, 'on');
    const instance = create([]);
    expect(instance.initialized).toBe(false);
    expect(instance.resize.listening).toBe(false);
    expect(on).not.toHaveBeenCalled();
    instance.setup();
    instance.init();
    expect(instance.initialized).toBe(false);
    expect(instance.resize.listening).toBe(false);
  });

  it('initializes a repeated root only once', () => {
    const element = root();
    const instance = create([element[0], element[0]]);
    expect(instance.elements).toHaveLength(1);
    expect(instance.lists).toHaveLength(1);
    expect(element.children('.cut-list__dropdown')).toHaveLength(1);
    instance.destroy();
    expect(element.children()).toHaveLength(2);
    expect(element.children('[data-index]')).toHaveLength(0);
  });
});

describe('static API with grouped instances', () => {
  it('destroys and sets up only the selected root without closing or replacing its sibling', () => {
    const first = root();
    const second = root();
    const onClose = vi.fn();
    const instance = create(first.add(second), { moreBtnTitle: 'Stored title', onClose });
    const sibling = instance.lists[1];
    const toggle = sibling.dropdown.toggle[0];
    const handler = vi.fn();
    $(toggle).on('custom.widget', handler);
    sibling.dropdown.open();

    expect($.fn.cutList.destroy(first)[0]).toBe(first[0]);
    expect(first.children('.cut-list__dropdown')).toHaveLength(0);
    expect(second.children('.cut-list__dropdown')).toHaveLength(1);
    expect(sibling.dropdown.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    $.fn.cutList.setup(first, { moreBtnTitle: 'Ignored replacement' });
    expect(first.find('.cut-list__drop-toggle').text()).toBe('Stored title');
    expect(instance.lists.find((list) => list.element[0] === second[0])).toBe(sibling);
    expect(second.find('.cut-list__drop-toggle')[0]).toBe(toggle);
    expect(sibling.dropdown.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    $(toggle).trigger('custom');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('redraws an already active selected root while leaving the sibling menu open', () => {
    const first = root();
    const second = root();
    const instance = create(first.add(second));
    const sibling = instance.lists[1];
    sibling.dropdown.open();
    first.width(300);
    $.fn.cutList.setup(first);
    expect(first.find('.cut-list__more-content').children()).toHaveLength(0);
    expect(sibling.dropdown.isOpen).toBe(true);
  });

  it('keeps an explicitly suspended root disabled across resize and minWidth transitions', () => {
    const first = root();
    const second = root();
    const instance = create(first.add(second), { minWidth: 767, moreBtnTitle: 'Saved' });
    $.fn.cutList.destroy(first);
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(first.children('.cut-list__dropdown')).toHaveLength(0);
    viewportWidth = 700;
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(second.children('.cut-list__dropdown')).toHaveLength(0);
    viewportWidth = 1000;
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(first.children('.cut-list__dropdown')).toHaveLength(0);
    expect(second.children('.cut-list__dropdown')).toHaveLength(1);
    $.fn.cutList.setup(first);
    expect(first.find('.cut-list__drop-toggle').text()).toBe('Saved');
    expect(instance.lists).toHaveLength(2);
  });

  it('applies minWidth immediately when setup precedes the pending window resize', () => {
    const first = root();
    const second = root();
    const instance = create(first.add(second), { minWidth: 767 });
    viewportWidth = 700;
    $(window).trigger('resize');
    $.fn.cutList.setup(first);
    expect(first.children('.cut-list__dropdown')).toHaveLength(0);
    expect(second.children('.cut-list__dropdown')).toHaveLength(0);
    expect(instance.initialized).toBe(false);
    expect(instance.resize.listening).toBe(true);
    vi.advanceTimersByTime(300);
    expect(instance.lists).toHaveLength(0);
    viewportWidth = 1000;
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(first.children('.cut-list__dropdown')).toHaveLength(1);
    expect(second.children('.cut-list__dropdown')).toHaveLength(1);
  });

  it('sets up a selected root below minWidth without activating suspended siblings later', () => {
    const first = root();
    const second = root();
    const instance = create(first.add(second), { minWidth: 767 });
    $.fn.cutList.destroy(first.add(second));
    expect(instance.destroyed).toBe(true);
    expect(instance.resize.listening).toBe(false);
    viewportWidth = 700;
    $.fn.cutList.setup(first);
    expect(first.children('.cut-list__dropdown')).toHaveLength(0);
    expect(instance.resize.listening).toBe(true);
    viewportWidth = 1000;
    $(window).trigger('resize');
    vi.advanceTimersByTime(300);
    expect(first.children('.cut-list__dropdown')).toHaveLength(1);
    expect(second.children('.cut-list__dropdown')).toHaveLength(0);
  });

  it('allows a whole-instance setup to restore all suspended roots', () => {
    const first = root();
    const second = root();
    const instance = create(first.add(second));
    $.fn.cutList.destroy(first);
    instance.setup();
    expect(first.children('.cut-list__dropdown')).toHaveLength(1);
    expect(second.children('.cut-list__dropdown')).toHaveLength(1);
  });

  it('sets up only the requested root after a whole-instance destroy', () => {
    const first = root();
    const second = root();
    const instance = create(first.add(second));
    instance.destroy();
    $.fn.cutList.setup(first);
    expect(first.children('.cut-list__dropdown')).toHaveLength(1);
    expect(second.children('.cut-list__dropdown')).toHaveLength(0);
    expect(instance.lists).toHaveLength(1);
  });

  it('transfers suspended roots to another owner without restoring them in the old group', () => {
    const first = root();
    const second = root();
    const instance = create(first.add(second));
    $.fn.cutList.destroy(first);
    const replacement = create(first, { moreBtnTitle: 'New owner' });
    instance.setup();
    expect(instance.elements.toArray()).toEqual(second.toArray());
    expect($.data(first[0], 'InsalesCutList')).toBe(replacement);
    expect(first.children('.cut-list__dropdown')).toHaveLength(1);
    expect(first.find('.cut-list__drop-toggle').text()).toBe('New owner');
  });
});
