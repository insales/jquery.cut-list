import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import fixtures from './fixtures/widget-styles.json' with { type: 'json' };

const pluginCss = readFileSync(new URL('../dist/jquery.cut-list.css', import.meta.url), 'utf8');
const legacyCss = `.cut-list{display:flex}.cut-list__elem{white-space:nowrap}
.cut-list__dropdown{position:relative}.cut-list__drop-toggle{cursor:pointer;user-select:none}
.cut-list__more{position:absolute;top:100%;right:0;min-width:150px;padding:0;margin:0;text-align:left;background-color:#fff;border:1px solid #ccc;z-index:100;display:none}
.cut-list__more.is-top{top:auto;bottom:100%}.cut-list__more.is-left{right:auto;left:0}`;

for (const widget of fixtures.widgets) {
  test(`${widget.name}: default dropdown typography and dimensions match legacy CSS`, async ({
    page,
  }) => {
    await page.goto('/playground/frame.html?priority=false');
    await page.waitForFunction(() => Boolean(window.playground));
    await page.evaluate(
      ({ widget, legacyCss }) => {
        window.playground.instances.forEach((instance) => instance.destroy());
        document
          .querySelectorAll('link[rel="stylesheet"], style')
          .forEach((element) => element.remove());
        document.body.innerHTML = '';
        const defaults = document.createElement('style');
        defaults.textContent = `*{box-sizing:border-box}body{margin:24px;font:16px/1.5 Arial}
        [data-widget]{--bg:white;--color-text:black;--submenu-indent:15px;--submenu-min-width:200px;--submenu-max-width:300px;--submenu-item-vertical-indent:3px;--document-height:900px;--offset-top:100px}
        ul{margin:0;padding:0;list-style:none}a{color:inherit} `;
        const plugin = document.createElement('style');
        plugin.id = 'plugin-css';
        plugin.textContent = legacyCss;
        const theme = document.createElement('style');
        theme.textContent = widget.css;
        document.head.append(defaults, plugin, theme);
        window.widgetCases = widget.navigation.map((navigation) => {
          const wrapper = window
            .$(
              '<section data-widget><div class="header"><div class="collections-wrapper"></div></div></section>',
            )
            .appendTo('body');
          const root = window
            .$('<ul></ul>')
            .addClass(navigation.root)
            .css({ width: 320, display: 'flex' })
            .appendTo(wrapper.find('.collections-wrapper'));
          const labels = [
            'Главная',
            'Каталог',
            'Новинки',
            'Доставка и оплата',
            'Контакты',
            'Очень длинное название раздела магазина',
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(4),
          ];
          labels.forEach((label, index) => {
            const item = window
              .$('<li></li>')
              .addClass(navigation.item)
              .attr('data-id', index)
              .appendTo(root);
            const controls = window.$('<div></div>').addClass(navigation.controls).appendTo(item);
            window.$('<a href="#"></a>').addClass(navigation.link).text(label).appendTo(controls);
          });
          const instance = new window.InsalesCutList(root, {
            moreBtnTitle: 'Ещё',
            alwaysVisibleElem: undefined,
          });
          instance.resize.stop();
          return { root, instance };
        });
      },
      { widget, legacyCss },
    );

    const snapshot = () =>
      page.evaluate(() =>
        window.widgetCases.map(({ root }) => {
          const panel = root.find('.cut-list__more')[0];
          const elements = [
            root.find('.cut-list__dropdown')[0],
            root.find('.cut-list__drop-toggle')[0],
            panel,
            ...root
              .find('.cut-list__more-content > [data-id]')
              .toArray()
              .flatMap((item) => [item, ...item.querySelectorAll('*')]),
          ];
          return elements.map((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
              className: element.className,
              whiteSpace: style.whiteSpace,
              overflowWrap: style.overflowWrap,
              width: Math.round(rect.width * 100) / 100,
              height: Math.round(rect.height * 100) / 100,
            };
          });
        }),
      );

    for (const width of [1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((legacyCss) => {
        document.querySelector('#plugin-css').textContent = legacyCss;
        window.widgetCases.forEach(({ instance }) => {
          instance.redrawList();
          instance.lists[0].dropdown.open();
          const current = instance.lists[0].dropdown.element[0];
          const legacy = document.createElement('div');
          for (const attribute of current.attributes)
            legacy.setAttribute(attribute.name, attribute.value);
          legacy.append(...current.childNodes);
          current.replaceWith(legacy);
          instance.legacyDropdown = legacy;
        });
      }, legacyCss);
      const before = await snapshot();
      expect(before.length).toBeGreaterThan(0);
      if (width === 1024) {
        expect(before.every((elements) => elements.length > 3)).toBe(true);
      }
      await page.evaluate((css) => {
        window.widgetCases.forEach(({ instance }) => {
          const current = instance.lists[0].dropdown.element[0];
          current.append(...instance.legacyDropdown.childNodes);
          instance.legacyDropdown.replaceWith(current);
        });
        document.querySelector('#plugin-css').textContent = css;
      }, pluginCss);
      expect(await snapshot(), `CSS compatibility at ${width}px`).toEqual(before);
    }
  });
}

test('wrapping long words is enabled explicitly and leaves the row unwrapped', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 650 });
  await page.goto('/playground/frame.html?long=true&rtl=true');
  await page.waitForFunction(() => Boolean(window.playground));
  await page.locator('.cut-list__drop-toggle').click();
  await expect(page.locator('.cut-list__more-content > .cut-list__elem').first()).toHaveCSS(
    'overflow-wrap',
    'anywhere',
  );
  await expect(page.locator('.demo-list > [data-item]').first()).toHaveCSS('white-space', 'nowrap');
  await page.evaluate(() => window.playground.roots[0].removeClass('cut-list--wrap-dropdown'));
  await expect(page.locator('.cut-list__more-content > .cut-list__elem').first()).toHaveCSS(
    'white-space',
    'nowrap',
  );
  await expect(page.locator('.cut-list__more-content > .cut-list__elem').first()).toHaveCSS(
    'overflow-wrap',
    'normal',
  );
});

test('original collections widget script: callbacks, editor resize, click handlers and DOM restoration', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/playground/frame.html?priority=false');
  await page.waitForFunction(() => Boolean(window.playground));
  const widget = fixtures.widgets.find(
    (widget) => widget.name === 'system_widget_v4_collections_menu_1',
  );
  await page.evaluate(({ css }) => {
    window.playground.instances.forEach((instance) => instance.destroy());
    document.documentElement.style.minHeight = '100vh';
    document.body.innerHTML =
      '<section data-widget><div class="collections-wrapper"><ul class="collections js-cut-list-collections" data-more-title="Ещё" style="width:320px"></ul></div></section>';
    const stylesheet = document.createElement('style');
    stylesheet.textContent = css;
    document.head.append(stylesheet);
    window.widget = document.querySelector('[data-widget]');
    window.editorCallbacks = [];
    window.EventBus = {
      subscribe(events, callback) {
        window.editorCallbacks.push(callback);
      },
    };
    window.originalItems = [];
    window.itemClicks = 0;
    for (let index = 0; index < 8; index++) {
      const item = window
        .$(
          `<li class="collections__item" data-id="${index}"><div class="collections__controls"><a class="collections__link" href="#">Раздел магазина ${index}</a></div></li>`,
        )
        .appendTo('.collections');
      item.find('a').on('click.widget', (event) => {
        event.preventDefault();
        window.itemClicks++;
      });
      window.originalItems.push(item[0]);
    }
  }, widget);
  await page.addScriptTag({ content: widget.javascript });
  await page.waitForFunction(() => Boolean(window.$('.collections').data('InsalesCutList')));
  const toggle = page.locator('.cut-list__drop-toggle');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(
    await page
      .locator('.collections')
      .evaluate((element) => element.style.getPropertyValue('--document-height')),
  ).toMatch(/^\d+(?:\.\d+)?px$/);
  await page.evaluate(() => {
    window.$('.cut-list__more-content a').first().trigger('click');
    window.$('.cut-list__more-content').scrollTop(50);
    const instance = window.$('.collections').data('InsalesCutList');
    instance.lists[0].dropdown.close();
    instance.lists[0].dropdown.open();
  });
  expect(await page.evaluate(() => window.itemClicks)).toBe(1);
  expect(
    await page.locator('.cut-list__more-content').evaluate((element) => element.scrollTop),
  ).toBe(0);
  await page.evaluate(() => {
    window.$('.collections').css('width', '180px');
    window.editorCallbacks.forEach((callback) => callback());
  });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.evaluate(() => window.$('.collections').data('InsalesCutList').destroy());
  await expect(page.locator('.cut-list__dropdown')).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const items = [...document.querySelector('.collections').children];
      return (
        items.length === window.originalItems.length &&
        items.every(
          (item, index) =>
            item === window.originalItems[index] && !item.classList.contains('cut-list__elem'),
        )
      );
    }),
  ).toBe(true);
  await page.evaluate(() => window.$('.collections a').first().trigger('click'));
  expect(await page.evaluate(() => window.itemClicks)).toBe(2);
});
