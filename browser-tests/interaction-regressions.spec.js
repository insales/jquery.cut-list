import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 650 });
  await page.goto('/playground/frame.html?context=block&priority=false');
  await page.waitForFunction(() => Boolean(window.playground));
});

test('resize returns focus from a closed dropdown to its toggle', async ({ page }) => {
  const toggle = page.locator('.cut-list__drop-toggle');
  await toggle.click();
  await page.locator('.cut-list__more-content > [data-item] > a').last().focus();

  await page.evaluate(() => window.playground.roots[0].resize());

  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('a focused hidden link keeps focus when it returns to the visible row', async ({ page }) => {
  await page.locator('.cut-list__drop-toggle').click();
  const link = page.locator('[data-item="7"] > a');
  await link.focus();

  await page.evaluate(() => {
    window.playground.roots[0].width(1500);
    window.playground.instances[0].redrawList();
  });

  await expect(link).toBeFocused();
  await expect(page.locator('[data-testid="list"] > [data-item="7"] > a')).toBeVisible();
});

test('crossing minWidth preserves focus on a link restored from the dropdown', async ({ page }) => {
  await page.locator('.cut-list__drop-toggle').click();
  const link = page.locator('[data-item="7"] > a');
  await link.focus();

  await page.evaluate(() => {
    const instance = window.playground.instances[0];
    instance.options.minWidth = 767;
    instance.checkScreenWidth();
  });

  await expect(page.locator('.cut-list__dropdown')).toHaveCount(0);
  await expect(link).toBeFocused();
});

test('third-party handlers survive moving a link into More, back, and destroying the plugin', async ({
  page,
}) => {
  await page.evaluate(() => {
    const root = window.playground.roots[0];
    const link = root.find('[data-item="7"] > a')[0];
    window.widgetClicks = { native: 0, jquery: 0, delegated: 0 };
    window.widgetLink = link;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.widgetClicks.native++;
    });
    window.$(link).on('click.widget', () => window.widgetClicks.jquery++);
    root.on('click.widget', '[data-item="7"] > a', () => window.widgetClicks.delegated++);
  });

  const link = page.locator('[data-item="7"] > a');
  for (let count = 1; count <= 4; count++) {
    if (count === 1 || count === 3) {
      await page.locator('.cut-list__drop-toggle').click();
      await expect(page.locator('.cut-list__more-content [data-item="7"] > a')).toBeVisible();
    }
    await link.click();
    expect(await page.evaluate(() => window.widgetClicks)).toEqual({
      native: count,
      jquery: count,
      delegated: count,
    });
    expect(await link.evaluate((element) => element === window.widgetLink)).toBe(true);

    if (count < 3) {
      await page.evaluate(
        (width) => {
          window.playground.roots[0].width(width);
          window.playground.instances[0].redrawList();
        },
        count === 1 ? 1500 : 400,
      );
    } else if (count === 3) {
      await page.evaluate(() => window.playground.instances[0].destroy());
      await expect(page.locator('.cut-list__dropdown')).toHaveCount(0);
    }
  }
});
