import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function formatUsd(amount: number): string {
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  if (amount >= 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(6)}`;
}

export function formatToken(amount: number | bigint, decimals: number): string {
  const value = Number(amount) / Math.pow(10, decimals);
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(4);
  if (value >= 0.001) return value.toFixed(6);
  return value.toFixed(8);
}

export function truncatePubkey(pubkey: string): string {
  if (pubkey.length <= 8) return pubkey;
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

export function solscanLink(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

export function solscanAddressLink(address: string): string {
  return `https://solscan.io/account/${address}`;
}
