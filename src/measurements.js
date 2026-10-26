export function getColumnGap($, element) {
  const value = element.css('column-gap');
  if (!value || value === 'normal') {
    return 0;
  }

  if (value.endsWith('px')) {
    return parseFloat(value) || 0;
  }

  if (value.endsWith('%')) {
    return ((parseFloat(value) || 0) * element.width()) / 100;
  }

  const probe = $('<div></div>')
    .css({
      width: value,
      flex: '0 0 auto',
      height: 0,
      minWidth: 0,
      maxWidth: 'none',
      padding: 0,
      margin: 0,
      border: 0,
      visibility: 'hidden',
    })
    .appendTo(element);
  const width = probe.width();
  probe.remove();
  return width;
}
