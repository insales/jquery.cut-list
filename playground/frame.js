import $ from 'jquery';

window.jQuery = window.$ = $;
const params = new URLSearchParams(location.search);
const bundle = params.get('bundle');
if (bundle === 'minified') {
  await import('../dist/jquery.cut-list.min.js');
} else if (bundle === 'readable') {
  await import('../dist/jquery.cut-list.js');
} else {
  await import('../src/index.js');
}

document.querySelector('#version').textContent = `jQuery ${$.fn.jquery}`;
const context = params.get('context') || 'grid';
const stage = document.querySelector('#stage');
const logs = [];
const titles =
  params.get('long') === 'true'
    ? [
        'Главная',
        'Очень длинное название раздела без пробелов ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'Коллекции',
        'Доставка',
        'Контакты',
      ]
    : [
        'Главная',
        'Каталог',
        'Новинки',
        'Коллекции',
        'Доставка',
        'Оплата',
        'Контакты',
        'О магазине',
      ];
const roots = [];
const instances = [];
const options = {
  minWidth: Number(params.get('minWidth') || 0),
  showMoreOnHover: params.get('hover') === 'true',
  alwaysVisibleElem: params.get('priority') === 'false' ? undefined : '.is-current',
  moreBtnTitle: 'Ещё <span aria-hidden="true">⌄</span>',
  onOpen: () => log('Меню открыто'),
  onClose: () => log('Меню закрыто'),
};

function log(message) {
  logs.unshift(message);
  if (logs.length > 8) {
    logs.pop();
  }
}

for (let listIndex = 0; listIndex < Number(params.get('count') || 1); listIndex++) {
  const shell = $('<div class="header-shell"></div>').addClass(context).appendTo(stage);
  if (context !== 'block') {
    $('<div class="brand">SHOP</div>').appendTo(shell);
  }
  const parent = context.startsWith('nested')
    ? $('<div class="nav-slot"></div>')
        .toggleClass('safe', params.get('safe') !== 'false')
        .appendTo(shell)
    : shell;
  const root = $('<ul class="demo-list cut-list--wrap-dropdown" data-testid="list"></ul>').appendTo(
    parent,
  );
  root.css({
    gap: `${Number(params.get('gap') || 0)}px`,
    padding: `${Number(params.get('padding') || 0)}px`,
  });
  if (params.get('rtl') === 'true') {
    root.attr('dir', 'rtl');
  }
  if (params.get('mobileStack') === 'true') {
    root.addClass('mobile-stack');
  }
  titles.forEach((title, index) => {
    const item = $('<li></li>')
      .attr('data-item', index)
      .toggleClass('is-current', index === 3)
      .appendTo(root);
    $('<a href="#"></a>')
      .text(title)
      .appendTo(item)
      .on('click', (event) => {
        event.preventDefault();
        document.querySelector('#clicked').textContent = title;
      });
    if (index === 1) {
      item.append('<ul class="submenu"><li><a href="#">Подкатегория</a></li></ul>');
    }
  });
  if (context !== 'block') {
    $('<div class="tools">Корзина</div>').appendTo(shell);
  }
  roots.push(root);
}

if (params.get('hidden') === 'true') {
  stage.style.display = 'none';
}
roots.forEach((root) => instances.push(new window.InsalesCutList(root, options)));

function snapshot() {
  return {
    viewport: { width: innerWidth, height: innerHeight },
    jquery: $.fn.jquery,
    logs,
    lists: roots.map((root, index) => ({
      initialized: instances[index].initialized,
      width: Math.round(root.width()),
      visible: root
        .children('[data-item]')
        .map((_, element) => element.dataset.item)
        .get(),
      hidden: root
        .find('.cut-list__more-content > [data-item]')
        .map((_, element) => element.dataset.item)
        .get(),
      open: root.children('.cut-list__dropdown').hasClass('is-show'),
      overflow: root[0].scrollWidth > root[0].clientWidth + 1,
    })),
  };
}

function notify() {
  if (parent !== window) {
    parent.postMessage({ type: 'cut-list-state', state: snapshot() }, location.origin);
  }
}

window.playground = { roots, instances, options, snapshot, stage };
window.addEventListener('resize', notify);
const stateObserver = new MutationObserver(notify);
stateObserver.observe(stage, { childList: true, subtree: true, attributes: true });

document.querySelector('#show-container').onclick = () => {
  stage.style.display = stage.style.display === 'none' ? '' : 'none';
};
document.querySelector('#signal-resize').onclick = () => roots.forEach((root) => root.resize());
document.querySelector('#destroy').onclick = () => {
  instances.forEach((instance) => instance.destroy());
  notify();
};
document.querySelector('#setup').onclick = () => {
  instances.forEach((instance) => instance.setup());
  notify();
};
document.querySelector('#add').onclick = () => {
  roots.forEach((root) => {
    const index = root.find('[data-item]').length;
    $('<li><a href="#">Новый раздел</a></li>').attr('data-item', index).appendTo(root);
    root.resize();
  });
};
notify();
