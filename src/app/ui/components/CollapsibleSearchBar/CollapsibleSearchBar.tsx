'use client';

import React, { useState } from 'react';

import { CompactForm } from './components/CompactForm';
import { FloatingButton } from './components/FloatingButton';
import { useTireSearch } from './hooks/useTireSearch';

/**
 * CollapsibleSearchBar component
 * Provides a floating button that opens a compact form for tire selection
 */
const CollapsibleSearchBar: React.FC<{ redirectBasePath: string }> = ({ redirectBasePath }) => {
  // State for the compact form visibility
  const [isCompactFormOpen, setIsCompactFormOpen] = useState(false);

  // Use the custom hook for tire search functionality
  const { selectedFilters, applySize, resetFilters } = useTireSearch(redirectBasePath);

  // Toggle the compact form visibility
  const toggleCompactForm = () => {
    setIsCompactFormOpen(!isCompactFormOpen);
  };

  return (
    <>
      {/* Floating button */}
      <FloatingButton action={toggleCompactForm} />
      {/* Compact form (conditionally rendered) */}
      {isCompactFormOpen && (
        <CompactForm
          selectedFilters={selectedFilters}
          onApplyAction={size => {
            applySize(size);
            setIsCompactFormOpen(false);
          }}
          onResetFiltersAction={resetFilters}
          onCloseAction={toggleCompactForm}
        />
      )}
    </>
  );
};

export default CollapsibleSearchBar;
