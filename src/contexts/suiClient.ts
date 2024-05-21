// suiClient.ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';

// Create the SuiClient instance
export const suiClient = new SuiClient({
  url: getFullnodeUrl('devnet'), // or 'testnet' / 'mainnet' as needed
});