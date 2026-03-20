import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  locale: z.enum(['en', 'ja']).optional().default('en'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ProjectCreateSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  currency: z.string().min(3).max(10),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sections: z.array(z.object({ type: z.string(), content: z.any() })).optional(),
  social_insurance_rate: z.number().min(0).max(100).optional(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export const GrantPermissionSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['editor', 'viewer']),
});

export const RequestAccessSchema = z.object({
  request_type: z.enum(['view', 'edit']),
  message: z.string().optional(),
});

export const ProcessAccessRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export const PublicProjectsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  keyword: z.string().optional(),
  stage: z.string().optional(),
  currency: z.string().optional(),
  tags: z.string().optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});
