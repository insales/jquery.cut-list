# InsalesCutList

jQuery-плагин, который переносит не помещающиеся в строку пункты списка в меню «Ещё».
В виджетах InSales используется с jQuery 3.5.1.

## Подключение

Подключите jQuery, `jquery.cut-list.css` и `jquery.cut-list.min.js`.

```html
<ul class="js-cut-list">
  <li><a href="/">Главная</a></li>
  <li><a href="/collection/all">Каталог</a></li>
  <li><a href="/page/contacts">Контакты</a></li>
</ul>
```

```javascript
const list = new InsalesCutList($('.js-cut-list'), {
  moreBtnTitle: 'Ещё',
  alwaysVisibleElem: '.is-current',
  minWidth: 767,
});
```

Альтернатива: `$('.js-cut-list').cutList(options)`.

При `minWidth: 767` плагин работает на ширине окна больше 767 px. Создавайте
экземпляр на любой начальной ширине: он сам обработает resize и поворот устройства.
Без `minWidth` плагин работает на всех ширинах.

После изменения содержимого вызовите `list.redrawList()` или `$('.js-cut-list').resize()`.
Перед удалением списка вызовите `list.destroy()`. Для повторного запуска
с учётом `minWidth` используйте `list.setup()`.

Вложенной обёртке в grid/flex может потребоваться `min-width: 0`. Перенос длинных
названий в выпадающем меню включается отдельно классом `cut-list--wrap-dropdown`
на корне списка; по умолчанию сохраняется прежнее оформление.

## Разработка

Нужен Node.js 22.22.2+ в ветке 22, 24.15.0+ в ветке 24 или 26+.

```bash
npm ci
npm run dev          # плейграунд
npm run format       # Prettier
npm test             # форматирование, сборка и Vitest
npm run build        # обычная и минифицированная сборки через Vite
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

Изменяйте файлы в `src/`, затем пересобирайте браузерные файлы.
