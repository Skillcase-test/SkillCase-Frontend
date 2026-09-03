import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// 48 files render in parallel; the 1s default waitFor budget flakes under that load.
configure({ asyncUtilTimeout: 5000 });

// jsdom doesn't implement ResizeObserver either; components that measure
// themselves (TopModeSwitcher's rail) construct one during layout.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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

import { vi } from 'vitest';

vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSelector: (selector, ...rest) => {
      try {
        return actual.useSelector(selector, ...rest);
      } catch (err) {
        if (err?.message?.includes('could not find react-redux context value')) {
          try {
            return selector({ auth: { user: null, isAuthenticated: false } });
          } catch {
            return undefined;
          }
        }
        throw err;
      }
    },
  };
});

