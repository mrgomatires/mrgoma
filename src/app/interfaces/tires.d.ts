import React from 'react';

export interface TiresData {
  TireId: string;
  VaultId?: number;
  Code: string;
  Size?: string;
  VaultName?: string;
  Model?: null;
  Location?: string;
  Nail?: null;
  Description?: string;
  Priority?: number;
  DOT?: string;
  Brand?: string;
  Height?: string;
  Width?: string;
  Material?: null;
  Patched?: string;
  Tread?: string;
  CreationDate?: Date;
  Status?: string;
  ModificationUserId?: string;
  ModificationDate?: Date;
  CreationUserId?: string;
  StatusId?: number;
  TreadId?: number;
  MaterialId?: null;
  HeightId?: number;
  WidthId?: number;
  SizeId?: number;
  BrandId?: number;
  Condition?: string;
  ConditionId?: number;
  Local?: string;
  ProductType?: string;
  ProductTypeId?: number;
  Amount?: number;
  RealSize?: string;
  Price?: number;
  RemainingLife?: null;
  Image1?: null;
  Image2?: null;
  Image3?: null;
  Image4?: null;
  Trash?: boolean;
  ModelId?: number;
  KindSale?: string;
  KindSaleId?: number;
  Model2?: string;
  Single?: boolean;
  SetOf2?: boolean;
  SetOf4?: boolean;
  loadIndex?: string;
  speedIndex?: string;
  LoadIndexId?: number;
  SpeedIndexId?: number;
  LocalId?: number;
  LocalCode?: string;
  OfferUp?: null;
  OfferUpId?: number;
  /** Derived server-side from `VaultName` by `pickTireListFields` (feature 041). */
  City?: 'Miami' | 'Orlando';
}

export interface singleTireImages {
  id: number;
  name: string;
  src: string;
  alt: string;
}

export interface SingleTireDetails {
  name: string;
  items: string[];
}

export interface SingleTire {
  /** Where the tire is, derived from the warehouse. Never the warehouse name. */
  city?: 'Miami' | 'Orlando';
  id: string | number;
  /**
   * The stock code staff search by — the value the product name shows in
   * parentheses. Distinct from `id`, which is the internal TireId in the URL.
   */
  code?: string;
  // DB Condition, e.g., 'sold' when already sold; used for availability checks
  status?: string;
  name: string;
  color: string;
  price: string;
  brand: string;
  brandId: number;
  condition: string;
  patched: string;
  remainingLife: string;
  treadDepth: string;
  dot?: string;
  size?: string;
  loadIndex?: string;
  speedIndex?: string;
  runFlat?: string;
  images: singleTireImages[];
  model2?: string;
  details: SingleTireDetails[];
}

export interface TireFeature {
  name: string;
  value: string;
  icon?: null | React.ReactNode;
}

export interface TransformedTire {
  /** The model and size as fields, not folded into `name`. */
  model?: string;
  size?: string;
  id: string;
  name: string;
  color: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  price: string;
  brand: string;
  brandId: number;
  condition: string;
  status?: string;
  features: TireFeature[];
  /** Where the tire is, for the pickup-by-city rule (feature 041). */
  city?: 'Miami' | 'Orlando';
  /** For the comparison (051): week/year of manufacture, load index, speed rating. */
  dot?: string;
  loadIndex?: string;
  speedIndex?: string;
}

interface TireInformationProps {
  singleTire: SingleTire;
  /**
   * The "Build your set" block, rendered after the specs (feature 041). Passed
   * in rather than imported: the set block reads the database, and this
   * component is exported from the `@/app/ui/sections` barrel that client
   * components import — importing it here would drag `mssql` into the browser.
   */
  setSlot?: React.ReactNode;
  /** Feature 045: shown under "Not available" for a sold tire ("N like it in stock"). */
  soldSlot?: React.ReactNode;
}
