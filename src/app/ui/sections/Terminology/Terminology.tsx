import React from 'react';

import { terminology } from '@/app/(shop)/detail/data/terminology';
import TerminologyItem from '@/app/ui/components/TerminologyItem/TerminologyItem';

const Terminology = () => {
  return (
    <section
      aria-labelledby="terminology-title"
      className="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8"
    >
      <div className="max-w-3xl">
        <h2 id="terminology-title" className="text-2xl sm:text-3xl font-bold mb-2">
          Terminology
        </h2>
        <p className="text-sm sm:text-base text-gray-300">
          Quick glossary of common tire terms to help you understand product details.
        </p>
      </div>
      <ul
        role="list"
        className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 list-none"
      >
        {terminology.map(item => (
          <TerminologyItem item={item} key={item.id} />
        ))}
      </ul>
    </section>
  );
};

export default Terminology;
