// Shared lab runner (feature 055): a local production server and Lighthouse.
//
// Used by `npm run a11y` and `npm run perf:lab`. Runs over the existing build
// (`next build` first), never against production. Lighthouse is a pinned
// devDependency so every run uses the same engine.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

/** A free TCP port on localhost. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** `next start` on `port` over the existing build; resolves once it answers. */
export async function startServer(port) {
  const child = spawn('npx', ['next', 'start', '-p', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    // AUTH_TRUST_HOST: a local `next start` is not a host Auth.js trusts by
    // itself, so signing in to the dashboard failed (058). Local only.
    env: { ...process.env, NODE_ENV: 'production', AUTH_TRUST_HOST: 'true' },
  });
  let log = '';
  child.stdout.on('data', d => (log += d));
  child.stderr.on('data', d => (log += d));
  const origin = `http://localhost:${port}`;
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(origin + '/robots.txt');
      if (res.ok) return { origin, stop: () => child.kill('SIGTERM'), log: () => log };
    } catch {
      // not up yet
    }
    if (child.exitCode !== null) break;
    await new Promise(r => setTimeout(r, 500));
  }
  child.kill('SIGTERM');
  throw new Error(`next start did not come up on ${origin}\n${log.slice(-2000)}`);
}

/**
 * The pages to audit, with real paths taken from the sitemap so the check never
 * hard-codes a tire that sells out. Pure: give it the sitemap XML.
 */
export function pickPages(sitemapXml) {
  const paths = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  const first = re => paths.find(p => re.test(p));
  const pages = {
    home: '/',
    tires: '/tires',
    used: '/tires/used',
    tire: first(/^\/tires\/\d+-/),
    store: first(/^\/locations\/[a-z-]+$/),
    service: first(/^\/services\/[a-z-]+$/),
    about: '/about-us',
    size: first(/^\/tires\/size\/[\d-]+$/),
    brand: first(/^\/tires\/brands\/[a-z0-9-]+$/),
    checkout: '/checkout',
  };
  return Object.fromEntries(Object.entries(pages).filter(([, p]) => Boolean(p)));
}

/** Launch Chrome once and run Lighthouse on many URLs. */
export async function withLighthouse(work) {
  const { default: lighthouse } = await import('lighthouse');
  const chromeLauncher = await import('chrome-launcher');
  const { default: desktopConfig } = await import('lighthouse/core/config/desktop-config.js');
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
  const run = async (url, { formFactor = 'mobile', categories }) => {
    const flags = {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: categories,
    };
    const config = formFactor === 'desktop' ? desktopConfig : undefined;
    const result = await lighthouse(url, flags, config);
    return result.lhr;
  };
  try {
    return await work(run);
  } finally {
    await chrome.kill();
  }
}
