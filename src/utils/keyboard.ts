import { Markup } from 'telegraf';

export function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💼 Wallet', 'wallet_menu')],
    [Markup.button.callback('📊 Portfolio', 'portfolio')],
    [Markup.button.callback('🔄 Swap', 'swap')],
    [Markup.button.callback('📤 Send', 'send_menu')],
    [Markup.button.callback('⚙️ Settings', 'settings')],
  ]);
}

export function walletMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔑 Generate Wallet', 'wallet_generate')],
    [Markup.button.callback('👛 Show Public Key', 'wallet_show')],
    [Markup.button.callback('📥 Export Private Key', 'wallet_export')],
    [Markup.button.callback('📤 Import Wallet', 'wallet_import')],
    [Markup.button.callback('🔙 Back', 'back_main')],
  ]);
}

export function sendMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💎 Send SOL', 'send_sol')],
    [Markup.button.callback('🪙 Send Token', 'send_token')],
    [Markup.button.callback('🔙 Back', 'back_main')],
  ]);
}

export function settingsKeyboard(currentSlippage: number, currentFee: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`Slippage: ${currentSlippage / 100}%`, 'settings_slippage')],
    [Markup.button.callback(`Priority Fee: ${currentFee}`, 'settings_priority_fee')],
    [Markup.button.callback('🔙 Back', 'back_main')],
  ]);
}

export function slippageKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('0.5%', 'slippage_0.5')],
    [Markup.button.callback('1%', 'slippage_1')],
    [Markup.button.callback('5%', 'slippage_5')],
    [Markup.button.callback('10%', 'slippage_10')],
    [Markup.button.callback('Custom', 'slippage_custom')],
    [Markup.button.callback('🔙 Back', 'settings')],
  ]);
}

export function priorityFeeKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('None', 'fee_none')],
    [Markup.button.callback('Low', 'fee_low')],
    [Markup.button.callback('Medium', 'fee_medium')],
    [Markup.button.callback('High', 'fee_high')],
    [Markup.button.callback('Custom', 'fee_custom')],
    [Markup.button.callback('🔙 Back', 'settings')],
  ]);
}

export function confirmCancelKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Confirm', 'confirm')],
    [Markup.button.callback('❌ Cancel', 'cancel')],
  ]);
}

export function backKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back', 'back_main')],
  ]);
}

export function portfolioKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Refresh', 'portfolio')],
    [Markup.button.callback('🔙 Back', 'back_main')],
  ]);
}

export function swapTokenSelectKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('◎ SOL (Native)', 'swap_in_sol')],
    [Markup.button.callback('From holdings', 'swap_in_holdings')],
    [Markup.button.callback('❌ Cancel', 'cancel')],
  ]);
}

export function swapCommonTokensKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('◎ SOL', 'swap_out_sol')],
    [Markup.button.callback('USDC', 'swap_out_usdc')],
    [Markup.button.callback('BONK', 'swap_out_bonk')],
    [Markup.button.callback('WIF', 'swap_out_wif')],
    [Markup.button.callback('Custom mint', 'swap_out_custom')],
    [Markup.button.callback('❌ Cancel', 'cancel')],
  ]);
}
