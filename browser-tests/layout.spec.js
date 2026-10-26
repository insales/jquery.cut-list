import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 650 });
});

async function open(page, options = {}) {
  await page.goto(
    `/playground/frame.html?${new URLSearchParams({ context: 'block', priority: 'false', ...options })}`,
  );
  await page.waitForFunction(() => Boolean(window.playground));
}

async function expectFits(page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = window.playground.roots[0][0];
        const style = getComputedStyle(root);
        const rect = root.getBoundingClientRect();
        const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
        const right =
          rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
        const stage = window.playground.stage.getBoundingClientRect();
        if (rect.right > stage.right + 1 || rect.left < stage.left - 1) return false;
        return [...root.children]
          .filter((item) => getComputedStyle(item).display !== 'none')
          .every((item) => {
            const box = item.getBoundingClientRect();
            return box.left >= left - 1 && box.right <= right + 1;
          });
      }),
    )
    .toBe(true);
}

for (const context of ['block', 'grid', 'flex', 'nested-grid', 'nested-flex']) {
  test(`${context}: items fit after container shrinks and expands`, async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 600 });
    await open(page, { context, gap: 18, padding: 20, long: true });
    await expectFits(page);
    await page.evaluate(() => {
      window.playground.stage.style.width = '360px';
    });
    await expectFits(page);
    await page.evaluate(() => {
      window.playground.stage.style.width = '';
    });
    await expectFits(page);
  });
}

test('accounts for gap and padding on a list with fixed-width items', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const root = window.playground.roots[0];
    root.css({ width: 300, padding: 30, gap: 20 });
    root.find('[data-item]').css({ width: 65, flexShrink: 0 });
    window.playground.instances[0].redrawList();
  });
  await expectFits(page);
});

test('responds to the InSales widget .resize() signal when only content changes', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    const root = window.playground.roots[0];
    root.find('[data-item]').first().find('a').text('Очень длинное название раздела '.repeat(12));
    root.resize();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.playground.roots[0].find('.cut-list__more-content > [data-item="0"]').length,
      ),
    )
    .toBe(1);
});

test('first observer delivery can recover a container made visible immediately after initialization', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    const { roots, instances, stage, options } = window.playground;
    instances[0].destroy();
    stage.style.display = 'none';
    roots[0].css('width', '100%');
    roots[0].find('[data-item]').css({ width: 100, flexShrink: 0 });
    instances[0] = new window.InsalesCutList(roots[0], options);
    stage.style.display = '';
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.playground.roots[0].find('.cut-list__more-content > [data-item]').length,
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.playground.roots[0].children('[data-item]').length))
    .toBeGreaterThan(0);
  await expectFits(page);
});

test('portrait → landscape → portrait crosses minWidth and preserves order', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, { minWidth: 767, mobileStack: true });
  const initialized = () => page.evaluate(() => window.playground.instances[0].initialized);
  await expect.poll(initialized).toBe(false);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(initialized).toBe(true);
  await expectFits(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(initialized).toBe(false);
  expect(
    await page
      .locator('[data-testid="list"] > [data-item]')
      .evaluateAll((items) => items.map((item) => item.dataset.item)),
  ).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
});

test('touch can toggle a hover menu after changing orientation', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await open(page, { hover: true, minWidth: 767 });
  await page.evaluate(() => window.playground.roots[0].css('width', 450));
  await page.setViewportSize({ width: 844, height: 390 });
  const toggle = page.locator('.cut-list__drop-toggle');
  await toggle.tap();
  await expect(page.locator('.cut-list__dropdown')).toHaveClass(/is-show/);
  await toggle.tap();
  await expect(page.locator('.cut-list__dropdown')).not.toHaveClass(/is-show/);
  await context.close();
});

test('redraw preserves insertion and removal order', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const { roots, instances } = window.playground;
    roots[0]
      .children('[data-item="1"]')
      .before('<li data-item="new"><a href="#">Вставлен в середину</a></li>');
    instances[0].redrawList();
    instances[0].destroy();
  });
  expect(
    await page
      .locator('[data-testid="list"] > [data-item]')
      .evaluateAll((items) => items.map((item) => item.dataset.item)),
  ).toEqual(['0', 'new', '1', '2', '3', '4', '5', '6', '7']);
});

test('changing item styles at a breakpoint recalculates even if root width is fixed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 600 });
  await open(page);
  await page.addStyleTag({
    content:
      '.demo-list {width: 450px; line-height:14px} @media(max-width:800px){.demo-list > [data-item] {font-size:50px}}',
  });
  await page.evaluate(async () => {
    const { roots, instances, options } = window.playground;
    instances[0].destroy();
    instances[0] = new window.InsalesCutList(roots[0], options);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.setViewportSize({ width: 780, height: 600 });
  await expectFits(page);
});

test('keeps a widget click handler bound directly to the toggle after redraw', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const { roots, instances } = window.playground;
    window.toggleClicks = 0;
    roots[0].find('.cut-list__drop-toggle').on('click.widget', () => window.toggleClicks++);
    instances[0].redrawList();
  });
  await page.locator('.cut-list__drop-toggle').click();
  expect(await page.evaluate(() => window.toggleClicks)).toBe(1);
});

for (const bundle of ['readable', 'minified']) {
  test(`${bundle} bundle works with InSales jQuery`, async ({ page }) => {
    await open(page, { bundle });
    expect(await page.evaluate(() => window.jQuery.fn.jquery)).toBe('3.5.1');
    await page.locator('.cut-list__drop-toggle').click();
    await expect(page.locator('.cut-list__dropdown')).toHaveClass(/is-show/);
  });
}

test('playground rotates a real iframe viewport', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Телефон', exact: true }).click();
  const frame = page.frameLocator('#preview');
  await expect(frame.locator('[data-testid="list"]')).not.toHaveClass(/cut-list-ready/);
  await page.getByRole('button', { name: '↻ Повернуть' }).click();
  await expect(frame.locator('[data-testid="list"]')).toHaveClass(/cut-list-ready/);
});

for (const gap of ['10%', 'calc(10% + 12px)']) {
  test(`${gap} gap is resolved against the content width`, async ({ page }) => {
    await open(page);
    await page.evaluate((gap) => {
      const { roots, instances } = window.playground;
      roots[0].css({ width: 300, gap });
      roots[0].find('[data-item]').css({ width: 60, flexShrink: 0 });
      instances[0].redrawList();
    }, gap);
    await expectFits(page);
  });
}

test('a nested wrapper needs its own minimum width constraint', async ({ page }) => {
  await open(page, { context: 'nested-grid', safe: false, long: true });
  const overflowsParent = () =>
    page.evaluate(
      () =>
        window.playground.roots[0][0].getBoundingClientRect().right >
        window.playground.stage.getBoundingClientRect().right + 1,
    );
  await expect.poll(overflowsParent).toBe(true);
  await page.locator('.nav-slot').evaluate((element) => {
    element.style.minWidth = '0';
  });
  await expectFits(page);
});

test('switches between vertical mobile CSS and a horizontal desktop row without minWidth', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, { mobileStack: true });
  await expect(page.locator('[data-testid="list"] > [data-item]')).toHaveCount(8);
  await expect(page.locator('.cut-list__dropdown')).toBeHidden();
  await page.setViewportSize({ width: 844, height: 390 });
  await expectFits(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-testid="list"] > [data-item]')).toHaveCount(8);
});

test('keeps two instances independent when one is destroyed', async ({ page }) => {
  await open(page, { count: 2, context: 'grid', gap: 12 });
  await page.evaluate(() => window.playground.instances[0].destroy());
  const second = page.locator('[data-testid="list"]').nth(1);
  await second.locator('.cut-list__drop-toggle').click();
  await expect(second.locator('.cut-list__dropdown')).toHaveClass(/is-show/);
  await page.locator('.frame-note').click();
  await expect(second.locator('.cut-list__dropdown')).not.toHaveClass(/is-show/);
});

test('preserves widget handlers on links moved into the dropdown', async ({ page }) => {
  await open(page);
  await page.locator('.cut-list__drop-toggle').click();
  const link = page.locator('.cut-list__more-content > [data-item] > a').last();
  const title = await link.textContent();
  await link.click();
  await expect(page.locator('#clicked')).toHaveText(title);
});

test('opens above the trigger near the viewport bottom', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 390 });
  await open(page);
  await page.evaluate(() => {
    window.playground.stage.style.marginTop = '240px';
  });
  await page.locator('.cut-list__drop-toggle').click();
  await expect(page.locator('.cut-list__more')).toHaveClass(/is-top/);
  const more = await page.locator('.cut-list__more').boundingBox();
  expect(more.y).toBeGreaterThanOrEqual(0);
  expect(more.y + more.height).toBeLessThan(390);
});

test('long dropdown labels stay within the viewport and work in RTL', async ({ page }) => {
  await open(page, { long: true, rtl: true, gap: 12 });
  await expectFits(page);
  await page.locator('.cut-list__drop-toggle').click();
  const box = await page.locator('.cut-list__more').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(640);
});

test('keyboard opens, closes and returns focus to the toggle', async ({ page }) => {
  await open(page);
  const toggle = page.getByRole('button', { name: /Ещё/ });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('recalculates after font loading changes item widths without changing root width', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    window.playground.roots[0].find('[data-item] > a').css('fontSize', 40);
    document.fonts.dispatchEvent(new Event('loadingdone'));
  });
  await expectFits(page);
});

test('recalculates after an image inside an item finishes loading', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const image = new Image();
    window.playground.roots[0].find('[data-item="0"] > a')[0].append(image);
    image.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="16"></svg>')}`;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.playground.roots[0].find('.cut-list__more-content > [data-item="0"]').length,
      ),
    )
    .toBe(1);
});
