import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// 48 files render in parallel; the 1s default waitFor budget flakes under that load.
configure({ asyncUtilTimeout: 5000 });

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
