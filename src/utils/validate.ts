import { PublicKey } from '@solana/web3.js';

export function isValidPublicKey(str: string): boolean {
  try {
    new PublicKey(str);
    return true;
  } catch {
    return false;
  }
}

export function isValidSolAmount(str: string, balanceLamports: number): { valid: boolean; error?: string; lamports?: number } {
  const num = Number(str);
  if (isNaN(num)) return { valid: false, error: 'Not a valid number' };
  if (num <= 0) return { valid: false, error: 'Amount must be greater than 0' };
  const lamports = Math.floor(num * 1_000_000_000);
  if (lamports > balanceLamports) return { valid: false, error: 'Insufficient SOL balance' };
  return { valid: true, lamports };
}

export function isValidSlippage(str: string): { valid: boolean; value?: number; error?: string } {
  const num = Number(str);
  if (isNaN(num)) return { valid: false, error: 'Not a valid number' };
  if (num < 0 || num > 100) return { valid: false, error: 'Slippage must be between 0 and 100' };
  return { valid: true, value: Math.floor(num * 100) };
}
