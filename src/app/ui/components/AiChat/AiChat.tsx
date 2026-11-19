'use client';

import React, { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

/** Parses inline Markdown tokens: **bold** and [text](url) */
function parseInline(text: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else {
      const m = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (m) {
        const [, label, href] = m;
        const external = href.startsWith('http');
        parts.push(
          <a
            key={match.index}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="text-green-600 underline hover:text-green-700 break-all"
          >
            {label}
          </a>
        );
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/** Renders assistant message content with basic markdown support */
function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {parseInline(line)}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

import mrGomaAvatar from '#public/assets/images/mrgoma-avatar.svg';

import ChatSetCards from './ChatSetCards';
import { DASHBOARD_EXAMPLE_QUERIES } from './exampleQueries';
import { useAiChat } from './hooks/useAiChat';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface AiChatProps {
  apiEndpoint?: string;
  redirectBasePath?: string;
  exampleQueries?: string[];
  /**
   * Which assistant this is — the public storefront one or the internal
   * dashboard one. Rides along on every event so staff activity can be told
   * apart from customers'.
   *
   * Required, deliberately. Both surfaces render this same component, and until
   * 2026-08-06 they emitted identical events with nothing to distinguish them:
   * every search a seller ran counted as a customer's. A default would let the
   * next mount site inherit the wrong label just as silently; a missing prop is
   * now a type error instead.
   */
  surface: string;
}

export default function AiChat({
  apiEndpoint,
  redirectBasePath,
  exampleQueries = DASHBOARD_EXAMPLE_QUERIES,
  surface,
}: AiChatProps) {
  if (process.env.NEXT_PUBLIC_AI_CHAT_ENABLED !== 'true') return null;

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const { messages, isLoading, sendMessage, clearChat } = useAiChat({
    apiEndpoint,
    redirectBasePath,
    surface,
  });

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Scroll the message log itself, never with `scrollIntoView`: that also
    // scrolls every scrollable ancestor — the panel included, despite its
    // `overflow: hidden` — and a smooth scroll measured before the log moved
    // pushed the header out of view (044, set cards made replies tall enough).
    const log = logRef.current;
    if (!log) return;
    const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth';
    const last = messages[messages.length - 1];
    if (!isLoading && last?.role === 'assistant' && last.sets?.length) {
      // A reply with set cards is read from its start, not its end.
      const el = log.querySelector<HTMLElement>(`[data-msg-id="${last.id}"]`);
      if (el) {
        log.scrollTo?.({ top: Math.max(0, el.offsetTop - 12), behavior });
        return;
      }
    }
    log.scrollTo?.({ top: log.scrollHeight, behavior });
  }, [messages, isLoading]);

  // Auto-close the panel 1.5s after filters are applied so the user
  // sees the confirmation briefly and then the filtered table is revealed.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.isFilterApplication) return;
    const timer = setTimeout(() => setIsOpen(false), 1500);
    return () => clearTimeout(timer);
  }, [messages]);

  // Close the panel with the Escape key (desktop keyboard users).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Focus management: move focus into the panel on open, trap Tab inside it,
  // and restore focus to the trigger on close. We focus the panel container
  // (not the input) so the mobile keyboard doesn't pop up unprompted.
  useEffect(() => {
    if (!isOpen) return;
    const root = panelRef.current;
    if (!root) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    root.focus({ preventScroll: true });

    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    void sendMessage(text);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  // Stop both click AND touch propagation so the backdrop never
  // receives events that originate inside the panel.
  const stopProp = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <>
      {/* Backdrop — only onClick needed; touch is blocked by the panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="aichat-title"
          tabIndex={-1}
          className="fixed z-50 flex flex-col rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden focus:outline-none"
          style={{
            bottom: '5rem',
            left: '0.5rem',
            right: '0.5rem',
            height: '520px',
            maxHeight: 'calc(100dvh - 7rem)',
            maxWidth: '420px',
            marginLeft: 'auto',
          }}
          onClick={stopProp}
          onTouchStart={stopProp}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-green-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                ✨
              </span>
              <div>
                <p id="aichat-title" className="font-semibold text-sm">
                  AI Inventory Assistant
                </p>
                <p className="text-xs text-green-100">Spanish or English</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="cursor-pointer p-1.5 rounded-lg hover:bg-green-700 transition-colors text-xs text-green-100 hover:text-white"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer p-1.5 rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Close chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={logRef}
            className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 bg-gray-50"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <span className="text-4xl">✨</span>
                <p className="font-medium text-gray-600 text-sm">Try one of these:</p>
                <div className="space-y-1.5 w-full">
                  {exampleQueries.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setInputValue(q)}
                      data-track="ai_chat_example"
                      data-track-category="ai_chat"
                      data-track-surface={surface}
                      data-track-label={q}
                      className="cursor-pointer block w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-green-600 hover:text-green-600 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                data-msg-id={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.isFilterApplication ? (
                  <div className="max-w-[85%] px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-green-600 text-xs font-medium">✓ Filters applied</span>
                    </div>
                    <MessageContent content={msg.content} />
                  </div>
                ) : msg.role === 'user' ? (
                  <div className="max-w-[85%] px-3 py-2 rounded-xl bg-green-600 text-white text-sm">
                    {msg.content}
                  </div>
                ) : msg.sets?.length ? (
                  // Sets (044): the text, then the cards. The panel stays open —
                  // no auto-close — until the shopper opens a set.
                  <div className="max-w-[90%] w-full">
                    <div className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm">
                      <MessageContent content={msg.content} />
                    </div>
                    <ChatSetCards
                      sets={msg.sets}
                      spanish={msg.setsSpanish}
                      onOpen={() => setIsOpen(false)}
                    />
                  </div>
                ) : (
                  <div className="max-w-[85%] px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm">
                    <MessageContent content={msg.content} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-xl bg-white border border-gray-200">
                  <span className="sr-only">Assistant is typing…</span>
                  <div className="flex gap-1" aria-hidden="true">
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Input — native form submit is the most reliable on iOS */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-gray-100 shrink-0 flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              enterKeyHint="send"
              aria-label="Ask about tires"
              placeholder="Ask about tires..."
              disabled={isLoading}
              style={{ fontSize: '16px' }}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              data-track="ai_chat_send"
              data-track-category="ai_chat"
              data-track-surface={surface}
              className="cursor-pointer p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Send"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <div className="fixed bottom-[calc(1.5rem+var(--compare-tray-h,0px))] right-6 z-50">
        {isOpen ? (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="cursor-pointer w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ring-4 ring-white"
            aria-label="Close AI assistant"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="white"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="cursor-pointer relative w-16 h-16 rounded-full transition-transform duration-200 hover:scale-110 active:scale-95 [box-shadow:0_6px_24px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            aria-label="Open AI assistant"
            data-track="open_ai_chat"
            data-track-category="ai_chat"
            data-track-surface={surface}
          >
            {/* Animated AI gradient ring — slow spin, frozen for reduced motion */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full animate-spin [animation-duration:4s] motion-reduce:animate-none"
              style={{
                backgroundImage:
                  'conic-gradient(from 0deg, #15803d, #9dfb40, #22c55e, #9dfb40, #15803d)',
              }}
            />
            {/* Avatar disc sits above the ring, leaving a thin gradient rim */}
            <span className="absolute inset-[3px] rounded-full overflow-hidden bg-white">
              <Image
                alt="MrGoma AI Assistant"
                src={mrGomaAvatar || '/placeholder.svg'}
                fill
                className="object-cover object-top"
                priority
              />
            </span>
            {/* AI badge — signals this is an interactive AI assistant */}
            <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white shadow-md">
              AI
              <span aria-hidden="true">✨</span>
            </span>
          </button>
        )}
      </div>
    </>
  );
}
