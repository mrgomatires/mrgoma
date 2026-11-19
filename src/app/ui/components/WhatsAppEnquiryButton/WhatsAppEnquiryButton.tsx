import { FC } from 'react';

import type { SingleTire } from '@/app/interfaces/tires';
import { WhatsAppIcon } from '@/app/ui/icons/WhatsAppIcon';
import { buildTireEnquiry, isSoldTire } from '@/app/utils/tireEnquiry';
import { whatsAppLink } from '@/app/utils/whatsapp';

/**
 * A one-tap route to a person, with the tire already described.
 *
 * **A Server Component on purpose.** The detail page renders on the server by
 * design (`003-detail-server-render`) and the message's inputs are all known at
 * render time, so this needs no `'use client'`, no hydration boundary and no
 * runtime message build — the `href` ships in the initial HTML.
 *
 * Tracking is declarative too: `InteractionTracker` listens for `data-track`
 * from one delegated listener in the root layout, so marking the element is the
 * whole of the instrumentation. `surface` separates this from the WhatsApp
 * actions on the contact, guide, location and service pages, following the
 * vocabulary `018` established rather than minting a new event name — one
 * behaviour split across two names makes the totals unanswerable.
 *
 * The style is a **neutral slate outline**, not the brand green. Add to cart is
 * a filled `green-600` button, so anything green here would compete with it;
 * a neutral outline is visibly the quieter option and keeps the purchase path
 * first.
 */
export const WhatsAppEnquiryButton: FC<{ product: SingleTire }> = ({ product }) => {
  const sold = isSoldTire(product);
  const message = buildTireEnquiry(product);

  return (
    <a
      href={whatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      data-track="open_whatsapp"
      data-track-category="product_enquiry"
      data-track-surface="tire_detail"
      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" />
      {sold ? 'Ask about a similar tire' : 'Ask about this tire'}
      {/* Announced, not left as a surprise: this leaves the site for another app. */}
      <span className="sr-only"> on WhatsApp (opens in a new tab)</span>
    </a>
  );
};

export default WhatsAppEnquiryButton;
