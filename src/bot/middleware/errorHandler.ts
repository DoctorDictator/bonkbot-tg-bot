import type { MyContext } from '../../types';
import type { Middleware } from 'telegraf';

export function errorHandler(): Middleware<MyContext> {
  return (ctx, next) => {
    return next().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[ERROR] ${message}`);

      try {
        ctx.reply('An error occurred. Please try again later.').catch(() => {});
      } catch {
        // ctx may not be available
      }
    });
  };
}
