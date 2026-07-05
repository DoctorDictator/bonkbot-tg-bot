import { VersionedTransaction } from '@solana/web3.js';
import { env } from '../config';
import { SolanaService } from './solana.service';
import type { Keypair } from '@solana/web3.js';
import type { SwapQuoteResponse } from '../types';

const JUPITER_API = env.JUPITER_API_URL;
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export class SwapService {
  private solana: SolanaService;

  constructor() {
    this.solana = new SolanaService();
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amountLamports: number,
    slippageBps: number = 100,
  ): Promise<SwapQuoteResponse | null> {
    try {
      const url = `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}`;
      const response = await fetch(url);

      if (!response.ok) return null;

      const data = await response.json();

      return {
        inputMint,
        outputMint,
        amount: amountLamports.toString(),
        expectedOutput: data.outAmount,
        priceImpact: data.priceImpactPct,
        minimumReceived: data.otherAmountThreshold,
        route: data.routePlan?.map((r: any) => r.swapInfo?.label).filter(Boolean).join(' → ') || 'Jupiter',
        raw: data,
      };
    } catch {
      return null;
    }
  }

  async executeSwap(keypair: Keypair, quoteResponse: any): Promise<string | null> {
    try {
      const swapResponse = await fetch(`${JUPITER_API}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });

      if (!swapResponse.ok) return null;

      const { swapTransaction } = await swapResponse.json();
      const txBuf = Buffer.from(swapTransaction, 'base64');
      const tx = VersionedTransaction.deserialize(txBuf);
      tx.sign([keypair]);

      const connection = this.solana.getConnection();
      const sig = await connection.sendTransaction(tx);
      return sig;
    } catch {
      return null;
    }
  }

  async getTokenPrice(mint: string): Promise<number | null> {
    try {
      const url = `https://api.jup.ag/price/v2?ids=${mint}`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      return data.data?.[mint]?.price ?? null;
    } catch {
      return null;
    }
  }

  async getSolPrice(): Promise<number> {
    const price = await this.getTokenPrice(SOL_MINT);
    return price ?? 0;
  }

  async getUsdcPrice(): Promise<number> {
    const price = await this.getTokenPrice(USDC_MINT);
    return price ?? 1;
  }

  static SOL_MINT = SOL_MINT;
  static USDC_MINT = USDC_MINT;
}
