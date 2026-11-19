import { NextRequest, NextResponse } from 'next/server';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { fetchTiresServer } from '@/app/(shop)/tires/utils/fetchTiresServer';
import { dimensionsParam, unusedDimensions } from '@/app/api/_lib/aiChat/dimensions';
import { isSpanish } from '@/app/api/_lib/aiChat/language';
import {
  buildNarrowingHint,
  buildNoResultsMessage,
  buildUnknownBrandMessage,
} from '@/app/api/_lib/aiChat/messages';
import {
  asksForSet,
  buildSetHint,
  buildSetsMessage,
  withSetsSummary,
} from '@/app/api/_lib/aiChat/sets';
import { getCachedBrands, parseBrands, unknownBrands } from '@/app/api/_lib/brandCatalogue';
import { withLogging } from '@/app/api/_lib/withLogging';
import { toCatalogFilters } from '@/app/api/tires/ai-chat/_lib/catalogFilters';
import { buildStoreDirectory } from '@/app/api/tires/ai-chat/_lib/storeDirectory';
import { pickChatSets } from '@/app/utils/chatSets';
import type { SetSize } from '@/app/utils/tireSets';
import { WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from '@/app/utils/whatsapp';
import { getCachedSizeUnits } from '@/repositories/tireSetsRepository';
import { logger } from '@/utils/logger';
import { createRateLimiter } from '@/utils/rateLimit';

/**
 * This endpoint is anonymous and spends money on every call — each request is a
 * model invocation. Until 2026-08-06 the *authenticated* dashboard assistant was
 * the one that limited traffic and this one did not, which is backwards.
 *
 * Frequency and size are separate holes and a limiter closes only the first: an
 * attacker inside the rate limit can still send each request with an enormous
 * conversation history, and cost scales with tokens rather than requests. Hence
 * both a limiter and a body cap.
 */
const isRateLimited = createRateLimiter('ai-chat-public', { windowMs: 60 * 1000, max: 20 });

/** A real conversation is a few dozen short turns; anything beyond is not one. */
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 2000;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a fast, clear, and friendly tire assistant for MrGoma Tires, a tire shop with locations in Miami and Orlando, Florida, USA.
Your goal is to help customers quickly find tires and guide them to call or visit the nearest store.
You are NOT a replacement for store staff — always direct the customer toward calling or visiting.

## RULE ZERO — SEARCH FIRST, ASK LATER
If the customer's message contains ANYTHING you can filter on — a brand name, a
rim size, a condition, a price, a tread life, a store — call the apply_filters
tool IMMEDIATELY with what you have. Do not ask a qualifying question first.
"michelin" alone → apply_filters(brands="Michelin"). "aro 17" alone →
apply_filters(d=17). "used under $80" → apply_filters(condition="used", maxPrice=80).
If they ask for a SET (2, 3 or 4 tires, "a set", "un juego") and gave the full
size, call the find_sets tool IMMEDIATELY instead — never ask for the city,
brand or condition first; the cards show where each set's tires are.
This rule outranks every example, template and flow step below it. Only ask for a
size or vehicle when the customer has given you nothing searchable at all.

## LANGUAGE
Detect the customer's language automatically and always respond in that same language.
- If English → respond in English
- If Spanish → respond in Spanish
- If unclear → ask: "English or Español?"

Spanish tire terms: "llantas/cauchos/neumáticos" = tires, "aro" = rim diameter, "usadas" = used, "nuevas" = new, "parcheadas" = patched, "sin parche" = not patched, "banda de rodamiento" = tread, "perfil" = aspect ratio, "run flat / antipinchazo" = run-flat

Used-tire filters: tread depth is in 32nds of an inch ("8/32 or more" → minTreadDepth=8), "no patches" → patched="no", run-flat → runFlat=true. Tread, remaining life and patched only describe used tires, so they search used tires.

## CONVERSATION FLOW
1. Detect language
2. Ask what the customer needs
3. **If the customer named ANYTHING searchable — a brand, a rim size, a
   condition, a price, a tread life, a store — search for it right away with the
   apply_filters tool. Do NOT ask for the tire size first.** Many people know
   they want Michelin, or a 17-inch rim, long before they know 225/45R17.
   Ask for a size or vehicle ONLY when the customer has given nothing to search
   on at all (e.g. "I need tires").
4. Ask which area/store is closest to them
5. Show the store card (see format below)
6. Suggest calling or visiting the store

## STORE CARD FORMAT
When showing store info, always use this format:

---
📍 **[Store Name]**
[Address]
🕒 [Hours]
📞 [Phone]

🗺️ [View on Google Maps]([the store's Maps value below, copied exactly])
📞 [Call the store]([the store's Call value below, copied exactly])
---

Only add the WhatsApp link when applicable (see WHATSAPP section below).

## STORE LOCATIONS
Never invent, complete or correct any detail below. If something a customer
asks for is not here, say so and point them to the store.

${buildStoreDirectory()}

## Q&A BASE RESPONSES
Use these as your base tone and phrasing. Adapt naturally to the conversation.

TIRES — use ONLY when the customer gave nothing searchable (see RULE ZERO). If
they named a brand, rim, condition or price, do NOT send this; search instead.
EN: "What size are you looking for? (example: 225/45R17) or tell me your car (year, make, model)."
ES: "¿Qué medida buscas? (ejemplo: 225/45R17) o dime tu carro (año, marca y modelo)."

AVAILABILITY:
EN: "We receive new inventory daily 🔥 I can help you search here or guide you to your nearest store for fastest confirmation."
ES: "Recibimos inventario nuevo todos los días 🔥 Puedo ayudarte aquí o guiarte a tu tienda más cercana para confirmación rápida."

PRICE:
EN: "Prices depend on size, brand, and condition. I can guide you or help you contact your nearest store for exact pricing."
ES: "Los precios dependen de la medida, marca y condición. Puedo orientarte o ayudarte a contactar tu tienda más cercana."

SERVICES:
EN: "We offer mount & balance, alignment, oil change, flat repair, brakes, and diagnostics."
ES: "Ofrecemos montaje y balanceo, alineación, cambio de aceite, reparación de llantas, frenos y diagnóstico."

LOCATION:
EN: "Which MrGoma location works best for you? I'll guide you to the closest store."
ES: "¿Qué ubicación de MrGoma te queda mejor? Te ayudo a encontrar la más cercana."

HOURS – TODAY:
EN: "Hours may vary by location. I recommend calling the store directly for the fastest confirmation 👍 Which location are you visiting?"
ES: "El horario puede variar según la tienda. Te recomiendo llamar a la tienda directamente para confirmarlo rápido 👍 ¿Qué ubicación necesitas?"

HOURS – GENERAL:
EN: "Hours depend on the location. Which store are you visiting?"
ES: "El horario depende de la tienda. ¿Qué ubicación necesitas?"

HOLIDAYS:
EN: "Holiday hours may vary. The best way is to call the store directly to confirm 👍 Which location do you need?"
ES: "El horario en días feriados puede variar. Lo más rápido es llamar a la tienda para confirmarlo 👍 ¿Qué ubicación necesitas?"

SPEAK TO SOMEONE:
EN: "I can guide you to your nearest store or help you contact them by phone for faster assistance 👍"
ES: "Te puedo guiar a tu tienda más cercana o ayudarte a contactarlos por teléfono para atención más rápida 👍"

FALLBACK (unknown question):
EN: "I may not have the exact answer here, but I can help guide you or connect you to a store for quick assistance 👍"
ES: "Puede que no tenga la respuesta exacta aquí, pero te puedo ayudar o conectarte con una tienda para atención rápida 👍"

## WHATSAPP
WhatsApp number: ${WHATSAPP_DISPLAY}

Use WhatsApp ONLY in these three cases:
1. The tire the customer needs is not found in the inventory search results
2. The customer needs more personalized help
3. The customer explicitly asks to speak to someone

When applicable, generate a pre-filled WhatsApp link using this format:
https://wa.me/${WHATSAPP_NUMBER}?text=[URL-encoded message]

Pre-filled message format — include ONLY the details the conversation already
gave you. NEVER ask for a size or a store just to fill this in: someone asking
for WhatsApp has decided to talk to a person, and a missing detail is the
advisor's first question, not a reason to withhold the link.

With details already known:
EN: "Hi, I need help with tires for the [STORE NAME] store. My size is [SIZE]."
ES: "Hola, necesito ayuda con llantas para la tienda de [STORE NAME]. Mi medida es [SIZE]."
With nothing known yet — send the link straight away:
EN: "Hi, I need help with tires."
ES: "Hola, necesito ayuda con llantas."

Show it as: 💬 [Chat on WhatsApp](https://wa.me/${WHATSAPP_NUMBER}?text=...)

## INVENTORY SEARCH
When the customer wants to search the inventory, use the apply_filters tool.
**A single filter is a complete search.** Brand alone, rim alone, condition alone
or a price alone are all valid — call the tool with what you have instead of
collecting more first. Only "confirmationMessage" is ever required.
Sorting: "cheapest", "lowest price" → sort="price-asc"; "most expensive",
"highest price" → sort="price-desc".
Tire size format: width/profile/diameter (e.g., "225/45R17" or "225/45/17" → w=225, s=45, d=17)
"Aro 17" or "rim 17" = diameter 17. "Ancho 225" = width 225.
Prices are in USD.
When the customer asks about a specific vehicle, suggest the standard tire size for that vehicle and offer to search for it.
When the customer refines a previous search ("only new ones", "just Michelin"), combine with the existing conversation context.

## TIRE SETS (2, 3 or 4 matching tires)
Customers often want a set ("4 tires", "a pair", "un juego", "4 llantas").
Every tire is a unique unit; a set is 2, 3 or 4 matching tires — same brand,
model and size, tread within 2/32". A set may mix tires from Miami and Orlando.
The set price is the sum of its tires; there is no set discount.
- When the customer asks for a set AND you know the full size (width, profile
  and rim), call the find_sets tool IMMEDIATELY — not apply_filters, and
  without asking for a city, store, brand or condition first. Pass the quantity they
  asked for; "a set" / "un juego" with no number means 4. Pass a brand,
  condition or city only if the customer said it.
- The app looks the sets up and shows them as cards with their real prices.
  Do NOT write set prices, counts, treads or availability yourself, before or
  after: you cannot see the inventory.
- If they ask for a set without a full size, ask for the size (or their car)
  as usual; the app adds a tip on how sets work.
- You cannot add anything to the cart and nothing is reserved: the customer
  reviews the set on the tire page and adds it there.
- The customer can pick up at any of our stores, whatever city the tires are in.

## OUT OF SCOPE
Do not answer questions unrelated to tires, vehicles, or MrGoma services.
EN redirect: "I'm here to help with tires and MrGoma services. Is there anything tire-related I can help you with?"
ES redirect: "Estoy aquí para ayudarte con llantas y servicios de MrGoma. ¿Hay algo relacionado con llantas en lo que pueda ayudarte?"
Do not share internal business information (employee details, cost prices, margins, supplier info).
Never guarantee exact prices or specific inventory availability.`;

const APPLY_FILTERS_TOOL: Anthropic.Tool = {
  name: 'apply_filters',
  description:
    'Search the tire inventory by applying filters based on what the customer is looking for. Call this when the customer wants to find or browse tires.',
  input_schema: {
    type: 'object' as const,
    properties: {
      w: {
        type: 'number',
        description: 'Tire width in mm (e.g., 205)',
      },
      s: {
        type: 'number',
        description: 'Tire aspect ratio / profile as a percentage (e.g., 55)',
      },
      d: {
        type: 'number',
        description: 'Rim diameter in inches (e.g., 16)',
      },
      minPrice: {
        type: 'number',
        description: 'Minimum price in USD',
      },
      maxPrice: {
        type: 'number',
        description: 'Maximum price in USD',
      },
      minTreadDepth: {
        type: 'number',
        description:
          'Minimum tread depth in 32nds of an inch, a whole number (used tires run 6–10; new tires are 10). "8/32 or more" → 8. Implies used tires.',
      },
      maxTreadDepth: {
        type: 'number',
        description: 'Maximum tread depth in 32nds of an inch, a whole number. Implies used tires.',
      },
      minRemainingLife: {
        type: 'number',
        description: 'Minimum remaining life percentage (50-100). Implies used tires.',
      },
      maxRemainingLife: {
        type: 'number',
        description: 'Maximum remaining life percentage (0-100)',
      },
      condition: {
        type: 'string',
        enum: ['new', 'used'],
        description: 'Tire condition: "new" or "used"',
      },
      patched: {
        type: 'string',
        enum: ['no', 'yes'],
        description:
          '"no" for tires without a patch ("no patches", "sin parche"), "yes" for patched ones. Implies used tires.',
      },
      runFlat: {
        type: 'boolean',
        description: 'true for run-flat tires ("run flat", "RFT"), false to exclude them.',
      },
      brands: {
        type: 'string',
        description: 'Comma-separated list of tire brands (e.g., "Michelin,Bridgestone")',
      },
      stores: {
        type: 'string',
        description: 'Comma-separated list of store/branch names to filter by location',
      },
      sort: {
        type: 'string',
        enum: ['price-asc', 'price-desc'],
        description:
          'Result ordering. "price-asc" for cheapest first, "price-desc" for most expensive first. These are the only two orderings the catalog supports.',
      },
      confirmationMessage: {
        type: 'string',
        description:
          'Required. A friendly confirmation message in the same language the customer used, summarizing what is being searched.',
      },
    },
    required: ['confirmationMessage'],
  },
};

const FIND_SETS_TOOL: Anthropic.Tool = {
  name: 'find_sets',
  description:
    'Look up sets of 2, 3 or 4 matching tires that can be built now in one size. Call this when the customer asks for a set (or a number of tires) and the full size is known.',
  input_schema: {
    type: 'object' as const,
    properties: {
      w: { type: 'number', description: 'Tire width in mm (e.g., 225)' },
      s: { type: 'number', description: 'Aspect ratio / profile (e.g., 45)' },
      d: { type: 'number', description: 'Rim diameter in inches (e.g., 17)' },
      quantity: {
        type: 'number',
        enum: [2, 3, 4],
        description: 'How many tires the customer wants. "A set" with no number means 4.',
      },
      brands: {
        type: 'string',
        description: 'Comma-separated brands, only if the customer named one',
      },
      condition: { type: 'string', enum: ['new', 'used'], description: 'Only if the customer said it' },
      city: {
        type: 'string',
        enum: ['Miami', 'Orlando'],
        description: 'Only if the customer named the city',
      },
    },
    required: ['w', 's', 'd'],
  },
};

/** The model's `find_sets` input, checked at the boundary. */
const FindSetsInput = z.object({
  w: z.coerce.number().int().min(125).max(395),
  s: z.coerce.number().int().min(20).max(95),
  d: z.coerce.number().int().min(12).max(30),
  quantity: z.coerce.number().int().min(2).max(4).catch(4).default(4),
  brands: z.string().optional(),
  condition: z.enum(['new', 'used']).optional().catch(undefined),
  city: z.enum(['Miami', 'Orlando']).optional().catch(undefined),
});

/** The visitor's estimated city (043), sent by the browser as a hint. */
const VisitorCity = z.enum(['Miami', 'Orlando']).nullable().catch(null);

/**
 * The longest the chat waits for the inventory (AC12). The pool of 10
 * connections has made queries wait 4–30 s under bot traffic; past this the
 * customer gets today's catalog search instead of a spinner.
 */
export const SET_LOOKUP_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('set lookup timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const POST = withLogging('tires.aiChat.POST', async (req: NextRequest) => {
  if (isRateLimited(req)) {
    return NextResponse.json(
      { message: 'Too many requests. Try again in a moment.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { messages }: { messages: ApiMessage[] } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { message: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Rejected before the model is called: the cost of a request is its tokens,
    // so a cap that ran afterwards would have already paid for what it rejects.
    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json({ message: 'Conversation too long.' }, { status: 400 });
    }

    if (
      messages.some(m => typeof m?.content !== 'string' || m.content.length > MAX_MESSAGE_LENGTH)
    ) {
      return NextResponse.json({ message: 'Message too long.' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [APPLY_FILTERS_TOOL, FIND_SETS_TOOL],
      messages: messages,
    });

    const toolUseBlock = response.content.find(block => block.type === 'tool_use');

    if (toolUseBlock && toolUseBlock.type === 'tool_use' && toolUseBlock.name === 'find_sets') {
      return await answerWithSets(messages, toolUseBlock.input, body?.city);
    }

    if (toolUseBlock && toolUseBlock.type === 'tool_use') {
      const filters = toolUseBlock.input as Record<string, unknown>;
      const { confirmationMessage, ...toolFilters } = filters;
      // Written as the catalog reads it, used filters narrowing to used (052).
      const filterParams = toCatalogFilters(toolFilters);
      const spanish = isSpanish(messages);
      const dimensions = dimensionsParam(filterParams);

      // A brand we don't carry is a different fact from a brand we're out of,
      // and the customer acts differently on each. Checked before the inventory
      // query, so an absent brand never costs a database round-trip either.
      const requestedBrands = parseBrands(filterParams.brands);
      if (requestedBrands.length > 0) {
        const absent = unknownBrands(requestedBrands, await getCachedBrands({}));
        if (absent.length > 0) {
          return NextResponse.json({
            type: 'no_results',
            message: buildUnknownBrandMessage(spanish, absent),
            dimensions,
          });
        }
      }

      // Build URL params from filter values to check inventory count
      const paramRecord: Record<string, string> = {};
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) paramRecord[key] = String(value);
      });

      const { totalCount } = await fetchTiresServer(paramRecord);

      if (totalCount === 0) {
        return NextResponse.json({
          type: 'no_results',
          message: buildNoResultsMessage(spanish, filterParams),
          dimensions,
        });
      }

      // The model wrote the confirmation; the hint is appended here so it can be
      // asserted in a test rather than merely requested of a model.
      const hint = buildNarrowingHint(spanish, unusedDimensions(filterParams));
      const setHint = asksForSet(messages) ? buildSetHint(spanish) : '';

      return NextResponse.json({
        type: 'filters',
        filters: filterParams,
        message: `${confirmationMessage as string}${hint}${setHint}`,
        dimensions,
      });
    }

    const textBlock = response.content.find(block => block.type === 'text');
    const message =
      textBlock && textBlock.type === 'text'
        ? textBlock.text
        : 'I can help you find the right tires. Ask me about sizes, brands, or conditions!';

    // Asked for a set but gave nothing to search on yet: the size question
    // still comes first, with the tip on how the set will be built.
    return NextResponse.json({
      type: 'message',
      message: asksForSet(messages) ? `${message}${buildSetHint(isSpanish(messages))}` : message,
    });
  } catch (err: unknown) {
    logger.error('Failed to process customer AI chat request', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
});

/**
 * `find_sets` (feature 044). The model only extracted what was asked; the sets,
 * their prices and the reply text all come from the inventory and the server.
 */
async function answerWithSets(messages: ApiMessage[], input: unknown, cityHint: unknown) {
  const spanish = isSpanish(messages);
  const parsed = FindSetsInput.safeParse(input);

  // No usable size: ask for it, as the chat does today, with the 041 tip.
  if (!parsed.success) {
    const ask = spanish
      ? '¿Qué medida buscas? (ejemplo: 225/45R17) o dime tu carro (año, marca y modelo).'
      : 'What size are you looking for? (example: 225/45R17) or tell me your car (year, make, model).';
    return NextResponse.json({ type: 'message', message: `${ask}${buildSetHint(spanish)}` });
  }

  const { w, s, d, quantity, brands, condition, city } = parsed.data;
  const size = `${w}/${s}/${d}`;
  const filterParams: Record<string, unknown> = { w, s, d, brands, condition };
  const dimensions = dimensionsParam(filterParams);

  const requestedBrands = parseBrands(brands);
  if (requestedBrands.length > 0) {
    const absent = unknownBrands(requestedBrands, await getCachedBrands({}));
    if (absent.length > 0) {
      return NextResponse.json({
        type: 'no_results',
        message: buildUnknownBrandMessage(spanish, absent),
        dimensions,
      });
    }
  }

  let units;
  try {
    units = await withTimeout(getCachedSizeUnits(size), SET_LOOKUP_TIMEOUT_MS);
  } catch (err) {
    // Slow or failing inventory: today's answer — the catalog for the size,
    // with the tip on how to build the set there (AC12).
    logger.warn('AI chat set lookup failed; falling back to a catalog search', {
      reason: err instanceof Error ? err.message : String(err),
    });
    const filters = Object.fromEntries(
      Object.entries(filterParams).filter(([, v]) => v !== undefined)
    );
    const confirm = spanish ? `Te muestro llantas ${w}/${s}R${d}.` : `Here are ${w}/${s}R${d} tires.`;
    return NextResponse.json({
      type: 'filters',
      filters,
      message: `${confirm}${buildSetHint(spanish)}`,
      dimensions,
    });
  }

  const visitorCity = VisitorCity.parse(cityHint ?? null);
  const result = pickChatSets(units, {
    size,
    quantity: quantity as SetSize,
    brands: requestedBrands,
    condition,
    city,
    visitorCity,
  });

  const message = buildSetsMessage(spanish, {
    outcome: result.outcome,
    requested: quantity as SetSize,
    shown: result.quantity,
    size,
    brands: requestedBrands,
    condition,
    namedCity: city,
  });

  if (result.outcome === 'none') {
    return NextResponse.json({ type: 'no_results', message, dimensions });
  }

  return NextResponse.json({
    type: 'sets',
    message,
    sets: result.sets,
    outcome: result.outcome,
    spanish,
    // What the browser sends back as this turn: short, priceless (044 analyze).
    historyMessage: withSetsSummary(message, result.sets),
    dimensions,
  });
}
