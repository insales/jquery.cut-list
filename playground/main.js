const form = document.querySelector('#controls');
const iframe = document.querySelector('#preview');
const slider = document.querySelector('#viewport-width');
let width = 960;
let height = 600;

function resize() {
  iframe.width = width;
  iframe.height = height;
  slider.value = width;
  document.querySelector('#dimensions').textContent = `${width} × ${height}`;
  document.querySelectorAll('[data-size]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.size === `${width},${height}`);
  });
}

function load() {
  const params = new URLSearchParams(new FormData(form));
  form
    .querySelectorAll('[type="checkbox"]')
    .forEach((input) => params.set(input.name, input.checked));
  iframe.src = `/playground/frame.html?${params}`;
}
form.addEventListener('change', load);
slider.addEventListener('input', () => {
  width = Number(slider.value);
  resize();
});
document.querySelector('#rotate').onclick = () => {
  [width, height] = [height, width];
  resize();
};
document.querySelectorAll('[data-size]').forEach((button) => {
  button.onclick = () => {
    [width, height] = button.dataset.size.split(',').map(Number);
    resize();
  };
});
document.querySelector('#reset').onclick = () => {
  form.reset();
  width = 960;
  height = 600;
  resize();
  load();
};
window.addEventListener('message', (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== iframe.contentWindow ||
    event.data?.type !== 'cut-list-state'
  ) {
    return;
  }
  const state = event.data.state;
  const container = document.querySelector('#state');
  container.replaceChildren();
  state.lists.forEach((list, index) => {
    const line = document.createElement('p');
    line.className = list.overflow && list.initialized ? 'warning' : '';
    line.textContent = `${index + 1}. ${list.initialized ? 'Активен' : 'Выключен'} · ${list.width} px · видно ${list.visible.length} · скрыто ${list.hidden.length}${list.overflow && list.initialized ? ' · переполнение' : ''}`;
    container.append(line);
  });
});
load();
