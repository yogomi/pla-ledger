import { QueryInterface, DataTypes } from 'sequelize';

/**
 * 固定資産マスター機能追加マイグレーション。
 *
 * fixed_assets および fixed_asset_depreciation_schedules テーブルを追加する。
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface): Promise<void> {
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
  await queryInterface.dropTable('fixed_asset_depreciation_schedules');
  await queryInterface.dropTable('fixed_assets');

  // PostgreSQL の ENUM 型をクリーンアップする（SQLite では不要）
  try {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_fixed_assets_asset_category";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_fixed_assets_depreciation_method";',
    );
  } catch {
    // SQLite では ENUM 型が存在しないため無視する
  }
}
