import { z } from 'zod';

const email = z.string().trim().email();
const password = z.string().min(8).max(200);
const deliveryDay = z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  affiliation: z.string().trim().min(2).max(160).optional(),
  institution: z.string().trim().min(2).max(160).optional(),
  password,
}).superRefine((value, ctx) => {
  if (!value.affiliation && !value.institution) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['affiliation'],
      message: 'Affiliation is required',
    });
  }
}).transform((value) => ({
  name: value.name,
  email: value.email,
  password: value.password,
  affiliation: value.affiliation ?? value.institution ?? '',
}));

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const completeTwoFactorLoginSchema = z.object({
  challengeToken: z.string().uuid(),
  code: z.string().trim().min(6).max(32),
  rememberDevice: z.boolean().optional().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
});

export const passwordResetRequestSchema = z.object({
  email,
});

export const passwordResetSchema = z.object({
  token: z.string().trim().min(1).max(200),
  password,
});

export const settingsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  newPublications: z.boolean().optional(),
  citationAlerts: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  deliveryDay: deliveryDay.optional(),
  profileVisibility: z.enum(['public', 'followers', 'private']).optional(),
  messagePrivacy: z.enum(['everyone', 'followers', 'nobody']).optional(),
  sharePrivacy: z.enum(['everyone', 'followers', 'nobody']).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one setting change is required',
});

export const digestSendSchema = z.object({
  kind: z.enum(['daily', 'weekly']),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export const productAnnouncementSchema = z.object({
  title: z.string().trim().min(4).max(160),
  message: z.string().trim().min(8).max(4000),
  actionUrl: z.string().trim().max(200).optional().or(z.literal('')),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  orcidId: z.string().trim().max(64).optional().or(z.literal('')),
  affiliation: z.string().trim().min(2).max(160),
  bio: z.string().trim().min(8).max(1200),
  title: z.string().trim().min(1).max(160),
  imageUrl: z.string().trim().url().or(z.literal('')),
  isAffiliationVerified: z.boolean().optional(),
  currentPassword: z.string().max(200).optional(),
});

export const shareSchema = z.object({
  preprintId: z.string().trim().min(1),
  recipientIds: z.array(z.string().trim().min(1)).min(1).max(25),
});

export const createChatSchema = z.object({
  participantId: z.string().trim().min(1),
});

export const chatMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

export const reportSchema = z.object({
  targetType: z.enum(['user', 'preprint', 'chat', 'message', 'comment']),
  targetId: z.string().trim().min(1).max(200),
  reason: z.enum(['spam', 'harassment', 'misinformation', 'copyright', 'other']),
  details: z.string().trim().max(2000).optional(),
});

export const blockUserSchema = z.object({
  blockedUserId: z.string().trim().min(1).max(200),
});

export const reviewModerationReportSchema = z.object({
  status: z.enum(['reviewing', 'resolved', 'dismissed']),
  resolutionNote: z.string().trim().max(2000).optional(),
});

export const assignModerationReportSchema = z.object({
  assignedToUserId: z.string().trim().min(1).max(200).nullable(),
});

export const escalateModerationReportSchema = z.object({
  escalationReason: z.string().trim().min(4).max(2000),
});

export const bulkModerationSchema = z.object({
  reportIds: z.array(z.string().trim().min(1).max(200)).min(1).max(100),
  action: z.enum(['assign', 'review', 'escalate']),
  assignedToUserId: z.string().trim().min(1).max(200).nullable().optional(),
  status: z.enum(['reviewing', 'resolved', 'dismissed']).optional(),
  resolutionNote: z.string().trim().max(2000).optional(),
  escalationReason: z.string().trim().min(4).max(2000).optional(),
});

export const arxivIngestSchema = z.object({
  query: z.string().trim().min(2).max(200),
  maxResults: z.number().int().min(1).max(50).optional().default(15),
});

export const crossrefIngestSchema = z.object({
  query: z.string().trim().min(2).max(200),
  maxResults: z.number().int().min(1).max(50).optional().default(15),
});

export const contentIngestSchema = z.object({
  query: z.string().trim().min(2).max(200),
  maxResults: z.number().int().min(1).max(50).optional().default(15),
});

export const profilePublicationImportSchema = z.object({
  source: z.enum(['orcid', 'arxiv']),
  authorName: z.string().trim().min(2).max(160).optional(),
  orcidId: z.string().trim().min(4).max(64).optional(),
  maxResults: z.number().int().min(1).max(50).optional().default(10),
}).superRefine((value, ctx) => {
  if (value.source === 'orcid' && !value.orcidId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['orcidId'],
      message: 'ORCID iD is required for ORCID imports',
    });
  }
});

export const contentSyncDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  sourceId: z.string().trim().min(2).max(40),
  query: z.string().trim().min(2).max(200),
  maxResults: z.number().int().min(1).max(50).optional().default(15),
  intervalMinutes: z.number().int().min(15).max(60 * 24 * 7),
  enabled: z.boolean().optional().default(true),
});

export const collectionCollaboratorSchema = z.object({
  email,
  role: z.enum(['viewer', 'editor']).optional().default('editor'),
});

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
});

export const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
});

export const updateCollectionPapersSchema = z.object({
  preprintIds: z.array(z.string().trim().min(1).max(200)).max(500),
});

export const updateCollectionAccessSchema = z.object({
  collaborators: z.array(collectionCollaboratorSchema).max(100),
});

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const error = new Error(result.error.issues[0]?.message ?? 'Invalid request');
    error.name = 'ValidationError';
    throw error;
  }
  return result.data;
}
