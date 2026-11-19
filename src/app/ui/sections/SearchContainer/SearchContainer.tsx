'use client';

import { FC, useContext, useEffect, useState } from 'react';

import { SelectedFiltersContext } from '@/app/context/SelectedFilters';
import BrandHeadline from '@/app/ui/components/BrandHeadline/BrandHeadline';
import { SizeIcon } from '@/app/ui/icons/SizeIcon';
import { TextIcon } from '@/app/ui/icons/TextIcon';
import SearchSection from '@/app/ui/sections/SearchSection/SearchSection';

const SearchContainer: FC = () => {
  const [activeTab, setActiveTab] = useState<'size' | 'text'>('size');
  const [isMounted, setIsMounted] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const { setSelectedFilters } = useContext(SelectedFiltersContext);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChangeTab = (tab: 'size' | 'text') => {
    setActiveTab(tab);
    setSelectedFilters({
      width: '',
      sidewall: '',
      diameter: '',
    });
  };

  // Trigger a small fade/slide-in when the tab changes (remount-safe and motion-safe)
  useEffect(() => {
    setContentVisible(false);
    const t = setTimeout(() => setContentVisible(true), 0);
    return () => clearTimeout(t);
  }, [activeTab]);

  return (
    <div className="pt-6 pb-14">
      {/* The page's <h1> is rendered by the server component above this one.
          Keeping it out of the client bundle matters: this wrapper paints at
          opacity-0 until hydration, and the main visual heading is one of the
          sources Google uses to build the search result's title link. */}
      <div
        className={`mb-8 transition-all duration-700 ease-out transform ${
          isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <BrandHeadline as="h2" size="sm" />
      </div>

      <div className="w-full">
        <div className="flex justify-center">
          <div
            className={`relative grid w-full max-w-2xl grid-cols-2 rounded-lg transition-all duration-700 ease-out transform ${
              isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
            role="tablist"
          >
            <button
              type="button"
              onClick={() => handleChangeTab('size')}
              role="tab"
              aria-selected={activeTab === 'size'}
              className={`py-2 px-4 transition-colors duration-200 text-neutral-800 rounded-tl-3xl rounded-tr-3xl text-md cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lime-500 ${
                activeTab === 'size'
                  ? 'bg-lime-400 ring-1 ring-lime-500 shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div
                className={`flex items-center gap-2 justify-center leading-none ${activeTab === 'size' ? 'text-neutral-800' : 'text-gray-600'}`}
              >
                <SizeIcon className="w-6 h-6" fill="currentColor" /> Search by Size
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleChangeTab('text')}
              role="tab"
              aria-selected={activeTab === 'text'}
              className={`py-2 px-4 transition-colors duration-200 text-neutral-800 rounded-tl-3xl rounded-tr-3xl text-md cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 ${
                activeTab === 'text'
                  ? 'bg-lime-400 ring-1 ring-lime-500 shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div
                className={`flex items-center gap-2 justify-center ${activeTab === 'text' ? 'text-neutral-800' : 'text-gray-600'}`}
              >
                <TextIcon className="w-6 h-6" fill="currentColor" /> Search by Text
              </div>
            </button>
            {/* Active tab indicator */}
            <span
              aria-hidden
              className={`pointer-events-none absolute bottom-0 left-0 h-1 bg-lime-400 rounded-full w-1/2 transform transition-transform duration-300 ease-out ${
                activeTab === 'text' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
        <div
          key={activeTab}
          className={`transition-all duration-300 ease-out transform ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          <SearchSection type={activeTab} />
        </div>
      </div>
    </div>
  );
};

export default SearchContainer;
