import { QueryInterface, DataTypes } from 'sequelize';

/**
 * projectsテーブルに法人税計算用フィールドを追加するマイグレーション。
 *
 * 追加フィールド:
 *   - tax_calculation_enabled: 法人税自動計算のon/off（既存データはfalse）
 *   - fiscal_end_month: 決算月（1-12）
 *   - tax_rates: 税率設定JSON
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('projects', 'tax_calculation_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await queryInterface.addColumn('projects', 'fiscal_end_month', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  });

  await queryInterface.addColumn('projects', 'tax_rates', {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('projects', 'tax_calculation_enabled');
  await queryInterface.removeColumn('projects', 'fiscal_end_month');
  await queryInterface.removeColumn('projects', 'tax_rates');
}
