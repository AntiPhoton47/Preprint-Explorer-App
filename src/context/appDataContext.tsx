import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppDataset } from '../types';
import {
  createSeedDataset,
  exportAppDataset,
  importAppDataset,
  loadAppDataset,
  resetAppDataset,
  saveAppDataset,
} from '../services/appDataService';

interface AppDataContextValue {
  dataset: AppDataset;
  setDataset: React.Dispatch<React.SetStateAction<AppDataset>>;
  importDataset: (input: string) => { warnings: string[] };
  resetToSeed: () => void;
  exportDataset: () => string;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDataset] = useState<AppDataset>(() => loadAppDataset());

  useEffect(() => {
    saveAppDataset(dataset);
  }, [dataset]);

  const value = useMemo<AppDataContextValue>(() => ({
    dataset,
    setDataset,
    importDataset: (input: string) => {
      const result = importAppDataset(input);
      setDataset(result.dataset);
      return { warnings: result.warnings };
    },
    resetToSeed: () => {
      resetAppDataset();
      setDataset(createSeedDataset());
    },
    exportDataset: () => exportAppDataset(dataset),
  }), [dataset]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
