'use client';

import { FC, useEffect, useRef, useState } from 'react';

import { preload } from 'react-dom';

interface HeroVideoProps {
  src: string;
  poster: string;
  className?: string;
}

/** Events after which a previously-undecodable element may finally be playable. */
const READY_EVENTS = ['loadedmetadata', 'loadeddata', 'canplay'] as const;

/** First-touch signals. Any one of them gives the document user activation. */
const GESTURE_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'] as const;

/**
 * The hero's decorative background video.
 *
 * Muted autoplay is not something markup can guarantee, so this is a client
 * component. Two refusals were observed on a real iPhone:
 *
 *  - **Safari under Low Power Mode** blocks autoplay outright; with it off the
 *    video starts on its own.
 *  - **Chrome for iOS refuses always.** It runs on WebKit like every iOS
 *    browser, but its WKWebView host requires a user gesture for any playback
 *    regardless of muting or battery mode.
 *
 * Both explain the original report — the video played after navigating away and
 * back because that tap granted the document user activation, and a `play()`
 * under activation is never refused. So playback is attempted in three widening
 * rings: at mount, again once the media is decodable (`preload="metadata"` may
 * leave nothing to play on the first try), and finally on the visitor's first
 * interaction anywhere on the page — the one moment iOS will not say no. People
 * reach for the search controls within a second or two, so it does start.
 *
 * The poster lives on a sibling layer rather than in the element's `poster`
 * attribute, and the video fades in only once it is genuinely playing. That is
 * what keeps WebKit's play-button overlay off the hero: the platform draws that
 * glyph over any video that hasn't started, `controls={false}` notwithstanding,
 * and it was showing through the search card. A transparent element has nothing
 * to draw. Styling `::-webkit-media-controls-start-playback-button` is the usual
 * advice, but it is a non-standard pseudo-element that was observed doing
 * nothing in Chrome for iOS, so it stays only as a backstop in globals.css.
 *
 * `src` sits on the element rather than in a `<source>` child on purpose:
 * WebKit evaluates autoplay eligibility as part of resource selection, and the
 * child form has it decide before the resource is settled.
 *
 * `preload` stays at `metadata` so the ~3 MB file does not compete with the
 * poster that wins the LCP race (see spec/features/002-lcp-fetchpriority) — and
 * the poster is now a plain background layer, painted from the very same
 * preloaded file.
 *
 * Motion is opt-out: `prefers-reduced-motion` leaves the poster in place.
 */
const HeroVideo: FC<HeroVideoProps> = ({ src, poster, className }) => {
  // The poster wins the home's LCP, and a <video> poster has no fetchpriority,
  // so preload it at high priority (spec 002). Called here, in a client
  // component, rather than in the server `Home` (055): from a server component
  // the hint rides the RSC payload, so every page that prefetched "/" (the
  // logo and the "Home" links, on every page) downloaded the home's hero at
  // high priority while its own LCP image waited. A client component's
  // `preload` is emitted when it renders — the home page only.
  preload(poster, { as: 'image', fetchPriority: 'high' });
  const ref = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause();
      return;
    }

    // Some browsers only honour muted as a property, and an unmuted video is
    // never allowed to autoplay — so assert it before asking.
    video.muted = true;

    const cleanups: Array<() => void> = [];
    const stopChasing = () => {
      cleanups.forEach(off => off());
      cleanups.length = 0;
    };

    const listen = (
      target: EventTarget,
      type: string,
      handler: () => void,
      options?: AddEventListenerOptions
    ) => {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    };

    const attempt = () => {
      if (!video.paused) {
        setIsPlaying(true);
        stopChasing();
        return;
      }
      // `play()` only returns a promise in browsers implementing the newer
      // spec; older ones return undefined, so don't assume there's a `then`.
      const started = video.play();
      if (started && typeof started.then === 'function') {
        started.then(
          () => {
            setIsPlaying(true);
            stopChasing();
          },
          () => {
            // Refused — leave the listeners armed for the next opportunity.
          }
        );
      }
    };

    // Autoplay can win the race against hydration, in which case no `playing`
    // event is coming: reveal the element on what we can observe right now.
    listen(video, 'playing', () => setIsPlaying(true));
    attempt();

    READY_EVENTS.forEach(type => listen(video, type, attempt));
    // A tab restored from the background can come back paused.
    listen(document, 'visibilitychange', () => {
      if (!document.hidden) attempt();
    });
    // The last resort, and the one iOS honours: the first real interaction.
    GESTURE_EVENTS.forEach(type => listen(document, type, attempt, { passive: true }));

    return stopChasing;
  }, []);

  return (
    <>
      {/* The poster, as its own layer so the video can stay transparent until
          it actually has frames to show. Same file the document preloads at
          high priority, so this is what paints for LCP. */}
      <div
        aria-hidden="true"
        className={className}
        style={{
          backgroundImage: `url("${poster}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <video
        ref={ref}
        className={`${className ?? ''} pointer-events-none transition-opacity duration-700 ${
          isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
        data-hero-video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  );
};

export default HeroVideo;
