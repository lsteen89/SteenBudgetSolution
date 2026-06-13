import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            x: 0,
            y: 0,
            width: 1024,
            height: 320,
            top: 0,
            right: 1024,
            bottom: 320,
            left: 0,
            toJSON: () => ({}),
          },
        } as ResizeObserverEntry,
      ],
      this,
    );
  }

  unobserve() {}

  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverMock;

// jsdom omits matchMedia. Components read `prefers-reduced-motion` through it;
// default to "no preference" (matches: false) with inert subscription methods.
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

// jsdom has no layout engine and omits scrollIntoView. Provide a no-op stub so
// focus-and-scroll affordances run in tests without throwing. Guarded with
// `??=` (jsdom leaves it undefined) to match the ResizeObserver/matchMedia
// pattern above and never clobber a real implementation.
Element.prototype.scrollIntoView ??= () => {};
