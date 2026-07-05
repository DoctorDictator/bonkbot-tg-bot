import { Scenes, Markup } from 'telegraf';
import type { MyContext, SwapQuoteResponse } from '../../types';
import { isValidPublicKey } from '../../utils/validate';
import { formatToken, solscanLink, truncatePubkey } from '../../utils/format';
import { WalletService } from '../../services/wallet.service';
import { SwapService } from '../../services/swap.service';
import { DbService } from '../../services/db.service';
import { confirmCancelKeyboard, backKeyboard, swapTokenSelectKeyboard, swapCommonTokensKeyboard } from '../../utils/keyboard';

const walletService = new WalletService();
const swapService = new SwapService();
const db = DbService.getInstance();

const COMMON_TOKENS: Record<string, string> = {
  sol: 'So11111111111111111111111111111111111111112',
  usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  bonk: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  wif: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
};

const COMMON_TOKEN_NAMES: Record<string, string> = {
  [COMMON_TOKENS.sol]: 'SOL',
  [COMMON_TOKENS.usdc]: 'USDC',
  [COMMON_TOKENS.bonk]: 'BONK',
  [COMMON_TOKENS.wif]: 'WIF',
};

interface SwapState {
  swapInputMint?: string;
  swapOutputMint?: string;
  swapAmount?: string;
  swapQuote?: SwapQuoteResponse;
}

export const swapScene = new Scenes.WizardScene<MyContext>(
  'swap',

  async (ctx) => {
    await ctx.reply('🔄 *Swap*\n\nSelect input token:', {
      parse_mode: 'Markdown',
      ...swapTokenSelectKeyboard(),
    });
    ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const action = ctx.callbackQuery.data;

    if (action === 'cancel') {
      await ctx.answerCbQuery();
      await ctx.reply('Cancelled.');
      await ctx.scene.leave();
      return;
    }

    await ctx.answerCbQuery();
    const state = ctx.wizard.state as SwapState;

    if (action === 'swap_in_sol') {
      state.swapInputMint = SwapService.SOL_MINT;
    } else if (action === 'swap_in_holdings') {
      await ctx.reply('Enter the token mint address to swap from:');
      ctx.wizard.next();
      return;
    }

    await ctx.reply('Select output token:', { ...swapCommonTokensKeyboard() });
    ctx.wizard.next();
    ctx.wizard.cursor = 2;
  },

  async (ctx) => {
    const state = ctx.wizard.state as SwapState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;

      if (action === 'cancel') {
        await ctx.answerCbQuery();
        await ctx.reply('Cancelled.');
        await ctx.scene.leave();
        return;
      }

      await ctx.answerCbQuery();

      if (action === 'swap_out_sol') state.swapOutputMint = SwapService.SOL_MINT;
      else if (action === 'swap_out_usdc') state.swapOutputMint = SwapService.USDC_MINT;
      else if (action === 'swap_out_bonk') state.swapOutputMint = COMMON_TOKENS.bonk;
      else if (action === 'swap_out_wif') state.swapOutputMint = COMMON_TOKENS.wif;
      else if (action === 'swap_out_custom') {
        await ctx.reply('Enter the output token mint address:');
        ctx.wizard.next();
        return;
      }

      await ctx.reply('Enter the amount to swap (in whole tokens):', backKeyboard());
      ctx.wizard.next();
      ctx.wizard.cursor = 3;
    } else if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim();
      if (isValidPublicKey(text)) {
        state.swapInputMint = text;
        await ctx.reply('Select output token:', { ...swapCommonTokensKeyboard() });
        ctx.wizard.next();
        ctx.wizard.cursor = 2;
      } else {
        await ctx.reply('❌ Invalid mint address. Please try again.');
      }
    }
  },

  async (ctx) => {
    const state = ctx.wizard.state as SwapState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;

      if (action === 'cancel') {
        await ctx.answerCbQuery();
        await ctx.reply('Cancelled.');
        await ctx.scene.leave();
        return;
      }

      if (action === 'swap_out_custom') {
        await ctx.reply('Enter the output token mint address:');
        ctx.wizard.next();
        return;
      }

      await ctx.answerCbQuery();

      if (action === 'swap_out_sol') state.swapOutputMint = SwapService.SOL_MINT;
      else if (action === 'swap_out_usdc') state.swapOutputMint = SwapService.USDC_MINT;
      else if (action === 'swap_out_bonk') state.swapOutputMint = COMMON_TOKENS.bonk;
      else if (action === 'swap_out_wif') state.swapOutputMint = COMMON_TOKENS.wif;

      await ctx.reply('Enter the amount to swap (in whole tokens):', backKeyboard());
      ctx.wizard.next();
    } else if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim();
      if (isValidPublicKey(text)) {
        state.swapOutputMint = text;
        await ctx.reply('Enter the amount to swap (in whole tokens):', backKeyboard());
        ctx.wizard.next();
      } else {
        await ctx.reply('❌ Invalid mint address.');
      }
    }
  },

  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter an amount.');
      return;
    }

    const amountStr = ctx.message.text.trim();
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Invalid amount.');
      return;
    }

    const telegramId = ctx.from!.id;
    const settings = db.getUserSettings(telegramId);
    const state = ctx.wizard.state as SwapState;
    const inputMint = state.swapInputMint!;
    const outputMint = state.swapOutputMint!;

    await ctx.reply('Fetching quote...');

    const amountLamports = inputMint === SwapService.SOL_MINT
      ? Math.floor(amount * 1_000_000_000)
      : Math.floor(amount * 1_000_000);

    const quote = await swapService.getQuote(inputMint, outputMint, amountLamports, settings.slippageBps);

    if (!quote) {
      await ctx.reply('❌ Failed to get quote. The pair may not be available or the amount is too small.');
      await ctx.scene.leave();
      return;
    }

    state.swapAmount = amountStr;
    state.swapQuote = quote;

    const inputName = COMMON_TOKEN_NAMES[inputMint] || truncatePubkey(inputMint);
    const outputName = COMMON_TOKEN_NAMES[outputMint] || truncatePubkey(outputMint);
    const expectedOutput = formatToken(BigInt(quote.expectedOutput), 9);
    const minReceived = formatToken(BigInt(quote.minimumReceived), 9);

    await ctx.reply(
      `*📋 Swap Quote*\n\n` +
      `${amount} *${inputName}* → *${outputName}*\n` +
      `Expected output: *${expectedOutput}* ${outputName}\n` +
      `Min received: *${minReceived}* ${outputName}\n` +
      `Price impact: *${(quote.priceImpact * 100).toFixed(2)}%*\n` +
      `Route: ${quote.route}\n\n` +
      `Proceed?`,
      { parse_mode: 'Markdown', ...confirmCancelKeyboard() },
    );

    ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const action = ctx.callbackQuery.data;

    if (action === 'cancel') {
      await ctx.answerCbQuery();
      await ctx.reply('Swap cancelled.');
      await ctx.scene.leave();
      return;
    }

    if (action !== 'confirm') return;

    await ctx.answerCbQuery('Executing swap...');
    const telegramId = ctx.from!.id;
    const keypair = walletService.getActiveKeypair(telegramId);

    if (!keypair) {
      await ctx.reply('❌ Wallet error.');
      await ctx.scene.leave();
      return;
    }

    const state = ctx.wizard.state as SwapState;

    try {
      const quote = state.swapQuote;
      if (!quote) {
        await ctx.reply('❌ Quote expired. Please try again.');
        await ctx.scene.leave();
        return;
      }

      const sig = await swapService.executeSwap(keypair, quote.raw);

      if (!sig) {
        await ctx.reply('❌ Swap execution failed.');
        await ctx.scene.leave();
        return;
      }

      db.createTransaction(telegramId, 'SWAP', sig, 'pending', state.swapAmount);

      await ctx.reply(
        `✅ *Swap Executed!*\n\n[View on Solscan](${solscanLink(sig)})`,
        { parse_mode: 'Markdown' },
      );
    } catch (err: any) {
      await ctx.reply(`❌ Swap failed: ${err?.message || 'Unknown error'}`);
    }

    state.swapInputMint = undefined;
    state.swapOutputMint = undefined;
    state.swapAmount = undefined;
    state.swapQuote = undefined;
    await ctx.scene.leave();
  },
);
