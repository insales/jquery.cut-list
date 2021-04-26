(function($) {
  $.fn.cutList = function() {
    var defaults = {
      moreBtnTitle: 'Еще',
      showMoreOnHover: false,
      alwaysVisibleElem: undefined,
      risezeDelay: 50
    }
    
    var options = extend(defaults, arguments[0]);
    
    function extend(defaults, options ) {
      var extended = {};
      var prop;
      
      for (prop in defaults) {
        if (Object.prototype.hasOwnProperty.call(defaults, prop)) {
          extended[prop] = defaults[prop];
        }
      }
      for (prop in options) {
        if (Object.prototype.hasOwnProperty.call(options, prop)) {
          extended[prop] = options[prop];
        }
      }
  
      return extended;
    };
        
    return this.each(function() {
      var $this = $(this),
          limit,
          position,
          areaWidth,
          listWidth,
          alwaysVisibleIndex,
          resizeTimeout;

      setup($this);

      function setup(obj) {
        if (!obj.find(".cut-list__dropdown").length) {
          obj.append('<div style="display:none" class="cut-list__elem cut-list__dropdown"></div>')
            .find(".cut-list__dropdown")
            .append('<div class="cut-list__drop"></div>')
            .find(".cut-list__drop")
            .append('<div class="cut-list__drop-toggle">' + options.moreBtnTitle + '</div>')
            .append('<div class="cut-list__more"><div class="cut-list__more-content"></div></div>');
        }
  
        obj.addClass("cut-list").children().each(function(index) {
          $(this).attr("data-index", index).addClass("cut-list__elem");
        });
  
        limit = obj.find(".cut-list__elem").length;
        index = limit - 1;
        
        if (obj.find(options.alwaysVisibleElem).length > 1)
          console.log("Внимание! Вами назначено несколько alwaysVisibleElem, будет использоваться только первый.");
        
        alwaysVisibleIndex = obj.find(options.alwaysVisibleElem + ':first').index();
        
        create(obj);
        
        if (options.showMoreOnHover) {
          obj.find(".cut-list__drop").hover(
          function(){
            $(this).parents(".cut-list__dropdown").addClass("is-show");
            showMore($(this).parents(".cut-list__dropdown").find(".cut-list__more"));
          },
          function(){
            $(this).parents(".cut-list__dropdown").removeClass("is-show").find(".cut-list__more").hide().removeClass("is-top is-left");
          });
        }
        else {
          obj.find(".cut-list__drop-toggle").on("click", function(){
            if ($(this).parents(".cut-list__dropdown").is(".is-show")){
              $(this).parents(".cut-list__dropdown").removeClass("is-show").find(".cut-list__more").hide().removeClass("is-top is-left");
            }
            else {
              $(this).parents(".cut-list__dropdown").addClass("is-show");
              showMore($(this).parents(".cut-list__dropdown").find(".cut-list__more"));
            }
          });
          
          $(document).on("click", function(event) {
            if ($(event.target).closest(".cut-list__dropdown").length)
              return;
            
            $(".cut-list__dropdown.is-show").removeClass("is-show").find(".cut-list__more").hide().removeClass("is-top is-left");
          });
        }
      }
      
      function reset(obj) {
        position = limit;
  
        $.when(backToStartingPlace(obj)).done(function() {
          create(obj);
        });
      }
      
      function backToStartingPlace(obj) {
        var more_elems = obj.find(".cut-list__more .cut-list__elem");
        
        more_elems.each(function() {
          var elem_index = $(this).data("index");
          
          if (elem_index == 0)
            $(this).prependTo(obj);
          else
            $(this).insertAfter( obj.find('.cut-list__elem[data-index="' + (elem_index - 1) + '"]'));
        });
      }

      function create(obj) {
        areaWidth = obj.innerWidth();
        listWidth = obj.find(".cut-list__dropdown").outerWidth(true);
        
        var find_elems = '.cut-list__elem:not(".cut-list__dropdown")';
        
        if (alwaysVisibleIndex != -1) {
          listWidth += obj.find(options.alwaysVisibleElem + ':first').outerWidth(true);
          find_elems = '.cut-list__elem:not(".cut-list__dropdown,' + options.alwaysVisibleElem + ':first")';
        }
      
        obj.find(find_elems).each(function(index) {
          listWidth += $(this).outerWidth(true);

          if (listWidth >= areaWidth) {
            if (alwaysVisibleIndex != -1) {
              if (index > alwaysVisibleIndex)
                position = index + 1; // так как alwaysVisibleIndex не участвует тут и его ширина прибавлена отдельно
              else
                position = index;
            }
            else
              position = index;
                        
            move(obj, position);
            obj.addClass("with-more-items").find(".cut-list__dropdown").show();
                        
            return false;
          } 
          else {
            obj.removeClass("with-more-items").find(".cut-list__dropdown").hide();
          }
        });
      }

      function move(obj, position) {
        var find_elems = '.cut-list__elem:not(".cut-list__dropdown")';
        
        if (alwaysVisibleIndex != -1)
          find_elems = '.cut-list__elem:not(".cut-list__dropdown,' + options.alwaysVisibleElem + ':first")';
        
        for (x = position; x <= limit; x++) {
          obj.find(find_elems + '[data-index="' + x + '"]').appendTo(obj.find(".cut-list__more-content"));
        }
        
        /* Если остался видимым 1 элемент и он является alwaysVisibleElem тогда скрываем его */
        if (alwaysVisibleIndex != -1) {
          if (obj.find(".cut-list__elem:first").is(options.alwaysVisibleElem)) {
            areaWidth = obj.innerWidth();
            listWidth = obj.find(".cut-list__dropdown").outerWidth(true) + obj.find(options.alwaysVisibleElem + ':first').outerWidth(true);
            
            if (listWidth >= areaWidth) {
              obj.find('.cut-list__elem:not(".cut-list__dropdown")[data-index="' + obj.find(options.alwaysVisibleElem + ':first').data("index") + '"]').appendTo(obj.find(".cut-list__more-content"));
            } 
          }
        }
      }
      
      function showMore(moreBlock){
        var document_height = $(document).outerHeight(true);
          
        moreBlock.css("visibility", "hidden").show();   
            
        if ((moreBlock.offset().top + moreBlock.innerHeight()) > document_height)
          moreBlock.addClass("is-top");

        if (moreBlock.offset().left < 0)
          moreBlock.addClass("is-left");
        
        moreBlock.css("visibility", "visible");
      }

      $.fn.cutList.destroy = function() {
        $.when(backToStartingPlace($this)).done(function() {
          $this.find('.cut-list__dropdown ~ .cut-list__elem').remove()
          $this.find('.cut-list__dropdown').remove()
        });
      }
      
      $(window).resize(function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function(){reset($this)}, options.risezeDelay);
      });
    });
  };
})($);
