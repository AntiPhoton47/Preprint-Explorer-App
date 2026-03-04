import React, { useState, useEffect } from 'react';
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
  LogIn,
  LogOut,
  Building2,
  Mail,
  CheckCircle2,
  Check
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
import { 
  MOCK_PREPRINTS, 
  MOCK_COLLECTIONS, 
  MOCK_NOTIFICATIONS, 
  MOCK_CUSTOM_FEEDS,
  MOCK_TREND_METRICS,
  MOCK_RISING_STARS,
  MOCK_DIGEST_PAPERS,
  MOCK_DIGEST_ACTIVITY,
  MOCK_PUBLICATION_VOLUME,
  MOCK_WEEKLY_TRENDS,
  MOCK_USERS,
  MOCK_INSTITUTIONS
} from './mockData';
import { 
  Preprint, 
  PaperComment,
  User,
  Institution,
  Collection, 
  Notification, 
  CustomFeed, 
  TrendMetric, 
  RisingStar, 
  DigestPaper, 
  DigestActivity 
} from './types';

import { storageService } from './services/storageService';

type Screen = 'login' | 'register' | 'home' | 'library' | 'collections' | 'collection-detail' | 'reader' | 'profile' | 'notifications' | 'trends' | 'edit-profile' | 'share' | 'feeds' | 'notification-settings' | 'daily-digest' | 'weekly-digest' | 'topic-insight' | 'security-settings' | 'change-password' | '2fa-setup' | '2fa-backup' | 'security-log' | 'user-profile' | 'tag-results' | 'institution-detail' | 'legal';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [navigationHistory, setNavigationHistory] = useState<Screen[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreprint, setSelectedPreprint] = useState<Preprint | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [legalType, setLegalType] = useState<'tos' | 'privacy'>('tos');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [savedPreprints, setSavedPreprints] = useState<Preprint[]>([]);
  const [allPreprints, setAllPreprints] = useState<Preprint[]>(MOCK_PREPRINTS);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pushNotification, setPushNotification] = useState<{ title: string, body: string } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' } | null>(null);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const navigateTo = (screen: Screen) => {
    setNavigationHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);
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

  useEffect(() => {
    // Simulate a push notification after 5 seconds
    const timer = setTimeout(() => {
      setPushNotification({
        title: 'New Research Found',
        body: '5 new papers match your "Neural Networks" feed criteria. Tap to view.'
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Load saved preprints from storage
    setSavedPreprints(storageService.getSavedPreprints());

    // Online/Offline listeners
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
    const user = MOCK_USERS.find(u => u.id === userId || u.name === userId);
    if (user) {
      setSelectedUser(user);
      navigateTo('user-profile');
    } else {
      // Fallback for authors not in MOCK_USERS
      const fallbackUser: User = {
        id: userId,
        name: userId,
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
    const inst = MOCK_INSTITUTIONS.find(i => i.id === institutionId || i.name === institutionId);
    if (inst) {
      setSelectedInstitution(inst);
      navigateTo('institution-detail');
    }
  };

  const handleRate = (preprintId: string, rating: number) => {
    setAllPreprints(prev => prev.map(p => 
      p.id === preprintId ? { ...p, userRating: rating } : p
    ));
    if (selectedPreprint?.id === preprintId) {
      setSelectedPreprint(prev => prev ? { ...prev, userRating: rating } : null);
    }
  };

  function LegalScreen({ type, onBack }: { type: 'tos' | 'privacy', onBack: () => void }) {
    const content = type === 'tos' ? {
      title: 'Terms of Service',
      sections: [
        {
          title: '1. Acceptance of Terms',
          body: 'By accessing or using ResearchFlow, you agree to be bound by these Terms of Service and all applicable laws and regulations.'
        },
        {
          title: '2. User Accounts',
          body: 'You are responsible for maintaining the confidentiality of your account and password. You must provide accurate and complete information when creating an account.'
        },
        {
          title: '3. Intellectual Property',
          body: 'All content on ResearchFlow, including text, graphics, logos, and software, is the property of ResearchFlow or its content suppliers and is protected by international copyright laws.'
        },
        {
          title: '4. Prohibited Conduct',
          body: 'You agree not to use ResearchFlow for any unlawful purpose or in any way that could damage, disable, or impair the service.'
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
        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 sticky top-0 bg-white dark:bg-slate-950 z-20">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-xl font-bold">{content.title}</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-slate-500 mb-8">Last updated: October 24, 2023</p>
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
    if (!isLoggedIn) {
      if (currentScreen === 'register') {
        return (
          <RegisterScreen 
            onBack={() => setCurrentScreen('login')} 
            onRegister={() => { setIsLoggedIn(true); setCurrentScreen('home'); }} 
            onLegal={(type) => { setLegalType(type); navigateTo('legal'); }}
            showToast={showToast} 
          />
        );
      }
      if (currentScreen === 'legal') {
        return <LegalScreen type={legalType} onBack={goBack} />;
      }
      return <LoginScreen onLogin={() => { setIsLoggedIn(true); setCurrentScreen('home'); }} onRegister={() => setCurrentScreen('register')} showToast={showToast} />;
    }

    switch (currentScreen) {
      case 'home': return (
        <HomeScreen 
          onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }} 
          savedPreprints={savedPreprints} 
          onToggleSave={toggleSave}
          searchQuery={searchQuery}
          onTagClick={handleTagClick}
          preprints={allPreprints}
          showToast={showToast}
        />
      );
      case 'library': return (
        <LibraryScreen 
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
          collection={selectedCollection || MOCK_COLLECTIONS[0]} 
          onBack={goBack} 
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
          preprint={selectedPreprint || allPreprints[0]} 
          onBack={goBack}
          onToggleSave={toggleSave} 
          isSaved={savedPreprints.some(p => p.id === (selectedPreprint?.id || allPreprints[0].id))}
          onRate={(rating) => handleRate(selectedPreprint?.id || allPreprints[0].id, rating)}
          onTagClick={handleTagClick}
          onAuthorClick={handleUserClick}
          showToast={showToast}
          onCite={() => setIsCitationModalOpen(true)}
        />
      );
      case 'profile': return <ProfileScreen onEdit={() => navigateTo('edit-profile')} onSettings={() => navigateTo('notification-settings')} onSignOut={() => { setIsLoggedIn(false); setCurrentScreen('login'); setNavigationHistory([]); }} onInstitutionClick={handleInstitutionClick} preprints={allPreprints} showToast={showToast} />;
      case 'edit-profile': return <EditProfileScreen onBack={goBack} showToast={showToast} />;
      case 'notification-settings': return <SettingsScreen onBack={goBack} onNavigate={(s: Screen) => navigateTo(s)} onLegal={(type) => { setLegalType(type); navigateTo('legal'); }} showToast={showToast} />;
      case 'change-password': return <ChangePasswordScreen onBack={goBack} showToast={showToast} />;
      case '2fa-setup': return <TwoFactorAuthScreen onBack={goBack} onNext={() => navigateTo('2fa-backup')} showToast={showToast} />;
      case '2fa-backup': return <TwoFactorBackupCodesScreen onBack={goBack} onDone={() => navigateTo('notification-settings')} showToast={showToast} />;
      case 'security-log': return <SecurityLogScreen onBack={goBack} showToast={showToast} />;
      case 'notifications': return <NotificationsScreen onDailyDigest={() => navigateTo('daily-digest')} onWeeklyDigest={() => navigateTo('weekly-digest')} onBack={goBack} showToast={showToast} />;
      case 'trends': return <TrendsScreen onTopicClick={() => navigateTo('topic-insight')} showToast={showToast} />;
      case 'daily-digest': return <DailyDigestScreen onBack={goBack} showToast={showToast} />;
      case 'weekly-digest': return <WeeklyDigestScreen onBack={goBack} showToast={showToast} />;
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
          onBack={goBack} 
          onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }} 
          onToggleSave={toggleSave}
          onTagClick={handleTagClick}
          onInstitutionClick={handleInstitutionClick}
          savedPreprints={savedPreprints}
          showToast={showToast}
        />
      );
      case 'tag-results': return (
        <TagResultsScreen 
          tag={selectedTag!} 
          onBack={goBack} 
          preprints={allPreprints} 
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
          showToast={showToast}
        />
      );
      case 'legal': return <LegalScreen type={legalType} onBack={goBack} />;
      case 'feeds': return <CustomFeedsScreen onBack={goBack} showToast={showToast} />;
      default: return <HomeScreen onPreprintClick={(p) => { setSelectedPreprint(p); navigateTo('reader'); }} savedPreprints={savedPreprints} onToggleSave={toggleSave} searchQuery={searchQuery} onTagClick={handleTagClick} preprints={allPreprints} showToast={showToast} />;
    }
  };

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
                setPushNotification(null);
                setCurrentScreen('notifications');
              }}
            >
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/20 flex items-start gap-3">
                <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                  <BookOpen className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Research App</span>
                    <span className="text-[10px] text-slate-400">now</span>
                  </div>
                  <h4 className="text-sm font-bold truncate">{pushNotification.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{pushNotification.body}</p>
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

        {/* Header */}
        {['home', 'library', 'notifications', 'trends', 'profile', 'feeds'].includes(currentScreen) ? (
          <header className="shrink-0 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <Menu className="text-primary cursor-pointer" />
              <h1 className="text-lg font-bold tracking-tight">Preprint Explorer</h1>
              <div className="flex items-center gap-2">
                <button onClick={toggleDarkMode} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  {isDarkMode ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                </button>
                <UserCircle className="cursor-pointer" onClick={() => setCurrentScreen('profile')} />
              </div>
            </div>
            {['home', 'feeds'].includes(currentScreen) && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                <input 
                  type="text" 
                  placeholder="Search titles, authors, or DOIs"
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </header>
        ) : currentScreen === 'reader' && selectedPreprint ? (
          <header className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <ArrowLeft className="cursor-pointer" onClick={() => setCurrentScreen('home')} />
              <h1 className="text-sm font-semibold truncate">{selectedPreprint.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Search className="size-5 text-slate-500" />
              <Bookmark className="size-5 text-slate-500" />
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
        {['home', 'library', 'notifications', 'trends', 'profile', 'feeds', 'notification-settings', 'daily-digest', 'weekly-digest', 'topic-insight'].includes(currentScreen) ? (
          <nav className="shrink-0 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 flex items-center justify-around p-3 pb-6 relative">
            <NavItem icon={<Home />} label="Home" active={currentScreen === 'home'} onClick={() => setCurrentScreen('home')} />
            <NavItem icon={<Bell />} label="Alerts" active={currentScreen === 'notifications'} onClick={() => setCurrentScreen('notifications')} />
            <NavItem icon={<TrendingUp />} label="Trends" active={currentScreen === 'trends' || currentScreen === 'topic-insight'} onClick={() => setCurrentScreen('trends')} />
            <NavItem icon={<LibraryIcon />} label="Library" active={currentScreen === 'library'} onClick={() => setCurrentScreen('library')} />
            <NavItem icon={<UserCircle />} label="Profile" active={currentScreen === 'profile' || currentScreen === 'notification-settings'} onClick={() => setCurrentScreen('profile')} />
          </nav>
        ) : currentScreen === 'reader' ? (
          <nav className="shrink-0 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 pb-6">
            <NavItem icon={<BookOpen />} label="Read" active={true} onClick={() => {}} />
            <NavItem icon={<Menu />} label="Outline" active={false} onClick={() => showToast('Outline feature coming soon!')} />
            <NavItem icon={<Share2 />} label="Share" active={false} onClick={() => showToast('Paper shared to your network!')} />
            <NavItem icon={<Download />} label="PDF" active={false} onClick={() => showToast('Downloading PDF version...')} />
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

function HomeScreen({ onPreprintClick, savedPreprints, onToggleSave, searchQuery, onTagClick, preprints, showToast }: { 
  onPreprintClick: (p: Preprint) => void, 
  savedPreprints: Preprint[], 
  onToggleSave: (p: Preprint) => void,
  searchQuery?: string,
  onTagClick?: (tag: string) => void,
  preprints: Preprint[],
  showToast: (msg: string) => void
}) {
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

  const filteredPreprints = preprints
    .filter(p => {
      // Source & Category Filter
      const matchesSource = activeSources.length === 0 || activeSources.includes(p.source);
      const sourceCats = activeCategories[p.source] || [];
      const matchesCategory = sourceCats.length === 0 || p.tags.some(t => sourceCats.includes(t));
      
      // Search Filter
      const matchesSearch = !searchQuery || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Publication Type Filter
      const matchesPubType = pubType === 'All Types' || p.type === pubType;
      
      // Date Range Filter
      let matchesDate = true;
      const paperDate = new Date(p.date);
      const now = new Date();
      
      if (dateRange === 'Last 24 hours') {
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

      return matchesSource && matchesCategory && matchesSearch && matchesPubType && matchesDate;
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
  
  return (
    <div className="p-4">
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
          {searchQuery ? `Search Results for "${searchQuery}"` : 'Trending Preprints'}
        </h2>
        {searchQuery && <span className="text-xs text-slate-400">{filteredPreprints.length} results</span>}
      </div>

      <div className="space-y-4">
        {filteredPreprints.length > 0 ? (
          filteredPreprints.map(preprint => {
            const isSaved = savedPreprints.some(sp => sp.id === preprint.id);
            return (
              <PreprintCard 
                key={preprint.id} 
                preprint={{ ...preprint, isSaved }} 
                onClick={() => onPreprintClick(preprint)} 
                onToggleSave={() => onToggleSave(preprint)}
                onTagClick={onTagClick}
              />
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

function InstitutionDetailScreen({ institution, onBack, onUserClick, showToast }: { 
  institution: Institution, 
  onBack: () => void, 
  onUserClick: (userId: string) => void,
  showToast: (msg: string) => void 
}) {
  const affiliatedUsers = MOCK_USERS.filter(u => u.institutionId === institution.id || u.affiliation === institution.name);

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
              <p className="text-xl font-bold text-primary">{institution.stats.researchers.toLocaleString()}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Researchers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{institution.stats.publications.toLocaleString()}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Publications</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{(institution.stats.citations / 1000000).toFixed(1)}M</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Citations</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">About Institution</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {institution.description}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest">Affiliated Researchers</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{affiliatedUsers.length} Found</span>
            </div>
            <div className="space-y-4">
              {affiliatedUsers.map(user => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomFeedsScreen({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) {
  const [activeFrequency, setActiveFrequency] = useState('Daily');
  const [selectedSources, setSelectedSources] = useState<string[]>(['Preprints']);
  const sources = ['Preprints', 'OA Journals', 'Clinical Trials', 'GitHub', 'Patents', 'arXiv', 'bioRxiv', 'medRxiv'];

  const toggleSource = (source: string) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Active Feeds</h2>
        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">3 Active</span>
      </div>

      <div className="space-y-3 mb-8">
        {MOCK_CUSTOM_FEEDS.map(feed => (
          <div key={feed.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 size-12">
              {feed.name.includes('Quantum') ? <Zap className="size-6" /> : 
               feed.name.includes('Biology') ? <BookOpen className="size-6" /> : <TrendingUp className="size-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold truncate">{feed.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">Updates: {feed.frequency} • {feed.sources.join(', ')}</p>
            </div>
            <MoreVertical className="text-slate-400 size-5 cursor-pointer" />
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
              className="w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-white focus:border-white py-3 px-4 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Data Sources</label>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <button 
                  key={source} 
                  onClick={() => toggleSource(source)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSources.includes(source) ? 'bg-white text-primary' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  {source}
                </button>
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
            onClick={() => showToast('New custom feed created!')}
            className="w-full bg-white text-primary font-bold py-3.5 rounded-xl shadow-md mt-2 transition-transform active:scale-95"
          >
            Launch Research Stream
          </button>
        </div>
      </div>
    </div>
  );
}

function PreprintCard({ preprint, onClick, onToggleSave, onTagClick, onAuthorClick }: { 
  preprint: Preprint, 
  onClick: () => void, 
  onToggleSave?: () => void, 
  onTagClick?: (tag: string) => void,
  onAuthorClick?: (author: string) => void,
  key?: string | number
}) {
  return (
    <div 
      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
              preprint.source === 'arXiv' ? 'bg-primary/10 text-primary' : 
              preprint.source === 'bioRxiv' ? 'bg-emerald-100 text-emerald-700' : 
              preprint.source === 'medRxiv' ? 'bg-blue-100 text-blue-700' :
              preprint.source === 'PhilPapers' ? 'bg-amber-100 text-amber-700' :
              preprint.source === 'OA Journals' || preprint.source === 'OA Articles' ? 'bg-purple-100 text-purple-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {preprint.source}
            </span>
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
  );
}

function LibraryScreen({ onCollectionClick, savedPreprints, onToggleSave, onPreprintClick, onTagClick, onAuthorClick, showToast }: { 
  onCollectionClick: (c: Collection) => void, 
  savedPreprints: Preprint[], 
  onToggleSave: (p: Preprint) => void,
  onPreprintClick: (p: Preprint) => void,
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  showToast: (msg: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'saved' | 'collections'>('saved');
  const [collectionSort, setCollectionSort] = useState<'name' | 'paperCount' | 'updatedAt'>('updatedAt');
  const [isCreating, setIsCreating] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: '', description: '', imageUrl: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSaved = savedPreprints.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedCollections = [...MOCK_COLLECTIONS]
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (collectionSort === 'name') return a.name.localeCompare(b.name);
      if (collectionSort === 'paperCount') return b.paperCount - a.paperCount;
      if (collectionSort === 'updatedAt') {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return 0;
    });

  const handleCreate = () => {
    if (!newCollection.name.trim()) {
      showToast('Please enter a collection name');
      return;
    }
    showToast(`Collection "${newCollection.name}" created!`);
    setIsCreating(false);
    setNewCollection({ name: '', description: '', imageUrl: '' });
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
                onClick={() => showToast('Sorting by Recently Saved')}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 whitespace-nowrap"
              >
                Recently Saved <ChevronRight className="size-4 rotate-90" />
              </button>
              <button 
                onClick={() => showToast('Sorting by Highest Rated')}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 whitespace-nowrap"
              >
                Highest Rated <ChevronRight className="size-4 rotate-90" />
              </button>
            </div>
            {filteredSaved.length > 0 ? (
              filteredSaved.map(p => (
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
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{collection.name}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-slate-500">Updated {collection.updatedAt}</p>
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
              <div 
                onClick={() => setIsCreating(true)}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-primary transition-colors"
              >
                <Plus className="text-primary size-8" />
                <span className="text-primary text-xs font-bold uppercase">New Folder</span>
              </div>
            </div>
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

      <button 
        onClick={() => setIsCreating(true)}
        className="absolute right-6 bottom-6 size-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-20"
      >
        <Plus className="size-8" />
      </button>
    </div>
  );
}

function CollectionDetailScreen({ collection, onBack, savedPreprints, onToggleSave, onPreprintClick, onTagClick, onAuthorClick, showToast }: { 
  collection: Collection, 
  onBack: () => void, 
  savedPreprints: Preprint[], 
  onToggleSave: (p: Preprint) => void,
  onPreprintClick: (p: Preprint) => void,
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  showToast: (msg: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    name: collection.name, 
    description: collection.description || '',
    imageUrl: collection.imageUrl
  });

  const handleSave = () => {
    if (!editData.name.trim()) {
      showToast('Collection name cannot be empty');
      return;
    }
    showToast(`Collection "${editData.name}" updated!`);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4 mb-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{collection.name}</h2>
              <Edit className="size-4 text-slate-400 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsEditing(true)} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{collection.paperCount} preprints</span>
              <span>•</span>
              <span>Updated {collection.updatedAt}</span>
              {collection.totalCitations && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-bold text-primary">
                    <Quote className="size-3" />
                    {collection.totalCitations.toLocaleString()} Citations
                  </span>
                </>
              )}
            </div>
          </div>
          <Share2 className="text-primary cursor-pointer" onClick={() => showToast('Collection link copied to clipboard!')} />
        </div>
        
        {collection.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            {collection.description}
          </p>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => showToast('Showing all papers in collection')}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            All Papers
          </button>
          <button 
            onClick={() => showToast('Showing recently added papers')}
            className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            Recently Added
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {MOCK_PREPRINTS.map(p => {
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
        })}
      </div>

      <AnimatePresence>
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

function UserListModal({ title, users, onClose }: { title: string, users: string[], onClose: () => void }) {
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
            <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
              <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold">
                {user.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold">{user}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Researcher</p>
              </div>
            </div>
          )) : (
            <p className="text-center text-slate-500 py-8">No users found.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ReaderScreen({ preprint, onBack, onToggleSave, isSaved, onRate, onTagClick, onAuthorClick, showToast, onCite }: { 
  preprint: Preprint, 
  onBack: () => void,
  onToggleSave: (p: Preprint) => void, 
  isSaved: boolean,
  onRate: (rating: number) => void,
  onTagClick: (tag: string) => void,
  onAuthorClick: (author: string) => void,
  showToast: (msg: string) => void,
  onCite: () => void
}) {
  const [readerTheme, setReaderTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<PaperComment[]>(preprint.comments || []);
  const [userListModal, setUserListModal] = useState<{ title: string, users: string[] } | null>(null);
  const [showOutline, setShowOutline] = useState(false);

  const handleRateWithToast = (rating: number) => {
    onRate(rating);
    showToast(`You rated this paper ${rating} stars!`);
  };

  const handleToggleSaveWithToast = () => {
    onToggleSave(preprint);
    showToast(isSaved ? 'Removed from library' : 'Saved to library for offline reading');
  };

  const handleDownload = () => {
    showToast('Preparing PDF for download...');
    setTimeout(() => {
      showToast('Download started: ' + preprint.title.substring(0, 20) + '.pdf');
    }, 1500);
  };

  const handleShare = () => {
    const shareUrl = `https://researchflow.io/paper/${preprint.id}`;
    navigator.clipboard.writeText(shareUrl);
    showToast('Share link copied to clipboard!');
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: PaperComment = {
      id: Date.now().toString(),
      userId: 'aris_thorne',
      userName: 'Dr. Aris Thorne',
      userImageUrl: 'https://picsum.photos/seed/profile/200/200',
      text: commentText,
      date: 'Just now',
      likes: 0
    };
    setComments([newComment, ...comments]);
    setCommentText('');
    showToast('Comment posted!');
  };

  const themeClasses = {
    light: 'bg-white text-slate-900',
    dark: 'bg-slate-950 text-slate-100',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]'
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
            onClick={() => setUserListModal({ title: 'Cited By', users: preprint.citedBy || [] })}
          >
            <span className="text-2xl font-bold group-hover:text-primary transition-colors">{preprint.citations || 0}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400">Citations</span>
          </div>
          <div 
            className="flex flex-col cursor-pointer group"
            onClick={() => setUserListModal({ title: 'Saved By', users: preprint.savedBy || [] })}
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
            onClick={() => setUserListModal({ title: 'Rated By', users: preprint.ratedBy?.map(r => `${r.userId} (${r.rating}★)`) || [] })}
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
          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${readerTheme === 'sepia' ? 'bg-[#5b4636]/10 text-[#5b4636]' : 'bg-primary/10 text-primary'}`}>Preprint</span>
          <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${readerTheme === 'sepia' ? 'bg-[#5b4636]/10 text-[#5b4636]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Open Access</span>
        </div>
        
        <div className={`max-w-none ${readerTheme === 'dark' ? 'prose-invert' : ''}`}>
          <h3 className="text-lg font-bold mb-4">Abstract</h3>
          <p className={`italic mb-8 leading-relaxed text-base md:text-lg ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
            {preprint.abstract}
          </p>

          <h3 className="text-lg font-bold mb-4">1. Introduction</h3>
          <p className={`mb-6 leading-relaxed text-sm md:text-base ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
            Neural plasticity, the brain's ability to reorganize itself by forming new neural connections throughout life, allows neurons (nerve cells) in the brain to compensate for injury and disease and to adjust their activities in response to new situations or to changes in their environment.
          </p>
          <div className={`my-10 rounded-xl p-6 border-l-4 relative ${readerTheme === 'sepia' ? 'bg-[#5b4636]/5 border-[#5b4636]' : 'bg-slate-50 dark:bg-slate-800/50 border-primary'}`}>
            <p className={`leading-relaxed text-sm md:text-base ${readerTheme === 'sepia' ? 'text-[#5b4636]/90' : 'text-slate-700 dark:text-slate-300'}`}>
              The prefrontal cortex (PFC) serves as a hub for these adaptations. <span className={`border-b-2 ${readerTheme === 'sepia' ? 'bg-[#5b4636]/10 border-[#5b4636]' : 'bg-primary/20 border-primary'}`}>Previous research indicated that long-term potentiation (LTP) served as the primary driver</span>, but our data indicates a secondary, parallel mechanism involving fast-acting glial support cells.
            </p>
          </div>
          
          <div className="my-12 pt-8 border-t border-black/5 dark:border-white/5">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Quote className="size-5 text-primary" />
              References ({preprint.references?.length || 0})
            </h3>
            <div className="space-y-4">
              {preprint.references?.map((ref, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 hover:border-primary transition-colors cursor-pointer ${readerTheme === 'sepia' ? 'bg-[#5b4636]/5 border-[#5b4636]/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold line-clamp-2">{ref}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Cited in this work</p>
                  </div>
                  <ExternalLink className="size-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="my-12 pt-8 border-t border-black/5 dark:border-white/5">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              Comments ({comments.length})
            </h3>
            
            <div className="mb-8">
              <div className={`p-4 rounded-2xl border ${readerTheme === 'sepia' ? 'bg-[#5b4636]/5 border-[#5b4636]/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
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
                      <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors">
                        <TrendingUp className="size-3" />
                        {comment.likes}
                      </button>
                      <button className="text-xs text-slate-400 hover:text-primary transition-colors">Reply</button>
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
          onClose={() => setUserListModal(null)} 
        />
      )}

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 flex items-center gap-1 backdrop-blur-md bg-opacity-90">
          <button 
            onClick={() => setShowOutline(true)}
            className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex flex-col items-center gap-1"
          >
            <List className="size-5 text-slate-600 dark:text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Outline</span>
          </button>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1"></div>
          <button 
            onClick={handleShare}
            className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex flex-col items-center gap-1"
          >
            <Share2 className="size-5 text-slate-600 dark:text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Share</span>
          </button>
          <button 
            onClick={handleDownload}
            className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex flex-col items-center gap-1"
          >
            <Download className="size-5 text-slate-600 dark:text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">PDF</span>
          </button>
        </div>
      </div>

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
                    onClick={() => {
                      setShowOutline(false);
                      showToast(`Navigating to ${item.label}`);
                    }}
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

function ProfileScreen({ onEdit, onSettings, onSignOut, onInstitutionClick, preprints, showToast }: { onEdit: () => void, onSettings: () => void, onSignOut: () => void, onInstitutionClick: (id: string) => void, preprints: Preprint[], showToast: (msg: string) => void }) {
  const [isEditingPublications, setIsEditingPublications] = useState(false);
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
  const [networkLinks, setNetworkLinks] = useState([
    { icon: <Quote />, label: 'ORCID' },
    { icon: <UserPlus />, label: 'LinkedIn' },
    { icon: <Share2 />, label: 'Twitter' }
  ]);
  const [newNetworkLabel, setNewNetworkLabel] = useState('');

  const userPublications = preprints.filter(p => p.authors.some(a => a.includes('Aris Thorne')));

  const handleRemovePublication = (title: string) => {
    showToast(`Removed "${title}" from your profile.`);
  };

  const handleAddNetwork = () => {
    if (newNetworkLabel.trim()) {
      setNetworkLinks([...networkLinks, { icon: <Compass />, label: newNetworkLabel.trim() }]);
      setNewNetworkLabel('');
      setIsAddingNetwork(false);
      showToast(`Added ${newNetworkLabel} to your network.`);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 pb-24 overflow-y-auto no-scrollbar">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-4 group cursor-pointer">
          <img 
            src="https://picsum.photos/seed/profile/200/200" 
            alt="Profile" 
            className="size-32 rounded-full border-4 border-primary/10 object-cover group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute bottom-1 right-1 bg-primary text-white p-1 rounded-full border-2 border-white dark:border-slate-900">
            <ShieldCheck className="size-4" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Dr. Aris Thorne</h1>
        <p className="text-primary font-medium text-sm">Department of Quantum Physics</p>
        <button 
          onClick={() => onInstitutionClick('uzh')}
          className="text-slate-500 text-sm hover:text-primary hover:underline transition-colors flex items-center gap-1"
        >
          University of Zurich
          <CheckCircle2 className="size-3 text-emerald-500" />
        </button>
        <div className="flex gap-3 mt-6 w-full">
          <button onClick={onEdit} className="flex-1 bg-primary text-white py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-primary/20">Edit Profile</button>
          <button onClick={onSettings} className="px-4 border border-slate-200 dark:border-slate-700 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Settings className="size-4" />
            Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-2xl font-bold text-primary">{userPublications.length}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Preprints</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-2xl font-bold text-primary">1.2k</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Citations</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-2xl font-bold text-primary">18</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">h-index</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-2xl font-bold text-primary">42</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">i10-index</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 mb-8 text-center">
        <div>
          <p className="text-lg font-bold">1,240</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Followers</p>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
        <div>
          <p className="text-lg font-bold">482</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Following</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">About Research</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Specializing in <span className="text-primary font-medium">Quantum Computing</span> and <span className="text-primary font-medium">Error Correction</span>. My current work focuses on scalable fault-tolerant architectures.
        </p>
      </div>

      <div className="mb-8">
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
          {userPublications.map(p => (
            <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{p.title}</p>
                <p className="text-[10px] text-slate-500">{p.date} • {p.source}</p>
              </div>
              {isEditingPublications && (
                <button 
                  onClick={() => handleRemovePublication(p.title)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {isEditingPublications && (
            <button className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors">
              <Plus className="size-4" />
              Add Publication Manually
            </button>
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
          {networkLinks.map((link, i) => (
            <SocialLink key={i} icon={link.icon} label={link.label} />
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

      <button 
        onClick={onSignOut}
        className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
      >
        <LogOut className="size-5" />
        Sign Out of Account
      </button>
    </div>
  );
}

function SocialLink({ icon, label }: { icon: React.ReactNode, label: string, key?: any }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
      <div className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm text-primary">
        {icon}
      </div>
      <span className="text-[10px] font-bold">{label}</span>
    </div>
  );
}

function EditProfileScreen({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) {
  const [email, setEmail] = useState('aris.thorne@uzh.ch');
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [isAffiliationVerified, setIsAffiliationVerified] = useState(true);

  const handleSave = () => {
    showToast('Profile updated successfully!');
    onBack();
  };

  const handleVerifyEmail = () => {
    showToast('Verification email sent to ' + email);
  };

  const handleVerifyAffiliation = () => {
    showToast('Affiliation verification request submitted.');
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
            <img src="https://picsum.photos/seed/profile/200/200" alt="" className="size-32 rounded-full object-cover" />
            <div className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg">
              <Camera className="size-4" />
            </div>
          </div>
          <button className="text-primary text-sm font-bold bg-primary/10 px-4 py-2 rounded-lg">Change Profile Photo</button>
        </div>
        <div className="space-y-4">
          <Input label="Full Name" value="Dr. Aris Thorne" />
          
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Academic Affiliation</label>
              {isAffiliationVerified ? (
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Verified
                </span>
              ) : (
                <button onClick={handleVerifyAffiliation} className="text-[10px] font-bold text-primary hover:underline">Verify Affiliation</button>
              )}
            </div>
            <input 
              type="text" 
              defaultValue="University of Zurich"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <Input label="Academic Title" value="Department of Quantum Physics" />
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Research Bio</label>
            <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm min-h-[100px]" defaultValue="Specializing in Quantum Computing and Error Correction..." />
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Save className="size-5" />
          Save All Changes
        </button>
      </div>
    </div>
  );
}

function UserProfileScreen({ user, onBack, onPreprintClick, onToggleSave, onTagClick, onInstitutionClick, savedPreprints, showToast }: { 
  user: User, 
  onBack: () => void, 
  onPreprintClick: (p: Preprint) => void,
  onToggleSave: (p: Preprint) => void,
  onTagClick: (tag: string) => void,
  onInstitutionClick: (id: string) => void,
  savedPreprints: Preprint[],
  showToast: (msg: string) => void
}) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    showToast(isFollowing ? `Unfollowed ${user.name}` : `Following ${user.name}`);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 sticky top-0 bg-white dark:bg-slate-950 z-20">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-lg font-bold truncate">{user.name}</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <div className="flex flex-col items-center text-center mb-8">
          <img 
            src={user.imageUrl} 
            alt={user.name} 
            className="size-32 rounded-full border-4 border-primary/10 object-cover mb-4"
          />
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <button 
            onClick={() => onInstitutionClick(user.institutionId || user.affiliation)}
            className="text-primary font-medium text-sm hover:underline flex items-center gap-1"
          >
            {user.affiliation}
            {user.isAffiliationVerified && <CheckCircle2 className="size-3 text-emerald-500" />}
          </button>
          
          <div className="flex gap-3 mt-6 w-full">
            <button 
              onClick={handleFollow}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${isFollowing ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button 
              onClick={() => showToast(`Message feature coming soon to ${user.name}'s profile!`)}
              className="px-4 border border-slate-200 dark:border-slate-700 py-2.5 rounded-lg font-bold text-sm"
            >
              Message
            </button>
          </div>
        </div>

        <div className="flex gap-4 border-y border-slate-100 dark:border-slate-800 py-4 mb-8 overflow-x-auto no-scrollbar">
          <div className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{user.stats.totalPublications || user.stats.preprints}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">Pubs</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{user.stats.followers || user.followers}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">Followers</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{user.stats.hIndex || 0}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">h-index</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{user.stats.i10Index || 0}</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">i10-index</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex-1 min-w-[60px] text-center">
            <p className="text-xl font-bold">{(user.stats.citations / 1000).toFixed(1)}k</p>
            <p className="text-[10px] uppercase font-semibold text-slate-500">Cites</p>
          </div>
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
            {MOCK_PREPRINTS.filter(p => p.authors.includes(user.name) || p.authors.some(a => user.name.includes(a))).map(p => {
              const isSaved = savedPreprints.some(sp => sp.id === p.id);
              return (
                <PreprintCard 
                  key={p.id} 
                  preprint={{ ...p, isSaved }} 
                  onClick={() => onPreprintClick(p)} 
                  onToggleSave={() => onToggleSave(p)} 
                  onTagClick={onTagClick}
                  onAuthorClick={() => {}} // Already on this author's profile
                />
              );
            })}
          </div>
        </div>
      </div>
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
          <button 
            onClick={copyToClipboard}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Copy className="size-5" />
            Copy to Clipboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LoginScreen({ onLogin, onRegister, showToast }: { onLogin: () => void, onRegister: () => void, showToast: (msg: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin();
      showToast('Welcome back, Dr. Thorne!');
    } else {
      showToast('Please enter your credentials');
    }
  };

  return (
    <div className="flex flex-col h-full p-8 justify-center bg-white dark:bg-slate-950">
      <div className="mb-12 text-center">
        <div className="size-20 bg-primary rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-xl shadow-primary/20">
          <BookOpen className="size-10" />
        </div>
        <h1 className="text-3xl font-bold mb-2">ResearchFlow</h1>
        <p className="text-slate-500">The pulse of global research</p>
      </div>

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
          className="w-full bg-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          Sign In
        </button>
      </form>

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

function RegisterScreen({ onBack, onRegister, onLegal, showToast }: { onBack: () => void, onRegister: () => void, onLegal: (type: 'tos' | 'privacy') => void, showToast: (msg: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      showToast('Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    if (name && email && affiliation && password) {
      onRegister();
      showToast('Account created! Welcome to ResearchFlow.');
    } else {
      showToast('Please fill in all fields');
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
            className="w-full bg-primary text-white font-bold py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all mt-4"
          >
            Create Account
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

function NotificationsScreen({ onDailyDigest, onWeeklyDigest, onBack, showToast }: { onDailyDigest: () => void, onWeeklyDigest: () => void, onBack: () => void, showToast: (msg: string) => void }) {
  const [activeTab, setActiveTab] = useState<'all' | 'feeds' | 'activity'>('all');

  const filteredNotifications = MOCK_NOTIFICATIONS.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'feeds') return n.type === 'feed';
    if (activeTab === 'activity') return n.type !== 'feed';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-xl font-bold">Notifications</h2>
        </div>
        <button 
          onClick={() => showToast('All notifications marked as read')}
          className="text-primary font-bold text-sm"
        >
          Mark all
        </button>
      </header>

      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          All
        </button>
        <button 
          onClick={() => setActiveTab('feeds')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'feeds' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          Feeds
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
        >
          Activity
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-20">
        {activeTab !== 'activity' && filteredNotifications.some(n => n.type === 'feed') && (
          <div>
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">New Feed Results</h3>
            <div className="space-y-4">
              {filteredNotifications.filter(n => n.type === 'feed').map(n => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          </div>
        )}

        {activeTab !== 'feeds' && (filteredNotifications.some(n => n.type !== 'feed') || activeTab === 'activity') && (
          <div>
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {filteredNotifications.filter(n => n.type !== 'feed').map(n => (
                <NotificationItem key={n.id} notification={n} />
              ))}
              {activeTab !== 'feeds' && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4 shadow-sm">
                  <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <Bookmark className="size-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-bold">Collection shared with you</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Yesterday</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">The "Advanced Robotics Lab" shared their bibliography with you.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {filteredNotifications.length === 0 && activeTab !== 'all' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <BellOff className="size-8" />
            </div>
            <h4 className="text-lg font-bold mb-1">No {activeTab} notifications</h4>
            <p className="text-sm text-slate-500">We'll notify you when something new arrives.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification, key?: string | number }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'feed': return <Rss className="size-6" />;
      case 'citation': return <Quote className="size-6" />;
      case 'collab': return <UserPlus className="size-6" />;
      default: return <Bell className="size-6" />;
    }
  };

  const getIconBg = () => {
    switch (notification.type) {
      case 'feed': return 'bg-blue-600 text-white';
      case 'citation': return 'bg-emerald-100 text-emerald-600';
      case 'collab': return 'bg-amber-100 text-amber-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4 shadow-sm">
      <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${getIconBg()}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-sm font-bold leading-tight">{notification.title}</h4>
          <span className="text-[10px] text-slate-400 font-medium">{notification.time}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{notification.description}</p>
      </div>
    </div>
  );
}

function TrendsScreen({ onTopicClick, showToast }: { onTopicClick: () => void, showToast: (msg: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      showToast(`Searching trends for: ${searchQuery}`);
    }
  };

  const filteredMetrics = MOCK_TREND_METRICS.filter(m => 
    m.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-background-dark z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <TrendingUp className="size-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Research Trends</h2>
        </div>
        <Bell className="size-5 text-slate-400" />
      </header>

      <div className="p-4 space-y-6 overflow-y-auto no-scrollbar">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
          <input 
            type="text" 
            placeholder="Search research fields (e.g. CRISPR, LLMs)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
            CMD + K
          </div>
        </form>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => showToast('Removed "Quantum Computing" from filters')}
            className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 whitespace-nowrap"
          >
            Quantum Computing <X className="size-3" />
          </button>
          <button 
            onClick={() => showToast('Added "Neural Networks" to filters')}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap"
          >
            Neural Networks
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredMetrics.length > 0 ? (
            filteredMetrics.map((metric, i) => (
              <div 
                key={i} 
                onClick={onTopicClick}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2 text-primary mb-2">
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
              <p className="text-xs text-slate-500">Global monthly research output (Last 12 months)</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button className="px-3 py-1 text-[10px] font-bold bg-white dark:bg-slate-700 rounded shadow-sm">12M</button>
              <button className="px-3 py-1 text-[10px] font-bold text-slate-500">6M</button>
              <button className="px-3 py-1 text-[10px] font-bold text-slate-500">3M</button>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_PUBLICATION_VOLUME}>
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
            <span>Oct 2023</span>
            <span>Jan 2024</span>
            <span>Apr 2024</span>
            <span>Jul 2024</span>
            <span>Sep 2024</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="size-5 text-primary" />
            <h3 className="text-lg font-bold">Trending Topics</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Fault Tolerance', 'Qubit Coherence', 'Shor\'s Algorithm', 'Error Correction', 'Quantum Annealing', 'NISQ Era', 'Supremacy', 'Cryogenics'].map((topic, i) => (
              <button 
                key={i} 
                onClick={onTopicClick}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  topic === 'Shor\'s Algorithm' ? 'bg-primary/10 text-primary border border-primary/20' : 
                  topic === 'Fault Tolerance' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                  'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="text-slate-400">Topic Density</span>
              <span className="text-primary">High</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[70%]"></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              <h3 className="text-lg font-bold">Rising Stars</h3>
            </div>
            <button className="text-xs font-bold text-primary">View All</button>
          </div>
          <div className="space-y-6">
            {MOCK_RISING_STARS.map(star => (
              <div key={star.id} className="flex items-center gap-4">
                <img src={star.imageUrl} alt="" className="size-12 rounded-full object-cover border-2 border-primary/20" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold">{star.name}</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{star.affiliation}</p>
                </div>
                <span className="text-xs font-bold text-emerald-500">{star.growth}</span>
              </div>
            ))}
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

function DailyDigestScreen({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <header className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
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
        <span className="text-xs font-bold text-slate-400">October 24, 2023</span>
      </header>

      <div className="p-6 space-y-8">
        <div>
          <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">At a Glance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => showToast('Showing new matches for you')}
              className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-primary mb-4">
                <Zap className="size-4" />
                <span className="text-[10px] font-bold uppercase">New Matches</span>
              </div>
              <p className="text-4xl font-bold mb-1">12</p>
              <p className="text-[10px] text-slate-500 leading-tight">Based on your interests</p>
            </div>
            <div 
              onClick={() => showToast('Showing recent citations')}
              className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-primary mb-4">
                <Quote className="size-4" />
                <span className="text-[10px] font-bold uppercase">Citations Found</span>
              </div>
              <p className="text-4xl font-bold mb-1">3</p>
              <p className="text-[10px] text-slate-500 leading-tight">Found in recent publications</p>
            </div>
          </div>
        </div>

        {['Quantum Computing', 'Neural Networks'].map(topic => (
          <div key={topic}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                {topic === 'Quantum Computing' ? <Zap className="size-5 text-primary" /> : <TrendingUp className="size-5 text-primary" />}
                <h3 className="text-lg font-bold">{topic}</h3>
              </div>
              <button 
                onClick={() => showToast(`Showing all ${topic} papers`)}
                className="text-xs font-bold text-primary"
              >
                See all
              </button>
            </div>
            <div className="space-y-8">
              {MOCK_DIGEST_PAPERS.filter(p => p.topic === topic).map(paper => (
                <div key={paper.id} className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold leading-tight mb-1">{paper.title}</h4>
                    <p className="text-xs text-slate-500 italic">{paper.authors} • Published in {paper.source}</p>
                  </div>
                  <button 
                    onClick={() => showToast(`Opening abstract for "${paper.title}"`)}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
                  >
                    View Abstract <ExternalLink className="size-3" />
                  </button>
                  <img src={paper.imageUrl} alt="" className="w-full aspect-video rounded-2xl object-cover shadow-xl" />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {MOCK_DIGEST_ACTIVITY.map(activity => (
              <div key={activity.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <div className={`size-10 rounded-full flex items-center justify-center ${activity.type === 'citation' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                  {activity.type === 'citation' ? <Quote className="size-5" /> : <UserPlus className="size-5" />}
                </div>
                <p className="text-xs font-medium leading-relaxed">
                  <span className="font-bold">{activity.text.split(' ')[0]} {activity.text.split(' ')[1]}</span> {activity.text.split(' ').slice(2).join(' ')} <span className="text-primary font-bold italic">{activity.highlight}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="pt-8 pb-12 text-center space-y-8">
          <div className="flex justify-center gap-8 text-slate-400">
            <Settings className="size-6 cursor-pointer hover:text-primary transition-colors" />
            <Bell className="size-6 cursor-pointer hover:text-primary transition-colors" />
            <HelpCircle className="size-6 cursor-pointer hover:text-primary transition-colors" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[240px] mx-auto">
              Sent to you because you're following these research areas.
            </p>
            <div className="flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <button className="text-primary">Manage Digest Frequency</button>
              <span className="text-slate-300">•</span>
              <button className="text-slate-400">Unsubscribe</button>
            </div>
          </div>
          <div className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">
            © 2023 RESEARCHFLOW INC. • 123 SCIENCE PLAZA, PALO ALTO, CA
          </div>
        </footer>
      </div>
    </div>
  );
}

function WeeklyDigestScreen({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <header className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <div className="bg-primary p-2 rounded-lg">
            <BookOpen className="size-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Weekly Digest</h2>
        </div>
        <Share2 
          className="size-5 text-slate-400 cursor-pointer" 
          onClick={() => showToast('Weekly digest link copied to clipboard!')}
        />
      </header>

      <div className="p-6 space-y-8">
        <div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Oct 23 - Oct 30, 2023</p>
          <h1 className="text-3xl font-bold leading-tight mb-4">Your research week in review</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            We've synthesized the latest breakthroughs and your personal engagement metrics for the past 7 days.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Matches</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">128</span>
              <span className="text-emerald-500 text-xs font-bold">+12%</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Citations</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">42</span>
              <span className="text-emerald-500 text-xs font-bold">+5%</span>
            </div>
          </div>
          <div className="col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">New Papers</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">15</span>
              <span className="text-emerald-500 text-xs font-bold">+8%</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">Analytics Spotlight</h3>
            <button className="text-xs font-bold text-primary">View full report</button>
          </div>
          <p className="text-xs text-slate-500 mb-8">Interest trends in your core research areas</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_WEEKLY_TRENDS}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="ai" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="quantum" fill="#3b82f6" opacity={0.2} radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-8">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-primary"></div>
              <span className="text-[10px] font-bold text-slate-500">Quantum Computing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-primary/20"></div>
              <span className="text-[10px] font-bold text-slate-500">Artificial Intelligence</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-6">Top Papers of the Week</h3>
          <div className="space-y-4">
            {[
              { title: 'Scalable Transformer Architectures for Large Language Models', authors: 'J. Doe, A. Smith • Stanford University', badge: 'Most Saved', count: '1.2k', icon: <Bookmark className="size-4" /> },
              { title: 'Quantum Error Correction: A New Paradigm for Fault Tolerance', authors: 'R. Feynman, et al. • MIT Press', badge: 'High Engagement', count: '842', icon: <MessageSquare className="size-4" /> }
            ].map((paper, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
                <div className="flex-1">
                  <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded mb-2 inline-block ${i === 0 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {paper.badge}
                  </span>
                  <h4 className="text-base font-bold leading-tight mb-1">{paper.title}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{paper.authors}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl flex flex-col items-center gap-1 min-w-[60px]">
                  {paper.icon}
                  <span className="text-xs font-bold">{paper.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary rounded-3xl p-8 text-white shadow-xl shadow-primary/30">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="size-6" />
            <h3 className="text-xl font-bold">Citation Growth</h3>
          </div>
          <p className="text-primary-100 text-sm mb-8 leading-relaxed">
            Your research papers saw a 24% increase in discoverability this week compared to last month.
          </p>
          <div className="flex items-end gap-4 mb-8">
            <div>
              <p className="text-[10px] font-bold text-primary-200 uppercase tracking-widest mb-1">Weekly Citations</p>
              <p className="text-4xl font-bold">1,482</p>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold mb-1">+24.5%</span>
          </div>
          <button className="w-full bg-white text-primary font-bold py-4 rounded-xl shadow-lg">
            Explore Your Network
          </button>
        </div>

        <footer className="pt-8 pb-12 text-center space-y-8">
          <div className="flex justify-around px-8">
            <NavItem icon={<Rss />} label="Feed" active={false} onClick={() => {}} />
            <NavItem icon={<LibraryIcon />} label="Library" active={false} onClick={() => {}} />
            <NavItem icon={<TrendingUp />} label="Analytics" active={true} onClick={() => {}} />
            <NavItem icon={<UserCircle />} label="Profile" active={false} onClick={() => {}} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              You're receiving this because you're subscribed to Weekly Digest.
            </p>
            <div className="flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <button className="text-primary">Manage Preferences</button>
              <span className="text-slate-300">•</span>
              <button className="text-slate-400">Unsubscribe</button>
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
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    showToast(isFollowing ? 'Unfollowed Large Language Models' : 'Following Large Language Models');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto no-scrollbar">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-background-dark z-20">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-lg font-bold">Topic Insight</h2>
        <Share2 className="size-5 text-slate-400 cursor-pointer" onClick={() => showToast('Topic shared to your network!')} />
      </header>

      <div className="p-6 space-y-8">
        <div className="flex items-center gap-6">
          <div className="size-24 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-500/20 overflow-hidden">
            <img src="https://picsum.photos/seed/llm/200/200" alt="" className="w-full h-full object-cover opacity-80" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold leading-tight">Large Language Models</h1>
            <p className="text-sm text-slate-500 font-medium">Artificial Intelligence • NLP</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleFollow}
            className={`flex-1 font-bold py-4 rounded-xl shadow-lg transition-all ${isFollowing ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-none' : 'bg-orange-500 text-white shadow-orange-500/20'}`}
          >
            {isFollowing ? 'Following Topic' : 'Follow Topic'}
          </button>
          <button 
            onClick={() => showToast('Topic alerts enabled!')}
            className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <Bell className="size-6 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Growth Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">98/100</span>
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="size-3" /> +15.4%
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Interest</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">Very High</span>
            </div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="size-3" /> +8.2%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-8">
            <h3 className="text-lg font-bold">Publication Trend</h3>
            <p className="text-xs text-slate-500 mt-1">12,542 <span className="text-slate-400">Papers (Last 5 Years)</span></p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { year: '2020', papers: 2000 },
                { year: '2021', papers: 3500 },
                { year: '2022', papers: 5000 },
                { year: '2023', papers: 8500 },
                { year: '2024', papers: 12542 },
              ]}>
                <Line type="monotone" dataKey="papers" stroke="#f97316" strokeWidth={4} dot={false} />
                <Tooltip content={() => null} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-4">
            <span>2020</span>
            <span>2021</span>
            <span>2022</span>
            <span>2023</span>
            <span>2024</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Trending Sub-topics</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Transformer', active: true },
              { label: 'Reinforcement Learning', active: false },
              { label: 'Fine-tuning', active: false },
              { label: 'Prompt Engineering', active: false },
              { label: 'Attention Mechanism', active: false },
              { label: 'RAG', active: false },
              { label: 'Context Window', active: false }
            ].map((tag, i) => (
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
            <button className="text-xs font-bold text-primary">View all</button>
          </div>
          <div className="space-y-4">
            {MOCK_PREPRINTS.slice(0, 3).map((p, i) => (
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
          <div className="flex justify-between">
            {[
              { name: 'Yoshua Bengio', affiliation: 'U. Montreal', img: 'https://i.pravatar.cc/150?u=yoshua' },
              { name: 'Fei-Fei Li', affiliation: 'Stanford', img: 'https://i.pravatar.cc/150?u=feifei' },
              { name: 'Andrej Karpathy', affiliation: 'OpenAI', img: 'https://i.pravatar.cc/150?u=andrej' }
            ].map((person, i) => (
              <div key={i} onClick={() => onAuthorClick(person.name)} className="flex flex-col items-center text-center gap-2 cursor-pointer group">
                <img src={person.img} alt="" className="size-16 rounded-full object-cover border-2 border-orange-200 p-0.5 group-hover:border-primary transition-all" />
                <div>
                  <h4 className="text-xs font-bold leading-tight group-hover:text-primary transition-all">{person.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{person.affiliation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareScreen({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-background-dark z-10">
        <div className="flex items-center gap-4">
          <ArrowLeft className="cursor-pointer" onClick={onBack} />
          <h2 className="text-lg font-bold">Share Collection</h2>
        </div>
        <button onClick={onBack} className="text-primary font-bold">Done</button>
      </header>
      <div className="p-4 space-y-6">
        <section>
          <h3 className="font-bold mb-4">Invite collaborators</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="Enter email address" className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm" />
            <button 
              onClick={() => showToast('Invitation sent!')}
              className="bg-primary text-white px-6 rounded-lg font-bold text-sm"
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
            onClick={() => showToast('Link copied to clipboard!')}
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
                <img src="https://picsum.photos/seed/profile/100/100" className="size-10 rounded-full" alt="" />
                <div>
                  <p className="text-sm font-bold">Dr. Aris Thorne (You)</p>
                  <p className="text-xs text-slate-500">aris.thorne@university.edu</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase">Owner</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">SJ</div>
                <div>
                  <p className="text-sm font-bold">Sarah Jenkins</p>
                  <p className="text-xs text-slate-500">s.jenkins@lab.org</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400">Can Edit</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsScreen({ onBack, onNavigate, onLegal, showToast }: { onBack: () => void, onNavigate: (s: Screen) => void, onLegal: (type: 'tos' | 'privacy') => void, showToast: (msg: string) => void }) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'security'>('notifications');
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    dailyDigest: true,
    weeklyDigest: true,
    newPublications: true,
    citationAlerts: true,
    productUpdates: false,
    deliveryDay: 'Friday'
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => {
      const newValue = !prev[key];
      const settingName = String(key).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      showToast(`${settingName} ${newValue ? 'enabled' : 'disabled'}`);
      return { ...prev, [key]: newValue };
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sticky top-0 z-10">
        <ArrowLeft className="cursor-pointer" onClick={onBack} />
        <h2 className="text-xl font-bold">Settings</h2>
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
                  description="Receive real-time alerts on your device"
                  active={settings.pushEnabled}
                  onToggle={() => toggleSetting('pushEnabled')}
                />
                <SettingItem 
                  title="Email Notifications"
                  description="Receive updates in your inbox"
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
                />
                <SettingItem 
                  title="Weekly Digest"
                  description="The most important research insights from the past week"
                  active={settings.weeklyDigest}
                  onToggle={() => toggleSetting('weeklyDigest')}
                  showDivider={false}
                />
                {settings.weeklyDigest && (
                  <div className="px-4 pb-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Delivery day</span>
                      <div className="flex items-center gap-2 text-primary font-bold text-sm cursor-pointer">
                        {settings.deliveryDay}
                        <ChevronRight className="size-4 rotate-90" />
                      </div>
                    </div>
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
        ) : (
          <>
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
                  description="Add an extra layer of security to your account"
                  onClick={() => onNavigate('2fa-setup')}
                />
                <SecurityOption 
                  icon={<History className="size-5" />}
                  title="Recent Activity"
                  description="Review recent logins and security events"
                  onClick={() => onNavigate('security-log')}
                  showDivider={false}
                />
              </div>
            </section>

            <section className="mb-6">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Data Protection
              </div>
              <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <SecurityOption 
                  icon={<Lock className="size-5" />}
                  title="Encryption Keys"
                  description="Manage your end-to-end encryption settings"
                  onClick={() => showToast('Encryption key management coming soon!')}
                />
                <SecurityOption 
                  icon={<Smartphone className="size-5" />}
                  title="Trusted Devices"
                  description="Manage devices that can access your lab results"
                  onClick={() => showToast('Trusted devices management coming soon!')}
                  showDivider={false}
                />
              </div>
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
        )}
      </div>
    </div>
  );
}

function SettingItem({ title, description, active, onToggle, showDivider = true }: { 
  title: string, 
  description: string, 
  active: boolean, 
  onToggle: () => void,
  showDivider?: boolean
}) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 pr-4">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <div 
          onClick={onToggle}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
          <div className={`absolute top-1 left-1 size-4 bg-white rounded-full transition-transform shadow-sm ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </div>
      </div>
      {showDivider && <div className="absolute bottom-0 left-4 right-0 h-px bg-slate-100 dark:bg-slate-800"></div>}
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

function ChangePasswordScreen({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUpdate = () => {
    showToast('Password updated successfully!');
    onBack();
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
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pr-12 text-sm outline-none focus:border-primary transition-colors"
              />
              <button 
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showCurrent ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <button className="text-xs font-bold text-primary text-right w-full">Forgot Password?</button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">New Password</label>
            <div className="relative">
              <input 
                type={showNew ? "text" : "password"}
                placeholder="Enter new password"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pr-12 text-sm outline-none focus:border-primary transition-colors"
              />
              <button 
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
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pr-12 text-sm outline-none focus:border-primary transition-colors"
              />
              <button 
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
            className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            Update Password
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

function TwoFactorAuthScreen({ onBack, onNext, showToast }: { onBack: () => void, onNext: () => void, showToast: (msg: string) => void }) {
  const [step, setStep] = useState<'intro' | 'setup'>('intro');

  const handleVerify = () => {
    showToast('2FA code verified!');
    onNext();
  };

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
            <button onClick={() => setStep('setup')} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20">Get Started</button>
            <button onClick={onBack} className="w-full py-4 rounded-xl font-bold text-slate-500">Not Now</button>
          </div>
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
            <div className="size-48 bg-slate-100 flex items-center justify-center">
              <QrCode className="size-32 text-slate-800" />
            </div>
          </div>
          
          <div className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold">Can't scan the code?</h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">Enter the secret key manually.</p>
            <button className="text-primary text-xs font-bold flex items-center gap-1">
              View Secret Key <ChevronRight className="size-3" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold block">Verification Code</label>
          <div className="flex justify-between gap-2">
            {[0,0,0,0,0,0].map((_, i) => (
              <input 
                key={i}
                type="text"
                maxLength={1}
                placeholder="0"
                className="size-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xl font-bold outline-none focus:border-primary transition-colors"
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">Enter the 6-digit code from your app</p>
        </div>

        <div className="flex items-center gap-3 mt-8 mb-8">
          <div className="size-6 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <div className="size-3 bg-primary rounded-sm"></div>
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-300">Remember this device for 30 days</span>
        </div>

        <button onClick={handleVerify} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
          Verify and Activate <ShieldCheck className="size-5" />
        </button>

        <button className="w-full py-4 text-sm font-bold text-slate-400 mt-4">Need help setting up?</button>

        <div className="mt-10 flex items-center justify-center gap-2 text-slate-400">
          <Lock className="size-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure 256-bit encrypted connection</span>
        </div>
      </div>
    </div>
  );
}

function TwoFactorBackupCodesScreen({ onBack, onDone, showToast }: { onBack: () => void, onDone: () => void, showToast: (msg: string) => void }) {
  const codes = [
    '4829-1034',
    '9283-4712',
    '1029-3847',
    '5562-9012',
    '3341-8827',
    '7710-2293'
  ];

  const handleCopy = () => {
    showToast('Backup codes copied to clipboard!');
  };

  const handleDownload = () => {
    showToast('Downloading backup codes...');
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
          <button className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Download className="size-4" /> Download Codes
          </button>
          <button className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Copy className="size-4" /> Copy All
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden mb-8">
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Backup Codes</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {codes.map(code => (
              <div key={code} className="px-4 py-4 text-base font-mono font-medium text-slate-700 dark:text-slate-300 tracking-wider">
                {code}
              </div>
            ))}
          </div>
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

function SecurityLogScreen({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) {
  const logs = [
    { id: 1, type: 'login', title: 'Logged in', device: 'Chrome on Windows', location: 'New York, USA', time: 'Today at 10:45 AM', current: true },
    { id: 2, type: 'password', title: 'Password Changed', device: 'Safari on iPhone', location: 'London, UK', time: 'Oct 22, 2023 at 02:15 PM' },
    { id: 3, type: '2fa', title: '2FA Enabled', device: 'Edge on macOS', location: 'Berlin, Germany', time: 'Oct 19, 2023 at 09:30 AM' },
    { id: 4, type: 'device', title: 'New Device Recognized', device: 'Firefox on Linux', location: 'Tokyo, Japan', time: 'Oct 15, 2023 at 11:20 PM', alert: true },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'login': return <LogIn className="size-5" />;
      case 'password': return <Key className="size-5" />;
      case '2fa': return <Shield className="size-5" />;
      case 'device': return <Smartphone className="size-5" />;
      default: return <Shield className="size-5" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'device': return 'bg-amber-100 text-amber-600';
      default: return 'bg-primary/10 text-primary';
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
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Activity Log</h3>
          
          <div className="space-y-6">
            {logs.map(log => (
              <div 
                key={log.id} 
                onClick={() => showToast(`Viewing details for: ${log.title}`)}
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
              onClick={() => showToast('Signed out of all other sessions')}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <LogOut className="size-5" /> Sign Out of All Sessions
            </button>
            <p className="text-center text-xs text-slate-400 px-10">
              This will log you out from all other devices and browsers currently active.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-dashed border-slate-200 dark:border-slate-700 text-center">
              <p className="text-sm text-slate-500">
                Don't recognize an activity? <button onClick={() => showToast('Security check initiated')} className="text-primary font-bold">Secure your account</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
