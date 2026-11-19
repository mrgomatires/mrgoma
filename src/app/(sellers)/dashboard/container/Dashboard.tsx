'use client';
import { useContext, useState } from 'react';

import dynamic from 'next/dynamic';

import { ShowFilterContext } from '@/app/context/ShowFilterContext';
import { TireSelector } from '@/app/ui/components/CollapsibleSearchBar/components/TireSelector';
import { useTireSearch } from '@/app/ui/components/CollapsibleSearchBar/hooks/useTireSearch';
import { AdjustmentsHorizontalIcon } from '@/app/ui/components/Icons/Icons';
import DashboardCartModal from '@/app/ui/sections/DashboardCartModal/DashboardCartModal';
import DashboardTableContainer from '@/app/ui/sections/DashboardTableContainer/DashboardTableContainer';
import FiltersMobile from '@/app/ui/sections/FiltersMobile/FiltersMobile';
import TopFilters from '@/app/ui/sections/TopFilters/TopFilters';
import { CodeFilterInput } from '@/app/ui/sections/TopFilters/TopFilters';

// Lazy-loaded: keeps the AI chat bundle out of the initial dashboard payload.
const AiChat = dynamic(() => import('@/app/ui/components/AiChat/AiChat'), { ssr: false });

const Dashboard = () => {
  const { setShowFilter } = useContext(ShowFilterContext);
  const { selectedFilters: mobileTireFilters, handleFilterChange: handleMobileTireChange } =
    useTireSearch('dashboard');
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <div className="min-h-screen">
      {/* Filters Section */}
      <section className="space-y-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Accordion header */}
          <button
            type="button"
            onClick={() => setFiltersOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-green-500 rounded-full" />
              <h2 className="text-base font-semibold text-gray-900">Search</h2>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Accordion body */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
          >
            <div className={filtersOpen ? 'overflow-visible' : 'overflow-hidden'}>
              <div className="px-3 pb-3 border-t border-gray-100">
                <TopFilters
                  redirectBasePath={'dashboard'}
                  apiBasePath={'/api/dashboard'}
                  showPriceFilter={false}
                  showStoreFilter={true}
                  inlineTireSize
                  showLocalFilter
                  showCodeFilter
                />
                <div className="lg:hidden border-t border-gray-50 pt-3 space-y-3">
                  <CodeFilterInput redirectBasePath="dashboard" fullWidth />
                  <TireSelector
                    selectedFilters={mobileTireFilters}
                    onFilterChangeAction={handleMobileTireChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFilter(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-medium"
                    aria-label="Show filters"
                  >
                    <AdjustmentsHorizontalIcon className="h-4 w-4" />
                    <span>Filters</span>
                  </button>
                  <FiltersMobile
                    redirectBasePath={'dashboard'}
                    apiBasePath={'/api/dashboard'}
                    showPriceFilter={false}
                    showStoreFilter={true}
                    showLocalFilter
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-1 bg-green-500 rounded-full"></div>
            <h2 className="text-base font-semibold text-gray-900">Inventory Data</h2>
          </div>
          <DashboardTableContainer />
        </div>
      </section>

      <AiChat surface="dashboard" />
      <DashboardCartModal />
    </div>
  );
};

export default Dashboard;
