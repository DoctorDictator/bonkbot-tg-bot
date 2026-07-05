import { SwapService } from './swap.service';

const TTL_MS = 30_000;

interface CacheEntry {
  price: number;
  timestamp: number;
}

export class PriceService {
  private cache: Map<string, CacheEntry> = new Map();
  private swapService: SwapService;

  constructor() {
    this.swapService = new SwapService();
  }

  async getTokenPrice(mint: string): Promise<number> {
    const cached = this.cache.get(mint);
    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      return cached.price;
    }

    const price = await this.swapService.getTokenPrice(mint);
    const resolved = price ?? 0;

    this.cache.set(mint, { price: resolved, timestamp: Date.now() });
    return resolved;
  }

  async getSolPrice(): Promise<number> {
    return this.getTokenPrice(SwapService.SOL_MINT);
  }

  async getUsdcPrice(): Promise<number> {
    return this.getTokenPrice(SwapService.USDC_MINT);
  }
}
