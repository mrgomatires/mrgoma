import Link from 'next/link';

import { ArrowsToRight } from '@/app/ui/icons/ArrowsToRight';

export default function NotFound() {
  return (
    <main className="bg-white flex flex-col items-center justify-center min-h-[70vh] px-4 py-20 overflow-hidden relative">
      {/* Background "404" watermark */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none absolute text-[clamp(120px,30vw,280px)] font-black text-gray-100 leading-none"
      >
        404
      </span>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <ArrowsToRight className="w-20 h-auto mb-6" />

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
          This tire rolled off the page
        </h1>

        <p className="mt-4 text-base text-gray-500 max-w-md leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved. Head back to
          our catalog and find the right tire for your ride.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/tires"
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors duration-150"
          >
            Browse Tires
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors duration-150"
          >
            Go Home
          </Link>
        </div>

        <p className="mt-8 text-xs text-gray-600">
          If you followed a link and ended up here, please{' '}
          <Link href="/contact" className="underline hover:text-green-600 transition-colors">
            let us know
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
