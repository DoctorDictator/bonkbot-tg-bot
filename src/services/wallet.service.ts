import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { encrypt, decrypt } from '../utils/crypto';
import { env } from '../config';
import { DbService } from './db.service';

export class WalletService {
  private db: DbService;

  constructor() {
    this.db = DbService.getInstance();
  }

  generateWallet(telegramId: number, label?: string): { publicKey: string; secretKey: string } {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = bs58.encode(keypair.secretKey);
    const encrypted = encrypt(secretKey, env.ENCRYPTION_KEY);

    this.db.createWallet(telegramId, publicKey, encrypted, label);
    return { publicKey, secretKey };
  }

  getActiveKeypair(telegramId: number): Keypair | null {
    const wallet = this.db.getActiveWallet(telegramId);
    if (!wallet) return null;

    try {
      const secretKeyStr = decrypt(wallet.encryptedPrivateKey, env.ENCRYPTION_KEY);
      const secretKey = bs58.decode(secretKeyStr);
      return Keypair.fromSecretKey(secretKey);
    } catch {
      return null;
    }
  }

  exportPrivateKey(telegramId: number): string | null {
    const wallet = this.db.getActiveWallet(telegramId);
    if (!wallet) return null;

    try {
      return decrypt(wallet.encryptedPrivateKey, env.ENCRYPTION_KEY);
    } catch {
      return null;
    }
  }

  importWallet(telegramId: number, secretKeyBase58: string, label?: string): { publicKey: string } | null {
    try {
      const secretKey = bs58.decode(secretKeyBase58);
      const keypair = Keypair.fromSecretKey(secretKey);
      const publicKey = keypair.publicKey.toBase58();
      const encrypted = encrypt(secretKeyBase58, env.ENCRYPTION_KEY);

      this.db.createWallet(telegramId, publicKey, encrypted, label);
      return { publicKey };
    } catch {
      return null;
    }
  }

  getPublicKey(telegramId: number): string | null {
    const wallet = this.db.getActiveWallet(telegramId);
    return wallet ? wallet.publicKey : null;
  }
}
