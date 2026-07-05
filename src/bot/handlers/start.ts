import { Markup } from 'telegraf';
import type { MyContext } from '../../types';
import { mainMenuKeyboard } from '../../utils/keyboard';
import { WalletService } from '../../services/wallet.service';

export function registerStartHandler(bot: { start: (handler: (ctx: MyContext) => Promise<void>) => void; action: (action: string, handler: (ctx: MyContext) => Promise<void>) => void }) {
  bot.start(async (ctx) => {
    const telegramId = ctx.from!.id;
    const walletService = new WalletService();
    const pubkey = walletService.getPublicKey(telegramId);

    let welcome = 'Welcome to *BonkBot* — your Solana trading bot.\n\n';
    if (pubkey) {
      welcome += `Your active wallet: \`${pubkey}\``;
    } else {
      welcome += 'You don\'t have a wallet yet. Use the menu below to create one.';
    }

    await ctx.reply(welcome, {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(),
    });
  });

  bot.action('back_main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('*BonkBot* — Main Menu', {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(),
    });
  });
}
