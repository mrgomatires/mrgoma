import { InfoCardData } from '@/app/ui/components/InfoCard/info-card';
import InfoCard from '@/app/ui/components/InfoCard/InfoCard';
import { infoCardsData } from '@/app/ui/sections/InfoCardsSection/InfoCardsData';

interface InfoCardsSectionProps {
  cards?: InfoCardData[];
  className?: string;
}

export const InfoCardsSection = ({
  cards = infoCardsData,
  className = 'py-16',
}: InfoCardsSectionProps) => {
  if (!cards.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No information cards available.</p>
      </div>
    );
  }

  return (
    <section className={className}>
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cards.map(card => (
            <InfoCard key={card.id} {...card} className="h-full" />
          ))}
        </div>
      </div>
    </section>
  );
};

export default InfoCardsSection;
