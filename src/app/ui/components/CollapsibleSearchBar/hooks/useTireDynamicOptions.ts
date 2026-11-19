'use client';

import { useCallback, useEffect, useState } from 'react';

import { sharedJson } from '@/app/utils/sharedFetch';

import { TireFilters } from './useTireSearch';

// Definimos la interfaz para las opciones de dimensiones
export interface DimensionOption {
  id: number;
  name: string | number;
}

// Hook para manejar la carga de dimensiones de neumáticos
export const useTireDynamicOptions = (selectedFilters: TireFilters) => {
  // Estados para almacenar las opciones de cada dimensión
  const [widthOptions, setWidthOptions] = useState<DimensionOption[]>([]);
  const [sidewallOptions, setSidewallOptions] = useState<DimensionOption[]>([]);
  const [diameterOptions, setDiameterOptions] = useState<DimensionOption[]>([]);

  // Estados para controlar la carga
  const [isLoadingWidth, setIsLoadingWidth] = useState(true);
  const [isLoadingSidewall, setIsLoadingSidewall] = useState(false);
  const [isLoadingDiameter, setIsLoadingDiameter] = useState(false);

  // Función para cargar las opciones de width (Height en la BD)
  const loadWidthOptions = useCallback(async () => {
    setIsLoadingWidth(true);
    try {
      // Shared (058): the dashboard and the storefront mount more than one size
      // picker, and each used to ask for the same list.
      setWidthOptions(await sharedJson<DimensionOption[]>('/api/dimensions/heights'));
    } catch (error) {
      console.error('Error loading width options:', error);
      setWidthOptions([]);
    } finally {
      setIsLoadingWidth(false);
    }
  }, []);

  // Función para cargar las opciones de sidewall (Width en la BD)
  const loadSidewallOptions = useCallback(async (width: string) => {
    if (!width) {
      setSidewallOptions([]);
      return;
    }

    setIsLoadingSidewall(true);
    try {
      setSidewallOptions(
        await sharedJson<DimensionOption[]>(
          `/api/dimensions/widths?height=${encodeURIComponent(width)}`
        )
      );
    } catch (error) {
      console.error('Error loading sidewall options:', error);
      setSidewallOptions([]);
    } finally {
      setIsLoadingSidewall(false);
    }
  }, []);

  // Función para cargar las opciones de diameter (Size en la BD)
  const loadDiameterOptions = useCallback(async (width: string, sidewall: string) => {
    if (!width || !sidewall) {
      setDiameterOptions([]);
      return;
    }

    setIsLoadingDiameter(true);
    try {
      const url = `/api/dimensions/sizes?height=${encodeURIComponent(width)}&width=${encodeURIComponent(sidewall)}`;
      setDiameterOptions(await sharedJson<DimensionOption[]>(url));
    } catch (error) {
      console.error('Error loading diameter options:', error);
      setDiameterOptions([]);
    } finally {
      setIsLoadingDiameter(false);
    }
  }, []);

  // Cargar opciones iniciales de width al montar el componente
  useEffect(() => {
    loadWidthOptions();
  }, [loadWidthOptions]);

  // Actualizar las opciones de sidewall cuando cambie el width
  useEffect(() => {
    if (selectedFilters.w) {
      loadSidewallOptions(selectedFilters.w);
    } else {
      setSidewallOptions([]);
    }
  }, [selectedFilters.w, loadSidewallOptions]);

  // Actualizar las opciones de diameter cuando cambien width o sidewall
  useEffect(() => {
    if (selectedFilters.w && selectedFilters.s) {
      loadDiameterOptions(selectedFilters.w, selectedFilters.s);
    } else {
      setDiameterOptions([]);
    }
  }, [selectedFilters.w, selectedFilters.s, loadDiameterOptions]);

  return {
    widthOptions,
    sidewallOptions,
    diameterOptions,
    isLoadingWidth,
    isLoadingSidewall,
    isLoadingDiameter,
  };
};
