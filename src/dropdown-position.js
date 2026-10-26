export function getDropdownPosition({
  dropdownHeight,
  dropdownLeft,
  triggerTop,
  triggerBottom,
  scrollTop,
  viewportHeight,
  documentHeight,
}) {
  const fitsAbove = triggerTop - scrollTop >= dropdownHeight;
  const fitsInViewportBelow = viewportHeight - (triggerBottom - scrollTop) >= dropdownHeight;
  const fitsInDocumentBelow = documentHeight - triggerBottom >= dropdownHeight;

  return {
    above: fitsAbove && (!fitsInViewportBelow || !fitsInDocumentBelow),
    alignLeft: dropdownLeft < 0,
  };
}
