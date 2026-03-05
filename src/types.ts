export interface PaperComment {
  id: string;
  userId: string;
  userName: string;
  userImageUrl: string;
  text: string;
  date: string;
  likes: number;
}

export interface Preprint {
  id: string;
  title: string;
  authors: string[];
  source: 'arXiv' | 'bioRxiv' | 'medRxiv' | 'ChemRxiv' | 'SSRN' | 'Research Square' | 'PhilPapers' | 'OA Journals' | 'OA Articles';
  date: string;
  tags: string[];
  abstract: string;
  isSaved?: boolean;
  citations?: number;
  rating?: number;
  userRating?: number;
  views?: number;
  savesCount?: number;
  type?: 'Preprint' | 'Peer-Reviewed' | 'Conference Paper';
  comments?: PaperComment[];
  citedBy?: string[]; // User IDs or Names
  references?: string[]; // Paper IDs or Titles
  savedBy?: string[]; // User IDs
  ratedBy?: { userId: string, rating: number }[];
}

export interface User {
  id: string;
  name: string;
  email?: string;
  isEmailVerified?: boolean;
  isAffiliationVerified?: boolean;
  affiliation: string;
  institutionId?: string;
  imageUrl: string;
  bio: string;
  publications: string[]; // IDs of preprints
  followers: number;
  following: number;
  isFollowing?: boolean;
  stats: {
    preprints: number;
    citations: number;
    followers: number;
    hIndex?: number;
    i10Index?: number;
    totalPublications?: number;
  };
}

export interface Institution {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  description: string;
  stats: {
    researchers: number;
    publications: number;
    citations: number;
  };
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  paperCount: number;
  totalCitations?: number;
  updatedAt: string;
  imageUrl: string;
}

export interface CustomFeed {
  id: string;
  name: string;
  keywords: string[];
  sources: string[];
  frequency: 'Real-time' | 'Daily' | 'Weekly';
  isActive: boolean;
}

export interface Notification {
  id: string;
  type: 'feed' | 'citation' | 'collab' | 'share' | 'comment';
  title: string;
  description: string;
  time: string;
  isNew?: boolean;
}

export interface TrendMetric {
  label: string;
  value: string;
  change: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface RisingStar {
  id: string;
  name: string;
  affiliation: string;
  growth: string;
  imageUrl: string;
}

export interface DigestPaper {
  id: string;
  title: string;
  authors: string;
  source: string;
  imageUrl: string;
  topic: string;
}

export interface DigestActivity {
  id: string;
  type: 'citation' | 'collaborator';
  text: string;
  highlight?: string;
}
