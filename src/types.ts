import type { Scenes } from 'telegraf';

export interface UserSettings {
  slippageBps: number;
  priorityFee: 'none' | 'low' | 'medium' | 'high' | 'custom';
  customPriorityFeeLamports: number;
  notificationsEnabled: boolean;
}

export interface WalletData {
  id: number;
  telegramId: number;
  publicKey: string;
  encryptedPrivateKey: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

export interface TransactionRecord {
  id: number;
  telegramId: number;
  type: 'SOL_SEND' | 'TOKEN_SEND' | 'SWAP';
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  amount: string;
  tokenMint: string | null;
  createdAt: string;
}

export interface TokenAccount {
  mint: string;
  amount: bigint;
  decimals: number;
  name?: string;
  symbol?: string;
  usdValue?: number;
}

export interface SwapQuoteResponse {
  inputMint: string;
  outputMint: string;
  amount: string;
  expectedOutput: string;
  priceImpact: number;
  minimumReceived: string;
  route: string;
  raw: any;
}

export interface MyWizardSession extends Scenes.WizardSessionData {
  sendSolRecipient?: string;
  sendSolAmount?: string;
  sendTokenMint?: string;
  sendTokenAmount?: string;
  swapInputMint?: string;
  swapOutputMint?: string;
  swapAmount?: string;
  swapQuote?: SwapQuoteResponse;
}

export interface MyContext extends Scenes.WizardContext<MyWizardSession> {}
