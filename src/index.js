import { createInsalesCutList, DATA_KEY } from './insales-cut-list.js';

const $ = window.jQuery;
const InsalesCutList = createInsalesCutList($, window, document);

$.fn.cutList = function (options) {
  return this.each(function () {
    if (!$.data(this, DATA_KEY)) {
      new InsalesCutList(this, options);
    }
  });
};

$.fn.cutList.setup = function (elements, options = {}) {
  return $(elements).each(function () {
    const instance = $.data(this, DATA_KEY);
    if (instance) {
      instance.setupElements(this);
    } else {
      new InsalesCutList(this, options);
    }
  });
};

$.fn.cutList.destroy = function (elements) {
  return $(elements).each(function () {
    const instance = $.data(this, DATA_KEY);
    if (instance) {
      instance.destroyElements(this);
    }
  });
};

window.InsalesCutList = InsalesCutList;
