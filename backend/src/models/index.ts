import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'pla-ledger.sqlite');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
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
  created_at?: Date;
  updated_at?: Date;
}
type ProjectCreation = Optional<
  ProjectAttributes,
  'id' | 'summary' | 'stage' | 'tags' | 'published_at'
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
}

Project.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  owner_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.TEXT, allowNull: false },
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
}, { sequelize, tableName: 'permissions', underscored: true });

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
}, { sequelize, tableName: 'access_requests', underscored: true });

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

// ========== Attachment ==========
interface AttachmentAttributes {
  id: string;
  project_id: string;
  filename: string;
  mime_type: string;
  url: string;
  uploaded_by: string;
  size: number;
  created_at?: Date;
}
type AttachmentCreation = Optional<AttachmentAttributes, 'id'>;

export class Attachment
  extends Model<AttachmentAttributes, AttachmentCreation>
  implements AttachmentAttributes {
  declare id: string;
  declare project_id: string;
  declare filename: string;
  declare mime_type: string;
  declare url: string;
  declare uploaded_by: string;
  declare size: number;
}

Attachment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  filename: { type: DataTypes.STRING, allowNull: false },
  mime_type: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  uploaded_by: { type: DataTypes.UUID, allowNull: false },
  size: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, tableName: 'attachments', underscored: true, updatedAt: false });

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
  created_at?: Date;
  updated_at?: Date;
}
type SalesSimulationItemCreation = Optional<
  SalesSimulationItemAttributes,
  'id' | 'item_order' | 'unit_price' | 'quantity' | 'operating_days' | 'cost_rate' | 'description'
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
}

interface SalesSimulationSnapshotAttributes {
  id: string;
  project_id: string;
  year_month: string;
  items_snapshot: ItemSnapshotData[];
  monthly_total: number;
  monthly_cost: number;
  created_at?: Date;
  updated_at?: Date;
}
type SalesSimulationSnapshotCreation = Optional<
  SalesSimulationSnapshotAttributes,
  'id' | 'items_snapshot' | 'monthly_total' | 'monthly_cost'
>;

export class SalesSimulationSnapshot
  extends Model<SalesSimulationSnapshotAttributes, SalesSimulationSnapshotCreation>
  implements SalesSimulationSnapshotAttributes {
  declare id: string;
  declare project_id: string;
  declare year_month: string;
  declare items_snapshot: ItemSnapshotData[];
  declare monthly_total: number;
  declare monthly_cost: number;
}

SalesSimulationSnapshot.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  year_month: { type: DataTypes.STRING(7), allowNull: false },
  items_snapshot: { type: DataTypes.JSON, defaultValue: [] },
  monthly_total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  monthly_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
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

// Associations
Project.hasMany(ProjectSection, { foreignKey: 'project_id', as: 'sections' });
ProjectSection.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(Permission, { foreignKey: 'project_id', as: 'permissions' });
Permission.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(Attachment, { foreignKey: 'project_id', as: 'attachments' });
Attachment.belongsTo(Project, { foreignKey: 'project_id' });

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

export default sequelize;
