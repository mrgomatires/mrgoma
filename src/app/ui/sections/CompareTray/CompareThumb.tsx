'use client';

import { FC, useState } from 'react';

import Image from 'next/image';

import { isOptimisableImage } from '@/app/utils/imageHosts';

const GENERIC = '/assets/images/generic-tire-image.webp';

/**
 * A tire photo in the compare tray and dialog (051), through `next/image` so a
 * 40–96 px thumbnail never downloads the supplier's 1,600 px original. Fixed
 * `width`/`height` and no `sizes`: a 1x/2x srcset of two transformations,
 * shared by both places (013's image-cost guard).
 */
const CompareThumb: FC<{ src?: string; className: string }> = ({ src, className }) => (
  <Image
    src={src && isOptimisableImage(src) ? src : GENERIC}
    alt=""
    width={96}
    height={96}
    className={className}
  />
);

export default CompareThumb;

/**
 * The brand's logo in a comparison card, or its name when there is no logo
 * file. Not the listing's `BrandImage`: imported into the store layout's tray,
 * that module put `next dev` into a loop of RSC refreshes (one a second; not in
 * production builds). Same logo files, no `priority`.
 */
export const CompareBrand: FC<{ brand: string; brandId?: number; label: string }> = ({
  brand,
  brandId,
  label,
}) => {
  const [failed, setFailed] = useState(!brandId);
  if (failed) return <span className="text-sm font-bold text-gray-900">{label}</span>;
  return (
    <Image
      src={`/assets/images/TireBrand/${brandId}-logo.webp`}
      alt={label}
      width={120}
      height={24}
      onError={() => setFailed(true)}
      className="h-6 w-auto max-w-28 object-contain object-left"
      data-brand={brand}
    />
  );
};
