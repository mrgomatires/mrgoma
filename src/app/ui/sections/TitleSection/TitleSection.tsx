import { ArrowsToRight } from '@/app/ui/icons/ArrowsToRight';

export interface SectionHeaderProps {
  title: string;
  color?: string;
  className?: string;
}

/**
 * A title section component. It renders a title with an arrow icon next to it.
 * The title is rendered as a heading element of level 2.
 */
export const TitleSection = ({
  title,
  color = '#272727',
  className = 'bg-white',
}: SectionHeaderProps) => {
  return (
    <div
      className={`relative flex items-center justify-center gap-4 sm:gap-6 py-8 px-6 max-w-3xl m-auto rounded-tl-3xl rounded-tr-3xl border border-b-0 border-lime-400 shadow-sm bg-white/90 backdrop-blur ${className}`}
      role="banner"
      aria-label={`Section: ${title}`}
    >
      <span className="inline-flex items-center justify-center rounded-full bg-lime-100 ring-1 ring-lime-300 p-2">
        <ArrowsToRight className="w-16 h-5 sm:w-20 sm:h-6 text-lime-600" />
      </span>
      <h2
        className={`text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight`}
        style={{ color }}
      >
        {title}
      </h2>
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-0.5 left-0 right-3 h-1 rounded-b-3xl bg-gradient-to-r from-lime-400/60 via-lime-300/30 to-transparent"
      />
    </div>
  );
};

export default TitleSection;
