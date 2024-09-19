(function($, window, document) {
  const defaults = {
    moreBtnTitle: 'Еще',
    showMoreOnHover: false,
    alwaysVisibleElem: undefined,
    onBeforeCalc: function() {},
    onBeforeOpen: function() {},
    onOpen: function() {},
    onBeforeClose: function() {},
    onClose: function() {},
    resizeDelay: 50,
    minWidth: null // настройка для минимальной ширины экрана
  };

  const WINDOW_RESIZE_DEBOUNCE_DELAY = 300;

  class InsalesCutList {
    constructor(elements, options) {
      this.elements = $(elements);
      this.options = $.extend({}, defaults, options);
      this.resizeTimeoutObserver = null;
      this.resizeTimeoutWindow = null;
      this.initState = this.elements.clone(true);
      this.observers = [];
      this.initialized = false;

      if (this.options.minWidth && this.options.minWidth > 0) {
        this.checkScreenWidth();
        this.setupWindowResizeHandler();
      } else {
        this.init();
      }
      this.setupObservers();
    }

    checkScreenWidth() {
      const currentWidth = $(window).width();
      const isBelowMinWidth = (this.options.minWidth && this.options.minWidth > 0) ? currentWidth <= this.options.minWidth : false;

      if (isBelowMinWidth && this.initialized) {
        this.destroy();
        return;
      }

      if (!isBelowMinWidth && !this.initialized) {
        this.init();
      }
    }

    updateDocumentClickHandler() {
      $(document).off("click", this.documentClickHandler);
      $(document).on("click", this.documentClickHandler.bind(this));
    }

    documentClickHandler(event) {
      if (!$(event.target).closest(".cut-list__dropdown").length) {
        this.options.onBeforeClose(this.elements);
        $(".cut-list__dropdown.is-show")
          .removeClass("is-show")
          .find(".cut-list__more")
          .hide()
          .removeClass("is-top is-left");
        this.options.onClose(this.elements);
      }
    }

    init() {
      this.elements.each((index, element) => {
        $(element).addClass("cut-list-ready");
        const $this = $(element);
        this.setup($this);
      });

      this.initialized = true;
      this.updateDocumentClickHandler();
    }

    setup(obj) {
      if (!obj.find(".cut-list__dropdown").length) {
        this.createDropdownElements(obj);
      }

      obj.addClass("cut-list").children().each(function(index) {
        $(this).attr("data-index", index).addClass("cut-list__elem");
      });

      let limit = obj.find(".cut-list__elem").length;
      let alwaysVisibleIndex = obj.find(this.options.alwaysVisibleElem + ':first').index();

      if (obj.find(this.options.alwaysVisibleElem).length > 1) {
        console.log("Внимание! Вами назначено несколько alwaysVisibleElem, будет использоваться только первый.");
      }

      this.create(obj, alwaysVisibleIndex, limit);
      this.setEventHandlers(obj);
    }

    createDropdownElements(obj) {
      obj.append('<div style="display:none" class="cut-list__elem cut-list__dropdown"></div>')
      .find(".cut-list__dropdown")
      .append('<div class="cut-list__drop"></div>')
      .find(".cut-list__drop")
      .append(`<div class="cut-list__drop-toggle">${this.options.moreBtnTitle}</div>`)
      .append('<div class="cut-list__more"><div class="cut-list__more-content"></div></div>');
    }

    setEventHandlers(obj) {
      const options = this.options;
      if (options.showMoreOnHover) {
        this.addHoverHandlers(obj);
      } else {
        this.addClickHandlers(obj);
      }
    }

    addHoverHandlers(obj) {
      obj.find(".cut-list__drop").hover(
        () => {
          obj.find(".cut-list__dropdown").addClass("is-show");
          this.showMore(obj.find(".cut-list__dropdown .cut-list__more"), obj);
        },
        () => {
          this.options.onBeforeClose(obj);
          obj.find(".cut-list__dropdown").removeClass("is-show")
          this.hideMore(obj.find(".cut-list__dropdown").find(".cut-list__more"));
          this.options.onClose(obj);
        }
      );
    }

    addClickHandlers(obj) {
      obj.find(".cut-list__drop-toggle").on("click", () => {
        const dropdown = obj.find(".cut-list__dropdown");
        const isShow = dropdown.toggleClass("is-show");
        if (isShow) {
          this.showMore(dropdown.find(".cut-list__more"), obj);
        } else {
          this.hideMore(dropdown.find(".cut-list__more"));
        }
      });
    }

    setupObservers() {
      this.removeObservers();

      this.elements.each((index, element) => {
        const observer = new ResizeObserver(() => {
          clearTimeout(this.resizeTimeoutObserver);
          this.resizeTimeoutObserver = setTimeout(() => this.redrawList(), this.options.resizeDelay);
        });
        observer.observe(element);
        this.observers.push(observer);
      });
    }

    setupWindowResizeHandler() {
      $(window).on('resize', this.debouncedHandleResize.bind(this));
    }

    debouncedHandleResize() {
      clearTimeout(this.resizeTimeoutWindow);
      this.resizeTimeoutWindow = setTimeout(() => {
        this.checkScreenWidth();
      }, WINDOW_RESIZE_DEBOUNCE_DELAY);
    }

    removeObservers() {
      this.observers.forEach(observer => observer.disconnect());
      this.observers = [];
    }

    redrawList() {
      if (this.initialized) {
        this.elements.each((index, element) => {
          const $element = $(element);
          $element.html(this.initState.eq(index).html());
          this.setup($element);
        });
      }
    }

    destroy() {
      this.removeObservers();
      $(document).off("click", this.documentClickHandler);
      this.elements.each((index, element) => {
        $(element).addClass("cut-list-ready");
        $(element).html(this.initState.eq(index).html());
      });
      this.initialized = false;
    }

    create(obj, alwaysVisibleIndex, limit) {
      const areaWidth = obj.innerWidth();
      let listWidth = obj.find(".cut-list__dropdown").outerWidth(true);

      const findElemsSelector = this.getFindElemsSelector(alwaysVisibleIndex);

      if (alwaysVisibleIndex != -1) {
        listWidth += this.getOuterWidthWithMargin(obj.find(this.options.alwaysVisibleElem + ':first'));
      }

      const elements = obj.find(findElemsSelector);
      const shouldShowMoreItems = this.shouldShowMoreItems(elements, listWidth, areaWidth, alwaysVisibleIndex);

      if (shouldShowMoreItems) {
        this.move(obj, this.position, limit);
        obj.addClass("with-more-items").find(".cut-list__dropdown").show();
      } else {
        obj.removeClass("with-more-items").find(".cut-list__dropdown").hide();
      }
    }

    getFindElemsSelector(alwaysVisibleIndex) {
      return alwaysVisibleIndex === -1
        ? '.cut-list__elem:not(".cut-list__dropdown")'
        : `.cut-list__elem:not(".cut-list__dropdown, ${this.options.alwaysVisibleElem}:first")`;
    }

    shouldShowMoreItems(elements, initialListWidth, areaWidth, alwaysVisibleIndex) {
      let listWidth = initialListWidth;

      for (let index = 0; index < elements.length; index++) {
        const element = $(elements[index]);
        listWidth += this.getOuterWidthWithMargin(element);

        if (listWidth >= areaWidth) {
          this.position = alwaysVisibleIndex !== -1 && index > alwaysVisibleIndex
            ? index + 1
            : index;

          return true;
        }
      }
      return false;
    }

    getOuterWidthWithMargin(element) {
      const marginLeft = parseInt(element.css('margin-left'), 10) || 0;
      const marginRight = parseInt(element.css('margin-right'), 10) || 0;
      return element.outerWidth() + marginLeft + marginRight;
    }

    move(obj, position, limit) {
      const findElemsSelector = this.getFindElemsSelector(this.alwaysVisibleIndex);

      for (let x = position; x <= limit; x++) {
        obj.find(`${findElemsSelector}[data-index="${x}"]`).appendTo(obj.find(".cut-list__more-content"));
      }

      if (this.alwaysVisibleIndex != -1) {
        this.handleRemainingAlwaysVisibleElement(obj);
      }
    }

    handleRemainingAlwaysVisibleElement(obj) {
      const areaWidth = obj.innerWidth();
      const firstElement = obj.find(".cut-list__elem:first");
      const isFirstElementAlwaysVisible = firstElement.is(this.options.alwaysVisibleElem);

      if (isFirstElementAlwaysVisible) {
        let listWidth = obj.find(".cut-list__dropdown").outerWidth(true) +
                        this.getOuterWidthWithMargin(firstElement);

        if (listWidth >= areaWidth) {
          const alwaysVisibleIndex = firstElement.data("index");
          obj.find(`.cut-list__elem:not(".cut-list__dropdown")[data-index="${alwaysVisibleIndex}"]`)
             .appendTo(obj.find(".cut-list__more-content"));
        }
      }
    }

    hideMore(moreBlock) {
      $(moreBlock).hide().removeClass("is-top is-left")
    }

    showMore(moreBlock, obj) {
      const windowHeight = $(window).height();
      const documentHeight = $(document).height();
      const scrollTop = $(window).scrollTop();
      const moreBlockHeight = moreBlock.outerHeight();
      const triggerBottom = obj.offset().top + obj.outerHeight();

      moreBlock.css("visibility", "hidden").show();
      this.options.onBeforeCalc(obj);

      // Вычисляем свободное пространство ниже триггерного объекта
      const spaceBelow = documentHeight - triggerBottom;
      // Вычисляем свободное пространство выше триггерного объекта
      const spaceAbove = obj.offset().top - scrollTop;
      // Вычисляем видимое пространство ниже триггерного объекта
      const visibleSpaceBelow = windowHeight - (triggerBottom - scrollTop);

      // Проверяем, помещается ли блок ниже триггерного объекта
      const fitsBelow = spaceBelow >= moreBlockHeight;
      // Проверяем, помещается ли блок выше триггерного объекта
      const fitsAbove = spaceAbove >= moreBlockHeight;
      // Проверяем, помещается ли блок в видимой области ниже триггерного объекта
      const visiblyFitsBelow = visibleSpaceBelow >= moreBlockHeight;

      // Определяем позицию блока (сверху или снизу)
      moreBlock.toggleClass("is-top", !visiblyFitsBelow && fitsAbove || !fitsBelow && fitsAbove);
      moreBlock.toggleClass("is-left", moreBlock.offset().left < 0);

      this.options.onBeforeOpen(obj);
      moreBlock.css("visibility", "visible");
      this.options.onOpen(obj);
    }
  }

  $.fn.cutList = function(options) {
    return this.each(function() {
      if (!$.data(this, 'InsalesCutList')) {
        $.data(this, 'InsalesCutList', new InsalesCutList(this, options));
      }
    });
  };

  $.fn.cutList.setup = function(elments, options = {}) {
    return $(elments).each(function() {
      const instance = $.data(this, 'InsalesCutList');
      if (instance) {
        instance.init();
      } else {
        $.data(this, 'InsalesCutList', new InsalesCutList(this, options));
      }
    });
  };

  $.fn.cutList.destroy = function(elments) {
    return $(elments).each(function() {
      const instance = $.data(this, 'InsalesCutList');
      if (instance) {
        instance.destroy();
      }
    });
  };

  window.InsalesCutList = InsalesCutList;
})(jQuery, window, document);
