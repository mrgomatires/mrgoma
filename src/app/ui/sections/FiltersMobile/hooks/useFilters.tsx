'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { parseLocationPairs } from '@/app/utils/filterUtils';
import { sharedJson } from '@/app/utils/sharedFetch';

interface RangeInputs {
  price: [number, number];
  treadDepth: [number, number];
  remainingLife: [number, number];
}

interface RangeBounds {
  price: [number, number];
  treadDepth: [number, number];
  remainingLife: [number, number];
}

interface CheckboxInputs {
  condition: string[];
  patched: string[];
  kindSale: string[];
  brands: string[];
  stores: string[];
  /**
   * Shelf codes, held as **already-encoded `store~code` pairs**.
   *
   * A pair rather than a code because seven codes exist in more than one store.
   * Encoded rather than structured so this stays a `string[]` like every other
   * entry here — `isChecked`, `setOrDelete` and the `join(',')` that writes the
   * URL all keep working untouched, and the URL format is exactly what
   * `parseLocationPairs` reads back.
   */
  locations: string[];
  local: string[];
}

export const useFilters = (
  redirectBasePath: string,
  apiBasePath: string = '/api',
  options?: { enableStoreFilter?: boolean }
) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rangeBounds, setRangeBounds] = useState<RangeBounds>({
    price: [10, 50],
    treadDepth: [1, 32],
    remainingLife: [0, 100],
  });

  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<{ store: string; code: string }[]>(
    []
  );
  const [isLoadingRanges, setIsLoadingRanges] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingStores, setIsLoadingStores] = useState(options?.enableStoreFilter ?? false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Initialize range inputs from URL parameters or defaults
  const [rangeInputs, setRangeInputs] = useState<RangeInputs>({
    price: [
      parseInt(searchParams.get('minPrice') || '10', 10),
      parseInt(searchParams.get('maxPrice') || '50', 10),
    ],
    treadDepth: [
      parseFloat(searchParams.get('minTreadDepth') || '1'),
      parseFloat(searchParams.get('maxTreadDepth') || '32'),
    ],
    remainingLife: [
      parseInt(searchParams.get('minRemainingLife') || '0', 10),
      parseInt(searchParams.get('maxRemainingLife') || '100', 10),
    ],
  });

  // Initialize checkbox inputs from URL parameters or defaults
  const [checkboxInputs, setCheckboxInputs] = useState<CheckboxInputs>({
    condition: searchParams.get('condition')?.split(',').filter(Boolean) || [],
    patched: searchParams.get('patched')?.split(',').filter(Boolean) || [],
    kindSale: searchParams.get('kindSale')?.split(',').filter(Boolean) || [],
    brands: searchParams.get('brands')?.split(',').filter(Boolean) || [],
    stores: searchParams.get('stores')?.split(',').filter(Boolean) || [],
    locations: searchParams.get('locations')?.split(',').filter(Boolean) || [],
    local: searchParams.get('local')?.split(',').filter(Boolean) || [],
  });

  // Función para cargar las marcas basada en los filtros actuales
  const fetchFilteredBrands = useCallback(async () => {
    try {
      setIsLoadingBrands(true);

      // Construir la URL con los parámetros de filtro actuales excepto brands
      const params = new URLSearchParams();

      // Añadir parámetros de rangos si están fuera de los límites por defecto
      if (rangeInputs.price[0] > rangeBounds.price[0]) {
        params.set('minPrice', rangeInputs.price[0].toString());
      }
      if (rangeInputs.price[1] < rangeBounds.price[1]) {
        params.set('maxPrice', rangeInputs.price[1].toString());
      }
      if (rangeInputs.treadDepth[0] > rangeBounds.treadDepth[0]) {
        params.set('minTreadDepth', rangeInputs.treadDepth[0].toString());
      }
      if (rangeInputs.treadDepth[1] < rangeBounds.treadDepth[1]) {
        params.set('maxTreadDepth', rangeInputs.treadDepth[1].toString());
      }
      if (rangeInputs.remainingLife[0] > rangeBounds.remainingLife[0]) {
        params.set('minRemainingLife', rangeInputs.remainingLife[0].toString());
      }
      if (rangeInputs.remainingLife[1] < rangeBounds.remainingLife[1]) {
        params.set('maxRemainingLife', rangeInputs.remainingLife[1].toString());
      }

      // Añadir parámetros de checkbox
      if (checkboxInputs.condition.length > 0) {
        params.set('condition', checkboxInputs.condition.join(','));
      }
      if (checkboxInputs.patched.length > 0) {
        params.set('patched', checkboxInputs.patched.join(','));
      }

      // Añadir parámetros de dimensiones de neumáticos (w, s, d) si existen en la URL
      const width = searchParams.get('w');
      const sidewall = searchParams.get('s');
      const diameter = searchParams.get('d');

      if (width) params.set('w', width);
      if (sidewall) params.set('s', sidewall);
      if (diameter) params.set('d', diameter);

      // Shared across hook instances (058): the desktop and phone panels both
      // run this hook, and each used to ask for the same brands.
      const data = await sharedJson<string[]>(`${apiBasePath}/brands?${params.toString()}`);
      setAvailableBrands(data);
    } catch (err) {
      console.error('Failed to fetch brands with filters', err);
      // En caso de error, mantener las marcas actuales
    } finally {
      setIsLoadingBrands(false);
    }
  }, [
    rangeInputs.price[0],
    rangeInputs.price[1],
    rangeInputs.treadDepth[0],
    rangeInputs.treadDepth[1],
    rangeInputs.remainingLife[0],
    rangeInputs.remainingLife[1],
    rangeBounds.price[0],
    rangeBounds.price[1],
    rangeBounds.treadDepth[0],
    rangeBounds.treadDepth[1],
    rangeBounds.remainingLife[0],
    rangeBounds.remainingLife[1],
    checkboxInputs.condition.join(','),
    checkboxInputs.patched.join(','),
    searchParams.toString(),
    apiBasePath,
  ]);

  useEffect(() => {
    const fetchBounds = async () => {
      try {
        setIsLoadingRanges(true);
        // One request for every panel on the page (058).
        const data = await sharedJson<{
          minPrice: number;
          maxPrice: number;
          minTreadDepth: number;
          maxTreadDepth: number;
          minRemainingLife: number;
          maxRemainingLife: number;
        }>(`${apiBasePath}/ranges`);
        const bounds: RangeBounds = {
          price: [data.minPrice, data.maxPrice],
          treadDepth: [data.minTreadDepth, data.maxTreadDepth],
          remainingLife: [data.minRemainingLife, data.maxRemainingLife],
        };
        setRangeBounds(bounds);
      } catch (err) {
        console.error('Failed to fetch range bounds', err);
      } finally {
        setIsLoadingRanges(false);
      }
    };

    void fetchBounds();
    // Ahora la carga inicial de marcas se maneja a través de fetchFilteredBrands
  }, [apiBasePath]);

  // Cargar las tiendas disponibles (solo cuando enableStoreFilter está activo)
  useEffect(() => {
    if (!options?.enableStoreFilter) return;
    const fetchStores = async () => {
      try {
        setIsLoadingStores(true);
        const stores = await sharedJson<string[]>(`${apiBasePath}/stores`);
        setAvailableStores(stores);
        // Normalize URL store values to exact VaultName casing (e.g. "orlando" → "Orlando")
        setCheckboxInputs(prev => {
          if (!prev.stores.length) return prev;
          const normalized = prev.stores.map(s => {
            const match = stores.find(a => a.toLowerCase() === s.toLowerCase());
            return match ?? s;
          });
          if (normalized.join(',') === prev.stores.join(',')) return prev;
          return { ...prev, stores: normalized };
        });
      } catch (err) {
        console.error('Failed to fetch stores', err);
      } finally {
        setIsLoadingStores(false);
      }
    };
    void fetchStores();
  }, [apiBasePath, options?.enableStoreFilter]);

  /**
   * Shelf codes, scoped to the stores currently selected.
   *
   * Unlike the stores effect above this one keys on the **selection**, not on
   * mount: unscoped the catalog holds 675 codes, which is not a menu, and a code
   * means nothing without its store. With nothing selected we ask for nothing —
   * the control is disabled in that state.
   *
   * It also prunes: deselecting a store must drop the codes that belonged only to
   * it, or the filter goes on matching a shelf the user can no longer see. Since
   * this writes state derived from its own dependency, it returns `prev`
   * untouched when nothing was dropped — the same guard the stores effect uses to
   * avoid a render loop.
   */
  const selectedStoresKey = checkboxInputs.stores.join(',');

  useEffect(() => {
    if (!options?.enableStoreFilter) return;

    const stores = selectedStoresKey.split(',').filter(Boolean);

    if (stores.length === 0) {
      setAvailableLocations([]);
      setIsLoadingLocations(false);
      setCheckboxInputs(prev => (prev.locations.length ? { ...prev, locations: [] } : prev));
      return;
    }

    // Drop selections whose store is gone before the request resolves, so the
    // table never sits filtered by a shelf the user can no longer choose.
    setCheckboxInputs(prev => {
      if (!prev.locations.length) return prev;
      const kept = prev.locations.filter(entry => {
        const [pair] = parseLocationPairs(entry);
        return pair ? stores.includes(pair.store) : false;
      });
      return kept.length === prev.locations.length ? prev : { ...prev, locations: kept };
    });

    let cancelled = false;

    const fetchLocations = async () => {
      try {
        setIsLoadingLocations(true);
        const query = new URLSearchParams({ stores: stores.join(',') });
        const res = await fetch(`${apiBasePath}/locations?${query.toString()}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { store: string; code: string }[];
        if (!cancelled) setAvailableLocations(data);
      } catch (err) {
        console.error('Failed to fetch locations', err);
      } finally {
        if (!cancelled) setIsLoadingLocations(false);
      }
    };

    void fetchLocations();

    return () => {
      cancelled = true;
    };
  }, [apiBasePath, options?.enableStoreFilter, selectedStoresKey]);

  // Cargar las marcas iniciales y cuando cambien los filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchFilteredBrands();
    }, 400); // Debounce de 400ms para evitar ráfagas de peticiones

    return () => clearTimeout(timer);
  }, [fetchFilteredBrands]);

  // Update filter values when URL changes
  useEffect(() => {
    const newRangeInputs = {
      price: [
        parseInt(searchParams.get('minPrice') || rangeBounds.price[0].toString(), 10),
        parseInt(searchParams.get('maxPrice') || rangeBounds.price[1].toString(), 10),
      ],
      treadDepth: [
        parseFloat(searchParams.get('minTreadDepth') || rangeBounds.treadDepth[0].toString()),
        parseFloat(searchParams.get('maxTreadDepth') || rangeBounds.treadDepth[1].toString()),
      ],
      remainingLife: [
        parseInt(
          searchParams.get('minRemainingLife') || rangeBounds.remainingLife[0].toString(),
          10
        ),
        parseInt(
          searchParams.get('maxRemainingLife') || rangeBounds.remainingLife[1].toString(),
          10
        ),
      ],
    } as RangeInputs;

    const newCheckboxInputs = {
      condition: searchParams.get('condition')?.split(',').filter(Boolean) || [],
      patched: searchParams.get('patched')?.split(',').filter(Boolean) || [],
      kindSale: searchParams.get('kindSale')?.split(',').filter(Boolean) || [],
      brands: searchParams.get('brands')?.split(',').filter(Boolean) || [],
      stores: searchParams.get('stores')?.split(',').filter(Boolean) || [],
      locations: searchParams.get('locations')?.split(',').filter(Boolean) || [],
      local: searchParams.get('local')?.split(',').filter(Boolean) || [],
    } as CheckboxInputs;

    setRangeInputs(newRangeInputs);
    setCheckboxInputs(newCheckboxInputs);
  }, [searchParams, rangeBounds]);

  // Update URL parameters when filters change
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    let filterChanged = false;

    const setOrDelete = (key: string, shouldSet: boolean, val: string) => {
      const curVal = params.get(key);
      if (shouldSet) {
        if (curVal !== val) {
          filterChanged = true;
        }
        params.set(key, val);
      } else {
        if (curVal !== null) {
          filterChanged = true;
        }
        params.delete(key);
      }
    };

    // Update range inputs in URL
    setOrDelete(
      'minPrice',
      rangeInputs.price[0] > rangeBounds.price[0],
      rangeInputs.price[0].toString()
    );
    setOrDelete(
      'maxPrice',
      rangeInputs.price[1] < rangeBounds.price[1],
      rangeInputs.price[1].toString()
    );

    setOrDelete(
      'minTreadDepth',
      rangeInputs.treadDepth[0] > rangeBounds.treadDepth[0],
      rangeInputs.treadDepth[0].toString()
    );
    setOrDelete(
      'maxTreadDepth',
      rangeInputs.treadDepth[1] < rangeBounds.treadDepth[1],
      rangeInputs.treadDepth[1].toString()
    );

    setOrDelete(
      'minRemainingLife',
      rangeInputs.remainingLife[0] > rangeBounds.remainingLife[0],
      rangeInputs.remainingLife[0].toString()
    );
    setOrDelete(
      'maxRemainingLife',
      rangeInputs.remainingLife[1] < rangeBounds.remainingLife[1],
      rangeInputs.remainingLife[1].toString()
    );

    // Update checkbox inputs in URL
    setOrDelete(
      'condition',
      checkboxInputs.condition.length > 0,
      checkboxInputs.condition.join(',')
    );
    setOrDelete('patched', checkboxInputs.patched.length > 0, checkboxInputs.patched.join(','));
    setOrDelete('kindSale', checkboxInputs.kindSale.length > 0, checkboxInputs.kindSale.join(','));
    setOrDelete('brands', checkboxInputs.brands.length > 0, checkboxInputs.brands.join(','));
    setOrDelete('stores', checkboxInputs.stores.length > 0, checkboxInputs.stores.join(','));
    setOrDelete(
      'locations',
      checkboxInputs.locations.length > 0,
      checkboxInputs.locations.join(',')
    );
    setOrDelete('local', checkboxInputs.local.length > 0, checkboxInputs.local.join(','));

    // Only reset pagination when filters actually changed
    if (filterChanged) {
      params.set('page', '1');
    }

    // Preserve existing search parameters that aren't related to filters.
    // Only navigate when something changed (058): when the ranges arrive, each
    // instance of this hook (the dashboard mounts two) re-derives its inputs
    // and landed here with the same URL, so every visit made extra page-data
    // round trips for nothing.
    if (redirectBasePath && filterChanged) {
      const newUrl = `/${redirectBasePath}?${params.toString()}`;
      router.push(newUrl, { scroll: false });
    }
  }, [
    searchParams.toString(),
    rangeInputs.price[0],
    rangeInputs.price[1],
    rangeInputs.treadDepth[0],
    rangeInputs.treadDepth[1],
    rangeInputs.remainingLife[0],
    rangeInputs.remainingLife[1],
    rangeBounds.price[0],
    rangeBounds.price[1],
    rangeBounds.treadDepth[0],
    rangeBounds.treadDepth[1],
    rangeBounds.remainingLife[0],
    rangeBounds.remainingLife[1],
    checkboxInputs.condition.join(','),
    checkboxInputs.patched.join(','),
    checkboxInputs.kindSale.join(','),
    checkboxInputs.brands.join(','),
    checkboxInputs.stores.join(','),
    checkboxInputs.locations.join(','),
    checkboxInputs.local.join(','),
    redirectBasePath,
    router,
  ]);

  // Update URL when filters change but ignore the initial mount
  const isFirstRender = useRef(true);
  const previousFilters = useRef(JSON.stringify({ rangeInputs, checkboxInputs }));

  useEffect(() => {
    // Skip the initial render to avoid double updates
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const currentFiltersStr = JSON.stringify({ rangeInputs, checkboxInputs });
    if (previousFilters.current !== currentFiltersStr) {
      previousFilters.current = currentFiltersStr;

      // Debounce the URL update to avoid excessive pushes while sliding
      const timer = setTimeout(() => {
        updateUrlParams();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [rangeInputs, checkboxInputs, updateUrlParams]);

  // Handle range slider changes
  const handleRangeChange = (type: keyof RangeInputs, value: [number, number]) => {
    setRangeInputs(prev => {
      return {
        ...prev,
        [type]: value,
      };
    });
  };

  // Handle checkbox changes
  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = event.target;
    const category = name.split('[')[0] as keyof CheckboxInputs;

    setCheckboxInputs(prev => {
      let newState;
      if (checked) {
        newState = {
          ...prev,
          [category]: [...prev[category], value],
        };
      } else {
        newState = {
          ...prev,
          [category]: prev[category].filter(item => item !== value),
        };
      }
      return newState;
    });
  };

  // Reset all filters to default values
  const resetFilters = useCallback(() => {
    // Reset range inputs to defaults
    const defaultRangeInputs = {
      price: [...rangeBounds.price] as [number, number],
      treadDepth: [...rangeBounds.treadDepth] as [number, number],
      remainingLife: [...rangeBounds.remainingLife] as [number, number],
    } as RangeInputs;
    setRangeInputs(defaultRangeInputs);

    // Reset checkbox inputs to empty arrays
    const defaultCheckboxInputs = {
      condition: [],
      patched: [],
      kindSale: [],
      brands: [],
      stores: [],
      locations: [],
      local: [],
    };
    setCheckboxInputs(defaultCheckboxInputs);

    // Clear filter parameters from URL
    const params = new URLSearchParams(searchParams.toString());

    // Remove range input parameters
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('minTreadDepth');
    params.delete('maxTreadDepth');
    params.delete('minRemainingLife');
    params.delete('maxRemainingLife');

    // Remove checkbox input parameters
    params.delete('condition');
    params.delete('patched');
    params.delete('kindSale');
    params.delete('brands');
    params.delete('stores');
    params.delete('locations');
    params.delete('local');

    // Also remove tire size parameters to ensure a full reset
    params.delete('w');
    params.delete('s');
    params.delete('d');
    params.delete('code');

    params.set('page', '1');

    // Update URL
    if (redirectBasePath) {
      const newUrl = `/${redirectBasePath}?${params.toString()}`;
      router.push(newUrl, { scroll: false });
    }
  }, [
    searchParams,
    router,
    rangeBounds.price[0],
    rangeBounds.price[1],
    rangeBounds.treadDepth[0],
    rangeBounds.treadDepth[1],
    rangeBounds.remainingLife[0],
    rangeBounds.remainingLife[1],
    redirectBasePath,
  ]);

  return {
    availableBrands,
    availableStores,
    availableLocations,
    isLoadingLocations,
    rangeInputs,
    rangeBounds,
    checkboxInputs,
    handleRangeChange,
    handleCheckboxChange,
    isLoadingRanges,
    isLoadingBrands,
    isLoadingStores,
    resetFilters,
    isChecked: (category: keyof CheckboxInputs, value: string) =>
      checkboxInputs[category].includes(value),
  };
};
