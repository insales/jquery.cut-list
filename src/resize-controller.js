import { WINDOW_RESIZE_DEBOUNCE_DELAY } from './defaults.js';

export class ResizeController {
  constructor({ $, window, document, elements, namespace, delay, onResize }) {
    this.$ = $;
    this.window = window;
    this.document = document;
    this.elements = elements;
    this.namespace = namespace;
    this.delay = delay;
    this.onResize = onResize;
    this.observers = [];
    this.timers = new Map();
    this.listening = false;

    this.handleContentResize = () => this.schedule('content', this.delay);
    this.handleWindowResize = (event) => {
      if (event.target === this.window) {
        this.schedule('window', WINDOW_RESIZE_DEBOUNCE_DELAY);
      }
    };
  }

  start() {
    if (this.listening) {
      return;
    }

    this.listening = true;
    this.$(this.window).on(
      `resize${this.namespace} orientationchange${this.namespace}`,
      this.handleWindowResize,
    );

    this.bindElements();
    this.document.fonts?.addEventListener('loadingdone', this.handleContentResize);
  }

  bindElements() {
    this.elements.on(`resize${this.namespace}`, this.handleContentResize);
    this.elements.each((index, element) => {
      element.addEventListener('load', this.handleContentResize, true);
    });
  }

  unbindElements() {
    this.elements.off(`resize${this.namespace}`);
    this.elements.each((index, element) => {
      element.removeEventListener('load', this.handleContentResize, true);
    });
  }

  observe() {
    this.unobserve();
    if (!this.window.ResizeObserver) {
      return;
    }

    this.elements.each((index, element) => {
      let previousWidth = this.$(element).width();
      const observer = new this.window.ResizeObserver(() => {
        const width = this.$(element).width();
        if (width !== previousWidth) {
          previousWidth = width;
          this.handleContentResize();
        }
      });

      observer.observe(element);
      this.observers.push(observer);
    });
  }

  unobserve() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.cancel('content');
  }

  setElements(elements) {
    const observing = this.observers.length > 0;

    this.unbindElements();
    this.unobserve();
    this.elements = elements;

    if (this.listening) {
      this.bindElements();
    }

    if (observing) {
      this.observe();
    }
  }

  schedule(key, delay) {
    if (!this.listening) {
      return;
    }

    this.cancel(key);
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        this.onResize();
      }, delay),
    );
  }

  cancel(key) {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }

  stop() {
    this.listening = false;
    this.$(this.window).off(this.namespace);
    this.unbindElements();
    this.document.fonts?.removeEventListener('loadingdone', this.handleContentResize);
    this.unobserve();
    this.cancel('window');
  }
}
