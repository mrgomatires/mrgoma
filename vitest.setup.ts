import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { clearSetOffersCache } from '@/app/hooks/useSetOffers';
import { clearSharedJson } from '@/app/utils/sharedFetch';

// jsdom doesn't implement scrollIntoView; stub it so components that call it
// (focus/feedback banners) don't throw during tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom doesn't implement matchMedia either. Components that query a media
// feature (e.g. `prefers-reduced-motion` before autoplaying the hero video)
// would throw, so provide a stub that reports "no preference" — the default a
// browser gives when the user hasn't asked for reduced motion. Tests that care
// about the other branch stub it themselves.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Unmount React trees after every test so the DOM doesn't leak between cases.
afterEach(() => {
  cleanup();
  // 058: filter options are shared per URL for the page's lifetime; a test
  // must not inherit another test's (mocked) answers.
  clearSharedJson();
  // 061: set offers are remembered per card set for the tab's lifetime.
  clearSetOffersCache();
});
