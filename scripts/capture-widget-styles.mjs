import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = process.argv[2];
if (!source) {
  throw new Error('Pass the path to sys-w/widget_types. The sass CLI must be on PATH.');
}
const widgets = [];
for (const name of (await readdir(source)).sort()) {
  const directory = resolve(source, name);
  let javascript;
  try {
    javascript = await readFile(resolve(directory, 'snippet.js'), 'utf8');
  } catch {
    continue;
  }
  if (!javascript.includes('new InsalesCutList(')) continue;
  const scss = await readFile(resolve(directory, 'snippet.scss'), 'utf8');
  const liquid = await readFile(resolve(directory, 'snippet.liquid'), 'utf8');
  const navigation = [];
  for (const match of liquid.matchAll(/<ul\b[^>]*class="([^"]*\bjs-cut-list[^"]*)"[^>]*>/g)) {
    const item = liquid.slice(match.index + match[0].length).match(/<li\b[^>]*class="([\w -]+)/);
    if (!item) throw new Error(`No item class found for ${name}`);
    const itemClass = item[1]
      .trim()
      .split(/\s+/)
      .find((value) => value.endsWith('-item') || value.endsWith('__item'));
    if (!itemClass) throw new Error(`Unknown item class: ${item[1]}`);
    const base = itemClass.replace(/(?:-item|__item)$/, '');
    const separator = itemClass.endsWith('__item') ? '__' : '-';
    navigation.push({
      root: match[1],
      item: itemClass,
      link: base + separator + 'link',
      controls: base + separator + 'controls',
    });
  }
  const input = `@mixin background-color($name) { background-color: var(#{$name}); }\n[data-widget] {\n${scss}\n}`;
  const result = spawnSync(
    'sass',
    [
      '--stdin',
      '--no-source-map',
      '--style=compressed',
      '--silence-deprecation=legacy-js-api,color-functions,global-builtin,slash-div',
    ],
    { input, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(result.stderr || 'sass CLI unavailable');
  widgets.push({
    name,
    sha256: createHash('sha256').update(scss).update(liquid).update(javascript).digest('hex'),
    navigation,
    css: result.stdout.trim(),
    ...(name === 'system_widget_v4_collections_menu_1' ? { javascript } : {}),
  });
}
await writeFile(
  new URL('../browser-tests/fixtures/widget-styles.json', import.meta.url),
  JSON.stringify(
    {
      note: 'Navigation fragments only. Original SCSS scoped to [data-widget]. Platform background-color mixin replaced with background-color: var(...); platform runtime and Liquid are not rendered.',
      widgets,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Captured ${widgets.length} widgets, ${widgets.reduce((count, widget) => count + widget.navigation.length, 0)} navigation fragments.`,
);
