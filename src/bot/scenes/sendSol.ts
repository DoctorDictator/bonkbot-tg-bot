import { Scenes, Markup } from 'telegraf';
import type { MyContext } from '../../types';
import { isValidPublicKey, isValidSolAmount } from '../../utils/validate';
import { lamportsToSol, solscanLink } from '../../utils/format';
import { WalletService } from '../../services/wallet.service';
import { SolanaService } from '../../services/solana.service';
import { DbService } from '../../services/db.service';
import { backKeyboard, confirmCancelKeyboard } from '../../utils/keyboard';

const walletService = new WalletService();
const solanaService = new SolanaService();
const db = DbService.getInstance();

interface SendSolState {
  sendSolRecipient?: string;
  sendSolAmount?: string;
}

export const sendSolScene = new Scenes.WizardScene<MyContext>(
  'send-sol',

  async (ctx) => {
    await ctx.reply('✉️ Send SOL\n\nEnter the recipient\'s Solana address:', backKeyboard());
    ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter a valid address.');
      return;
    }

    const text = ctx.message.text.trim();

    if (!isValidPublicKey(text)) {
      await ctx.reply('❌ Invalid Solana address. Please enter a valid public key.');
      return;
    }

    const state = ctx.wizard.state as SendSolState;
    state.sendSolRecipient = text;
    await ctx.reply('How much SOL do you want to send?', backKeyboard());
    ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter an amount.');
      return;
    }

    const telegramId = ctx.from!.id;
    const keypair = walletService.getActiveKeypair(telegramId);

    if (!keypair) {
      await ctx.reply('❌ No wallet found. Generate one first.', backKeyboard());
      await ctx.scene.leave();
      return;
    }

    const amountStr = ctx.message.text.trim();
    const balance = await solanaService.getBalance(keypair.publicKey);
    const validation = isValidSolAmount(amountStr, balance);

    if (!validation.valid) {
      await ctx.reply(`❌ ${validation.error}`);
      return;
    }

    const state = ctx.wizard.state as SendSolState;
    state.sendSolAmount = amountStr;

    const solAmount = lamportsToSol(validation.lamports!);

    await ctx.reply(
      `📋 *Confirm Transfer*\n\n` +
      `To: \`${state.sendSolRecipient}\`\n` +
      `Amount: *${solAmount.toFixed(6)} SOL*\n\n` +
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
      await ctx.reply('Transfer cancelled.');
      await ctx.scene.leave();
      return;
    }

    if (action !== 'confirm') {
      await ctx.reply('Please use the buttons to confirm or cancel.');
      return;
    }

    await ctx.answerCbQuery('Sending...');
    const telegramId = ctx.from!.id;
    const keypair = walletService.getActiveKeypair(telegramId);
    if (!keypair) {
      await ctx.reply('❌ Wallet error. Try again.');
      await ctx.scene.leave();
      return;
    }

    const { PublicKey } = await import('@solana/web3.js');
    const state = ctx.wizard.state as SendSolState;
    const recipient = new PublicKey(state.sendSolRecipient!);
    const amountLamports = Math.floor(parseFloat(state.sendSolAmount!) * 1_000_000_000);

    try {
      const sig = await solanaService.sendSol(keypair, recipient, amountLamports);
      db.createTransaction(telegramId, 'SOL_SEND', sig, 'pending', state.sendSolAmount);

      await ctx.reply(
        `✅ *Transaction Sent!*\n\n[View on Solscan](${solscanLink(sig)})`,
        { parse_mode: 'Markdown' },
      );
    } catch {
      await ctx.reply('❌ Transaction failed. Please try again.');
    }

    state.sendSolRecipient = undefined;
    state.sendSolAmount = undefined;
    await ctx.scene.leave();
  },
);
