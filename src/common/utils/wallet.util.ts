import { ethers } from 'ethers';

export function recoverWalletAddress(message: string, signature: string): string {
  return ethers.utils.verifyMessage(message, signature);
}