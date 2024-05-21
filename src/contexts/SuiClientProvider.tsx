// SuiClientProvider.tsx
import { ReactNode } from 'react';
import SuiClientContext from './SuiClientContext';
import { suiClient } from './suiClient';

interface SuiClientProviderProps {
  children: ReactNode;
}

export const SuiClientProvider = ({ children }: SuiClientProviderProps) => {
  return (
    <SuiClientContext.Provider value={suiClient}>
      {children}
    </SuiClientContext.Provider>
  );
};
