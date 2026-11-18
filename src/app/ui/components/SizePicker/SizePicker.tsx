'use client';

import { FC, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { trackEvent } from '@/app/utils/analytics';
import { ratiosFor, reconcile, rimsFor, type SizeTree, widthGroups } from '@/app/utils/sizeTree';

export type SizePick = { w: string; s: string; d: string };

export type SizePickerSurface = 'home' | 'tires' | '3d';

type Step = 'w' | 's' | 'd';

const STEPS: ReadonlyArray<{ id: Step; name: string; track: string; heading: string }> = [
  { id: 'w', name: 'Width', track: 'width', heading: 'Choose the width' },
  { id: 's', name: 'Aspect ratio', track: 'ratio', heading: 'Choose the aspect ratio' },
  { id: 'd', name: 'Rim', track: 'rim', heading: 'Choose the rim size (inches)' },
];

interface SizePickerProps {
  /** Every size for sale, from `useStockedSizes`; `null` while loading. */
  tree: SizeTree | null;
  value: SizePick;
  /** The whole pick after a change, later steps already reconciled (FR5). */
  onChange: (next: SizePick) => void;
  /** The rim was chosen: the size is complete. The host focuses its Search (D3). */
  onComplete?: (pick: SizePick) => void;
  /** Where the picker lives, for analytics. */
  surface: SizePickerSurface;
  error?: boolean;
}

/**
 * Pick a tire size in three steps — width, aspect ratio, rim — with buttons
 * that only offer what is for sale (feature 049).
 *
 * - **Buttons, not radios.** Arrow keys move *and check* a radio, which would
 *   advance to the next step on the first key press. Buttons keep Tab/Enter.
 *   The chosen value carries `aria-current`, not `aria-pressed` (a choice in a
 *   set, not a toggle; and `ariaPressed.guard.test.ts` keeps it out of `src/app`).
 * - **Inline panel**, not an overlay: it works the same in the home hero, the
 *   `/tires` floating form and the 3D preview's modal, needs no focus trap and
 *   opens only on a user action.
 * - **Auto-advance:** choosing a value moves to the next step and focuses its
 *   first option, inside a group named by its heading, so a screen reader
 *   announces the new step. Choosing the rim closes the panel and hands focus to
 *   the host (`onComplete`). Nothing here searches (D3).
 */
const SizePicker: FC<SizePickerProps> = ({ tree, value, onChange, onComplete, surface, error }) => {
  const uid = useId();
  const [open, setOpen] = useState<Step | null>(null);
  const [announce, setAnnounce] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Record<Step, HTMLButtonElement | null>>({ w: null, s: null, d: null });
  const focusFirst = useRef(false);

  // On opening a step (by its button or by auto-advance), put focus on its
  // current value, or its first option — like a menu button, so the keyboard
  // lands on the choices instead of tabbing past the other two steps.
  useEffect(() => {
    if (!open || !focusFirst.current) return;
    focusFirst.current = false;
    const panel = panelRef.current;
    (
      panel?.querySelector<HTMLButtonElement>('button[data-option][aria-current="true"]') ??
      panel?.querySelector<HTMLButtonElement>('button[data-option]')
    )?.focus();
  }, [open]);

  const reachable: Record<Step, boolean> = {
    w: Boolean(tree),
    s: Boolean(tree && value.w),
    d: Boolean(tree && value.w && value.s),
  };

  const openStep = (step: Step) => {
    if (!reachable[step]) return;
    if (open === step) {
      setOpen(null);
      return;
    }
    focusFirst.current = true;
    setOpen(step);
  };

  const choose = (step: Step, v: string) => {
    if (!tree) return;
    const next = reconcile(tree, { ...value, [step]: v });
    onChange(next);
    if (step === 'w') {
      focusFirst.current = true;
      setOpen('s');
    } else if (step === 's') {
      focusFirst.current = true;
      setOpen('d');
    } else {
      setOpen(null);
      setAnnounce(`Size ${next.w}/${next.s}/${next.d} selected.`);
      trackEvent({
        action: 'size_picker_complete',
        category: 'size_picker',
        label: `${next.w}/${next.s}/${next.d}`,
        params: { surface },
      });
      onComplete?.(next);
    }
  };

  const onPanelKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !open) return;
    // Stop here so a host modal (the 3D preview) does not close as well.
    e.stopPropagation();
    const step = open;
    setOpen(null);
    stepRefs.current[step]?.focus();
  };

  const option = (step: Step, v: string, track: string) => {
    const selected = value[step] === v;
    return (
      <button
        key={v}
        type="button"
        data-option
        aria-current={selected ? 'true' : undefined}
        onClick={() => choose(step, v)}
        data-track="size_picker_select"
        data-track-category="size_picker"
        data-track-label={v}
        data-track-step={track}
        data-track-surface={surface}
        className={`size-picker-option min-h-11 min-w-14 rounded-md border px-2 text-sm font-semibold tabular-nums cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 ${
          selected
            ? 'border-green-600 bg-green-600 text-white'
            : 'border-gray-300 bg-white text-gray-800 hover:border-green-600 hover:bg-green-50'
        }`}
      >
        {v}
      </button>
    );
  };

  const panelId = `${uid}-panel`;
  const current = STEPS.find(s => s.id === open);

  return (
    <div className="size-picker" onKeyDown={onPanelKeyDown}>
      {/* The three steps: what was picked, and the way back to any of them (FR5). */}
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map(step => {
          const v = value[step.id];
          const isOpen = open === step.id;
          const enabled = reachable[step.id];
          return (
            <button
              key={step.id}
              ref={el => {
                stepRefs.current[step.id] = el;
              }}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-disabled={!enabled}
              onClick={() => openStep(step.id)}
              className={`flex min-h-12 flex-col items-start justify-center rounded-lg border px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${
                isOpen
                  ? 'border-green-600 bg-green-50'
                  : enabled
                    ? 'border-gray-300 bg-white hover:border-green-600 cursor-pointer'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <span className="text-xs font-medium text-gray-600">{step.name}</span>
              <span
                className={`text-base font-semibold tabular-nums ${v ? 'text-gray-900' : 'text-gray-500'}`}
              >
                {v || (step.id === 'w' && !tree && !error ? 'Loading…' : 'Select')}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-700">
          We couldn&apos;t load the sizes. Please reload the page.
        </p>
      )}

      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="size-picker-panel mt-2 rounded-lg border border-gray-200 bg-white p-3"
      >
        {current && tree && (
          <div role="group" aria-labelledby={`${uid}-${current.id}-heading`}>
            <p
              id={`${uid}-${current.id}-heading`}
              className="mb-2 text-sm font-semibold text-gray-800"
            >
              {current.heading}
            </p>

            {current.id === 'w' && (
              <>
                <p className="mb-3 text-xs text-gray-600">
                  The first number on your tire&apos;s sidewall, e.g.{' '}
                  <strong className="text-gray-800">235</strong>/45R18.
                </p>
                <div className="space-y-3">
                  {widthGroups(tree).map(group => (
                    <div key={group.id} role="group" aria-labelledby={`${uid}-g-${group.id}`}>
                      <p
                        id={`${uid}-g-${group.id}`}
                        className="mb-1 text-xs font-medium text-gray-600"
                      >
                        {group.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.widths.map(w => option('w', w, 'width'))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {current.id === 's' && (
              <div className="flex flex-wrap gap-2">
                {ratiosFor(tree, value.w).map(s => option('s', s, 'ratio'))}
              </div>
            )}

            {current.id === 'd' && (
              <div className="flex flex-wrap gap-2">
                {rimsFor(tree, value.w, value.s).map(d => option('d', d, 'rim'))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
};

export default SizePicker;
