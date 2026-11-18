'use client';

import { FC, FormEvent, useContext, useState } from 'react';

import { useRouter } from 'next/navigation';

import { SelectedFiltersContext } from '@/app/context/SelectedFilters';
import { ButtonSearch, TireDisplay } from '@/app/ui/components';
import TireSizeTextField, {
  isCompleteTireSize,
} from '@/app/ui/components/TireSizeTextField/TireSizeTextField';

interface SearchByTextProps {
  showButton?: boolean;
  enableSubmit?: boolean;
}

const SearchByText: FC<SearchByTextProps> = ({ showButton = true, enableSubmit = true }) => {
  const [value, setValue] = useState('');
  const router = useRouter();

  const { setSelectedFilters } = useContext(SelectedFiltersContext);
  const isComplete = isCompleteTireSize(value);

  // The typed size also feeds the shared filters (the 3D preview reads them).
  const onValueChange = (next: string) => {
    setValue(next);
    const [width = '', sidewall = '', diameter = ''] = next.split('/');
    setSelectedFilters({ width, sidewall, diameter });
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!enableSubmit) return; // In input-only mode, do nothing on submit/Enter
    if (isComplete) {
      const [width, aspectRatio, diameter] = value.split('/');
      const params = new URLSearchParams({ w: width, s: aspectRatio, d: diameter });
      router.push(`/tires?${params.toString()}`);
    }
  };

  return (
    <div className="flex gap-5 w-full">
      <div className="w-full md:w-3/5">
        <form onSubmit={handleSearch} className="space-y-6">
          <TireSizeTextField value={value} onValueChange={onValueChange} autoFocus />
          {showButton && <ButtonSearch type={'submit'} disabled={isComplete} />}
        </form>
      </div>

      <div className="hidden md:flex items-center justify-center flex-1">
        <div className="relative">
          <TireDisplay />
        </div>
      </div>
    </div>
  );
};

export default SearchByText;
