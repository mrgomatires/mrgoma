'use client';

import React from 'react';

import SelectDropdown from '@/app/ui/components/SelectDropdown/SelectDropdown';

import { DimensionOption } from '../hooks/useTireDynamicOptions';
import { TireFilters } from '../hooks/useTireSearch';

interface SelectDropdownAdapterProps {
  label: string;
  options: DimensionOption[];
  type: keyof TireFilters;
  selectedFilters: TireFilters;
  onFilterChangeAction: (value: string, type: keyof TireFilters) => void;
  isCollapsed?: boolean;
  showDefaultText?: boolean;
  disabled?: boolean;
}

// Definir el tipo que espera SelectDropdown
interface SelectDropdownOption {
  id: number;
  name: number;
}

/**
 * Adapter component for SelectDropdown
 * Converts between the TireFilters format and the format expected by SelectDropdown
 */
export const SelectDropdownAdapter: React.FC<SelectDropdownAdapterProps> = ({
  label,
  options,
  type,
  selectedFilters,
  onFilterChangeAction,
  isCollapsed = false,
  showDefaultText = true,
  disabled = false,
}) => {
  // Map our tire filter types to the types expected by SelectDropdown
  const mapTypeToSelectDropdownType = (
    type: keyof TireFilters
  ): 'width' | 'sidewall' | 'diameter' => {
    if (type === 'w') return 'width';
    if (type === 's') return 'sidewall';
    return 'diameter';
  };

  // Create an adapter for the selectedFilters object
  const adaptedSelectedFilters = {
    width: type === 'w' ? selectedFilters.w : '',
    sidewall: type === 's' ? selectedFilters.s : '',
    diameter: type === 'd' ? selectedFilters.d : '',
  };

  // Create an adapter for the handleFilterChange function
  const adaptedHandleFilterChange = (value: string) => {
    onFilterChangeAction(value, type);
  };

  // Convertir las opciones al formato esperado por SelectDropdown
  const adaptedOptions: SelectDropdownOption[] = options.map(option => ({
    id: option.id,
    name: typeof option.name === 'string' ? parseFloat(option.name) : option.name,
  }));

  // Create the field object expected by SelectDropdown
  const field = {
    type: mapTypeToSelectDropdownType(type),
    label,
    options: adaptedOptions,
  };

  return (
    <SelectDropdown
      field={field}
      selectedFilters={adaptedSelectedFilters}
      handleFilterChange={adaptedHandleFilterChange}
      isCollapsed={isCollapsed}
      showDefaultText={showDefaultText}
      disabled={disabled}
    />
  );
};
