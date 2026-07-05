import { DbService } from '../../services/db.service';
import type { MyContext } from '../../types';
import type { Middleware } from 'telegraf';

export function authMiddleware(): Middleware<MyContext> {
  return (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    const db = DbService.getInstance();
    const user = db.getUser(telegramId);

    if (!user) {
      db.createUser(telegramId, ctx.from.username);
    } else if (ctx.from.username && user.username !== ctx.from.username) {
      db.updateUsername(telegramId, ctx.from.username);
    }

    return next();
  };
}
