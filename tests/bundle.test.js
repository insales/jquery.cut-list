import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import $ from 'jquery';

window.jQuery = $;
let instance;

afterEach(() => {
  instance?.destroy();
  document.body.innerHTML = '';
});

it.each(['jquery.cut-list.js', 'jquery.cut-list.min.js'])(
  '%s works as a standalone browser script',
  (file) => {
    window.eval(readFileSync(file, 'utf8'));
    const root = $('<div style="width:120px"><div style="width:40px">Item</div></div>').appendTo(
      document.body,
    );
    root.cutList();
    instance = $.data(root[0], 'InsalesCutList');
    expect(instance).toBeInstanceOf(window.InsalesCutList);
    expect(root.hasClass('cut-list-ready')).toBe(true);
    $.fn.cutList.destroy(root);
    expect(root.children()).toHaveLength(1);
    expect(root.hasClass('cut-list-ready')).toBe(false);
  },
);
