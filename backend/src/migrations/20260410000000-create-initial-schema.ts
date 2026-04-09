import { QueryInterface, DataTypes } from 'sequelize';

/**
 * 統合初期スキーママイグレーション。
 *
 * アプリケーションで使用するすべてのテーブルを最終状態で作成する。
 * up: テーブルを作成順（親→子）に作成する。
 * down: テーブルを逆順に削除し、PostgreSQL の ENUM 型もクリーンアップする。
 *
 * 注意: project_id と year_month を持つテーブルでは、
 * 各カラムに個別の unique: true を付けず、複合ユニークインデックスのみを addIndex で設定する。
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // ========== users ==========
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    locale: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // ========== projects ==========
  await queryInterface.createTable('projects', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    summary: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    visibility: {
      type: DataTypes.ENUM('public', 'private', 'unlisted'),
      allowNull: false,
      defaultValue: 'private',
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'JPY',
    },
    stage: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    published_at: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    social_insurance_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 15.0,
    },
    initial_cash_balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '事業開始時（2025年1月）の初期現金残高',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('projects', ['owner_id']);
  await queryInterface.addIndex('projects', ['visibility']);

  // ========== permissions ==========
  await queryInterface.createTable('permissions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM('owner', 'editor', 'viewer'),
      allowNull: false,
    },
    granted_by: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    granted_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('permissions', ['project_id', 'user_id']);

  // ========== access_requests ==========
  await queryInterface.createTable('access_requests', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    requester_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    request_type: {
      type: DataTypes.ENUM('view', 'edit'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    processed_by: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    processed_at: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('access_requests', ['project_id']);

  // ========== project_sections ==========
  await queryInterface.createTable('project_sections', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('project_sections', ['project_id']);

  // ========== project_versions ==========
  await queryInterface.createTable('project_versions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('project_versions', ['project_id']);

  // ========== comments ==========
  await queryInterface.createTable('comments', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    section_id: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    author_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('comments', ['project_id']);

  // ========== activity_logs ==========
  await queryInterface.createTable('activity_logs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    meta: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('activity_logs', ['user_id']);
  await queryInterface.addIndex('activity_logs', ['project_id']);

  // ========== sales_simulation_categories ==========
  await queryInterface.createTable('sales_simulation_categories', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('sales_simulation_categories', ['project_id']);

  // ========== sales_simulation_items ==========
  await queryInterface.createTable('sales_simulation_items', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'sales_simulation_categories', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    item_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    unit_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    quantity: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    operating_days: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    cost_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('sales_simulation_items', ['category_id']);
  await queryInterface.addIndex('sales_simulation_items', ['project_id']);

  // ========== sales_simulation_snapshots ==========
  // 注意: project_id と year_month には個別の unique を付けず、複合ユニークインデックスのみ設定する。
  await queryInterface.createTable('sales_simulation_snapshots', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    items_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    'sales_simulation_snapshots',
    ['project_id', 'year_month'],
    { unique: true },
  );

  // ========== fixed_expenses ==========
  await queryInterface.createTable('fixed_expenses', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('fixed_expenses', ['project_id', 'year_month']);

  // ========== fixed_expense_months ==========
  // 注意: project_id と year_month には個別の unique を付けず、複合ユニークインデックスのみ設定する。
  await queryInterface.createTable('fixed_expense_months', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    'fixed_expense_months',
    ['project_id', 'year_month'],
    { unique: true },
  );

  // ========== variable_expenses ==========
  await queryInterface.createTable('variable_expenses', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('variable_expenses', ['project_id', 'year_month']);

  // ========== loans ==========
  await queryInterface.createTable('loans', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    lender_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    principal_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    interest_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    loan_date: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    repayment_start_date: {
      type: DataTypes.STRING(10),
      defaultValue: null,
    },
    deferred_interest_policy: {
      type: DataTypes.ENUM('charge', 'waive'),
      allowNull: false,
      defaultValue: 'charge',
    },
    repayment_months: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    repayment_method: {
      type: DataTypes.ENUM('equal_payment', 'equal_principal', 'bullet'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('loans', ['project_id']);

  // ========== loan_repayments ==========
  await queryInterface.createTable('loan_repayments', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    loan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'loans', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    principal_payment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    interest_payment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    remaining_balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('loan_repayments', ['loan_id', 'year_month'], { unique: true });
  await queryInterface.addIndex('loan_repayments', ['project_id']);

  // ========== labor_costs ==========
  // 注意: monthly_total は自動計算のためDBに保存しない。
  await queryInterface.createTable('labor_costs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('owner_salary', 'full_time', 'part_time'),
      allowNull: false,
    },
    monthly_salary: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: null,
    },
    employee_count: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    bonus_months: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: null,
    },
    hourly_wage: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: null,
    },
    hours_per_day: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: null,
    },
    days_per_month: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    part_time_count: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: null,
    },
    owner_salary: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: null,
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    note_ja: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    note_en: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('labor_costs', ['project_id', 'year_month']);

  // ========== labor_cost_months ==========
  // 注意: project_id と year_month には個別の unique を付けず、複合ユニークインデックスのみ設定する。
  await queryInterface.createTable('labor_cost_months', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    'labor_cost_months',
    ['project_id', 'year_month'],
    { unique: true },
  );

  // ========== cash_flow_monthly ==========
  // 注意: 自動計算カラムは保存しない。project_id と year_month には個別の unique を付けず、
  // 複合ユニークインデックスのみ設定する。
  await queryInterface.createTable('cash_flow_monthly', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    accounts_receivable_change: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    inventory_change: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    accounts_payable_change: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    other_operating: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    capex_acquisition: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    asset_sale: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    intangible_acquisition: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    other_investing: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    capital_increase: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    dividend_payment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    other_financing: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    is_inherited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    note_ja: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    note_en: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    'cash_flow_monthly',
    ['project_id', 'year_month'],
    { unique: true },
  );

  // ========== fixed_assets ==========
  await queryInterface.createTable('fixed_assets', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    asset_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    asset_category: {
      type: DataTypes.ENUM('building', 'equipment', 'vehicle', 'intangible', 'other'),
      allowNull: false,
    },
    purchase_date: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    purchase_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    useful_life: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    salvage_value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    depreciation_method: {
      type: DataTypes.ENUM('straight_line', 'diminishing'),
      allowNull: false,
    },
    start_depreciation_date: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    end_depreciation_date: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    monthly_depreciation: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('fixed_assets', ['project_id']);

  // ========== fixed_asset_depreciation_schedules ==========
  // 注意: fixed_asset_id と year_month には個別の unique を付けず、複合ユニークインデックスのみ設定する。
  await queryInterface.createTable('fixed_asset_depreciation_schedules', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    fixed_asset_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'fixed_assets', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    year_month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    monthly_depreciation: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    accumulated_depreciation: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    book_value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex(
    'fixed_asset_depreciation_schedules',
    ['fixed_asset_id', 'year_month'],
    { unique: true },
  );
  await queryInterface.addIndex(
    'fixed_asset_depreciation_schedules',
    ['fixed_asset_id'],
  );
}

/** @type {import('sequelize-cli').Migration} */
export async function down(queryInterface: QueryInterface): Promise<void> {
  // テーブルを作成の逆順に削除する
  await queryInterface.dropTable('fixed_asset_depreciation_schedules');
  await queryInterface.dropTable('fixed_assets');
  await queryInterface.dropTable('cash_flow_monthly');
  await queryInterface.dropTable('labor_cost_months');
  await queryInterface.dropTable('labor_costs');
  await queryInterface.dropTable('loan_repayments');
  await queryInterface.dropTable('loans');
  await queryInterface.dropTable('variable_expenses');
  await queryInterface.dropTable('fixed_expense_months');
  await queryInterface.dropTable('fixed_expenses');
  await queryInterface.dropTable('sales_simulation_snapshots');
  await queryInterface.dropTable('sales_simulation_items');
  await queryInterface.dropTable('sales_simulation_categories');
  await queryInterface.dropTable('activity_logs');
  await queryInterface.dropTable('comments');
  await queryInterface.dropTable('project_versions');
  await queryInterface.dropTable('project_sections');
  await queryInterface.dropTable('access_requests');
  await queryInterface.dropTable('permissions');
  await queryInterface.dropTable('projects');
  await queryInterface.dropTable('users');

  // PostgreSQL の ENUM 型をクリーンアップする（SQLite では不要）
  const dialect = queryInterface.sequelize.getDialect();
  if (dialect === 'postgres') {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_projects_visibility";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_permissions_role";');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_access_requests_request_type";',
    );
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_access_requests_status";');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_loans_deferred_interest_policy";',
    );
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_loans_repayment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_labor_costs_type";');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_fixed_assets_asset_category";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_fixed_assets_depreciation_method";',
    );
  }
}
