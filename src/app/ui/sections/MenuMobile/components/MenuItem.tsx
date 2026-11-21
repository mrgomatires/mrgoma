'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import MenuPrefetchLink from '@/app/ui/components/MenuPrefetchLink/MenuPrefetchLink';
import { currentChild, groupChildren, type MenuChild } from '@/app/ui/sections/Header/MenuItems';

interface MenuItemProps {
  name: string;
  href: string;
  index: number;
  animationStage: number;
  onClick: () => void;
  submenu?: MenuChild[];
}

/**
 * Individual menu item component
 * Handles its own animation based on index and animation stage
 */
export const MenuItem: React.FC<MenuItemProps> = ({
  name,
  href,
  index,
  animationStage,
  onClick,
  submenu,
}) => {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setActiveHash(window.location.hash);
    const handleHashChange = () => setActiveHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isActive =
    pathname === href ||
    pathname?.startsWith(href + '/') ||
    (pathname === '/' && activeHash === href.replace('/', ''));

  const animClass =
    animationStage >= index + 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4';

  if (submenu?.length) {
    const groups = groupChildren(submenu);
    // The child for the page we are on (059): highlighted like the parent.
    const current = currentChild(pathname, submenu, href);
    return (
      <div className={`transition-all duration-300 ${animClass}`}>
        <div
          className={`flex items-stretch rounded-lg overflow-hidden border ${
            isActive ? 'bg-[#222] border-[#65D01E]/50' : 'border-[#333]'
          }`}
        >
          <Link
            href={href}
            onClick={onClick}
            className={`flex-1 px-4 py-3 text-base font-semibold transition-colors ${
              isActive ? 'text-[#65D01E]' : 'text-white hover:text-[#65D01E]'
            }`}
          >
            {name}
          </Link>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} ${name} list`}
            className={`px-4 border-l border-[#333] text-white hover:text-[#65D01E] transition-colors`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* `inert` while collapsed: the links are only hidden by a zero-height
            row, and would otherwise still take Tab focus (050). */}
        <div
          inert={!expanded}
          className={`grid transition-all duration-300 ${
            expanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-3 py-3 bg-black/30 rounded-lg border border-[#333] space-y-4">
              {groups.map(g => (
                <div key={g.label ?? 'all'}>
                  {g.label && (
                    <p className="text-[#9dfb40] text-[10px] font-bold tracking-[0.2em] uppercase mb-2 px-2">
                      {g.label}
                    </p>
                  )}
                  <ul className="space-y-0.5">
                    {g.items.map(kid => {
                      // 059: see MenuChild.prefetchOnIntent.
                      const KidLink = kid.prefetchOnIntent ? MenuPrefetchLink : Link;
                      const here = current?.href === kid.href;
                      return (
                        <li key={kid.href}>
                          <KidLink
                            href={kid.href}
                            onClick={onClick}
                            aria-current={here ? (current.exact ? 'page' : 'true') : undefined}
                            className={`block px-2 py-3 text-sm hover:text-[#9dfb40] hover:bg-white/5 rounded transition-colors ${
                              here ? 'bg-white/5 font-semibold text-[#9dfb40]' : 'text-gray-300'
                            }`}
                          >
                            {kid.name}
                          </KidLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-lg px-4 py-3 text-base font-semibold transition-all duration-300 border ${
        isActive
          ? 'bg-[#222] text-[#65D01E] border-[#65D01E]/50'
          : 'text-white hover:bg-[#222] hover:text-[#65D01E] border-[#333] hover:border-[#65D01E]/50'
      } ${animClass}`}
    >
      {name}
    </Link>
  );
};
