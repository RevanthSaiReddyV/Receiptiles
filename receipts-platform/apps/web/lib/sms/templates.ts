export const SMS_TEMPLATES = {
  RECEIPT_READY: (merchant: string, total: string) =>
    `Receiptiles: Your ${merchant} receipt ($${total}) is ready. View in your wallet or at receiptiles.com/receipts`,

  WELCOME: (name: string) =>
    `Welcome to Receiptiles, ${name}! Your digital receipt wallet is ready. Add your pass: receiptiles.com/wallet`,

  VERIFICATION: (code: string) =>
    `Receiptiles verification code: ${code}. Expires in 10 minutes.`,

  SPENDING_ALERT: (amount: string, period: string) =>
    `Receiptiles: You've spent $${amount} this ${period}. View insights at receiptiles.com/insights`,
};
