// useSuiClient.ts
import { useContext } from 'react';
import SuiClientContext from './SuiClientContext';
import { SuiClient } from '@mysten/sui.js/client';

export const useSuiClient = (): SuiClient => {
  const context = useContext(SuiClientContext);
  if (!context) {
    throw new Error('useSuiClient must be used within a SuiClientProvider');
  }
  return context;
};
