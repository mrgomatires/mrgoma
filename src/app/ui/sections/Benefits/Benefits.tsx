import React from 'react';

import { benefits } from '@/app/(shop)/detail/data/benefits';
import BenefitsItem from '@/app/ui/components/BenefitsItem/BenefitsItem';

const Benefits = () => {
  return (
    <section
      aria-labelledby="benefits-title"
      className="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-7xl py-8 lg:px-8"
    >
      <div className="max-w-3xl">
        <h2 id="benefits-title" className="text-2xl sm:text-3xl font-bold text-gray-900">
          Why shop with MrGoma
        </h2>
        <p className="mt-1 text-sm sm:text-base text-gray-600">
          Enjoy these benefits with every purchase.
        </p>
      </div>
      <ul
        role="list"
        className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 list-none"
      >
        {benefits?.map(item => (
          <BenefitsItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
};

export default Benefits;
