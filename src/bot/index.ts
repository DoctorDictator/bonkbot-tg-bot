import { Telegraf, Scenes, session } from 'telegraf';
import { env } from '../config';
import type { MyContext, MyWizardSession } from '../types';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import { registerStartHandler } from './handlers/start';
import { registerWalletHandlers } from './handlers/wallet';
import { registerPortfolioHandler } from './handlers/portfolio';
import { registerSwapEntryHandler } from './handlers/swap';
import { registerSettingsHandlers } from './handlers/settings';
import { sendSolScene } from './scenes/sendSol';
import { sendTokenScene } from './scenes/sendToken';
import { swapScene } from './scenes/swap';
import { sendMenuKeyboard } from '../utils/keyboard';

const stage = new Scenes.Stage<MyContext>([sendSolScene, sendTokenScene, swapScene]);

export const bot = new Telegraf<MyContext>(env.BOT_TOKEN);

bot.use(session());
bot.use(errorHandler());
bot.use(rateLimit());
bot.use(authMiddleware());
bot.use(stage.middleware());

registerStartHandler(bot);
registerWalletHandlers(bot);
registerPortfolioHandler(bot);
registerSwapEntryHandler(bot);
registerSettingsHandlers(bot);

bot.action('send_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('*📤 Send Menu*\n\nChoose what to send:', {
    parse_mode: 'Markdown',
    ...sendMenuKeyboard(),
  });
});

bot.action('send_sol', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('send-sol');
});

bot.action('send_token', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('send-token');
});

bot.action('cancel', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Cancelled.');
  await ctx.scene.leave();
});

export async function launchBot(): Promise<void> {
  await bot.launch();
  console.log('[Bot] Launch successful');
}
