import '@testing-library/jest-dom';

// jsdom doesn't implement window.matchMedia — several UI libraries
// (react-hot-toast, etc.) call it during render.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
