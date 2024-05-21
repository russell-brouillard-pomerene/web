// SuiClientContext.ts
import { createContext } from 'react';
import { SuiClient } from '@mysten/sui.js/client';

// Create the context
const SuiClientContext = createContext<SuiClient | undefined>(undefined);

export default SuiClientContext;
