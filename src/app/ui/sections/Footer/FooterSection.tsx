import Link from 'next/link';

import type { FooterSection as FooterSectionType } from '@/app/ui/sections/Footer/footer-section';

interface FooterSectionProps {
  section: FooterSectionType;
}

/**
 * The focus ring matches `CookieSettingsLink`, the one footer control that
 * already had one. These links relied on the browser default, which is visible
 * but varies by browser; WCAG 2.1 AA asks for focus to be visible and the site
 * already had a house style for it two components away.
 */
export const FooterSection = ({ section }: FooterSectionProps) => {
  return (
    <div>
      {/* <h2>, not <h3>: the footer follows every page's own <h1> and may follow
          no <h2> at all (checkout), so <h3> skipped a level (055). */}
      <h2 className="text-white text-lg font-semibold mb-4">{section.title}</h2>
      <ul className="space-y-3">
        {section.links.map(link => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#9dfb40] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9dfb40] rounded"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-gray-300 hover:text-[#9dfb40] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9dfb40] rounded"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
