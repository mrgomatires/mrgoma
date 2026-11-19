import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import CookieSettingsLink from '@/app/ui/components/CookieConsent/CookieSettingsLink';
import type {
  FooterProps,
  FooterSection as FooterSectionType,
  SocialLink,
} from '@/app/ui/sections/Footer/footer-section';
import { FooterSection } from '@/app/ui/sections/Footer/FooterSection';
import { SocialIcon } from '@/app/ui/sections/Footer/SocialIcons';

import { mrGomaLogoLight } from '#public/assets/images/Logo';

const defaultSections: FooterSectionType[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Services', href: '/services' },
      { label: 'About Us', href: '/about-us' },
      { label: 'Guides', href: '/guides' },
    ],
  },
  {
    title: 'Customer Service',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Locations', href: '/locations' },
      { label: 'Store', href: '/tires' },
      // Every size we sell on one page (050).
      { label: 'Shop by size', href: '/tires/size' },
      // `/instant-quote` had no inbound link anywhere in the site: it existed
      // only in the sitemap, so nobody could reach it by navigating and it had
      // nothing to rank on. It sits here, beside Contact, because asking for a
      // quote is the same intent as asking a question.
      { label: 'Instant Quote', href: '/instant-quote' },
    ],
  },
];

const defaultSocialLinks: SocialLink[] = [
  {
    platform: 'instagram',
    href: 'https://instagram.com/mrgomatires',
    icon: 'instagram',
  },
  {
    platform: 'facebook',
    href: 'https://www.facebook.com/profile.php?id=61573861890811',
    icon: 'facebook',
  },
  {
    platform: 'x',
    href: 'https://x.com/MrGomaTires',
    icon: 'x',
  },
  {
    platform: 'tiktok',
    href: 'https://www.tiktok.com/@mrgomatiresofficial',
    icon: 'tiktok',
  },
];

export const Footer = ({
  className = '',
  sections = defaultSections,
  socialLinks = defaultSocialLinks,
  copyrightYear = new Date().getFullYear(),
  companyName = 'MrGoma Tires®',
}: FooterProps) => {
  return (
    <footer className={`bg-black relative overflow-hidden ${className}`}>
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `image-set(url('/assets/images/background-footer.avif') type('image/avif'), url('/assets/images/background-footer.webp') type('image/webp'))`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }}
        />
      </div>
      <div className="relative">
        <div className="container mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <Image
                alt="MrGoma Tires logo"
                title="Go to the home page"
                src={mrGomaLogoLight || '/placeholder.svg'}
                className="h-8 w-auto"
                width={185}
                height={32}
              />
            </div>
            {sections.map(section => (
              <FooterSection key={section.title} section={section} />
            ))}
            <div className="lg:col-span-1">
              <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                Follow us
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[#9dfb40]"
                >
                  <path
                    d="M9 5L15 12L9 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </h2>
              <div className="flex gap-4">
                {socialLinks.map(social => (
                  <a
                    key={social.platform}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#9dfb40] hover:text-[#7bc42d] transition-colors duration-200 p-2 rounded-lg hover:bg-white hover:opacity-40"
                    aria-label={`Follow us on ${social.platform}`}
                  >
                    <SocialIcon platform={social.icon} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-600" />
        <div className="container mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-300 text-sm">
              <span className="text-[#9dfb40] font-semibold">{companyName}</span> is a registered
              trademark of Jomah Trading Inc. All rights reserved {copyrightYear}
            </p>
            <div className="flex gap-6">
              <Link
                href="/legal-policies"
                className="text-gray-300 hover:text-[#9dfb40] transition-colors duration-200 text-sm"
              >
                Terms and Conditions
              </Link>
              <Link
                href="/legal-policies#privacy"
                className="text-gray-300 hover:text-[#9dfb40] transition-colors duration-200 text-sm"
              >
                Privacy Policy
              </Link>
              {/* Beside the policy that explains the choice, so the way to change
                  it sits next to the description of what it does. */}
              <CookieSettingsLink />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
