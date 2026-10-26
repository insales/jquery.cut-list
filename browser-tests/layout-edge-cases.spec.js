import { test, expect } from '@playwright/test';

async function open(page) {
  await page.setViewportSize({ width: 640, height: 390 });
  await page.goto('/playground/frame.html?context=block&priority=false');
  await page.waitForFunction(() => Boolean(window.playground));
}

async function bounds(page) {
  return page.evaluate(() => {
    const root = window.playground.roots[0][0];
    return {
      toggle: root.querySelector('.cut-list__drop-toggle').getBoundingClientRect().toJSON(),
      panel: root.querySelector('.cut-list__more').getBoundingClientRect().toJSON(),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

function expectAbove({ toggle, panel, viewport }) {
  expect(panel.height).toBeGreaterThan(0);
  expect(panel.y).toBeGreaterThanOrEqual(0);
  expect(panel.bottom).toBeCloseTo(toggle.top, 1);
  expect(panel.bottom).toBeLessThanOrEqual(viewport.height);
  expect(panel.left).toBeGreaterThanOrEqual(0);
  expect(panel.right).toBeLessThanOrEqual(viewport.width);
}

test('uses the toggle position when a tall flex list aligns its items to the bottom', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    const { roots, instances } = window.playground;
    roots[0].css({ width: 350, height: 300, alignItems: 'flex-end' });
    roots[0].find('[data-item] > a').css({ padding: '3px 2px' });
    instances[0].redrawList();
  });
  await page.locator('.cut-list__drop-toggle').click();
  const result = await bounds(page);
  expect(result.toggle.top).toBeGreaterThan(250);
  expectAbove(result);
});

test('compares the rendered dropdown and trigger dimensions inside a scaled ancestor', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    const { roots, instances, stage } = window.playground;
    roots[0].css({ width: 250 });
    roots[0].find('[data-item] > a').css({ padding: '3px 2px', fontSize: 8 });
    stage.style.marginTop = '150px';
    stage.style.transform = 'scale(2)';
    stage.style.transformOrigin = 'top left';
    instances[0].redrawList();
  });
  await page.locator('.cut-list__drop-toggle').click();
  const result = await bounds(page);
  expect(result.panel.height).toBeGreaterThan(100);
  expect(result.toggle.bottom + result.panel.height).toBeGreaterThan(result.viewport.height);
  expectAbove(result);
});

test('row-reverse and RTL preserve the visible prefix and keep the dropdown in the viewport', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    const { roots, instances } = window.playground;
    roots[0].attr('dir', 'rtl').css({ width: 320, flexDirection: 'row-reverse', gap: 10 });
    roots[0].find('[data-item]').css({ width: 70 });
    roots[0].find('[data-item] > a').text('Раздел').css({ padding: '3px 2px' });
    roots[0].find('.cut-list__dropdown').css({ width: 40 });
    roots[0].find('.cut-list__drop-toggle').css({ padding: 0 });
    instances[0].redrawList();
  });
  await expect(page.locator('[data-testid="list"] > [data-item]')).toHaveCount(3);
  const visible = await page
    .locator('[data-testid="list"] > [data-item]')
    .evaluateAll((items) =>
      items.map((item) => ({ id: item.dataset.item, left: item.getBoundingClientRect().left })),
    );
  expect(visible.map((item) => item.id)).toEqual(['0', '1', '2']);
  expect(visible[0].left).toBeLessThan(visible[1].left);
  expect(visible[1].left).toBeLessThan(visible[2].left);
  await page.locator('.cut-list__drop-toggle').click();
  const { toggle, panel, viewport } = await bounds(page);
  expect(panel.top).toBeCloseTo(toggle.bottom, 1);
  expect(panel.left).toBeGreaterThanOrEqual(0);
  expect(panel.right).toBeLessThanOrEqual(viewport.width);
  expect(panel.bottom).toBeLessThanOrEqual(viewport.height);
});

test('keeps the maximal visible prefix at a fractional width boundary', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const { roots, instances } = window.playground;
    roots[0].css({ width: 231.75, gap: 3.5 });
    roots[0].find('[data-item]').css({ width: 60.25 });
    roots[0].find('[data-item] > a').text('Пункт').css({ padding: 0 });
    roots[0].find('.cut-list__dropdown').css({ width: 40.5 });
    roots[0].find('.cut-list__drop-toggle').css({ padding: 0 });
    instances[0].redrawList();
  });
  const visible = page.locator('[data-testid="list"] > [data-item]');
  await expect(visible).toHaveCount(3);
  await page.evaluate(() => {
    window.playground.roots[0].css({ width: 231.5 });
    window.playground.instances[0].redrawList();
  });
  await expect(visible).toHaveCount(2);
  await page.evaluate(() => {
    window.playground.roots[0].css({ width: 231.75 });
    window.playground.instances[0].redrawList();
  });
  await expect(visible).toHaveCount(3);
  expect(await visible.evaluateAll((items) => items.map((item) => item.dataset.item))).toEqual([
    '0',
    '1',
    '2',
  ]);
});
