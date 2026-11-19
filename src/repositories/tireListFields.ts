import { storeCity } from '@/app/utils/storeCity';
import type { DocumentRecord } from '@/repositories/tiresRepository';

/**
 * The exact field set the storefront consumes from `/api/tires`. Both public
 * consumers — `getTires` and `SearchResults` — feed each record straight into
 * `transformTireData` (transformTireData.ts), which reads only these fields.
 * Trimming records to this shape drops internal-only DB columns (VaultName,
 * Local, Trash, Amount, ModificationDate, ConditionId, …) so they never
 * reach the browser, with zero impact on the UI.
 *
 * Keep this in lockstep with `transformTireData`: if the transform starts
 * reading a new field, add it here (a golden-shape test guards the contract).
 */
export type TireListRecord = {
  TireId: string;
  Code?: string;
  Brand?: string;
  Model2?: string;
  RealSize?: string;
  Image1?: string;
  Image2?: string;
  Image3?: string;
  Image4?: string;
  Price?: string | number;
  BrandId?: number;
  ProductTypeId?: number;
  Patched?: string;
  RemainingLife?: string;
  Tread?: string;
  KindSaleId?: number;
  /**
   * Where the tire is — derived from `VaultName` here, on the server, so the
   * warehouse name itself never leaves (feature 041: pickup by city).
   */
  City?: 'Miami' | 'Orlando';
  /**
   * Public facts for the tire comparison (051): printed on the tire and shown
   * on every tire page. DOT is the week/year of manufacture — nothing internal.
   */
  DOT?: string;
  loadIndex?: string;
  speedIndex?: string;
};

/** Returns only the whitelisted fields; internal columns are dropped. */
export function pickTireListFields(record: DocumentRecord): TireListRecord {
  return {
    TireId: record.TireId,
    Code: record.Code,
    Brand: record.Brand,
    Model2: record.Model2,
    RealSize: record.RealSize,
    Image1: record.Image1,
    Image2: record.Image2,
    Image3: record.Image3,
    Image4: record.Image4,
    Price: record.Price,
    BrandId: record.BrandId,
    ProductTypeId: record.ProductTypeId,
    Patched: record.Patched,
    RemainingLife: record.RemainingLife,
    Tread: record.Tread,
    KindSaleId: record.KindSaleId,
    City: storeCity(record.VaultName),
    DOT: record.DOT,
    loadIndex: record.loadIndex,
    speedIndex: record.speedIndex,
  };
}
