'use client';

import React, { FC, ReactNode, useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useCart } from '@/app/context/CartContext';
import HamburgerMenu from '@/app/ui/components/HamburgerMenu/HamburgerMenu';
import IntentPrefetchLink from '@/app/ui/components/IntentPrefetchLink/IntentPrefetchLink';
import { ShoppingCart } from '@/app/ui/icons/ShoppingCart';
import CartModal from '@/app/ui/sections/CartModal/CartModal';
import { currentChild, groupChildren, menuItems } from '@/app/ui/sections/Header/MenuItems';
import MenuMobile from '@/app/ui/sections/MenuMobile/MenuMobile';

import { mrGomaLogoLight } from '#public/assets/images/Logo';
/**
 * Header component for the website
 * Contains the logo, navigation links, and shopping cart icon
 * The header is sticky and has a background with a gradient and an image
 * @returns {ReactNode} The rendered header component
 */
const Header: FC<{ compact?: boolean }> = ({ compact = false }): ReactNode => {
  const pathname = usePathname();
  const { cartCount, setShowCartModal } = useCart();
  const [isMounted, setIsMounted] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  // After a navigation, a dropdown would stay open: focus is still on the link
  // that was clicked (`focus-within`) and the pointer is often still over the
  // panel (`hover`). Release the focus and keep the panels shut until the
  // pointer enters a menu again or leaves it (050, owner review).
  const [menusShut, setMenusShut] = useState(false);
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return; // first render: nothing to close
    lastPath.current = pathname;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('[data-nav-menu]')) active.blur();
    setMenusShut(true);
  }, [pathname]);

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowCartModal(true);
  };

  useEffect(() => {
    setIsMounted(true);
    const handleHashChange = () => {
      setActiveHash(window.location.hash);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [pathname]);

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-black backdrop-blur-sm backdrop-filter backdrop-saturate-150 border-b border-white/10 shadow-sm">
        <div className="absolute inset-0 bg-[#111]">
          <div className="absolute z-10 w-full h-full bg-linear-to-r from-black via-[#1A1A1A] to-[#9DFB40] opacity-80"></div>
          {/* The largest image on text-led pages (the LCP on /tires): eager and
              `high` — Next 16's `priority` only preloads, without the hint (055). */}
          <Image
            src="/assets/images/bg-header.svg"
            alt=""
            fill
            className="object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </div>

        <nav
          aria-label="Global"
          className={`relative z-10 mx-auto flex max-w-7xl items-center justify-between transition-all duration-300 ${compact ? 'p-2' : 'p-4'}`}
        >
          <div
            className={`w-full flex items-center justify-between gap-4 rounded-2xl bg-black/40 border border-white/10 px-4 shadow-sm backdrop-blur-md transition-all duration-300 ${compact ? 'py-1' : 'py-2'}`}
          >
            <HamburgerMenu />
            <Link href="/" className="-m-1.5 p-1.5">
              <Image
                alt="MrGoma Tires logo"
                title="Go to the home page"
                src={mrGomaLogoLight || '/placeholder.svg'}
                className={`w-auto transition-all duration-300 ${compact ? 'h-6' : 'h-8'}`}
                width={185}
                height={32}
                loading="eager"
              />
            </Link>
            <div className="hidden lg:flex lg:gap-x-12">
              {menuItems.map(item => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + '/') ||
                  (pathname === '/' && activeHash === item.href.replace('/', ''));

                if (item.children?.length) {
                  const groups = groupChildren(item.children);
                  const grouped = groups.some(g => g.label);
                  // The child for the page we are on (059): highlighted like the parent.
                  const current = currentChild(pathname, item.children, item.href);
                  return (
                    <div
                      key={item.name}
                      data-nav-menu
                      className="relative group"
                      onMouseEnter={() => setMenusShut(false)}
                      onMouseLeave={() => setMenusShut(false)}
                      onFocus={() => setMenusShut(false)}
                    >
                      <IntentPrefetchLink
                        href={item.href}
                        className={`inline-flex items-center gap-1 text-sm font-semibold leading-6 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                          isActive ? 'text-[#65D01E]' : 'text-white hover:text-[#65D01E]'
                        }`}
                        aria-haspopup="true"
                      >
                        {item.name}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          className={`w-3 h-3 transition-transform duration-200 ${
                            menusShut ? '' : 'group-hover:rotate-180 group-focus-within:rotate-180'
                          }`}
                          aria-hidden="true"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </IntentPrefetchLink>
                      {/* Opens on hover **and** when focus is inside, so Tab reaches
                          the children (050; it used to be hover-only). */}
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 ${
                          grouped ? 'w-[480px]' : 'w-56'
                        } opacity-0 invisible ${
                          menusShut
                            ? ''
                            : 'group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible'
                        } transition-all duration-200 z-50`}
                      >
                        <div
                          className={`bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl ${
                            grouped ? 'p-6 grid grid-cols-2 gap-6' : 'p-3'
                          }`}
                        >
                          {groups.map(g => (
                            <div key={g.label ?? 'all'}>
                              {g.label && (
                                <p className="text-[#9dfb40] text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
                                  {g.label}
                                </p>
                              )}
                              <ul className="space-y-1.5">
                                {g.items.map(kid => {
                                  const here = current?.href === kid.href;
                                  return (
                                    <li key={kid.href}>
                                      <IntentPrefetchLink
                                        href={kid.href}
                                        aria-current={
                                          here ? (current.exact ? 'page' : 'true') : undefined
                                        }
                                        className={`block text-sm hover:text-[#9dfb40] hover:translate-x-0.5 transition-all duration-150 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                                          here ? 'font-semibold text-[#9dfb40]' : 'text-gray-300'
                                        } ${grouped ? '' : 'px-3 py-2'}`}
                                      >
                                        {kid.name}
                                      </IntentPrefetchLink>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                          {item.allLabel && (
                            <IntentPrefetchLink
                              href={item.href}
                              className="col-span-2 mt-2 pt-3 border-t border-white/10 text-xs font-bold text-[#9dfb40] hover:underline"
                            >
                              {item.allLabel}
                            </IntentPrefetchLink>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <IntentPrefetchLink
                    key={item.name}
                    href={item.href}
                    className={`text-sm font-semibold leading-6 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                      isActive ? 'text-[#65D01E]' : 'text-white hover:text-[#65D01E]'
                    }`}
                  >
                    {item.name}
                  </IntentPrefetchLink>
                );
              })}
            </div>
            <div className="flex">
              <button
                type="button"
                onClick={handleCartClick}
                data-track="open_cart"
                data-track-category="cart"
                className="flex items-center justify-center cursor-pointer rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                aria-label={isMounted ? `Shopping cart with ${cartCount} items` : 'Shopping cart'}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Cart
                {isMounted && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5" aria-hidden="true">
                    <span className="absolute inset-0 rounded-full bg-green-500 opacity-75 animate-ping"></span>
                    <span className="relative bg-green-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>
      <MenuMobile />
      <CartModal />
    </>
  );
};

export default Header;
