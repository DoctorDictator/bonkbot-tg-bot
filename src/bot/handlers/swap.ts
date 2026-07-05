import { Markup } from 'telegraf';
import type { MyContext } from '../../types';

export function registerSwapEntryHandler(bot: { action: (action: string, handler: (ctx: MyContext) => Promise<void>) => void }) {
  bot.action('swap', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('swap');
  });
}
