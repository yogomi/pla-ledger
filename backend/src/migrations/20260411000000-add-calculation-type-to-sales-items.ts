import { QueryInterface, DataTypes } from 'sequelize';

/**
 * 売上シミュレーション商品アイテムに計算方式フィールドを追加するマイグレーション。
 *
 * up:
 *   - sales_simulation_items に calculation_type カラムを追加（デフォルト: 'daily'）
 *   - sales_simulation_items に monthly_quantity カラムを追加（デフォルト: 0）
 * down:
 *   - 追加したカラムを削除する
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('sales_simulation_items', 'calculation_type', {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'daily',
  });

  await queryInterface.addColumn('sales_simulation_items', 'monthly_quantity', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('sales_simulation_items', 'monthly_quantity');
  await queryInterface.removeColumn('sales_simulation_items', 'calculation_type');
}
