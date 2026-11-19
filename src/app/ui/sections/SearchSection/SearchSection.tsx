'use client';

import { FC } from 'react';

import SearchBySize from '@/app/ui/components/SearchBySize/SearchBySize';
import SearchByText from '@/app/ui/components/SearchByText/SearchByText';

interface SearchSectionProps {
  type: 'size' | 'text';
}

const SearchSection: FC<SearchSectionProps> = ({ type }) => {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center rounded-b-2xl md:rounded-2xl bg-white justify-center p-4 shadow-xl min-h-64 ring-1 ring-lime-500">
        {type === 'size' ? <SearchBySize /> : <SearchByText />}
      </div>
    </div>
  );
};

export default SearchSection;
