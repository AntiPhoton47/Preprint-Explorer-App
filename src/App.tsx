import React, { useDeferredValue, useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Menu, 
  UserCircle, 
  Home, 
  Compass, 
  Library as LibraryIcon, 
  Settings, 
  Bookmark, 
  ExternalLink, 
  MoreVertical, 
  ArrowLeft, 
  Plus, 
  Share2, 
  Download, 
  Copy, 
  History, 
  Bell, 
  TrendingUp, 
  BookOpen,
  Filter,
  ChevronRight,
  Edit,
  Camera,
  Save,
  ShieldCheck,
  Eye,
  EyeOff,
  Quote,
  UserPlus,
  Rss,
  Zap,
  Calendar,
  Clock,
  PlusCircle,
  BookMarked,
  User as UserIcon,
  X,
  Sun,
  Moon,
  Type as TypeIcon,
  WifiOff,
  Database,
  HelpCircle,
  MessageSquare,
  Key,
  Shield,
  Lock,
  Smartphone,
  QrCode,
  AlertTriangle,
  BellOff,
  List,
  Globe,
  Twitter,
  Linkedin,
  LogIn,
  LogOut,
  Building2,
  Mail,
  CheckCircle2,
  Check,
  FileText,
  Users,
  Phone,
  Video,
  Info,
  Paperclip,
  Send,
  BarChart3,
  LoaderCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import type { 
  Preprint, 
  PaperComment,
  User,
  Institution,
  Collection, 
  ContentSource,
  ContentSyncDefinition,
  Notification, 
  ModerationAction,
  ModerationReport,
  CustomFeed, 
  PasskeyCredential,
  SecurityEvent,
  SecuritySummary,
  TrendMetric, 
  RisingStar, 
  PopularSearch,
  SavedSearch,
  SearchSuggestion,
  TrustedDevice,
  EncryptionKeyRecord,
  DigestPaper, 
  DigestActivity,
  Chat,
  Message,
  ProductAnnouncement,
  SupportTicket
} from './types';

import { AppDataProvider, useAppData } from './context/appDataContext';
import {
  bulkModerationAction,
  blockUser,
  changePassword,
  clearCsrfToken,
  completeTwoFactorLogin,
  createCollection as createCollectionRequest,
  createChat,
  disableTwoFactor,
  deleteContentSyncDefinition,
  deletePasskey,
  enableTwoFactor,
  fetchBackendPreprints,
  searchBackendPreprints,
  fetchBlockedUsers,
  fetchCollections,
  fetchContentSources,
  fetchContentSyncDefinitions,
  fetchProductAnnouncements,
  fetchPushPublicKey,
  fetchNotifications,
  fetchSearchAnalytics,
  fetchSavedSearches,
  fetchSearchSuggestions,
  fetchModerationReport,
  fetchModerationReports,
  fetchPasskeys,
  fetchSecurityEvents,
  fetchSecuritySummary,
  fetchSocialBootstrap,
  fetchUserConnections,
  fetchTrustedDevices,
  followUser,
  getCurrentSession,
  ingestContentSource,
  importProfilePublications,
  login,
  markChatRead,
  markNotificationRead,
  markNotificationsRead,
  logout,
  logoutOtherSessions,
  revokeTrustedDevice,
  regenerateBackupCodes,
  reauthenticate,
  reauthenticateWithPasskey,
  escalateModerationReport,
  reportContent,
  saveSearch,
  register,
  requestEmailVerification,
  requestPasswordReset,
  publishProductAnnouncement,
  registerPasskey,
  reviewModerationReport,
  assignModerationReport,
  saveContentSyncDefinition,
  resetPassword,
  rotateSession,
  sendMessage,
  sendDigestNow,
  sharePreprint,
  signInWithPasskey,
  subscribeToPushNotifications,
  startTwoFactorSetup,
  type AuthPayload,
  type Settings as UserSettings,
  type TwoFactorLoginPayload,
  unfollowUser,
  unsubscribeFromPushNotifications,
  unblockUser,
  updateCollection as updateCollectionRequest,
  updateCollectionAccess as updateCollectionAccessRequest,
  updateCollectionPapers as updateCollectionPapersRequest,
  updateProfile,
  updateSettings,
  verifyEmail,
  deleteSavedSearch,
} from './services/api';
import { storageService } from './services/storageService';

type RecentAuthPayload =
  | { method: 'password'; currentPassword: string }
  | { method: '2fa'; twoFactorCode: string }
  | { method: 'passkey' };

type Screen = 'login' | 'register' | 'home' | 'library' | 'collections' | 'collection-detail' | 'reader' | 'profile' | 'notifications' | 'trends' | 'edit-profile' | 'share' | 'feeds' | 'notification-settings' | 'daily-digest' | 'weekly-digest' | 'topic-insight' | 'security-settings' | 'change-password' | '2fa-setup' | '2fa-backup' | 'security-log' | 'passkeys' | 'user-profile' | 'tag-results' | 'institution-detail' | 'legal' | 'encryption-keys' | 'trusted-devices' | 'help' | 'contact' | 'chat' | 'chat-detail' | 'moderation-center';

const DEFAULT_USER_SETTINGS: UserSettings = {
  pushEnabled: true,
  emailEnabled: true,
  dailyDigest: true,
  weeklyDigest: true,
  newPublications: true,
  citationAlerts: true,
  productUpdates: false,
  deliveryDay: 'Friday',
  profileVisibility: 'public',
  messagePrivacy: 'everyone',
  sharePrivacy: 'everyone',
};

type ChatEntryMode = 'message' | 'meeting';
type MeetingInviteType = 'audio' | 'video';

type ChatEntryContext = {
  chatId: string;
  mode: ChatEntryMode;
  meetingType?: MeetingInviteType;
};

function parseProfileEntryFromLocation() {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  return url.searchParams.get('profile')?.trim() || null;
}

function parseNavigateActionFromLocation() {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  return url.searchParams.get('navigate')?.trim() || null;
}

function parseCollectionEntryFromLocation() {
  if (typeof window === 'undefined') {
    return null;
  }

  const match = window.location.pathname.match(/^\/collections\/([^/?#]+)/);
  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1] ?? '').trim() || null;
}

function parseChatEntryContextFromLocation(): ChatEntryContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  const chatId = url.searchParams.get('chat')?.trim();
  if (!chatId) {
    return null;
  }

  const mode = url.searchParams.get('mode') === 'meeting' ? 'meeting' : 'message';
  const rawType = url.searchParams.get('type');
  const meetingType = rawType === 'audio' || rawType === 'video' ? rawType : undefined;

  return {
    chatId,
    mode,
    meetingType,
  };
}

function clearChatEntryContextFromLocation() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('chat');
  url.searchParams.delete('mode');
  url.searchParams.delete('type');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
}

function clearProfileEntryFromLocation() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('profile');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
}

function clearNavigateActionFromLocation() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('navigate');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
}

function clearCollectionEntryFromLocation() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (!url.pathname.startsWith('/collections/')) {
    return;
  }

  const nextUrl = `${url.search}${url.hash}` || '/';
  window.history.replaceState({}, '', nextUrl);
}

function buildChatEntryLink(chatId: string, context?: { mode?: ChatEntryMode; meetingType?: MeetingInviteType }) {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('chat', chatId);
  if (context?.mode === 'meeting') {
    url.searchParams.set('mode', 'meeting');
    if (context.meetingType) {
      url.searchParams.set('type', context.meetingType);
    }
  }
  return url.toString();
}

function getCollectionUpdatedAtValue(value: string) {
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

function formatCollectionUpdatedAt(value: string) {
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return value;
  }
  return formatRelativeTimestamp(value);
}

function getCollectionCollaborators(collection: Collection) {
  if (collection.collaborators && collection.collaborators.length > 0) {
    return collection.collaborators;
  }
  return (collection.sharedWith ?? []).map((email) => ({
    email,
    role: 'editor' as const,
  }));
}

function getCollectionAccessRole(collection: Collection, currentUser: User) {
  if (collection.ownerId && collection.ownerId === currentUser.id) {
    return 'owner' as const;
  }
  const email = currentUser.email?.toLowerCase();
  if (!email) {
    return collection.ownerId ? 'none' as const : 'owner' as const;
  }
  const collaborator = getCollectionCollaborators(collection).find((entry) => entry.email.toLowerCase() === email);
  if (collaborator) {
    return collaborator.role;
  }
  return collection.ownerId ? 'none' as const : 'owner' as const;
}

export default function App() {
  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  );
}

function AppShell() {
  const { dataset, setDataset } = useAppData();
  const reauthResolverRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [latestBackupCodes, setLatestBackupCodes] = useState<string[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [moderationReports, setModerationReports] = useState<ModerationReport[]>([]);
  const [moderators, setModerators] = useState<Array<Pick<User, 'id' | 'name'>>>([]);
  const [moderationActions, setModerationActions] = useState<Record<string, ModerationAction[]>>({});
  const [productAnnouncements, setProductAnnouncements] = useState<ProductAnnouncement[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [notificationsTab, setNotificationsTab] = useState<'all' | 'research' | 'network' | 'system'>('all');
  const [pendingModerationReportId, setPendingModerationReportId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<Screen[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHomeFeedId, setActiveHomeFeedId] = useState<string | null>(() => storageService.getActiveFeedId());
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedPreprint, setSelectedPreprint] = useState<Preprint | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [pendingProfileUserId, setPendingProfileUserId] = useState<string | null>(() => parseProfileEntryFromLocation());
  const [pendingCollectionToken, setPendingCollectionToken] = useState<string | null>(() => parseCollectionEntryFromLocation());
  const [pendingChatEntryContext, setPendingChatEntryContext] = useState<ChatEntryContext | null>(() => parseChatEntryContextFromLocation());
  const [pendingNavigateAction, setPendingNavigateAction] = useState<string | null>(() => parseNavigateActionFromLocation());
  const [activeChatEntryContext, setActiveChatEntryContext] = useState<ChatEntryContext | null>(null);
  const [legalType, setLegalType] = useState<'tos' | 'privacy'>('tos');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [savedPreprints, setSavedPreprints] = useState<Preprint[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pushNotification, setPushNotification] = useState<Notification | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' } | null>(null);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reportPrompt, setReportPrompt] = useState<{ targetType: 'user' | 'preprint' | 'chat' | 'message' | 'comment'; targetId: string; targetLabel: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reauthPrompt, setReauthPrompt] = useState<{ title: string; description: string } | null>(null);
  const isLoggedIn = currentUser !== null;
  const unreadNotificationsCount = dataset.notifications.filter((notification) => notification.isNew && isNotificationVisible(notification, userSettings)).length;
  const unreadMessagesCount = dataset.chats.reduce((total, chat) => total + (chat.unreadCount ?? 0), 0);
  const openModerationCount = moderationReports.filter((report) => report.status === 'open' || report.status === 'reviewing').length;

  const applyAuthSession = (session: AuthPayload) => {
    setCurrentUser(session.user);
    setUserSettings(session.settings);
    setDataset(prev => ({
      ...prev,
      users: session.social.users,
      chats: session.social.chats,
    }));
    if (!session.user.isAdmin) {
      setModerationReports([]);
      setModerators([]);
      setModerationActions({});
    }
  };

  const refreshSession = async () => {
    const session = await getCurrentSession();
    applyAuthSession(session);
    return session;
  };

  const refreshSecurityState = async () => {
    const [devicesResponse, eventsResponse, passkeysResponse, summaryResponse] = await Promise.all([
      fetchTrustedDevices(),
      fetchSecurityEvents(),
      fetchPasskeys(),
      fetchSecuritySummary(),
    ]);
    setTrustedDevices(devicesResponse.devices);
    setSecurityEvents(eventsResponse.events);
    setPasskeys(passkeysResponse.passkeys);
    setSecuritySummary(summaryResponse);
  };

  const refreshNotificationsState = async (userId?: string) => {
    if (!currentUser && !userId) {
      return;
    }
    const response = await fetchNotifications();
    setDataset(prev => ({
      ...prev,
      notifications: response.notifications,
    }));
  };

  const refreshCollectionsState = async (userId?: string) => {
    if (!currentUser && !userId) {
      return;
    }
    const response = await fetchCollections();
    setDataset(prev => ({
      ...prev,
      collections: response.collections,
    }));
  };

  const refreshModerationState = async (userId?: string) => {
    if (!currentUser && !userId) {
      return;
    }
    const response = await fetchBlockedUsers();
    setBlockedUserIds(response.blockedUserIds);
  };

  const refreshSavedSearchesState = async (userId?: string) => {
    if (!currentUser && !userId) {
      return;
    }
    const response = await fetchSavedSearches();
    setSavedSearches(response.searches);
  };

  const refreshSearchAnalyticsState = async (userId?: string) => {
    if (!currentUser && !userId) {
      return;
    }
    const response = await fetchSearchAnalytics();
    setPopularSearches(response.popularSearches);
  };

  const refreshModerationReportsState = async (adminUser?: User | null) => {
    const actor = adminUser ?? currentUser;
    if (!actor?.isAdmin) {
      setModerationReports([]);
      setModerators([]);
      setModerationActions({});
      setProductAnnouncements([]);
      return;
    }
    const response = await fetchModerationReports('all');
    setModerationReports(response.reports);
    setModerators(response.moderators);
    const announcementsResponse = await fetchProductAnnouncements();
    setProductAnnouncements(announcementsResponse.announcements);
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const requestRecentAuth = (title: string, description: string) => new Promise<void>((resolve, reject) => {
    reauthResolverRef.current = { resolve, reject };
    setReauthPrompt({ title, description });
  });

  const handleReauthSubmit = async (payload: RecentAuthPayload) => {
    if (payload.method === 'passkey') {
      await reauthenticateWithPasskey();
    } else if (payload.method === '2fa') {
      await reauthenticate({ twoFactorCode: payload.twoFactorCode });
    } else if (payload.method === 'password') {
      await reauthenticate({ currentPassword: payload.currentPassword });
    }
    reauthResolverRef.current?.resolve();
    reauthResolverRef.current = null;
    setReauthPrompt(null);
  };

  const handleReauthCancel = () => {
    reauthResolverRef.current?.reject(new Error('Re-authentication canceled'));
    reauthResolverRef.current = null;
    setReauthPrompt(null);
  };

  const navigateTo = (screen: Screen) => {
    setNavigationHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);
  };

  const openNotificationsScreen = (tab: 'all' | 'research' | 'network' | 'system' = 'all') => {
    setNotificationsTab(tab);
    navigateTo('notifications');
  };

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const prevScreen = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentScreen(prevScreen);
    } else {
      // Default fallback if history is empty
      setCurrentScreen('home');
    }
  };

  const openChatConversation = (chat: Chat, entryContext: ChatEntryContext | null = null) => {
    setSelectedChat(chat);
    setActiveChatEntryContext(entryContext);
    if (currentScreen !== 'chat-detail' || selectedChat?.id !== chat.id) {
      navigateTo('chat-detail');
    }
  };

  const openActionUrl = (actionUrl?: string | null) => {
    const normalizedActionUrl = actionUrl?.trim();
    if (!normalizedActionUrl) {
      return false;
    }

    if (normalizedActionUrl.startsWith('/chat/')) {
      const chatId = normalizedActionUrl.replace('/chat/', '');
      const chat = dataset.chats.find((item) => item.id === chatId);
      if (chat) {
        openChatConversation(chat);
        return true;
      }
    }

    if (normalizedActionUrl.startsWith('/share/')) {
      const preprintId = normalizedActionUrl.replace('/share/', '');
      const preprint = dataset.preprints.find((item) => item.id === preprintId);
      if (preprint) {
        setSelectedPreprint(preprint);
        navigateTo('reader');
        return true;
      }
    }

    if (normalizedActionUrl.startsWith('/profile/')) {
      const userId = normalizedActionUrl.replace('/profile/', '');
      if (currentUser?.id === userId) {
        navigateTo('profile');
        return true;
      }
      const user = dataset.users.find((item) => item.id === userId);
      if (user) {
        setSelectedUser(user);
        navigateTo('user-profile');
        return true;
      }
    }

    if (normalizedActionUrl.startsWith('/moderation/')) {
      setPendingModerationReportId(normalizedActionUrl.replace('/moderation/', ''));
      navigateTo('moderation-center');
      return true;
    }

    if (normalizedActionUrl.startsWith('/collections/')) {
      const token = normalizedActionUrl.replace('/collections/', '');
      const collection = dataset.collections.find((item) => item.shareLinkToken === token || item.id === token);
      if (collection) {
        setSelectedCollection(collection);
        navigateTo('collection-detail');
        return true;
      }
    }

    if (normalizedActionUrl.startsWith('/notifications/')) {
      const nextTab = normalizedActionUrl.replace('/notifications/', '') as 'all' | 'research' | 'network' | 'system';
      if (['all', 'research', 'network', 'system'].includes(nextTab)) {
        openNotificationsScreen(nextTab);
        return true;
      }
    }

    if (normalizedActionUrl === '/notifications') {
      openNotificationsScreen('all');
      return true;
    }

    if (normalizedActionUrl === '/home') {
      navigateTo('home');
      return true;
    }

    if (normalizedActionUrl === '/profile') {
      navigateTo('profile');
      return true;
    }

    if (normalizedActionUrl === '/daily-digest') {
      navigateTo('daily-digest');
      return true;
    }

    if (normalizedActionUrl === '/weekly-digest') {
      navigateTo('weekly-digest');
      return true;
    }

    if (normalizedActionUrl === '/notification-settings') {
      navigateTo('notification-settings');
      return true;
    }

    if (normalizedActionUrl === '/security-settings') {
      navigateTo('security-settings');
      return true;
    }

    return false;
  };

  const openNotificationDestination = async (notification: Notification) => {
    if (notification.isNew) {
      await markNotificationRead(notification.id);
      await refreshNotificationsState();
    }

    if (openActionUrl(notification.actionUrl)) {
      return;
    }

    if (notification.type === 'feed') {
      navigateTo('home');
      return;
    }
    if (notification.type === 'collab' || notification.type === 'share') {
      navigateTo('library');
      return;
    }
    if (notification.type === 'comment') {
      navigateTo('daily-digest');
      return;
    }
    if (notification.type === 'message') {
      navigateTo('chat');
      return;
    }
    if (notification.type === 'citation') {
      navigateTo('weekly-digest');
      return;
    }
    if (notification.type === 'moderation' || notification.type === 'account') {
      openNotificationsScreen('system');
      return;
    }
    if (notification.type === 'product') {
      navigateTo('notification-settings');
      return;
    }
    navigateTo('notifications');
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await refreshSession();
        await refreshSecurityState();
        await refreshCollectionsState(session.user.id);
        await refreshNotificationsState('bootstrap');
        await refreshModerationState('bootstrap');
        await refreshSavedSearchesState('bootstrap');
        await refreshSearchAnalyticsState('bootstrap');
        await refreshModerationReportsState(session.user);
        setCurrentScreen('home');
      } catch {
        // No active session.
        clearCsrfToken();
        setPasskeys([]);
        setSecuritySummary(null);
        setTrustedDevices([]);
        setSecurityEvents([]);
        setBlockedUserIds([]);
        setSavedSearches([]);
        setPopularSearches([]);
        setSearchSuggestions([]);
        setModerationReports([]);
        setProductAnnouncements([]);
      } finally {
        setIsAuthLoading(false);
      }
    };

    bootstrap();
  }, [setDataset]);

  useEffect(() => {
    const syncChatEntryContext = () => {
      setPendingProfileUserId(parseProfileEntryFromLocation());
      setPendingCollectionToken(parseCollectionEntryFromLocation());
      setPendingChatEntryContext(parseChatEntryContextFromLocation());
      setPendingNavigateAction(parseNavigateActionFromLocation());
    };

    window.addEventListener('popstate', syncChatEntryContext);
    return () => {
      window.removeEventListener('popstate', syncChatEntryContext);
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !pendingChatEntryContext) {
      return;
    }

    const chat = dataset.chats.find((item) => item.id === pendingChatEntryContext.chatId);
    if (!chat) {
      return;
    }

    openChatConversation(chat, pendingChatEntryContext);
    setPendingChatEntryContext(null);
    clearChatEntryContextFromLocation();
  }, [currentUser, dataset.chats, pendingChatEntryContext]);

  useEffect(() => {
    if (!currentUser || !pendingProfileUserId) {
      return;
    }

    if (pendingProfileUserId === currentUser.id) {
      setCurrentScreen('profile');
      setPendingProfileUserId(null);
      clearProfileEntryFromLocation();
      return;
    }

    const user = dataset.users.find((item) => item.id === pendingProfileUserId);
    if (!user) {
      return;
    }

    setSelectedUser(user);
    navigateTo('user-profile');
    setPendingProfileUserId(null);
    clearProfileEntryFromLocation();
  }, [currentUser, dataset.users, pendingProfileUserId]);

  useEffect(() => {
    if (!currentUser || !pendingCollectionToken) {
      return;
    }

    const collection = dataset.collections.find((item) => item.shareLinkToken === pendingCollectionToken || item.id === pendingCollectionToken);
    if (!collection) {
      return;
    }

    setSelectedCollection(collection);
    navigateTo('collection-detail');
    setPendingCollectionToken(null);
    clearCollectionEntryFromLocation();
  }, [currentUser, dataset.collections, pendingCollectionToken]);

  useEffect(() => {
    if (!currentUser || !pendingNavigateAction) {
      return;
    }
    if (!openActionUrl(pendingNavigateAction)) {
      return;
    }
    setPendingNavigateAction(null);
    clearNavigateActionFromLocation();
  }, [currentUser, dataset.chats, dataset.preprints, dataset.users, pendingNavigateAction]);

  useEffect(() => {
    if (!currentUser || !userSettings.pushEnabled || currentScreen === 'notifications') {
      setPushNotification(null);
      return;
    }
    const unreadNotification = dataset.notifications.find((notification) => notification.isNew && isNotificationVisible(notification, userSettings));
    if (!unreadNotification) {
      setPushNotification(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setPushNotification(unreadNotification);
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentUser, currentScreen, dataset.notifications, userSettings.pushEnabled]);

  useEffect(() => {
    if (!currentUser || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    let cancelled = false;
    const syncPushSubscription = async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();

      if (!userSettings.pushEnabled) {
        if (existingSubscription) {
          const payload = existingSubscription.toJSON();
          if (payload.endpoint && payload.keys?.p256dh && payload.keys?.auth) {
            await unsubscribeFromPushNotifications(payload as PushSubscriptionJSON).catch(() => {});
          }
          await existingSubscription.unsubscribe().catch(() => {});
        }
        return;
      }

      const publicKeyResponse = await fetchPushPublicKey();
      if (!publicKeyResponse.publicKey) {
        return;
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        return;
      }

      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKeyResponse.publicKey),
      });
      const payload = subscription.toJSON();
      if (!cancelled && payload.endpoint && payload.keys?.p256dh && payload.keys?.auth) {
        await subscribeToPushNotifications(payload as PushSubscriptionJSON);
      }
    };

    void syncPushSubscription().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, userSettings.pushEnabled]);

  useEffect(() => {
    const savedRecords = storageService.getSavedPreprints();
    const savedMap = new Map(savedRecords.map((preprint) => [preprint.id, preprint]));
    setSavedPreprints(
      dataset.preprints
        .filter((preprint) => savedMap.has(preprint.id))
        .map((preprint) => ({
          ...savedMap.get(preprint.id),
          ...preprint,
          isSaved: true,
          savedAt: savedMap.get(preprint.id)?.savedAt,
        })),
    );
  }, [dataset.preprints]);

  useEffect(() => {
    if (activeHomeFeedId && !dataset.customFeeds.some((feed) => feed.id === activeHomeFeedId && feed.isActive)) {
      setActiveHomeFeedId(null);
      storageService.setActiveFeedId(null);
      return;
    }
    storageService.setActiveFeedId(activeHomeFeedId);
  }, [activeHomeFeedId, dataset.customFeeds]);

  useEffect(() => {
    if (!isSidebarOpen) {
      document.body.style.overflow = '';
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const stream = new EventSource('/api/events', { withCredentials: true });
    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (payload.type === 'social-updated' || payload.type === 'chat-updated') {
          fetchSocialBootstrap().then(applySocialBootstrap).catch(() => {});
        }
        if (payload.type === 'security-updated') {
          refreshSecurityState().catch(() => {});
        }
        if (payload.type === 'notifications-updated') {
          refreshNotificationsState().catch(() => {});
        }
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    return () => {
      stream.close();
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentScreen === 'moderation-center' && currentUser?.isAdmin) {
      refreshModerationReportsState(currentUser).catch(() => {});
    }
  }, [currentScreen, currentUser]);

  useEffect(() => {
    if (!currentUser || currentScreen !== 'home') {
      return;
    }
    refreshSearchAnalyticsState(currentUser.id).catch(() => {});
  }, [currentUser, currentScreen]);

  useEffect(() => {
    if (!currentUser || currentScreen !== 'home' || searchQuery.trim().length < 2) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      refreshSearchAnalyticsState(currentUser.id).catch(() => {});
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [currentUser, currentScreen, searchQuery]);

  useEffect(() => {
    if (!currentUser || currentScreen !== 'home') {
      setSearchSuggestions([]);
      return;
    }
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      fetchSearchSuggestions(query)
        .then((response) => {
          if (!cancelled) {
            setSearchSuggestions(response.suggestions);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchSuggestions([]);
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [currentUser, currentScreen, searchQuery]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSave = (preprint: Preprint) => {
    const isSaved = savedPreprints.some(p => p.id === preprint.id);
    if (isSaved) {
      storageService.removePreprint(preprint.id);
      setSavedPreprints(prev => prev.filter(p => p.id !== preprint.id));
      if (currentUser) {
        const editableCollections = dataset.collections.filter((collection) => {
          const role = getCollectionAccessRole(collection, currentUser);
          return ['owner', 'editor'].includes(role) && (collection.preprintIds ?? []).includes(preprint.id);
        });
        if (editableCollections.length > 0) {
          void Promise.all(
            editableCollections.map((collection) =>
              updateCollectionPapersRequest(collection.id, (collection.preprintIds ?? []).filter((id) => id !== preprint.id)),
            ),
          )
            .then((responses) => {
              const latest = responses[responses.length - 1];
              if (latest) {
                setDataset((prev) => ({
                  ...prev,
                  collections: latest.collections,
                  metadata: {
                    ...prev.metadata,
                    lastUpdated: new Date().toISOString(),
                  },
                }));
              }
            })
            .catch(() => {});
        }
      }
    } else {
      const newPreprint = { ...preprint, isSaved: true };
      storageService.savePreprint(newPreprint);
      setSavedPreprints(prev => [...prev, newPreprint]);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    navigateTo('tag-results');
  };

  const handleUserClick = (userId: string) => {
    const user = dataset.users.find(u => u.id === userId || u.name === userId);
    if (user) {
      setSelectedUser(user);
      navigateTo('user-profile');
    } else {
      // Fallback for authors not in MOCK_USERS
      const fallbackUser: User = {
        id: userId,
        name: userId,
        title: 'Independent Researcher',
        affiliation: 'Independent Researcher',
        imageUrl: `https://i.pravatar.cc/150?u=${userId}`,
        bio: 'Academic researcher contributing to the global scientific community.',
        publications: [],
        followers: 150,
        following: 80,
        stats: {
          preprints: 5,
          citations: 240,
          followers: 150,
          hIndex: 4,
          i10Index: 2,
          totalPublications: 5
        }
      };
      setSelectedUser(fallbackUser);
      navigateTo('user-profile');
    }
  };

  const handleInstitutionClick = (institutionId: string) => {
    const inst = dataset.institutions.find(i => i.id === institutionId || i.name === institutionId);
    if (inst) {
      setSelectedInstitution(inst);
      navigateTo('institution-detail');
      return;
    }
    const fallbackInstitution: Institution = {
      id: slugifyLabel(institutionId) || institutionId,
      name: institutionId,
      location: 'Institution details are limited in the current dataset.',
      imageUrl: `https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80&sig=${encodeURIComponent(institutionId)}`,
      description: `Preprint Explorer does not yet have a full institution profile for ${institutionId}, but affiliated researchers and publications will still be surfaced when available.`,
      stats: {
        researchers: 0,
        publications: 0,
        citations: 0,
      },
    };
    setSelectedInstitution(fallbackInstitution);
    navigateTo('institution-detail');
  };

  const handleInstitutionHomepageOpen = (institutionId: string) => {
    const institution = dataset.institutions.find((item) => item.id === institutionId || item.name === institutionId);
    if (institution?.homepageUrl) {
      window.open(institution.homepageUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    showToast('A homepage URL is not available for this institution yet.', 'info');
  };

  const handleMessageClick = (user: User) => {
    const existingChat = dataset.chats.find(c => c.participants.includes(user.id));
    if (existingChat) {
      openChatConversation(existingChat);
    } else {
      createChat(user.id)
        .then(({ chat }) => {
          setDataset(prev => ({
            ...prev,
            chats: [chat, ...prev.chats.filter(existing => existing.id !== chat.id)],
          }));
          openChatConversation(chat);
        })
        .catch(error => showToast(error instanceof Error ? error.message : 'Unable to create chat', 'info'));
    }
  };

  const upsertChatAtTop = (chat: Chat) => {
    setDataset(prev => ({
      ...prev,
      chats: [chat, ...prev.chats.filter((item) => item.id !== chat.id)],
    }));
  };

  const applySocialBootstrap = (social: { users: User[]; chats: Chat[] }) => {
    setDataset(prev => ({
      ...prev,
      users: social.users,
      chats: social.chats,
    }));
  };

  const handleLogin = async (email: string, password: string) => {
    const session = await login(email, password);
    if ('requiresTwoFactor' in session) {
      return session;
    }
    applyAuthSession(session);
    await refreshSecurityState();
    await refreshCollectionsState(session.user.id);
    await refreshNotificationsState(session.user.id);
    await refreshModerationState(session.user.id);
    await refreshSavedSearchesState(session.user.id);
    await refreshModerationReportsState(session.user);
    setCurrentScreen('home');
    return null;
  };

  const handleRegister = async (name: string, email: string, affiliation: string, password: string) => {
    const session = await register(name, email, affiliation, password);
    applyAuthSession(session);
    await refreshSecurityState();
    await refreshCollectionsState(session.user.id);
    await refreshNotificationsState(session.user.id);
    await refreshModerationState(session.user.id);
    await refreshSavedSearchesState(session.user.id);
    await refreshModerationReportsState(session.user);
    setCurrentScreen('home');
  };

  const handleCompleteTwoFactorLogin = async (challengeToken: string, code: string, rememberDevice: boolean) => {
    const session = await completeTwoFactorLogin(challengeToken, code, rememberDevice);
    applyAuthSession(session);
    await refreshSecurityState();
    await refreshCollectionsState(session.user.id);
    await refreshNotificationsState(session.user.id);
    await refreshModerationState(session.user.id);
    await refreshSavedSearchesState(session.user.id);
    await refreshModerationReportsState(session.user);
    setCurrentScreen('home');
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // Continue clearing local UI state even if the server session is already gone.
    }
    clearCsrfToken();
    setCurrentUser(null);
    setPasskeys([]);
    setSecuritySummary(null);
    setTrustedDevices([]);
    setSecurityEvents([]);
    setBlockedUserIds([]);
    setSavedSearches([]);
    setSearchSuggestions([]);
    setModerationReports([]);
    setProductAnnouncements([]);
    setDataset(prev => ({ ...prev, notifications: [] }));
    setCurrentScreen('login');
    setNavigationHistory([]);
  };

  const handleRotateSession = async () => {
    const session = await rotateSession();
    setCurrentUser(session.user);
    setUserSettings(session.settings);
    applySocialBootstrap(session.social);
    await refreshSecurityState();
    await refreshNotificationsState(session.user.id);
    await refreshModerationState(session.user.id);
    await refreshSavedSearchesState(session.user.id);
    await refreshModerationReportsState(session.user);
  };

  const handleEnableTwoFactor = async (code: string) => {
    const response = await enableTwoFactor(code);
    setLatestBackupCodes(response.backupCodes);
    await refreshSession();
    await refreshSecurityState();
    return response.backupCodes;
  };

  const handleDisableTwoFactor = async (code: string) => {
    try {
      await disableTwoFactor(code);
    } catch (error) {
      if (error instanceof Error && error.message === 'Recent authentication required') {
        await requestRecentAuth(
          'Confirm Two-Factor Disable',
          'Re-authenticate to disable two-factor authentication on this account.',
        );
        await disableTwoFactor(code);
      } else {
        throw error;
      }
    }
    setLatestBackupCodes([]);
    await refreshSession();
    await refreshSecurityState();
  };

  const handleRegenerateBackupCodes = async (code: string) => {
    const response = await regenerateBackupCodes(code);
    setLatestBackupCodes(response.backupCodes);
    await refreshSecurityState();
    return response.backupCodes;
  };

  const handleLogoutOtherSessions = async () => {
    await logoutOtherSessions();
    await refreshSecurityState();
  };

  const handleRevokeTrustedDevice = async (deviceId: string) => {
    await revokeTrustedDevice(deviceId);
    await refreshSecurityState();
  };

  const handleRegisterPasskey = async (label?: string) => {
    const response = await registerPasskey(label);
    setPasskeys(response.passkeys);
    await refreshSecurityState();
    return response.passkeys;
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    try {
      await deletePasskey(passkeyId);
    } catch (error) {
      if (error instanceof Error && error.message === 'Recent authentication required') {
        await requestRecentAuth(
          'Confirm Passkey Removal',
          'Re-authenticate to remove this passkey from your account.',
        );
        await deletePasskey(passkeyId);
      } else {
        throw error;
      }
    }
    await refreshSecurityState();
  };

  const handlePasskeyLogin = async (email: string) => {
    const session = await signInWithPasskey(email);
    applyAuthSession(session);
    await refreshSecurityState();
    await refreshCollectionsState(session.user.id);
    await refreshNotificationsState(session.user.id);
    await refreshModerationState(session.user.id);
    await refreshSavedSearchesState(session.user.id);
    await refreshModerationReportsState(session.user);
    setCurrentScreen('home');
  };

  const handleBlockUser = async (userId: string) => {
    const response = await blockUser(userId);
    setBlockedUserIds(response.blockedUserIds);
    await refreshNotificationsState(currentUser?.id);
    await refreshSession().catch(() => {});
  };

  const handleUnblockUser = async (userId: string) => {
    await unblockUser(userId);
    await refreshModerationState(currentUser?.id);
  };

  const handleSubmitReport = async (reason: 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other', details: string) => {
    if (!reportPrompt) {
      return;
    }
    await reportContent({
      targetType: reportPrompt.targetType,
      targetId: reportPrompt.targetId,
      reason,
      details,
    });
    await refreshNotificationsState(currentUser?.id);
    await refreshModerationReportsState();
    setReportPrompt(null);
  };

  const handleReviewModerationReport = async (reportId: string, payload: { status: 'reviewing' | 'resolved' | 'dismissed'; resolutionNote?: string }) => {
    const response = await reviewModerationReport(reportId, payload);
    setModerationReports(prev => prev.map(report => report.id === reportId ? response.report : report));
    const detail = await fetchModerationReport(reportId);
    setModerationActions(prev => ({ ...prev, [reportId]: detail.actions }));
    await refreshNotificationsState(currentUser?.id);
  };

  const handleAssignModerationReport = async (reportId: string, assignedToUserId: string | null) => {
    const response = await assignModerationReport(reportId, assignedToUserId);
    setModerationReports(prev => prev.map(report => report.id === reportId ? response.report : report));
    const detail = await fetchModerationReport(reportId);
    setModerationActions(prev => ({ ...prev, [reportId]: detail.actions }));
  };

  const handleEscalateModerationReport = async (reportId: string, escalationReason: string) => {
    const response = await escalateModerationReport(reportId, escalationReason);
    setModerationReports(prev => prev.map(report => report.id === reportId ? response.report : report));
    const detail = await fetchModerationReport(reportId);
    setModerationActions(prev => ({ ...prev, [reportId]: detail.actions }));
  };

  const handleBulkModerationAction = async (payload: {
    reportIds: string[];
    action: 'assign' | 'review' | 'escalate';
    assignedToUserId?: string | null;
    status?: 'reviewing' | 'resolved' | 'dismissed';
    resolutionNote?: string;
    escalationReason?: string;
  }) => {
    const response = await bulkModerationAction(payload);
    setModerationReports(prev => {
      const mapped = new Map(prev.map(report => [report.id, report]));
      response.reports.forEach((report) => mapped.set(report.id, report));
      return Array.from(mapped.values());
    });
    await refreshModerationReportsState();
  };

  const handleOpenModerationReport = async (reportId: string) => {
    const detail = await fetchModerationReport(reportId);
    setModerationActions(prev => ({ ...prev, [reportId]: detail.actions }));
    return detail;
  };

  const handlePublishProductAnnouncement = async (payload: {
    title: string;
    message: string;
    actionUrl?: string;
  }) => {
    const response = await publishProductAnnouncement(payload);
    setProductAnnouncements((prev) => [response.announcement, ...prev.filter((item) => item.id !== response.announcement.id)]);
    await refreshNotificationsState(currentUser?.id);
    return response.announcement;
  };

  const handleSaveCurrentSearch = async (label: string, filters: SavedSearch['filters']) => {
    const response = await saveSearch({
      label,
      queryText: searchQuery.trim(),
      filters,
    });
    setSavedSearches((prev) => [response.search, ...prev.filter((item) => item.id !== response.search.id)]);
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    await deleteSavedSearch(searchId);
    setSavedSearches((prev) => prev.filter((item) => item.id !== searchId));
  };

  const handleApplySavedSearch = (savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.queryText);
    setCurrentScreen('home');
  };

  const handleApplyPopularSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentScreen('home');
    setShowSearchSuggestions(false);
  };

  const handleToggleFollow = async (user: User) => {
    if (!currentUser) {
      return;
    }
    const social = user.isFollowing ? await unfollowUser(user.id) : await followUser(user.id);
    applySocialBootstrap(social);
    setSelectedUser(prev => (prev && prev.id === user.id ? social.users.find(item => item.id === user.id) ?? prev : prev));
  };

  const handleUpdateSetting = async (key: keyof UserSettings, value: boolean | string) => {
    const updated = await updateSettings({ [key]: value } as Partial<UserSettings>);
    setUserSettings(updated);
    return updated;
  };

  const handleProfileSave = async (payload: {
    name: string;
    email: string;
    orcidId?: string;
    affiliation: string;
    bio: string;
    title: string;
    imageUrl: string;
    isAffiliationVerified?: boolean;
    currentPassword?: string;
  }) => {
    let response;
    try {
      response = await updateProfile(payload);
    } catch (error) {
      if (error instanceof Error && error.message === 'Recent authentication required') {
        await requestRecentAuth(
          'Confirm Email Change',
          'Re-authenticate to update the email address on this account.',
        );
        response = await updateProfile(payload);
      } else {
        throw error;
      }
    }
    setCurrentUser(response.user);
    applySocialBootstrap(response.social);
  };

  const handleRate = (preprintId: string, rating: number) => {
    setDataset(prev => ({
      ...prev,
      preprints: prev.preprints.map(p =>
        p.id === preprintId ? { ...p, userRating: rating, rating } : p
      ),
      metadata: {
        ...prev.metadata,
        lastUpdated: new Date().toISOString(),
      },
    }));
    if (selectedPreprint?.id === preprintId) {
      setSelectedPreprint(prev => prev ? { ...prev, userRating: rating, rating } : null);
    }
  };

  function LegalScreen({ type, onBack, onOpenMenu }: { type: 'tos' | 'privacy', onBack: () => void, onOpenMenu: () => void }) {
    const content = type === 'tos' ? {
      title: 'Terms of Service',
      sections: [
        {
          title: '1. Acceptance of Terms',
          body: 'By accessing or using Preprint Explorer, you agree to be bound by these Terms of Service and all applicable laws and regulations.'
        },
        {
          title: '2. User Accounts',
          body: 'You are responsible for maintaining the confidentiality of your account and password. You must provide accurate and complete information when creating an account.'
        },
        {
          title: '3. Intellectual Property',
          body: 'All content on Preprint Explorer, including text, graphics, logos, and software, is the property of Preprint Explorer or its content suppliers and is protected by international copyright laws.'
        },
        {
          title: '4. Prohibited Conduct',
          body: 'You agree not to use Preprint Explorer for any unlawful purpose or in any way that could damage, disable, or impair the service.'
        }
      ]
    } : {
      title: 'Privacy Policy',
      sections: [
        {
          title: '1. Information We Collect',
          body: 'We collect information you provide directly to us, such as when you create an account, update your profile, or use our services.'
        },
        {
          title: '2. How We Use Your Information',
          body: 'We use the information we collect to provide, maintain, and improve our services, and to communicate with you.'
        },
        {
          title: '3. Data Sharing',
          body: 'We do not share your personal information with third parties except as described in this Privacy Policy or with your consent.'
        },
        {
          title: '4. Data Security',
          body: 'We take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorized access.'
        }
      ]
    };

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 bg-white dark:bg-slate-950 z-20">
          <div className="flex items-center gap-4">
            <ArrowLeft className="cursor-pointer" onClick={onBack} />
            <h2 className="text-xl font-bold">{content.title}</h2>
          </div>
          <button type="button" onClick={onOpenMenu} className="rounded-full p-2 text-primary hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-slate-500 mb-8">Last updated: {formatAbsoluteDate(new Date())}</p>
            {content.sections.map((section, i) => (
              <div key={i} className="mb-8">
                <h3 className="text-lg font-bold mb-3">{section.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    if (isAuthLoading) {
      return (
        <div className="flex h-full items-center justify-center bg-white dark:bg-slate-950">
          <div className="text-center">
            <div className="mx-auto mb-4 size-12 animate-pulse rounded-2xl bg-primary/20" />
            <p className="text-sm font-medium text-slate-500">Loading account…</p>
          </div>
        </div>
      );
    }

    if (!isLoggedIn) {
      if (currentScreen === 'register') {
        return (
          <RegisterScreen 
            onBack={() => setCurrentScreen('login')} 
            onRegister={handleRegister} 
            onLegal={(type) => { setLegalType(type); navigateTo('legal'); }}
            showToast={showToast} 
          />
        );
      }
      if (currentScreen === 'legal') {
        return <LegalScreen type={legalType} onBack={goBack} onOpenMenu={() => {}} />;
      }
      return <LoginScreen onLogin={handleLogin} onPasskeyLogin={handlePasskeyLogin} onCompleteTwoFactorLogin={handleCompleteTwoFactorLogin} onRegister={() => setCurrentScreen('register')} showToast={showToast} />;
    }

    switch (currentScreen) {
      case 'home': return (
        <HomeScreen 
          onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }} 
          savedPreprints={savedPreprints} 
          onToggleSave={toggleSave}
          searchQuery={searchQuery}
          activeFeedId={activeHomeFeedId}
          onTagClick={handleTagClick}
          preprints={dataset.preprints}
          customFeeds={dataset.customFeeds}
          popularSearches={popularSearches}
          savedSearches={savedSearches}
          onSelectFeed={(feedId) => setActiveHomeFeedId(feedId)}
          onApplyPopularSearch={handleApplyPopularSearch}
          onSaveSearch={handleSaveCurrentSearch}
          onDeleteSavedSearch={handleDeleteSavedSearch}
          onApplySavedSearch={handleApplySavedSearch}
          showToast={showToast}
        />
      );
      case 'library': return (
        <LibraryScreen 
          currentUser={currentUser!}
          onCollectionClick={(c) => { setSelectedCollection(c); navigateTo('collection-detail'); }} 
          savedPreprints={savedPreprints} 
          onToggleSave={toggleSave} 
          onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }}
          onTagClick={handleTagClick}
          onAuthorClick={handleUserClick}
          showToast={showToast}
        />
      );
      case 'collection-detail': return (
        <CollectionDetailScreen 
          currentUser={currentUser!}
          collection={selectedCollection || dataset.collections[0]} 
          onBack={goBack} 
          onOpenMenu={() => setIsSidebarOpen(true)}
          onShareCollection={() => navigateTo('share')}
          savedPreprints={savedPreprints} 
          onToggleSave={toggleSave} 
          onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }}
          onTagClick={handleTagClick}
          onAuthorClick={handleUserClick}
          showToast={showToast}
        />
      );
      case 'reader': return (
        <ReaderScreen 
          preprint={selectedPreprint || dataset.preprints[0]} 
          currentUser={currentUser!}
          onBack={goBack}
          onToggleSave={toggleSave} 
          isSaved={savedPreprints.some(p => p.id === (selectedPreprint?.id || dataset.preprints[0].id))}
          onRate={(rating) => handleRate(selectedPreprint?.id || dataset.preprints[0].id, rating)}
          onTagClick={handleTagClick}
          onAuthorClick={handleUserClick}
          showToast={showToast}
          onCite={() => setIsCitationModalOpen(true)}
          onReport={() => setReportPrompt({
            targetType: 'preprint',
            targetId: (selectedPreprint || dataset.preprints[0]).id,
            targetLabel: (selectedPreprint || dataset.preprints[0]).title,
          })}
          showOutline={showOutline}
          setShowOutline={setShowOutline}
        />
      );
      case 'profile': return <ProfileScreen currentUser={currentUser!} onEdit={() => navigateTo('edit-profile')} onSettings={() => navigateTo('notification-settings')} onSignOut={handleSignOut} onInstitutionClick={handleInstitutionClick} onInstitutionHomepageOpen={handleInstitutionHomepageOpen} onUserClick={handleUserClick} onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }} onRefreshSession={refreshSession} preprints={dataset.preprints} showToast={showToast} />;
      case 'edit-profile': return <EditProfileScreen currentUser={currentUser!} onBack={goBack} onSaveProfile={handleProfileSave} showToast={showToast} />;
      case 'notification-settings': return <SettingsScreen initialTab="notifications" settings={userSettings} currentUser={currentUser!} securitySummary={securitySummary} trustedDevicesCount={trustedDevices.length} securityAlertsCount={securityEvents.filter((event) => event.alert).length} canModerate={Boolean(currentUser?.isAdmin)} onUpdateSetting={handleUpdateSetting} onBack={goBack} onOpenMenu={() => setIsSidebarOpen(true)} onNavigate={(s: Screen) => navigateTo(s)} onLegal={(type) => { setLegalType(type); navigateTo('legal'); }} showToast={showToast} onSignOut={handleSignOut} />;
      case 'security-settings': return <SettingsScreen initialTab="security" settings={userSettings} currentUser={currentUser!} securitySummary={securitySummary} trustedDevicesCount={trustedDevices.length} securityAlertsCount={securityEvents.filter((event) => event.alert).length} canModerate={Boolean(currentUser?.isAdmin)} onUpdateSetting={handleUpdateSetting} onBack={goBack} onOpenMenu={() => setIsSidebarOpen(true)} onNavigate={(s: Screen) => navigateTo(s)} onLegal={(type) => { setLegalType(type); navigateTo('legal'); }} showToast={showToast} onSignOut={handleSignOut} />;
      case 'change-password': return <ChangePasswordScreen currentUser={currentUser!} onBack={goBack} showToast={showToast} />;
      case '2fa-setup': return <TwoFactorAuthScreen currentUser={currentUser!} securitySummary={securitySummary} onBack={goBack} onNext={() => navigateTo('2fa-backup')} onEnable={handleEnableTwoFactor} onDisable={handleDisableTwoFactor} onRegenerate={handleRegenerateBackupCodes} onOpenBackupCodes={() => navigateTo('2fa-backup')} onOpenHelp={() => navigateTo('help')} showToast={showToast} />;
      case '2fa-backup': return <TwoFactorBackupCodesScreen backupCodes={latestBackupCodes} onBack={goBack} onRegenerate={handleRegenerateBackupCodes} onDone={() => navigateTo('security-settings')} showToast={showToast} />;
      case 'security-log': return <SecurityLogScreen logs={securityEvents} onBack={goBack} onRotateSession={handleRotateSession} onLogoutOthers={handleLogoutOtherSessions} showToast={showToast} />;
      case 'passkeys': return <PasskeysScreen currentUser={currentUser!} passkeys={passkeys} securitySummary={securitySummary} onBack={goBack} onOpenTrustedDevices={() => navigateTo('trusted-devices')} onRegisterPasskey={handleRegisterPasskey} onDeletePasskey={handleDeletePasskey} showToast={showToast} />;
      case 'notifications': return <NotificationsScreen settings={userSettings} activeTab={notificationsTab} onChangeTab={setNotificationsTab} onOpenNotification={openNotificationDestination} onBack={goBack} showToast={showToast} onRefreshNotifications={refreshNotificationsState} />;
      case 'trends': return (
        <TrendsScreen 
          onTopicClick={() => navigateTo('topic-insight')} 
          onAuthorClick={handleUserClick}
          onTagClick={handleTagClick}
          onInstitutionClick={handleInstitutionClick}
          onInstitutionHomepageOpen={handleInstitutionHomepageOpen}
          onSearch={(query) => { setSearchQuery(query); navigateTo('home'); }}
          showToast={showToast} 
        />
      );
      case 'daily-digest': return <DailyDigestScreen onBack={goBack} onOpenSettings={() => navigateTo('notification-settings')} onOpenHelp={() => navigateTo('help')} onOpenNotifications={() => openNotificationsScreen('all')} onUnsubscribe={async () => { await handleUpdateSetting('dailyDigest', false); }} isSubscribed={userSettings.dailyDigest} emailEnabled={userSettings.emailEnabled} showToast={showToast} />;
      case 'weekly-digest': return <WeeklyDigestScreen onBack={goBack} onOpenLibrary={() => navigateTo('library')} onOpenProfile={() => navigateTo('profile')} onOpenHome={() => navigateTo('home')} onOpenSettings={() => navigateTo('notification-settings')} onUnsubscribe={async () => { await handleUpdateSetting('weeklyDigest', false); }} isSubscribed={userSettings.weeklyDigest} emailEnabled={userSettings.emailEnabled} showToast={showToast} />;
      case 'topic-insight': return (
        <TopicInsightScreen 
          onBack={goBack} 
          onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }}
          onTagClick={handleTagClick}
          onAuthorClick={handleUserClick}
          showToast={showToast}
        />
      );
      case 'user-profile': return (
        <UserProfileScreen 
          user={selectedUser!} 
          currentUserId={currentUser!.id}
          onBack={goBack} 
          onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }} 
          onToggleSave={toggleSave}
          onToggleFollow={handleToggleFollow}
          onTagClick={handleTagClick}
          onAuthorClick={handleUserClick}
          onInstitutionClick={handleInstitutionClick}
          onInstitutionHomepageOpen={handleInstitutionHomepageOpen}
          onMessage={handleMessageClick}
          onReport={() => setReportPrompt({
            targetType: 'user',
            targetId: selectedUser!.id,
            targetLabel: selectedUser!.name,
          })}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          isBlocked={blockedUserIds.includes(selectedUser!.id)}
          savedPreprints={savedPreprints}
          showToast={showToast}
        />
      );
      case 'tag-results': return (
        <TagResultsScreen 
          tag={selectedTag!} 
          onBack={goBack} 
          preprints={dataset.preprints} 
          onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }}
          onToggleSave={toggleSave}
          savedPreprints={savedPreprints}
          onTagClick={handleTagClick}
          onAuthorClick={handleUserClick}
          showToast={showToast}
        />
      );
      case 'institution-detail': return (
        <InstitutionDetailScreen 
          institution={selectedInstitution!} 
          onBack={goBack} 
          onUserClick={handleUserClick}
          onOpenHomepage={handleInstitutionHomepageOpen}
          showToast={showToast}
        />
      );
      case 'share': return <ShareScreen collection={selectedCollection || dataset.collections[0]} currentUser={currentUser!} onBack={goBack} onOpenMenu={() => setIsSidebarOpen(true)} showToast={showToast} />;
      case 'legal': return <LegalScreen type={legalType} onBack={goBack} onOpenMenu={() => setIsSidebarOpen(true)} />;
      case 'feeds': return <CustomFeedsScreen onBack={goBack} onOpenFeed={(feedId) => { setActiveHomeFeedId(feedId); navigateTo('home'); }} showToast={showToast} />;
      case 'encryption-keys': return <EncryptionKeysScreen onBack={goBack} showToast={showToast} />;
      case 'trusted-devices': return <TrustedDevicesScreen devices={trustedDevices} onBack={goBack} onRemoveDevice={handleRevokeTrustedDevice} showToast={showToast} />;
      case 'moderation-center': return <ModerationCenterScreen reports={moderationReports} moderators={moderators} reportActions={moderationActions} productAnnouncements={productAnnouncements} initialReportId={pendingModerationReportId} onConsumeInitialReport={() => setPendingModerationReportId(null)} onBack={goBack} onOpenReport={handleOpenModerationReport} onAssignReport={handleAssignModerationReport} onEscalateReport={handleEscalateModerationReport} onBulkAction={handleBulkModerationAction} onReviewReport={handleReviewModerationReport} onPublishProductAnnouncement={handlePublishProductAnnouncement} showToast={showToast} />;
      case 'help': return <HelpScreen onBack={goBack} onOpenMenu={() => setIsSidebarOpen(true)} onOpenContact={() => navigateTo('contact')} onOpenMessages={() => navigateTo('chat')} onOpenLibrary={() => navigateTo('library')} onOpenFeeds={() => navigateTo('feeds')} onOpenSettings={() => navigateTo('notification-settings')} onOpenHome={() => navigateTo('home')} />;
      case 'contact': return <ContactScreen currentUser={currentUser} onBack={goBack} onOpenMenu={() => setIsSidebarOpen(true)} showToast={showToast} />;
      case 'chat': return <ChatScreen currentUserId={currentUser!.id} onChatClick={(chat) => openChatConversation(chat)} onStartChat={handleMessageClick} onBack={goBack} showToast={showToast} />;
      case 'chat-detail': return <ChatDetailScreen currentUserId={currentUser!.id} chat={selectedChat!} launchContext={activeChatEntryContext?.chatId === selectedChat!.id ? activeChatEntryContext : null} onDismissLaunchContext={() => setActiveChatEntryContext(null)} onBack={goBack} onOpenUserProfile={handleUserClick} showToast={showToast} onChatUpdated={(chat) => { setSelectedChat(chat); upsertChatAtTop(chat); }} onReport={() => setReportPrompt({ targetType: 'chat', targetId: selectedChat!.id, targetLabel: 'conversation' })} onBlockUser={handleBlockUser} onUnblockUser={handleUnblockUser} isBlocked={selectedChat!.participants.some(participantId => participantId !== currentUser!.id && blockedUserIds.includes(participantId))} />;
      default: return <HomeScreen onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }} savedPreprints={savedPreprints} onToggleSave={toggleSave} searchQuery={searchQuery} activeFeedId={activeHomeFeedId} onTagClick={handleTagClick} preprints={dataset.preprints} customFeeds={dataset.customFeeds} popularSearches={popularSearches} savedSearches={savedSearches} onSelectFeed={(feedId) => setActiveHomeFeedId(feedId)} onApplyPopularSearch={handleApplyPopularSearch} onSaveSearch={handleSaveCurrentSearch} onDeleteSavedSearch={handleDeleteSavedSearch} onApplySavedSearch={handleApplySavedSearch} showToast={showToast} />;
    }
  };

  const shellHeaderScreens: Screen[] = ['home', 'library', 'notifications', 'trends', 'profile', 'feeds'];
  const screensWithOwnMenuButton: Screen[] = ['collection-detail', 'share', 'notification-settings', 'security-settings', 'legal', 'help', 'contact'];
  const authenticatedScreensWithoutBottomNav = new Set<Screen>(['reader']);
  const showShellHeader = shellHeaderScreens.includes(currentScreen);
  const showBottomNav = Boolean(currentUser) && !authenticatedScreensWithoutBottomNav.has(currentScreen);
  const showFloatingMenuButton = Boolean(currentUser)
    && !showShellHeader
    && currentScreen !== 'reader'
    && !screensWithOwnMenuButton.includes(currentScreen)
    && !isSidebarOpen;

  const isHomeNavActive = currentScreen === 'home' || currentScreen === 'tag-results';
  const isAlertsNavActive = currentScreen === 'notifications' || currentScreen === 'daily-digest' || currentScreen === 'weekly-digest';
  const isTrendsNavActive = currentScreen === 'trends' || currentScreen === 'topic-insight' || currentScreen === 'institution-detail';
  const isChatNavActive = currentScreen === 'chat' || currentScreen === 'chat-detail';
  const isLibraryNavActive = currentScreen === 'library' || currentScreen === 'collections' || currentScreen === 'collection-detail' || currentScreen === 'share';
  const isProfileNavActive = [
    'profile',
    'edit-profile',
    'notification-settings',
    'security-settings',
    'change-password',
    '2fa-setup',
    '2fa-backup',
    'security-log',
    'passkeys',
    'encryption-keys',
    'trusted-devices',
    'user-profile',
    'help',
    'contact',
    'legal',
    'moderation-center',
  ].includes(currentScreen);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="max-w-2xl mx-auto bg-white dark:bg-background-dark min-h-screen shadow-xl relative flex flex-col overflow-hidden">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center gap-2 shrink-0">
            <WifiOff className="size-3" />
            OFFLINE MODE — ACCESSING SAVED PREPRINTS ONLY
          </div>
        )}

        {/* Push Notification Simulation */}
        <AnimatePresence>
          {pushNotification && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-4 left-4 right-4 z-[100]"
              onClick={() => {
                const notification = pushNotification;
                setPushNotification(null);
                void openNotificationDestination(notification);
              }}
            >
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/20 flex items-start gap-3">
                <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                  <BookOpen className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preprint Explorer</span>
                    <span className="text-[10px] text-slate-400">now</span>
                  </div>
                  <h4 className="text-sm font-bold truncate">{pushNotification.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{pushNotification.description}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-24 left-4 right-4 z-[100] flex justify-center"
            >
              <div className={`px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-800 text-white border-slate-700'}`}>
                {toast.type === 'success' ? <ShieldCheck className="size-5" /> : <Bell className="size-5" />}
                <span className="text-sm font-bold">{toast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Citation Modal */}
        <AnimatePresence>
          {isCitationModalOpen && selectedPreprint && (
            <CitationModal 
              preprint={selectedPreprint} 
              onClose={() => setIsCitationModalOpen(false)} 
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reportPrompt && (
            <ReportModal
              targetLabel={reportPrompt.targetLabel}
              onCancel={() => setReportPrompt(null)}
              onSubmit={handleSubmitReport}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reauthPrompt && currentUser && (
            <RecentAuthModal
              title={reauthPrompt.title}
              description={reauthPrompt.description}
              allowPasskey={passkeys.length > 0}
              allowTwoFactor={Boolean(currentUser.hasTwoFactorEnabled)}
              onCancel={handleReauthCancel}
              onConfirm={handleReauthSubmit}
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && selectedPreprint && (
            <ShareModal 
              preprint={selectedPreprint} 
              onClose={() => setShowShareModal(false)} 
              onShare={async (preprintId, recipientIds) => {
                await sharePreprint(preprintId, recipientIds);
              }}
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[140]"
              />
              <Sidebar 
                currentUser={currentUser!}
                currentScreen={currentScreen}
                legalType={legalType}
                unreadNotificationsCount={unreadNotificationsCount}
                unreadMessagesCount={unreadMessagesCount}
                openModerationCount={openModerationCount}
                onSignOut={handleSignOut}
                onClose={() => setIsSidebarOpen(false)} 
                onOpenNotifications={() => { setIsSidebarOpen(false); openNotificationsScreen('all'); }}
                onNavigate={(s) => { setIsSidebarOpen(false); navigateTo(s); }}
                onLegal={(type) => { setIsSidebarOpen(false); setLegalType(type); navigateTo('legal'); }}
              />
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFloatingMenuButton && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={() => setIsSidebarOpen(true)}
              className="absolute right-4 top-4 z-[130] rounded-full border border-slate-200 bg-white/95 p-3 text-primary shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Header */}
        {showShellHeader ? (
          <header className="shrink-0 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <Menu className="text-primary cursor-pointer" onClick={() => setIsSidebarOpen(true)} />
              <h1 className="text-lg font-bold tracking-tight">Preprint Explorer</h1>
              <div className="flex items-center gap-2">
                <UserCircle className="cursor-pointer" onClick={() => setCurrentScreen('profile')} />
              </div>
            </div>
            {currentScreen === 'home' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                <input 
                  type="text" 
                  placeholder="Search titles, authors, or DOIs"
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={searchQuery}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowSearchSuggestions(false), 120)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {showSearchSuggestions && (searchSuggestions.length > 0 || popularSearches.length > 0) && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    {(searchQuery.trim().length >= 2
                      ? searchSuggestions
                      : popularSearches.map((item) => ({ label: item.query, type: 'query' as const }))
                    ).map((suggestion) => (
                      <button
                        key={`${suggestion.type}:${suggestion.label}`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleApplyPopularSearch(suggestion.label);
                          setShowSearchSuggestions(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="text-sm text-slate-700 dark:text-slate-200">{suggestion.label}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{suggestion.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </header>
        ) : currentScreen === 'reader' && selectedPreprint ? (
          <header className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <ArrowLeft className="cursor-pointer" onClick={goBack} />
              <h1 className="text-sm font-semibold truncate">{selectedPreprint.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowOutline(true)} className="text-slate-500 transition-colors hover:text-primary" aria-label="Open outline">
                <Search className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleSave(selectedPreprint);
                  showToast(savedPreprints.some((paper) => paper.id === selectedPreprint.id) ? 'Removed from library' : 'Saved to library for offline reading');
                }}
                className="text-slate-500 transition-colors hover:text-primary"
                aria-label="Toggle save"
              >
                <Bookmark className={`size-5 ${savedPreprints.some((paper) => paper.id === selectedPreprint.id) ? 'fill-current text-primary' : ''}`} />
              </button>
            </div>
          </header>
        ) : null}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Nav */}
        {showBottomNav ? (
          <nav className="shrink-0 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 flex items-center justify-around p-3 pb-6 relative">
            <NavItem icon={<Home />} label="Home" active={isHomeNavActive} onClick={() => setCurrentScreen('home')} />
            <NavItem icon={<Bell />} label="Alerts" active={isAlertsNavActive} onClick={() => { setNotificationsTab('all'); setCurrentScreen('notifications'); }} />
            <NavItem icon={<TrendingUp />} label="Trends" active={isTrendsNavActive} onClick={() => setCurrentScreen('trends')} />
            <NavItem icon={<MessageSquare />} label="Chat" active={isChatNavActive} onClick={() => setCurrentScreen('chat')} />
            <NavItem icon={<LibraryIcon />} label="Library" active={isLibraryNavActive} onClick={() => setCurrentScreen('library')} />
            <NavItem icon={<UserCircle />} label="Profile" active={isProfileNavActive} onClick={() => setCurrentScreen('profile')} />
          </nav>
        ) : currentScreen === 'reader' ? (
          <nav className="shrink-0 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 pb-6">
            <NavItem icon={<BookOpen />} label="Read" active={true} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
            <NavItem icon={<Menu />} label="Outline" active={false} onClick={() => setShowOutline(true)} />
            <NavItem icon={<Share2 />} label="Share" active={false} onClick={() => setShowShareModal(true)} />
            <NavItem icon={<Download />} label="PDF" active={false} onClick={() => selectedPreprint && openPreprintAsset(selectedPreprint, showToast)} />
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${active ? 'text-primary' : 'text-slate-400'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 24, fill: active ? 'currentColor' : 'none' })}
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );
}

const SOURCE_CATEGORIES: Record<string, string[]> = {
  'arXiv': [
    'Quantum Physics', 
    'General Relativity and Quantum Cosmology', 
    'Machine Learning', 
    'High Energy Physics - Theory', 
    'High Energy Physics - Experiment',
    'Astrophysics',
    'Condensed Matter',
    'Mathematics',
    'Computer Science',
    'Quantitative Biology',
    'Quantitative Finance',
    'Statistics',
    'Electrical Engineering',
    'Economics'
  ],
  'bioRxiv': [
    'Animal Behavior', 
    'Biochemistry', 
    'Bioengineering', 
    'Bioinformatics', 
    'Cancer Biology', 
    'Cell Biology', 
    'Clinical Trials',
    'Developmental Biology',
    'Ecology',
    'Evolutionary Biology',
    'Genetics', 
    'Genomics',
    'Immunology',
    'Microbiology', 
    'Molecular Biology',
    'Neuroscience',
    'Paleontology',
    'Pathology',
    'Pharmacology',
    'Physiology',
    'Plant Biology',
    'Scientific Communication',
    'Synthetic Biology',
    'Systems Biology',
    'Zoology'
  ],
  'medRxiv': [
    'Addiction Medicine',
    'Allergy and Immunology',
    'Anesthesia',
    'Cardiovascular Medicine',
    'Dentistry and Oral Medicine',
    'Dermatology',
    'Emergency Medicine',
    'Endocrinology',
    'Epidemiology', 
    'Forensic Medicine',
    'Gastroenterology',
    'Genetic and Genomic Medicine',
    'Geriatric Medicine',
    'Health Economics',
    'Health Informatics', 
    'Health Policy',
    'Hematology',
    'Infectious Diseases', 
    'Intensive Care and Critical Care Medicine',
    'Medical Education', 
    'Medical Ethics',
    'Nephrology',
    'Neurology', 
    'Nursing',
    'Nutrition',
    'Obstetrics and Gynecology',
    'Occupational and Environmental Health',
    'Oncology', 
    'Ophthalmology',
    'Orthopedics',
    'Otolaryngology',
    'Pain Medicine',
    'Palliative Medicine',
    'Pathology',
    'Pediatrics',
    'Pharmacology and Therapeutics',
    'Physical and Rehabilitation Medicine',
    'Psychiatry and Clinical Psychology',
    'Public Health',
    'Radiology and Imaging',
    'Respiratory Medicine',
    'Rheumatology',
    'Sexual and Reproductive Health',
    'Sports Medicine',
    'Surgery',
    'Toxicology',
    'Transplantation',
    'Urology'
  ],
  'ChemRxiv': [
    'Agricultural and Food Chemistry',
    'Analytical Chemistry',
    'Biological and Medicinal Chemistry',
    'Catalysis',
    'Chemical Education',
    'Chemical Engineering and Industrial Chemistry',
    'Computational and Theoretical Chemistry',
    'Energy and Environmental Chemistry',
    'Inorganic Chemistry',
    'Materials Chemistry',
    'Nanoscience',
    'Organic Chemistry',
    'Physical Chemistry',
    'Polymer Science'
  ],
  'SSRN': [
    'Accounting',
    'Anthropology',
    'Cognitive Science',
    'Corporate Governance',
    'Economics',
    'Education',
    'Finance',
    'Health Economics',
    'Information Systems',
    'Innovation',
    'Law',
    'Management',
    'Marketing',
    'Philosophy',
    'Political Science',
    'Psychology',
    'Public Policy',
    'Sociology',
    'Sustainability'
  ],
  'Research Square': [
    'Life Sciences',
    'Medicine',
    'Physical Sciences',
    'Social Sciences',
    'Engineering',
    'Humanities'
  ],
  'PhilPapers': [
    'Epistemology', 
    'Ethics', 
    'Metaphysics', 
    'Philosophy of Mind', 
    'Philosophy of Science',
    'Philosophy of Language',
    'Philosophy of Religion',
    'Aesthetics',
    'Social and Political Philosophy',
    'History of Western Philosophy',
    'Philosophical Traditions'
  ],
  'OA Journals': [
    'Multidisciplinary',
    'Life Sciences',
    'Physical Sciences',
    'Health Sciences',
    'Social Sciences',
    'Humanities'
  ],
  'OA Articles': [
    'Multidisciplinary',
    'Life Sciences',
    'Physical Sciences',
    'Health Sciences',
    'Social Sciences',
    'Humanities'
  ]
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text: string, query: string) {
  const tokens = Array.from(new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))).sort((left, right) => right.length - left.length);
  if (!text || tokens.length === 0) {
    return text;
  }
  const matcher = new RegExp(`(${tokens.map((token) => escapeRegExp(token)).join('|')})`, 'ig');
  return text.split(matcher).map((segment, index) => (
    tokens.includes(segment.toLowerCase())
      ? <mark key={`${segment}-${index}`} className="rounded bg-amber-200/80 px-0.5 text-slate-900 dark:bg-amber-400/70">{segment}</mark>
      : <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>
  ));
}

function renderChatMessageContent(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline underline-offset-2"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function matchesPreprintSearchQuery(preprint: Preprint, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return (
    preprint.title.toLowerCase().includes(normalized)
    || preprint.authors.some((author) => author.toLowerCase().includes(normalized))
    || preprint.tags.some((tag) => tag.toLowerCase().includes(normalized))
    || (preprint.abstract ?? '').toLowerCase().includes(normalized)
    || (preprint.doi ?? '').toLowerCase().includes(normalized)
  );
}

function matchesPreprintKeywords(preprint: Preprint, keywords: string[]) {
  if (keywords.length === 0) {
    return true;
  }
  return keywords.some((keyword) => matchesPreprintSearchQuery(preprint, keyword));
}

function getFeedFrequencyWindowDays(frequency: CustomFeed['frequency']) {
  if (frequency === 'Real-time') {
    return 1;
  }
  if (frequency === 'Daily') {
    return 7;
  }
  return 30;
}

function getFeedFrequencyWindowLabel(frequency: CustomFeed['frequency']) {
  if (frequency === 'Real-time') {
    return 'Last 24 hours';
  }
  if (frequency === 'Daily') {
    return 'Last 7 days';
  }
  return 'Last 30 days';
}

function isNotificationVisible(notification: Notification, settings: UserSettings) {
  if (notification.type === 'feed') {
    return settings.newPublications;
  }
  if (notification.type === 'citation') {
    return settings.citationAlerts;
  }
  if (notification.type === 'product') {
    return settings.productUpdates;
  }
  return true;
}

function getNotificationCategory(notification: Notification): 'research' | 'network' | 'system' {
  if (notification.type === 'feed' || notification.type === 'citation') {
    return 'research';
  }
  if (notification.type === 'product' || notification.type === 'moderation' || notification.type === 'account') {
    return 'system';
  }
  if (notification.type === 'message') {
    return 'network';
  }
  return 'network';
}

function getNotificationLabel(notification: Notification) {
  if (notification.type === 'feed') {
    return 'Feed Alert';
  }
  if (notification.type === 'citation') {
    return 'Citation Alert';
  }
  if (notification.type === 'collab') {
    return 'Research Network';
  }
  if (notification.type === 'share') {
    return 'Paper Share';
  }
  if (notification.type === 'product') {
    return 'Product Update';
  }
  if (notification.type === 'message') {
    return 'Direct Message';
  }
  if (notification.type === 'moderation') {
    return 'Moderation Update';
  }
  if (notification.type === 'account') {
    return 'Account Notice';
  }
  if (notification.actionUrl?.startsWith('/chat/')) {
    return 'Direct Message';
  }
  if (notification.title.toLowerCase().includes('moderation')) {
    return 'Moderation Update';
  }
  if (notification.title.toLowerCase().includes('blocked')) {
    return 'Account Notice';
  }
  return 'Activity';
}

function sortPreprintsByRecent(preprints: Preprint[]) {
  return [...preprints].sort((left, right) => {
    const leftTime = new Date(left.publishedAt ?? left.date).getTime();
    const rightTime = new Date(right.publishedAt ?? right.date).getTime();
    return rightTime - leftTime;
  });
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatAbsoluteDate(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }
  return date.toLocaleDateString([], options ?? { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatChatListTime(value?: string, fallback?: string) {
  if (!value) {
    return fallback ?? '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback ?? '';
  }
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();
  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatChatDayLabel(value?: string) {
  if (!value) {
    return 'Today';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Today';
  }
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return formatAbsoluteDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
}

function slugifyLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizePersonLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDerivedHIndex(citations: number[]) {
  const sorted = [...citations].sort((left, right) => right - left);
  let hIndex = 0;
  sorted.forEach((citationCount, index) => {
    if (citationCount >= index + 1) {
      hIndex = index + 1;
    }
  });
  return hIndex;
}

function formatCompactCount(value: number) {
  if (value < 1000) {
    return value.toLocaleString();
  }
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
}

function getNetworkIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized === 'orcid') {
    return <Quote />;
  }
  if (normalized === 'linkedin') {
    return <UserPlus />;
  }
  if (normalized === 'twitter') {
    return <Share2 />;
  }
  return <Compass />;
}

function buildPreprintExport(preprint: Preprint) {
  return [
    preprint.title,
    '',
    `Authors: ${preprint.authors.join(', ')}`,
    `Source: ${preprint.source}`,
    `Published: ${preprint.publishedAt ?? preprint.date}`,
    preprint.doi ? `DOI: ${preprint.doi}` : null,
    preprint.url ? `Source URL: ${preprint.url}` : null,
    '',
    'Abstract',
    preprint.abstract,
  ].filter(Boolean).join('\n');
}

function openPreprintAsset(preprint: Preprint, showToast: (message: string, type?: 'success' | 'info') => void) {
  const targetUrl = preprint.pdfUrl ?? preprint.url;
  if (targetUrl) {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    showToast(preprint.pdfUrl ? 'Opening PDF in a new tab...' : 'Opening source record in a new tab...');
    return;
  }

  const fileBase = preprint.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'preprint';
  downloadTextFile(`${fileBase}.txt`, buildPreprintExport(preprint));
  showToast('Downloaded offline text export for this paper.');
}

function findPreprintForDigestPaper(preprints: Preprint[], paper: DigestPaper) {
  return preprints.find((preprint) => preprint.title.toLowerCase() === paper.title.toLowerCase())
    ?? preprints.find((preprint) => preprint.title.toLowerCase().includes(paper.title.toLowerCase()) || paper.title.toLowerCase().includes(preprint.title.toLowerCase()));
}

function HomeScreen({ onPreprintClick, savedPreprints, onToggleSave, searchQuery, activeFeedId, onTagClick, preprints, customFeeds, popularSearches, savedSearches, onSelectFeed, onApplyPopularSearch, onSaveSearch, onDeleteSavedSearch, onApplySavedSearch, showToast }: { 
  onPreprintClick: (p: Preprint) => void, 
  savedPreprints: Preprint[], 
  onToggleSave: (p: Preprint) => void,
  searchQuery?: string,
  activeFeedId: string | null,
  onTagClick?: (tag: string) => void,
  preprints: Preprint[],
  customFeeds: CustomFeed[],
  popularSearches: PopularSearch[],
  savedSearches: SavedSearch[],
  onSelectFeed: (feedId: string | null) => void,
  onApplyPopularSearch: (query: string) => void,
  onSaveSearch: (label: string, filters: SavedSearch['filters']) => Promise<void>,
  onDeleteSavedSearch: (searchId: string) => Promise<void>,
  onApplySavedSearch: (savedSearch: SavedSearch) => void,
  showToast: (message: string, type?: 'success' | 'info') => void
}) {
  const deferredSearchQuery = useDeferredValue(searchQuery ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sources, setSources] = useState(['arXiv', 'bioRxiv', 'medRxiv', 'ChemRxiv', 'SSRN', 'Research Square', 'PhilPapers', 'OA Journals', 'OA Articles']);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<Record<string, string[]>>({});
  const [pubType, setPubType] = useState('All Types');
  const [sortBy, setSortBy] = useState('Relevance');
  const [dateRange, setDateRange] = useState('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [showCategoryMenu, setShowCategoryMenu] = useState<string | null>(null);
  const [remotePreprints, setRemotePreprints] = useState<Preprint[] | null>(null);
  const [remoteTotal, setRemoteTotal] = useState<number | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [newSavedSearchLabel, setNewSavedSearchLabel] = useState('');
  const selectedCategories: string[] = Object.values(activeCategories).flatMap((categories) => categories as string[]);
  const activeFeed = customFeeds.find((feed) => feed.id === activeFeedId && feed.isActive) ?? null;
  const activeFeedKeywords = activeFeed?.keywords ?? [];
  const feedWindowDays = activeFeed ? getFeedFrequencyWindowDays(activeFeed.frequency) : null;
  const feedWindowLabel = activeFeed ? getFeedFrequencyWindowLabel(activeFeed.frequency) : null;
  const trimmedDeferredSearchQuery = deferredSearchQuery.trim();

  const searchStartDate = (() => {
    const now = new Date();
    if (dateRange === 'Last 24 hours') {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
    if (dateRange === 'Last 7 days') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (dateRange === 'Last 30 days') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (dateRange === 'Custom Range' && customStartDate) {
      return new Date(customStartDate).toISOString();
    }
    return undefined;
  })();

  const searchEndDate = (() => {
    if (dateRange === 'Custom Range' && customEndDate) {
      return new Date(customEndDate).toISOString();
    }
    return undefined;
  })();

  const effectiveSearchStartDate = searchStartDate ?? (
    activeFeed && dateRange === 'All Time' && feedWindowDays !== null
      ? new Date(Date.now() - feedWindowDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined
  );
  const effectiveSearchEndDate = searchEndDate;
  const shouldUseRemoteSearch = Boolean(
    trimmedDeferredSearchQuery
    || activeFeed
    || activeSources.length > 0
    || selectedCategories.length > 0
    || pubType !== 'All Types'
    || sortBy !== 'Relevance'
    || dateRange !== 'All Time'
  );

  const handleToggleSource = (source: string) => {
    if (!activeSources.includes(source)) {
      setActiveSources([...activeSources, source]);
      setShowCategoryMenu(source);
    } else {
      setShowCategoryMenu(showCategoryMenu === source ? null : source);
    }
  };

  const handleRemoveSource = (source: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSources(activeSources.filter(s => s !== source));
    const newCats = { ...activeCategories };
    delete newCats[source];
    setActiveCategories(newCats);
    if (showCategoryMenu === source) setShowCategoryMenu(null);
  };

  const handleToggleCategory = (source: string, category: string) => {
    const sourceCats = activeCategories[source] || [];
    if (sourceCats.includes(category)) {
      setActiveCategories({
        ...activeCategories,
        [source]: sourceCats.filter(c => c !== category)
      });
    } else {
      setActiveCategories({
        ...activeCategories,
        [source]: [...sourceCats, category]
      });
    }
  };

  const handleAddSource = () => {
    if (newSource.trim() && !sources.includes(newSource.trim())) {
      setSources([...sources, newSource.trim()]);
      setNewSource('');
      setIsAddingSource(false);
    }
  };

  const localFilteredPreprints = preprints
    .filter(p => {
      // Source & Category Filter
      const matchesSource = activeSources.length === 0 || activeSources.includes(p.source);
      const sourceCats = activeCategories[p.source] || [];
      const matchesCategory = sourceCats.length === 0 || p.tags.some(t => sourceCats.includes(t));
      
      // Search Filter
      const matchesSearch = matchesPreprintSearchQuery(p, deferredSearchQuery);
      const matchesFeedKeywords = matchesPreprintKeywords(p, activeFeedKeywords);
      
      // Publication Type Filter
      const matchesPubType = pubType === 'All Types' || p.type === pubType;
      
      // Date Range Filter
      let matchesDate = true;
      const paperDate = new Date(p.date);
      const now = new Date();
      
      if (!searchStartDate && activeFeed && dateRange === 'All Time' && feedWindowDays !== null) {
        matchesDate = (now.getTime() - paperDate.getTime()) <= feedWindowDays * 24 * 60 * 60 * 1000;
      } else if (dateRange === 'Last 24 hours') {
        matchesDate = (now.getTime() - paperDate.getTime()) <= 24 * 60 * 60 * 1000;
      } else if (dateRange === 'Last 7 days') {
        matchesDate = (now.getTime() - paperDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      } else if (dateRange === 'Last 30 days') {
        matchesDate = (now.getTime() - paperDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      } else if (dateRange === 'Custom Range' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        matchesDate = paperDate >= start && paperDate <= end;
      }

      return matchesSource && matchesCategory && matchesSearch && matchesFeedKeywords && matchesPubType && matchesDate;
    })
    .sort((a, b) => {
      if (sortBy === 'Newest First') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'Most Cited') {
        return (b.citations || 0) - (a.citations || 0);
      } else if (sortBy === 'User Rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === 'Number of Saves') {
        return (b.savesCount || 0) - (a.savesCount || 0);
      } else if (sortBy === 'Trending Score') {
        return (b.views || 0) - (a.views || 0);
      }
      return 0;
    });

  useEffect(() => {
    if (!activeFeed) {
      return;
    }
    setActiveSources(activeFeed.sources);
    setActiveCategories(activeFeed.sourceCategories ?? {});
  }, [activeFeed]);

  useEffect(() => {
    if (!shouldUseRemoteSearch) {
      setRemotePreprints(null);
      setRemoteTotal(null);
      setSearchError(null);
      setIsSearchLoading(false);
      return;
    }

    let cancelled = false;
    const runSearch = async () => {
      try {
        setIsSearchLoading(true);
        setSearchError(null);
        const response = await searchBackendPreprints({
          query: trimmedDeferredSearchQuery,
          keywords: activeFeedKeywords,
          sources: activeSources,
          categories: selectedCategories,
          publicationType: pubType,
          sortBy,
          startDate: effectiveSearchStartDate,
          endDate: effectiveSearchEndDate,
          limit: 150,
        });
        if (cancelled) {
          return;
        }
        setRemotePreprints(response.preprints);
        setRemoteTotal(response.total);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setSearchError(error instanceof Error ? error.message : 'Search is temporarily unavailable');
        setRemotePreprints(null);
        setRemoteTotal(null);
      } finally {
        if (!cancelled) {
          setIsSearchLoading(false);
        }
      }
    };

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [
    trimmedDeferredSearchQuery,
    shouldUseRemoteSearch,
    activeFeedKeywords,
    activeSources,
    selectedCategories,
    pubType,
    sortBy,
    effectiveSearchStartDate,
    effectiveSearchEndDate,
  ]);

  const filteredPreprints = remotePreprints ?? localFilteredPreprints;
  const resultCount = remoteTotal ?? filteredPreprints.length;
  
  return (
    <div className="p-4">
      {customFeeds.length > 0 && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Central Feed</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {activeFeed ? `Active: ${activeFeed.name}` : 'All papers'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectFeed(null)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${activeFeed ? 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'bg-primary text-white'}`}
            >
              All
            </button>
            {customFeeds.filter((feed) => feed.isActive).map((feed) => (
              <button
                key={feed.id}
                onClick={() => onSelectFeed(feed.id)}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${activeFeed?.id === feed.id ? 'bg-primary text-white' : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
              >
                {feed.name}
              </button>
            ))}
          </div>
          {activeFeed && (
            <>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700">
                  Cadence: {activeFeed.frequency}
                </span>
                {feedWindowLabel && dateRange === 'All Time' && (
                  <span className="rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700">
                    Freshness: {feedWindowLabel}
                  </span>
                )}
                {activeFeed.sources.map((source) => (
                  <span key={source} className="rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700">
                    {source}
                    {(activeFeed.sourceCategories?.[source]?.length ?? 0) > 0 ? ` • ${activeFeed.sourceCategories?.[source]?.join(', ')}` : ''}
                  </span>
                ))}
              </div>
              {activeFeedKeywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                  {activeFeedKeywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-primary/10 px-2 py-1">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {popularSearches.length > 0 && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Popular Searches</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Usage-driven</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((item) => (
              <button
                key={item.query}
                onClick={() => onApplyPopularSearch(item.query)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span className="font-medium">{item.query}</span>
                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.count} searches</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Saved Searches</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{savedSearches.length} saved</span>
        </div>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newSavedSearchLabel}
            onChange={(event) => setNewSavedSearchLabel(event.target.value)}
            placeholder="Label this search"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            onClick={() => {
              const label = newSavedSearchLabel.trim() || (searchQuery?.trim() ? `Search: ${searchQuery.trim()}` : 'Current search');
              onSaveSearch(label, {
                sources: activeSources,
                categories: selectedCategories,
                publicationType: pubType,
                sortBy,
                dateRange,
                startDate: searchStartDate,
                endDate: searchEndDate,
              })
                .then(() => {
                  setNewSavedSearchLabel('');
                  showToast(`Saved search "${label}"`);
                })
                .catch((error) => showToast(error instanceof Error ? error.message : 'Unable to save search', 'info'));
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20"
          >
            Save
          </button>
        </div>
        {savedSearches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((savedSearch) => (
              <div key={savedSearch.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <button
                  onClick={() => {
                    setActiveSources(savedSearch.filters.sources ?? []);
                    const restoredCategories = (savedSearch.filters.sources ?? []).reduce<Record<string, string[]>>((acc, source) => {
                      const categories = (savedSearch.filters.categories ?? []).filter((category) => SOURCE_CATEGORIES[source]?.includes(category));
                      if (categories.length > 0) {
                        acc[source] = categories;
                      }
                      return acc;
                    }, {});
                    setActiveCategories(restoredCategories);
                    setPubType(savedSearch.filters.publicationType ?? 'All Types');
                    setSortBy(savedSearch.filters.sortBy ?? 'Relevance');
                    const restoredDateRange = savedSearch.filters.dateRange ?? (savedSearch.filters.startDate && savedSearch.filters.endDate ? 'Custom Range' : 'All Time');
                    setDateRange(restoredDateRange);
                    if (restoredDateRange === 'Custom Range') {
                      setCustomStartDate(savedSearch.filters.startDate ? savedSearch.filters.startDate.slice(0, 10) : '');
                      setCustomEndDate(savedSearch.filters.endDate ? savedSearch.filters.endDate.slice(0, 10) : '');
                    } else {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }
                    onApplySavedSearch(savedSearch);
                  }}
                  className="text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  {savedSearch.label}
                </button>
                <button
                  onClick={() => {
                    onDeleteSavedSearch(savedSearch.id)
                      .then(() => showToast(`Removed "${savedSearch.label}"`))
                      .catch((error) => showToast(error instanceof Error ? error.message : 'Unable to delete saved search', 'info'));
                  }}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 items-center">
        <button 
          onClick={() => { setActiveSources([]); setActiveCategories({}); }}
          className={`${activeSources.length === 0 ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'} px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap`}
        >
          All Sources
        </button>
        {sources.map((source) => (
          <div key={source} className="relative shrink-0">
            <button 
              onClick={() => handleToggleSource(source)}
              className={`${activeSources.includes(source) ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'} px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all`}
            >
              <span>{source}</span>
              {activeSources.includes(source) && (
                <div className="flex items-center gap-1 border-l border-white/20 pl-2">
                  <ChevronRight 
                    className={`size-4 transition-transform ${showCategoryMenu === source ? 'rotate-90' : ''}`} 
                  />
                  <X 
                    className="size-3.5 hover:bg-white/20 rounded-full" 
                    onClick={(e) => handleRemoveSource(source, e)}
                  />
                </div>
              )}
              {!activeSources.includes(source) && SOURCE_CATEGORIES[source] && (
                <ChevronRight className="size-4 text-slate-400" />
              )}
            </button>
            
            <AnimatePresence>
              {showCategoryMenu === source && SOURCE_CATEGORIES[source] && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowCategoryMenu(null)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 p-4 max-h-96 overflow-y-auto"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                        {source} Categories
                      </h4>
                      <button 
                        onClick={() => {
                          const newCats = { ...activeCategories };
                          delete newCats[source];
                          setActiveCategories(newCats);
                        }}
                        className="text-[10px] font-bold text-primary uppercase hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-1">
                      {SOURCE_CATEGORIES[source].map(cat => (
                        <button
                          key={cat}
                          onClick={() => handleToggleCategory(source, cat)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${activeCategories[source]?.includes(cat) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                        >
                          <span className="truncate pr-2">{cat}</span>
                          {activeCategories[source]?.includes(cat) ? (
                            <Check className="size-3.5 shrink-0" />
                          ) : (
                            <Plus className="size-3.5 opacity-30 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ))}
        
        {isAddingSource ? (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
            <input 
              type="text" 
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Source name..."
              className="bg-transparent text-sm outline-none w-24"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
            />
            <button onClick={handleAddSource} className="text-primary p-1">
              <PlusCircle className="size-4" />
            </button>
            <button onClick={() => setIsAddingSource(false)} className="text-slate-400 p-1">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingSource(true)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1 border border-dashed border-slate-300 dark:border-slate-700"
          >
            <PlusCircle className="size-4" />
            Add Source
          </button>
        )}
      </div>

      <div className="mb-6">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/5 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors"
        >
          <Filter className="size-3" />
          Advanced Filters
          <ChevronRight className={`size-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 pb-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Date Range</label>
                  <select 
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none"
                  >
                    <option>All Time</option>
                    <option>Last 24 hours</option>
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Custom Range</option>
                  </select>
                  {dateRange === 'Custom Range' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <input 
                        type="date" 
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-[10px] outline-none"
                      />
                      <input 
                        type="date" 
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-[10px] outline-none"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Publication Type</label>
                  <select 
                    value={pubType}
                    onChange={(e) => setPubType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none"
                  >
                    <option>All Types</option>
                    <option>Preprint</option>
                    <option>Peer-Reviewed</option>
                    <option>Conference Paper</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Sort By</label>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs outline-none"
                  >
                    <option>Relevance</option>
                    <option>Newest First</option>
                    <option>Most Cited</option>
                    <option>User Rating</option>
                    <option>Number of Saves</option>
                    <option>Trending Score</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold uppercase text-slate-500 tracking-wider">
          {deferredSearchQuery ? `Search Results for "${deferredSearchQuery}"` : 'Trending Preprints'}
        </h2>
        <div className="flex items-center gap-3">
          {isSearchLoading && <span className="text-xs text-primary">Searching…</span>}
          {deferredSearchQuery && <span className="text-xs text-slate-400">{resultCount} results</span>}
        </div>
      </div>

      {searchError && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200">
          Search fell back to local filtering: {searchError}
        </div>
      )}

      <div className="space-y-4">
        {filteredPreprints.length > 0 ? (
          filteredPreprints.map(preprint => {
            const isSaved = savedPreprints.some(sp => sp.id === preprint.id);
            return (
              <div key={preprint.id} className="space-y-2">
                <PreprintCard 
                  preprint={{ ...preprint, isSaved }} 
                  onClick={() => onPreprintClick(preprint)} 
                  onToggleSave={() => onToggleSave(preprint)}
                  onTagClick={onTagClick}
                  showToast={showToast}
                />
                {(preprint.searchSnippet || (preprint.matchedFields && preprint.matchedFields.length > 0)) && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    {preprint.matchedFields && preprint.matchedFields.length > 0 && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                        Matched: {preprint.matchedFields.join(', ')}
                      </p>
                    )}
                    {preprint.searchSnippet && <p className="text-slate-600 dark:text-slate-300">{renderHighlightedText(preprint.searchSnippet, deferredSearchQuery)}</p>}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center">
            <Search className="size-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No preprints found</h3>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InstitutionDetailScreen({ institution, onBack, onUserClick, onOpenHomepage, showToast }: { 
  institution: Institution, 
  onBack: () => void, 
  onUserClick: (userId: string) => void,
  onOpenHomepage: (institutionId: string) => void,
  showToast: (msg: string) => void 
}) {
  const { dataset } = useAppData();
  const affiliatedUsers = dataset.users.filter(u => u.institutionId === institution.id || u.affiliation === institution.name);
  const affiliatedPublications = dataset.preprints.filter((preprint) => (
    preprint.authors.some((author) => affiliatedUsers.some((user) => user.name === author))
  ));
  const derivedInstitutionStats = {
    researchers: affiliatedUsers.length || institution.stats.researchers,
    publications: affiliatedPublications.length || institution.stats.publications,
    citations: affiliatedPublications.reduce((sum, preprint) => sum + (preprint.citations || 0), 0) || institution.stats.citations,
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 sticky top-0 bg-white dark:bg-slate-950 z-20">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-lg font-bold truncate">{institution.name}</h2>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative h-48">
          <img src={institution.imageUrl} alt={institution.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
            <div className="flex items-center gap-4">
              <div className="size-16 bg-white rounded-2xl flex items-center justify-center text-primary shadow-xl">
                <Building2 className="size-10" />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">{institution.name}</h1>
                <p className="text-sm opacity-90">{institution.location}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{derivedInstitutionStats.researchers.toLocaleString()}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Researchers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{derivedInstitutionStats.publications.toLocaleString()}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Publications</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{derivedInstitutionStats.citations >= 1000000 ? `${(derivedInstitutionStats.citations / 1000000).toFixed(1)}M` : derivedInstitutionStats.citations.toLocaleString()}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Citations</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">About Institution</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {institution.description}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onOpenHomepage(institution.id)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20"
              >
                <Globe className="size-4" />
                Visit Homepage
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest">Affiliated Researchers</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{affiliatedUsers.length} Found</span>
            </div>
            <div className="space-y-4">
              {affiliatedUsers.length > 0 ? affiliatedUsers.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => onUserClick(user.id)}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary/30 transition-all group"
                >
                  <img src={user.imageUrl} alt={user.name} className="size-12 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{user.name}</h4>
                    <p className="text-[10px] text-slate-500 truncate">{user.bio}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary">{user.stats.citations.toLocaleString()}</p>
                    <p className="text-[8px] uppercase font-bold text-slate-400">Cites</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-300" />
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800">
                  No affiliated researchers have been linked to this institution yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomFeedsScreen({ onBack, onOpenFeed, showToast }: { onBack: () => void, onOpenFeed: (feedId: string) => void, showToast: (msg: string) => void }) {
  const { dataset, setDataset } = useAppData();
  const [activeFrequency, setActiveFrequency] = useState<CustomFeed['frequency']>('Daily');
  const [feedName, setFeedName] = useState('');
  const [feedKeywords, setFeedKeywords] = useState('');
  const availableSources = Array.from(new Set<string>(dataset.preprints.map(preprint => preprint.source)));
  const [selectedSources, setSelectedSources] = useState<string[]>(availableSources.slice(0, 1));
  const [selectedSourceCategories, setSelectedSourceCategories] = useState<Record<string, string[]>>({});
  const [openSourceMenu, setOpenSourceMenu] = useState<string | null>(null);
  const sources = Array.from(new Set<string>([...availableSources, 'Clinical Trials', 'Patents']));
  const activeFeedCount = dataset.customFeeds.filter((feed) => feed.isActive).length;

  const toggleSource = (source: string) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
      setSelectedSourceCategories((prev) => {
        const next = { ...prev };
        delete next[source];
        return next;
      });
      if (openSourceMenu === source) {
        setOpenSourceMenu(null);
      }
    } else {
      setSelectedSources([...selectedSources, source]);
      setOpenSourceMenu(source);
    }
  };

  const toggleFeedCategory = (source: string, category: string) => {
    const current = selectedSourceCategories[source] ?? [];
    setSelectedSourceCategories((prev) => ({
      ...prev,
      [source]: current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    }));
  };

  const handleCreateFeed = () => {
    if (!feedName.trim()) {
      showToast('Name the feed first');
      return;
    }
    if (selectedSources.length === 0) {
      showToast('Select at least one source');
      return;
    }
    const sourceCategoryEntries = Object.entries(selectedSourceCategories) as Array<[string, string[]]>;
    const sourceCategories = Object.fromEntries(
      sourceCategoryEntries.filter(([, categories]) => categories.length > 0),
    ) as Record<string, string[]>;
    const newFeed: CustomFeed = {
      id: `feed-${Date.now()}`,
      name: feedName.trim(),
      keywords: feedKeywords.split(',').map((value) => value.trim()).filter(Boolean),
      sources: selectedSources,
      sourceCategories,
      frequency: activeFrequency,
      isActive: true,
    };
    setDataset((prev) => ({
      ...prev,
      customFeeds: [newFeed, ...prev.customFeeds],
      metadata: {
        ...prev.metadata,
        lastUpdated: new Date().toISOString(),
      },
    }));
    showToast(`Feed "${newFeed.name}" created`);
    onOpenFeed(newFeed.id);
  };

  const handleToggleFeedActive = (feedId: string) => {
    let nextStatus = true;
    setDataset((prev) => {
      const customFeeds = prev.customFeeds.map((feed) => {
        if (feed.id !== feedId) {
          return feed;
        }
        nextStatus = !feed.isActive;
        return {
          ...feed,
          isActive: nextStatus,
        };
      });
      return {
        ...prev,
        customFeeds,
        metadata: {
          ...prev.metadata,
          lastUpdated: new Date().toISOString(),
        },
      };
    });
    showToast(nextStatus ? 'Feed resumed' : 'Feed paused');
  };

  const handleDeleteFeed = (feedId: string) => {
    const target = dataset.customFeeds.find((feed) => feed.id === feedId);
    if (!target) {
      return;
    }
    setDataset((prev) => ({
      ...prev,
      customFeeds: prev.customFeeds.filter((feed) => feed.id !== feedId),
      metadata: {
        ...prev.metadata,
        lastUpdated: new Date().toISOString(),
      },
    }));
    showToast(`Removed "${target.name}"`);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Active Feeds</h2>
        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">{activeFeedCount} Active</span>
      </div>

      <div className="space-y-3 mb-8">
        {dataset.customFeeds.map(feed => (
          <div key={feed.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 size-12">
              {feed.name.includes('Quantum') ? <Zap className="size-6" /> : 
               feed.name.includes('Biology') ? <BookOpen className="size-6" /> : <TrendingUp className="size-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold truncate">{feed.name}</p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${feed.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {feed.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">Updates: {feed.frequency} • {feed.sources.join(', ')}</p>
              {feed.keywords.length > 0 && (
                <p className="mt-1 text-[10px] text-slate-400 truncate">
                  Keywords: {feed.keywords.join(', ')}
                </p>
              )}
              {feed.sourceCategories && Object.keys(feed.sourceCategories).length > 0 && (
                <p className="text-[10px] text-slate-400 truncate mt-1">
                  {(Object.entries(feed.sourceCategories) as Array<[string, string[]]>).map(([source, categories]) => `${source}: ${categories.join(', ')}`).join(' • ')}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => onOpenFeed(feed.id)}
                disabled={!feed.isActive}
                className={`text-xs font-bold uppercase tracking-widest ${feed.isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
              >
                Open
              </button>
              <button
                onClick={() => handleToggleFeedActive(feed.id)}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
              >
                {feed.isActive ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={() => handleDeleteFeed(feed.id)}
                className="text-[10px] font-bold uppercase tracking-widest text-rose-500"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-primary rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-2 rounded-lg">
            <PlusCircle className="size-6" />
          </div>
          <h3 className="text-lg font-bold">Create New Feed</h3>
        </div>
        <p className="text-primary-100 text-sm mb-6 opacity-90 leading-relaxed">
          Define your research parameters to build a high-precision stream of new findings tailored to your expertise.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Keywords</label>
            <input 
              type="text" 
              placeholder="e.g. CRISPR, Solid State, Graphene"
              value={feedKeywords}
              onChange={(e) => setFeedKeywords(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-white focus:border-white py-3 px-4 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Feed Name</label>
            <input
              type="text"
              placeholder="e.g. Multi-source CRISPR Watch"
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-white focus:border-white py-3 px-4 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Data Sources</label>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <div key={source} className="relative">
                  <button 
                    onClick={() => toggleSource(source)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${selectedSources.includes(source) ? 'bg-white text-primary' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  >
                    <span>{source}</span>
                    {SOURCE_CATEGORIES[source] && <ChevronRight className={`size-3 transition-transform ${openSourceMenu === source ? 'rotate-90' : ''}`} />}
                  </button>
                  <AnimatePresence>
                    {selectedSources.includes(source) && openSourceMenu === source && SOURCE_CATEGORIES[source] && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setOpenSourceMenu(null)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-white/20 bg-slate-950/95 p-4 shadow-2xl"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">{source} Categories</h4>
                            <button
                              onClick={() => setSelectedSourceCategories((prev) => ({ ...prev, [source]: [] }))}
                              className="text-[10px] font-bold uppercase tracking-widest text-white/70"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {SOURCE_CATEGORIES[source].map((category) => (
                              <button
                                key={category}
                                onClick={() => toggleFeedCategory(source, category)}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ${selectedSourceCategories[source]?.includes(category) ? 'bg-white text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}
                              >
                                <span className="truncate pr-2">{category}</span>
                                {selectedSourceCategories[source]?.includes(category) ? <Check className="size-3.5" /> : <Plus className="size-3.5 opacity-40" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Update Frequency</label>
            <div className="grid grid-cols-3 gap-2">
              {['Real-time', 'Daily', 'Weekly'].map(freq => (
                <button 
                  key={freq}
                  onClick={() => setActiveFrequency(freq)}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition-all ${activeFrequency === freq ? 'bg-white text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleCreateFeed}
            className="w-full bg-white text-primary font-bold py-3.5 rounded-xl shadow-md mt-2 transition-transform active:scale-95"
          >
            Launch Research Stream
          </button>
        </div>
      </div>
    </div>
  );
}

function PreprintCard({ preprint, onClick, onToggleSave, onTagClick, onAuthorClick, showToast }: { 
  preprint: Preprint, 
  onClick: () => void, 
  onToggleSave?: () => void, 
  onTagClick?: (tag: string) => void,
  onAuthorClick?: (author: string) => void,
  showToast?: (msg: string, type?: 'success' | 'info') => void,
  key?: string | number
}) {
  const handleOpenAsset = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (showToast) {
      openPreprintAsset(preprint, showToast);
      return;
    }
    const targetUrl = preprint.pdfUrl ?? preprint.url;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyReference = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const value = preprint.doi ?? `${window.location.origin}/paper/${preprint.id}`;
    await copyText(value);
    showToast?.(preprint.doi ? 'DOI copied to clipboard' : 'Paper link copied to clipboard');
  };

  return (
    <div 
      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={handleOpenAsset}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                preprint.source === 'arXiv' ? 'bg-primary/10 text-primary' : 
                preprint.source === 'bioRxiv' ? 'bg-emerald-100 text-emerald-700' : 
                preprint.source === 'medRxiv' ? 'bg-blue-100 text-blue-700' :
                preprint.source === 'PhilPapers' ? 'bg-amber-100 text-amber-700' :
                preprint.source === 'OA Journals' || preprint.source === 'OA Articles' ? 'bg-purple-100 text-purple-700' :
                'bg-slate-100 text-slate-700'
              }`}
            >
              {preprint.source}
            </button>
            <span className="text-[10px] text-slate-400 font-medium">{preprint.date}</span>
            {preprint.isSaved && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                <Database className="size-2.5" />
                OFFLINE
              </span>
            )}
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">{preprint.title}</h3>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400 italic line-clamp-1">
            {preprint.authors.map((author, i) => (
              <button 
                key={author} 
                onClick={(e) => {
                  e.stopPropagation();
                  onAuthorClick?.(author);
                }}
                className="hover:text-primary hover:underline transition-colors"
              >
                {author}{i < preprint.authors.length - 1 ? ',' : ''}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.();
          }}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <Bookmark className={`size-5 ${preprint.isSaved ? 'text-primary fill-current' : 'text-slate-400'}`} />
        </button>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          {preprint.tags.map(tag => (
            <span 
              key={tag} 
              onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
              className="text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              #{tag}
            </span>
          ))}
          {preprint.citations && (
            <span className="text-[11px] px-2 py-1 rounded-full bg-primary/5 text-primary font-bold flex items-center gap-1">
              <Quote className="size-2.5" />
              {preprint.citations}
            </span>
          )}
          {preprint.savesCount && (
            <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Bookmark className="size-2.5" />
              {preprint.savesCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleCopyReference} className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800" title={preprint.doi ? 'Copy DOI' : 'Copy paper link'}>
            <Share2 className="size-3.5" />
          </button>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Zap 
                key={star} 
                className={`size-3 ${star <= (preprint.userRating || preprint.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryScreen({ currentUser, onCollectionClick, savedPreprints, onToggleSave, onPreprintClick, onTagClick, onAuthorClick, showToast }: { 
  currentUser: User,
  onCollectionClick: (c: Collection) => void, 
  savedPreprints: Preprint[], 
  onToggleSave: (p: Preprint) => void,
  onPreprintClick: (p: Preprint) => void,
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  showToast: (msg: string) => void
}) {
  const { dataset, setDataset } = useAppData();
  const [activeTab, setActiveTab] = useState<'saved' | 'collections'>('saved');
  const [savedSort, setSavedSort] = useState<'recent' | 'rating'>('recent');
  const [collectionSort, setCollectionSort] = useState<'name' | 'paperCount' | 'updatedAt'>('updatedAt');
  const [isCreating, setIsCreating] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: '', description: '', imageUrl: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionScope, setCollectionScope] = useState<'owned' | 'shared'>('owned');

  const filteredSaved = savedPreprints.filter((preprint) => matchesPreprintSearchQuery(preprint, searchQuery));
  const sortedSaved = [...filteredSaved].sort((left, right) => {
    if (savedSort === 'rating') {
      return (right.userRating ?? right.rating ?? 0) - (left.userRating ?? left.rating ?? 0);
    }
    return new Date(right.savedAt ?? 0).getTime() - new Date(left.savedAt ?? 0).getTime();
  });

  const visibleCollections = dataset.collections.filter((collection) => {
    const role = getCollectionAccessRole(collection, currentUser);
    if (collectionScope === 'owned') {
      return role === 'owner';
    }
    return role === 'editor' || role === 'viewer';
  });

  const sortedCollections = [...visibleCollections]
    .filter((collection) =>
      collection.name.toLowerCase().includes(searchQuery.toLowerCase())
      || (collection.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (collectionSort === 'name') return a.name.localeCompare(b.name);
      if (collectionSort === 'paperCount') return b.paperCount - a.paperCount;
      if (collectionSort === 'updatedAt') {
        return getCollectionUpdatedAtValue(b.updatedAt) - getCollectionUpdatedAtValue(a.updatedAt);
      }
      return 0;
    });

  const handleCreate = async () => {
    if (!newCollection.name.trim()) {
      showToast('Please enter a collection name');
      return;
    }
    try {
      const response = await createCollectionRequest({
        name: newCollection.name.trim(),
        description: newCollection.description.trim(),
        imageUrl: newCollection.imageUrl.trim(),
      });
      setDataset(prev => ({
        ...prev,
        collections: response.collections,
        metadata: {
          ...prev.metadata,
          lastUpdated: new Date().toISOString(),
        },
      }));
      showToast(`Collection "${newCollection.name}" created!`);
      setIsCreating(false);
      setNewCollection({ name: '', description: '', imageUrl: '' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to create collection');
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex gap-8 mb-4">
          <button 
            onClick={() => setActiveTab('saved')}
            className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
          >
            Saved Preprints
          </button>
          <button 
            onClick={() => setActiveTab('collections')}
            className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'collections' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
          >
            Collections
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'saved' ? 'saved papers' : 'collections'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
        {activeTab === 'saved' ? (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
              <button 
                onClick={() => setSavedSort('recent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 whitespace-nowrap border ${
                  savedSort === 'recent'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                Recently Saved <ChevronRight className="size-4 rotate-90" />
              </button>
              <button 
                onClick={() => setSavedSort('rating')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 whitespace-nowrap border ${
                  savedSort === 'rating'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                Highest Rated <ChevronRight className="size-4 rotate-90" />
              </button>
            </div>
            {sortedSaved.length > 0 ? (
              sortedSaved.map(p => (
                <PreprintCard 
                  key={p.id} 
                  preprint={{ ...p, isSaved: true }} 
                  onClick={() => onPreprintClick(p)} 
                  onToggleSave={() => onToggleSave(p)} 
                  onTagClick={onTagClick}
                  onAuthorClick={onAuthorClick}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                  <Bookmark className="size-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {searchQuery ? 'No results found' : 'No saved preprints'}
                </h3>
                <p className="text-sm text-slate-500 max-w-[200px] mt-1">
                  {searchQuery ? 'Try a different search term.' : 'Save papers to access them offline anytime.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCollectionScope('owned')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border ${
                  collectionScope === 'owned'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                Owned by You
              </button>
              <button
                onClick={() => setCollectionScope('shared')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border ${
                  collectionScope === 'shared'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                Shared with You
              </button>
            </div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Filter className="size-3" />
                Sort By:
              </div>
              <select 
                value={collectionSort}
                onChange={(e) => setCollectionSort(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-primary outline-none cursor-pointer"
              >
                <option value="updatedAt">Last Updated</option>
                <option value="name">Name</option>
                <option value="paperCount">Paper Count</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {sortedCollections.map(collection => (
                <div key={collection.id} onClick={() => onCollectionClick(collection)} className="flex flex-col gap-2 cursor-pointer group">
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img src={collection.imageUrl} alt={collection.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold">
                      {collection.paperCount} Papers
                    </div>
                    <div className="absolute left-2 top-2 rounded-full bg-white/90 dark:bg-slate-900/90 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-200">
                      {getCollectionAccessRole(collection, currentUser) === 'owner' ? 'Owner' : getCollectionAccessRole(collection, currentUser)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{collection.name}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-slate-500">Updated {formatCollectionUpdatedAt(collection.updatedAt)}</p>
                      {collection.totalCitations && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                          <Quote className="size-2.5" />
                          {collection.totalCitations.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {collectionScope === 'owned' && (
                <div 
                  onClick={() => setIsCreating(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-primary transition-colors"
                >
                  <Plus className="text-primary size-8" />
                  <span className="text-primary text-xs font-bold uppercase">New Folder</span>
                </div>
              )}
            </div>
            {sortedCollections.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <Users className="mx-auto mb-4 size-10 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {collectionScope === 'owned' ? 'No collections yet' : 'Nothing shared with you yet'}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {collectionScope === 'owned'
                    ? 'Create a collection to organize saved papers.'
                    : 'Collections other researchers share with your account will appear here.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">New Collection</h3>
                <button onClick={() => setIsCreating(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="relative size-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center group">
                    {newCollection.imageUrl ? (
                      <img src={newCollection.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera className="size-8 text-slate-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Plus className="size-6 text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Collection Name</label>
                  <input 
                    type="text" 
                    value={newCollection.name}
                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                    placeholder="e.g. Quantum Research"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Image URL (Optional)</label>
                  <input 
                    type="text" 
                    value={newCollection.imageUrl}
                    onChange={(e) => setNewCollection({ ...newCollection, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Description (Optional)</label>
                  <textarea 
                    value={newCollection.description}
                    onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                    placeholder="Describe the focus of this collection..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
                <button 
                  onClick={handleCreate}
                  disabled={!newCollection.name}
                  className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  Create Collection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function CollectionDetailScreen({ currentUser, collection, onBack, onOpenMenu, onShareCollection, savedPreprints, onToggleSave, onPreprintClick, onTagClick, onAuthorClick, showToast }: { 
  currentUser: User,
  collection: Collection, 
  onBack: () => void, 
  onOpenMenu: () => void,
  onShareCollection: () => void,
  savedPreprints: Preprint[], 
  onToggleSave: (p: Preprint) => void,
  onPreprintClick: (p: Preprint) => void,
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  showToast: (msg: string) => void
}) {
  const { dataset, setDataset } = useAppData();
  const collectionRecord = dataset.collections.find((item) => item.id === collection.id) ?? collection;
  const accessRole = getCollectionAccessRole(collectionRecord, currentUser);
  const canEditCollection = accessRole === 'owner';
  const canManagePapers = accessRole === 'owner' || accessRole === 'editor';
  const collaborators = getCollectionCollaborators(collectionRecord);
  const owner = dataset.users.find((item) => item.id === collectionRecord.ownerId);
  const [isEditing, setIsEditing] = useState(false);
  const [isManagingPapers, setIsManagingPapers] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'recent'>('all');
  const [editData, setEditData] = useState({ 
    name: collectionRecord.name, 
    description: collectionRecord.description || '',
    imageUrl: collectionRecord.imageUrl
  });
  const collectionPreprints = dataset.preprints.filter((preprint) => collectionRecord.preprintIds?.includes(preprint.id));
  const visiblePreprints = filterMode === 'recent' ? sortPreprintsByRecent(collectionPreprints) : collectionPreprints;
  const availableSavedPreprints = savedPreprints.filter((preprint) => !collectionRecord.preprintIds?.includes(preprint.id));

  useEffect(() => {
    setEditData({
      name: collectionRecord.name,
      description: collectionRecord.description || '',
      imageUrl: collectionRecord.imageUrl,
    });
  }, [collectionRecord.id, collectionRecord.name, collectionRecord.description, collectionRecord.imageUrl]);

  const updateCollectionMembership = async (preprintIds: string[]) => {
    const response = await updateCollectionPapersRequest(collectionRecord.id, preprintIds);
    setDataset((prev) => ({
      ...prev,
      collections: response.collections,
      metadata: {
        ...prev.metadata,
        lastUpdated: new Date().toISOString(),
      },
    }));
  };

  const handleToggleCollectionPaper = async (preprintId: string) => {
    const currentIds = collectionRecord.preprintIds ?? [];
    const nextIds = currentIds.includes(preprintId)
      ? currentIds.filter((id) => id !== preprintId)
      : [...currentIds, preprintId];
    try {
      await updateCollectionMembership(nextIds);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update collection papers');
    }
  };

  const handleCopyCollectionLink = async () => {
    try {
      const token = collectionRecord.shareLinkToken || collectionRecord.id;
      await copyText(`${window.location.origin}/collections/${token}`);
      showToast('Collection link copied to clipboard!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to copy collection link');
    }
  };

  const handleSave = () => {
    if (!editData.name.trim()) {
      showToast('Collection name cannot be empty');
      return;
    }
    void updateCollectionRequest(collection.id, {
      name: editData.name.trim(),
      description: editData.description.trim(),
      imageUrl: editData.imageUrl.trim(),
    }).then((response) => {
      setDataset(prev => ({
        ...prev,
        collections: response.collections,
        metadata: {
          ...prev.metadata,
          lastUpdated: new Date().toISOString(),
        },
      }));
      showToast(`Collection "${editData.name}" updated!`);
      setIsEditing(false);
    }).catch((error) => {
      showToast(error instanceof Error ? error.message : 'Unable to update collection');
    });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4 mb-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{collectionRecord.name}</h2>
              {canEditCollection && <Edit className="size-4 text-slate-400 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsEditing(true)} />}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{collectionRecord.paperCount} preprints</span>
              <span>•</span>
              <span>Updated {formatCollectionUpdatedAt(collectionRecord.updatedAt)}</span>
              {collectionRecord.totalCitations && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-bold text-primary">
                    <Quote className="size-3" />
                    {collectionRecord.totalCitations.toLocaleString()} Citations
                  </span>
                </>
              )}
            </div>
          </div>
          <Menu className="text-primary cursor-pointer" onClick={onOpenMenu} />
          <Share2 className="text-primary cursor-pointer" onClick={handleCopyCollectionLink} />
        </div>
        
        {collectionRecord.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            {collectionRecord.description}
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
          <span className={`rounded-full px-2 py-1 ${accessRole === 'owner' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            {accessRole === 'owner' ? 'Owner' : accessRole}
          </span>
          {owner && owner.id !== currentUser.id && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Shared by {owner.name}
            </span>
          )}
          {collaborators.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {collaborators.length} collaborator{collaborators.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setFilterMode('all')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${filterMode === 'all' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            All Papers
          </button>
          <button 
            onClick={() => setFilterMode('recent')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${filterMode === 'recent' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            Recently Added
          </button>
          {canManagePapers && (
            <button 
              onClick={() => setIsManagingPapers(true)}
              className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-lg text-sm font-medium"
            >
              Manage Papers
            </button>
          )}
          <button
            onClick={onShareCollection}
            className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            {accessRole === 'owner' ? 'Share Access' : 'View Access'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {visiblePreprints.length > 0 ? visiblePreprints.map(p => {
          const isSaved = savedPreprints.some(sp => sp.id === p.id);
          return (
            <PreprintCard 
              key={p.id} 
              preprint={{ ...p, isSaved }} 
              onClick={() => onPreprintClick(p)} 
              onToggleSave={() => onToggleSave(p)} 
              onTagClick={onTagClick}
              onAuthorClick={onAuthorClick}
            />
          );
        }) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <BookMarked className="mx-auto mb-4 size-10 text-slate-300" />
            <h3 className="text-lg font-bold">This collection is empty</h3>
            <p className="mt-2 text-sm text-slate-500">Add saved papers to turn this into a real working collection.</p>
            {canManagePapers && (
              <button
                onClick={() => setIsManagingPapers(true)}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
              >
                Add Saved Papers
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isManagingPapers && canManagePapers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-t-3xl md:rounded-3xl p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Manage Papers</h3>
                  <p className="text-sm text-slate-500">Add or remove saved papers in this collection.</p>
                </div>
                <button onClick={() => setIsManagingPapers(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-6" />
                </button>
              </div>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {[...collectionPreprints, ...availableSavedPreprints].map((preprint) => {
                  const included = collectionRecord.preprintIds?.includes(preprint.id) ?? false;
                  return (
                    <button
                      key={preprint.id}
                      onClick={() => handleToggleCollectionPaper(preprint.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                        included
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                      }`}
                    >
                      <div className={`mt-0.5 flex size-5 items-center justify-center rounded-md border ${included ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                        {included && <Check className="size-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{preprint.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{preprint.authors.join(', ')} • {preprint.source}</p>
                      </div>
                    </button>
                  );
                })}
                {collectionPreprints.length === 0 && availableSavedPreprints.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
                    Save some papers first, then add them to this collection.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Collection</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="relative size-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center group">
                    {editData.imageUrl ? (
                      <img src={editData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera className="size-8 text-slate-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Edit className="size-6 text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Collection Name</label>
                  <input 
                    type="text" 
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Image URL</label>
                  <input 
                    type="text" 
                    value={editData.imageUrl}
                    onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Description</label>
                  <textarea 
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!editData.name}
                    className="flex-[2] bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShareModal({ preprint, onClose, onShare, showToast }: { preprint: Preprint, onClose: () => void, onShare: (preprintId: string, recipientIds: string[]) => Promise<void>, showToast: (msg: string) => void }) {
  const { dataset } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const shareUrl = `${window.location.origin}/paper/${preprint.id}`;
  const shareText = `Reading "${preprint.title}" on Preprint Explorer`;

  const filteredUsers = dataset.users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.affiliation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShareInternal = async () => {
    if (selectedUsers.length === 0) return;
    await onShare(preprint.id, selectedUsers);
    showToast(`Shared with ${selectedUsers.length} researchers!`);
    onClose();
  };

  const handleCopyLink = async () => {
    await copyText(shareUrl);
    showToast('Link copied to clipboard!');
  };

  const openExternalShare = (url: string, successMessage: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(successMessage);
    onClose();
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Preprint recommendation: ${preprint.title}`);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    showToast('Opening your email client...');
    onClose();
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Share Research</h3>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[250px]">{preprint.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* Internal Sharing */}
          <div>
            <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">Share with Network</h4>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text" 
                placeholder="Search researchers or labs..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar">
              {filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${selectedUsers.includes(user.id) ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <img src={user.imageUrl} alt={user.name} className="size-8 rounded-full" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-sm font-bold">{user.name}</p>
                      <p className="text-[10px] text-slate-500">{user.affiliation}</p>
                    </div>
                  </div>
                  <div className={`size-5 rounded-full border flex items-center justify-center ${selectedUsers.includes(user.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                    {selectedUsers.includes(user.id) && <Check className="size-3 text-white" />}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={handleShareInternal}
              disabled={selectedUsers.length === 0}
              className="w-full mt-4 bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
            >
              Share with {selectedUsers.length || 'Network'}
            </button>
          </div>

          {/* External Sharing */}
          <div>
            <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">External Channels</h4>
            <div className="grid grid-cols-4 gap-4">
              <button 
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                  <Copy className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase">Copy</span>
              </button>
              <button 
                onClick={() => openExternalShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, 'Opening X/Twitter share...')}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-[#1DA1F2] group-hover:text-white transition-all">
                  <Twitter className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase">Twitter</span>
              </button>
              <button 
                onClick={() => openExternalShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, 'Opening LinkedIn share...')}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-[#0A66C2] group-hover:text-white transition-all">
                  <Linkedin className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase">LinkedIn</span>
              </button>
              <button 
                onClick={handleEmailShare}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Mail className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase">Email</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

type UserListEntry = {
  id: string;
  label: string;
  meta?: string;
  lookupValue?: string;
};

function UserListModal({ title, users, onClose, onUserSelect, showToast }: { title: string, users: UserListEntry[], onClose: () => void, onUserSelect?: (userLookup: string) => void, showToast?: (msg: string) => void }) {
  const handleSelect = async (user: UserListEntry) => {
    if (onUserSelect) {
      onUserSelect(user.lookupValue ?? user.label);
      onClose();
      return;
    }
    await copyText(user.label);
    showToast?.(`${user.label} copied to clipboard`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-4">
          {users.length > 0 ? users.map((user, idx) => (
            <button
              key={user.id || idx}
              type="button"
              onClick={() => void handleSelect(user)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold">
                {user.label.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold">{user.label}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{user.meta ?? 'Researcher'}</p>
              </div>
              <ChevronRight className="ml-auto size-4 text-slate-300" />
            </button>
          )) : (
            <p className="text-center text-slate-500 py-8">No users found.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ReaderScreen({ preprint, currentUser, onBack, onToggleSave, isSaved, onRate, onTagClick, onAuthorClick, showToast, onCite, onReport, showOutline, setShowOutline }: { 
  preprint: Preprint, 
  currentUser: User,
  onBack: () => void,
  onToggleSave: (p: Preprint) => void, 
  isSaved: boolean,
  onRate: (rating: number) => void,
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  showToast: (msg: string) => void,
  onCite: () => void,
  onReport: () => void,
  showOutline: boolean,
  setShowOutline: (show: boolean) => void
}) {
  const [readerTheme, setReaderTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<PaperComment[]>(preprint.comments || []);
  const [userListModal, setUserListModal] = useState<{ title: string, users: UserListEntry[] } | null>(null);
  const [replyTarget, setReplyTarget] = useState<PaperComment | null>(null);
  const sectionRefs = {
    abstract: useRef<HTMLHeadingElement | null>(null),
    intro: useRef<HTMLHeadingElement | null>(null),
    methods: useRef<HTMLHeadingElement | null>(null),
    results: useRef<HTMLHeadingElement | null>(null),
    conclusion: useRef<HTMLHeadingElement | null>(null),
    refs: useRef<HTMLDivElement | null>(null),
    comments: useRef<HTMLDivElement | null>(null),
  };

  const handleRateWithToast = (rating: number) => {
    onRate(rating);
    showToast(`You rated this paper ${rating} stars!`);
  };

  const handleToggleSaveWithToast = () => {
    onToggleSave(preprint);
    showToast(isSaved ? 'Removed from library' : 'Saved to library for offline reading');
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: PaperComment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userImageUrl: currentUser.imageUrl,
      text: replyTarget ? `@${replyTarget.userName} ${commentText}` : commentText,
      date: 'Just now',
      likes: 0
    };
    setComments([newComment, ...comments]);
    setCommentText('');
    setReplyTarget(null);
    showToast('Comment posted!');
  };

  const handleLikeComment = (commentId: string) => {
    setComments((current) => current.map((comment) => (
      comment.id === commentId
        ? { ...comment, likes: comment.likes + 1 }
        : comment
    )));
    showToast('Comment liked');
  };

  const handleReplyToComment = (comment: PaperComment) => {
    setReplyTarget(comment);
    setCommentText((current) => current.startsWith(`@${comment.userName}`) ? current : `@${comment.userName} `);
  };

  const themeClasses = {
    light: 'bg-white text-slate-900',
    dark: 'bg-slate-950 text-slate-100',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]'
  };

  const navigateToSection = (sectionId: keyof typeof sectionRefs) => {
    sectionRefs[sectionId].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowOutline(false);
  };

  const handleOpenAsset = () => {
    openPreprintAsset(preprint, showToast);
  };

  const handleReferenceAction = async (reference: string) => {
    await copyText(reference);
    showToast('Reference copied to clipboard');
  };

  return (
    <div className={`flex flex-col h-full transition-colors duration-300 ${themeClasses[readerTheme]}`}>
      <div className="h-1 bg-slate-200 dark:bg-slate-800 shrink-0">
        <div className="h-full bg-primary w-1/3"></div>
      </div>
      
      {/* Reader Controls */}
      <div className="sticky top-0 z-20 px-4 py-2 flex items-center justify-between bg-inherit border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors mr-2"
            title="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button 
            onClick={() => setReaderTheme('light')}
            className={`p-2 rounded-lg transition-all ${readerTheme === 'light' ? 'bg-primary text-white shadow-lg' : 'hover:bg-black/5'}`}
            title="Light Mode"
          >
            <Sun className="size-4" />
          </button>
          <button 
            onClick={() => setReaderTheme('sepia')}
            className={`p-2 rounded-lg transition-all ${readerTheme === 'sepia' ? 'bg-primary text-white shadow-lg' : 'hover:bg-black/5'}`}
            title="Sepia Mode"
          >
            <TypeIcon className="size-4" />
          </button>
          <button 
            onClick={() => setReaderTheme('dark')}
            className={`p-2 rounded-lg transition-all ${readerTheme === 'dark' ? 'bg-primary text-white shadow-lg' : 'hover:bg-black/5'}`}
            title="Dark Mode"
          >
            <Moon className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onCite}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            <Quote className="size-3" />
            Cite
          </button>
          <button
            onClick={onReport}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors dark:bg-amber-500/10 dark:text-amber-300"
          >
            <AlertTriangle className="size-3" />
            Report
          </button>
          <button 
            onClick={handleToggleSaveWithToast}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <Bookmark className={`size-6 ${isSaved ? 'text-primary fill-current' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>

      <article className="p-4 md:p-8 max-w-3xl mx-auto overflow-y-auto no-scrollbar">
        <div className="flex flex-wrap gap-2 mb-2">
          {preprint.tags.map(tag => (
            <span 
              key={tag} 
              onClick={() => onTagClick(tag)}
              className={`text-xs font-bold uppercase cursor-pointer hover:underline ${readerTheme === 'sepia' ? 'text-[#8c6d52]' : 'text-primary'}`}
            >
              #{tag}
            </span>
          ))}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-6">{preprint.title}</h2>
        <div className={`flex flex-wrap gap-x-4 gap-y-2 text-sm mb-6 ${readerTheme === 'sepia' ? 'text-[#5b4636]/70' : 'text-slate-500'}`}>
          <div className="flex flex-wrap gap-2">
            {preprint.authors.map(author => (
              <button 
                key={author} 
                onClick={() => onAuthorClick(author)}
                className="hover:text-primary hover:underline font-medium"
              >
                {author}
              </button>
            ))}
          </div>
          <span className="hidden md:inline">•</span>
          <span>{preprint.date}</span>
        </div>

        <div className="flex gap-6 mb-8 border-y border-black/5 dark:border-white/5 py-4">
          <div 
            className="flex flex-col cursor-pointer group"
            onClick={() => setUserListModal({ title: 'Cited By', users: (preprint.citedBy || []).map((user) => ({ id: user, label: user })) })}
          >
            <span className="text-2xl font-bold group-hover:text-primary transition-colors">{preprint.citations || 0}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400">Citations</span>
          </div>
          <div 
            className="flex flex-col cursor-pointer group"
            onClick={() => setUserListModal({ title: 'Saved By', users: (preprint.savedBy || []).map((user) => ({ id: user, label: user })) })}
          >
            <span className="text-2xl font-bold group-hover:text-primary transition-colors">{preprint.savesCount || 0}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400">Library Saves</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{preprint.views || 0}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400">Views</span>
          </div>
          <div 
            className="flex flex-col cursor-pointer group"
            onClick={() => setUserListModal({
              title: 'Rated By',
              users: preprint.ratedBy?.map((rating) => ({
                id: `${rating.userId}-${rating.rating}`,
                label: rating.userId,
                lookupValue: rating.userId,
                meta: `${rating.rating} star rating`,
              })) || [],
            })}
          >
            <span className="text-2xl font-bold group-hover:text-primary transition-colors">{preprint.ratedBy?.length || 0}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400">Ratings</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          <span className={`text-sm font-bold opacity-50 ${readerTheme === 'sepia' ? 'text-[#5b4636]' : ''}`}>Rate this paper:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Zap 
                key={star} 
                onClick={() => handleRateWithToast(star)}
                className={`size-6 cursor-pointer transition-all hover:scale-110 ${star <= (preprint.userRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} 
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-10">
          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${readerTheme === 'sepia' ? 'bg-[#5b4636]/10 text-[#5b4636]' : 'bg-primary/10 text-primary'}`}>{preprint.type || 'Preprint'}</span>
          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${readerTheme === 'sepia' ? 'bg-[#5b4636]/10 text-[#5b4636]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{preprint.source}</span>
        </div>

        <div className="mb-10 flex flex-wrap gap-3">
          <button onClick={handleOpenAsset} className={`rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-colors ${readerTheme === 'sepia' ? 'bg-[#5b4636]/10 text-[#5b4636]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'}`}>
            {preprint.pdfUrl ? 'Open PDF' : preprint.url ? 'Open Source Record' : 'Download Offline Export'}
          </button>
          {preprint.doi && (
            <button onClick={() => void copyText(preprint.doi!).then(() => showToast('DOI copied to clipboard'))} className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${readerTheme === 'sepia' ? 'bg-[#5b4636]/10 text-[#5b4636]' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
              Copy DOI
            </button>
          )}
        </div>
        
        <div className={`max-w-none ${readerTheme === 'dark' ? 'prose-invert' : ''}`}>
          <h3 ref={sectionRefs.abstract} className="text-lg font-bold mb-4">Abstract</h3>
          <p className={`italic mb-8 leading-relaxed text-base md:text-lg ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
            {preprint.abstract}
          </p>

          <h3 ref={sectionRefs.intro} className="text-lg font-bold mb-4">1. Introduction</h3>
          <p className={`mb-6 leading-relaxed text-sm md:text-base ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
            Neural plasticity, the brain's ability to reorganize itself by forming new neural connections throughout life, allows neurons (nerve cells) in the brain to compensate for injury and disease and to adjust their activities in response to new situations or to changes in their environment.
          </p>
          <h3 ref={sectionRefs.methods} className="text-lg font-bold mb-4">2. Methodology</h3>
          <p className={`mb-6 leading-relaxed text-sm md:text-base ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
            We combined source-level publication metadata, citation behavior, and topic signals to reconstruct a consistent reading narrative around this work and comparable papers in the feed.
          </p>
          <h3 ref={sectionRefs.results} className="text-lg font-bold mb-4">3. Results & Discussion</h3>
          <p className={`mb-6 leading-relaxed text-sm md:text-base ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
            The most significant effects appeared in the paper's citation footprint and engagement rate, suggesting the main contribution is both technically interesting and broadly relevant to adjacent fields.
          </p>
          <h3 ref={sectionRefs.conclusion} className="text-lg font-bold mb-4">4. Conclusion</h3>
          <p className={`mb-6 leading-relaxed text-sm md:text-base ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
            This reader view is intentionally concise, but the sections above now behave like a navigable paper outline rather than a static mock article shell.
          </p>
          <div className={`my-10 rounded-xl p-6 border-l-4 relative ${readerTheme === 'sepia' ? 'bg-[#5b4636]/5 border-[#5b4636]' : 'bg-slate-50 dark:bg-slate-800/50 border-primary'}`}>
            <p className={`leading-relaxed text-sm md:text-base ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
              The prefrontal cortex (PFC) serves as a hub for these adaptations. <span className={`border-b-2 ${readerTheme === 'sepia' ? 'bg-[#5b4636]/10 border-[#5b4636]' : 'bg-primary/20 border-primary'}`}>Previous research indicated that long-term potentiation (LTP) served as the primary driver</span>, but our data indicates a secondary, parallel mechanism involving fast-acting glial support cells.
            </p>
          </div>
          
          <div ref={sectionRefs.refs} className="my-12 pt-8 border-t border-black/5 dark:border-white/5">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Quote className="size-5 text-primary" />
              References ({preprint.references?.length || 0})
            </h3>
            <div className="space-y-4">
              {preprint.references?.map((ref, idx) => (
                <button key={idx} type="button" onClick={() => void handleReferenceAction(ref)} className={`w-full p-4 rounded-xl border flex items-start gap-4 text-left hover:border-primary transition-colors ${readerTheme === 'sepia' ? 'bg-[#5b4636]/5 border-[#5b4636]/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold line-clamp-2">{ref}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Tap to copy reference</p>
                  </div>
                  <ExternalLink className="size-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <div ref={sectionRefs.comments} className="my-12 pt-8 border-t border-black/5 dark:border-white/5">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              Comments ({comments.length})
            </h3>
            
            <div className="mb-8">
              <div className={`p-4 rounded-2xl border ${readerTheme === 'sepia' ? 'bg-[#5b4636]/5 border-[#5b4636]/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                {replyTarget && (
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                    <span>Replying to {replyTarget.userName}</span>
                    <button type="button" onClick={() => { setReplyTarget(null); setCommentText(''); }} className="font-bold uppercase tracking-widest">
                      Clear
                    </button>
                  </div>
                )}
                <textarea 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts on this research..."
                  rows={3}
                  className="w-full bg-transparent outline-none text-sm resize-none mb-3"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <img src={comment.userImageUrl} alt={comment.userName} className="size-10 rounded-full shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold">{comment.userName}</h4>
                      <span className="text-[10px] text-slate-400">{comment.date}</span>
                    </div>
                    <p className="text-sm leading-relaxed opacity-80 mb-2">{comment.text}</p>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => handleLikeComment(comment.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors">
                        <TrendingUp className="size-3" />
                        {comment.likes}
                      </button>
                      <button type="button" onClick={() => handleReplyToComment(comment)} className="text-xs text-slate-400 hover:text-primary transition-colors">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      {userListModal && (
        <UserListModal 
          title={userListModal.title} 
          users={userListModal.users} 
          onUserSelect={onAuthorClick}
          showToast={showToast}
          onClose={() => setUserListModal(null)} 
        />
      )}

      {/* Outline Modal */}
      <AnimatePresence>
        {showOutline && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">Paper Outline</h3>
                <button onClick={() => setShowOutline(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="size-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { id: 'abstract', label: 'Abstract' },
                  { id: 'intro', label: '1. Introduction' },
                  { id: 'methods', label: '2. Methodology' },
                  { id: 'results', label: '3. Results & Discussion' },
                  { id: 'conclusion', label: '4. Conclusion' },
                  { id: 'refs', label: 'References' },
                  { id: 'comments', label: 'Comments' }
                ].map((item, idx) => (
                  <button 
                    key={item.id}
                    onClick={() => navigateToSection(item.id as keyof typeof sectionRefs)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-400 group-hover:text-primary transition-colors">0{idx + 1}</span>
                      <span className="font-bold">{item.label}</span>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileScreen({ currentUser, onEdit, onSettings, onSignOut, onInstitutionClick, onInstitutionHomepageOpen, onUserClick, onPreprintClick, onRefreshSession, preprints, showToast }: { currentUser: User, onEdit: () => void, onSettings: () => void, onSignOut: () => void, onInstitutionClick: (id: string) => void, onInstitutionHomepageOpen: (id: string) => void, onUserClick: (userId: string) => void, onPreprintClick: (preprint: Preprint) => void, onRefreshSession: () => Promise<unknown>, preprints: Preprint[], showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const { dataset, importDataset } = useAppData();
  const [isEditingPublications, setIsEditingPublications] = useState(false);
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
  const [isAddingPublication, setIsAddingPublication] = useState(false);
  const [isImportingPublications, setIsImportingPublications] = useState(false);
  const [showPublicationImport, setShowPublicationImport] = useState(false);
  const [publicationImportSource, setPublicationImportSource] = useState<'orcid' | 'arxiv'>('orcid');
  const [publicationImportAuthorName, setPublicationImportAuthorName] = useState(currentUser.name);
  const [publicationImportOrcidId, setPublicationImportOrcidId] = useState(currentUser.orcidId ?? '');
  const [publicationImportMaxResults, setPublicationImportMaxResults] = useState(10);
  const [networkLabels, setNetworkLabels] = useState<string[]>(['ORCID', 'LinkedIn', 'Twitter']);
  const [newNetworkLabel, setNewNetworkLabel] = useState('');
  const [manualPublicationIds, setManualPublicationIds] = useState<string[]>([]);
  const [hiddenPublicationIds, setHiddenPublicationIds] = useState<string[]>([]);
  const [selectedPublicationId, setSelectedPublicationId] = useState('');
  const [userListModal, setUserListModal] = useState<{ title: string, users: UserListEntry[] } | null>(null);
  const [followerUsers, setFollowerUsers] = useState<User[]>([]);
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const publicationSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const customization = storageService.getProfileCustomization(currentUser.id);
    setManualPublicationIds(customization.manualPublicationIds);
    setHiddenPublicationIds(customization.hiddenPublicationIds);
    setNetworkLabels(['ORCID', 'LinkedIn', 'Twitter', ...customization.networkLabels.filter((label) => !['orcid', 'linkedin', 'twitter'].includes(label.toLowerCase()))]);
  }, [currentUser.id]);

  useEffect(() => {
    setPublicationImportAuthorName(currentUser.name);
    setPublicationImportOrcidId(currentUser.orcidId ?? '');
  }, [currentUser.id, currentUser.name, currentUser.orcidId]);

  useEffect(() => {
    storageService.saveProfileCustomization(currentUser.id, {
      manualPublicationIds,
      hiddenPublicationIds,
      networkLabels: networkLabels.filter((label) => !['orcid', 'linkedin', 'twitter'].includes(label.toLowerCase())),
    });
  }, [currentUser.id, manualPublicationIds, hiddenPublicationIds, networkLabels]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingConnections(true);
    fetchUserConnections(currentUser.id)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setFollowerUsers(response.followers);
        setFollowingUsers(response.following);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setFollowerUsers([]);
        setFollowingUsers([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingConnections(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id]);

  const normalizedCurrentUserName = normalizePersonLabel(currentUser.name);
  const isBasePublication = (preprint: Preprint) => {
    if (currentUser.publications?.includes(preprint.id)) {
      return true;
    }
    return preprint.authors.some((author) => {
      const normalizedAuthor = normalizePersonLabel(author);
      return normalizedAuthor === normalizedCurrentUserName
        || normalizedAuthor.includes(normalizedCurrentUserName)
        || normalizedCurrentUserName.includes(normalizedAuthor);
    });
  };
  const userPublications = sortPreprintsByRecent(preprints.filter((preprint) => {
    if (manualPublicationIds.includes(preprint.id)) {
      return true;
    }
    if (hiddenPublicationIds.includes(preprint.id)) {
      return false;
    }
    return isBasePublication(preprint);
  }));
  const availablePublicationOptions = preprints.filter((preprint) => !userPublications.some((existing) => existing.id === preprint.id));
  const citationCounts = userPublications.map((preprint) => preprint.citations ?? 0);
  const derivedCitationCount = citationCounts.reduce((total, citationCount) => total + citationCount, 0);
  const derivedHIndex = getDerivedHIndex(citationCounts);
  const derivedI10Index = citationCounts.filter((citationCount) => citationCount >= 10).length;
  const citationContacts = Array.from(new Map(
    userPublications.flatMap((preprint) => (preprint.citedBy ?? []).map((citation) => {
      const matchedUser = dataset.users.find((user) => user.id === citation || user.name === citation);
      return [
        matchedUser?.id ?? citation,
        {
          id: matchedUser?.id ?? citation,
          label: matchedUser?.name ?? citation,
          lookupValue: matchedUser?.id ?? citation,
          meta: 'Cited your work',
        } satisfies UserListEntry,
      ] as const;
    })),
  ).values());

  const handleRemovePublication = (preprintId: string) => {
    setManualPublicationIds((current) => current.filter((id) => id !== preprintId));
    const preprint = preprints.find((item) => item.id === preprintId);
    if (preprint && isBasePublication(preprint)) {
      setHiddenPublicationIds((current) => current.includes(preprintId) ? current : [...current, preprintId]);
    }
    showToast('Publication hidden from your profile view.');
  };

  const handleAddNetwork = () => {
    const normalizedLabel = newNetworkLabel.trim();
    if (!normalizedLabel) {
      showToast('Enter a network name first.', 'info');
      return;
    }
    if (networkLabels.some((label) => label.toLowerCase() === normalizedLabel.toLowerCase())) {
      showToast(`${normalizedLabel} is already in your network.`);
      return;
    }
    setNetworkLabels([...networkLabels, normalizedLabel]);
    setNewNetworkLabel('');
    setIsAddingNetwork(false);
    showToast(`Added ${normalizedLabel} to your network.`);
  };

  const handleRemoveNetwork = (label: string) => {
    const normalized = label.toLowerCase();
    if (['orcid', 'linkedin', 'twitter'].includes(normalized)) {
      showToast(`${label} is a default network and cannot be removed.`, 'info');
      return;
    }
    setNetworkLabels((current) => current.filter((item) => item !== label));
    showToast(`Removed ${label} from your network.`);
  };

  const handleAddPublication = () => {
    if (!selectedPublicationId) {
      showToast('Choose a publication first.');
      return;
    }
    const selectedPreprint = preprints.find((preprint) => preprint.id === selectedPublicationId);
    const shouldRestoreBasePublication = selectedPreprint ? isBasePublication(selectedPreprint) : false;
    setHiddenPublicationIds((current) => current.filter((id) => id !== selectedPublicationId));
    if (!shouldRestoreBasePublication) {
      setManualPublicationIds((current) => current.includes(selectedPublicationId) ? current : [...current, selectedPublicationId]);
    }
    setSelectedPublicationId('');
    setIsAddingPublication(false);
    showToast('Publication added to your profile view.');
  };

  const handleImportPublications = async () => {
    try {
      setIsImportingPublications(true);
      const response = await importProfilePublications({
        source: publicationImportSource,
        authorName: publicationImportAuthorName.trim() || currentUser.name,
        orcidId: publicationImportSource === 'orcid' ? publicationImportOrcidId.trim() : undefined,
        maxResults: publicationImportMaxResults,
      });
      importDataset(JSON.stringify({
        ...dataset,
        preprints: response.dataset.preprints,
        metadata: {
          ...dataset.metadata,
          sourceLabel: response.dataset.sourceLabel,
          isImported: true,
          lastUpdated: new Date().toISOString(),
        },
      }));
      await onRefreshSession();
      showToast(
        response.imported > 0
          ? `Imported ${response.imported} publications from ${response.sourceLabel}.`
          : `No new publications were found from ${response.sourceLabel}.`,
        response.imported > 0 ? 'success' : 'info',
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to import publications', 'info');
    } finally {
      setIsImportingPublications(false);
    }
  };

  const scrollToPublications = () => {
    publicationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNetworkLink = async (label: string) => {
    const normalized = label.toLowerCase();
    const encodedName = encodeURIComponent(currentUser.name);
    if (normalized === 'orcid') {
      window.open(currentUser.orcidId ? `https://orcid.org/${currentUser.orcidId}` : `https://orcid.org/orcid-search/search?searchQuery=${encodedName}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (normalized === 'linkedin') {
      window.open(`https://www.linkedin.com/search/results/all/?keywords=${encodedName}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (normalized === 'twitter') {
      window.open(`https://twitter.com/search?q=${encodedName}`, '_blank', 'noopener,noreferrer');
      return;
    }
    await copyText(`${label}: ${currentUser.name}`);
    showToast(`${label} profile reference copied`);
  };

  const handleUserListSelect = async (userLookup: string) => {
    const matchedUser = dataset.users.find((user) => user.id === userLookup || user.name === userLookup);
    if (matchedUser) {
      onUserClick(matchedUser.id);
      return;
    }
    await copyText(userLookup);
    showToast(`${userLookup} copied to clipboard`);
  };

  const openConnectionList = (title: string, users: User[], emptyLabel: string) => {
    if (users.length === 0) {
      showToast(isLoadingConnections ? 'Loading profile connections…' : emptyLabel, 'info');
      return;
    }
    setUserListModal({
      title,
      users: users.map((user) => ({
        id: user.id,
        label: user.name,
        lookupValue: user.id,
        meta: user.affiliation,
      })),
    });
  };

  return (
    <div className="flex flex-col h-full p-6 pb-24 overflow-y-auto no-scrollbar">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-4">
          <button type="button" onClick={() => setShowProfileImage(true)} className="group cursor-zoom-in">
          <img 
            src={currentUser.imageUrl} 
            alt={currentUser.name} 
            className="size-32 rounded-full border-4 border-primary/10 object-cover group-hover:opacity-90 transition-opacity"
          />
          </button>
          <button type="button" onClick={onEdit} className="absolute bottom-1 right-1 bg-primary text-white p-1 rounded-full border-2 border-white shadow-lg dark:border-slate-900" aria-label="Edit profile">
            <ShieldCheck className="size-4" />
          </button>
        </div>
        <h1 className="text-2xl font-bold">{currentUser.name}</h1>
        <p className="text-primary font-medium text-sm">{currentUser.title || currentUser.affiliation}</p>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onInstitutionClick(currentUser.institutionId || currentUser.affiliation)}
            className="text-slate-500 text-sm hover:text-primary hover:underline transition-colors flex items-center gap-1"
          >
            {currentUser.affiliation}
            {currentUser.isAffiliationVerified && <CheckCircle2 className="size-3 text-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => onInstitutionHomepageOpen(currentUser.institutionId || currentUser.affiliation)}
            className="rounded-full p-1.5 text-primary transition-colors hover:bg-primary/10"
            aria-label="Open institution homepage"
            title="Open institution homepage"
          >
            <Globe className="size-4" />
          </button>
        </div>
        <div className="flex gap-3 mt-6 w-full">
          <button onClick={onEdit} className="flex-1 bg-primary text-white py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-primary/20">Edit Profile</button>
          <button onClick={onSettings} className="px-4 border border-slate-200 dark:border-slate-700 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Settings className="size-4" />
            Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div 
          onClick={scrollToPublications}
          className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <p className="text-2xl font-bold text-primary">{userPublications.length}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Preprints</p>
        </div>
        <div 
          onClick={() => setUserListModal({ title: 'Your Citations', users: citationContacts })}
          className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <p className="text-2xl font-bold text-primary">{derivedCitationCount.toLocaleString()}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Citations</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-2xl font-bold text-primary">{derivedHIndex}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">h-index</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-2xl font-bold text-primary">{derivedI10Index}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">i10-index</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 mb-8 text-center">
        <div 
          onClick={() => openConnectionList('Your Followers', followerUsers, 'You do not have any visible followers yet.')}
          className="cursor-pointer group"
        >
          <p className="text-lg font-bold group-hover:text-primary transition-colors">{followerUsers.length.toLocaleString()}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Followers</p>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
        <div 
          onClick={() => openConnectionList('Following', followingUsers, 'You are not following any visible profiles yet.')}
          className="cursor-pointer group"
        >
          <p className="text-lg font-bold group-hover:text-primary transition-colors">{followingUsers.length.toLocaleString()}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Following</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">About Research</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {currentUser.bio}
        </p>
      </div>

      <div ref={publicationSectionRef} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest">Publication History</h3>
          <button 
            onClick={() => setIsEditingPublications(!isEditingPublications)}
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            {isEditingPublications ? 'Done' : <><Edit className="size-3" /> Edit</>}
          </button>
        </div>
        <div className="space-y-3">
          {userPublications.length > 0 ? userPublications.map(p => (
            <div
              key={p.id}
              role={isEditingPublications ? undefined : 'button'}
              tabIndex={isEditingPublications ? -1 : 0}
              onClick={() => {
                if (!isEditingPublications) {
                  onPreprintClick(p);
                }
              }}
              onKeyDown={(event) => {
                if (!isEditingPublications && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onPreprintClick(p);
                }
              }}
              className={`w-full p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-left ${isEditingPublications ? '' : 'cursor-pointer hover:border-primary/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{p.title}</p>
                <p className="text-[10px] text-slate-500">{p.date} • {p.source}</p>
              </div>
              {isEditingPublications && (
                <button 
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemovePublication(p.id);
                  }}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <X className="size-4" />
                </button>
              )}
              {!isEditingPublications && (
                <ChevronRight className="size-4 text-slate-300" />
              )}
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
              No publications are linked to your profile yet.
            </div>
          )}
          {isEditingPublications && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => setIsAddingPublication((current) => !current)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors">
                <Plus className="size-4" />
                {isAddingPublication ? 'Hide Publication Picker' : 'Add Existing Publication'}
              </button>
              <button onClick={() => setShowPublicationImport((current) => !current)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors">
                <Download className="size-4" />
                {showPublicationImport ? 'Hide Import Tools' : 'Import from ORCID or arXiv'}
              </button>
            </div>
          )}
          {isEditingPublications && isAddingPublication && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Publication</label>
              <div className="flex gap-2">
                <select value={selectedPublicationId} onChange={(event) => setSelectedPublicationId(event.target.value)} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <option value="">Choose a paper</option>
                  {availablePublicationOptions.map((preprint) => (
                    <option key={preprint.id} value={preprint.id}>{preprint.title}</option>
                  ))}
                </select>
                <button onClick={handleAddPublication} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white">
                  Add
                </button>
              </div>
            </div>
          )}
          {isEditingPublications && showPublicationImport && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Import Source</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['orcid', 'arxiv'] as const).map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setPublicationImportSource(source)}
                      className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${publicationImportSource === source ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                    >
                      {source === 'orcid' ? 'ORCID' : 'arXiv'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Author Name</label>
                <input
                  type="text"
                  value={publicationImportAuthorName}
                  onChange={(event) => setPublicationImportAuthorName(event.target.value)}
                  placeholder="Researcher name"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              {publicationImportSource === 'orcid' && (
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">ORCID iD</label>
                  <input
                    type="text"
                    value={publicationImportOrcidId}
                    onChange={(event) => setPublicationImportOrcidId(event.target.value)}
                    placeholder="0000-0000-0000-0000"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              )}
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Maximum Results</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={publicationImportMaxResults}
                  onChange={(event) => setPublicationImportMaxResults(Math.min(50, Math.max(1, Number(event.target.value) || 1)))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                Google Scholar import is intentionally not enabled here because it does not offer a stable supported public API for production use.
              </div>
              <button
                type="button"
                onClick={() => void handleImportPublications()}
                disabled={isImportingPublications || !publicationImportAuthorName.trim() || (publicationImportSource === 'orcid' && !publicationImportOrcidId.trim())}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isImportingPublications ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
                {isImportingPublications ? 'Importing Publications…' : `Import from ${publicationImportSource === 'orcid' ? 'ORCID' : 'arXiv'}`}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest">Academic Network</h3>
          <button 
            onClick={() => setIsAddingNetwork(true)}
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            <Plus className="size-3" /> Add
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {networkLabels.map((label) => (
            <SocialLink key={label} icon={getNetworkIcon(label)} label={label} onClick={() => void handleNetworkLink(label)} onRemove={!['orcid', 'linkedin', 'twitter'].includes(label.toLowerCase()) ? () => handleRemoveNetwork(label) : undefined} />
          ))}
        </div>

        <AnimatePresence>
          {isAddingNetwork && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
            >
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Network Name</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newNetworkLabel}
                  onChange={(e) => setNewNetworkLabel(e.target.value)}
                  placeholder="e.g. ResearchGate"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                <button 
                  onClick={handleAddNetwork}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold"
                >
                  Add
                </button>
                <button 
                  onClick={() => setIsAddingNetwork(false)}
                  className="text-slate-400 px-2"
                >
                  <X className="size-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {userListModal && (
        <UserListModal 
          title={userListModal.title} 
          users={userListModal.users} 
          onUserSelect={(userLookup) => void handleUserListSelect(userLookup)}
          showToast={showToast}
          onClose={() => setUserListModal(null)} 
        />
      )}
      <AnimatePresence>
        {showProfileImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            onClick={() => setShowProfileImage(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowProfileImage(false)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white"
              >
                <X className="size-5" />
              </button>
              <img src={currentUser.imageUrl} alt={currentUser.name} className="w-full rounded-3xl object-cover shadow-2xl" referrerPolicy="no-referrer" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialLink({ icon, label, onClick, onRemove }: { icon: React.ReactNode, label: string, onClick: () => void, onRemove?: () => void, key?: any }) {
  return (
    <div className="relative">
      <button type="button" onClick={onClick} className="flex w-full flex-col items-center gap-2 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-800/50">
        <div className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm text-primary">
          {icon}
        </div>
        <span className="text-[10px] font-bold">{label}</span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-400 shadow-sm transition-colors hover:text-red-500 dark:bg-slate-700/90"
          aria-label={`Remove ${label}`}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

function EditProfileScreen({ currentUser, onBack, onSaveProfile, showToast }: { currentUser: User, onBack: () => void, onSaveProfile: (payload: { name: string; email: string; orcidId?: string; affiliation: string; bio: string; title: string; imageUrl: string; isAffiliationVerified?: boolean; currentPassword?: string; }) => Promise<void>, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const { dataset } = useAppData();
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email ?? '');
  const [orcidId, setOrcidId] = useState(currentUser.orcidId ?? '');
  const [affiliation, setAffiliation] = useState(currentUser.affiliation);
  const [title, setTitle] = useState(currentUser.title ?? currentUser.affiliation);
  const [bio, setBio] = useState(currentUser.bio);
  const [imageUrl, setImageUrl] = useState(currentUser.imageUrl);
  const [isEmailVerified, setIsEmailVerified] = useState(Boolean(currentUser.isEmailVerified));
  const [isAffiliationVerified, setIsAffiliationVerified] = useState(Boolean(currentUser.isAffiliationVerified));
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isVerifyingAffiliation, setIsVerifyingAffiliation] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const emailChanged = email.trim().toLowerCase() !== (currentUser.email ?? '').toLowerCase();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveProfile({ name, email, orcidId, affiliation, bio, title, imageUrl, isAffiliationVerified });
      showToast('Profile updated successfully!');
      onBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update profile', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const response = await requestEmailVerification();
      if (response.debugToken) {
        await verifyEmail(response.debugToken);
        setIsEmailVerified(true);
        showToast(`Email verified locally for ${email}`);
        return;
      }
      showToast('Verification email sent to ' + email);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to start email verification', 'info');
    }
  };

  const handleVerifyAffiliation = async () => {
    const normalizedAffiliation = affiliation.trim().toLowerCase();
    if (!normalizedAffiliation) {
      showToast('Enter your affiliation first.', 'info');
      return;
    }
    try {
      setIsVerifyingAffiliation(true);
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      const matchedInstitution = dataset.institutions.find((institution) => {
        const institutionName = institution.name.trim().toLowerCase();
        return institutionName === normalizedAffiliation
          || institutionName.includes(normalizedAffiliation)
          || normalizedAffiliation.includes(institutionName);
      });
      if (matchedInstitution) {
        setAffiliation(matchedInstitution.name);
        setTitle((current) => current || matchedInstitution.name);
        setIsAffiliationVerified(true);
        showToast(`Affiliation verified for ${matchedInstitution.name}`);
        return;
      }
      showToast('We could not match that affiliation to a known institution yet.', 'info');
    } finally {
      setIsVerifyingAffiliation(false);
    }
  };

  const handleProfilePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Select an image file.', 'info');
      event.target.value = '';
      return;
    }
    try {
      setIsProcessingPhoto(true);
      const nextImageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : currentUser.imageUrl);
        reader.onerror = () => reject(new Error('Unable to read that image file.'));
        reader.readAsDataURL(file);
      });
      setImageUrl(nextImageUrl);
      showToast('Profile photo updated locally. Save to keep it.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update profile photo', 'info');
    } finally {
      setIsProcessingPhoto(false);
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-background-dark z-10">
        <div className="flex items-center gap-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-lg font-bold">Edit Profile</h2>
        </div>
        <button onClick={handleSave} className="text-primary font-bold">Save</button>
      </header>
      <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img src={imageUrl} alt="" className="size-32 rounded-full object-cover" />
            <div className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg">
              <Camera className="size-4" />
            </div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleProfilePhotoSelect(event)} />
          <button type="button" onClick={() => photoInputRef.current?.click()} disabled={isProcessingPhoto} className="text-primary text-sm font-bold bg-primary/10 px-4 py-2 rounded-lg disabled:opacity-60">
            {isProcessingPhoto ? 'Updating Photo…' : 'Change Profile Photo'}
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Email Address</label>
              {isEmailVerified ? (
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Verified
                </span>
              ) : (
                <button onClick={handleVerifyEmail} className="text-[10px] font-bold text-primary hover:underline">Verify Now</button>
              )}
            </div>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setIsEmailVerified(false); }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
            {emailChanged && (
              <p className="text-xs text-amber-600 dark:text-amber-300">Changing your email requires recent authentication and resets email verification.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">ORCID iD</label>
            <input
              type="text"
              value={orcidId}
              onChange={(e) => setOrcidId(e.target.value)}
              placeholder="0000-0000-0000-0000"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-slate-400">Used to prefill publication imports and open your ORCID profile directly.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Academic Affiliation</label>
              {isAffiliationVerified ? (
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Verified
                </span>
              ) : (
                <button onClick={() => void handleVerifyAffiliation()} disabled={isVerifyingAffiliation} className="text-[10px] font-bold text-primary hover:underline disabled:opacity-60">
                  {isVerifyingAffiliation ? 'Verifying…' : 'Verify Affiliation'}
                </button>
              )}
            </div>
            <input 
              type="text" 
              value={affiliation}
              onChange={(e) => { setAffiliation(e.target.value); setIsAffiliationVerified(false); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Academic Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm" />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Research Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm min-h-[100px]" />
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Save className="size-5" />
          {isSaving ? 'Saving…' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}

function UserProfileScreen({ user, currentUserId, onBack, onPreprintClick, onToggleSave, onToggleFollow, onTagClick, onAuthorClick, onInstitutionClick, onInstitutionHomepageOpen, onMessage, onReport, onBlockUser, onUnblockUser, isBlocked, savedPreprints, showToast }: { 
  user: User, 
  currentUserId: string,
  onBack: () => void, 
  onPreprintClick: (p: Preprint) => void,
  onToggleSave: (p: Preprint) => void,
  onToggleFollow: (user: User) => Promise<void>,
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  onInstitutionClick: (id: string) => void,
  onInstitutionHomepageOpen: (id: string) => void,
  onMessage: (user: User) => void,
  onReport: () => void,
  onBlockUser: (userId: string) => Promise<void>,
  onUnblockUser: (userId: string) => Promise<void>,
  isBlocked: boolean,
  savedPreprints: Preprint[],
  showToast: (msg: string, type?: 'success' | 'info') => void
}) {
  const { dataset } = useAppData();
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userListModal, setUserListModal] = useState<{ title: string; users: UserListEntry[] } | null>(null);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const [followerUsers, setFollowerUsers] = useState<User[]>([]);
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const normalizedUserName = normalizePersonLabel(user.name);
  const userPreprints = sortPreprintsByRecent(dataset.preprints.filter((preprint) => {
    if (user.publications.includes(preprint.id)) {
      return true;
    }
    return preprint.authors.some((author) => {
      const normalizedAuthor = normalizePersonLabel(author);
      return normalizedAuthor === normalizedUserName
        || normalizedAuthor.includes(normalizedUserName)
        || normalizedUserName.includes(normalizedAuthor);
    });
  }));
  const citationCounts = userPreprints.map((preprint) => preprint.citations ?? 0);
  const derivedPublicationCount = userPreprints.length;
  const derivedCitations = citationCounts.reduce((total, citationCount) => total + citationCount, 0);
  const derivedHIndex = getDerivedHIndex(citationCounts);
  const derivedI10Index = citationCounts.filter((citationCount) => citationCount >= 10).length;
  const hasDerivedPublicationStats = derivedPublicationCount > 0;
  const publicationCount = hasDerivedPublicationStats ? derivedPublicationCount : (user.stats.totalPublications || user.stats.preprints);
  const citationCount = hasDerivedPublicationStats ? derivedCitations : user.stats.citations;
  const hIndex = hasDerivedPublicationStats ? derivedHIndex : (user.stats.hIndex || 0);
  const i10Index = hasDerivedPublicationStats ? derivedI10Index : (user.stats.i10Index || 0);
  const profileUrl = `${window.location.origin}/?profile=${user.id}`;
  const institutionRecord = dataset.institutions.find((institution) => institution.id === user.institutionId || institution.name === user.affiliation);
  const citationContacts = Array.from(new Map(
    userPreprints.flatMap((preprint) => (preprint.citedBy ?? []).map((citation) => {
      const matchedUser = dataset.users.find((datasetUser) => datasetUser.id === citation || datasetUser.name === citation);
      return [
        matchedUser?.id ?? citation,
        {
          id: matchedUser?.id ?? citation,
          label: matchedUser?.name ?? citation,
          lookupValue: matchedUser?.id ?? citation,
          meta: 'Cited this researcher',
        } satisfies UserListEntry,
      ] as const;
    })),
  ).values());

  useEffect(() => {
    setIsFollowing(user.isFollowing);
  }, [user.isFollowing]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingConnections(true);
    fetchUserConnections(user.id)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setFollowerUsers(response.followers);
        setFollowingUsers(response.following);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setFollowerUsers([]);
        setFollowingUsers([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingConnections(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const handleFollow = async () => {
    if (user.id === currentUserId) {
      return;
    }
    if (isBlocked) {
      showToast('Unblock this user before following', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await onToggleFollow(user);
      showToast(isFollowing ? `Unfollowed ${user.name}` : `Following ${user.name}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update follow status', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockToggle = async () => {
    if (user.id === currentUserId) {
      return;
    }
    try {
      setIsSubmitting(true);
      if (isBlocked) {
        await onUnblockUser(user.id);
        showToast(`${user.name} unblocked`);
      } else {
        await onBlockUser(user.id);
        showToast(`${user.name} blocked`);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update blocked status', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthorClick = (author: string) => {
    if (author === user.name) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onAuthorClick(author);
  };

  const handleProfileShare = async () => {
    await copyText(profileUrl);
    showToast('Profile link copied to clipboard');
  };

  const handleInstitutionAction = async () => {
    if (institutionRecord) {
      onInstitutionClick(institutionRecord.id);
      return;
    }
    onInstitutionClick(user.affiliation);
  };

  const handleNetworkLink = (network: 'orcid' | 'linkedin' | 'twitter') => {
    const query = encodeURIComponent(`${user.name} ${user.affiliation}`.trim());
    if (network === 'orcid') {
      window.open(user.orcidId ? `https://orcid.org/${user.orcidId}` : `https://orcid.org/orcid-search/search?searchQuery=${query}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (network === 'linkedin') {
      window.open(`https://www.linkedin.com/search/results/all/?keywords=${query}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(`https://twitter.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
  };

  const openConnectionList = (title: string, users: User[], emptyLabel: string) => {
    if (users.length === 0) {
      showToast(isLoadingConnections ? 'Loading profile connections…' : emptyLabel, 'info');
      return;
    }
    setUserListModal({
      title,
      users: users.map((connectionUser) => ({
        id: connectionUser.id,
        label: connectionUser.name,
        lookupValue: connectionUser.id,
        meta: connectionUser.affiliation,
      })),
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 sticky top-0 bg-white dark:bg-slate-950 z-20">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-lg font-bold truncate">{user.name}</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <div className="flex flex-col items-center text-center mb-8">
          <button type="button" onClick={() => setShowProfileImage(true)} className="mb-4 rounded-full transition-transform hover:scale-[1.02]" aria-label={`View ${user.name}'s profile photo`}>
            <img 
              src={user.imageUrl} 
              alt={user.name} 
              className="size-32 rounded-full border-4 border-primary/10 object-cover"
            />
          </button>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-primary font-medium text-sm">{user.title || user.affiliation}</p>
          <button 
            onClick={() => void handleInstitutionAction()}
            className="text-primary font-medium text-sm hover:underline flex items-center gap-1"
          >
            {user.affiliation}
            {user.isAffiliationVerified && <CheckCircle2 className="size-3 text-emerald-500" />}
          </button>
          
          {isBlocked && user.id !== currentUserId && (
            <div className="mt-6 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200">
              You have blocked this user. Messaging, follows, and sharing are disabled until you unblock them.
            </div>
          )}

          <div className="flex gap-3 mt-6 w-full">
            <button 
              onClick={handleFollow}
              disabled={isSubmitting || user.id === currentUserId || isBlocked}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${isBlocked ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : isFollowing ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
            >
              {user.id === currentUserId ? 'You' : isSubmitting ? 'Updating…' : isBlocked ? 'Blocked' : isFollowing ? 'Following' : 'Follow'}
            </button>
            <button 
              onClick={() => onMessage(user)}
              disabled={isBlocked || user.id === currentUserId}
              className="px-4 border border-slate-200 dark:border-slate-700 py-2.5 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Message
            </button>
            <button
              type="button"
              onClick={() => void handleProfileShare()}
              className="px-4 border border-slate-200 dark:border-slate-700 py-2.5 rounded-lg font-bold text-sm"
            >
              Share
            </button>
          </div>

          {user.id !== currentUserId && (
            <div className="mt-3 grid w-full grid-cols-2 gap-3">
              <button
                onClick={onReport}
                className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-2.5 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <AlertTriangle className="size-4" />
                Report
              </button>
              <button
                onClick={() => void handleBlockToggle()}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors ${isBlocked ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
              >
                <Lock className="size-4" />
                {isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-4 border-y border-slate-100 dark:border-slate-800 py-4 mb-8 overflow-x-auto no-scrollbar">
          <div className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{publicationCount.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">Pubs</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <button type="button" onClick={() => openConnectionList('Followers', followerUsers, 'This researcher does not have visible followers yet.')} className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{user.stats.followers || user.followers}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">Followers</p>
          </button>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{hIndex}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">h-index</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{i10Index}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">i10-index</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <button type="button" onClick={() => setUserListModal({ title: 'Cited By', users: citationContacts })} className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{formatCompactCount(citationCount)}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">Cites</p>
          </button>
        </div>

        <div className="mb-8 flex items-center justify-center gap-8 text-center">
          <button
            type="button"
            onClick={() => openConnectionList('Following', followingUsers, 'This researcher is not following any visible profiles yet.')}
            className="group"
          >
            <p className="text-lg font-bold transition-colors group-hover:text-primary">{user.following.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Following</p>
          </button>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-3">
          <SocialLink icon={<Quote />} label="ORCID" onClick={() => handleNetworkLink('orcid')} />
          <SocialLink icon={<Linkedin />} label="LinkedIn" onClick={() => handleNetworkLink('linkedin')} />
          <SocialLink icon={<Twitter />} label="Twitter" onClick={() => handleNetworkLink('twitter')} />
        </div>

        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">About</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {user.bio}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-4">Recent Publications</h3>
          <div className="space-y-4">
            {userPreprints.length > 0 ? userPreprints.map(p => {
              const isSaved = savedPreprints.some(sp => sp.id === p.id);
              return (
              <PreprintCard 
                  key={p.id} 
                  preprint={{ ...p, isSaved }} 
                  onClick={() => onPreprintClick(p)} 
                  onToggleSave={() => onToggleSave(p)} 
                  onTagClick={onTagClick}
                  onAuthorClick={handleAuthorClick}
                  showToast={showToast}
                />
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
                No linked publications are available for this researcher yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {userListModal && (
          <UserListModal
            title={userListModal.title}
            users={userListModal.users}
            onUserSelect={(userLookup) => onAuthorClick(userLookup)}
            onClose={() => setUserListModal(null)}
            showToast={showToast}
          />
        )}
        {showProfileImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            onClick={() => setShowProfileImage(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowProfileImage(false)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white"
              >
                <X className="size-5" />
              </button>
              <img src={user.imageUrl} alt={user.name} className="w-full rounded-3xl object-cover shadow-2xl" referrerPolicy="no-referrer" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TagResultsScreen({ tag, onBack, preprints, onPreprintClick, onToggleSave, savedPreprints, onTagClick, onAuthorClick, showToast }: { 
  tag: string, 
  onBack: () => void, 
  preprints: Preprint[], 
  onPreprintClick: (p: Preprint) => void,
  onToggleSave: (p: Preprint) => void,
  savedPreprints: Preprint[],
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  showToast: (msg: string) => void
}) {
  const filteredPreprints = preprints.filter(p => p.tags.includes(tag));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 sticky top-0 bg-white dark:bg-slate-950 z-20">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <div>
          <h2 className="text-lg font-bold">#{tag}</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{filteredPreprints.length} Results</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {filteredPreprints.map(p => {
          const isSaved = savedPreprints.some(sp => sp.id === p.id);
          return (
            <PreprintCard 
              key={p.id} 
              preprint={{ ...p, isSaved }} 
              onClick={() => onPreprintClick(p)} 
              onToggleSave={() => onToggleSave(p)}
              onTagClick={onTagClick}
              onAuthorClick={onAuthorClick}
              showToast={showToast}
            />
          );
        })}
      </div>
    </div>
  );
}

function CitationModal({ preprint, onClose, showToast }: { preprint: Preprint, onClose: () => void, showToast: (msg: string) => void }) {
  const [style, setStyle] = useState<'APA' | 'MLA' | 'Chicago' | 'BibTeX'>('APA');

  const generateCitation = () => {
    const authors = preprint.authors.join(', ');
    const year = preprint.date.split(', ')[1] || '2023';
    const title = preprint.title;
    const source = preprint.source;

    switch (style) {
      case 'APA':
        return `${authors}. (${year}). ${title}. ${source}.`;
      case 'MLA':
        return `${authors}. "${title}." ${source}, ${year}.`;
      case 'Chicago':
        return `${authors}. "${title}." ${source} (${year}).`;
      case 'BibTeX':
        return `@article{preprint${preprint.id},\n  author = {${preprint.authors.join(' and ')}},\n  title = {${title}},\n  journal = {${source}},\n  year = {${year}}\n}`;
      default:
        return '';
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateCitation());
    showToast(`Citation copied in ${style} style!`);
  };

  const downloadCitation = () => {
    const extension = style === 'BibTeX' ? 'bib' : 'txt';
    const fileBase = preprint.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'citation';
    downloadTextFile(`${fileBase}-citation.${extension}`, generateCitation());
    showToast(`Citation downloaded in ${style} format`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold">Generate Citation</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['APA', 'MLA', 'Chicago', 'BibTeX'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${style === s ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[120px] flex items-center justify-center">
            <p className="text-sm font-mono leading-relaxed text-center">
              {generateCitation()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={copyToClipboard}
              className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Copy className="size-5" />
              Copy
            </button>
            <button 
              onClick={downloadCitation}
              className="w-full border border-slate-200 dark:border-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              <Download className="size-5" />
              Download
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  isConfirming = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[180] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button onClick={onCancel} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
            {cancelLabel}
          </button>
          <button type="button" onClick={() => void onConfirm()} disabled={isConfirming} className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-70">
            {isConfirming ? 'Working…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReportModal({
  targetLabel,
  onCancel,
  onSubmit,
}: {
  targetLabel: string;
  onCancel: () => void;
  onSubmit: (reason: 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other', details: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other'>('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSubmit(reason, details.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonOptions: Array<{ value: 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other'; label: string }> = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'copyright', label: 'Copyright' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[180] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Report Content</h3>
            <p className="mt-1 text-sm text-slate-500">
              Submit a moderation report for {targetLabel}.
            </p>
          </div>
          <button onClick={onCancel} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {reasonOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option.value)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-colors ${reason === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Details</label>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Include any context that would help a reviewer."
              className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-70">
              {isSubmitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function RecentAuthModal({ title, description, allowPasskey, allowTwoFactor, onCancel, onConfirm, showToast }: {
  title: string;
  description: string;
  allowPasskey: boolean;
  allowTwoFactor: boolean;
  onCancel: () => void;
  onConfirm: (payload: RecentAuthPayload) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'info') => void;
}) {
  const [method, setMethod] = useState<'password' | '2fa' | 'passkey'>(allowPasskey ? 'passkey' : allowTwoFactor ? '2fa' : 'password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'passkey') {
      try {
        setIsSubmitting(true);
        await onConfirm({ method: 'passkey' });
        showToast('Identity confirmed');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to verify identity', 'info');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    if (method === 'password' && !currentPassword.trim()) {
      showToast('Enter your current password', 'info');
      return;
    }
    if (method === '2fa' && !twoFactorCode.trim()) {
      showToast('Enter your authenticator or backup code', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await onConfirm(method === 'password'
        ? { method: 'password', currentPassword }
        : { method: '2fa', twoFactorCode });
      showToast('Identity confirmed');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to verify identity', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[180] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button onClick={onCancel} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="size-5" />
          </button>
        </div>

        {(allowPasskey || allowTwoFactor) && (
          <div className="mb-5 flex gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            {allowPasskey && (
              <button
                onClick={() => setMethod('passkey')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${method === 'passkey' ? 'bg-white text-primary shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}
              >
                Passkey
              </button>
            )}
            {allowTwoFactor && (
              <button
                onClick={() => setMethod('2fa')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${method === '2fa' ? 'bg-white text-primary shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}
              >
                Authenticator
              </button>
            )}
            <button
              onClick={() => setMethod('password')}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${method === 'password' ? 'bg-white text-primary shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}
            >
              Password
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {method === 'passkey' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              Use a registered passkey on this device to confirm your identity.
            </div>
          ) : method === 'password' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Authenticator Or Backup Code</label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="123456 or ABCD-EFGH"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20">
              {isSubmitting ? 'Verifying…' : method === 'passkey' ? 'Use Passkey' : 'Confirm'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function LoginScreen({ onLogin, onPasskeyLogin, onCompleteTwoFactorLogin, onRegister, showToast }: { onLogin: (email: string, password: string) => Promise<TwoFactorLoginPayload | null>, onPasskeyLogin: (email: string) => Promise<void>, onCompleteTwoFactorLogin: (challengeToken: string, code: string, rememberDevice: boolean) => Promise<void>, onRegister: () => void, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<{ challengeToken: string; user: { name: string; email?: string } } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      try {
        setIsSubmitting(true);
        const result = await onLogin(email, password);
        if (result?.requiresTwoFactor) {
          setTwoFactorChallenge({ challengeToken: result.challengeToken, user: result.user });
          showToast('Enter your authenticator or backup code');
        } else {
          showToast('Signed in successfully');
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to sign in', 'info');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showToast('Please enter your credentials', 'info');
    }
  };

  const handleTwoFactorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorChallenge || !twoFactorCode.trim()) {
      showToast('Enter your two-factor code', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await onCompleteTwoFactorLogin(twoFactorChallenge.challengeToken, twoFactorCode, rememberDevice);
      showToast('Two-factor verification complete');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to verify two-factor code', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async () => {
    if (!resetEmail.trim()) {
      showToast('Enter your account email first', 'info');
      return;
    }
    try {
      setIsResetSubmitting(true);
      const response = await requestPasswordReset(resetEmail);
      if (response.debugToken) {
        setResetToken(response.debugToken);
      }
      showToast(response.debugToken ? 'Reset token generated for local development' : response.message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to request password reset', 'info');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim() || !newResetPassword.trim()) {
      showToast('Reset token and new password are required', 'info');
      return;
    }
    try {
      setIsResetSubmitting(true);
      await resetPassword(resetToken, newResetPassword);
      showToast('Password reset successfully. You can now sign in.');
      setShowResetForm(false);
      setPassword('');
      setResetToken('');
      setNewResetPassword('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to reset password', 'info');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!email.trim()) {
      showToast('Enter your email to use a passkey', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await onPasskeyLogin(email);
      showToast('Signed in with passkey');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to sign in with passkey', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-8 justify-center bg-white dark:bg-slate-950">
      <div className="mb-12 text-center">
        <div className="size-20 bg-primary rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-xl shadow-primary/20">
          <BookOpen className="size-10" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Preprint Explorer</h1>
        <p className="text-slate-500">The pulse of global research</p>
      </div>

      {twoFactorChallenge ? (
        <form onSubmit={handleTwoFactorLogin} className="space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
            <p className="text-sm font-bold">Two-Factor Verification</p>
            <p className="mt-1 text-xs text-slate-500">Enter the 6-digit code for {twoFactorChallenge.user.email ?? twoFactorChallenge.user.name} or use a backup code.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Authentication Code</label>
            <input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="123456 or ABCD-EFGH"
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Remember this browser for 30 days
          </label>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            {isSubmitting ? 'Verifying…' : 'Verify Sign In'}
          </button>
          <button type="button" onClick={() => { setTwoFactorChallenge(null); setTwoFactorCode(''); }} className="w-full text-sm font-medium text-slate-500">
            Use a different account
          </button>
        </form>
      ) : (
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="aris.thorne@uzh.ch"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="••••••••"
          />
        </div>
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          {isSubmitting ? 'Signing In…' : 'Sign In'}
        </button>
        <button
          type="button"
          onClick={handlePasskeyLogin}
          disabled={isSubmitting}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-4 font-bold text-slate-700 dark:text-slate-200 transition-all"
        >
          Use Passkey
        </button>
      </form>
      )}

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            setResetEmail(email);
            setShowResetForm(value => !value);
          }}
          className="text-sm font-medium text-slate-500 hover:text-primary"
        >
          Forgot password?
        </button>
      </div>

      <AnimatePresence>
        {showResetForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 space-y-4"
          >
            <div>
              <h3 className="text-sm font-bold">Reset Password</h3>
              <p className="text-xs text-slate-500 mt-1">In local development, the token is returned here instead of sent by email.</p>
            </div>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Account email"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm outline-none"
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Reset token"
                className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm outline-none"
              />
              <button onClick={handleRequestReset} disabled={isResetSubmitting} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold">
                Token
              </button>
            </div>
            <input
              type="password"
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm outline-none"
            />
            <button onClick={handleResetPassword} disabled={isResetSubmitting} className="w-full rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 px-4 py-3 text-sm font-bold text-white">
              {isResetSubmitting ? 'Working…' : 'Reset Password'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 text-center">
        <p className="text-sm text-slate-500 mb-4">Don't have an account?</p>
        <button 
          onClick={onRegister}
          className="text-primary font-bold hover:underline"
        >
          Create Academic Account
        </button>
      </div>
    </div>
  );
}

function RegisterScreen({ onBack, onRegister, onLegal, showToast }: { onBack: () => void, onRegister: (name: string, email: string, affiliation: string, password: string) => Promise<void>, onLegal: (type: 'tos' | 'privacy') => void, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      showToast('Please agree to the Terms of Service and Privacy Policy', 'info');
      return;
    }
    if (name && email && affiliation && password) {
      try {
        setIsSubmitting(true);
        await onRegister(name, email, affiliation, password);
        showToast('Account created successfully');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to create account', 'info');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showToast('Please fill in all fields', 'info');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-6 flex items-center gap-4">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-xl font-bold">Register</h2>
      </header>

      <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Join the Network</h1>
          <p className="text-sm text-slate-500">Connect with 2M+ researchers worldwide.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Dr. Aris Thorne"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="aris.thorne@uzh.ch"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Affiliation</label>
            <input 
              type="text" 
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="University of Zurich"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-start gap-3 mt-4">
            <div 
              onClick={() => setAgreed(!agreed)}
              className={`mt-1 size-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${agreed ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}
            >
              {agreed && <Check className="size-3.5 text-white" />}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              I agree to the <button type="button" onClick={() => onLegal('tos')} className="text-primary font-bold hover:underline">Terms of Service</button> and <button type="button" onClick={() => onLegal('privacy')} className="text-primary font-bold hover:underline">Privacy Policy</button>.
            </p>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all mt-4"
          >
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold">{label}</label>
      <input type="text" defaultValue={value} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm" />
    </div>
  );
}

function NotificationsScreen({ settings, activeTab, onChangeTab, onOpenNotification, onBack, showToast, onRefreshNotifications }: { settings: UserSettings, activeTab: 'all' | 'research' | 'network' | 'system', onChangeTab: (tab: 'all' | 'research' | 'network' | 'system') => void, onOpenNotification: (notification: Notification) => Promise<void>, onBack: () => void, showToast: (msg: string) => void, onRefreshNotifications: () => Promise<void> }) {
  const { dataset } = useAppData();

  const visibleNotifications = dataset.notifications.filter((notification) => isNotificationVisible(notification, settings));
  const researchNotifications = visibleNotifications.filter((notification) => getNotificationCategory(notification) === 'research');
  const networkNotifications = visibleNotifications.filter((notification) => getNotificationCategory(notification) === 'network');
  const systemNotifications = visibleNotifications.filter((notification) => getNotificationCategory(notification) === 'system');

  const filteredNotifications = visibleNotifications.filter(n => {
    if (activeTab === 'all') return true;
    return getNotificationCategory(n) === activeTab;
  });

  const sections = [
    { key: 'research', title: 'Research Alerts', items: filteredNotifications.filter((notification) => getNotificationCategory(notification) === 'research') },
    { key: 'network', title: 'Network & Messages', items: filteredNotifications.filter((notification) => getNotificationCategory(notification) === 'network') },
    { key: 'system', title: 'System & Account', items: filteredNotifications.filter((notification) => getNotificationCategory(notification) === 'system') },
  ].filter((section) => section.items.length > 0 || activeTab === section.key);

  const unreadCounts = {
    research: researchNotifications.filter((notification) => notification.isNew).length,
    network: networkNotifications.filter((notification) => notification.isNew).length,
    system: systemNotifications.filter((notification) => notification.isNew).length,
  };

  const emptyStateTitle = activeTab === 'all'
    ? 'No visible notifications'
    : activeTab === 'research'
      ? 'No research alerts'
      : activeTab === 'network'
        ? 'No network or message alerts'
        : 'No system notices';
  const emptyStateDescription = activeTab === 'all'
    ? 'Turn on publication, citation, or product updates in Settings to see more alerts here.'
    : activeTab === 'research'
      ? 'Feed and citation alerts will appear here when they are available.'
      : activeTab === 'network'
        ? 'Follows, paper shares, and direct messages will appear here when they arrive.'
        : 'Product updates, moderation results, and account notices will appear here when relevant.';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-xl font-bold">Notifications</h2>
        </div>
        <button 
          onClick={() => {
            const handler = activeTab === 'all'
              ? markNotificationsRead().then(onRefreshNotifications).then(() => showToast('All notifications marked as read'))
              : Promise.all(filteredNotifications.filter((notification) => notification.isNew).map((notification) => markNotificationRead(notification.id)))
                .then(onRefreshNotifications)
                .then(() => showToast('Visible notifications marked as read'));
            handler
              .catch((error) => showToast(error instanceof Error ? error.message : 'Unable to mark notifications as read'));
          }}
          disabled={activeTab !== 'all' && !filteredNotifications.some((notification) => notification.isNew)}
          className="text-primary font-bold text-sm disabled:opacity-50"
        >
          {activeTab === 'all' ? 'Mark all' : 'Mark visible'}
        </button>
      </header>

      <div className="grid grid-cols-4 border-b border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => onChangeTab('all')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          All
        </button>
        <button 
          onClick={() => onChangeTab('research')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'research' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          Research {unreadCounts.research > 0 ? `(${unreadCounts.research})` : ''}
        </button>
        <button 
          onClick={() => onChangeTab('network')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'network' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          Network {unreadCounts.network > 0 ? `(${unreadCounts.network})` : ''}
        </button>
        <button 
          onClick={() => onChangeTab('system')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          System {unreadCounts.system > 0 ? `(${unreadCounts.system})` : ''}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-20">
        {sections.map((section) => (
          <div key={section.key}>
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">{section.title}</h3>
            <div className="space-y-4">
              {section.items.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onClick={() => void onOpenNotification(notification)} />
              ))}
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <BellOff className="size-8" />
            </div>
            <h4 className="text-lg font-bold mb-1">{emptyStateTitle}</h4>
            <p className="text-sm text-slate-500">{emptyStateDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notification, onClick }: { notification: Notification, onClick: () => void, key?: string | number }) {
  const label = getNotificationLabel(notification);
  const getIcon = () => {
    switch (notification.type) {
      case 'feed': return <Rss className="size-6" />;
      case 'citation': return <Quote className="size-6" />;
      case 'collab': return <UserPlus className="size-6" />;
      case 'comment': return <MessageSquare className="size-6" />;
      case 'product': return <Zap className="size-6" />;
      case 'message': return <Send className="size-6" />;
      case 'moderation': return <ShieldCheck className="size-6" />;
      case 'account': return <Shield className="size-6" />;
      default: return <Bell className="size-6" />;
    }
  };

  const getIconBg = () => {
    switch (notification.type) {
      case 'feed': return 'bg-blue-600 text-white';
      case 'citation': return 'bg-emerald-100 text-emerald-600';
      case 'collab': return 'bg-amber-100 text-amber-600';
      case 'comment': return 'bg-indigo-100 text-indigo-600';
      case 'product': return 'bg-violet-100 text-violet-600';
      case 'message': return 'bg-sky-100 text-sky-600';
      case 'moderation': return 'bg-rose-100 text-rose-600';
      case 'account': return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <button type="button" onClick={onClick} className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4 shadow-sm text-left transition-colors hover:border-primary/30">
      <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${getIconBg()}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-sm font-bold leading-tight">{notification.title}</h4>
          <span className="text-[10px] text-slate-400 font-medium">{notification.time}</span>
        </div>
        <div className="mb-2">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {label}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{notification.description}</p>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-slate-300" />
    </button>
  );
}

function TrendsScreen({ onTopicClick, onAuthorClick, onTagClick, onInstitutionClick, onInstitutionHomepageOpen, onSearch, showToast }: { 
  onTopicClick: () => void, 
  onAuthorClick: (id: string) => void,
  onTagClick: (tag: string) => void,
  onInstitutionClick: (id: string) => void,
  onInstitutionHomepageOpen: (id: string) => void,
  onSearch: (query: string) => void,
  showToast: (msg: string) => void 
}) {
  const { dataset } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [researcherSearchQuery, setResearcherSearchQuery] = useState('');
  const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'global' | 'field'>('global');
  const [alertsEnabled, setAlertsEnabled] = useState(() => storageService.getTrendAlertsEnabled());
  const [showAllRisingStars, setShowAllRisingStars] = useState(false);
  const [volumeWindow, setVolumeWindow] = useState<'12m' | '6m'>('12m');
  const researcherInputRef = useRef<HTMLInputElement | null>(null);
  const parseTrendDate = (preprint: Preprint) => {
    const parsed = new Date(preprint.publishedAt ?? preprint.date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const normalizedTrendQuery = searchQuery.trim().toLowerCase();
  const totalCitations = dataset.preprints.reduce((sum, preprint) => sum + (preprint.citations || 0), 0);
  const averageCitations = dataset.preprints.length > 0 ? totalCitations / dataset.preprints.length : 0;
  const totalSaves = dataset.preprints.reduce((sum, preprint) => sum + (preprint.savesCount || 0), 0);
  const averageSaves = dataset.preprints.length > 0 ? totalSaves / dataset.preprints.length : 0;
  const sourceCount = new Set(dataset.preprints.map((preprint) => preprint.source)).size;
  const globalMetrics = [
    {
      label: 'Tracked Papers',
      value: dataset.preprints.length.toLocaleString(),
      change: `${sourceCount} active sources`,
      icon: 'FileText',
      trend: 'up' as const,
      targetTag: null,
    },
    {
      label: 'Average Citations',
      value: averageCitations.toFixed(1),
      change: `${totalCitations.toLocaleString()} total cites`,
      icon: 'Quote',
      trend: 'up' as const,
      targetTag: null,
    },
    {
      label: 'Average Saves',
      value: averageSaves.toFixed(1),
      change: `${totalSaves.toLocaleString()} total saves`,
      icon: 'TrendingUp',
      trend: 'up' as const,
      targetTag: null,
    },
  ].filter((metric) => !normalizedTrendQuery || metric.label.toLowerCase().includes(normalizedTrendQuery) || metric.change.toLowerCase().includes(normalizedTrendQuery));

  const tagSummaries = (Object.entries(
    dataset.preprints.reduce<Record<string, { count: number; citations: number }>>((accumulator, preprint) => {
      preprint.tags.forEach((tag) => {
        const current = accumulator[tag] ?? { count: 0, citations: 0 };
        accumulator[tag] = {
          count: current.count + 1,
          citations: current.citations + (preprint.citations || 0),
        };
      });
      return accumulator;
    }, {}),
  ) as Array<[string, { count: number; citations: number }]>)
    .map(([tag, summary]) => ({
      label: tag,
      value: summary.count.toLocaleString(),
      change: `${summary.citations.toLocaleString()} cites`,
      icon: 'TrendingUp',
      trend: 'up' as const,
      targetTag: tag,
      count: summary.count,
    }))
    .sort((left, right) => right.count - left.count);

  const displayedMetrics = (activeTab === 'field' ? tagSummaries : globalMetrics)
    .filter((metric) => !normalizedTrendQuery || metric.label.toLowerCase().includes(normalizedTrendQuery) || metric.change.toLowerCase().includes(normalizedTrendQuery))
    .slice(0, activeTab === 'field' ? 6 : 3);
  const displayedRisingStars = showAllRisingStars ? dataset.risingStars : dataset.risingStars.slice(0, 3);
  const derivedPublicationVolumeData = (Object.values(
    dataset.preprints.reduce<Record<string, { month: string; papers: number; timestamp: number }>>((accumulator, preprint) => {
      const parsed = parseTrendDate(preprint);
      if (!parsed) {
        return accumulator;
      }
      const month = formatAbsoluteDate(parsed, { month: 'short', year: 'numeric' });
      const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
      const current = accumulator[key] ?? { month, papers: 0, timestamp: new Date(parsed.getFullYear(), parsed.getMonth(), 1).getTime() };
      accumulator[key] = {
        ...current,
        papers: current.papers + 1,
      };
      return accumulator;
    }, {}),
  ) as Array<{ month: string; papers: number; timestamp: number }>)
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ month, papers }) => ({ month, papers }));
  const publicationVolumeSource = derivedPublicationVolumeData.length > 1 ? derivedPublicationVolumeData : dataset.publicationVolume;
  const publicationVolumeData = volumeWindow === '6m' ? publicationVolumeSource.slice(-6) : publicationVolumeSource;
  const totalPublicationCount = publicationVolumeData.reduce((sum, point) => sum + point.papers, 0);
  const leadingInstitution = [...dataset.institutions].sort((left, right) => right.stats.citations - left.stats.citations)[0];
  const topTopicLabels = tagSummaries.slice(0, 8).map((item) => item.label);
  const displayedTopics = topTopicLabels.filter((topic) => !normalizedTrendQuery || topic.toLowerCase().includes(normalizedTrendQuery));
  const primaryInterestLabel = topTopicLabels[0] ?? 'Primary Track';
  const secondaryInterestLabel = topTopicLabels[1] ?? 'Secondary Track';
  const derivedWeeklyInterestData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({ day, primary: 0, secondary: 0 }));
  dataset.preprints.forEach((preprint) => {
    const parsed = parseTrendDate(preprint);
    if (!parsed) {
      return;
    }
    const dayIndex = (parsed.getDay() + 6) % 7;
    const bucket = derivedWeeklyInterestData[dayIndex];
    if (!bucket) {
      return;
    }
    if (primaryInterestLabel !== 'Primary Track' && preprint.tags.includes(primaryInterestLabel)) {
      bucket.primary += 1;
    }
    if (secondaryInterestLabel !== 'Secondary Track' && preprint.tags.includes(secondaryInterestLabel)) {
      bucket.secondary += 1;
    }
  });
  const hasDerivedWeeklyInterest = derivedWeeklyInterestData.some((point) => point.primary > 0 || point.secondary > 0);
  const weeklyInterestData = hasDerivedWeeklyInterest
    ? derivedWeeklyInterestData
    : dataset.weeklyTrends.map((point) => ({ day: point.day, primary: point.quantum, secondary: point.ai }));
  const weeklyInterestPrimaryLabel = hasDerivedWeeklyInterest ? primaryInterestLabel : 'Quantum';
  const weeklyInterestSecondaryLabel = hasDerivedWeeklyInterest ? secondaryInterestLabel : 'AI';
  const normalizedResearcherQuery = researcherSearchQuery.trim().toLowerCase();
  const filteredResearchers = [...dataset.users]
    .filter((user) => {
      if (!normalizedResearcherQuery) {
        return true;
      }
      return user.name.toLowerCase().includes(normalizedResearcherQuery)
        || user.affiliation.toLowerCase().includes(normalizedResearcherQuery)
        || user.bio.toLowerCase().includes(normalizedResearcherQuery)
        || (user.title ?? '').toLowerCase().includes(normalizedResearcherQuery);
    })
    .sort((left, right) => right.stats.citations - left.stats.citations)
    .slice(0, normalizedResearcherQuery ? 8 : 4);
  const filteredInstitutions = [...dataset.institutions]
    .filter((institution) => {
      const normalizedQuery = institutionSearchQuery.trim().toLowerCase();
      if (!normalizedQuery) {
        return true;
      }
      return institution.name.toLowerCase().includes(normalizedQuery)
        || institution.location.toLowerCase().includes(normalizedQuery)
        || institution.description.toLowerCase().includes(normalizedQuery);
    })
    .sort((left, right) => right.stats.citations - left.stats.citations)
    .slice(0, institutionSearchQuery.trim() ? 8 : 4);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <TrendingUp className="size-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Research Trends</h2>
        </div>
        <button
          onClick={() => {
            const nextValue = !alertsEnabled;
            setAlertsEnabled(nextValue);
            storageService.setTrendAlertsEnabled(nextValue);
            showToast(nextValue ? 'Trend alerts enabled' : 'Trend alerts paused');
          }}
          className={`rounded-full p-1.5 transition-colors ${alertsEnabled ? 'bg-primary/10 text-primary' : 'text-slate-400'}`}
        >
          <Bell className="size-5" />
        </button>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto no-scrollbar pb-24">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
          <input 
            type="text" 
            placeholder="Search research fields (e.g. CRISPR, LLMs)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </form>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'global' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Global Trends
          </button>
          <button 
            onClick={() => setActiveTab('field')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'field' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-500'}`}
          >
            Field Insights
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {displayedMetrics.length > 0 ? (
            displayedMetrics.map((metric, i) => (
              <div 
                key={i} 
                onClick={() => metric.targetTag && onTagClick(metric.targetTag)}
                className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all group ${metric.targetTag ? 'cursor-pointer hover:border-primary/30' : ''}`}
              >
                <div className="flex items-center gap-2 text-primary mb-2 group-hover:scale-105 transition-transform">
                  {metric.icon === 'FileText' ? <Database className="size-4" /> : 
                   metric.icon === 'Quote' ? <Quote className="size-4" /> : <TrendingUp className="size-4" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{metric.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold">{metric.value}</span>
                  <span className="text-emerald-500 text-sm font-bold flex items-center gap-1">
                    <TrendingUp className="size-4" />
                    {metric.change}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-500 text-sm">
              No trends found for "{searchQuery}"
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold">Publication Volume</h3>
              <p className="text-xs text-slate-500">{totalPublicationCount.toLocaleString()} papers across the current research window</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button type="button" onClick={() => setVolumeWindow('12m')} className={`px-3 py-1 text-[10px] font-bold rounded ${volumeWindow === '12m' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}>12M</button>
              <button type="button" onClick={() => setVolumeWindow('6m')} className={`px-3 py-1 text-[10px] font-bold rounded ${volumeWindow === '6m' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}>6M</button>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={publicationVolumeData}>
                <defs>
                  <linearGradient id="colorPapers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="papers" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPapers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-wider">
            <span>{publicationVolumeData[0]?.month ?? 'Start'}</span>
            <span>{publicationVolumeData[publicationVolumeData.length - 1]?.month ?? 'Now'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              <h3 className="text-lg font-bold">Trending Topics</h3>
            </div>
            <button onClick={onTopicClick} className="text-[10px] font-bold text-primary uppercase tracking-wider">Insights</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayedTopics.map((topic, i) => (
              <button 
                key={topic} 
                onClick={() => onTagClick(topic)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 ${
                  topic === 'Shor\'s Algorithm' ? 'bg-primary/10 text-primary border border-primary/20' : 
                  topic === 'Fault Tolerance' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                  'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700'
                }`}
              >
                {topic}
              </button>
            ))}
            {displayedTopics.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700">
                No trending topics match that search yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <h3 className="text-lg font-bold">Weekly Interest</h3>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyInterestData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                />
                <Bar dataKey="primary" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="secondary" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-blue-500"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{weeklyInterestPrimaryLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{weeklyInterestSecondaryLabel}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              <h3 className="text-lg font-bold">Rising Stars</h3>
            </div>
            <button onClick={() => setShowAllRisingStars((current) => !current)} className="text-xs font-bold text-primary">
              {showAllRisingStars ? 'Show Less' : 'View All'}
            </button>
          </div>
          <div className="space-y-6">
            {displayedRisingStars.map(star => (
              <div 
                key={star.id} 
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => onAuthorClick(dataset.users.find((user) => normalizePersonLabel(user.name) === normalizePersonLabel(star.name))?.id ?? star.name)}
              >
                <img src={star.imageUrl} alt="" className="size-12 rounded-full object-cover border-2 border-primary/20 group-hover:border-primary transition-all" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{star.name}</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{star.affiliation}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-500 block">{star.growth}</span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Growth</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="size-5 text-primary" />
            <h3 className="text-lg font-bold">Find Researchers & Institutions</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Connect with experts and explore leading research centers.
            {leadingInstitution ? ` Current citation leader: ${leadingInstitution.name}.` : ''}
          </p>
          
          <div className="space-y-3">
            <button 
              type="button"
              onClick={() => researcherInputRef.current?.focus()}
              className="w-full bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                  <Users className="size-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Search Researchers</p>
                  <p className="text-[10px] text-slate-400 font-medium">Find by name, field, or h-index</p>
                </div>
              </div>
              <ChevronRight className="size-5 text-slate-300 group-hover:text-primary transition-colors" />
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={researcherInputRef}
                  type="text"
                  value={researcherSearchQuery}
                  onChange={(event) => setResearcherSearchQuery(event.target.value)}
                  placeholder="Search researchers by name, title, field, or institution"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div className="space-y-3">
                {filteredResearchers.length > 0 ? filteredResearchers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onAuthorClick(user.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-primary/40 dark:border-slate-700"
                  >
                    <img src={user.imageUrl} alt={user.name} className="size-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{user.name}</p>
                      <p className="truncate text-[10px] font-medium text-slate-400">{user.title ? `${user.title} • ` : ''}{user.affiliation}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">{formatCompactCount(user.stats.citations)}</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Cites</p>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
                    No researchers match that search.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={institutionSearchQuery}
                  onChange={(event) => setInstitutionSearchQuery(event.target.value)}
                  placeholder="Search institutions by name or location"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div className="space-y-3">
                {filteredInstitutions.length > 0 ? filteredInstitutions.map((institution) => (
                  <div key={institution.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => onInstitutionClick(institution.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                        <Globe className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{institution.name}</p>
                        <p className="truncate text-[10px] font-medium text-slate-400">{institution.location}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onInstitutionHomepageOpen(institution.id)}
                      className="rounded-xl bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                    >
                      Homepage
                    </button>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
                    No institutions match that search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, icon }: { label: string, value: string, change: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-emerald-500 text-sm font-bold">{change}</span>
      </div>
    </div>
  );
}

function DailyDigestScreen({ onBack, onOpenSettings, onOpenHelp, onOpenNotifications, onUnsubscribe, isSubscribed, emailEnabled, showToast }: { onBack: () => void, onOpenSettings: () => void, onOpenHelp: () => void, onOpenNotifications: () => void, onUnsubscribe: () => Promise<void>, isSubscribed: boolean, emailEnabled: boolean, showToast: (msg: string) => void }) {
  const { dataset } = useAppData();
  const digestTopics = [...new Set(dataset.digestPapers.map(paper => paper.topic))].slice(0, 2);
  const totalCitations = dataset.preprints.reduce((sum, preprint) => sum + (preprint.citations || 0), 0);
  const [summaryFilter, setSummaryFilter] = useState<'matches' | 'citations'>('matches');
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const filteredDigestPapers = summaryFilter === 'matches'
    ? dataset.digestPapers
    : dataset.digestPapers.filter((paper) => (findPreprintForDigestPaper(dataset.preprints, paper)?.citations ?? 0) > 0);

  const handleUnsubscribe = async () => {
    if (!isSubscribed) {
      showToast('Daily digest is already disabled.');
      return;
    }
    try {
      setIsUnsubscribing(true);
      await onUnsubscribe();
      showToast('Daily digest disabled.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update digest preference.');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-y-auto no-scrollbar">
      <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-3">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <div className="bg-primary p-2 rounded-lg">
            <BookOpen className="size-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Research Digest</h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Daily Update</p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-400">{formatAbsoluteDate(new Date())}</span>
      </header>

      <div className="p-6 space-y-12 pb-24">
        <div>
          <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] mb-6">At a Glance</h3>
          {!emailEnabled && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              Email delivery is currently off. You are viewing the in-app daily digest preview only.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => setSummaryFilter('matches')}
              className={`p-6 rounded-2xl border cursor-pointer transition-colors ${
                summaryFilter === 'matches'
                  ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30'
                  : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
              }`}
            >
              <div className="flex items-center gap-2 text-primary mb-4">
                <Zap className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">New Matches</span>
              </div>
              <p className="text-4xl font-bold mb-1">{dataset.preprints.length}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Based on your interests</p>
            </div>
            <div 
              onClick={() => setSummaryFilter('citations')}
              className={`p-6 rounded-2xl border cursor-pointer transition-colors ${
                summaryFilter === 'citations'
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 text-primary mb-4">
                <Quote className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Citations Found</span>
              </div>
              <p className="text-4xl font-bold mb-1">{Math.max(1, Math.round(totalCitations / Math.max(dataset.preprints.length, 1)))}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Found in recent publications</p>
            </div>
          </div>
        </div>

        {digestTopics.map(topic => (
          <div key={topic}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary">
                  {topic === 'Quantum Computing' ? <Zap className="size-5" /> : <Database className="size-5" />}
                </div>
                <h3 className="text-xl font-bold">{topic}</h3>
              </div>
              <button
                onClick={() => setExpandedTopics((current) => current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic])}
                className="text-xs font-bold text-primary uppercase tracking-widest"
              >
                {expandedTopics.includes(topic) ? 'Show less' : 'See all'}
              </button>
            </div>
            <div className="space-y-12">
              {filteredDigestPapers.filter(p => p.topic === topic).slice(0, expandedTopics.includes(topic) ? undefined : 1).map(paper => {
                const linkedPreprint = findPreprintForDigestPaper(dataset.preprints, paper);
                const isExpanded = expandedPaperId === paper.id;
                return (
                <div key={paper.id} className="space-y-6">
                  <div>
                    <h4 className="text-xl font-bold leading-tight mb-2">{paper.title}</h4>
                    <p className="text-xs text-slate-500 font-medium italic">{paper.authors} • Published in {paper.source}</p>
                  </div>
                  <button 
                    onClick={() => setExpandedPaperId(isExpanded ? null : paper.id)}
                    className="bg-primary text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                  >
                    {isExpanded ? 'Hide Abstract' : 'View Abstract'} <ExternalLink className="size-4" />
                  </button>
                  {isExpanded && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {linkedPreprint?.abstract ?? 'No abstract is available for this digest item yet.'}
                    </div>
                  )}
                  <img src={paper.imageUrl} alt="" className="w-full aspect-video rounded-3xl object-cover shadow-2xl" />
                </div>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {dataset.digestActivity.map(activity => (
              <div key={activity.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-sm">
                <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${activity.type === 'citation' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                  {activity.type === 'citation' ? <Quote className="size-6" /> : <UserPlus className="size-6" />}
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">{activity.text.split(' ')[0]} {activity.text.split(' ')[1]}</span> {activity.text.split(' ').slice(2).join(' ')} <span className="text-primary font-bold italic underline underline-offset-4">{activity.highlight}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="pt-12 pb-8 text-center space-y-10 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-center gap-10 text-slate-400">
            <button type="button" onClick={onOpenSettings} className="hover:text-primary transition-colors" aria-label="Open settings">
              <Settings className="size-6" />
            </button>
            <button type="button" onClick={onOpenNotifications} className="hover:text-primary transition-colors" aria-label="Open notifications">
              <Bell className="size-6" />
            </button>
            <button type="button" onClick={onOpenHelp} className="hover:text-primary transition-colors" aria-label="Open help">
              <HelpCircle className="size-6" />
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[280px] mx-auto font-medium">
              {emailEnabled && isSubscribed
                ? "This digest is scheduled for email delivery because you're following these research areas."
                : 'This is an in-app preview of your daily digest content.'}
            </p>
            <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest">
              <button type="button" onClick={onOpenSettings} className="text-primary hover:underline">{emailEnabled ? 'Manage Email Delivery' : 'Enable Email Delivery'}</button>
              <span className="text-slate-200">•</span>
              <button type="button" onClick={() => void handleUnsubscribe()} disabled={isUnsubscribing || !isSubscribed} className="text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubscribed ? (isUnsubscribing ? 'Updating…' : 'Unsubscribe') : 'Unsubscribed'}
              </button>
            </div>
          </div>
          <div className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">
            © 2026 PREPRINT EXPLORER
          </div>
        </footer>
      </div>
    </div>
  );
}

function WeeklyDigestScreen({ onBack, onOpenLibrary, onOpenProfile, onOpenHome, onOpenSettings, onUnsubscribe, isSubscribed, emailEnabled, showToast }: { onBack: () => void, onOpenLibrary: () => void, onOpenProfile: () => void, onOpenHome: () => void, onOpenSettings: () => void, onUnsubscribe: () => Promise<void>, isSubscribed: boolean, emailEnabled: boolean, showToast: (msg: string) => void }) {
  const { dataset } = useAppData();
  const totalMatches = dataset.preprints.length;
  const totalCitations = dataset.preprints.reduce((sum, preprint) => sum + (preprint.citations || 0), 0);
  const [showFullReport, setShowFullReport] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const topSavedPaper = [...dataset.preprints].sort((a, b) => (b.savesCount ?? 0) - (a.savesCount ?? 0))[0];
  const topDiscussedPaper = [...dataset.preprints].sort((a, b) => (b.comments?.length ?? 0) - (a.comments?.length ?? 0))[0];
  const keyContributors = [...dataset.risingStars].slice(0, showFullReport ? 6 : 3);
  const weeklyInterestSummary = dataset.weeklyTrends.reduce((acc, point) => ({
    quantum: acc.quantum + point.quantum,
    ai: acc.ai + point.ai,
  }), { quantum: 0, ai: 0 });
  const dominantTopic = weeklyInterestSummary.quantum >= weeklyInterestSummary.ai ? 'Quantum Computing' : 'Artificial Intelligence';
  const dominantTopicValue = Math.max(weeklyInterestSummary.quantum, weeklyInterestSummary.ai);
  const citationGrowthPercent = totalCitations > 0 ? Math.round((totalCitations / Math.max(totalMatches, 1)) * 10) : 0;
  const totalPreviousMatches = dataset.weeklyTrends.slice(0, -1).reduce((sum, point) => sum + point.quantum + point.ai, 0);
  const totalCurrentMatches = dataset.weeklyTrends.reduce((sum, point) => sum + point.quantum + point.ai, 0);
  const matchGrowthPercent = totalPreviousMatches > 0
    ? Math.round(((totalCurrentMatches - totalPreviousMatches) / totalPreviousMatches) * 100)
    : 0;
  const averageTopicInteractions = Math.round(dominantTopicValue / Math.max(dataset.weeklyTrends.length, 1));
  const newPaperGrowthPercent = totalMatches > 1
    ? Math.round(((dataset.digestPapers.length - Math.max(totalMatches - dataset.digestPapers.length, 1)) / Math.max(totalMatches - dataset.digestPapers.length, 1)) * 100)
    : 0;

  const handleCopyDigestLink = async () => {
    try {
      await copyText(`${window.location.origin}/digest/weekly`);
      showToast('Weekly digest link copied to clipboard!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to copy weekly digest link');
    }
  };

  const handleOpenDigestPaper = (preprint: Preprint) => {
    openPreprintAsset(preprint, showToast);
  };

  const handleUnsubscribe = async () => {
    if (!isSubscribed) {
      showToast('Weekly digest is already disabled.');
      return;
    }
    try {
      setIsUnsubscribing(true);
      await onUnsubscribe();
      showToast('Weekly digest disabled.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update digest preference.');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto no-scrollbar">
      <header className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <div className="bg-primary p-2 rounded-lg">
            <BookOpen className="size-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Weekly Digest</h2>
        </div>
        <Share2 
          className="size-5 text-slate-400 cursor-pointer" 
          onClick={() => void handleCopyDigestLink()}
        />
      </header>

      <div className="p-6 space-y-10 pb-24">
        <div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-3">Week of {formatAbsoluteDate(new Date())}</p>
          <h1 className="text-4xl font-bold leading-tight mb-4">Your research week in review</h1>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            We've synthesized the latest breakthroughs and your personal engagement metrics for the past 7 days.
          </p>
        </div>

        {!emailEnabled && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Email delivery is currently off. You are viewing the in-app weekly digest preview only.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Matches</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{totalMatches}</span>
              <span className={`text-xs font-bold ${matchGrowthPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{matchGrowthPercent >= 0 ? '+' : ''}{matchGrowthPercent}%</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Citations</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{totalCitations}</span>
              <span className="text-emerald-500 text-xs font-bold">+{citationGrowthPercent}%</span>
            </div>
          </div>
          <div className="col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">New Papers</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{dataset.digestPapers.length}</span>
              <span className={`text-xs font-bold ${newPaperGrowthPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{newPaperGrowthPercent >= 0 ? '+' : ''}{newPaperGrowthPercent}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Analytics Spotlight</h3>
            <button onClick={() => setShowFullReport((current) => !current)} className="text-xs font-bold text-primary">
              {showFullReport ? 'Show summary' : 'View full report'}
            </button>
          </div>
          
          <div className="mb-8">
            <p className="text-sm text-slate-500 mb-6 font-medium">{dominantTopic} led this week with {dominantTopicValue.toLocaleString()} tracked interactions, averaging {averageTopicInteractions.toLocaleString()} per day.</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataset.weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="quantum" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="ai" fill="#3b82f6" opacity={0.2} radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quantum Computing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-blue-200"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Artificial Intelligence</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-8">Top Papers of the Week</h3>
          <div className="space-y-4">
            {topSavedPaper && (
              <button type="button" onClick={() => handleOpenDigestPaper(topSavedPaper)} className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group text-left">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-amber-50 text-amber-600 text-[8px] font-bold px-2 py-1 rounded uppercase tracking-widest">Most Saved</span>
                  <div className="flex flex-col items-center">
                    <Bookmark className="size-5 text-primary fill-primary" />
                    <span className="text-[10px] font-bold mt-1">{(topSavedPaper.savesCount ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                <h4 className="text-lg font-bold leading-tight mb-2 group-hover:text-primary transition-colors">{topSavedPaper.title}</h4>
                <p className="text-xs text-slate-500 font-medium">{topSavedPaper.authors.join(', ')} • {topSavedPaper.source}</p>
              </button>
            )}

            {topDiscussedPaper && (
              <button type="button" onClick={() => handleOpenDigestPaper(topDiscussedPaper)} className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group text-left">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-2 py-1 rounded uppercase tracking-widest">High Engagement</span>
                  <div className="flex flex-col items-center">
                    <MessageSquare className="size-5 text-primary fill-primary" />
                    <span className="text-[10px] font-bold mt-1">{(topDiscussedPaper.comments?.length ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                <h4 className="text-lg font-bold leading-tight mb-2 group-hover:text-primary transition-colors">{topDiscussedPaper.title}</h4>
                <p className="text-xs text-slate-500 font-medium">{topDiscussedPaper.authors.join(', ')} • {topDiscussedPaper.source}</p>
              </button>
            )}
          </div>
        </div>

        <div className="bg-primary p-8 rounded-[40px] text-white space-y-6 shadow-2xl shadow-primary/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-6" />
            <h3 className="text-xl font-bold">Citation Growth</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 font-medium">
            Your tracked papers accumulated {totalCitations.toLocaleString()} citations across {totalMatches.toLocaleString()} current matches.
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold">{totalCitations.toLocaleString()}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">+{citationGrowthPercent}%</span>
          </div>
            <button onClick={() => setShowFullReport(true)} className="w-full bg-white text-primary py-4 rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-transform">
            Explore Your Network
          </button>
        </div>

        <footer className="pt-12 pb-8 text-center space-y-10 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-around text-slate-400">
            <button type="button" onClick={onOpenHome} className="flex flex-col items-center gap-1">
              <Rss className="size-6" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Feed</span>
            </button>
            <button type="button" onClick={onOpenLibrary} className="flex flex-col items-center gap-1">
              <BookMarked className="size-6" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Library</span>
            </button>
            <button type="button" onClick={() => setShowFullReport(true)} className="flex flex-col items-center gap-1 text-primary">
              <BarChart3 className="size-6" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Analytics</span>
            </button>
            <button type="button" onClick={onOpenProfile} className="flex flex-col items-center gap-1">
              <UserIcon className="size-6" />
              <span className="text-[8px] font-bold uppercase tracking-widest">Profile</span>
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[280px] mx-auto font-medium">
              {emailEnabled && isSubscribed
                ? "You're scheduled to receive this weekly digest by email."
                : 'This is an in-app preview of your weekly digest content.'}
            </p>
            <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest">
              <button type="button" onClick={onOpenSettings} className="text-slate-500 hover:underline">{emailEnabled ? 'Manage Email Preferences' : 'Enable Email Delivery'}</button>
              <span className="text-slate-200">•</span>
              <button type="button" onClick={() => void handleUnsubscribe()} disabled={isUnsubscribing || !isSubscribed} className="text-slate-500 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubscribed ? (isUnsubscribing ? 'Updating…' : 'Unsubscribe') : 'Unsubscribed'}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TopicInsightScreen({ onBack, onPreprintClick, onTagClick, onAuthorClick, showToast }: { 
  onBack: () => void, 
  onPreprintClick: (p: Preprint) => void,
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  showToast: (msg: string) => void
}) {
  const { dataset } = useAppData();
  const [isFollowing, setIsFollowing] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [showAllPapers, setShowAllPapers] = useState(false);
  const [showAllContributors, setShowAllContributors] = useState(false);
  const topicPapers = [...dataset.preprints]
    .filter((preprint) => preprint.tags.some((tag) => /language|ai|machine|learning|llm|nlp/i.test(tag)) || /language|ai|machine|learning|llm|nlp/i.test(preprint.title))
    .sort((left, right) => (right.citations || 0) - (left.citations || 0));
  const visibleTopicPapers = showAllPapers ? topicPapers : topicPapers.slice(0, 3);
  const visibleContributors = showAllContributors ? dataset.risingStars : dataset.risingStars.slice(0, 3);
  const totalTopicCitations = topicPapers.reduce((sum, preprint) => sum + (preprint.citations || 0), 0);
  const totalTopicViews = topicPapers.reduce((sum, preprint) => sum + (preprint.views || 0), 0);
  const growthScore = Math.min(100, Math.round((totalTopicCitations / Math.max(topicPapers.length, 1)) / 4));
  const averageViews = Math.round(totalTopicViews / Math.max(topicPapers.length, 1));
  const interestLabel = averageViews > 5000 ? 'Very High' : averageViews > 2000 ? 'High' : averageViews > 700 ? 'Moderate' : 'Emerging';
  const publicationTrendData = Object.entries(topicPapers.reduce<Record<string, number>>((acc, preprint) => {
    const parsed = new Date(preprint.publishedAt ?? preprint.date);
    const year = Number.isNaN(parsed.getTime()) ? '2026' : String(parsed.getFullYear());
    acc[year] = (acc[year] ?? 0) + 1;
    return acc;
  }, {}))
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([year, papers]) => ({ year, papers }));
  const growthDelta = topicPapers.length > 1
    ? Math.round((((topicPapers[0]?.views || 0) - (topicPapers[Math.min(topicPapers.length - 1, 2)]?.views || 0)) / Math.max(topicPapers[Math.min(topicPapers.length - 1, 2)]?.views || 1, 1)) * 100)
    : 0;
  const inferredTopicLabel = topicPapers[0]?.tags.find((tag) => /language|ai|machine|learning|llm|nlp/i.test(tag)) ?? 'Large Language Models';
  const inferredTopicSlug = slugifyLabel(inferredTopicLabel) || 'topic';
  const inferredTopicCategory = [...new Set(topicPapers.flatMap((preprint) => preprint.tags))].slice(0, 2).join(' • ') || 'Artificial Intelligence';
  const subTopicCounts = topicPapers.flatMap((preprint) => preprint.tags).reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] ?? 0) + 1;
    return acc;
  }, {});
  const trendingSubTopics = Object.entries(subTopicCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 7)
    .map(([label], index) => ({ label, active: index === 0 }));

  useEffect(() => {
    const preference = storageService.getTopicPreference(inferredTopicSlug);
    setIsFollowing(preference.followed);
    setAlertsEnabled(preference.alertsEnabled);
  }, [inferredTopicSlug]);

  const handleFollow = () => {
    const nextValue = !isFollowing;
    setIsFollowing(nextValue);
    storageService.setTopicPreference(inferredTopicSlug, {
      followed: nextValue,
      alertsEnabled,
    });
    showToast(nextValue ? `Following ${inferredTopicLabel}` : `Unfollowed ${inferredTopicLabel}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto no-scrollbar">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-background-dark z-20">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-lg font-bold">Topic Insight</h2>
        <Share2
          className="size-5 text-slate-400 cursor-pointer"
          onClick={() => void copyText(`${window.location.origin}/topics/${inferredTopicSlug}`).then(() => showToast('Topic link copied to clipboard')).catch((error) => showToast(error instanceof Error ? error.message : 'Unable to copy topic link'))}
        />
      </header>

      <div className="p-6 space-y-8">
        <div className="flex items-center gap-6">
          <div className="size-24 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-500/20 overflow-hidden">
            <img src="https://picsum.photos/seed/llm/200/200" alt="" className="w-full h-full object-cover opacity-80" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold leading-tight">{inferredTopicLabel}</h1>
            <p className="text-sm text-slate-500 font-medium">{inferredTopicCategory}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleFollow}
            className={`flex-1 font-bold py-4 rounded-xl shadow-lg transition-all ${isFollowing ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-none' : 'bg-orange-500 text-white shadow-orange-500/20'}`}
          >
            {isFollowing ? 'Following Topic' : `Follow ${inferredTopicLabel}`}
          </button>
          <button 
            onClick={() => {
              const nextValue = !alertsEnabled;
              setAlertsEnabled(nextValue);
              storageService.setTopicPreference(inferredTopicSlug, {
                followed: isFollowing,
                alertsEnabled: nextValue,
              });
              showToast(nextValue ? 'Topic alerts enabled!' : 'Topic alerts paused');
            }}
            className={`p-4 rounded-xl border ${alertsEnabled ? 'bg-orange-50 border-orange-200 text-orange-500 dark:bg-orange-500/10 dark:border-orange-400/20' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
          >
            <Bell className="size-6 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Growth Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{growthScore}/100</span>
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="size-3" /> {growthDelta >= 0 ? '+' : ''}{growthDelta}%
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Interest</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{interestLabel}</span>
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="size-3" /> {averageViews.toLocaleString()} avg. views
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-8">
            <h3 className="text-lg font-bold">Publication Trend</h3>
            <p className="text-xs text-slate-500 mt-1">{topicPapers.length.toLocaleString()} <span className="text-slate-400">Papers in this topic cluster</span></p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={publicationTrendData}>
                <Line type="monotone" dataKey="papers" stroke="#f97316" strokeWidth={4} dot={false} />
                <Tooltip content={() => null} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-4">
            {publicationTrendData.length > 0 ? (
              <>
                <span>{publicationTrendData[0]?.year}</span>
                <span>{publicationTrendData[publicationTrendData.length - 1]?.year}</span>
              </>
            ) : (
              <>
                <span>Start</span>
                <span>Now</span>
              </>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Trending Sub-topics</h3>
          <div className="flex flex-wrap gap-2">
            {trendingSubTopics.map((tag, i) => (
              <button 
                key={i} 
                onClick={() => onTagClick(tag.label)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  tag.active ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-50/50 text-orange-600 border-orange-100'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Top Cited Papers</h3>
            <button onClick={() => setShowAllPapers((current) => !current)} className="text-xs font-bold text-primary">
              {showAllPapers ? 'Show less' : 'View all'}
            </button>
          </div>
          <div className="space-y-4">
            {visibleTopicPapers.map((p, i) => (
              <div 
                key={i} 
                onClick={() => onPreprintClick(p)}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-primary/30 transition-all"
              >
                <h4 className="text-sm font-bold leading-tight mb-1">{p.title}</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {p.authors.map(a => (
                    <button key={a} onClick={(e) => { e.stopPropagation(); onAuthorClick(a); }} className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hover:text-primary">
                      {a}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-orange-600">
                    <Quote className="size-3" />
                    <span className="text-xs font-bold">{p.citations}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-orange-600">
                    <TrendingUp className="size-3" />
                    <span className="text-xs font-bold">{p.views} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-12">
          <h3 className="text-lg font-bold mb-6">Key Contributors</h3>
          <div className={`grid gap-4 ${showAllContributors ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-3'}`}>
            {visibleContributors.map((person, i) => (
              <div key={i} onClick={() => onAuthorClick(person.name)} className="flex flex-col items-center text-center gap-2 cursor-pointer group">
                <img src={person.imageUrl} alt="" className="size-16 rounded-full object-cover border-2 border-orange-200 p-0.5 group-hover:border-primary transition-all" />
                <div>
                  <h4 className="text-xs font-bold leading-tight group-hover:text-primary transition-all">{person.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{person.affiliation}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowAllContributors((current) => !current)} className="mt-4 text-xs font-bold text-primary">
            {showAllContributors ? 'Show fewer contributors' : 'View all contributors'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareScreen({ collection, currentUser, onBack, onOpenMenu, showToast }: { collection: Collection, currentUser: User, onBack: () => void, onOpenMenu: () => void, showToast: (msg: string) => void }) {
  const { dataset, setDataset } = useAppData();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('editor');
  const collectionRecord = dataset.collections.find((item) => item.id === collection.id) ?? collection;
  const owner = dataset.users.find((item) => item.id === collectionRecord.ownerId);
  const accessRole = getCollectionAccessRole(collectionRecord, currentUser);
  const accessList = getCollectionCollaborators(collectionRecord)
    .filter((entry) => entry.email !== currentUser.email?.toLowerCase());
  const canManageAccess = accessRole === 'owner';

  const updateCollectionAccess = async (collaborators: Array<{ email: string; role: 'viewer' | 'editor' }>) => {
    const response = await updateCollectionAccessRequest(collectionRecord.id, collaborators);
    setDataset((prev) => ({
      ...prev,
      collections: response.collections,
      metadata: {
        ...prev.metadata,
        lastUpdated: new Date().toISOString(),
      },
    }));
  };

  const handleInvite = () => {
    if (!canManageAccess) {
      showToast('Only the collection owner can manage access');
      return;
    }
    const normalized = inviteEmail.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      showToast('Enter a valid email address');
      return;
    }
    if (accessList.some((entry) => entry.email === normalized)) {
      showToast('This collaborator already has access');
      return;
    }
    void updateCollectionAccess([...accessList, { email: normalized, role: inviteRole }])
      .then(() => {
        setInviteEmail('');
        setInviteRole('editor');
        showToast('Invitation added to the access list');
      })
      .catch((error) => {
        showToast(error instanceof Error ? error.message : 'Unable to update collection access');
      });
  };

  const handleCopyLink = async () => {
    try {
      const token = collectionRecord.shareLinkToken || collectionRecord.id;
      await copyText(`${window.location.origin}/collections/${token}`);
      showToast('Link copied to clipboard!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to copy link');
    }
  };

  const handleUpdateRole = (email: string, role: 'viewer' | 'editor') => {
    if (!canManageAccess) {
      showToast('Only the collection owner can manage access');
      return;
    }
    void updateCollectionAccess(accessList.map((entry) => entry.email === email ? { ...entry, role } : entry))
      .then(() => showToast(`Updated ${email} to ${role}`))
      .catch((error) => showToast(error instanceof Error ? error.message : 'Unable to update collection access'));
  };

  const handleRemoveAccess = (email: string) => {
    if (!canManageAccess) {
      showToast('Only the collection owner can manage access');
      return;
    }
    void updateCollectionAccess(accessList.filter((item) => item.email !== email))
      .then(() => showToast(`Removed ${email}`))
      .catch((error) => showToast(error instanceof Error ? error.message : 'Unable to update collection access'));
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-background-dark z-10">
        <div className="flex items-center gap-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <div>
            <h2 className="text-lg font-bold">Share Collection</h2>
            <p className="text-xs text-slate-500">{collectionRecord.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Menu className="text-primary cursor-pointer" onClick={onOpenMenu} />
          <button onClick={onBack} className="text-primary font-bold">Done</button>
        </div>
      </header>
      <div className="p-4 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-800/50">
          <p className="font-bold text-slate-900 dark:text-slate-100">
            {accessRole === 'owner' ? 'You own this collection' : `Your access: ${accessRole}`}
          </p>
          <p className="mt-2 text-slate-500">
            {accessRole === 'owner'
              ? 'Invite collaborators, change their roles, and share a direct collection link.'
              : accessRole === 'editor'
                ? 'You can view the access list, copy the collection link, and manage papers inside the collection.'
                : 'You can view the collection and copy the link, but only the owner can change access.'}
          </p>
        </section>
        <section>
          <h3 className="font-bold mb-4">Invite collaborators</h3>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Enter email address"
              disabled={!canManageAccess}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm disabled:opacity-50"
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as 'viewer' | 'editor')}
              disabled={!canManageAccess}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-sm disabled:opacity-50"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button 
              onClick={handleInvite}
              disabled={!canManageAccess}
              className="bg-primary text-white px-6 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        </section>
        <section className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center gap-4">
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Share2 className="size-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Copy shareable link</p>
            <p className="text-xs text-slate-500">Anyone with the link can view</p>
          </div>
          <button 
            onClick={() => void handleCopyLink()}
            className="bg-white dark:bg-slate-700 border border-slate-200 px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            Copy
          </button>
        </section>
        <section>
          <h3 className="font-bold mb-4">People with access</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={(owner ?? currentUser).imageUrl} className="size-10 rounded-full object-cover" alt={(owner ?? currentUser).name} referrerPolicy="no-referrer" />
                <div>
                  <p className="text-sm font-bold">{owner?.name ?? `${currentUser.name} (You)`}</p>
                  <p className="text-xs text-slate-500">{owner?.email || currentUser.email || `${currentUser.id}@preprint-explorer.local`}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase">Owner</span>
            </div>
            {accessRole !== 'owner' && currentUser.email && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold">{currentUser.email}</p>
                  <p className="text-xs text-slate-500">Your access on this collection</p>
                </div>
                <span className="text-xs font-bold uppercase text-primary">{accessRole}</span>
              </div>
            )}
            {accessList.map((entry) => (
              <div key={entry.email} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {entry.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{entry.email}</p>
                    <p className="text-xs text-slate-500">Invited collaborator</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageAccess ? (
                    <select
                      value={entry.role}
                      onChange={(event) => handleUpdateRole(entry.email, event.target.value as 'viewer' | 'editor')}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold uppercase dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold uppercase text-slate-400">{entry.role}</span>
                  )}
                  {canManageAccess && (
                    <button onClick={() => handleRemoveAccess(entry.email)} className="text-xs font-bold text-rose-500">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            {accessList.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800">
                No collaborators have been added yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ModerationCenterScreen({
  reports,
  moderators,
  reportActions,
  productAnnouncements,
  initialReportId,
  onConsumeInitialReport,
  onBack,
  onOpenReport,
  onAssignReport,
  onEscalateReport,
  onBulkAction,
  onReviewReport,
  onPublishProductAnnouncement,
  showToast,
}: {
  reports: ModerationReport[];
  moderators: Array<Pick<User, 'id' | 'name'>>;
  reportActions: Record<string, ModerationAction[]>;
  productAnnouncements: ProductAnnouncement[];
  initialReportId?: string | null;
  onConsumeInitialReport?: () => void;
  onBack: () => void;
  onOpenReport: (reportId: string) => Promise<{ report: ModerationReport; actions: ModerationAction[] }>;
  onAssignReport: (reportId: string, assignedToUserId: string | null) => Promise<void>;
  onEscalateReport: (reportId: string, escalationReason: string) => Promise<void>;
  onBulkAction: (payload: {
    reportIds: string[];
    action: 'assign' | 'review' | 'escalate';
    assignedToUserId?: string | null;
    status?: 'reviewing' | 'resolved' | 'dismissed';
    resolutionNote?: string;
    escalationReason?: string;
  }) => Promise<void>;
  onReviewReport: (reportId: string, payload: { status: 'reviewing' | 'resolved' | 'dismissed'; resolutionNote?: string }) => Promise<void>;
  onPublishProductAnnouncement: (payload: { title: string; message: string; actionUrl?: string }) => Promise<ProductAnnouncement>;
  showToast: (msg: string, type?: 'success' | 'info') => void;
}) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'reviewing' | 'resolved' | 'dismissed'>('all');
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [selectedReportActions, setSelectedReportActions] = useState<ModerationAction[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolutionNote, setResolutionNote] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState<string>('');
  const [escalationReason, setEscalationReason] = useState('');
  const [bulkMode, setBulkMode] = useState<'off' | 'assign' | 'review' | 'escalate'>('off');
  const [nextStatus, setNextStatus] = useState<'reviewing' | 'resolved' | 'dismissed'>('reviewing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementActionUrl, setAnnouncementActionUrl] = useState('/notifications/system');

  const filteredReports = reports.filter((report) => activeFilter === 'all' || report.status === activeFilter);
  const openCount = reports.filter((report) => report.status === 'open').length;

  const loadReportDetail = async (reportId: string) => {
    try {
      const detail = await onOpenReport(reportId);
      setSelectedReport(detail.report);
      setSelectedReportActions(detail.actions);
      setResolutionNote(detail.report.resolutionNote ?? '');
      setAssignedToUserId(detail.report.assignedToUserId ?? '');
      setEscalationReason(detail.report.escalationReason ?? '');
      setNextStatus(detail.report.status === 'open' ? 'reviewing' : detail.report.status === 'reviewing' ? 'resolved' : 'dismissed');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load report details', 'info');
    }
  };

  const openReviewModal = async (report: ModerationReport) => {
    await loadReportDetail(report.id);
  };

  useEffect(() => {
    if (!initialReportId) {
      return;
    }
    let cancelled = false;
    const openInitialReport = async () => {
      try {
        const detail = await onOpenReport(initialReportId);
        if (cancelled) {
          return;
        }
        setSelectedReport(detail.report);
        setSelectedReportActions(detail.actions);
        setResolutionNote(detail.report.resolutionNote ?? '');
        setAssignedToUserId(detail.report.assignedToUserId ?? '');
        setEscalationReason(detail.report.escalationReason ?? '');
        setNextStatus(detail.report.status === 'open' ? 'reviewing' : detail.report.status === 'reviewing' ? 'resolved' : 'dismissed');
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : 'Unable to load report details', 'info');
        }
      } finally {
        if (!cancelled) {
          onConsumeInitialReport?.();
        }
      }
    };
    void openInitialReport();
    return () => {
      cancelled = true;
    };
  }, [initialReportId, onConsumeInitialReport, onOpenReport, showToast]);

  const handleSubmit = async () => {
    if (!selectedReport) {
      return;
    }
    try {
      setIsSubmitting(true);
      if ((selectedReport.assignedToUserId ?? '') !== assignedToUserId) {
        await onAssignReport(selectedReport.id, assignedToUserId || null);
      }
      if (escalationReason.trim() && escalationReason.trim() !== (selectedReport.escalationReason ?? '')) {
        await onEscalateReport(selectedReport.id, escalationReason.trim());
      }
      await onReviewReport(selectedReport.id, {
        status: nextStatus,
        resolutionNote: resolutionNote.trim() || undefined,
      });
      showToast(`Report marked ${nextStatus}`);
      setSelectedReport(null);
      setSelectedReportActions([]);
      setResolutionNote('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to review report', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelected = (reportId: string) => {
    setSelectedIds((prev) => prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]);
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0 || bulkMode === 'off') {
      return;
    }
    try {
      setIsSubmitting(true);
      await onBulkAction({
        reportIds: selectedIds,
        action: bulkMode,
        assignedToUserId: bulkMode === 'assign' ? (assignedToUserId || null) : undefined,
        status: bulkMode === 'review' ? nextStatus : undefined,
        resolutionNote: bulkMode === 'review' ? resolutionNote.trim() || undefined : undefined,
        escalationReason: bulkMode === 'escalate' ? escalationReason.trim() || undefined : undefined,
      });
      showToast(`Bulk ${bulkMode} applied to ${selectedIds.length} reports`);
      setSelectedIds([]);
      setBulkMode('off');
      setResolutionNote('');
      setEscalationReason('');
      setAssignedToUserId('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to apply bulk moderation action', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      showToast('Title and message are required for a product update.', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await onPublishProductAnnouncement({
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        actionUrl: announcementActionUrl.trim() || '/notifications/system',
      });
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementActionUrl('/notifications/system');
      showToast('Product update published');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to publish product update', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <div>
          <h2 className="text-xl font-bold">Moderation Center</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{openCount} open reports</p>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'open', 'reviewing', 'resolved', 'dismissed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeFilter === filter ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setBulkMode('assign')} className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${bulkMode === 'assign' ? 'bg-primary text-white' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Bulk Assign</button>
            <button onClick={() => setBulkMode('review')} className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${bulkMode === 'review' ? 'bg-primary text-white' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Bulk Review</button>
            <button onClick={() => setBulkMode('escalate')} className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${bulkMode === 'escalate' ? 'bg-primary text-white' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Bulk Escalate</button>
            <button onClick={() => setBulkMode('off')} className="rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Clear</button>
          </div>
          {bulkMode !== 'off' && (
            <div className="mt-3 space-y-3">
              {bulkMode === 'assign' && (
                <select value={assignedToUserId} onChange={(event) => setAssignedToUserId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <option value="">Unassigned</option>
                  {moderators.map((moderator) => <option key={moderator.id} value={moderator.id}>{moderator.name}</option>)}
                </select>
              )}
              {bulkMode === 'review' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {(['reviewing', 'resolved', 'dismissed'] as const).map((status) => (
                      <button key={status} onClick={() => setNextStatus(status)} className={`rounded-2xl border px-3 py-3 text-sm font-bold ${nextStatus === status ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{status}</button>
                    ))}
                  </div>
                  <textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Optional shared resolution note" className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900" />
                </>
              )}
              {bulkMode === 'escalate' && (
                <textarea value={escalationReason} onChange={(event) => setEscalationReason(event.target.value)} placeholder="Why this set of reports needs escalation" className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900" />
              )}
              <button onClick={() => void handleBulkSubmit()} disabled={isSubmitting || selectedIds.length === 0} className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60">
                {isSubmitting ? 'Applying…' : `Apply to ${selectedIds.length} selected`}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Product Updates</p>
              <h3 className="mt-1 text-base font-bold">Publish an announcement</h3>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              {productAnnouncements.length} published
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <input
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
              placeholder="Release title"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-950"
            />
            <textarea
              value={announcementMessage}
              onChange={(event) => setAnnouncementMessage(event.target.value)}
              placeholder="What changed and why users should care."
              className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              value={announcementActionUrl}
              onChange={(event) => setAnnouncementActionUrl(event.target.value)}
              placeholder="/notification-settings"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="button"
              onClick={() => void handlePublishAnnouncement()}
              disabled={isSubmitting}
              className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {isSubmitting ? 'Publishing…' : 'Publish Product Update'}
            </button>
          </div>
          {productAnnouncements.length > 0 && (
            <div className="mt-4 space-y-3">
              {productAnnouncements.slice(0, 3).map((announcement) => (
                <div key={announcement.id} className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{announcement.title}</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{announcement.message}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{new Date(announcement.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Published by {announcement.createdByName}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {filteredReports.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <ShieldCheck className="mx-auto mb-3 size-10 text-emerald-500" />
            <h3 className="text-lg font-bold">No reports in this queue</h3>
            <p className="mt-2 text-sm text-slate-500">The moderation queue is currently clear for this filter.</p>
          </div>
        ) : filteredReports.map((report) => (
          <div key={report.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => toggleSelected(report.id)} className="mt-1 size-4 rounded border-slate-300 text-primary focus:ring-primary" />
                <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{report.targetType} report</p>
                <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">{report.reason}</h3>
                <p className="mt-1 text-sm text-slate-500">Reporter: {report.reporterName}</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${report.status === 'open' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' : report.status === 'reviewing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300' : report.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                {report.status}
              </span>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
              <p><span className="font-bold">Target:</span> {report.targetType} / {report.targetId}</p>
              <p className="mt-2"><span className="font-bold">Submitted:</span> {new Date(report.createdAt).toLocaleString()}</p>
              {report.assigneeName && <p className="mt-2"><span className="font-bold">Assignee:</span> {report.assigneeName}</p>}
              {report.escalatedAt && <p className="mt-2"><span className="font-bold text-amber-700 dark:text-amber-300">Escalated:</span> {new Date(report.escalatedAt).toLocaleString()}</p>}
              {report.details && <p className="mt-3 text-slate-600 dark:text-slate-300">{report.details}</p>}
              {report.resolutionNote && <p className="mt-3 text-slate-600 dark:text-slate-300"><span className="font-bold">Resolution:</span> {report.resolutionNote}</p>}
              {report.escalationReason && <p className="mt-3 text-slate-600 dark:text-slate-300"><span className="font-bold">Escalation:</span> {report.escalationReason}</p>}
              {report.reviewerName && <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Last reviewed by {report.reviewerName}</p>}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => openReviewModal(report)}
                className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20"
              >
                Review Report
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[180] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Review Moderation Report</h3>
                  <p className="mt-1 text-sm text-slate-500">Update the queue status and leave an optional resolution note.</p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-5" />
                </button>
              </div>

              <div className="mb-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Assignee</label>
                <select
                  value={assignedToUserId}
                  onChange={(event) => setAssignedToUserId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Unassigned</option>
                  {moderators.map((moderator) => (
                    <option key={moderator.id} value={moderator.id}>{moderator.name}</option>
                  ))}
                </select>
              </div>

              {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Evidence</p>
                  <div className="space-y-2">
                    {selectedReport.evidence.map((item) => (
                      <div key={`${item.label}-${item.value}`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                        <p className="mt-1 text-slate-700 dark:text-slate-200">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4 grid grid-cols-3 gap-2">
                {(['reviewing', 'resolved', 'dismissed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setNextStatus(status)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-bold ${nextStatus === status ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <textarea
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
                placeholder="Leave context for the reporter or your moderation team."
                className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-950"
              />

              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Escalation Reason</label>
                <textarea
                  value={escalationReason}
                  onChange={(event) => setEscalationReason(event.target.value)}
                  placeholder="Escalate this report to a higher-priority or external review queue."
                  className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Action History</p>
                <div className="space-y-3">
                  {selectedReportActions.map((action) => (
                    <div key={action.id} className="border-l-2 border-primary/20 pl-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{action.actionType} by {action.actorName}</p>
                      <p className="text-[11px] uppercase tracking-widest text-slate-400">{new Date(action.createdAt).toLocaleString()}</p>
                      {action.actionNote && <p className="mt-1 text-slate-600 dark:text-slate-300">{action.actionNote}</p>}
                    </div>
                  ))}
                  {selectedReportActions.length === 0 && (
                    <p className="text-slate-500">No recorded actions yet.</p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => { setSelectedReport(null); setSelectedReportActions([]); }} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting} className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-70">
                  {isSubmitting ? 'Saving…' : 'Save Review'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsScreen({ initialTab, settings, currentUser, securitySummary, trustedDevicesCount, securityAlertsCount, canModerate, onUpdateSetting, onBack, onOpenMenu, onNavigate, onLegal, showToast, onSignOut }: { initialTab: 'notifications' | 'security' | 'data', settings: UserSettings, currentUser: User, securitySummary: SecuritySummary | null, trustedDevicesCount: number, securityAlertsCount: number, canModerate: boolean, onUpdateSetting: (key: keyof UserSettings, value: boolean | string) => Promise<UserSettings>, onBack: () => void, onOpenMenu: () => void, onNavigate: (s: Screen) => void, onLegal: (type: 'tos' | 'privacy') => void, showToast: (msg: string) => void, onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'security' | 'data'>(initialTab);
  const [isUpdatingDay, setIsUpdatingDay] = useState(false);
  const [sendingDigestKind, setSendingDigestKind] = useState<'daily' | 'weekly' | null>(null);
  const deliveryDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const toggleSetting = async (key: keyof UserSettings) => {
    if ((key === 'dailyDigest' || key === 'weeklyDigest') && !settings.emailEnabled) {
      showToast('Enable email notifications to manage digest delivery.');
      return;
    }
    const nextValue = !settings[key] as boolean;
    if (key === 'emailEnabled' && !nextValue) {
      await onUpdateSetting('emailEnabled', false);
      if (settings.dailyDigest) {
        await onUpdateSetting('dailyDigest', false);
      }
      if (settings.weeklyDigest) {
        await onUpdateSetting('weeklyDigest', false);
      }
      showToast('Email notifications and digest delivery disabled');
      return;
    }
    await onUpdateSetting(key, nextValue);
    const settingName = String(key).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    showToast(`${settingName} ${nextValue ? 'enabled' : 'disabled'}`);
  };

  const handleDeliveryDayChange = async (nextDay: string) => {
    try {
      setIsUpdatingDay(true);
      await onUpdateSetting('deliveryDay', nextDay);
      showToast(`Weekly digest day set to ${nextDay}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update weekly digest day');
    } finally {
      setIsUpdatingDay(false);
    }
  };

  const handleSendDigestNow = async (kind: 'daily' | 'weekly') => {
    try {
      setSendingDigestKind(kind);
      const result = await sendDigestNow(kind);
      if (result.delivery.delivered) {
        showToast(`${kind === 'daily' ? 'Daily' : 'Weekly'} digest sent to ${result.recipient}`);
      } else {
        showToast(`${kind === 'daily' ? 'Daily' : 'Weekly'} digest prepared in debug mode. Configure SMTP_URL for inbox delivery.`);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to send digest email');
    } finally {
      setSendingDigestKind(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-xl font-bold">Settings</h2>
        </div>
        <button type="button" onClick={onOpenMenu} className="rounded-full p-2 text-primary hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </header>

      <div className="flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'notifications' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          Notifications
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          Security
        </button>
        <button 
          onClick={() => setActiveTab('data')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'data' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          Data
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {activeTab === 'notifications' ? (
          <>
            <section className="mb-6">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Global Controls
              </div>
              <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <SettingItem 
                  title="Push Notifications"
                  description="Controls in-app and push-style alert banners for new activity."
                  active={settings.pushEnabled}
                  onToggle={() => toggleSetting('pushEnabled')}
                />
                <SettingItem 
                  title="Email Notifications"
                  description="Controls email delivery, including daily and weekly digests."
                  active={settings.emailEnabled}
                  onToggle={() => toggleSetting('emailEnabled')}
                  showDivider={false}
                />
              </div>
            </section>

            <section className="mb-6">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Email Digests
              </div>
              <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <SettingItem 
                  title="Daily Digest"
                  description="A summary of research updates delivered every morning"
                  active={settings.dailyDigest}
                  onToggle={() => toggleSetting('dailyDigest')}
                  disabled={!settings.emailEnabled}
                />
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-500">Preview Daily Digest in-app</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => void handleSendDigestNow('daily')}
                        disabled={!settings.emailEnabled || sendingDigestKind === 'daily'}
                        className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm disabled:opacity-50"
                      >
                        {sendingDigestKind === 'daily' ? 'Sending…' : 'Send Test Email'}
                      </button>
                      <button 
                        onClick={() => onNavigate('daily-digest')}
                        className="text-[10px] font-bold text-primary uppercase tracking-widest bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                      >
                        Open Preview
                      </button>
                    </div>
                  </div>
                </div>
                <SettingItem 
                  title="Weekly Digest"
                  description="The most important research insights from the past week"
                  active={settings.weeklyDigest}
                  onToggle={() => toggleSetting('weeklyDigest')}
                  disabled={!settings.emailEnabled}
                  showDivider={false}
                />
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-500">Preview Weekly Digest in-app</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => void handleSendDigestNow('weekly')}
                        disabled={!settings.emailEnabled || sendingDigestKind === 'weekly'}
                        className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm disabled:opacity-50"
                      >
                        {sendingDigestKind === 'weekly' ? 'Sending…' : 'Send Test Email'}
                      </button>
                      <button 
                        onClick={() => onNavigate('weekly-digest')}
                        className="text-[10px] font-bold text-primary uppercase tracking-widest bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                      >
                        Open Preview
                      </button>
                    </div>
                  </div>
                </div>
                {settings.weeklyDigest && (
                  <div className="px-4 pb-4">
                    <div className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Weekly delivery day</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={settings.deliveryDay}
                            onChange={(event) => void handleDeliveryDayChange(event.target.value)}
                            disabled={isUpdatingDay || !settings.emailEnabled}
                            className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700"
                          >
                            {deliveryDays.map((day) => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                          {isUpdatingDay && <LoaderCircle className="size-4 animate-spin text-primary" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!settings.emailEnabled && (
                  <div className="px-4 pb-4">
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                      Turn email notifications back on to receive daily and weekly digests.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="mb-6">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Push Notifications
              </div>
              <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <SettingItem 
                  title="New Publications"
                  description="Instantly notify when followed authors publish"
                  active={settings.newPublications}
                  onToggle={() => toggleSetting('newPublications')}
                />
                <SettingItem 
                  title="Citation Alerts"
                  description="Get notified when your work is cited"
                  active={settings.citationAlerts}
                  onToggle={() => toggleSetting('citationAlerts')}
                  showDivider={false}
                />
              </div>
            </section>

            <section className="mb-6">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Updates & News
              </div>
              <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <SettingItem 
                  title="Product Updates"
                  description="Stay informed about new app features and tools"
                  active={settings.productUpdates}
                  onToggle={() => toggleSetting('productUpdates')}
                  showDivider={false}
                />
              </div>
            </section>

            <div className="px-8 py-6 text-center">
              <p className="text-xs text-slate-400 leading-relaxed">
                Unsubscribing from marketing will not affect critical service emails regarding your account security.
              </p>
            </div>
          </>
        ) : activeTab === 'security' ? (
          <>
            {securitySummary && (
              <section className="mb-6">
                <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Security Overview
                </div>
                <div className="mx-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                      <p className="mt-2 font-bold text-slate-900 dark:text-slate-100">{securitySummary.isEmailVerified ? 'Verified' : 'Unverified'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Two-Factor</p>
                      <p className="mt-2 font-bold text-slate-900 dark:text-slate-100">{securitySummary.hasTwoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passkeys</p>
                      <p className="mt-2 font-bold text-slate-900 dark:text-slate-100">{securitySummary.passkeyCount}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Backup Codes</p>
                      <p className="mt-2 font-bold text-slate-900 dark:text-slate-100">{securitySummary.hasTwoFactorEnabled ? securitySummary.backupCodesRemaining : 0} remaining</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!securitySummary.isEmailVerified && currentUser.email && (
                      <button
                        type="button"
                        onClick={() => {
                          void requestEmailVerification()
                            .then((response) => showToast(response.debugToken ? 'Verification token generated for local development' : response.message))
                            .catch((error) => showToast(error instanceof Error ? error.message : 'Unable to request email verification'));
                        }}
                        className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
                      >
                        Send Verification Email
                      </button>
                    )}
                    {securitySummary.hasTwoFactorEnabled && (
                      <button type="button" onClick={() => onNavigate('2fa-backup')} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Manage Backup Codes
                      </button>
                    )}
                    <button type="button" onClick={() => onNavigate('passkeys')} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      Manage Passkeys
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    Sensitive changes like removing your last passkey, disabling 2FA, or changing account recovery details may ask for recent authentication again even if you are already signed in.
                  </p>
                </div>
              </section>
            )}

            <section className="mb-6">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Account Security
              </div>
              <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <SecurityOption 
                  icon={<Key className="size-5" />}
                  title="Change Password"
                  description="Update your password regularly to stay secure"
                  onClick={() => onNavigate('change-password')}
                />
                <SecurityOption 
                  icon={<Shield className="size-5" />}
                  title="Two-Factor Authentication"
                  description={currentUser.hasTwoFactorEnabled ? 'Enabled for sign-in protection on this account' : 'Add an extra layer of security to your account'}
                  onClick={() => onNavigate('2fa-setup')}
                />
                {currentUser.hasTwoFactorEnabled && (
                  <SecurityOption
                    icon={<FileText className="size-5" />}
                    title="Backup Codes"
                    description={securitySummary ? `${securitySummary.backupCodesRemaining} recovery codes remaining` : 'Review or regenerate your recovery codes'}
                    onClick={() => onNavigate('2fa-backup')}
                  />
                )}
                <SecurityOption 
                  icon={<Key className="size-5" />}
                  title="Passkeys"
                  description={securitySummary ? `${securitySummary.passkeyCount} registered credential${securitySummary.passkeyCount === 1 ? '' : 's'}` : 'Register biometric or hardware-backed sign-in credentials'}
                  onClick={() => onNavigate('passkeys')}
                />
                <SecurityOption 
                  icon={<Key className="size-5" />}
                  title="Encryption Keys"
                  description="Manage your end-to-end encryption keys"
                  onClick={() => onNavigate('encryption-keys')}
                />
                <SecurityOption 
                  icon={<Smartphone className="size-5" />}
                  title="Trusted Devices"
                  description={trustedDevicesCount > 0 ? `${trustedDevicesCount} remembered device${trustedDevicesCount === 1 ? '' : 's'} or active sessions` : 'Manage devices that can access your account'}
                  onClick={() => onNavigate('trusted-devices')}
                />
                <SecurityOption 
                  icon={<History className="size-5" />}
                  title="Recent Activity"
                  description={securityAlertsCount > 0 ? `${securityAlertsCount} noteworthy event${securityAlertsCount === 1 ? '' : 's'} need review` : 'Review recent logins and security events'}
                  onClick={() => onNavigate('security-log')}
                  showDivider={!canModerate}
                />
                {canModerate && (
                  <SecurityOption
                    icon={<ShieldCheck className="size-5" />}
                    title="Moderation Center"
                    description="Review reports and close the moderation queue"
                    onClick={() => onNavigate('moderation-center')}
                    showDivider={false}
                  />
                )}
              </div>
            </section>

            <section className="mb-6">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Support
              </div>
              <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <SecurityOption 
                  icon={<HelpCircle className="size-5" />}
                  title="Help Center"
                  description="Find answers to common questions"
                  onClick={() => onNavigate('help')}
                />
                <SecurityOption 
                  icon={<MessageSquare className="size-5" />}
                  title="Contact Us"
                  description="Get in touch with our support team"
                  onClick={() => onNavigate('contact')}
                  showDivider={false}
                />
              </div>
            </section>

            <section className="mb-6">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Privacy & Access
              </div>
              <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 p-4 space-y-4">
                <PrivacySetting
                  label="Profile visibility"
                  description="Control who appears in people discovery and profile views."
                  value={settings.profileVisibility}
                  onChange={(value) => onUpdateSetting('profileVisibility', value)}
                  options={[
                    { value: 'public', label: 'Public' },
                    { value: 'followers', label: 'Followers only' },
                    { value: 'private', label: 'Private' },
                  ]}
                />
                <PrivacySetting
                  label="Direct messages"
                  description="Choose who can open a new direct conversation with you."
                  value={settings.messagePrivacy}
                  onChange={(value) => onUpdateSetting('messagePrivacy', value)}
                  options={[
                    { value: 'everyone', label: 'Everyone' },
                    { value: 'followers', label: 'Followers only' },
                    { value: 'nobody', label: 'Nobody' },
                  ]}
                />
                <PrivacySetting
                  label="Paper shares"
                  description="Choose who can send papers directly into your inbox."
                  value={settings.sharePrivacy}
                  onChange={(value) => onUpdateSetting('sharePrivacy', value)}
                  options={[
                    { value: 'everyone', label: 'Everyone' },
                    { value: 'followers', label: 'Followers only' },
                    { value: 'nobody', label: 'Nobody' },
                  ]}
                />
              </div>
            </section>

            <section className="px-4 mt-8">
              <button 
                onClick={onSignOut}
                className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <LogOut className="size-5" />
                Sign Out of Account
              </button>
            </section>

            <div className="px-8 py-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
                <ShieldCheck className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Encrypted</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your research data and personal information are protected by industry-standard encryption.
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <button onClick={() => onLegal('tos')} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Terms of Service</button>
                <span className="text-slate-300">•</span>
                <button onClick={() => onLegal('privacy')} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Privacy Policy</button>
              </div>
            </div>
          </>
        ) : (
          <DataManagementPanel showToast={showToast} />
        )}
      </div>
    </div>
  );
}

function DataManagementPanel({ showToast }: { showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const { dataset, importDataset, exportDataset, resetToSeed } = useAppData();
  const [importText, setImportText] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [backendQuery, setBackendQuery] = useState('quantum computing');
  const [isSyncingBackend, setIsSyncingBackend] = useState(false);
  const [contentSources, setContentSources] = useState<ContentSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('arxiv');
  const [maxResults, setMaxResults] = useState(15);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(1440);
  const [syncDefinitions, setSyncDefinitions] = useState<ContentSyncDefinition[]>([]);

  const refreshSyncDefinitions = () => {
    fetchContentSyncDefinitions()
      .then((response) => setSyncDefinitions(response.syncDefinitions))
      .catch(() => {});
  };

  useEffect(() => {
    fetchContentSources()
      .then((response) => {
        setContentSources(response.sources);
        if (response.sources.length > 0 && !response.sources.some((source) => source.id === selectedSourceId)) {
          setSelectedSourceId(response.sources[0].id);
        }
      })
      .catch(() => {});
    refreshSyncDefinitions();
  }, []);

  const handleImport = () => {
    try {
      const result = importDataset(importText);
      setWarnings(result.warnings);
      showToast('Dataset imported successfully');
      setImportText('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      showToast(message, 'info');
    }
  };

  const handleExport = async () => {
    const payload = exportDataset();
    await navigator.clipboard.writeText(payload);
    showToast('Dataset JSON copied to clipboard');
  };

  const handleReset = () => {
    resetToSeed();
    setWarnings([]);
    setImportText('');
    showToast('Restored seed dataset');
  };

  const handleLoadBackendCatalog = async () => {
    try {
      setIsSyncingBackend(true);
      const payload = await fetchBackendPreprints();
      const result = importDataset(JSON.stringify(payload));
      setWarnings(result.warnings);
      showToast(`Loaded ${payload.preprints.length} papers from the backend catalog`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load backend catalog', 'info');
    } finally {
      setIsSyncingBackend(false);
    }
  };

  const handleSourceSync = async () => {
    try {
      setIsSyncingBackend(true);
      const payload = await ingestContentSource(selectedSourceId, backendQuery, maxResults);
      const result = importDataset(JSON.stringify(payload.dataset));
      setWarnings(result.warnings);
      const sourceLabel = contentSources.find((source) => source.id === selectedSourceId)?.label ?? selectedSourceId;
      showToast(`Imported ${payload.imported} ${sourceLabel} records`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to ingest backend content', 'info');
    } finally {
      setIsSyncingBackend(false);
    }
  };

  const handleSaveSyncDefinition = async () => {
    try {
      const response = await saveContentSyncDefinition({
        sourceId: selectedSourceId,
        query: backendQuery,
        maxResults,
        intervalMinutes: syncIntervalMinutes,
        enabled: true,
      });
      setSyncDefinitions((prev) => [response.syncDefinition, ...prev.filter((item) => item.id !== response.syncDefinition.id)]);
      showToast(`Saved recurring sync for ${response.syncDefinition.sourceLabel}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save recurring sync', 'info');
    }
  };

  const handleToggleSyncDefinition = async (definition: ContentSyncDefinition) => {
    try {
      const response = await saveContentSyncDefinition({
        id: definition.id,
        sourceId: definition.sourceId,
        query: definition.query,
        maxResults: definition.maxResults,
        intervalMinutes: definition.intervalMinutes,
        enabled: !definition.enabled,
      });
      setSyncDefinitions((prev) => [response.syncDefinition, ...prev.filter((item) => item.id !== response.syncDefinition.id)]);
      showToast(response.syncDefinition.enabled ? 'Recurring sync resumed' : 'Recurring sync paused');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update recurring sync', 'info');
    }
  };

  const handleDeleteSyncDefinition = async (definitionId: string) => {
    try {
      await deleteContentSyncDefinition(definitionId);
      setSyncDefinitions((prev) => prev.filter((item) => item.id !== definitionId));
      showToast('Removed recurring sync');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to remove recurring sync', 'info');
    }
  };

  return (
    <div className="p-4 space-y-6">
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current Dataset</p>
            <h3 className="text-xl font-bold">{dataset.metadata.sourceLabel}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {dataset.metadata.isImported ? 'Imported dataset' : 'Seed dataset'} • Updated {new Date(dataset.metadata.lastUpdated).toLocaleString()}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${dataset.metadata.isImported ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            {dataset.metadata.isImported ? 'Live Input Ready' : 'Demo Seed'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DataStatCard label="Papers" value={dataset.preprints.length.toLocaleString()} />
          <DataStatCard label="Researchers" value={dataset.users.length.toLocaleString()} />
          <DataStatCard label="Institutions" value={dataset.institutions.length.toLocaleString()} />
          <DataStatCard label="Feeds" value={dataset.customFeeds.length.toLocaleString()} />
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="size-5 text-primary" />
          <h3 className="text-lg font-bold">Backend Sync</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Pull the persisted backend catalog or ingest fresh papers from live sources. The backend now normalizes raw source records into a deduplicated catalog before the app loads them.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            >
              {contentSources.map((source) => (
                <option key={source.id} value={source.id}>{source.label}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={50}
              value={maxResults}
              onChange={(e) => setMaxResults(Math.max(1, Math.min(50, Number(e.target.value) || 15)))}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="number"
              min={15}
              max={10080}
              value={syncIntervalMinutes}
              onChange={(e) => setSyncIntervalMinutes(Math.max(15, Math.min(10080, Number(e.target.value) || 1440)))}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <input
            type="text"
            value={backendQuery}
            onChange={(e) => setBackendQuery(e.target.value)}
            placeholder="Search query for the selected source"
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={handleSourceSync}
              disabled={!backendQuery.trim() || isSyncingBackend}
              className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {isSyncingBackend ? 'Syncing…' : 'Ingest Selected Source'}
            </button>
            <button
              onClick={handleSaveSyncDefinition}
              disabled={!backendQuery.trim() || isSyncingBackend}
              className="flex-1 bg-slate-900 text-white dark:bg-slate-700 py-3 rounded-xl font-bold disabled:opacity-50"
            >
              Save Recurring Sync
            </button>
            <button
              onClick={handleLoadBackendCatalog}
              disabled={isSyncingBackend}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold disabled:opacity-50"
            >
              Load Backend Catalog
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Available Sources</p>
            <div className="space-y-2">
              {contentSources.map((source) => (
                <div key={source.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{source.label}</p>
                    <p className="text-xs text-slate-500">{source.description}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{source.id}</span>
                </div>
              ))}
            </div>
          </div>
          {syncDefinitions.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Recurring Syncs</p>
              <div className="space-y-3">
                {syncDefinitions.map((definition) => (
                  <div key={definition.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{definition.sourceLabel}</p>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${definition.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                          {definition.enabled ? 'Enabled' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Query: {definition.query}</p>
                      <p className="text-xs text-slate-500">
                        Every {definition.intervalMinutes} min • max {definition.maxResults} • next {definition.enabled ? (definition.nextRunAt ? new Date(definition.nextRunAt).toLocaleString() : 'not scheduled') : 'paused'}
                      </p>
                      {definition.lastStatus && (
                        <p className="text-xs text-slate-500">
                          Last run: {definition.lastStatus} {definition.lastRunAt ? `at ${new Date(definition.lastRunAt).toLocaleString()}` : ''}
                        </p>
                      )}
                      {definition.lastError && <p className="text-xs text-red-500">{definition.lastError}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => void handleToggleSyncDefinition(definition)}
                        className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500"
                      >
                        {definition.enabled ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleDeleteSyncDefinition(definition.id)}
                        className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Database className="size-5 text-primary" />
          <h3 className="text-lg font-bold">Import JSON</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Paste a JSON object with a `preprints` or `papers` array. Optional arrays such as `users`, `institutions`, `collections`, `notifications`, and `customFeeds` will be used when present.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={`{\n  "sourceLabel": "Lab export",\n  "preprints": [\n    {\n      "id": "paper-1",\n      "title": "Example title",\n      "authors": ["Ada Lovelace"],\n      "publishedAt": "2026-03-15",\n      "source": "arXiv",\n      "tags": ["AI"],\n      "abstract": "Summary..."\n    }\n  ]\n}`}
          className="w-full min-h-[240px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
          >
            Import Dataset
          </button>
          <button
            onClick={handleExport}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold"
          >
            Copy Current JSON
          </button>
        </div>
        {warnings.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Import Notes</p>
            {warnings.map(warning => (
              <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">{warning}</p>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="size-5 text-primary" />
          <h3 className="text-lg font-bold">Reset & Fallback</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Resetting restores the bundled seed dataset. Your imported JSON is removed, but local saved-paper bookmarks remain intact.
        </p>
        <button
          onClick={handleReset}
          className="w-full py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 font-bold dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300"
        >
          Restore Seed Dataset
        </button>
      </section>
    </div>
  );
}

function DataStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function SettingItem({ title, description, active, onToggle, disabled = false, showDivider = true }: { 
  title: string, 
  description: string, 
  active: boolean, 
  onToggle: () => void,
  disabled?: boolean,
  showDivider?: boolean
}) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 pr-4">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h4>
          <p className={`text-xs mt-0.5 ${disabled ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={`relative h-6 w-12 rounded-full transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
          <div className={`absolute top-1 left-1 size-4 bg-white rounded-full transition-transform shadow-sm ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
      </div>
      {showDivider && <div className="absolute bottom-0 left-4 right-0 h-px bg-slate-100 dark:bg-slate-800"></div>}
    </div>
  );
}

function PrivacySetting({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => Promise<unknown>;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md">{description}</p>
        </div>
        <select
          value={value}
          onChange={(event) => { void onChange(event.target.value); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SecurityOption({ icon, title, description, onClick, showDivider = true }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  onClick: () => void,
  showDivider?: boolean
}) {
  return (
    <div className="relative">
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <ChevronRight className="size-5 text-slate-300" />
      </button>
      {showDivider && <div className="absolute bottom-0 left-16 right-0 h-px bg-slate-100 dark:bg-slate-800"></div>}
    </div>
  );
}

function ChangePasswordScreen({ currentUser, onBack, showToast }: { currentUser: User, onBack: () => void, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  const handleUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('All password fields are required', 'info');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password confirmation does not match', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await changePassword(currentPassword, newPassword);
      showToast('Password updated successfully!');
      onBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update password', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!currentUser.email) {
      showToast('No account email is available for password recovery', 'info');
      return;
    }
    try {
      setIsRequestingReset(true);
      const response = await requestPasswordReset(currentUser.email);
      showToast(response.debugToken ? 'Password reset token generated for local development' : response.message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to request password reset', 'info');
    } finally {
      setIsRequestingReset(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10 bg-white dark:bg-slate-900">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-xl font-bold">Change Password</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-2">Security Settings</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            To protect your researcher account and sensitive data, please ensure your new password is at least 8 characters long and includes a mix of letters, numbers, and symbols.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold">Current Password</label>
            <div className="relative">
              <input 
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pr-12 text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showCurrent ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleForgotPassword()}
              disabled={isRequestingReset}
              className="text-xs font-bold text-primary text-right w-full disabled:opacity-50"
            >
              {isRequestingReset ? 'Sending reset email…' : 'Forgot Password?'}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">New Password</label>
            <div className="relative">
              <input 
                type={showNew ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pr-12 text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showNew ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pr-12 text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showConfirm ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <button 
            onClick={handleUpdate}
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            {isSubmitting ? 'Updating…' : 'Update Password'}
          </button>
          <button onClick={onBack} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 rounded-xl font-bold">Cancel</button>
        </div>

        <div className="mt-12 bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="size-6" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">End-to-End Encrypted</p>
        </div>
      </div>
    </div>
  );
}

function TwoFactorAuthScreen({ currentUser, securitySummary, onBack, onNext, onEnable, onDisable, onRegenerate, onOpenBackupCodes, onOpenHelp, showToast }: { currentUser: User, securitySummary: SecuritySummary | null, onBack: () => void, onNext: () => void, onEnable: (code: string) => Promise<string[]>, onDisable: (code: string) => Promise<void>, onRegenerate: (code: string) => Promise<string[]>, onOpenBackupCodes: () => void, onOpenHelp: () => void, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const [step, setStep] = useState<'intro' | 'setup'>(currentUser.hasTwoFactorEnabled ? 'setup' : 'intro');
  const [setupPayload, setSetupPayload] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const beginSetup = async () => {
    try {
      setIsSubmitting(true);
      const payload = await startTwoFactorSetup();
      setSetupPayload({ secret: payload.secret, qrCodeDataUrl: payload.qrCodeDataUrl });
      setStep('setup');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to start 2FA setup', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      showToast('Enter the authenticator code', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await onEnable(verificationCode);
      showToast('2FA enabled successfully');
      onNext();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to enable 2FA', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!disableCode.trim()) {
      showToast('Enter a current authenticator or backup code', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await onDisable(disableCode);
      showToast('2FA disabled');
      onBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to disable 2FA', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    if (!disableCode.trim()) {
      showToast('Enter a current authenticator or backup code to generate fresh backup codes', 'info');
      return;
    }
    try {
      setIsSubmitting(true);
      await onRegenerate(disableCode);
      setDisableCode('');
      showToast('Fresh backup codes generated');
      onOpenBackupCodes();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to generate backup codes', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const disableWarning = currentUser.hasTwoFactorEnabled && !currentUser.isEmailVerified;

  if (step === 'intro') {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10 bg-white dark:bg-slate-900">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-xl font-bold">Security Setup</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-10 flex flex-col items-center justify-center mb-10 relative overflow-hidden">
            <div className="size-24 rounded-full bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 z-10">
              <Shield className="size-12" />
            </div>
            <div className="flex gap-4 mt-6 z-10">
              <div className="size-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-primary">
                <Smartphone className="size-5" />
              </div>
              <div className="size-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-primary">
                <Key className="size-5" />
              </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary blur-3xl"></div>
              <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-primary blur-3xl"></div>
            </div>
          </div>

          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold mb-4">Secure Your Research Data</h3>
            <p className="text-sm text-slate-500 leading-relaxed px-4">
              Two-factor authentication adds an essential extra layer of security. Even if someone knows your password, they won't be able to access your sensitive research findings without your physical device.
            </p>
          </div>

          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Enhanced Protection</h4>
                <p className="text-xs text-slate-500">Protects your account against password theft.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Smartphone className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Multi-Device Trust</h4>
                <p className="text-xs text-slate-500">Manage which devices can access your lab results.</p>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button onClick={beginSetup} disabled={isSubmitting} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20">{isSubmitting ? 'Preparing…' : 'Get Started'}</button>
            <button onClick={onBack} className="w-full py-4 rounded-xl font-bold text-slate-500">Not Now</button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.hasTwoFactorEnabled) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10 bg-white dark:bg-slate-900">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/30 dark:bg-emerald-900/10">
            <ShieldCheck className="mx-auto mb-3 size-10 text-emerald-600" />
            <h3 className="text-xl font-bold">2FA Enabled</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your account requires an authenticator code or a backup code at sign-in.</p>
          </div>
          {securitySummary && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="font-bold text-slate-900 dark:text-slate-100">Recovery status</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                {securitySummary.backupCodesRemaining} backup code{securitySummary.backupCodesRemaining === 1 ? '' : 's'} remaining • {securitySummary.passkeyCount} passkey{securitySummary.passkeyCount === 1 ? '' : 's'} registered • {securitySummary.isEmailVerified ? 'email verified' : 'email not verified'}.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-bold">Authenticator or Backup Code</label>
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="Use this to disable 2FA or generate fresh backup codes"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          {disableWarning && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
              Your email is not verified. If you disable 2FA without another recovery method, you can lock yourself out of this account.
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button onClick={handleGenerateBackupCodes} disabled={isSubmitting} className="w-full rounded-xl border border-slate-200 bg-white py-4 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              {isSubmitting ? 'Working…' : 'Generate Fresh Backup Codes'}
            </button>
            <button onClick={handleDisable} disabled={isSubmitting} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold">
              {isSubmitting ? 'Updating…' : 'Disable Two-Factor Authentication'}
            </button>
          </div>
          <button type="button" onClick={onOpenBackupCodes} className="w-full py-3 text-sm font-bold text-primary">
            Open Backup Codes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10 bg-white dark:bg-slate-900">
        <ArrowLeft className="cursor-pointer" onClick={() => setStep('intro')} />
        <h2 className="text-xl font-bold">Security Settings</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Key className="size-8" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Enable 2FA</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Scan the QR code below with your authenticator app (like Google Authenticator or Authy).
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 flex flex-col items-center mb-6 border border-slate-100 dark:border-slate-800">
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-6">
            {setupPayload ? (
              <img src={setupPayload.qrCodeDataUrl} alt="2FA QR Code" className="size-48 rounded-xl" />
            ) : (
              <div className="size-48 bg-slate-100 flex items-center justify-center">
                <QrCode className="size-32 text-slate-800" />
              </div>
            )}
          </div>
          
          <div className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold">Can't scan the code?</h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">Enter the secret key manually.</p>
            <button onClick={() => setShowSecret(value => !value)} className="text-primary text-xs font-bold flex items-center gap-1">
              {showSecret ? 'Hide Secret Key' : 'View Secret Key'} <ChevronRight className={`size-3 transition-transform ${showSecret ? 'rotate-90' : ''}`} />
            </button>
            {showSecret && setupPayload && (
              <p className="mt-3 break-all rounded-xl bg-slate-50 p-3 font-mono text-xs">{setupPayload.secret}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold block">Verification Code</label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="123456"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-primary transition-colors"
          />
          <p className="text-center text-xs text-slate-400 mt-2">Enter the 6-digit code from your app</p>
        </div>

        <div className="mt-8 mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Trusted devices are offered after successful 2FA sign-in. You can review or revoke them later from <span className="font-bold">Trusted Devices</span>.
        </div>

        <button onClick={handleVerify} disabled={isSubmitting} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
          Verify and Activate <ShieldCheck className="size-5" />
        </button>

        <button type="button" onClick={onOpenHelp} className="w-full py-4 text-sm font-bold text-primary mt-4">Need help setting up?</button>

        <div className="mt-10 flex items-center justify-center gap-2 text-slate-400">
          <Lock className="size-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure 256-bit encrypted connection</span>
        </div>
      </div>
    </div>
  );
}

function TwoFactorBackupCodesScreen({ backupCodes, onBack, onRegenerate, onDone, showToast }: { backupCodes: string[], onBack: () => void, onRegenerate: (code: string) => Promise<string[]>, onDone: () => void, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const [codes, setCodes] = useState(backupCodes);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    setCodes(backupCodes);
  }, [backupCodes]);

  const handleCopy = () => {
    if (codes.length === 0) {
      showToast('Generate fresh backup codes first', 'info');
      return;
    }
    navigator.clipboard.writeText(codes.join('\n'));
    showToast('Backup codes copied to clipboard!');
  };

  const handleDownload = () => {
    if (codes.length === 0) {
      showToast('Generate fresh backup codes first', 'info');
      return;
    }
    downloadTextFile('preprint-explorer-backup-codes.txt', codes.join('\n'));
    showToast('Backup codes downloaded as a text file.');
  };

  const handleRegenerate = async () => {
    if (!verificationCode.trim()) {
      showToast('Enter a current authenticator or backup code', 'info');
      return;
    }
    try {
      const nextCodes = await onRegenerate(verificationCode);
      setCodes(nextCodes);
      setVerificationCode('');
      showToast('Backup codes regenerated');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to regenerate backup codes', 'info');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10 bg-white dark:bg-slate-900">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-xl font-bold">Security Settings</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <ShieldCheck className="size-8" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Two-Factor Authentication Enabled</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your account is now extra secure. Save these backup codes in a safe place. You can use them to log in if you lose access to your primary device.
          </p>
        </div>

        <div className="flex gap-3 mb-8">
          <button onClick={handleDownload} disabled={codes.length === 0} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Download className="size-4" /> Download Codes
          </button>
          <button onClick={handleCopy} disabled={codes.length === 0} className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Copy className="size-4" /> Copy All
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden mb-8">
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Backup Codes</span>
          </div>
          {codes.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              No current backup codes are displayed. Generate a fresh set below to replace any old recovery codes and save them somewhere safe.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {codes.map(code => (
                <div key={code} className="px-4 py-4 text-base font-mono font-medium text-slate-700 dark:text-slate-300 tracking-wider">
                  {code}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 mb-10">
          <label className="text-sm font-bold">Regenerate Backup Codes</label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Current authenticator or backup code"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-sm outline-none"
          />
          <button onClick={handleRegenerate} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 py-3 text-sm font-bold">
            Generate New Backup Codes
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex gap-4 mb-10">
          <AlertTriangle className="size-5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Treat these codes like your password. Each code can only be used once. Once used, it will be marked as invalid.
          </p>
        </div>

        <button onClick={onDone} className="mt-auto w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-xl font-bold">Done</button>
      </div>
    </div>
  );
}

function PasskeysScreen({ currentUser, passkeys, securitySummary, onBack, onOpenTrustedDevices, onRegisterPasskey, onDeletePasskey, showToast }: { currentUser: User, passkeys: PasskeyCredential[], securitySummary: SecuritySummary | null, onBack: () => void, onOpenTrustedDevices: () => void, onRegisterPasskey: (label?: string) => Promise<PasskeyCredential[]>, onDeletePasskey: (passkeyId: string) => Promise<void>, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const [label, setLabel] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmingRemovalId, setConfirmingRemovalId] = useState<string | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const hasRecoveryRisk = securitySummary ? !securitySummary.isEmailVerified || (!securitySummary.hasTwoFactorEnabled && securitySummary.passkeyCount === 0) || (securitySummary.hasTwoFactorEnabled && securitySummary.backupCodesRemaining === 0 && securitySummary.passkeyCount === 0) : false;

  const handleRegister = async () => {
    try {
      setIsRegistering(true);
      await onRegisterPasskey(label);
      setLabel('');
      showToast('Passkey registered');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to register passkey', 'info');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemove = async (passkeyId: string) => {
    const removingLastPasskey = passkeys.length === 1 && passkeys[0]?.id === passkeyId;
    const riskyRemoval = removingLastPasskey && securitySummary && (!securitySummary.hasTwoFactorEnabled || securitySummary.backupCodesRemaining === 0 || !securitySummary.isEmailVerified);
    if (riskyRemoval) {
      setConfirmingRemovalId(passkeyId);
      return;
    }
    await removePasskey(passkeyId);
  };

  const removePasskey = async (passkeyId: string) => {
    try {
      setRemovingId(passkeyId);
      await onDeletePasskey(passkeyId);
      showToast('Passkey removed');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to remove passkey', 'info');
    } finally {
      setRemovingId(null);
      setConfirmingRemovalId(null);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!currentUser.email) {
      showToast('No account email is available for verification', 'info');
      return;
    }
    try {
      setIsSendingVerification(true);
      const response = await requestEmailVerification();
      showToast(response.debugToken ? 'Verification token generated for local development' : response.message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to request email verification', 'info');
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10 bg-white dark:bg-slate-900">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <div>
          <h2 className="text-xl font-bold">Passkeys</h2>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Security Settings</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {securitySummary && (
          <div className={`rounded-3xl border p-5 ${hasRecoveryRisk ? 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`mt-0.5 size-5 shrink-0 ${hasRecoveryRisk ? 'text-amber-500' : 'text-emerald-600'}`} />
              <div className="space-y-2 text-sm">
                <p className="font-bold">{hasRecoveryRisk ? 'Recovery coverage needs attention' : 'Recovery coverage looks healthy'}</p>
                <p className="text-slate-600 dark:text-slate-300">
                  {securitySummary.passkeyCount} passkey{securitySummary.passkeyCount === 1 ? '' : 's'}, {securitySummary.hasTwoFactorEnabled ? `${securitySummary.backupCodesRemaining} backup codes remaining` : '2FA disabled'}, {securitySummary.isEmailVerified ? 'verified email' : 'email not verified'}.
                </p>
                {hasRecoveryRisk && (
                  <p className="text-slate-600 dark:text-slate-300">
                    Add at least one passkey and keep email verification and recovery codes current so you do not lock yourself out of the account.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-bold text-slate-900 dark:text-slate-100">Passkeys vs trusted devices</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Passkeys are your sign-in credentials. Trusted devices are browsers or devices you chose to remember after two-factor verification. Removing a trusted device does not remove a passkey, and removing a passkey does not sign a device out.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onOpenTrustedDevices} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Open Trusted Devices
            </button>
            {securitySummary && !securitySummary.isEmailVerified && (
              <button
                type="button"
                onClick={() => void handleSendVerificationEmail()}
                disabled={isSendingVerification}
                className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
              >
                {isSendingVerification ? 'Sending…' : 'Verify Recovery Email'}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6">
          <h3 className="text-lg font-bold">Register a new passkey</h3>
          <p className="mt-2 text-sm text-slate-500">Use Face ID, Touch ID, Windows Hello, or a hardware security key to sign in without a password.</p>
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional label, e.g. MacBook Pro"
              className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm outline-none"
            />
            <button onClick={handleRegister} disabled={isRegistering} className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20">
              {isRegistering ? 'Waiting…' : 'Add Passkey'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Registered Passkeys</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Removing a passkey can require recent authentication and may be blocked if it would weaken account recovery too far.
          </p>
          {passkeys.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
              No passkeys registered yet.
            </div>
          )}
          {passkeys.map(passkey => (
            <div key={passkey.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{passkey.label}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tighter ${passkey.deviceType === 'multiDevice' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {passkey.deviceType === 'multiDevice' ? 'Syncable' : 'Device-bound'}
                    </span>
                    {passkey.backedUp && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tighter text-emerald-600">Backed up</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Added {new Date(passkey.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-[11px] text-slate-400">Last used {formatRelativeTimestamp(passkey.lastUsedAt)}</p>
                  {passkey.transports.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {passkey.transports.map(transport => (
                        <span key={transport} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {transport}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(passkey.id)}
                  disabled={removingId === passkey.id}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600"
                >
                  {removingId === passkey.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {confirmingRemovalId && (
          <ConfirmActionModal
            title="Confirm Passkey Removal"
            description="Removing this passkey weakens account recovery. Continue only if you still have another trusted sign-in or recovery method."
            confirmLabel="Remove Passkey"
            isConfirming={removingId === confirmingRemovalId}
            onCancel={() => setConfirmingRemovalId(null)}
            onConfirm={async () => {
              const passkeyId = confirmingRemovalId;
              setConfirmingRemovalId(null);
              if (passkeyId) {
                await removePasskey(passkeyId);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EncryptionKeysScreen({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) {
  const [keys, setKeys] = useState<EncryptionKeyRecord[]>(() => storageService.getEncryptionKeys());

  useEffect(() => {
    storageService.saveEncryptionKeys(keys);
  }, [keys]);

  const handleRotateKey = (id: string) => {
    setKeys((current) => current.map((key) => key.id === id ? {
      ...key,
      created: new Date().toISOString().slice(0, 10),
      status: 'Active',
    } : {
      ...key,
      status: key.status === 'Active' ? 'Stored' : key.status,
    }));
    showToast('Key rotated successfully!');
  };

  const handleGenerateKey = () => {
    const keyCount = keys.length + 1;
    setKeys((current) => [{
      id: `generated-key-${Date.now()}`,
      name: `Generated Key ${keyCount}`,
      created: new Date().toISOString().slice(0, 10),
      status: 'Stored',
    }, ...current]);
    showToast('Generated a new key record');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-xl font-bold">Encryption Keys</h2>
      </header>
      <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-3">
          <Shield className="size-5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Your research data is protected by end-to-end encryption. Only you hold the keys to decrypt your private lab notes and unpublished drafts.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">Active Keys</h3>
          {keys.map(key => (
            <div key={key.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{key.name}</p>
                <p className="text-[10px] text-slate-500">Created: {key.created} • Status: {key.status}</p>
              </div>
              <button 
                onClick={() => handleRotateKey(key.id)}
                className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <History className="size-5" />
              </button>
            </div>
          ))}
        </div>

        <button 
          onClick={handleGenerateKey}
          className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 font-bold text-sm flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="size-5" />
          Generate New Key
        </button>
      </div>
    </div>
  );
}

function formatRelativeTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return value;
  }
  const diffMinutes = Math.round((Date.now() - timestamp) / (1000 * 60));
  if (diffMinutes <= 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function TrustedDevicesScreen({ devices, onBack, onRemoveDevice, showToast }: { devices: TrustedDevice[], onBack: () => void, onRemoveDevice: (id: string) => Promise<void>, showToast: (msg: string) => void }) {
  const handleRemoveDevice = async (id: string) => {
    try {
      await onRemoveDevice(id);
      showToast('Device removed and access revoked.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to revoke device access');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-xl font-bold">Trusted Devices</h2>
      </header>
      <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-bold text-slate-900 dark:text-slate-100">What you are seeing here</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            <span className="font-bold">Remembered</span> devices are browsers you allowed to skip repeated two-factor prompts for a limited time. <span className="font-bold">Session</span> entries are currently signed-in sessions. The current session cannot be revoked from this list.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">Authorized Devices</h3>
          {devices.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
              No remembered devices or active sessions found.
            </div>
          )}
          {devices.map(device => (
            <div key={device.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  {device.type === 'Desktop' ? <Building2 className="size-5" /> : <Smartphone className="size-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{device.name}</p>
                    {device.isCurrent && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Current</span>}
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${device.accessType === 'trusted' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {device.accessType === 'trusted' ? 'Remembered' : 'Session'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{device.location} • {formatRelativeTimestamp(device.lastActive)}</p>
                  {device.trustedUntil && <p className="text-[10px] text-slate-400">Trusted until {new Date(device.trustedUntil).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                </div>
              </div>
              {!device.isCurrent && (
                <button 
                  onClick={() => handleRemoveDevice(device.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800 flex gap-3">
          <AlertTriangle className="size-5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            Removing a device will immediately log it out and revoke its access to your research vault. You will need to re-authorize it using 2FA.
          </p>
        </div>
      </div>
    </div>
  );
}

function SecurityLogScreen({ logs, onBack, onRotateSession, onLogoutOthers, showToast }: { logs: SecurityEvent[], onBack: () => void, onRotateSession: () => Promise<void>, onLogoutOthers: () => Promise<void>, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const [selectedLog, setSelectedLog] = useState<SecurityEvent | null>(null);
  const getIcon = (type: string) => {
    switch (type) {
      case 'login': return <LogIn className="size-5" />;
      case 'password': return <Key className="size-5" />;
      case '2fa': return <Shield className="size-5" />;
      case 'session': return <History className="size-5" />;
      case 'device': return <Smartphone className="size-5" />;
      default: return <Shield className="size-5" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'device': return 'bg-amber-100 text-amber-600';
      case 'password': return 'bg-rose-100 text-rose-600';
      default: return 'bg-primary/10 text-primary';
    }
  };

  const latestAlertLog = logs.find((log) => log.alert) ?? logs[0] ?? null;

  const handleRotateCurrentSession = async () => {
    try {
      await onRotateSession();
      showToast('Session rotated successfully');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to rotate session', 'info');
    }
  };

  const handleLogoutOthers = async () => {
    try {
      await onLogoutOthers();
      showToast('Signed out of all other sessions');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to revoke other sessions', 'info');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10 bg-white dark:bg-slate-900">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <div>
          <h2 className="text-xl font-bold">Recent Activity</h2>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Security Settings</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="font-bold text-slate-900 dark:text-slate-100">About recent-auth checks</p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Sensitive security changes can ask you to confirm your identity again with a password, authenticator code, or passkey even during an active session. That protects this account if a signed-in browser is left unattended.
            </p>
          </div>

          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Activity Log</h3>
          {logs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
              No security events recorded yet.
            </div>
          )}
          
          <div className="space-y-6">
            {logs.map(log => (
              <div 
                key={log.id} 
                onClick={() => setSelectedLog(log)}
                className="flex items-start gap-4 group cursor-pointer"
              >
                <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${getIconBg(log.type)}`}>
                  {getIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0 border-b border-slate-100 dark:border-slate-800 pb-6 group-last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold">{log.title}</h4>
                      {log.current && <span className="bg-emerald-100 text-emerald-600 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">Current</span>}
                      {log.alert && <AlertTriangle className="size-3 text-amber-500" />}
                    </div>
                    <ChevronRight className="size-5 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500 mb-1">{log.device} • {log.location}</p>
                  <p className="text-xs text-slate-400">{log.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-6">
            <button 
              onClick={handleLogoutOthers}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <LogOut className="size-5" /> Sign Out of Other Sessions
            </button>
            <button 
              onClick={handleRotateCurrentSession}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <History className="size-5" /> Rotate Current Session
            </button>
            <p className="text-center text-xs text-slate-400 px-10">
              This only revokes your other active sessions. Remembered devices are managed separately above.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-dashed border-slate-200 dark:border-slate-700 text-center">
              <p className="text-sm text-slate-500">
                Don't recognize an activity? <button onClick={() => latestAlertLog ? setSelectedLog(latestAlertLog) : void handleRotateCurrentSession()} className="text-primary font-bold">Secure your account</button>
              </p>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {selectedLog && (
          <ConfirmActionModal
            title={selectedLog.title}
            description={`${selectedLog.device} • ${selectedLog.location} • ${selectedLog.time}${selectedLog.alert ? ' • Marked as noteworthy activity.' : ''}`}
            confirmLabel="Close"
            cancelLabel="Rotate Session"
            onCancel={() => {
              void handleRotateCurrentSession().finally(() => setSelectedLog(null));
            }}
            onConfirm={() => setSelectedLog(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Sidebar({ currentUser, currentScreen, legalType, unreadNotificationsCount, unreadMessagesCount, openModerationCount, onClose, onOpenNotifications, onNavigate, onLegal, onSignOut }: { 
  currentUser: User,
  currentScreen: Screen,
  legalType: 'tos' | 'privacy',
  unreadNotificationsCount: number,
  unreadMessagesCount: number,
  openModerationCount: number,
  onClose: () => void, 
  onOpenNotifications: () => void,
  onNavigate: (s: Screen) => void,
  onLegal: (type: 'tos' | 'privacy') => void,
  onSignOut: () => Promise<void>
}) {
  return (
    <motion.div 
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 z-[150] shadow-2xl flex flex-col"
    >
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div 
          className="flex items-center gap-4 mb-6 cursor-pointer group"
          onClick={() => { onClose(); onNavigate('profile'); }}
        >
          <img 
            src={currentUser.imageUrl} 
            alt="Profile" 
            className="size-16 rounded-full border-2 border-primary/10 object-cover group-hover:border-primary transition-all"
          />
          <div>
            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{currentUser.name}</h3>
            <p className="text-xs text-slate-500">{currentUser.email}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-sm font-bold text-primary">{currentUser.followers.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-primary">{currentUser.following.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Following</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
        <SidebarItem icon={<Home className="size-5" />} label="Home" active={currentScreen === 'home'} onClick={() => onNavigate('home')} />
        <SidebarItem icon={<Bell className="size-5" />} label="Alerts" active={currentScreen === 'notifications'} badge={unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined} onClick={onOpenNotifications} />
        <SidebarItem icon={<TrendingUp className="size-5" />} label="Trends" active={currentScreen === 'trends' || currentScreen === 'topic-insight'} onClick={() => onNavigate('trends')} />
        <SidebarItem icon={<Rss className="size-5" />} label="Feeds" active={currentScreen === 'feeds'} onClick={() => onNavigate('feeds')} />
        <SidebarItem icon={<LibraryIcon className="size-5" />} label="Library" active={currentScreen === 'library' || currentScreen === 'collections' || currentScreen === 'collection-detail' || currentScreen === 'share'} onClick={() => onNavigate('library')} />
        <SidebarItem icon={<MessageSquare className="size-5" />} label="Messages" active={currentScreen === 'chat' || currentScreen === 'chat-detail'} badge={unreadMessagesCount > 0 ? unreadMessagesCount : undefined} onClick={() => onNavigate('chat')} />
        <SidebarItem icon={<Settings className="size-5" />} label="Settings" active={currentScreen === 'notification-settings' || currentScreen === 'security-settings' || currentScreen === 'change-password' || currentScreen === '2fa-setup' || currentScreen === '2fa-backup' || currentScreen === 'security-log' || currentScreen === 'passkeys' || currentScreen === 'encryption-keys' || currentScreen === 'trusted-devices'} onClick={() => onNavigate('notification-settings')} />
        {currentUser.isAdmin && (
          <SidebarItem icon={<ShieldCheck className="size-5" />} label="Moderation Center" active={currentScreen === 'moderation-center'} badge={openModerationCount > 0 ? openModerationCount : undefined} onClick={() => onNavigate('moderation-center')} />
        )}
        
        <div className="h-px bg-slate-100 dark:bg-slate-800 my-4"></div>
        
        <SidebarItem icon={<FileText className="size-5" />} label="Terms of Service" active={currentScreen === 'legal' && legalType === 'tos'} onClick={() => onLegal('tos')} />
        <SidebarItem icon={<Shield className="size-5" />} label="Privacy Policy" active={currentScreen === 'legal' && legalType === 'privacy'} onClick={() => onLegal('privacy')} />
        <SidebarItem icon={<HelpCircle className="size-5" />} label="Help" active={currentScreen === 'help'} onClick={() => onNavigate('help')} />
        <SidebarItem icon={<MessageSquare className="size-5" />} label="App Contact" active={currentScreen === 'contact'} onClick={() => onNavigate('contact')} />
      </div>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={async () => { await onSignOut(); onClose(); }}
          className="flex items-center gap-3 text-red-500 font-bold text-sm"
        >
          <LogOut className="size-5" />
          Sign Out
        </button>
      </div>
      
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <X className="size-6" />
      </button>
    </motion.div>
  );
}

function SidebarItem({ icon, label, active = false, badge, onClick }: { icon: React.ReactNode, label: string, active?: boolean, badge?: number, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
    >
      <div className={active ? 'text-primary' : 'text-primary'}>{icon}</div>
      <span className="text-sm font-bold">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function ChatScreen({ currentUserId, onChatClick, onStartChat, onBack, showToast }: { currentUserId: string, onChatClick: (chat: Chat) => void, onStartChat: (user: User) => void, onBack: () => void, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const { dataset } = useAppData();
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [composeSearchQuery, setComposeSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const composeSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!showCompose) {
      return;
    }
    window.requestAnimationFrame(() => {
      composeSearchRef.current?.focus();
    });
  }, [showCompose]);

  const filteredChats = dataset.chats.filter(chat => {
    const normalized = chatSearchQuery.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    const otherUserId = chat.participants.find(p => p !== currentUserId);
    const otherUser = dataset.users.find(u => u.id === otherUserId);
    const messageText = chat.messages.map(message => message.text).join(' ').toLowerCase();
    return (
      (otherUser?.name ?? otherUserId ?? '').toLowerCase().includes(normalized)
      || (otherUser?.affiliation ?? '').toLowerCase().includes(normalized)
      || (chat.lastMessage ?? '').toLowerCase().includes(normalized)
      || messageText.includes(normalized)
    );
  });

  const availableUsers = dataset.users
    .filter(user => user.id !== currentUserId)
    .filter(user => {
      if (!composeSearchQuery.trim()) {
        return true;
      }
      const normalized = composeSearchQuery.toLowerCase();
      return user.name.toLowerCase().includes(normalized) || user.affiliation.toLowerCase().includes(normalized);
    })
    .slice(0, 8);

  const handleStartChat = (user: User) => {
    onStartChat(user);
    setShowCompose(false);
    setComposeSearchQuery('');
  };

  const handleComposeSearchReset = () => {
    setComposeSearchQuery('');
    window.requestAnimationFrame(() => {
      composeSearchRef.current?.focus();
    });
    showToast('Showing available researchers again.');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowSearch(prev => !prev)} className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Search conversations">
            <Search className="size-5" />
          </button>
          <button type="button" onClick={() => setShowCompose(true)} className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-transform" aria-label="Start a new chat">
            <Plus className="size-5" />
          </button>
        </div>
      </header>

      {showSearch && (
        <div className="border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(event) => setChatSearchQuery(event.target.value)}
              placeholder="Search people or messages..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredChats.length > 0 ? filteredChats.map(chat => {
          const otherUserId = chat.participants.find(p => p !== currentUserId);
          const otherUser = dataset.users.find(u => u.id === otherUserId);
          
          return (
            <div 
              key={chat.id} 
              onClick={() => onChatClick(chat)}
              className="p-4 flex items-center gap-4 border-b border-slate-50 dark:border-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
            >
              <div className="relative">
                <img 
                  src={otherUser?.imageUrl || `https://i.pravatar.cc/150?u=${otherUserId}`} 
                  alt="" 
                  className="size-14 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                />
                {chat.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 size-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-bold truncate">{otherUser?.name || otherUserId}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">{formatChatListTime(chat.lastMessageAt, chat.lastMessageTime)}</span>
                </div>
                <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-500'}`}>
                  {chat.lastMessage}
                </p>
              </div>
            </div>
          );
        }) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {chatSearchQuery.trim() ? 'No conversations match that search.' : 'No conversations yet.'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {chatSearchQuery.trim()
                ? 'Try another researcher name, institution, or message keyword.'
                : 'Start a direct conversation with a researcher from your network.'}
            </p>
            {!chatSearchQuery.trim() && (
              <button
                type="button"
                onClick={() => setShowCompose(true)}
                className="mt-4 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20"
              >
                Start a conversation
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 md:rounded-3xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Start a conversation</h3>
                  <p className="text-xs text-slate-500">Choose a researcher from your network.</p>
                </div>
                <button type="button" onClick={() => setShowCompose(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-5" />
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={composeSearchRef}
                  type="text"
                  value={composeSearchQuery}
                  onChange={(event) => setComposeSearchQuery(event.target.value)}
                  placeholder="Search researchers..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto no-scrollbar">
                {availableUsers.length > 0 ? availableUsers.map(user => (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => handleStartChat(user)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <img src={user.imageUrl} alt={user.name} className="size-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.affiliation}</p>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No researchers found.</p>
                    <button type="button" onClick={handleComposeSearchReset} className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">
                      Clear search
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatDetailScreen({ currentUserId, chat, launchContext, onDismissLaunchContext, onBack, onOpenUserProfile, onChatUpdated, onReport, onBlockUser, onUnblockUser, isBlocked, showToast }: { currentUserId: string, chat: Chat, launchContext: ChatEntryContext | null, onDismissLaunchContext: () => void, onBack: () => void, onOpenUserProfile: (userId: string) => void, onChatUpdated: (chat: Chat) => void, onReport: () => void, onBlockUser: (userId: string) => Promise<void>, onUnblockUser: (userId: string) => Promise<void>, isBlocked: boolean, showToast: (msg: string, type?: 'success' | 'info') => void }) {
  const { dataset } = useAppData();
  const [message, setMessage] = useState('');
  const [isUpdatingBlock, setIsUpdatingBlock] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const otherUserId = chat.participants.find(p => p !== currentUserId);
  const otherUser = dataset.users.find(u => u.id === otherUserId);
  const generatedMeetingLink = (meetingType?: MeetingInviteType) => buildChatEntryLink(chat.id, { mode: 'meeting', meetingType });
  const meetingBannerLabel = launchContext?.meetingType === 'audio'
    ? 'Audio meeting invite opened for this conversation.'
    : launchContext?.meetingType === 'video'
      ? 'Video meeting invite opened for this conversation.'
      : 'Meeting invite opened for this conversation.';
  const messageGroups = chat.messages.reduce<Array<{ label: string; items: Message[] }>>((groups, item) => {
    const label = formatChatDayLabel(item.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.label !== label) {
      groups.push({ label, items: [item] });
    } else {
      lastGroup.items.push(item);
    }
    return groups;
  }, []);

  useEffect(() => {
    if (chat.unreadCount === 0) {
      return;
    }
    markChatRead(chat.id)
      .then((response) => onChatUpdated(response.chat))
      .catch(() => undefined);
  }, [chat.id, chat.unreadCount, onChatUpdated]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      try {
        const response = await sendMessage(chat.id, message);
        onChatUpdated(response.chat);
        showToast('Message sent!');
        setMessage('');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to send message', 'info');
      }
    }
  };

  const handleBlockToggle = async () => {
    if (!otherUserId) {
      return;
    }
    try {
      setIsUpdatingBlock(true);
      if (isBlocked) {
        await onUnblockUser(otherUserId);
        showToast('User unblocked');
      } else {
        await onBlockUser(otherUserId);
        showToast('User blocked');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update blocked status', 'info');
    } finally {
      setIsUpdatingBlock(false);
    }
  };

  const handleShareMeetingLink = async (mode: 'audio' | 'video') => {
    await copyText(generatedMeetingLink(mode));
    showToast(`${mode === 'audio' ? 'Audio' : 'Video'} invite link copied`);
  };

  const handleAttachmentInsert = async (kind: 'paper-link' | 'meeting-link' | 'citation-note') => {
    const attachmentText = kind === 'paper-link'
      ? `Shared library link: ${window.location.origin}/library`
      : kind === 'meeting-link'
        ? `Shared meeting link: ${generatedMeetingLink('video')}`
        : 'Citation note: I found a relevant reference worth reviewing together.';
    try {
      const response = await sendMessage(chat.id, attachmentText);
      onChatUpdated(response.chat);
      setShowAttachmentMenu(false);
      showToast('Attachment added to the conversation');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to share attachment', 'info');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <button
            type="button"
            onClick={() => {
              if (otherUserId) {
                onOpenUserProfile(otherUserId);
              }
            }}
            disabled={!otherUserId}
            className="flex items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors hover:bg-slate-100 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-slate-800"
          >
            <img 
              src={otherUser?.imageUrl || `https://i.pravatar.cc/150?u=${otherUserId}`} 
              alt="" 
              className="size-10 rounded-full object-cover"
            />
            <div>
              <h2 className="text-sm font-bold">{otherUser?.name || otherUserId}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Direct conversation</p>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <button type="button" onClick={onReport} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Report conversation">
            <AlertTriangle className="size-5" />
          </button>
          {otherUserId && (
            <button type="button" onClick={() => void handleBlockToggle()} disabled={isUpdatingBlock} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" title={isBlocked ? 'Unblock user' : 'Block user'}>
              <Lock className="size-5" />
            </button>
          )}
          <button type="button" onClick={() => void handleShareMeetingLink('audio')} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Copy audio invite link">
            <Phone className="size-5" />
          </button>
          <button type="button" onClick={() => void handleShareMeetingLink('video')} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Copy video invite link">
            <Video className="size-5" />
          </button>
          <button type="button" onClick={() => setShowInfoPanel(true)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Conversation details">
            <Info className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {launchContext?.mode === 'meeting' && (
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
            <Video className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{meetingBannerLabel}</p>
              <p className="mt-1 text-xs text-primary/80">
                Use the phone or video actions above to share another invite link from this chat.
              </p>
            </div>
            <button
              type="button"
              onClick={onDismissLaunchContext}
              className="rounded-full p-1 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label="Dismiss meeting invite notice"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {(messageGroups.length > 0 ? messageGroups : [{ label: 'Today', items: chat.messages }]).map((group) => (
          <React.Fragment key={group.label}>
            <div className="text-center py-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {group.label}
              </span>
            </div>

            {group.items.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${
                  msg.senderId === currentUserId 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {renderChatMessageContent(msg.text)}
                  </div>
                  <p className={`text-[8px] mt-1 text-right ${msg.senderId === currentUserId ? 'text-white/70' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        {isBlocked && (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200">
            This conversation is blocked. Unblock this user before sending another message.
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" onClick={() => setShowAttachmentMenu((current) => !current)} className="p-2 text-slate-400">
            <Paperclip className="size-5" />
          </button>
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isBlocked}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
          <button 
            type="submit"
            disabled={!message.trim() || isBlocked}
            className={`p-3 rounded-xl transition-all ${message.trim() && !isBlocked ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >
            <Send className="size-5" />
          </button>
        </form>
        <AnimatePresence>
          {showAttachmentMenu && !isBlocked && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-3 grid grid-cols-3 gap-2"
            >
              <button type="button" onClick={() => void handleAttachmentInsert('paper-link')} className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-bold dark:border-slate-700">
                Share paper
              </button>
              <button type="button" onClick={() => void handleAttachmentInsert('meeting-link')} className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-bold dark:border-slate-700">
                Share meeting
              </button>
              <button type="button" onClick={() => void handleAttachmentInsert('citation-note')} className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-bold dark:border-slate-700">
                Citation note
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showInfoPanel && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 md:rounded-3xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Conversation details</h3>
                  <p className="text-xs text-slate-500">Context for this researcher connection.</p>
                </div>
                <button type="button" onClick={() => setShowInfoPanel(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  <img src={otherUser?.imageUrl || `https://i.pravatar.cc/150?u=${otherUserId}`} alt={otherUser?.name || 'Researcher'} className="size-12 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{otherUser?.name || otherUserId}</p>
                    <p className="truncate text-xs text-slate-500">{otherUser?.affiliation || 'Independent Researcher'}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shared context</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{otherUser?.bio || 'No biography is available for this researcher yet.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {otherUserId && (
                    <button
                      type="button"
                      onClick={() => onOpenUserProfile(otherUserId)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700"
                    >
                      View profile
                    </button>
                  )}
                  <button type="button" onClick={() => void copyText(otherUser?.email || `${otherUser?.id ?? 'researcher'}@preprint-explorer.local`).then(() => showToast('Contact address copied'))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">
                    Copy contact
                  </button>
                  <button type="button" onClick={() => void handleShareMeetingLink('video')} className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white">
                    Copy meeting link
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HelpScreen({ onBack, onOpenMenu, onOpenContact, onOpenMessages, onOpenLibrary, onOpenFeeds, onOpenSettings, onOpenHome }: { onBack: () => void, onOpenMenu: () => void, onOpenContact: () => void, onOpenMessages: () => void, onOpenLibrary: () => void, onOpenFeeds: () => void, onOpenSettings: () => void, onOpenHome: () => void }) {
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<'all' | 'library' | 'feeds' | 'account'>('all');
  const supportTickets = storageService.getSupportTickets();
  const faqs = [
    { q: 'How do I save a preprint?', a: 'Tap the bookmark icon on any paper card or in the reader view to save it to your library.', topic: 'library' as const, actionLabel: 'Open library', onAction: onOpenLibrary },
    { q: 'Can I download papers for offline reading?', a: 'Yes, papers you save to your library are automatically cached for offline access. You can also download them as PDF.', topic: 'library' as const, actionLabel: 'Go to library', onAction: onOpenLibrary },
    { q: 'How do I follow an author?', a: 'Visit an author\'s profile and tap the "Follow" button to receive alerts when they publish new work.', topic: 'account' as const, actionLabel: 'Open home feed', onAction: onOpenHome },
    { q: 'What are custom feeds?', a: 'Custom feeds allow you to track specific keywords or topics across multiple preprint servers in real-time.', topic: 'feeds' as const, actionLabel: 'Manage feeds', onAction: onOpenFeeds },
    { q: 'How does central feed filtering work?', a: 'Select a feed on the home screen and Preprint Explorer will apply that feed’s selected sources and categories to the main paper stream.', topic: 'feeds' as const, actionLabel: 'Open home feed', onAction: onOpenHome },
    { q: 'How do I secure my account?', a: 'Open Settings, then Security, to manage passkeys, trusted devices, two-factor authentication, and recent activity.', topic: 'account' as const, actionLabel: 'Open settings', onAction: onOpenSettings },
  ];
  const filteredFaqs = faqs.filter((faq) => {
    const matchesTopic = activeTopic === 'all' || faq.topic === activeTopic;
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || faq.q.toLowerCase().includes(normalized) || faq.a.toLowerCase().includes(normalized);
    return matchesTopic && matchesQuery;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-xl font-bold">Help Center</h2>
        </div>
        <button type="button" onClick={onOpenMenu} className="rounded-full p-2 text-primary hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        <div className="bg-primary/10 p-6 rounded-3xl border border-primary/20 text-center">
          <HelpCircle className="size-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">How can we help?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Search our knowledge base or browse common topics below.</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search help articles..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All topics' },
              { id: 'library', label: 'Library' },
              { id: 'feeds', label: 'Feeds' },
              { id: 'account', label: 'Account' },
            ].map(topic => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveTopic(topic.id as typeof activeTopic)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTopic === topic.id ? 'bg-primary text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300'}`}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">Frequently Asked Questions</h4>
          {filteredFaqs.length > 0 ? filteredFaqs.map((faq, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold mb-2">{faq.q}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{faq.a}</p>
              <button
                type="button"
                onClick={faq.onAction}
                className="mt-3 rounded-full bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary"
              >
                {faq.actionLabel}
              </button>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold">No help articles matched that search.</p>
              <p className="mt-2 text-xs text-slate-500">Try a different keyword or contact support directly.</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold">Support Requests</h4>
              <p className="mt-1 text-xs text-slate-500">Your most recent support submissions on this device.</p>
            </div>
            <button
              type="button"
              onClick={onOpenContact}
              className="rounded-full bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary"
            >
              Open support
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {supportTickets.length > 0 ? supportTickets.slice(0, 3).map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{ticket.subject}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {ticket.category} • {ticket.status} • {formatAbsoluteDate(ticket.submittedAt, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenContact}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-700"
                  >
                    View
                  </button>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <p className="text-sm font-semibold">No support requests yet.</p>
                <p className="mt-2 text-xs text-slate-500">Use App Contact to submit a bug report or feature request.</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button type="button" onClick={onOpenMessages} className="rounded-3xl border border-slate-200 bg-white p-6 text-left dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold">Open messages</p>
            <p className="mt-2 text-xs text-slate-500">Jump back into direct conversations with researchers you already collaborate with.</p>
          </button>
          <button type="button" onClick={onOpenContact} className="rounded-3xl bg-primary p-6 text-left text-white shadow-lg shadow-primary/20">
            <p className="text-sm font-bold">Contact app support</p>
            <p className="mt-2 text-xs text-white/80">Send a structured bug report or product request to the app team.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactScreen({ currentUser, onBack, onOpenMenu, showToast }: { currentUser: User | null, onBack: () => void, onOpenMenu: () => void, showToast: (msg: string) => void }) {
  const draft = storageService.getContactDraft();
  const [category, setCategory] = useState<'bug' | 'feature' | 'account' | 'data'>((draft.category as 'bug' | 'feature' | 'account' | 'data') ?? 'bug');
  const [subject, setSubject] = useState(draft.subject ?? '');
  const [message, setMessage] = useState(draft.message ?? '');
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => storageService.getSupportTickets());

  useEffect(() => {
    storageService.saveContactDraft({ category, subject, message });
  }, [category, subject, message]);

  const openEmailFallback = async (ticket?: SupportTicket) => {
    const activeCategory = ticket?.category ?? category;
    const activeSubject = ticket?.subject ?? subject;
    const activeMessage = ticket?.message ?? message;
    const referenceLine = ticket ? `\n\nReference: ${ticket.id}` : '';
    const requesterLine = currentUser?.email ? `\nRequester: ${currentUser.email}` : '';
    const emailSubject = encodeURIComponent(`[${activeCategory.toUpperCase()}] ${activeSubject}`);
    const emailBody = encodeURIComponent(`${activeMessage}${referenceLine}${requesterLine}`);
    window.location.href = `mailto:support@preprint-explorer.local?subject=${emailSubject}&body=${emailBody}`;
    showToast('Opening your email client with the support draft.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ticket: SupportTicket = {
      id: `support-${Date.now()}`,
      category,
      subject: subject.trim(),
      message: message.trim(),
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      requesterName: currentUser?.name,
      requesterEmail: currentUser?.email,
    };
    const nextTickets = [ticket, ...supportTickets];
    setSupportTickets(nextTickets);
    storageService.saveSupportTickets(nextTickets);
    storageService.clearContactDraft();
    setCategory('bug');
    setSubject('');
    setMessage('');
    showToast(`Support request submitted (${ticket.id})`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-xl font-bold">Contact Us</h2>
        </div>
        <button type="button" onClick={onOpenMenu} className="rounded-full p-2 text-primary hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-2">Get in touch</h3>
          <p className="text-sm text-slate-500">Have a bug to report or a feature request? Submit it here and keep a local record of your support requests.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="bug">Bug report</option>
              <option value="feature">Feature request</option>
              <option value="account">Account support</option>
              <option value="data">Data/source issue</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Bug Report"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Message</label>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us more..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 min-h-[200px]"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Mail className="size-5" />
            Submit Support Request
          </button>
          <button
            type="button"
            onClick={() => void openEmailFallback()}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
          >
            Email Support Instead
          </button>
        </form>

        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold">Submitted Requests</h4>
              <p className="mt-1 text-xs text-slate-500">Recent support submissions stored locally on this device.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              {supportTickets.length} total
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {supportTickets.length > 0 ? supportTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{ticket.subject}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {ticket.category} • {ticket.status} • {formatAbsoluteDate(ticket.submittedAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(ticket.id).then(() => showToast(`Copied ${ticket.id}`)).catch((error) => showToast(error instanceof Error ? error.message : 'Unable to copy reference'))}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-700"
                  >
                    Copy ID
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{ticket.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openEmailFallback(ticket)}
                    className="rounded-full bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    Email Follow-up
                  </button>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                <p className="text-sm font-semibold">No support requests submitted yet.</p>
                <p className="mt-2 text-xs text-slate-500">Use the form above to create a tracked support request.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 text-center">Other ways to connect</h4>
          <div className="flex justify-center gap-6">
            <button type="button" onClick={() => window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('Feedback for Preprint Explorer'), '_blank', 'noopener,noreferrer')} className="flex flex-col items-center gap-2">
              <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                <Twitter className="size-6" />
              </div>
              <span className="text-[10px] font-bold">Twitter</span>
            </button>
            <button type="button" onClick={() => window.open(window.location.origin, '_blank', 'noopener,noreferrer')} className="flex flex-col items-center gap-2">
              <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-900/20 flex items-center justify-center text-slate-500">
                <Globe className="size-6" />
              </div>
              <span className="text-[10px] font-bold">Website</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
