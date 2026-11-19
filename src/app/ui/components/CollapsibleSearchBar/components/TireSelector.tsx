'use client';

import React from 'react';

import { CarFront } from '@/app/ui/icons/CarFront';

import { SelectDropdownAdapter } from './SelectDropdownAdapter';
import { useTireDynamicOptions } from '../hooks/useTireDynamicOptions';
import { TireFilters } from '../hooks/useTireSearch';

interface TireSelectorProps {
  selectedFilters: TireFilters;
  onFilterChangeAction: (value: string, type: keyof TireFilters) => void;
  isCompact?: boolean;
  flat?: boolean;
}

/**
 * TireSelector component for selecting tire dimensions
 */
export const TireSelector: React.FC<TireSelectorProps> = ({
  selectedFilters,
  onFilterChangeAction,
  isCompact = false,
  flat = false,
}) => {
  // Obtener las opciones dinámicas y estados de carga del hook
  const {
    widthOptions,
    sidewallOptions,
    diameterOptions,
    isLoadingWidth,
    isLoadingSidewall,
    isLoadingDiameter,
  } = useTireDynamicOptions(selectedFilters);

  // Determinar cuando los selectores deben estar deshabilitados
  const isSidewallDisabled = !selectedFilters.w || isLoadingSidewall;
  const isDiameterDisabled = !selectedFilters.w || !selectedFilters.s || isLoadingDiameter;

  if (flat) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500 shrink-0">Size</span>
        <div className="w-24">
          <SelectDropdownAdapter
            label="W"
            options={widthOptions}
            type="w"
            selectedFilters={selectedFilters}
            onFilterChangeAction={onFilterChangeAction}
            isCollapsed
            showDefaultText={false}
            disabled={isLoadingWidth}
          />
        </div>
        <div className="w-20">
          <SelectDropdownAdapter
            label="S"
            options={sidewallOptions}
            type="s"
            selectedFilters={selectedFilters}
            onFilterChangeAction={onFilterChangeAction}
            isCollapsed
            showDefaultText={false}
            disabled={isSidewallDisabled}
          />
        </div>
        <div className="w-20">
          <SelectDropdownAdapter
            label="D"
            options={diameterOptions}
            type="d"
            selectedFilters={selectedFilters}
            onFilterChangeAction={onFilterChangeAction}
            isCollapsed
            showDefaultText={false}
            disabled={isDiameterDisabled}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-200 p-2 rounded-lg border border-gray-200">
      <div className="flex items-center mb-1">
        <div className="bg-gray-100 p-0.5 rounded-full">
          <CarFront className="w-3 h-3 text-green-600" />
        </div>
        <h4 className="ml-1 text-xs font-medium text-gray-700">Tire Size</h4>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {/* Width Selector */}
        <div className="my-1">
          <label className="my-1 text-xs font-medium text-gray-700 flex items-center">
            {isCompact ? 'W' : 'Width'}
            {isLoadingWidth && (
              <span className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] text-green-600 motion-reduce:animate-[spin_1.5s_linear_infinite]"></span>
            )}
          </label>
          <SelectDropdownAdapter
            label={isCompact ? 'W' : 'Width'}
            options={widthOptions}
            type={'w'}
            selectedFilters={selectedFilters}
            onFilterChangeAction={onFilterChangeAction}
            isCollapsed={isCompact}
            showDefaultText={!isCompact}
            disabled={isLoadingWidth}
          />
        </div>

        {/* Sidewall Selector */}
        <div className="my-1">
          <label className="my-1 text-xs font-medium text-gray-700 flex items-center">
            {isCompact ? 'S' : 'Sidewall'}
            {isLoadingSidewall && (
              <span className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] text-green-600 motion-reduce:animate-[spin_1.5s_linear_infinite]"></span>
            )}
          </label>
          <SelectDropdownAdapter
            label={isCompact ? 'S' : 'Sidewall'}
            options={sidewallOptions}
            type={'s'}
            selectedFilters={selectedFilters}
            onFilterChangeAction={onFilterChangeAction}
            isCollapsed={isCompact}
            showDefaultText={!isCompact}
            disabled={isSidewallDisabled}
          />
        </div>

        {/* Diameter Selector */}
        <div className="my-1">
          <label className="my-1 text-xs font-medium text-gray-700 flex items-center">
            {isCompact ? 'D' : 'Diameter'}
            {isLoadingDiameter && (
              <span className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] text-green-600 motion-reduce:animate-[spin_1.5s_linear_infinite]"></span>
            )}
          </label>
          <SelectDropdownAdapter
            label={isCompact ? 'D' : 'Diameter'}
            options={diameterOptions}
            type={'d'}
            selectedFilters={selectedFilters}
            onFilterChangeAction={onFilterChangeAction}
            isCollapsed={isCompact}
            showDefaultText={!isCompact}
            disabled={isDiameterDisabled}
          />
        </div>
      </div>
    </div>
  );
};
