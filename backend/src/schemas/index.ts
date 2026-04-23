import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  locale: z.enum(['en', 'ja', 'uk']).optional().default('en'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const ProjectCreateSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  currency: z.string().min(3).max(10),
  tags: z.array(z.string()).optional(),
  sections: z.array(z.object({ type: z.string(), content: z.any() })).optional(),
  social_insurance_rate: z.number().min(0).max(100).optional(),
  planned_opening_date: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
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
  tags: z.array(z.string()),
  published_at: z.string().nullable(),
  social_insurance_rate: z.coerce.number(),
  planned_opening_date: z.string().nullable().optional(),
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

const SalesSimulationSnapshotDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  items_snapshot: z.array(z.record(z.unknown())),
  monthly_total: z.number().optional(),
  monthly_cost: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const FixedExpenseDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  category_name: z.string(),
  amount: z.coerce.number(),
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
  amount: z.coerce.number(),
  description: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const LoanDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  lender_name: z.string(),
  principal_amount: z.coerce.number(),
  interest_rate: z.coerce.number(),
  loan_date: z.string(),
  repayment_start_date: z.string().nullable(),
  deferred_interest_policy: z.enum(['charge', 'waive']),
  repayment_months: z.coerce.number(),
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
  principal_payment: z.coerce.number(),
  interest_payment: z.coerce.number(),
  remaining_balance: z.coerce.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const LaborCostDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  year_month: z.string(),
  type: z.enum(['owner_salary', 'full_time', 'part_time']),
  monthly_salary: z.coerce.number().nullable(),
  employee_count: z.coerce.number().nullable(),
  bonus_months: z.coerce.number().nullable(),
  hourly_wage: z.coerce.number().nullable(),
  hours_per_day: z.coerce.number().nullable(),
  days_per_month: z.coerce.number().nullable(),
  part_time_count: z.coerce.number().nullable(),
  owner_salary: z.coerce.number().nullable(),
  monthly_total: z.coerce.number().optional(),
  display_order: z.coerce.number(),
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
  profit_before_tax: z.coerce.number().optional(),
  depreciation: z.coerce.number().optional(),
  interest_expense: z.coerce.number().optional(),
  accounts_receivable_change: z.coerce.number(),
  inventory_change: z.coerce.number(),
  accounts_payable_change: z.coerce.number(),
  other_operating: z.coerce.number(),
  operating_cf_subtotal: z.coerce.number().optional(),
  capex_acquisition: z.coerce.number(),
  asset_sale: z.coerce.number(),
  intangible_acquisition: z.coerce.number(),
  other_investing: z.coerce.number(),
  investing_cf_subtotal: z.coerce.number().optional(),
  borrowing_proceeds: z.coerce.number().optional(),
  loan_repayment: z.coerce.number().optional(),
  capital_increase: z.coerce.number(),
  dividend_payment: z.coerce.number(),
  other_financing: z.coerce.number(),
  financing_cf_subtotal: z.coerce.number().optional(),
  net_cash_change: z.coerce.number().optional(),
  cash_beginning: z.coerce.number().optional(),
  cash_ending: z.coerce.number().optional(),
  is_inherited: z.boolean(),
  note_ja: z.string().nullable(),
  note_en: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const FixedAssetDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  asset_name: z.string(),
  asset_category: z.enum(['building', 'equipment', 'vehicle', 'intangible', 'other']),
  purchase_date: z.string(),
  purchase_amount: z.coerce.number(),
  useful_life: z.coerce.number(),
  salvage_value: z.coerce.number(),
  depreciation_method: z.enum(['straight_line', 'diminishing']),
  start_depreciation_date: z.string(),
  end_depreciation_date: z.string(),
  monthly_depreciation: z.coerce.number(),
  notes: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const FixedAssetDepreciationScheduleDataSchema = z.object({
  id: z.string(),
  fixed_asset_id: z.string(),
  year_month: z.string(),
  monthly_depreciation: z.coerce.number(),
  accumulated_depreciation: z.coerce.number(),
  book_value: z.coerce.number(),
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

const StartupCostDataSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  description: z.string(),
  quantity: z.coerce.number(),
  unit_price: z.coerce.number(),
  cost_type: z.enum(['equipment', 'renovation', 'deposit', 'intangible', 'founding', 'marketing', 'consumables', 'initial_inventory', 'working_capital']),
  allocation_month: z.string(),
  display_order: z.coerce.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/** エクスポートデータ全体のスキーマ */
export const ProjectExportSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  project: ProjectDataSchema,
  sections: z.array(ProjectSectionDataSchema),
  salesSnapshots: z.array(SalesSimulationSnapshotDataSchema),
  fixedExpenses: z.array(FixedExpenseDataSchema),
  fixedExpenseMonths: z.array(FixedExpenseMonthDataSchema),
  variableExpenses: z.array(VariableExpenseDataSchema),
  loans: z.array(LoanDataSchema),
  loanRepayments: z.array(LoanRepaymentDataSchema),
  laborCosts: z.array(LaborCostDataSchema),
  laborCostMonths: z.array(LaborCostMonthDataSchema),
  cashFlows: z.array(CashFlowMonthlyDataSchema),
  fixedAssets: z.array(FixedAssetDataSchema).optional().default([]),
  fixedAssetDepreciationSchedules: z.array(FixedAssetDepreciationScheduleDataSchema).optional().default([]),
  attachments: z.array(AttachmentDataSchema).optional().default([]),
  comments: z.array(CommentDataSchema),
  startupCosts: z.array(StartupCostDataSchema).optional().default([]),
});

/** インポートリクエストのスキーマ */
export const ProjectImportSchema = z.object({
  data: ProjectExportSchema,
  newTitle: z.string().min(1).optional(),
});
