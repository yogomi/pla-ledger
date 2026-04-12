import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import path from 'path';
import logger from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

export const sequelize = isProduction && process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'pla-ledger.sqlite'),
      logging: process.env.NODE_ENV === 'development'
        ? (sql: string) => logger.debug(sql)
        : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

// ========== User ==========
interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  locale: string;
  created_at?: Date;
  updated_at?: Date;
}
type UserCreation = Optional<UserAttributes, 'id' | 'locale'>;

export class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare password_hash: string;
  declare name: string;
  declare locale: string;
}

User.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  locale: { type: DataTypes.STRING, defaultValue: 'en' },
}, { sequelize, tableName: 'users', underscored: true });

// ========== Project ==========
interface ProjectAttributes {
  id: string;
  owner_id: string;
  title: string;
  summary: string | null;
  visibility: 'public' | 'private' | 'unlisted';
  currency: string;
  stage: string | null;
  tags: string[];
  published_at: Date | null;
  social_insurance_rate: number;
  initial_cash_balance: number;
  planned_opening_date: string | null;
  created_at?: Date;
  updated_at?: Date;
}
type ProjectCreation = Optional<
  ProjectAttributes,
  | 'id'
  | 'summary'
  | 'stage'
  | 'tags'
  | 'published_at'
  | 'social_insurance_rate'
  | 'initial_cash_balance'
  | 'planned_opening_date'
>;

export class Project
  extends Model<ProjectAttributes, ProjectCreation>
  implements ProjectAttributes {
  declare id: string;
  declare owner_id: string;
  declare title: string;
  declare summary: string | null;
  declare visibility: 'public' | 'private' | 'unlisted';
  declare currency: string;
  declare stage: string | null;
  declare tags: string[];
  declare published_at: Date | null;
  declare social_insurance_rate: number;
  declare initial_cash_balance: number;
  declare planned_opening_date: string | null;
}

Project.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  owner_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.TEXT, allowNull: false, unique: true },
  summary: { type: DataTypes.TEXT, defaultValue: null },
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'unlisted'),
    allowNull: false,
    defaultValue: 'private',
  },
  currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'JPY' },
  stage: { type: DataTypes.STRING, defaultValue: null },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  published_at: { type: DataTypes.DATE, defaultValue: null },
  social_insurance_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 15.0 },
  initial_cash_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '事業開始時（開業予定日）の初期現金残高',
  },
  planned_opening_date: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: '開業予定日（YYYY-MM形式）。未設定の場合は2025-01をデフォルト使用',
  },
}, { sequelize, tableName: 'projects', underscored: true });

// ========== Permission ==========
interface PermissionAttributes {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  granted_by: string | null;
  granted_at?: Date;
}
type PermissionCreation = Optional<PermissionAttributes, 'id' | 'granted_by'>;

export class Permission
  extends Model<PermissionAttributes, PermissionCreation>
  implements PermissionAttributes {
  declare id: string;
  declare project_id: string;
  declare user_id: string;
  declare role: 'owner' | 'editor' | 'viewer';
  declare granted_by: string | null;
}

Permission.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  role: { type: DataTypes.ENUM('owner', 'editor', 'viewer'), allowNull: false },
  granted_by: { type: DataTypes.UUID, defaultValue: null },
  granted_at: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, tableName: 'permissions', underscored: true, timestamps: false });

// ========== AccessRequest ==========
interface AccessRequestAttributes {
  id: string;
  project_id: string;
  requester_id: string;
  request_type: 'view' | 'edit';
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  processed_by: string | null;
  processed_at: Date | null;
  created_at?: Date;
}
type AccessRequestCreation = Optional<
  AccessRequestAttributes,
  'id' | 'message' | 'processed_by' | 'processed_at'
>;

export class AccessRequest
  extends Model<AccessRequestAttributes, AccessRequestCreation>
  implements AccessRequestAttributes {
  declare id: string;
  declare project_id: string;
  declare requester_id: string;
  declare request_type: 'view' | 'edit';
  declare message: string | null;
  declare status: 'pending' | 'approved' | 'rejected';
  declare processed_by: string | null;
  declare processed_at: Date | null;
}

AccessRequest.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  requester_id: { type: DataTypes.UUID, allowNull: false },
  request_type: { type: DataTypes.ENUM('view', 'edit'), allowNull: false },
  message: { type: DataTypes.TEXT, defaultValue: null },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  processed_by: { type: DataTypes.UUID, defaultValue: null },
  processed_at: { type: DataTypes.DATE, defaultValue: null },
}, { sequelize, tableName: 'access_requests', underscored: true, timestamps: false });

// ========== ProjectSection ==========
interface ProjectSectionAttributes {
  id: string;
  project_id: string;
  type: string;
  content: Record<string, unknown>;
  version: number;
  created_by: string;
  created_at?: Date;
}
type ProjectSectionCreation = Optional<ProjectSectionAttributes, 'id' | 'version'>;

export class ProjectSection
  extends Model<ProjectSectionAttributes, ProjectSectionCreation>
  implements ProjectSectionAttributes {
  declare id: string;
  declare project_id: string;
  declare type: string;
  declare content: Record<string, unknown>;
  declare version: number;
  declare created_by: string;
}

ProjectSection.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.JSON, defaultValue: {} },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, tableName: 'project_sections', underscored: true, updatedAt: false });

// ========== ProjectVersion ==========
interface ProjectVersionAttributes {
  id: string;
  project_id: string;
  snapshot: Record<string, unknown>;
  summary: string | null;
  created_by: string;
  created_at?: Date;
}
type ProjectVersionCreation = Optional<ProjectVersionAttributes, 'id' | 'summary'>;

export class ProjectVersion
  extends Model<ProjectVersionAttributes, ProjectVersionCreation>
  implements ProjectVersionAttributes {
  declare id: string;
  declare project_id: string;
  declare snapshot: Record<string, unknown>;
  declare summary: string | null;
  declare created_by: string;
}

ProjectVersion.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  snapshot: { type: DataTypes.JSON, allowNull: false },
  summary: { type: DataTypes.TEXT, defaultValue: null },
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, tableName: 'project_versions', underscored: true, updatedAt: false });

// ========== Comment ==========
interface CommentAttributes {
  id: string;
  project_id: string;
  section_id: string | null;
  author_id: string;
  body: string;
  created_at?: Date;
}
type CommentCreation = Optional<CommentAttributes, 'id' | 'section_id'>;

export class Comment
  extends Model<CommentAttributes, CommentCreation>
  implements CommentAttributes {
  declare id: string;
  declare project_id: string;
  declare section_id: string | null;
  declare author_id: string;
  declare body: string;
}

Comment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  section_id: { type: DataTypes.UUID, defaultValue: null },
  author_id: { type: DataTypes.UUID, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { sequelize, tableName: 'comments', underscored: true, updatedAt: false });

// ========== ActivityLog ==========
interface ActivityLogAttributes {
  id: string;
  project_id: string | null;
  user_id: string;
  action: string;
  meta: Record<string, unknown>;
  created_at?: Date;
}
type ActivityLogCreation = Optional<ActivityLogAttributes, 'id' | 'project_id' | 'meta'>;

export class ActivityLog
  extends Model<ActivityLogAttributes, ActivityLogCreation>
  implements ActivityLogAttributes {
  declare id: string;
  declare project_id: string | null;
  declare user_id: string;
  declare action: string;
  declare meta: Record<string, unknown>;
}

ActivityLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, defaultValue: null },
  user_id: { type: DataTypes.UUID, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false },
  meta: { type: DataTypes.JSON, defaultValue: {} },
}, { sequelize, tableName: 'activity_logs', underscored: true, updatedAt: false });

// ========== SalesSimulationCategory ==========
interface SalesSimulationCategoryAttributes {
  id: string;
  project_id: string;
  category_name: string;
  category_order: number;
  created_at?: Date;
  updated_at?: Date;
}
type SalesSimulationCategoryCreation = Optional<
  SalesSimulationCategoryAttributes,
  'id' | 'category_order'
>;

export class SalesSimulationCategory
  extends Model<SalesSimulationCategoryAttributes, SalesSimulationCategoryCreation>
  implements SalesSimulationCategoryAttributes {
  declare id: string;
  declare project_id: string;
  declare category_name: string;
  declare category_order: number;
}

SalesSimulationCategory.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  category_name: { type: DataTypes.STRING, allowNull: false },
  category_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, tableName: 'sales_simulation_categories', underscored: true });

// ========== SalesSimulationItem ==========
interface SalesSimulationItemAttributes {
  id: string;
  category_id: string;
  project_id: string;
  item_name: string;
  item_order: number;
  unit_price: number;
  quantity: number;
  operating_days: number;
  cost_rate: number;
  description: string | null;
  calculation_type: 'daily' | 'monthly';
  monthly_quantity: number;
  created_at?: Date;
  updated_at?: Date;
}
type SalesSimulationItemCreation = Optional<
  SalesSimulationItemAttributes,
  | 'id'
  | 'item_order'
  | 'unit_price'
  | 'quantity'
  | 'operating_days'
  | 'cost_rate'
  | 'description'
  | 'calculation_type'
  | 'monthly_quantity'
>;

export class SalesSimulationItem
  extends Model<SalesSimulationItemAttributes, SalesSimulationItemCreation>
  implements SalesSimulationItemAttributes {
  declare id: string;
  declare category_id: string;
  declare project_id: string;
  declare item_name: string;
  declare item_order: number;
  declare unit_price: number;
  declare quantity: number;
  declare operating_days: number;
  declare cost_rate: number;
  declare description: string | null;
  declare calculation_type: 'daily' | 'monthly';
  declare monthly_quantity: number;
}

SalesSimulationItem.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  category_id: { type: DataTypes.UUID, allowNull: false },
  project_id: { type: DataTypes.UUID, allowNull: false },
  item_name: { type: DataTypes.STRING, allowNull: false },
  item_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  unit_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  quantity: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  operating_days: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cost_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  description: { type: DataTypes.TEXT, defaultValue: null },
  calculation_type: { type: DataTypes.STRING(10), defaultValue: 'daily' },
  monthly_quantity: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, { sequelize, tableName: 'sales_simulation_items', underscored: true });

// ========== SalesSimulationSnapshot ==========
interface ItemSnapshotData {
  itemId: string;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  itemName: string;
  itemOrder: number;
  unitPrice: number;
  quantity: number;
  operatingDays: number;
  costRate: number;
  description: string | null | undefined;
  calculationType: 'daily' | 'monthly';
  monthlyQuantity: number;
}

interface SalesSimulationSnapshotAttributes {
  id: string;
  project_id: string;
  year_month: string;
  items_snapshot: ItemSnapshotData[];
  created_at?: Date;
  updated_at?: Date;
}
type SalesSimulationSnapshotCreation = Optional<
  SalesSimulationSnapshotAttributes,
  'id' | 'items_snapshot'
>;

export class SalesSimulationSnapshot
  extends Model<SalesSimulationSnapshotAttributes, SalesSimulationSnapshotCreation>
  implements SalesSimulationSnapshotAttributes {
  declare id: string;
  declare project_id: string;
  declare year_month: string;
  declare items_snapshot: ItemSnapshotData[];
}

SalesSimulationSnapshot.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
  items_snapshot: { type: DataTypes.JSON, defaultValue: [] },
}, {
  sequelize,
  tableName: 'sales_simulation_snapshots',
  underscored: true,
  indexes: [{ unique: true, fields: ['project_id', 'year_month'] }],
});

// ========== FixedExpense ==========
interface FixedExpenseAttributes {
  id: string;
  project_id: string;
  year_month: string;
  category_name: string;
  amount: number;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}
type FixedExpenseCreation = Optional<
  FixedExpenseAttributes,
  'id' | 'amount' | 'description'
>;

export class FixedExpense
  extends Model<FixedExpenseAttributes, FixedExpenseCreation>
  implements FixedExpenseAttributes {
  declare id: string;
  declare project_id: string;
  declare year_month: string;
  declare category_name: string;
  declare amount: number;
  declare description: string | null;
}

FixedExpense.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
  category_name: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  description: { type: DataTypes.TEXT, defaultValue: null },
}, { sequelize, tableName: 'fixed_expenses', underscored: true });

// ========== VariableExpense ==========
interface VariableExpenseAttributes {
  id: string;
  project_id: string;
  year_month: string;
  category_name: string;
  amount: number;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}
type VariableExpenseCreation = Optional<
  VariableExpenseAttributes,
  'id' | 'amount' | 'description'
>;

export class VariableExpense
  extends Model<VariableExpenseAttributes, VariableExpenseCreation>
  implements VariableExpenseAttributes {
  declare id: string;
  declare project_id: string;
  declare year_month: string;
  declare category_name: string;
  declare amount: number;
  declare description: string | null;
}

VariableExpense.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
  category_name: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  description: { type: DataTypes.TEXT, defaultValue: null },
}, { sequelize, tableName: 'variable_expenses', underscored: true });

// ========== FixedExpenseMonth ==========
// 固定費が明示的に保存された年月を追跡するテーブル。
// このレコードが存在する年月は前月からの継承を行わない。
interface FixedExpenseMonthAttributes {
  id: string;
  project_id: string;
  year_month: string;
  created_at?: Date;
}
type FixedExpenseMonthCreation = Optional<FixedExpenseMonthAttributes, 'id'>;

export class FixedExpenseMonth
  extends Model<FixedExpenseMonthAttributes, FixedExpenseMonthCreation>
  implements FixedExpenseMonthAttributes {
  declare id: string;
  declare project_id: string;
  declare year_month: string;
}

FixedExpenseMonth.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
}, {
  sequelize,
  tableName: 'fixed_expense_months',
  underscored: true,
  updatedAt: false,
  indexes: [{ unique: true, fields: ['project_id', 'year_month'] }],
});

// ========== Loan ==========
interface LoanAttributes {
  id: string;
  project_id: string;
  lender_name: string;
  principal_amount: number;
  interest_rate: number;
  loan_date: string;
  repayment_start_date: string | null;
  deferred_interest_policy: 'charge' | 'waive';
  repayment_months: number;
  repayment_method: 'equal_payment' | 'equal_principal' | 'bullet';
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}
type LoanCreation = Optional<
  LoanAttributes,
  'id' | 'repayment_start_date' | 'deferred_interest_policy' | 'description'
>;

export class Loan
  extends Model<LoanAttributes, LoanCreation>
  implements LoanAttributes {
  declare id: string;
  declare project_id: string;
  declare lender_name: string;
  declare principal_amount: number;
  declare interest_rate: number;
  declare loan_date: string;
  declare repayment_start_date: string | null;
  declare deferred_interest_policy: 'charge' | 'waive';
  declare repayment_months: number;
  declare repayment_method: 'equal_payment' | 'equal_principal' | 'bullet';
  declare description: string | null;
  declare created_at?: Date;
  declare updated_at?: Date;
}

Loan.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  lender_name: { type: DataTypes.STRING, allowNull: false },
  principal_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  loan_date: { type: DataTypes.STRING(10), allowNull: false },
  repayment_start_date: { type: DataTypes.STRING(10), defaultValue: null },
  deferred_interest_policy: {
    type: DataTypes.ENUM('charge', 'waive'),
    allowNull: false,
    defaultValue: 'charge',
  },
  repayment_months: { type: DataTypes.INTEGER, allowNull: false },
  repayment_method: {
    type: DataTypes.ENUM('equal_payment', 'equal_principal', 'bullet'),
    allowNull: false,
  },
  description: { type: DataTypes.TEXT, defaultValue: null },
}, {
  sequelize,
  tableName: 'loans',
  underscored: true,
  indexes: [{ fields: ['project_id'] }],
});

// ========== LoanRepayment ==========
interface LoanRepaymentAttributes {
  id: string;
  loan_id: string;
  project_id: string;
  year_month: string;
  principal_payment: number;
  interest_payment: number;
  remaining_balance: number;
  created_at?: Date;
  updated_at?: Date;
}
type LoanRepaymentCreation = Optional<LoanRepaymentAttributes, 'id'>;

export class LoanRepayment
  extends Model<LoanRepaymentAttributes, LoanRepaymentCreation>
  implements LoanRepaymentAttributes {
  declare id: string;
  declare loan_id: string;
  declare project_id: string;
  declare year_month: string;
  declare principal_payment: number;
  declare interest_payment: number;
  declare remaining_balance: number;
}

LoanRepayment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  loan_id: { type: DataTypes.UUID, allowNull: false },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
  principal_payment: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  interest_payment: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  remaining_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
}, {
  sequelize,
  tableName: 'loan_repayments',
  underscored: true,
  indexes: [{ unique: true, fields: ['loan_id', 'year_month'] }],
});

// ========== LaborCost ==========
// 人件費レコードの種別
export type LaborCostType = 'owner_salary' | 'full_time' | 'part_time';

interface LaborCostAttributes {
  id: string;
  project_id: string;
  year_month: string;
  type: LaborCostType;
  monthly_salary: number | null;
  employee_count: number | null;
  bonus_months: number | null;
  hourly_wage: number | null;
  hours_per_day: number | null;
  days_per_month: number | null;
  part_time_count: number | null;
  owner_salary: number | null;
  display_order: number;
  note_ja: string | null;
  note_en: string | null;
  created_at?: Date;
  updated_at?: Date;
}
type LaborCostCreation = Optional<
  LaborCostAttributes,
  | 'id'
  | 'monthly_salary'
  | 'employee_count'
  | 'bonus_months'
  | 'hourly_wage'
  | 'hours_per_day'
  | 'days_per_month'
  | 'part_time_count'
  | 'owner_salary'
  | 'display_order'
  | 'note_ja'
  | 'note_en'
>;

export class LaborCost
  extends Model<LaborCostAttributes, LaborCostCreation>
  implements LaborCostAttributes {
  declare id: string;
  declare project_id: string;
  declare year_month: string;
  declare type: LaborCostType;
  declare monthly_salary: number | null;
  declare employee_count: number | null;
  declare bonus_months: number | null;
  declare hourly_wage: number | null;
  declare hours_per_day: number | null;
  declare days_per_month: number | null;
  declare part_time_count: number | null;
  declare owner_salary: number | null;
  declare display_order: number;
  declare note_ja: string | null;
  declare note_en: string | null;
}

LaborCost.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
  type: {
    type: DataTypes.ENUM('owner_salary', 'full_time', 'part_time'),
    allowNull: false,
  },
  monthly_salary: { type: DataTypes.DECIMAL(15, 2), defaultValue: null },
  employee_count: { type: DataTypes.INTEGER, defaultValue: null },
  bonus_months: { type: DataTypes.DECIMAL(4, 2), defaultValue: null },
  hourly_wage: { type: DataTypes.DECIMAL(10, 2), defaultValue: null },
  hours_per_day: { type: DataTypes.DECIMAL(5, 2), defaultValue: null },
  days_per_month: { type: DataTypes.INTEGER, defaultValue: null },
  part_time_count: { type: DataTypes.DECIMAL(5, 2), defaultValue: null },
  owner_salary: { type: DataTypes.DECIMAL(15, 2), defaultValue: null },
  display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  note_ja: { type: DataTypes.TEXT, defaultValue: null },
  note_en: { type: DataTypes.TEXT, defaultValue: null },
}, {
  sequelize,
  tableName: 'labor_costs',
  underscored: true,
  indexes: [{ fields: ['project_id', 'year_month'] }],
});

// ========== LaborCostMonth ==========
// 人件費が明示的に保存された年月を追跡するテーブル。
// このレコードが存在する年月は前月からの継承を行わない。
interface LaborCostMonthAttributes {
  id: string;
  project_id: string;
  year_month: string;
  created_at?: Date;
}
type LaborCostMonthCreation = Optional<LaborCostMonthAttributes, 'id'>;

export class LaborCostMonth
  extends Model<LaborCostMonthAttributes, LaborCostMonthCreation>
  implements LaborCostMonthAttributes {
  declare id: string;
  declare project_id: string;
  declare year_month: string;
}

LaborCostMonth.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
}, {
  sequelize,
  tableName: 'labor_cost_months',
  underscored: true,
  updatedAt: false,
  indexes: [{ unique: true, fields: ['project_id', 'year_month'] }],
});

// Associations
Project.hasMany(ProjectSection, { foreignKey: 'project_id', as: 'sections' });
ProjectSection.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(Permission, { foreignKey: 'project_id', as: 'permissions' });
Permission.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(Comment, { foreignKey: 'project_id', as: 'comments' });
Comment.belongsTo(Project, { foreignKey: 'project_id' });

User.hasMany(Permission, { foreignKey: 'user_id', as: 'permissions' });
Permission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Project.hasMany(SalesSimulationCategory, { foreignKey: 'project_id', as: 'salesCategories' });
SalesSimulationCategory.belongsTo(Project, { foreignKey: 'project_id' });

SalesSimulationCategory.hasMany(SalesSimulationItem, { foreignKey: 'category_id', as: 'items' });
SalesSimulationItem.belongsTo(SalesSimulationCategory, { foreignKey: 'category_id' });

Project.hasMany(SalesSimulationSnapshot, { foreignKey: 'project_id', as: 'salesSnapshots' });
SalesSimulationSnapshot.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(FixedExpense, { foreignKey: 'project_id', as: 'fixedExpenses' });
FixedExpense.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(VariableExpense, { foreignKey: 'project_id', as: 'variableExpenses' });
VariableExpense.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(Loan, { foreignKey: 'project_id', as: 'loans' });
Loan.belongsTo(Project, { foreignKey: 'project_id' });

Loan.hasMany(LoanRepayment, { foreignKey: 'loan_id', as: 'repayments' });
LoanRepayment.belongsTo(Loan, { foreignKey: 'loan_id' });

Project.hasMany(LoanRepayment, { foreignKey: 'project_id', as: 'loanRepayments' });
LoanRepayment.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(LaborCost, { foreignKey: 'project_id', as: 'laborCosts' });
LaborCost.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(LaborCostMonth, { foreignKey: 'project_id', as: 'laborCostMonths' });
LaborCostMonth.belongsTo(Project, { foreignKey: 'project_id' });

// ========== FixedAsset ==========
interface FixedAssetAttributes {
  id: string;
  project_id: string;
  asset_name: string;
  asset_category: 'building' | 'equipment' | 'vehicle' | 'intangible' | 'other';
  purchase_date: string;
  purchase_amount: number;
  useful_life: number;
  salvage_value: number;
  depreciation_method: 'straight_line' | 'diminishing';
  start_depreciation_date: string;
  end_depreciation_date: string;
  monthly_depreciation: number;
  notes: string | null;
  created_at?: Date;
  updated_at?: Date;
}
type FixedAssetCreation = Optional<
  FixedAssetAttributes,
  'id' | 'salvage_value' | 'notes'
>;

export class FixedAsset
  extends Model<FixedAssetAttributes, FixedAssetCreation>
  implements FixedAssetAttributes {
  declare id: string;
  declare project_id: string;
  declare asset_name: string;
  declare asset_category: 'building' | 'equipment' | 'vehicle' | 'intangible' | 'other';
  declare purchase_date: string;
  declare purchase_amount: number;
  declare useful_life: number;
  declare salvage_value: number;
  declare depreciation_method: 'straight_line' | 'diminishing';
  declare start_depreciation_date: string;
  declare end_depreciation_date: string;
  declare monthly_depreciation: number;
  declare notes: string | null;
}

FixedAsset.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  asset_name: { type: DataTypes.STRING, allowNull: false },
  asset_category: {
    type: DataTypes.ENUM('building', 'equipment', 'vehicle', 'intangible', 'other'),
    allowNull: false,
  },
  purchase_date: { type: DataTypes.STRING(10), allowNull: false },
  purchase_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  useful_life: { type: DataTypes.INTEGER, allowNull: false },
  salvage_value: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  depreciation_method: {
    type: DataTypes.ENUM('straight_line', 'diminishing'),
    allowNull: false,
  },
  start_depreciation_date: { type: DataTypes.STRING(10), allowNull: false },
  end_depreciation_date: { type: DataTypes.STRING(10), allowNull: false },
  monthly_depreciation: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  notes: { type: DataTypes.TEXT, defaultValue: null },
}, {
  sequelize,
  tableName: 'fixed_assets',
  underscored: true,
  indexes: [{ fields: ['project_id'] }],
});

// ========== FixedAssetDepreciationSchedule ==========
interface FixedAssetDepreciationScheduleAttributes {
  id: string;
  fixed_asset_id: string;
  year_month: string;
  monthly_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
  created_at?: Date;
  updated_at?: Date;
}
type FixedAssetDepreciationScheduleCreation = Optional<
  FixedAssetDepreciationScheduleAttributes,
  'id'
>;

export class FixedAssetDepreciationSchedule
  extends Model<
    FixedAssetDepreciationScheduleAttributes,
    FixedAssetDepreciationScheduleCreation
  >
  implements FixedAssetDepreciationScheduleAttributes {
  declare id: string;
  declare fixed_asset_id: string;
  declare year_month: string;
  declare monthly_depreciation: number;
  declare accumulated_depreciation: number;
  declare book_value: number;
}

FixedAssetDepreciationSchedule.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fixed_asset_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
  monthly_depreciation: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  accumulated_depreciation: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  book_value: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
}, {
  sequelize,
  tableName: 'fixed_asset_depreciation_schedules',
  underscored: true,
  indexes: [
    { unique: true, fields: ['fixed_asset_id', 'year_month'] },
    { fields: ['fixed_asset_id'] },
  ],
});

// ========== CashFlowMonthly ==========
interface CashFlowMonthlyAttributes {
  id: string;
  project_id: string;
  year_month: string;
  // 営業活動CF（手動入力項目のみ）
  accounts_receivable_change: number;
  inventory_change: number;
  accounts_payable_change: number;
  other_operating: number;
  // 投資活動CF（手動入力）
  capex_acquisition: number;
  asset_sale: number;
  intangible_acquisition: number;
  other_investing: number;
  // 財務活動CF（手動入力）
  capital_increase: number;
  dividend_payment: number;
  other_financing: number;
  // メタ
  is_inherited: boolean;
  note_ja: string | null;
  note_en: string | null;
  created_at?: Date;
  updated_at?: Date;
}
type CashFlowMonthlyCreation = Optional<
  CashFlowMonthlyAttributes,
  | 'id'
  | 'accounts_receivable_change'
  | 'inventory_change'
  | 'accounts_payable_change'
  | 'other_operating'
  | 'capex_acquisition'
  | 'asset_sale'
  | 'intangible_acquisition'
  | 'other_investing'
  | 'capital_increase'
  | 'dividend_payment'
  | 'other_financing'
  | 'is_inherited'
  | 'note_ja'
  | 'note_en'
>;

export class CashFlowMonthly
  extends Model<CashFlowMonthlyAttributes, CashFlowMonthlyCreation>
  implements CashFlowMonthlyAttributes {
  declare id: string;
  declare project_id: string;
  declare year_month: string;
  declare accounts_receivable_change: number;
  declare inventory_change: number;
  declare accounts_payable_change: number;
  declare other_operating: number;
  declare capex_acquisition: number;
  declare asset_sale: number;
  declare intangible_acquisition: number;
  declare other_investing: number;
  declare capital_increase: number;
  declare dividend_payment: number;
  declare other_financing: number;
  declare is_inherited: boolean;
  declare note_ja: string | null;
  declare note_en: string | null;
}

CashFlowMonthly.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
  accounts_receivable_change: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  inventory_change: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  accounts_payable_change: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  other_operating: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  capex_acquisition: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  asset_sale: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  intangible_acquisition: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  other_investing: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  capital_increase: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  dividend_payment: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  other_financing: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  is_inherited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  note_ja: { type: DataTypes.TEXT, defaultValue: null },
  note_en: { type: DataTypes.TEXT, defaultValue: null },
}, {
  sequelize,
  tableName: 'cash_flow_monthly',
  underscored: true,
  indexes: [{ unique: true, fields: ['project_id', 'year_month'] }],
});

Project.hasMany(CashFlowMonthly, { foreignKey: 'project_id', as: 'cashFlows' });
CashFlowMonthly.belongsTo(Project, { foreignKey: 'project_id' });

// ========== StartupCost ==========
export type CostType = 'capex' | 'intangible' | 'expense' | 'initial_inventory';

interface StartupCostAttributes {
  id: string;
  project_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  cost_type: CostType;
  allocation_month: string;
  display_order: number;
  created_at?: Date;
  updated_at?: Date;
}
type StartupCostCreation = Optional<
  StartupCostAttributes,
  'id' | 'display_order'
>;

export class StartupCost
  extends Model<StartupCostAttributes, StartupCostCreation>
  implements StartupCostAttributes {
  declare id: string;
  declare project_id: string;
  declare description: string;
  declare quantity: number;
  declare unit_price: number;
  declare cost_type: CostType;
  declare allocation_month: string;
  declare display_order: number;
}

StartupCost.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  cost_type: {
    type: DataTypes.ENUM('capex', 'intangible', 'expense', 'initial_inventory'),
    allowNull: false,
  },
  allocation_month: { type: DataTypes.STRING(7), allowNull: false },
  display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  sequelize,
  tableName: 'startup_costs',
  underscored: true,
  indexes: [{ fields: ['project_id', 'allocation_month'] }],
});

Project.hasMany(StartupCost, { foreignKey: 'project_id', as: 'startupCosts' });
StartupCost.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(FixedAsset, { foreignKey: 'project_id', as: 'fixedAssets' });
FixedAsset.belongsTo(Project, { foreignKey: 'project_id' });

FixedAsset.hasMany(FixedAssetDepreciationSchedule, {
  foreignKey: 'fixed_asset_id',
  as: 'depreciationSchedules',
});
FixedAssetDepreciationSchedule.belongsTo(FixedAsset, { foreignKey: 'fixed_asset_id' });

// ========== PasswordResetToken ==========
interface PasswordResetTokenAttributes {
  id: string;
  user_id: string;
  token: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}
type PasswordResetTokenCreation = Optional<PasswordResetTokenAttributes, 'id' | 'used_at'>;

export class PasswordResetToken
  extends Model<PasswordResetTokenAttributes, PasswordResetTokenCreation>
  implements PasswordResetTokenAttributes {
  declare id: string;
  declare user_id: string;
  declare token: string;
  declare created_at: Date;
  declare expires_at: Date;
  declare used_at: Date | null;
}

PasswordResetToken.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  used_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, {
  sequelize,
  tableName: 'password_reset_tokens',
  underscored: true,
  timestamps: false,
  indexes: [{ fields: ['user_id'] }],
});

User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'passwordResetTokens' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id' });

export default sequelize;
