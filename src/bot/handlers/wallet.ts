import { Markup } from 'telegraf';
import type { MyContext } from '../../types';
import { walletMenuKeyboard } from '../../utils/keyboard';
import { WalletService } from '../../services/wallet.service';

export function registerWalletHandlers(bot: {
  action: (action: string, handler: (ctx: MyContext) => Promise<void>) => void;
  hears: (pattern: string | RegExp, handler: (ctx: MyContext) => Promise<void>) => void;
}) {
  const walletService = new WalletService();

  bot.action('wallet_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('*💼 Wallet Menu*\n\nManage your Solana wallets.', {
      parse_mode: 'Markdown',
      ...walletMenuKeyboard(),
    });
  });

  bot.action('wallet_generate', async (ctx) => {
    await ctx.answerCbQuery('Generating...');
    const telegramId = ctx.from!.id;
    const result = walletService.generateWallet(telegramId);

    await ctx.editMessageText(
      `✅ *Wallet created!*\n\nPublic key:\n\`${result.publicKey}\`\n\nStore your private key securely. Never share it with anyone.`,
      { parse_mode: 'Markdown', ...walletMenuKeyboard() },
    );
  });

  bot.action('wallet_show', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from!.id;
    const pubkey = walletService.getPublicKey(telegramId);

    if (!pubkey) {
      await ctx.editMessageText('No wallet found. Generate one first.', { ...walletMenuKeyboard() });
      return;
    }

    await ctx.editMessageText(
      `👛 *Your Public Key*\n\n\`${pubkey}\``,
      { parse_mode: 'Markdown', ...walletMenuKeyboard() },
    );
  });

  bot.action('wallet_export', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from!.id;
    const pubkey = walletService.getPublicKey(telegramId);

    if (!pubkey) {
      await ctx.editMessageText('No wallet found.', { ...walletMenuKeyboard() });
      return;
    }

    await ctx.editMessageText(
      '⚠️ *WARNING: Exporting your private key*\n\nAnyone with this key has full access to your wallet funds.\n\nOnly export if you know what you\'re doing. The key will be sent via DM and auto-deleted after 30 seconds.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Yes, export it', 'wallet_export_confirm')],
          [Markup.button.callback('❌ Cancel', 'wallet_menu')],
        ]),
      },
    );
  });

  bot.action('wallet_export_confirm', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from!.id;
    const privateKey = walletService.exportPrivateKey(telegramId);

    if (!privateKey) {
      await ctx.editMessageText('Failed to export private key.', { ...walletMenuKeyboard() });
      return;
    }

    await ctx.editMessageText('Private key sent via DM. It will be deleted in 30 seconds.');

    try {
      const msg = await ctx.reply(
        `⚠️ *Your Private Key* — auto-deletes in 30s\n\n\`${privateKey}\``,
        { parse_mode: 'Markdown' },
      );

      setTimeout(async () => {
        try {
          await ctx.deleteMessage(msg.message_id);
        } catch { /* already deleted */ }
      }, 30000);
    } catch {
      await ctx.reply('Could not send DM. Please enable private messages from the bot.');
    }
  });

  bot.action('wallet_import', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '📤 *Import Wallet*\n\nSend me your base58 private key as a text message.\n\n⚠️ Make sure nobody can see your screen.',
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'wallet_menu')]]) },
    );
  });

  bot.hears(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/, async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const telegramId = ctx.from!.id;
    const secretKey = ctx.message.text.trim();

    const result = walletService.importWallet(telegramId, secretKey);
    if (!result) {
      await ctx.reply('Invalid private key. Please check and try again.', { ...walletMenuKeyboard() });
      return;
    }

    await ctx.reply(
      `✅ *Wallet imported!*\n\nPublic key:\n\`${result.publicKey}\``,
      { parse_mode: 'Markdown', ...walletMenuKeyboard() },
    );
  });
}
