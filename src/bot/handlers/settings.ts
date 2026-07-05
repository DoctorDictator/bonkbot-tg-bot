import type { MyContext } from '../../types';
import { settingsKeyboard, slippageKeyboard, priorityFeeKeyboard } from '../../utils/keyboard';
import { isValidSlippage } from '../../utils/validate';
import { DbService } from '../../services/db.service';

export function registerSettingsHandlers(bot: { action: (action: string, handler: (ctx: MyContext) => Promise<void>) => void; hears: (pattern: RegExp, handler: (ctx: MyContext) => Promise<void>) => void }) {
  const db = DbService.getInstance();

  bot.action('settings', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from!.id;
    const settings = db.getUserSettings(telegramId);

    await ctx.editMessageText(
      `*⚙️ Settings*\n\nSlippage: ${settings.slippageBps / 100}%\nPriority Fee: ${settings.priorityFee}\nNotifications: ${settings.notificationsEnabled ? 'Enabled' : 'Disabled'}`,
      {
        parse_mode: 'Markdown',
        ...settingsKeyboard(settings.slippageBps, settings.priorityFee),
      },
    );
  });

  bot.action('settings_slippage', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Select slippage tolerance:', { ...slippageKeyboard() });
  });

  for (const val of ['0.5', '1', '5', '10']) {
    bot.action(`slippage_${val}`, async (ctx) => {
      await ctx.answerCbQuery();
      const telegramId = ctx.from!.id;
      const bps = Math.floor(parseFloat(val) * 100);
      db.updateUserSettings(telegramId, { slippageBps: bps });
      await ctx.editMessageText(`Slippage set to ${val}%.`, { ...slippageKeyboard() });
    });
  }

  bot.action('slippage_custom', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Enter custom slippage percentage (0-100):');
  });

  bot.hears(/^(\d+(\.\d+)?)$/, async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const telegramId = ctx.from!.id;
    const result = isValidSlippage(ctx.message.text);

    if (!result.valid) {
      await ctx.reply(result.error!);
      return;
    }

    db.updateUserSettings(telegramId, { slippageBps: result.value! });
    const settings = db.getUserSettings(telegramId);
    await ctx.reply(`Slippage set to ${ctx.message.text}%.`, {
      ...settingsKeyboard(settings.slippageBps, settings.priorityFee),
    });
  });

  bot.action('settings_priority_fee', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Select priority fee level:', { ...priorityFeeKeyboard() });
  });

  for (const level of ['none', 'low', 'medium', 'high']) {
    bot.action(`fee_${level}`, async (ctx) => {
      await ctx.answerCbQuery();
      const telegramId = ctx.from!.id;
      db.updateUserSettings(telegramId, { priorityFee: level as any });
      const settings = db.getUserSettings(telegramId);
      await ctx.editMessageText(`Priority fee set to ${level}.`, {
        ...settingsKeyboard(settings.slippageBps, level),
      });
    });
  }

  bot.action('fee_custom', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Enter custom priority fee in microLamports:');
  });
}
