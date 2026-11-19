'use client';

import { FC, useState } from 'react';

import Image from 'next/image';

import { brandLogoSrc, hasBrandLogo } from '@/app/utils/brandLogos';
import { brandName } from '@/app/utils/tireNaming';

interface BrandImageProps {
  product: {
    brand: string;
    brandId: number;
  };
}

/**
 * The box is **5:1**, not 4:1, because that is the shape of these logos.
 *
 * Measured across all 161 files: the median brand mark is **5.2:1** — tire
 * brands are wordmarks, not emblems. In the old 128×32 box the width ran out
 * first for most of them, so they were drawn well short of the box height: the
 * median filled 25 of 32 px and an 8:1 mark like Hankook or General only 16.
 * They read as thin strips beside the price.
 *
 * At 160×32 the median mark fills 31 px of the 32, and the widest gain a quarter
 * of their size. The nine square-ish logos are unaffected — they were already
 * height-limited.
 *
 * The row wraps, so the extra 32 px costs nothing on a narrow card.
 */
const BrandImage: FC<BrandImageProps> = ({ product }) => {
  const [failed, setFailed] = useState(false);
  const name = brandName(product.brand);

  // A brand with no logo file shows its name — and asks for no file. Before
  // 055 every such card requested `{id}-logo.webp`, got a 404, then fell back.
  if (failed || !hasBrandLogo(product.brandId)) {
    return (
      <span className="flex h-full max-w-40 items-center truncate pl-1 text-sm font-black uppercase tracking-wide text-gray-800">
        {name}
      </span>
    );
  }

  return (
    <Image
      className="h-full aspect-auto w-full max-w-40 pl-1 object-contain object-center"
      src={brandLogoSrc(product.brandId)}
      alt={name}
      title={name}
      /*
       * The box, not the file. These told `next/image` the mark was 128×96 —
       * 4:3 — which no logo here is, and which stopped matching anything once
       * the files were trimmed to their ink. They drive the srcset and the
       * reserved space, so they should describe where the image goes.
       */
      width={160}
      height={32}
      onError={() => setFailed(true)}
    />
  );
};

export default BrandImage;
