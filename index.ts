import { bot, launchBot } from './src/bot/index';

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('[BonkBot] Starting...');
await launchBot();
