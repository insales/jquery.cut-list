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
    resizeDelay: 50
  };

  const extend = (defaults, options) => Object.assign({}, defaults, options);

  class InsalesCutList {
    constructor(element, options) {
      this.element = $(element);
      this.options = extend(defaults, options);
      this.resizeTimeout = null;
      this.initState = this.element.clone(true);
      this.currentVisibleItems = [];
      this.currentStyles = [];
      this.init();

      this.setupObserver();
    }

    init() {
      const $this = this.element;
      const options = this.options;

      this.setup($this);

      $(document).on("click", (event) => {
        if ($(event.target).closest(".cut-list__dropdown").length) return;

        options.onBeforeClose($this);
        $(".cut-list__dropdown.is-show")
          .removeClass("is-show")
          .find(".cut-list__more")
          .hide()
          .removeClass("is-top is-left");
        options.onClose($this);
      });
    }

    setup(obj) {
      const options = this.options;

      if (!obj.find(".cut-list__dropdown").length) {
        obj.append('<div style="display:none" class="cut-list__elem cut-list__dropdown"></div>')
          .find(".cut-list__dropdown")
          .append('<div class="cut-list__drop"></div>')
          .find(".cut-list__drop")
          .append(`<div class="cut-list__drop-toggle">${options.moreBtnTitle}</div>`)
          .append('<div class="cut-list__more"><div class="cut-list__more-content"></div></div>');
      }

      obj.addClass("cut-list").children().each(function(index) {
        $(this).attr("data-index", index).addClass("cut-list__elem");
      });

      let limit = obj.find(".cut-list__elem").length;
      let alwaysVisibleIndex = obj.find(options.alwaysVisibleElem + ':first').index();

      if (obj.find(options.alwaysVisibleElem).length > 1)
        console.log("Внимание! Вами назначено несколько alwaysVisibleElem, будет использоваться только первый.");

      this.create(obj, alwaysVisibleIndex, limit);

      if (options.showMoreOnHover) {
        obj.find(".cut-list__drop").hover(
          () => {
            obj.find(".cut-list__dropdown").addClass("is-show");
            this.showMore(obj.find(".cut-list__dropdown .cut-list__more"), obj);
          },
          () => {
            options.onBeforeClose(obj);
            obj.find(".cut-list__dropdown").removeClass("is-show").find(".cut-list__more").hide().removeClass("is-top is-left");
            options.onClose(obj);
          }
        );
      } else {
        obj.find(".cut-list__drop-toggle").on("click", () => {
          const dropdown = obj.find(".cut-list__dropdown");
          if (dropdown.is(".is-show")) {
            dropdown.removeClass("is-show").find(".cut-list__more").hide().removeClass("is-top is-left");
          } else {
            dropdown.addClass("is-show");
            this.showMore(dropdown.find(".cut-list__more"), obj);
          }
        });
      }
    }

    setupObserver() {
      if (this.observer) {
          this.observer.disconnect();
      }
      this.observer = new ResizeObserver(() => this.resizeHandle());
      this.observer.observe(this.element[0]);
    }

    resizeHandle() {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.checkForResize(), this.options.resizeDelay);
    }

    checkForResize() {
      const visibleItems = this.getVisibleItems();
      const currentStyles = this.getCurrentStyles();

      if (!this.arraysEqual(this.currentVisibleItems, visibleItems) || !this.arraysEqual(this.currentStyles, currentStyles)) {
        this.currentVisibleItems = visibleItems;
        this.currentStyles = currentStyles;
        this.reset();
      }
    }

    arraysEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return false;
      if (a.length !== b.length) return false;

      for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }

    getVisibleItems() {
      const items = [];
      this.element.find('.cut-list__elem:not(".cut-list__dropdown")').each(function() {
        items.push($(this).data('index'));
      });
      return items;
    }

    getCurrentStyles() {
      const styles = [];
      this.element.find('.cut-list__elem:not(".cut-list__dropdown")').each(function() {
        const element = $(this);
        const computedStyle = window.getComputedStyle(element[0]);

        styles.push({
          width: computedStyle.width,
          height: computedStyle.height,
          marginLeft: computedStyle.marginLeft,
          marginRight: computedStyle.marginRight,
          paddingLeft: computedStyle.paddingLeft,
          paddingRight: computedStyle.paddingRight,
        });
      });
      return styles;
    }

    reset() {
      const newElement = this.initState.clone(true); // Создаем новый клон состояния
      this.element.replaceWith(newElement); // Заменяем текущий элемент DOM новым клоном
      this.element = newElement; // Обновляем ссылку на элемент
      this.setupObserver(); // Переинициализация наблюдателя
      this.init(); // Переинициализация
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

      // Если остался видимый 1 элемент и он является alwaysVisibleElem тогда скрываем его
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

    showMore(moreBlock, obj) {
      const documentHeight = $(document).outerHeight(true);

      moreBlock.css("visibility", "hidden").show();
      this.options.onBeforeCalc(obj);

      if ((moreBlock.offset().top + moreBlock.innerHeight()) > documentHeight) {
        moreBlock.addClass("is-top");
      }

      if (moreBlock.offset().left < 0) {
        moreBlock.addClass("is-left");
      }

      this.options.onBeforeOpen(obj);
      moreBlock.css("visibility", "visible");
      this.options.onOpen(obj);
    }

    destroy() {
      this.element.html(this.element.clone().html());
      this.observer.disconnect();
    }
  }

  $.fn.cutList = function(options) {
    return this.each(function() {
      new InsalesCutList(this, options);
    });
  };

  window.InsalesCutList = InsalesCutList;
})(jQuery, window, document);
