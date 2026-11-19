import React from 'react';

import { ServiceCardData } from '@/app/ui/components/ServiceCard/service';
import ServiceCard from '@/app/ui/components/ServiceCard/ServiceCard';
import { promoBannerConfig } from '@/app/ui/sections/PromoBanner/config/promoBanner';
import PromoBanner from '@/app/ui/sections/PromoBanner/PromoBanner';

import { servicesData } from './servicesData';

interface ServicesGridProps {
  services?: ServiceCardData[];
  className?: string;
  onServiceClick?: (serviceId: string) => void;
}

export const ServicesGrid = ({ services = servicesData, className = '' }: ServicesGridProps) => {
  if (!services.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No services available at the moment.</p>
      </div>
    );
  }

  return (
    <section className={`${className} px-4 sm:px-6 lg:px-8 py-16`}>
      <PromoBanner content={promoBannerConfig.searchResults} className="mb-6" />
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map(service => (
            <ServiceCard key={service.id} {...service} className="h-full" />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;
