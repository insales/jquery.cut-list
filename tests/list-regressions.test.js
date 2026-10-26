import $ from 'jquery';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaults } from '../src/defaults.js';
import { CutList } from '../src/list.js';

let lists;

function fixture(width = 100) {
  const root = $('<div></div>').css({ display: 'flex', width }).appendTo(document.body);
  for (let index = 0; index < 3; index++) {
    $('<div></div>')
      .css('width', 40)
      .append($('<a href="#"></a>').text(`Item ${index}`))
      .appendTo(root);
  }
  return root;
}

function create(root) {
  const list = new CutList($, root[0], defaults, `.regression${lists.length}`);
  lists.push(list);
  return list;
}

beforeEach(() => {
  lists = [];
  const outerWidth = $.fn.outerWidth;
  vi.spyOn($.fn, 'outerWidth').mockImplementation(function (...args) {
    return this.hasClass('cut-list__dropdown') ? 20 : outerWidth.apply(this, args);
  });
});

afterEach(() => {
  lists.forEach((list) => list.destroy());
  document.body.innerHTML = '';
});

describe('item ownership', () => {
  it.each(['source first', 'destination first'])(
    'preserves original item attributes after transfer and destruction: %s',
    (order) => {
      const source = fixture();
      const destination = fixture();
      const item = source
        .children()
        .last()
        .attr('data-index', 'original')
        .addClass('cut-list__elem');
      const first = create(source);
      const second = create(destination);

      item.appendTo(destination);
      second.redraw();
      expect(first.attributes.has(item[0])).toBe(false);
      expect(item.attr('data-index')).toBe('3');

      if (order === 'source first') {
        first.destroy();
        expect(item.attr('data-index')).toBe('3');
        expect(item.hasClass('cut-list__elem')).toBe(true);
        second.destroy();
      } else {
        second.destroy();
        first.destroy();
      }

      expect(item.attr('data-index')).toBe('original');
      expect(item.hasClass('cut-list__elem')).toBe(true);
    },
  );

  it('does not preserve plugin attributes as original values when transferring a plain item', () => {
    const source = fixture();
    const destination = fixture();
    const item = source.children().last();
    const first = create(source);
    const second = create(destination);

    item.appendTo(destination);
    second.redraw();
    first.redraw();
    first.destroy();
    second.destroy();

    expect(item.attr('data-index')).toBeUndefined();
    expect(item.hasClass('cut-list__elem')).toBe(false);
  });

  it('releases removed nodes on redraw instead of retaining every content replacement', () => {
    const root = fixture();
    const removed = root.children().first()[0];
    const list = create(root);

    for (let index = 0; index < 100; index++) {
      root.html(`<div style="width:40px">Replacement ${index}</div>`);
      list.redraw();
      expect(list.attributes.size).toBe(1);
    }

    expect(list.attributes.has(removed)).toBe(false);
    list.destroy();
    expect(list.attributes.size).toBe(0);
  });
});

describe('focus during redraw', () => {
  it('preserves focus when a hidden link returns to the visible row', () => {
    const root = fixture();
    const list = create(root);
    list.dropdown.open();
    const link = list.dropdown.content.find('a')[0];
    link.focus();

    root.width(200);
    list.redraw();

    expect(link.parentNode.parentNode).toBe(root[0]);
    expect(document.activeElement).toBe(link);
    expect(list.dropdown.isOpen).toBe(false);
  });

  it('focuses the toggle when a focused link remains in the closed dropdown', () => {
    const list = create(fixture());
    list.dropdown.open();
    list.dropdown.content.find('a')[0].focus();

    list.redraw();

    expect(document.activeElement).toBe(list.dropdown.toggle[0]);
    expect(list.dropdown.isOpen).toBe(false);
  });

  it('focuses the toggle when a focused row item moves into the dropdown', () => {
    const root = fixture(200);
    const list = create(root);
    const link = root.children().eq(2).find('a')[0];
    link.focus();

    root.width(100);
    list.redraw();

    expect(list.dropdown.content[0].contains(link)).toBe(true);
    expect(document.activeElement).toBe(list.dropdown.toggle[0]);
  });

  it('restores focus to a link when responsive styles change the list to a column', () => {
    const root = fixture();
    const list = create(root);
    list.dropdown.open();
    const link = list.dropdown.content.find('a')[0];
    link.focus();

    root.css('flex-direction', 'column');
    list.redraw();

    expect(document.activeElement).toBe(link);
    expect(root.hasClass('with-more-items')).toBe(false);
  });

  it('does not steal focus from outside the list during redraw', () => {
    const list = create(fixture());
    const input = $('<input>').appendTo(document.body)[0];
    input.focus();

    list.redraw();

    expect(document.activeElement).toBe(input);
  });
});

describe('third-party item events', () => {
  it.each(['before initialization', 'inside the dropdown'])(
    'preserves native and jQuery handlers registered %s through redraw and destroy',
    (registration) => {
      const root = fixture();
      const item = root.children().last()[0];
      const link = item.querySelector('a');
      const nativeItem = vi.fn();
      const nativeLink = vi.fn((event) => event.preventDefault());
      const jqueryItem = vi.fn();
      const jqueryLink = vi.fn();
      let list;
      if (registration === 'inside the dropdown') {
        list = create(root);
      }

      item.addEventListener('click', nativeItem);
      link.addEventListener('click', nativeLink);
      $(item).on('click.widget', jqueryItem);
      $(link).on('click.widget', jqueryLink).data('widget', { selected: true });
      list ??= create(root);

      const handlers = [nativeItem, nativeLink, jqueryItem, jqueryLink];
      let clicks = 0;
      const checkClick = () => {
        expect(item.querySelector('a')).toBe(link);
        expect($(link).data('widget')).toEqual({ selected: true });
        link.click();
        clicks++;
        handlers.forEach((handler) => expect(handler).toHaveBeenCalledTimes(clicks));
      };

      expect(list.dropdown.content[0].contains(item)).toBe(true);
      checkClick();
      for (const width of [200, 100, 100, 200, 100]) {
        root.width(width);
        list.redraw();
        expect(item.parentNode).toBe(width === 200 ? root[0] : list.dropdown.content[0]);
        checkClick();
      }
      list.destroy();
      expect(item.parentNode).toBe(root[0]);
      checkClick();
      list = create(root);
      expect(list.dropdown.content[0].contains(item)).toBe(true);
      checkClick();

      $(link).off('.widget');
      link.removeEventListener('click', nativeLink);
      link.click();
      expect(nativeLink).toHaveBeenCalledTimes(clicks);
      expect(jqueryLink).toHaveBeenCalledTimes(clicks);
      expect(nativeItem).toHaveBeenCalledTimes(clicks + 1);
      expect(jqueryItem).toHaveBeenCalledTimes(clicks + 1);
    },
  );

  it('keeps bubbling and delegated handlers on the item and list after moving descendants', () => {
    const root = fixture();
    const item = root.children().last();
    const link = item.find('a')[0];
    const itemHandler = vi.fn();
    const listHandler = vi.fn();
    const captureHandler = vi.fn();
    const directChildHandler = vi.fn();
    item.on('click.widget', 'a', itemHandler);
    root.on('click.widget', 'a', listHandler);
    root.on('click.widget', '> div > a', directChildHandler);
    root[0].addEventListener('click', captureHandler, true);
    link.addEventListener('click', (event) => event.preventDefault());

    const list = create(root);
    link.click();
    expect(itemHandler).toHaveBeenCalledOnce();
    expect(listHandler).toHaveBeenCalledOnce();
    expect(captureHandler).toHaveBeenCalledOnce();
    expect(directChildHandler).not.toHaveBeenCalled();

    list.destroy();
    link.click();
    expect(itemHandler).toHaveBeenCalledTimes(2);
    expect(listHandler).toHaveBeenCalledTimes(2);
    expect(captureHandler).toHaveBeenCalledTimes(2);
    expect(directChildHandler).toHaveBeenCalledOnce();
  });

  it('does not rearm native once or jQuery one handlers when items move again', () => {
    const root = fixture();
    const link = root.children().last().find('a')[0];
    const nativeHandler = vi.fn();
    const jqueryHandler = vi.fn();
    link.addEventListener('click', nativeHandler, { once: true });
    link.addEventListener('click', (event) => event.preventDefault());
    $(link).one('click.widget', jqueryHandler);
    const list = create(root);

    link.click();
    root.width(200);
    list.redraw();
    link.click();
    root.width(100);
    list.redraw();
    link.click();
    list.destroy();
    link.click();

    expect(nativeHandler).toHaveBeenCalledOnce();
    expect(jqueryHandler).toHaveBeenCalledOnce();
  });
});
