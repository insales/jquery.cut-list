import { defaults } from './defaults.js';
import { CutList } from './list.js';
import { ResizeController } from './resize-controller.js';

export const DATA_KEY = 'InsalesCutList';
let nextInstanceId = 0;

export function createInsalesCutList($, window, document) {
  return class InsalesCutList {
    constructor(elements, options) {
      this.elements = $([...new Set($(elements).toArray())]);
      this.suspendedElements = new Set();
      this.options = $.extend({}, defaults, options);
      this.namespace = `.cutList${++nextInstanceId}`;
      this.lists = [];
      this.initialized = false;
      this.destroyed = false;

      this.resize = new ResizeController({
        $,
        window,
        document,
        elements: this.elements,
        namespace: this.namespace,
        delay: this.options.resizeDelay,
        onResize: () => this.checkScreenWidth(),
      });

      this.handleDocumentClick = (event) => this.closeOutsideDropdowns(event.target);
      this.handleDocumentKeydown = (event) => {
        if (event.key === 'Escape') {
          this.lists.forEach((list) => list.dropdown.closeAndFocus());
        }
      };

      this.claimElements();
      this.checkScreenWidth();
    }

    claimElements() {
      const previousOwners = new Set(
        this.elements.toArray().map((element) => $.data(element, DATA_KEY)),
      );

      previousOwners.forEach((owner) => owner?.releaseElements(this.elements));
      this.elements.each((index, element) => $.data(element, DATA_KEY, this));
    }

    checkScreenWidth() {
      if (this.destroyed || this.activeElements.length === 0) {
        return;
      }

      const belowMinWidth = this.options.minWidth > 0 && $(window).width() <= this.options.minWidth;
      if (belowMinWidth) {
        this.teardownLists();
        this.resize.start();
      } else if (this.initialized) {
        this.redrawList();
      } else {
        this.initializeActiveLists();
      }
    }

    get activeElements() {
      return this.elements.filter((index, element) => !this.suspendedElements.has(element));
    }

    initializeActiveLists() {
      const existing = new Set(this.lists.map((list) => list.element[0]));
      this.activeElements.each((index, element) => {
        if (!existing.has(element)) {
          this.lists.push(new CutList($, element, this.options, this.namespace));
        }
      });
      this.initialized = this.lists.length > 0;
      if (!this.initialized) {
        return;
      }

      $(document)
        .off(this.namespace)
        .on(`click${this.namespace}`, this.handleDocumentClick)
        .on(`keydown${this.namespace}`, this.handleDocumentKeydown);

      this.resize.start();
      this.resize.observe();
    }

    init() {
      this.teardownLists();
      this.destroyed = false;
      this.suspendedElements.clear();
      this.resize.setElements(this.elements);
      this.initializeActiveLists();
    }

    setup() {
      this.destroyed = false;
      this.suspendedElements.clear();
      this.resize.setElements(this.elements);
      if (
        this.initialized &&
        !(this.options.minWidth > 0 && $(window).width() <= this.options.minWidth)
      ) {
        this.initializeActiveLists();
      }
      this.checkScreenWidth();
    }

    setupElements(elements) {
      this.elements
        .filter(elements)
        .each((index, element) => this.suspendedElements.delete(element));
      if (this.activeElements.length === 0) {
        return;
      }

      this.destroyed = false;
      this.resize.setElements(this.activeElements);
      if (this.options.minWidth > 0 && $(window).width() <= this.options.minWidth) {
        this.teardownLists();
        this.resize.start();
      } else {
        const selectedLists = this.lists.filter((list) => $(elements).is(list.element));
        this.initializeActiveLists();
        selectedLists.forEach((list) => list.redraw());
      }
    }

    destroyElements(elements) {
      const removed = this.elements.filter(elements);
      removed.each((index, element) => this.suspendedElements.add(element));
      this.removeLists(removed);
      this.resize.setElements(this.activeElements);
      if (this.activeElements.length === 0) {
        this.destroy();
      }
    }

    removeLists(elements) {
      this.lists = this.lists.filter((list) => {
        if (!elements.is(list.element)) {
          return true;
        }

        list.destroy();
        return false;
      });
      this.initialized = this.lists.length > 0;
      if (!this.initialized) {
        $(document).off(this.namespace);
      }
    }

    redrawList() {
      if (this.initialized) {
        this.lists.forEach((list) => list.redraw());
      }
    }

    closeOutsideDropdowns(target) {
      this.lists.forEach((list) => {
        if (!list.dropdown.contains(target)) {
          list.dropdown.close();
        }
      });
    }

    releaseElements(elements) {
      const removed = this.elements.filter(elements);

      this.removeLists(removed);
      removed.each((index, element) => this.suspendedElements.delete(element));
      this.elements = this.elements.not(removed);
      this.resize.setElements(this.activeElements);

      if (this.activeElements.length === 0) {
        this.destroy();
      }
    }

    teardownLists() {
      this.resize.unobserve();
      $(document).off(this.namespace);
      this.lists.forEach((list) => list.destroy());
      this.lists = [];
      this.initialized = false;
    }

    destroy() {
      this.destroyed = true;
      this.elements.each((index, element) => this.suspendedElements.add(element));
      this.resize.stop();
      this.teardownLists();
    }
  };
}
