Разметка
--------

```
div - Cut list Node
	div - Элемент 1
	div - Элемент 2
	div - Элемент 3
	div - ...
```

Опции
-----

**moreBtnTitle:** - Текст кнопки "Еще". Default - "Еще". Можно передать html-строку

**alwaysVisibleElem:** - Селектор элемента, который не сворачивается в дополнительное меню. Может быть только 1 элемент (Если найдено несколько, то берется первый). Default - undefined

**showMoreOnHover:** - Показ дополнительного меню по наведению. Default - false

**risezeDelay:** - Задержка при ресайзе окна (мс). Default - 50

DEMO 1
------
```js
$(".cut-list").cutList({
	moreBtnTitle: 'MORE ...',
	alwaysVisibleElem: '.my-active'
});
```

```html
<div class="cut-list">
  <div><a href="#">Item 1</a></div>
  <div><a href="#">Item 2</a></div>
  <div><a href="#">Item 3</a></div>
  <div><a href="#">Item 4</a></div>
  <div><a href="#">Item 5</a></div>
  <div class="my-active"><a href="#">Item 6</a></div>
  <div><a href="#">Item 7</a></div>
  <div><a href="#">Item 8</a></div>
  <div><a href="#">Item 9</a></div>
  <div><a href="#">Item 10</a></div>
</div>
```
  

DEMO 2
------
```js
$(".cut-list2").cutList({
	moreBtnTitle: '<div class="my-class"><span>Icon +</span></div>',
	showMoreOnHover: true,
	risezeDelay: 100
});
``` 

```html
<ul class="cut-list2">
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
