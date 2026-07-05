import { PublicKey } from '@solana/web3.js';
import type { MyContext } from '../../types';
import { portfolioKeyboard } from '../../utils/keyboard';
import { lamportsToSol, formatUsd, formatToken, truncatePubkey } from '../../utils/format';
import { WalletService } from '../../services/wallet.service';
import { SolanaService } from '../../services/solana.service';
import { PriceService } from '../../services/price.service';

const KNOWN_TOKENS: Record<string, { name: string; symbol: string }> = {
  'So11111111111111111111111111111111111111112': { name: 'Wrapped SOL', symbol: 'SOL' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { name: 'USD Coin', symbol: 'USDC' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { name: 'Bonk', symbol: 'BONK' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { name: 'dogwifcoin', symbol: 'WIF' },
};

export function registerPortfolioHandler(bot: { action: (action: string, handler: (ctx: MyContext) => Promise<void>) => void }) {
  const walletService = new WalletService();
  const solanaService = new SolanaService();
  const priceService = new PriceService();

  bot.action('portfolio', async (ctx) => {
    await ctx.answerCbQuery('Loading portfolio...');
    const telegramId = ctx.from!.id;
    const pubkey = walletService.getPublicKey(telegramId);

    if (!pubkey) {
      await ctx.editMessageText('No wallet found. Generate one first.', { ...portfolioKeyboard() });
      return;
    }

    const publicKey = new PublicKey(pubkey);

    try {
      const [solLamports, tokenAccounts, solPrice] = await Promise.all([
        solanaService.getBalance(publicKey),
        solanaService.getTokenAccounts(publicKey),
        priceService.getSolPrice(),
      ]);

      const solBalance = lamportsToSol(solLamports);
      const solUsd = solBalance * solPrice;

      let message = `*📊 Portfolio*\n\n`;
      message += `*SOL Balance:* ${solBalance.toFixed(4)} ◎`;
      if (solPrice > 0) message += ` (${formatUsd(solUsd)})`;
      message += `\n`;

      let totalUsd = solUsd;

      if (tokenAccounts.length > 0) {
        message += `\n*Tokens:*\n`;

        for (const token of tokenAccounts) {
          const known = KNOWN_TOKENS[token.mint];
          const tokenPrice = await priceService.getTokenPrice(token.mint);
          const amountFormatted = formatToken(token.amount, token.decimals);
          let tokenUsd = 0;
          if (tokenPrice > 0) {
            const tokenBalance = Number(token.amount) / Math.pow(10, token.decimals);
            tokenUsd = tokenBalance * tokenPrice;
            totalUsd += tokenUsd;
          }
          const name = known ? known.symbol : truncatePubkey(token.mint);
          message += `\n${amountFormatted} *${name}*`;
          if (tokenPrice > 0) message += ` — ${formatUsd(tokenUsd)}`;
        }
      } else {
        message += `\nNo token holdings.`;
      }

      message += `\n\n*Total: ${formatUsd(totalUsd)}*`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...portfolioKeyboard(),
      });
    } catch (err) {
      await ctx.editMessageText('Failed to load portfolio. Please try again.', { ...portfolioKeyboard() });
    }
  });
}
