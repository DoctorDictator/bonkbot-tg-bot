import { Connection, PublicKey, SystemProgram, ComputeBudgetProgram, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, getMint } from '@solana/spl-token';
import { env } from '../config';
import type { Keypair } from '@solana/web3.js';
import type { TokenAccount } from '../types';

export class SolanaService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(env.RPC_URL, 'confirmed');
  }

  getConnection(): Connection {
    return this.connection;
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    return this.connection.getBalance(publicKey);
  }

  async getTokenAccounts(publicKey: PublicKey): Promise<TokenAccount[]> {
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    const results: TokenAccount[] = [];

    for (const { account } of tokenAccounts.value) {
      const parsed = account.data.parsed;
      const info = parsed.info;
      const amount = BigInt(info.tokenAmount.amount);
      if (amount === 0n) continue;

      results.push({
        mint: info.mint,
        amount,
        decimals: info.tokenAmount.decimals,
      });
    }

    return results;
  }

  async sendSol(from: Keypair, to: PublicKey, amountLamports: number, priorityFee: number = 1000): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash();

    const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    });

    const transferIx = SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: amountLamports,
    });

    const messageV0 = new TransactionMessage({
      payerKey: from.publicKey,
      recentBlockhash: blockhash,
      instructions: [priorityIx, transferIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([from]);

    const sig = await this.connection.sendTransaction(tx);
    return sig;
  }

  async sendToken(from: Keypair, to: PublicKey, mint: PublicKey, amount: number): Promise<string> {
    const fromAta = await getOrCreateAssociatedTokenAccount(
      this.connection,
      from,
      mint,
      from.publicKey,
    );

    const toAta = await getOrCreateAssociatedTokenAccount(
      this.connection,
      from,
      mint,
      to,
    );

    const { blockhash } = await this.connection.getLatestBlockhash();

    const transferIx = createTransferInstruction(
      fromAta.address,
      toAta.address,
      from.publicKey,
      amount,
    );

    const messageV0 = new TransactionMessage({
      payerKey: from.publicKey,
      recentBlockhash: blockhash,
      instructions: [transferIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([from]);

    const sig = await this.connection.sendTransaction(tx);
    return sig;
  }

  async confirmTransaction(signature: string, timeoutMs: number = 30000): Promise<boolean> {
    try {
      const result = await this.connection.confirmTransaction(signature, 'confirmed');
      return result.value.err === null;
    } catch {
      return false;
    }
  }

  async getTokenMetadata(mint: PublicKey): Promise<{ name: string; symbol: string; decimals: number } | null> {
    try {
      const mintInfo = await getMint(this.connection, mint);
      return {
        name: mintInfo.address.toBase58().slice(0, 8),
        symbol: mintInfo.address.toBase58().slice(0, 4).toUpperCase(),
        decimals: mintInfo.decimals,
      };
    } catch {
      return null;
    }
  }
}
