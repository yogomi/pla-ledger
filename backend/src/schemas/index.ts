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

// ========== Export / Import スキーマ ==========

const ProjectDataSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  currency: z.string(),
  stage: z.string().nullable(),
  tags: z.array(z.string()),
  published_at: z.string().nullable(),
  social_insurance_rate: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const ProjectSectionDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  type: z.string(),
  content: z.record(z.unknown()),
  version: z.number(),
  created_by: z.string(),
  created_at: z.string().optional(),
});

const SalesSimulationCategoryDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  category_name: z.string(),
  category_order: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const SalesSimulationItemDataSchema = z.object({
  id: z.string(),
  category_id: z.string(),
  project_id: z.string(),
  item_name: z.string(),
  item_order: z.number(),
  unit_price: z.number(),
  quantity: z.number(),
  operating_days: z.number(),
  cost_rate: z.number(),
  description: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const SalesSimulationSnapshotDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  items_snapshot: z.array(z.record(z.unknown())),
  monthly_total: z.number(),
  monthly_cost: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const FixedExpenseDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  category_name: z.string(),
  amount: z.number(),
  description: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const FixedExpenseMonthDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  created_at: z.string().optional(),
});

const VariableExpenseDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  category_name: z.string(),
  amount: z.number(),
  description: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const LoanDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  lender_name: z.string(),
  principal_amount: z.number(),
  interest_rate: z.number(),
  loan_date: z.string(),
  repayment_start_date: z.string().nullable(),
  deferred_interest_policy: z.enum(['charge', 'waive']),
  repayment_months: z.number(),
  repayment_method: z.enum(['equal_payment', 'equal_principal', 'bullet']),
  description: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const LoanRepaymentDataSchema = z.object({
  id: z.string(),
  loan_id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  principal_payment: z.number(),
  interest_payment: z.number(),
  remaining_balance: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const LaborCostDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  type: z.enum(['owner_salary', 'full_time', 'part_time']),
  monthly_salary: z.number().nullable(),
  employee_count: z.number().nullable(),
  bonus_months: z.number().nullable(),
  hourly_wage: z.number().nullable(),
  hours_per_day: z.number().nullable(),
  days_per_month: z.number().nullable(),
  part_time_count: z.number().nullable(),
  owner_salary: z.number().nullable(),
  monthly_total: z.number(),
  display_order: z.number(),
  note_ja: z.string().nullable(),
  note_en: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const LaborCostMonthDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  created_at: z.string().optional(),
});

const CashFlowMonthlyDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  profit_before_tax: z.number(),
  depreciation: z.number(),
  interest_expense: z.number(),
  accounts_receivable_change: z.number(),
  inventory_change: z.number(),
  accounts_payable_change: z.number(),
  other_operating: z.number(),
  operating_cf_subtotal: z.number(),
  capex_acquisition: z.number(),
  asset_sale: z.number(),
  intangible_acquisition: z.number(),
  other_investing: z.number(),
  investing_cf_subtotal: z.number(),
  borrowing_proceeds: z.number(),
  loan_repayment: z.number(),
  capital_increase: z.number(),
  dividend_payment: z.number(),
  other_financing: z.number(),
  financing_cf_subtotal: z.number(),
  net_cash_change: z.number(),
  cash_beginning: z.number(),
  cash_ending: z.number(),
  is_inherited: z.boolean(),
  note_ja: z.string().nullable(),
  note_en: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const AttachmentDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  url: z.string(),
  uploaded_by: z.string(),
  size: z.number(),
  created_at: z.string().optional(),
});

const CommentDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  section_id: z.string().nullable(),
  author_id: z.string(),
  body: z.string(),
  created_at: z.string().optional(),
});

/** エクスポートデータ全体のスキーマ */
export const ProjectExportSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  project: ProjectDataSchema,
  sections: z.array(ProjectSectionDataSchema),
  salesCategories: z.array(SalesSimulationCategoryDataSchema),
  salesItems: z.array(SalesSimulationItemDataSchema),
  salesSnapshots: z.array(SalesSimulationSnapshotDataSchema),
  fixedExpenses: z.array(FixedExpenseDataSchema),
  fixedExpenseMonths: z.array(FixedExpenseMonthDataSchema),
  variableExpenses: z.array(VariableExpenseDataSchema),
  loans: z.array(LoanDataSchema),
  loanRepayments: z.array(LoanRepaymentDataSchema),
  laborCosts: z.array(LaborCostDataSchema),
  laborCostMonths: z.array(LaborCostMonthDataSchema),
  cashFlows: z.array(CashFlowMonthlyDataSchema),
  attachments: z.array(AttachmentDataSchema).optional().default([]),
  comments: z.array(CommentDataSchema),
});

/** インポートリクエストのスキーマ */
export const ProjectImportSchema = z.object({
  data: ProjectExportSchema,
  newTitle: z.string().min(1).optional(),
});
