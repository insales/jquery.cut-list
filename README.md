# InsalesCutList

## Описание

`InsalesCutList` — это jQuery-плагин, предназначенный для обработки списков, содержащих слишком много элементов для отображения в одной строке. 
## Содержание

- [Инициализация](#инициализация)
- [Опции](#опции)
- [Примеры](#примеры)
  - [Инициализация через класс](#инициализация-через-класс)
  - [Пример использования с jQuery](#пример-использования-с-jquery)
- [Настройка minWidth](#настройка-minwidth)

## Инициализация

### Использование класса

Для инициализации плагина напрямую через класс:

```javascript
new InsalesCutList($(".cut-list"), {
  moreBtnTitle: 'MORE ...',
  alwaysVisibleElem: '.my-active'
});
```

### HTML Структура

Ожидаемая структура HTML для списка:

```html
<div class="cut-list">
  <div><a href="#">Item 1</a></div>
  <div><a href="#">Item 2</a></div>
  <div><a href="#">Item 3</a></div>
  <div><a href="#">Item 4</a></div>
</div>
```

## Опции

| Опция                 | Тип        | По умолчанию               | Описание |
|-----------------------|------------|----------------------------|-------------|
| `moreBtnTitle`        | `string`   | `'Еще'`                    | Текст кнопки "Еще". Может быть HTML строкой. |
| `showMoreOnHover`     | `boolean`  | `false`                    | Показ скрытых элементов при наведении мыши. |
| `alwaysVisibleElem`   | `string`   | `undefined`                | Селектор элемента, который всегда должен быть видимым. Только первый найденный элемент будет учтен. |
| `onBeforeCalc`        | `function` | `() => {}`                 | Колбек перед расчетом видимых/скрытых элементов. |
| `onBeforeOpen`        | `function` | `() => {}`                 | Колбек перед открытием выпадающего списка. |
| `onOpen`              | `function` | `() => {}`                 | Колбек при открытии выпадающего списка. |
| `onBeforeClose`       | `function` | `() => {}`                 | Колбек перед закрытием выпадающего списка. |
| `onClose`             | `function` | `() => {}`                 | Колбек при закрытии выпадающего списка. |
| `resizeDelay`         | `number`   | `50`                       | Задержка в мс для дебаунса события resize. |
| `minWidth`            | `number`   | `null`                     | Минимальная ширина экрана для инициализации плагина. Если ширина экрана ниже этого значения, плагин не будет инициализирован. |

## Примеры

### Инициализация через класс

```javascript
new InsalesCutList($(".cut-list"), {
  moreBtnTitle: '<span class="icon icon-ellipsis"></span>',
  alwaysVisibleElem: '.is-current'
  showMoreOnHover: true,
  minWidth: 768 // Минимальная ширина экрана для инициализации
});
```

HTML:

```html
<ul class="cut-list">
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
  <li>Item 4</li>
  <li>Item 5</li>
  <li class="my-active">Item 6</li>
  <li>Item 7</li>
  <li>Item 8</li>
  <li>Item 9</li>
  <li>Item 10</li>
</ul>
```

### Пример использования с jQuery

```javascript
$(".cut-list").cutList({
  moreBtnTitle: 'MORE ...',
  alwaysVisibleElem: '.my-active'
});
```

## Настройка minWidth

Настройка `minWidth` позволяет определить, следует ли инициализировать плагин в зависимости от текущей ширины экрана. 

- **Если установлено значение minWidth и ширина экрана меньше minWidth:**
  - Плагин **не будет инициализирован** или будет уничтожен, если уже был инициализирован.
  
- **Когда ширина экрана становится больше или равна minWidth:**
  - Плагин **будет инициализирован**, если его до этого не было.

#### Пример кода

В этом примере настройка `minWidth` установлена на 768 пикселей. Плагин будет инициализирован только на экранах шириной не менее 768 пикселей.

```javascript
new InsalesCutList($(".cut-list"), {
  moreBtnTitle: '<div class="my-class"><span>Icon +</span></div>',
  showMoreOnHover: true,
  minWidth: 768
});
```