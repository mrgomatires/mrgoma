import type { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Importing this route naively throws `Environment variable SERVER_URL is not
 * set`: it reaches the repository, which reaches `db.ts`, which reads env at
 * module scope, and nothing loads `.env` under Vitest. Mocking the modules
 * beneath the route keeps the database chain out of the import graph entirely —
 * the same approach `api/brands/route.test.ts` uses.
 *
 * A `vi.fn` that rejects is re-reported by Vitest as an unhandled error even
 * when the route catches it, hence the swappable plain functions in `h`.
 */
const h = vi.hoisted(() => ({
  toolInput: null as Record<string, unknown> | null,
  toolName: 'apply_filters',
  sizeUnits: (async () => []) as (size: string) => Promise<unknown[]>,
  sizeAsked: [] as string[],
  text: 'What size are you looking for?',
  totalCount: 12,
  brands: ['Michelin', 'Pirelli', 'Goodyear'],
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/repositories/tiresRepository', () => ({ fetchBrands: () => h.brands }));
vi.mock('@/repositories/tireSetsRepository', () => ({
  getCachedSizeUnits: (size: string) => {
    h.sizeAsked.push(size);
    return h.sizeUnits(size);
  },
}));
vi.mock('@/app/(shop)/tires/utils/fetchTiresServer', () => ({
  fetchTiresServer: vi.fn(async () => ({ totalCount: h.totalCount })),
}));
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async () => ({
        content: h.toolInput
          ? [
              {
                type: 'tool_use',
                name: h.toolName,
                input:
                  h.toolName === 'find_sets'
                    ? h.toolInput
                    : { confirmationMessage: 'Searching…', ...h.toolInput },
              },
            ]
          : [{ type: 'text', text: h.text }],
      }),
    };
  },
}));

import { fetchTiresServer } from '@/app/(shop)/tires/utils/fetchTiresServer';
import { PUBLIC_EXAMPLE_QUERIES } from '@/app/ui/components/AiChat/exampleQueries';

import { POST } from './route';

let ipCounter = 0;

/** A fresh IP per request so the rate limiter doesn't bleed across tests. */
const req = (body: unknown, ip = `10.0.0.${++ipCounter % 250}`) =>
  ({
    json: async () => body,
    headers: new Headers({ 'x-forwarded-for': ip }),
  }) as unknown as NextRequest;

const ask = (text: string) => req({ messages: [{ role: 'user', content: text }] });

beforeEach(() => {
  h.toolInput = null;
  h.toolName = 'apply_filters';
  h.sizeUnits = async () => [];
  h.sizeAsked = [];
  h.text = 'What size are you looking for?';
  h.totalCount = 12;
  h.brands = ['Michelin', 'Pirelli', 'Goodyear'];
  vi.mocked(fetchTiresServer).mockClear();
});

describe('partial filters are complete searches', () => {
  it('searches on a brand alone, without asking for a size', async () => {
    h.toolInput = { brands: 'Michelin' };

    const body = await (await POST(ask('Michelin'))).json();

    expect(body.type).toBe('filters');
    expect(body.filters.brands).toBe('Michelin');
  });

  it('searches on a rim alone', async () => {
    h.toolInput = { d: 17 };

    const body = await (await POST(ask('aro 17'))).json();

    expect(body.type).toBe('filters');
    expect(body.filters.d).toBe(17);
  });

  it('searches on a condition and a price alone', async () => {
    h.toolInput = { condition: 'used', maxPrice: 80 };

    const body = await (await POST(ask('used tires under $80'))).json();

    expect(body.type).toBe('filters');
  });

  it('still asks when the customer gave nothing to search on', async () => {
    // AC4 — the unblocking must not turn into guessing.
    h.toolInput = null;

    const body = await (await POST(ask('I need tires'))).json();

    expect(body.type).toBe('message');
    expect(body.message).toContain('size');
  });
});

describe('used-tire filters reach the catalog as the rail writes them (052)', () => {
  it('"no patches, 8/32 or more" → patched=no, tread 8, used', async () => {
    h.toolInput = { patched: 'no', minTreadDepth: 8.4 };
    const body = await (await POST(ask('used tires without patches, 8/32 or more'))).json();
    expect(body.filters).toEqual({ patched: 'no', minTreadDepth: 8, condition: 'used' });
  });

  it('reads the old boolean patched and a run-flat request', async () => {
    h.toolInput = { patched: false, runFlat: true };
    const body = await (await POST(ask('run flat sin parche'))).json();
    expect(body.filters).toEqual({ patched: 'no', kindSale: 'yes', condition: 'used' });
  });

  it('drops used filters on a new-tire search', async () => {
    h.toolInput = { condition: 'new', minTreadDepth: 8, runFlat: true };
    const body = await (await POST(ask('new run flat tires'))).json();
    expect(body.filters).toEqual({ condition: 'new', kindSale: 'yes' });
  });
});

describe('the narrowing hint', () => {
  it('offers what is left and never what was used', async () => {
    h.toolInput = { brands: 'Michelin' };

    const body = await (await POST(ask('Michelin'))).json();

    expect(body.message).toContain('I can also narrow by');
    expect(body.message).not.toMatch(/narrow by[^.]*\bbrand\b/);
  });

  it('disappears when every dimension is in play', async () => {
    h.toolInput = {
      w: 225,
      s: 45,
      d: 17,
      brands: 'Michelin',
      condition: 'used',
      minPrice: 40,
      minTreadDepth: 5,
      stores: 'Hialeah',
    };

    const body = await (await POST(ask('everything'))).json();

    expect(body.message).toBe('Searching…');
  });
});

describe('ordering', () => {
  it('passes an ordering through to the listing', async () => {
    h.toolInput = { condition: 'used', sort: 'price-asc' };

    const body = await (await POST(ask('cheapest used tires'))).json();

    expect(body.filters.sort).toBe('price-asc');
  });

  it('is not counted as a way of narrowing', async () => {
    h.toolInput = { sort: 'price-desc' };

    const body = await (await POST(ask('most expensive first'))).json();

    expect(body.dimensions).toBe('');
  });
});

describe('a brand we do not carry', () => {
  it('is named as such, not reported as out of stock', async () => {
    h.toolInput = { brands: 'Nokian' };

    const body = await (await POST(ask('Nokian'))).json();

    expect(body.type).toBe('no_results');
    expect(body.message).toContain("don't carry Nokian");
  });

  it('costs no inventory query', async () => {
    h.toolInput = { brands: 'Nokian' };

    await POST(ask('Nokian'));

    expect(fetchTiresServer).not.toHaveBeenCalled();
  });

  it('does not fire for a brand we do carry', async () => {
    h.toolInput = { brands: 'michelin' };

    const body = await (await POST(ask('michelin'))).json();

    expect(body.type).toBe('filters');
  });
});

describe('an empty result set', () => {
  it('is reported as no_results, with the dimensions used', async () => {
    h.toolInput = { d: 17, condition: 'new' };
    h.totalCount = 0;

    const body = await (await POST(ask('new tires rim 17'))).json();

    expect(body.type).toBe('no_results');
    expect(body.dimensions).toBe('rim,condition');
    expect(body.message).toContain('WhatsApp');
  });

  it('carries no filters, so nothing navigates to an empty listing', async () => {
    h.toolInput = { d: 17 };
    h.totalCount = 0;

    const body = await (await POST(ask('rim 17'))).json();

    expect(body.filters).toBeUndefined();
  });
});

describe('the dimensions reported', () => {
  it('names what was filtered, never what the customer typed', async () => {
    h.toolInput = { brands: 'Michelin', stores: 'Hialeah' };

    const body = await (await POST(ask('Michelin in Hialeah'))).json();

    expect(body.dimensions).toBe('brand,store');
    expect(body.dimensions).not.toContain('Michelin');
    expect(body.dimensions).not.toContain('Hialeah');
  });
});

describe('the prompts the chat advertises', () => {
  // AC16. Three of the seven suggestions the interface offers a new visitor were
  // partial filters the assistant refused to honour. Driving the cases from the
  // array means a prompt added later without support fails here.
  const CASES: Record<string, Record<string, unknown> | null> = {
    '205/55/16 nuevas Michelin': { w: 205, s: 55, d: 16, condition: 'new', brands: 'Michelin' },
    'used Michelin aro 17': { d: 17, condition: 'used', brands: 'Michelin' },
    'usadas menos de $50': { condition: 'used', maxPrice: 50 },
    '¿qué diferencia hay entre nueva y usada?': null,
    '195/65/15 with more than 50% life': { w: 195, s: 65, d: 15, minRemainingLife: 50 },
    Pirelli: { brands: 'Pirelli' },
    'used tires under $80': { condition: 'used', maxPrice: 80 },
  };

  it('covers every prompt the component offers', () => {
    expect(Object.keys(CASES).sort()).toEqual([...PUBLIC_EXAMPLE_QUERIES].sort());
  });

  for (const [prompt, toolInput] of Object.entries(CASES)) {
    it(`honours "${prompt}"`, async () => {
      h.toolInput = toolInput;
      h.text = 'A new tire has full tread; a used one is inspected and warrantied.';

      const body = await (await POST(ask(prompt))).json();

      expect(body.type).toBe(toolInput ? 'filters' : 'message');
    });
  }
});

describe('tire sets (041)', () => {
  it('adds the Build your set tip when a search asks for a set', async () => {
    h.toolInput = { w: 235, s: 50, d: 19 };
    const body = await (await POST(ask('I need 4 tires 235/50/19'))).json();
    expect(body.type).toBe('filters');
    expect(body.message).toMatch(/Build your set/);
  });

  it('adds it in Spanish to the size question too', async () => {
    h.text = '¿Qué medida buscas?';
    const body = await (await POST(ask('necesito un juego de llantas'))).json();
    expect(body.type).toBe('message');
    expect(body.message).toMatch(/Para armar tu juego/);
  });

  it('stays out of searches that are not about sets', async () => {
    h.toolInput = { brands: 'Michelin' };
    const body = await (await POST(ask('michelin'))).json();
    expect(body.message).not.toMatch(/Build your set/);
  });

  it('is not added to an empty result', async () => {
    h.toolInput = { w: 235, s: 50, d: 19 };
    h.totalCount = 0;
    const body = await (await POST(ask('4 tires 235/50/19'))).json();
    expect(body.type).toBe('no_results');
    expect(body.message).not.toMatch(/Build your set/);
  });
});

describe('protecting an anonymous, paid endpoint', () => {
  it('rejects a conversation longer than the cap before calling the model', async () => {
    const messages = Array.from({ length: 41 }, () => ({ role: 'user', content: 'hi' }));

    const res = await POST(req({ messages }));

    expect(res.status).toBe(400);
  });

  it('rejects a single over-long message', async () => {
    const messages = [{ role: 'user', content: 'x'.repeat(2001) }];

    const res = await POST(req({ messages }));

    expect(res.status).toBe(400);
  });

  it('lets a normal conversation through', async () => {
    const messages = Array.from({ length: 12 }, () => ({ role: 'user', content: 'Michelin' }));

    const res = await POST(req({ messages }));

    expect(res.status).toBe(200);
  });

  it('rate-limits a flood from one address', async () => {
    const flood = '203.0.113.9';
    let last = 200;

    for (let i = 0; i < 21; i++) {
      last = (await POST(req({ messages: [{ role: 'user', content: 'hi' }] }, flood))).status;
    }

    expect(last).toBe(429);
  });
});

describe('find_sets (044)', () => {
  let id = 5000;
  const unit = (over: Record<string, unknown> = {}) => ({
    id: String(++id),
    price: 120,
    tread: 8,
    patched: false,
    condition: 'Used',
    city: 'Miami',
    brand: 'Michelin',
    model2: 'Pilot Sport 4',
    runFlat: false,
    ...over,
  });
  const units = (count: number, over: Record<string, unknown> = {}) =>
    Array.from({ length: count }, () => unit(over));
  const findSets = (input: Record<string, unknown>) => {
    h.toolName = 'find_sets';
    h.toolInput = input;
  };

  it('answers with set cards from the inventory, not the model (AC1)', async () => {
    findSets({ w: 225, s: 45, d: 17, quantity: 4 });
    h.sizeUnits = async () => units(5);

    const body = await (await POST(ask('I need 4 tires 225/45R17'))).json();

    expect(h.sizeAsked).toEqual(['225/45/17']);
    expect(body.type).toBe('sets');
    expect(body.sets).toHaveLength(1);
    expect(body.sets[0]).toMatchObject({
      brand: 'Michelin',
      count: 4,
      total: 480,
      cities: ['Miami'],
    });
    expect(body.message).toMatch(/as of now/);
    expect(body.historyMessage).toContain('Michelin Pilot Sport 4 · 4 · Miami');
    expect(body.historyMessage).not.toMatch(/480/);
  });

  it('means 4 when no number is given (AC6)', async () => {
    findSets({ w: 225, s: 45, d: 17 });
    h.sizeUnits = async () => units(4);

    const body = await (await POST(ask('a set of tires 225/45R17'))).json();

    expect(body.sets[0].count).toBe(4);
  });

  it('narrows by brand and city, and says none when nothing matches (AC8)', async () => {
    findSets({ w: 225, s: 45, d: 17, quantity: 4, brands: 'Pirelli', city: 'Orlando' });
    h.sizeUnits = async () => units(8, { city: 'Orlando' });

    const body = await (await POST(ask('4 Pirelli 225/45R17 in Orlando'))).json();

    expect(body.type).toBe('no_results');
    // The city is a preference (047): "none" means none in either city.
    expect(body.message).toMatch(/No set of Pirelli 225\/45R17 tires can be built/);
  });

  it("breaks ties with the visitor's city hint (047, AC16)", async () => {
    findSets({ w: 225, s: 45, d: 17, quantity: 2 });
    h.sizeUnits = async () => [
      ...units(2, { price: 50 }),
      ...units(2, { brand: 'Pirelli', model2: 'P Zero', price: 50, city: 'Orlando' }),
    ];

    const body = await (
      await POST(
        req({ messages: [{ role: 'user', content: '2 tires 225/45R17' }], city: 'Orlando' })
      )
    ).json();

    expect(body.sets.map((c: { cities: string[] }) => c.cities)).toEqual([
      ['Orlando'],
      ['Miami'],
    ]);
  });

  it('answers in Spanish (AC9)', async () => {
    findSets({ w: 225, s: 45, d: 17, quantity: 4 });
    h.sizeUnits = async () => units(4);

    const body = await (await POST(ask('necesito un juego de 4 llantas 225/45R17'))).json();

    expect(body.message).toMatch(/juegos de 4 llantas/);
  });

  it('asks for the size when the model calls it without one (AC11)', async () => {
    findSets({ quantity: 4 });

    const body = await (await POST(ask('I need 4 tires'))).json();

    expect(body.type).toBe('message');
    expect(body.message).toMatch(/What size are you looking for/);
    expect(body.message).toMatch(/Build your set/);
    expect(h.sizeAsked).toEqual([]);
  });

  it('falls back to a catalog search when the inventory fails (AC12)', async () => {
    findSets({ w: 225, s: 45, d: 17, quantity: 4 });
    h.sizeUnits = async () => {
      throw new Error('pool exhausted');
    };

    const body = await (await POST(ask('4 tires 225/45R17'))).json();

    expect(body.type).toBe('filters');
    expect(body.filters).toEqual({ w: 225, s: 45, d: 17 });
    expect(body.message).toMatch(/Build your set/);
  });

  it('gives up after 4 seconds instead of waiting on a slow database (AC12)', async () => {
    vi.useFakeTimers();
    try {
      findSets({ w: 225, s: 45, d: 17, quantity: 4 });
      h.sizeUnits = () => new Promise(() => {});

      const pending = POST(ask('4 tires 225/45R17'));
      await vi.advanceTimersByTimeAsync(4001);
      const body = await (await pending).json();

      expect(body.type).toBe('filters');
    } finally {
      vi.useRealTimers();
    }
  });

  it('answers an unknown brand as today, without querying (AC8)', async () => {
    findSets({ w: 225, s: 45, d: 17, brands: 'Acme' });

    const body = await (await POST(ask('4 Acme tires 225/45R17'))).json();

    expect(body.type).toBe('no_results');
    expect(h.sizeAsked).toEqual([]);
  });
});
