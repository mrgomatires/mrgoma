'use client';

import Image from 'next/image';

import GoogleRating from '@/app/ui/components/GoogleRating/GoogleRating';
import { LocationIcon, PhoneIcon } from '@/app/ui/icons';

import { LocationCardProps } from './location-card';

export const LocationCard = ({
  name,
  address,
  locationStore,
  phone,
  backgroundImage,
  link,
  google,
  className = '',
}: LocationCardProps) => {
  const getPhoneUrl = () => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    return `tel:${cleanPhone}`;
  };

  const handleLocationClick = () => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePhoneClick = () => {
    window.open(getPhoneUrl(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        transition-all duration-300 ease-in-out shadow-lg
        ${className}
      `}
      role="article"
      aria-label={`Location: ${name}`}
    >
      <div className="relative h-96 w-full">
        <Image
          src={backgroundImage || '/placeholder.svg'}
          alt={`${name} location`}
          fill
          className="object-cover transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* The store's Google rating (053, D4). Text: the address button below
            already opens the store's profile, where the reviews are. */}
        {google && <GoogleRating figures={google} variant="card" className="mb-3 block" />}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <button
            type="button"
            onClick={handleLocationClick}
            className="flex gap-2 transition-colors cursor-pointer group"
            aria-label={`Open address link`}
          >
            <LocationIcon className="group-hover:scale-110 transition-transform" />
            <div className="flex flex-col gap-1" aria-label={`Address and Store`} role="group">
              <span className="text-sm text-left text-white font-medium hover:underline hover:underline-offset-8">
                {address}
              </span>
              <span className="text-sm text-left text-white font-medium hover:underline hover:underline-offset-8">
                {locationStore}
              </span>
            </div>
          </button>
          <button
            type="button"
            onClick={handlePhoneClick}
            data-track="call_store"
            data-track-category="contact"
            data-track-label={name}
            className="flex items-center gap-2 transition-colors cursor-pointer group"
            aria-label={`Call ${phone}`}
          >
            <PhoneIcon className="group-hover:scale-110 transition-transform" />
            <span className="text-sm text-left text-white font-medium hover:underline hover:underline-offset-8">
              {phone}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationCard;
