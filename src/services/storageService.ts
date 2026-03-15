import { EncryptionKeyRecord, Preprint, SupportTicket } from '../types';

const SAVED_PREPRINTS_KEY = 'preprint_explorer_saved';
const ACTIVE_FEED_KEY = 'preprint_explorer_active_feed';
const ENCRYPTION_KEYS_KEY = 'preprint_explorer_encryption_keys';
const TREND_ALERTS_KEY = 'preprint_explorer_trend_alerts';
const TOPIC_PREFERENCES_KEY = 'preprint_explorer_topic_preferences';
const PROFILE_CUSTOMIZATIONS_KEY = 'preprint_explorer_profile_customizations';
const CONTACT_DRAFT_KEY = 'preprint_explorer_contact_draft';
const SUPPORT_TICKETS_KEY = 'preprint_explorer_support_tickets';

type TopicPreference = {
  followed: boolean;
  alertsEnabled: boolean;
};

type ProfileCustomization = {
  manualPublicationIds: string[];
  networkLabels: string[];
};

type ContactDraft = {
  subject?: string;
  message?: string;
  category?: string;
};

const DEFAULT_ENCRYPTION_KEYS: EncryptionKeyRecord[] = [
  { id: 'primary-research-key', name: 'Primary Research Key', created: '2023-10-15', status: 'Active' },
  { id: 'backup-recovery-key', name: 'Backup Recovery Key', created: '2023-05-20', status: 'Stored' },
];

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
  },

  getActiveFeedId: (): string | null => {
    try {
      return localStorage.getItem(ACTIVE_FEED_KEY);
    } catch (error) {
      console.error('Error loading active feed:', error);
      return null;
    }
  },

  setActiveFeedId: (feedId: string | null) => {
    try {
      if (feedId) {
        localStorage.setItem(ACTIVE_FEED_KEY, feedId);
      } else {
        localStorage.removeItem(ACTIVE_FEED_KEY);
      }
    } catch (error) {
      console.error('Error saving active feed:', error);
    }
  },

  getEncryptionKeys: (): EncryptionKeyRecord[] => {
    try {
      const raw = localStorage.getItem(ENCRYPTION_KEYS_KEY);
      if (!raw) {
        return DEFAULT_ENCRYPTION_KEYS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : DEFAULT_ENCRYPTION_KEYS;
    } catch (error) {
      console.error('Error loading encryption keys:', error);
      return DEFAULT_ENCRYPTION_KEYS;
    }
  },

  saveEncryptionKeys: (keys: EncryptionKeyRecord[]) => {
    try {
      localStorage.setItem(ENCRYPTION_KEYS_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('Error saving encryption keys:', error);
    }
  },

  getTrendAlertsEnabled: (): boolean => {
    try {
      return localStorage.getItem(TREND_ALERTS_KEY) === 'true';
    } catch (error) {
      console.error('Error loading trend alerts setting:', error);
      return false;
    }
  },

  setTrendAlertsEnabled: (enabled: boolean) => {
    try {
      localStorage.setItem(TREND_ALERTS_KEY, String(enabled));
    } catch (error) {
      console.error('Error saving trend alerts setting:', error);
    }
  },

  getTopicPreference: (topicSlug: string): TopicPreference => {
    try {
      const raw = localStorage.getItem(TOPIC_PREFERENCES_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const value = parsed?.[topicSlug];
      return {
        followed: Boolean(value?.followed),
        alertsEnabled: Boolean(value?.alertsEnabled),
      };
    } catch (error) {
      console.error('Error loading topic preference:', error);
      return { followed: false, alertsEnabled: false };
    }
  },

  setTopicPreference: (topicSlug: string, preference: TopicPreference) => {
    try {
      const raw = localStorage.getItem(TOPIC_PREFERENCES_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[topicSlug] = preference;
      localStorage.setItem(TOPIC_PREFERENCES_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('Error saving topic preference:', error);
    }
  },

  getProfileCustomization: (userId: string): ProfileCustomization => {
    try {
      const raw = localStorage.getItem(PROFILE_CUSTOMIZATIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const value = parsed?.[userId];
      return {
        manualPublicationIds: Array.isArray(value?.manualPublicationIds) ? value.manualPublicationIds : [],
        networkLabels: Array.isArray(value?.networkLabels) ? value.networkLabels : [],
      };
    } catch (error) {
      console.error('Error loading profile customization:', error);
      return { manualPublicationIds: [], networkLabels: [] };
    }
  },

  saveProfileCustomization: (userId: string, customization: ProfileCustomization) => {
    try {
      const raw = localStorage.getItem(PROFILE_CUSTOMIZATIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[userId] = customization;
      localStorage.setItem(PROFILE_CUSTOMIZATIONS_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('Error saving profile customization:', error);
    }
  },

  getContactDraft: (): ContactDraft => {
    try {
      const raw = localStorage.getItem(CONTACT_DRAFT_KEY);
      return raw ? JSON.parse(raw) as ContactDraft : {};
    } catch (error) {
      console.error('Error loading contact draft:', error);
      return {};
    }
  },

  saveContactDraft: (draft: ContactDraft) => {
    try {
      localStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving contact draft:', error);
    }
  },

  clearContactDraft: () => {
    try {
      localStorage.removeItem(CONTACT_DRAFT_KEY);
    } catch (error) {
      console.error('Error clearing contact draft:', error);
    }
  },

  getSupportTickets: (): SupportTicket[] => {
    try {
      const raw = localStorage.getItem(SUPPORT_TICKETS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed as SupportTicket[] : [];
    } catch (error) {
      console.error('Error loading support tickets:', error);
      return [];
    }
  },

  saveSupportTickets: (tickets: SupportTicket[]) => {
    try {
      localStorage.setItem(SUPPORT_TICKETS_KEY, JSON.stringify(tickets));
    } catch (error) {
      console.error('Error saving support tickets:', error);
    }
  },
};
