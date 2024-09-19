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
    risezeDelay: 50
  };

  const extend = (defaults, options) => Object.assign({}, defaults, options);

  class InsalesCutList {
    constructor(element, options) {
      this.element = $(element);
      this.options = extend(defaults, options);
      this.init();
    }

    init() {
      const $this = this.element;
      const options = this.options;

      this.setup($this);

      $(window).on('resize', () => this.resizeHandle());

      $(document).on("click", (event) => {
        if ($(event.target).closest(".cut-list__dropdown").length) return;

        options.onBeforeClose($this);
        $(".cut-list__dropdown.is-show").removeClass("is-show").find(".cut-list__more").hide().removeClass("is-top is-left");
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
            $(obj).find(".cut-list__dropdown").addClass("is-show");
            this.showMore($(obj).find(".cut-list__dropdown .cut-list__more"), obj);
          },
          () => {
            options.onBeforeClose(obj);
            $(obj).find(".cut-list__dropdown").removeClass("is-show").find(".cut-list__more").hide().removeClass("is-top is-left");
            options.onClose(obj);
          }
        );
      } else {
        obj.find(".cut-list__drop-toggle").on("click", () => {
          const dropdown = $(obj).find(".cut-list__dropdown");
          if (dropdown.is(".is-show")) {
            dropdown.removeClass("is-show").find(".cut-list__more").hide().removeClass("is-top is-left");
          } else {
            dropdown.addClass("is-show");
            this.showMore(dropdown.find(".cut-list__more"), obj);
          }
        });
      }
    }

    resizeHandle() {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.reset(this.element), this.options.risezeDelay);
    }

    reset(obj) {
      this.position = this.limit;

      $.when(this.backToStartingPlace(obj)).done(() => this.create(obj));
    }

    backToStartingPlace(obj) {
      const more_elems = obj.find(".cut-list__more .cut-list__elem");

      more_elems.each(function() {
        const elem_index = $(this).data("index");

        if (elem_index == 0) {
          $(this).prependTo(obj);
        } else {
          $(this).insertAfter(obj.find('.cut-list__elem[data-index="' + (elem_index - 1) + '"]'));
        }
      });
    }

    create(obj, alwaysVisibleIndex, limit) {
      let areaWidth = obj.innerWidth();
      let listWidth = obj.find(".cut-list__dropdown").outerWidth(true);

      let find_elems = '.cut-list__elem:not(".cut-list__dropdown")';

      if (alwaysVisibleIndex != -1) {
        listWidth += obj.find(this.options.alwaysVisibleElem + ':first').outerWidth(true);
        find_elems = `.cut-list__elem:not(".cut-list__dropdown, ${this.options.alwaysVisibleElem}:first")`;
      }

      obj.find(find_elems).each((index, element) => {
        listWidth += $(element).outerWidth(true);

        if (listWidth >= areaWidth) {
          this.position = alwaysVisibleIndex != -1 && index > alwaysVisibleIndex
            ? index + 1
            : index;

          this.move(obj, this.position, limit);
          obj.addClass("with-more-items").find(".cut-list__dropdown").show();
          return false; // прерывает each цикл
        } else {
          obj.removeClass("with-more-items").find(".cut-list__dropdown").hide();
        }
      });
    }

    move(obj, position, limit) {
      let find_elems = '.cut-list__elem:not(".cut-list__dropdown")';

      if (this.alwaysVisibleIndex != -1) {
        find_elems = `.cut-list__elem:not(".cut-list__dropdown, ${this.options.alwaysVisibleElem}:first")`;
      }

      for (let x = position; x <= limit; x++) {
        obj.find(`${find_elems}[data-index="${x}"]`).appendTo(obj.find(".cut-list__more-content"));
      }

      /* Если остался видимым 1 элемент и он является alwaysVisibleElem тогда скрываем его */
      if (this.alwaysVisibleIndex != -1) {
        if (obj.find(".cut-list__elem:first").is(this.options.alwaysVisibleElem)) {
          let areaWidth = obj.innerWidth();
          let listWidth = obj.find(".cut-list__dropdown").outerWidth(true) +
                          obj.find(`${this.options.alwaysVisibleElem}:first`).outerWidth(true);

          if (listWidth >= areaWidth) {
            obj.find(`.cut-list__elem:not(".cut-list__dropdown")[data-index="${obj.find(`${this.options.alwaysVisibleElem}:first`).data("index")}"]`)
               .appendTo(obj.find(".cut-list__more-content"));
          }
        }
      }
    }

    showMore(moreBlock, obj) {
      const document_height = $(document).outerHeight(true);

      moreBlock.css("visibility", "hidden").show();
      this.options.onBeforeCalc(obj);

      if ((moreBlock.offset().top + moreBlock.innerHeight()) > document_height) {
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
      $(window).off('resize', this.resizeHandle.bind(this));
    }
  }

  $.fn.cutList = function(options) {
    return this.each(function() {
      new InsalesCutList(this, options);
    });
  };

  window.InsalesCutList = InsalesCutList;
})(jQuery, window, document);
