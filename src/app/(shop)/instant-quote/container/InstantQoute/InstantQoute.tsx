'use client';

import React, { FormEvent, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { SelectedFiltersContext } from '@/app/context/SelectedFilters';
import SearchByText from '@/app/ui/components/SearchByText/SearchByText';
import { locationsData } from '@/app/ui/sections/LocationsSlider/locationsData';
import { trackEvent } from '@/app/utils/analytics';
import { EVENTS } from '@/app/utils/analyticsEvents';

// Types
type Condition = 'new' | 'used' | 'both';

interface LeadForm {
  vehicleDetails: string; // free text: Make, Model, Year
  condition: Condition[];
  quantity: string; // number of tires, as the <select> value
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

const initialLead: LeadForm = {
  vehicleDetails: '',
  condition: [],
  quantity: '',
  name: '',
  email: '',
  phone: '',
  notes: '',
};

// A retail order is one to eight tires; larger fleet requests go through the
// notes. The API enforces the same range so nothing outside it reaches n8n.
const QUANTITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const SectionCard: React.FC<{
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ step, title, subtitle, children, className = '' }) => (
  <section
    className={`mb-8 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm ${className}`}
  >
    <div className="flex items-start gap-3 border-b border-gray-100 px-4 sm:px-6 py-4">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-lime-400 text-neutral-900 font-semibold text-sm select-none">
        {step}
      </span>
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="p-4 sm:p-6">{children}</div>
  </section>
);

const InstantQuote: React.FC = () => {
  const { selectedFilters } = useContext(SelectedFiltersContext);
  const [lead, setLead] = useState<LeadForm>(initialLead);
  const [pickupStore, setPickupStore] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Honeypot field for spam bots (should remain empty by humans)
  const [hp, setHp] = useState('');

  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const sizeText = useMemo(() => {
    const { width, sidewall, diameter } = selectedFilters || {};
    if (!width && !sidewall && !diameter) return '';
    return [width, sidewall, diameter].filter(Boolean).join('/');
  }, [selectedFilters]);

  const isEmailValid = (email: string) => /\S+@\S+\.\S+/.test(email);
  const isPhoneValid = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return /^\d{10}$/.test(digits);
  };
  const hasValid4DigitYear = (text: string) => {
    const match = text.match(/\b(\d{4})\b/);
    return !!match;
  };

  const allRequiredFilled =
    Boolean(sizeText) &&
    Boolean(lead.quantity) &&
    lead.name.trim().length > 1 &&
    (isEmailValid(lead.email) || isPhoneValid(lead.phone)) &&
    Boolean(pickupStore);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name } = target;
    let value = target.value;

    if (name === 'condition') {
      const val = target.value as Condition;
      const checked = target.checked;
      setLead(prev => {
        const cur = new Set(prev.condition);
        if (checked) cur.add(val);
        else cur.delete(val);
        return { ...prev, condition: Array.from(cur) };
      });
      return;
    }

    if (name === 'phone') {
      // Keep only digits and limit to 10
      const digits = value.replace(/\D/g, '').slice(0, 10);
      const part1 = digits.slice(0, 3);
      const part2 = digits.slice(3, 6);
      const part3 = digits.slice(6, 10);
      if (digits.length <= 3) value = part1 ? `(${part1}` : '';
      else if (digits.length <= 6) value = `(${part1}) ${part2}`;
      else value = `(${part1}) ${part2}-${part3}`;
    }

    if (name === 'vehicleDetails') {
      // Auto-capitalize each word
      value = value
        .toLowerCase()
        .replace(/\b([a-z])(\w*)/g, (_, a: string, b: string) => a.toUpperCase() + b);
    }

    setLead(prev => ({ ...prev, [name]: value }));
  };

  // Focus feed back banners when they appear
  useEffect(() => {
    if (error) {
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorRef.current?.focus();
      });
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      requestAnimationFrame(() => {
        successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        successRef.current?.focus();
      });
    }
  }, [success]);

  const focusFirstInvalid = () => {
    const form = formRef.current;
    if (!form) return;
    const ids = ['tireSize', 'quantity', 'name', 'email', 'phone', 'pickup-store'] as const;
    for (const id of ids) {
      const el = form.querySelector<HTMLElement>(`#${id}`) || document.getElementById(id);
      if (!el) continue;
      if (id === 'tireSize' && !sizeText) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
      if (id === 'quantity' && !lead.quantity) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
      if (id === 'name' && !(lead.name.trim().length > 1)) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
      if (id === 'email' && !lead.email && !isPhoneValid(lead.phone)) {
        // Require at least one contact method; focus email first
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
      if (id === 'phone' && !lead.phone && !isEmailValid(lead.email)) {
        const tel = form.querySelector<HTMLElement>('#phone');
        (tel || el).focus();
        (tel || el).scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
      if (id === 'pickup-store' && !pickupStore) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!allRequiredFilled) {
      setError('Please complete all required fields correctly.');
      focusFirstInvalid();
      return;
    }

    try {
      setSubmitting(true);

      const yearMatch = lead.vehicleDetails.match(/\b(\d{4})\b/);
      const derivedYear = yearMatch ? yearMatch[1] : '';
      const derivedCarBrand = lead.vehicleDetails.trim().split(/\s+/)[0] || '';

      const res = await fetch('/api/instant-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: sizeText,
          width: selectedFilters.width,
          sidewall: selectedFilters.sidewall,
          diameter: selectedFilters.diameter,
          vehicleDetails: lead.vehicleDetails,
          carBrand: derivedCarBrand,
          year: derivedYear,
          condition: lead.condition.join(','),
          quantity: Number(lead.quantity),
          pickupStoreId: pickupStore,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          notes: lead.notes,
          hp,
          submittedAt: new Date().toISOString(),
          source: 'instant-quote',
        }),
      });
      if (!res.ok) {
        const m = await res.json().catch(() => ({}));
        throw new Error(m?.message || 'Failed to submit');
      }
      setSuccess(true);
      // Past the `!res.ok` throw above, so this counts an accepted request and
      // never a failed or abandoned attempt. No field of `lead` is sent: the
      // form holds a name, email and phone, none of which may reach an
      // analytics platform.
      trackEvent({
        action: EVENTS.GENERATE_LEAD,
        category: 'lead',
        label: 'instant-quote',
      });
      setLead(initialLead);
      setPickupStore('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Instant Quote
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Get a quick quote by entering your tire size and basic vehicle details, then share your
            contact info. We&#39;ll reach out shortly.
          </p>
        </header>

        {/* Segment 1: Tire & Vehicle */}
        <SectionCard
          step={1}
          title="Tire & Vehicle"
          subtitle="Add vehicle and tire details, then enter your tire size."
        >
          <div id="tireSize" tabIndex={-1} className="-mt-4 mb-2 h-0" />
          <div className="lg:col-span-2 mb-6">
            <SearchByText showButton={false} enableSubmit={false} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-1" id="condition">
                  Tire Condition
                </legend>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="condition"
                      value="new"
                      checked={lead.condition.includes('new')}
                      onChange={handleChange}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span>New</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="condition"
                      value="used"
                      checked={lead.condition.includes('used')}
                      onChange={handleChange}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span>Used</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="condition"
                      value="both"
                      checked={lead.condition.includes('both')}
                      onChange={handleChange}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span>Both</span>
                  </label>
                </div>
              </fieldset>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="quantity">
                How many tires? <span className="text-red-500">*</span>
              </label>
              <select
                id="quantity"
                name="quantity"
                value={lead.quantity}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white text-sm"
              >
                <option value="">Select…</option>
                {QUANTITY_OPTIONS.map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Need more than 8? Tell us in the notes.</p>
            </div>

            <div className="lg:col-span-2">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="vehicleDetails"
              >
                Vehicle Details (Make, Model, Year)
              </label>
              <input
                id="vehicleDetails"
                name="vehicleDetails"
                type="text"
                value={lead.vehicleDetails}
                onChange={handleChange}
                placeholder="e.g. Toyota Camry 2019"
                aria-describedby="vehicleDetailsHelp vehicleDetailsError"
                aria-invalid={
                  lead.vehicleDetails !== '' && !hasValid4DigitYear(lead.vehicleDetails)
                }
                className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white text-sm"
              />
              <p id="vehicleDetailsHelp" className="text-xs text-gray-500 mt-1">
                Example: Honda Civic 2020
              </p>
              {lead.vehicleDetails !== '' && !hasValid4DigitYear(lead.vehicleDetails) && (
                <p id="vehicleDetailsError" className="text-xs text-red-600 mt-1">
                  Please include a 4-digit model year (e.g., 2021).
                </p>
              )}
            </div>
          </div>

          {/* Helper showing current size captured */}
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium">Selected size:</span>{' '}
            {sizeText ? (
              <span className="text-gray-800">{sizeText}</span>
            ) : (
              <span className="text-red-600">Please enter your tire size.</span>
            )}
          </div>
        </SectionCard>

        {/* Segment 2: Lead info */}
        <SectionCard
          step={2}
          title="Where should we send your quote?"
          subtitle="We will use this to send your quote."
        >
          <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={lead.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">First and last name.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={lead.email}
                  onChange={handleChange}
                  placeholder="you@email.com"
                  aria-describedby="emailError"
                  aria-invalid={!!lead.email && !isEmailValid(lead.email)}
                  className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white text-sm"
                />
                {lead.email && !isEmailValid(lead.email) && (
                  <p id="emailError" className="text-xs text-red-600 mt-1">
                    Enter a valid email.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={lead.phone}
                  onChange={handleChange}
                  placeholder="(555) 555-5555"
                  aria-describedby="phoneError"
                  aria-invalid={!!lead.phone && !isPhoneValid(lead.phone)}
                  className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white text-sm"
                />
                {lead.phone && !isPhoneValid(lead.phone) && (
                  <p id="phoneError" className="text-xs text-red-600 mt-1">
                    Enter a valid phone.
                  </p>
                )}
              </div>
            </div>

            {/* Notes (optional) */}
            <div className="lg:col-span-2">
              <label htmlFor="pickup-store" className="block text-sm font-medium text-gray-900">
                Choose a store for pick-up <span className="text-red-500">*</span>
              </label>
              <select
                id="pickup-store"
                value={pickupStore}
                onChange={e => setPickupStore(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select a store…</option>
                {locationsData.map(loc => (
                  <option key={loc.id} value={`${loc.name} — ${loc.address}`}>
                    {loc.name} — {loc.address}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                We will prepare your order at the selected store. Bring your ID and order
                confirmation.
              </p>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={lead.notes}
                onChange={handleChange}
                maxLength={120}
                placeholder="Add any additional comment (max 120 characters)"
                className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white text-sm h-24"
              />
              <p className="text-xs text-gray-500 mt-1">
                {`${(lead.notes || '').length}/120 characters`}
              </p>
            </div>

            {/* Hidden fields mirroring Segment 1 to include in the same submitting */}
            <input type="hidden" name="vehicleDetailsHidden" value={lead.vehicleDetails} readOnly />
            <input type="hidden" name="conditionHidden" value={lead.condition.join(',')} readOnly />
            <input type="hidden" name="notesHidden" value={lead.notes || ''} readOnly />
            {/* Honeypot field: visually hidden; bots may fill it */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-10000px',
                top: 'auto',
                width: 1,
                height: 1,
                overflow: 'hidden',
              }}
            >
              <label htmlFor="hp">Leave this field empty</label>
              <input
                id="hp"
                name="hp"
                type="text"
                autoComplete="off"
                tabIndex={-1}
                value={hp}
                onChange={e => setHp(e.target.value)}
              />
            </div>

            {error && (
              <div
                ref={errorRef}
                tabIndex={-1}
                className="lg:col-span-2 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3"
                role="alert"
                aria-live="assertive"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 mt-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5zM10 13a1 1 0 100 2 1 1 0 000-2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="lg:col-span-2 flex flex-col sm:flex-row items-start gap-3 sm:items-center justify-between">
              <p className="text-xs text-gray-500">
                By sending, you agree to be contacted about your quote.
              </p>
              <button
                type="submit"
                disabled={!allRequiredFilled || submitting}
                // Deliberately untracked: a click here is an attempt, not a
                // lead. `generate_lead` fires in `onSubmit`, once the server has
                // actually accepted the request.
                className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2 text-sm font-medium rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors ${
                  !allRequiredFilled || submitting
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                }`}
              >
                {submitting && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                )}
                {submitting ? 'Sending…' : 'Get My Quote'}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Segment 3: Success notice */}
        {success && (
          <section
            ref={successRef}
            tabIndex={-1}
            aria-live="polite"
            className="rounded-lg border border-green-200 bg-green-50 p-8 flex items-start gap-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8 text-green-600 mt-0.5"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM16.28 9.72a.75.75 0 10-1.06-1.06L10.5 13.38l-1.72-1.72a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-green-800 text-base sm:text-lg font-medium">
              Thanks for choosing MrGoma Tires! Our team is preparing your quote now — you’ll
              receive prices and options shortly.
            </p>
          </section>
        )}
      </div>
    </main>
  );
};

export default InstantQuote;
