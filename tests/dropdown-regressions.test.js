import $ from 'jquery';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInsalesCutList } from '../src/insales-cut-list.js';

const InsalesCutList = createInsalesCutList($, window, document);
let instances;

function create(options = {}) {
  const root = $(
    '<div style="display:flex;width:100px"><a style="width:70px">A</a><a style="width:70px">B</a></div>',
  ).appendTo(document.body);
  const instance = new InsalesCutList(root, options);
  instances.push(instance);
  return { root, instance, dropdown: instance.lists[0].dropdown };
}

beforeEach(() => {
  instances = [];
  vi.useFakeTimers();
});

afterEach(() => {
  instances.forEach((instance) => instance.destroy());
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('callback lifecycle', () => {
  it('does not report an opening cancelled by redraw inside onBeforeOpen', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const state = create({ onOpen, onClose, onBeforeOpen: () => state.instance.redrawList() });

    state.dropdown.open();

    expect(state.dropdown.isOpen).toBe(false);
    expect(state.dropdown.panel.css('display')).toBe('none');
    expect(onOpen).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stops opening after onBeforeCalc destroys the instance', () => {
    const onBeforeOpen = vi.fn();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const state = create({
      onBeforeCalc: () => state.instance.destroy(),
      onBeforeOpen,
      onOpen,
      onClose,
    });

    state.dropdown.open();

    expect(state.instance.destroyed).toBe(true);
    expect(state.root.children('.cut-list__dropdown')).toHaveLength(0);
    expect(onBeforeOpen).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('runs close callbacks once when destroying an open menu', () => {
    const onBeforeClose = vi.fn();
    const onClose = vi.fn();
    const { instance, dropdown } = create({ onBeforeClose, onClose });
    dropdown.open();

    instance.destroy();
    instance.destroy();

    expect(onBeforeClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('runs close cleanup when crossing below minWidth', () => {
    const onClose = vi.fn();
    const { instance, dropdown } = create({ onClose });
    dropdown.open();
    instance.options.minWidth = 2000;

    instance.checkScreenWidth();

    expect(instance.initialized).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not recursively close when onBeforeClose requests another close', () => {
    const onBeforeClose = vi.fn(() => state.dropdown.close());
    const onClose = vi.fn();
    const state = create({ onBeforeClose, onClose });
    state.dropdown.open();

    state.dropdown.close();

    expect(state.dropdown.isOpen).toBe(false);
    expect(onBeforeClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('finishes cleanup once when onBeforeClose destroys the instance', () => {
    const onBeforeClose = vi.fn(() => state.instance.destroy());
    const onClose = vi.fn();
    const state = create({ onBeforeClose, onClose });
    state.dropdown.open();

    state.dropdown.close();

    expect(state.root.children('.cut-list__dropdown')).toHaveLength(0);
    expect(onBeforeClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
