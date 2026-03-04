import { Preprint, Collection, Notification, CustomFeed, TrendMetric, RisingStar, DigestPaper, DigestActivity, User, Institution } from './types';

export const MOCK_PREPRINTS: Preprint[] = [
  {
    id: '1',
    title: 'Quantum Entanglement in Large-Scale Neural Architectures: A Theoretical Framework',
    authors: ['A. Smith', 'J. Doe', 'R. Chen'],
    source: 'arXiv',
    date: 'Oct 24, 2023',
    tags: ['Quantum Physics', 'Machine Learning'],
    abstract: 'This study explores the underlying mechanisms of neural adaptation in the prefrontal cortex during high-level cognitive tasks...',
    isSaved: false,
    citations: 142,
    savesCount: 85,
    type: 'Preprint',
    comments: [
      { id: 'c1', userId: 'dr_smith', userName: 'Dr. Sarah Smith', userImageUrl: 'https://i.pravatar.cc/150?u=dr_smith', text: 'Excellent theoretical framework. Have you considered the implications for fault-tolerant gates?', date: '2d ago', likes: 12 },
      { id: 'c2', userId: 'prof_wilson', userName: 'Prof. James Wilson', userImageUrl: 'https://i.pravatar.cc/150?u=prof_wilson', text: 'The scaling analysis in Section 4 is particularly insightful.', date: '1d ago', likes: 5 }
    ],
    citedBy: ['dr_smith', 'prof_wilson', 'Dr. Elena Rodriguez', 'Prof. Mark Thorne'],
    references: ['Quantum Error Correction: A Review', 'Neural Networks and Deep Learning', 'Scalable Quantum Architectures'],
    savedBy: ['aris_thorne', 'dr_smith', 'prof_wilson'],
    ratedBy: [
      { userId: 'dr_smith', rating: 5 },
      { userId: 'prof_wilson', rating: 4 }
    ]
  },
  {
    id: '2',
    title: 'Single-cell sequencing reveals unique immune responses in alpine vegetation specialists',
    authors: ['Elena Rodriguez', 'Mark Thorne'],
    source: 'bioRxiv',
    date: 'Oct 22, 2023',
    tags: ['Genetics', 'Plant Biology'],
    abstract: 'We observed significant variance in connectivity patterns between control and experimental groups...',
    isSaved: true,
    citations: 89,
    savesCount: 124,
    type: 'Peer-Reviewed',
    comments: [
      { id: 'c3', userId: 'aris_thorne', userName: 'Dr. Aris Thorne', userImageUrl: 'https://picsum.photos/seed/profile/200/200', text: 'The methodology for single-cell isolation is quite robust.', date: '3d ago', likes: 8 }
    ],
    citedBy: ['aris_thorne', 'Dr. Sarah Vance'],
    references: ['Alpine Ecology: An Introduction', 'Genomic Analysis of High-Altitude Plants'],
    savedBy: ['aris_thorne', 'dr_smith'],
    ratedBy: [
      { userId: 'aris_thorne', rating: 5 }
    ]
  },
  {
    id: '3',
    title: 'Long-term efficacy of mRNA-based interventions in diverse demographic cohorts',
    authors: ['Dr. Sarah Vance', 'Michael J. Fox', 'Sarah Connor'],
    source: 'medRxiv',
    date: 'Oct 20, 2023',
    tags: ['Epidemiology', 'Public Health'],
    abstract: 'Data was processed using a custom Bayesian hierarchical model to account for individual baseline variations...',
    isSaved: false,
    citations: 215,
    savesCount: 342,
    type: 'Conference Paper',
    citedBy: ['prof_wilson', 'Dr. Aris Thorne'],
    references: ['mRNA Vaccines: A New Era', 'Demographic Variations in Vaccine Efficacy'],
    savedBy: ['dr_smith', 'prof_wilson'],
    ratedBy: [
      { userId: 'prof_wilson', rating: 5 }
    ]
  },
  {
    id: '4',
    title: 'Blockchain Protocols for Secure Data Sharing in Healthcare',
    authors: ['L. Wong', 'K. Tanaka'],
    source: 'arXiv',
    date: 'Oct 18, 2023',
    tags: ['Computer Science', 'Statistics'],
    abstract: 'Examining the trade-offs between decentralization and speed in modern consensus mechanisms...',
    isSaved: false,
    citations: 56,
    savesCount: 12,
    type: 'Preprint'
  },
  {
    id: '5',
    title: 'Neural Network Optimization for Edge Devices: A Survey on Quantization',
    authors: ['Alice Wong', 'Bob Lee'],
    source: 'arXiv',
    date: 'Aug 12, 2023',
    tags: ['Machine Learning', 'Computer Science'],
    abstract: 'A comprehensive review of the latest convolutional neural network architectures applied to MRI and CT scan analysis...',
    isSaved: false,
    citations: 312,
    savesCount: 156,
    type: 'Peer-Reviewed'
  },
  {
    id: '6',
    title: 'The Ethics of Artificial Consciousness: A Phenomenological Approach',
    authors: ['Dr. Julian Rivers', 'S. Martinez'],
    source: 'PhilPapers',
    date: 'Nov 02, 2023',
    tags: ['Ethics', 'Philosophy of Mind'],
    abstract: 'This paper examines the moral status of synthetic entities through the lens of classical phenomenology...',
    isSaved: false,
    citations: 45,
    savesCount: 8,
    type: 'Conference Paper'
  },
  {
    id: '7',
    title: 'Global Trends in Renewable Energy Adoption: A 10-Year Meta-Analysis',
    authors: ['H. Tanaka', 'L. Schmidt'],
    source: 'OA Journals',
    date: 'Oct 30, 2023',
    tags: ['Physical Sciences', 'Economics'],
    abstract: 'Synthesizing data from over 500 peer-reviewed studies to identify key drivers of the green transition...',
    isSaved: true,
    citations: 128,
    savesCount: 210,
    type: 'Peer-Reviewed'
  }
];

export const MOCK_CUSTOM_FEEDS: CustomFeed[] = [
  {
    id: '1',
    name: 'Quantum Computing',
    keywords: ['Quantum', 'Qubit', 'Entanglement'],
    sources: ['arXiv', 'Preprints'],
    frequency: 'Daily',
    isActive: true
  },
  {
    id: '2',
    name: 'Open Access Biology',
    keywords: ['Biology', 'Genetics', 'CRISPR'],
    sources: ['bioRxiv', 'OA Journals'],
    frequency: 'Weekly',
    isActive: true
  },
  {
    id: '3',
    name: 'Neural Networks',
    keywords: ['Neural Networks', 'Deep Learning', 'AI'],
    sources: ['arXiv', 'GitHub'],
    frequency: 'Real-time',
    isActive: true
  }
];

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: '1',
    name: 'Quantum Research',
    description: 'A collection of papers focusing on quantum entanglement and scalable fault-tolerant architectures.',
    paperCount: 12,
    totalCitations: 1450,
    updatedAt: '2d ago',
    imageUrl: 'https://picsum.photos/seed/quantum/400/400'
  },
  {
    id: '2',
    name: 'Genetics Project',
    description: 'Research related to single-cell sequencing and immune responses in alpine vegetation.',
    paperCount: 8,
    totalCitations: 620,
    updatedAt: '5d ago',
    imageUrl: 'https://picsum.photos/seed/genetics/400/400'
  },
  {
    id: '3',
    name: 'Weekend Reading',
    description: 'Interesting preprints to catch up on over the weekend across various disciplines.',
    paperCount: 5,
    totalCitations: 125,
    updatedAt: '1w ago',
    imageUrl: 'https://picsum.photos/seed/books/400/400'
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'feed',
    title: '3 new papers found in "Quantum Computing"',
    description: 'Tap to view the latest research matches in your saved feed.',
    time: '2m ago',
    isNew: true
  },
  {
    id: '2',
    type: 'citation',
    title: 'New citation of your work',
    description: 'Your paper "Neural Architectures for Edge Devices" was cited by Dr. Elena Kovac.',
    time: '3h ago'
  },
  {
    id: '3',
    type: 'collab',
    title: 'Collaborator added a paper',
    description: 'Sarah Miller added "Low-latency Inference" to "Edge Computing Collection".',
    time: '5h ago'
  }
];

export const MOCK_TREND_METRICS: TrendMetric[] = [
  { label: 'Total Papers (YTD)', value: '12,450', change: '+5.2%', icon: 'FileText', trend: 'up' },
  { label: 'Avg. Citations', value: '84.2', change: '+1.8%', icon: 'Quote', trend: 'up' },
  { label: 'Growth Rate', value: '+12.5%', change: '+0.4%', icon: 'TrendingUp', trend: 'up' }
];

export const MOCK_RISING_STARS: RisingStar[] = [
  { id: '1', name: 'Dr. Elena Volkov', affiliation: 'MIT • Quantum Optics', growth: '+42% cit.', imageUrl: 'https://i.pravatar.cc/150?u=elena' },
  { id: '2', name: 'Marcus Chen', affiliation: 'Stanford • Hardware Systems', growth: '+28% cit.', imageUrl: 'https://i.pravatar.cc/150?u=marcus' },
  { id: '3', name: 'Sarah Jenkins', affiliation: 'Oxford • Cryptography', growth: '+35% cit.', imageUrl: 'https://i.pravatar.cc/150?u=sarah' }
];

export const MOCK_DIGEST_PAPERS: DigestPaper[] = [
  {
    id: 'd1',
    topic: 'Quantum Computing',
    title: 'Quantum Supremacy in the NISQ Era',
    authors: 'John Preskill, et al.',
    source: 'Nature Physics',
    imageUrl: 'https://picsum.photos/seed/quantum1/800/400'
  },
  {
    id: 'd2',
    topic: 'Quantum Computing',
    title: 'Error Mitigation for Near-term Devices',
    authors: 'Suguru Endo, et al.',
    source: 'Physical Review Letters',
    imageUrl: 'https://picsum.photos/seed/quantum2/800/400'
  },
  {
    id: 'd3',
    topic: 'Neural Networks',
    title: 'Sparse Attention Mechanisms in LLMs',
    authors: 'Elena Rodriguez, et al.',
    source: 'arXiv:2023.0912',
    imageUrl: 'https://picsum.photos/seed/neural1/800/400'
  }
];

export const MOCK_DIGEST_ACTIVITY: DigestActivity[] = [
  { id: 'a1', type: 'citation', text: '3 people cited your paper on', highlight: 'Adversarial Attacks.' },
  { id: 'a2', type: 'collaborator', text: 'New collaborator added to your project: Dr. Sarah Jenkins.' }
];

export const MOCK_INSTITUTIONS: Institution[] = [
  {
    id: 'uzh',
    name: 'University of Zurich',
    location: 'Zurich, Switzerland',
    imageUrl: 'https://picsum.photos/seed/uzh/800/400',
    description: 'A leading research university in Switzerland, known for its excellence in quantum physics and medicine.',
    stats: {
      researchers: 1240,
      publications: 45000,
      citations: 1200000
    }
  },
  {
    id: 'stanford',
    name: 'Stanford University',
    location: 'Stanford, CA, USA',
    imageUrl: 'https://picsum.photos/seed/stanford/800/400',
    description: 'One of the world\'s leading teaching and research institutions, located in Silicon Valley.',
    stats: {
      researchers: 2100,
      publications: 85000,
      citations: 3500000
    }
  },
  {
    id: 'mit',
    name: 'MIT',
    location: 'Cambridge, MA, USA',
    imageUrl: 'https://picsum.photos/seed/mit/800/400',
    description: 'The Massachusetts Institute of Technology is a world-class educational institution.',
    stats: {
      researchers: 1800,
      publications: 72000,
      citations: 2800000
    }
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'aris_thorne',
    name: 'Dr. Aris Thorne',
    email: 'aris.thorne@uzh.ch',
    isEmailVerified: true,
    isAffiliationVerified: true,
    affiliation: 'University of Zurich',
    institutionId: 'uzh',
    imageUrl: 'https://picsum.photos/seed/profile/200/200',
    bio: 'Specializing in Quantum Computing and Error Correction. My current work focuses on scalable fault-tolerant architectures.',
    publications: ['1', '2'],
    followers: 1240,
    following: 482,
    stats: {
      preprints: 42,
      citations: 1200,
      followers: 1240,
      hIndex: 18,
      i10Index: 42,
      totalPublications: 42
    }
  },
  {
    id: 'dr_smith',
    name: 'Dr. Sarah Smith',
    email: 's.smith@stanford.edu',
    isEmailVerified: true,
    isAffiliationVerified: true,
    affiliation: 'Stanford University',
    institutionId: 'stanford',
    imageUrl: 'https://i.pravatar.cc/150?u=dr_smith',
    bio: 'Leading researcher in neural networks and deep learning architectures.',
    publications: ['1', '2'],
    followers: 1240,
    following: 180,
    isFollowing: false,
    stats: {
      preprints: 42,
      citations: 15600,
      followers: 1240,
      hIndex: 24,
      i10Index: 38,
      totalPublications: 56
    }
  },
  {
    id: 'prof_wilson',
    name: 'Prof. James Wilson',
    email: 'j.wilson@mit.edu',
    isEmailVerified: true,
    isAffiliationVerified: false,
    affiliation: 'MIT',
    institutionId: 'mit',
    imageUrl: 'https://i.pravatar.cc/150?u=prof_wilson',
    bio: 'Expert in hardware systems and distributed computing.',
    publications: ['3'],
    followers: 850,
    following: 120,
    isFollowing: true,
    stats: {
      preprints: 28,
      citations: 8400,
      followers: 850,
      hIndex: 19,
      i10Index: 31,
      totalPublications: 35
    }
  }
];

export const MOCK_PUBLICATION_VOLUME = [
  { month: 'Oct 2023', papers: 800 },
  { month: 'Jan 2024', papers: 950 },
  { month: 'Apr 2024', papers: 1100 },
  { month: 'Jul 2024', papers: 1250 },
  { month: 'Sep 2024', papers: 1402 },
];

export const MOCK_WEEKLY_TRENDS = [
  { day: 'Mon', quantum: 40, ai: 60 },
  { day: 'Tue', quantum: 70, ai: 85 },
  { day: 'Wed', quantum: 30, ai: 55 },
  { day: 'Thu', quantum: 90, ai: 100 },
  { day: 'Fri', quantum: 50, ai: 75 },
  { day: 'Sat', quantum: 20, ai: 45 },
  { day: 'Sun', quantum: 45, ai: 65 },
];
