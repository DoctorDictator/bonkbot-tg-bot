import { Scenes, Markup } from 'telegraf';
import { PublicKey } from '@solana/web3.js';
import type { MyContext } from '../../types';
import { isValidPublicKey } from '../../utils/validate';
import { formatToken, solscanLink, truncatePubkey } from '../../utils/format';
import { WalletService } from '../../services/wallet.service';
import { SolanaService } from '../../services/solana.service';
import { DbService } from '../../services/db.service';
import { confirmCancelKeyboard, backKeyboard } from '../../utils/keyboard';

const walletService = new WalletService();
const solanaService = new SolanaService();
const db = DbService.getInstance();

interface SendTokenState {
  sendTokenMint?: string;
  sendTokenAmount?: string;
  sendSolRecipient?: string;
  tokenAccounts?: string[];
}

export const sendTokenScene = new Scenes.WizardScene<MyContext>(
  'send-token',

  async (ctx) => {
    const telegramId = ctx.from!.id;
    const pubkey = walletService.getPublicKey(telegramId);

    if (!pubkey) {
      await ctx.reply('❌ No wallet found. Generate one first.');
      await ctx.scene.leave();
      return;
    }

    const tokenAccounts = await solanaService.getTokenAccounts(new PublicKey(pubkey));

    if (tokenAccounts.length === 0) {
      await ctx.reply('You don\'t have any SPL tokens to send.');
      await ctx.scene.leave();
      return;
    }

    let msg = 'Select a token to send:\n\n';
    const buttons: any[] = [];
    const mints: string[] = [];

    for (let i = 0; i < tokenAccounts.length; i++) {
      const t = tokenAccounts[i];
      const label = `${formatToken(t.amount, t.decimals)} ${truncatePubkey(t.mint)}`;
      mints.push(t.mint);
      buttons.push([Markup.button.callback(label, `send_token_select_${i}`)]);
    }

    buttons.push([Markup.button.callback('❌ Cancel', 'cancel')]);

    const state = ctx.wizard.state as SendTokenState;
    state.tokenAccounts = mints;

    await ctx.reply(msg, Markup.inlineKeyboard(buttons));
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

    if (action.startsWith('send_token_select_')) {
      await ctx.answerCbQuery();
      const idx = parseInt(action.split('_').pop()!);
      const state = ctx.wizard.state as SendTokenState;

      if (!state.tokenAccounts || idx >= state.tokenAccounts.length) {
        await ctx.reply('Invalid selection.');
        return;
      }

      state.sendTokenMint = state.tokenAccounts[idx];
      await ctx.reply('Enter the recipient\'s Solana address:', backKeyboard());
      ctx.wizard.next();
    }
  },

  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter a valid address.');
      return;
    }

    const text = ctx.message.text.trim();

    if (!isValidPublicKey(text)) {
      await ctx.reply('❌ Invalid Solana address.');
      return;
    }

    const state = ctx.wizard.state as SendTokenState;
    state.sendSolRecipient = text;
    await ctx.reply('Enter the amount of tokens to send (in whole tokens, not raw units):', backKeyboard());
    ctx.wizard.next();
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

    const state = ctx.wizard.state as SendTokenState;
    state.sendTokenAmount = amountStr;

    await ctx.reply(
      `📋 *Confirm Token Transfer*\n\n` +
      `Token: \`${truncatePubkey(state.sendTokenMint!)}\`\n` +
      `To: \`${state.sendSolRecipient!}\`\n` +
      `Amount: *${amountStr}*\n\nProceed?`,
      { parse_mode: 'Markdown', ...confirmCancelKeyboard() },
    );

    ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const action = ctx.callbackQuery.data;

    if (action === 'cancel') {
      await ctx.answerCbQuery();
      await ctx.reply('Transfer cancelled.');
      await ctx.scene.leave();
      return;
    }

    if (action !== 'confirm') return;

    await ctx.answerCbQuery('Sending...');
    const telegramId = ctx.from!.id;
    const keypair = walletService.getActiveKeypair(telegramId);

    if (!keypair) {
      await ctx.reply('❌ Wallet error.');
      await ctx.scene.leave();
      return;
    }

    const state = ctx.wizard.state as SendTokenState;
    const mint = new PublicKey(state.sendTokenMint!);
    const recipient = new PublicKey(state.sendSolRecipient!);
    const amount = Math.floor(parseFloat(state.sendTokenAmount!) * Math.pow(10, 9));

    try {
      const sig = await solanaService.sendToken(keypair, recipient, mint, amount);
      db.createTransaction(telegramId, 'TOKEN_SEND', sig, 'pending', state.sendTokenAmount, state.sendTokenMint);

      await ctx.reply(
        `✅ *Transaction Sent!*\n\n[View on Solscan](${solscanLink(sig)})`,
        { parse_mode: 'Markdown' },
      );
    } catch {
      await ctx.reply('❌ Transfer failed. Please try again.');
    }

    state.sendTokenMint = undefined;
    state.sendSolRecipient = undefined;
    state.sendTokenAmount = undefined;
    await ctx.scene.leave();
  },
);
