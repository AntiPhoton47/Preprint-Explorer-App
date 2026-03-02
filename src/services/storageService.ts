import { Preprint } from '../types';

const SAVED_PREPRINTS_KEY = 'preprint_explorer_saved';

export const storageService = {
  getSavedPreprints: (): Preprint[] => {
    try {
      const saved = localStorage.getItem(SAVED_PREPRINTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading saved preprints:', error);
      return [];
    }
  },

  savePreprint: (preprint: Preprint) => {
    try {
      const saved = storageService.getSavedPreprints();
      const exists = saved.find(p => p.id === preprint.id);
      if (!exists) {
        const updated = [...saved, { ...preprint, isSaved: true }];
        localStorage.setItem(SAVED_PREPRINTS_KEY, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error saving preprint:', error);
    }
  },

  removePreprint: (id: string) => {
    try {
      const saved = storageService.getSavedPreprints();
      const updated = saved.filter(p => p.id !== id);
      localStorage.setItem(SAVED_PREPRINTS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing preprint:', error);
    }
  },

  isPreprintSaved: (id: string): boolean => {
    const saved = storageService.getSavedPreprints();
    return saved.some(p => p.id === id);
  }
};
