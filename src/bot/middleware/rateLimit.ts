import type { MyContext } from '../../types';
import type { Middleware } from 'telegraf';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_ACTIONS = 15;

const store = new Map<number, RateLimitEntry>();

export function rateLimit(): Middleware<MyContext> {
  return (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    const now = Date.now();
    let entry = store.get(telegramId);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + WINDOW_MS };
      store.set(telegramId, entry);
    }

    entry.count++;

    if (entry.count > MAX_ACTIONS) {
      const remaining = Math.ceil((entry.resetAt - now) / 1000);
      ctx.reply(`Too many requests. Please wait ${remaining}s.`).catch(() => {});
      return;
    }

    return next();
  };
}
