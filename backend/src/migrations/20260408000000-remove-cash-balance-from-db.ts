import { QueryInterface, DataTypes } from 'sequelize';

/**
 * キャッシュフロー残高計算方式変更マイグレーション。
 *
 * cash_flow_monthly テーブルから cash_beginning と cash_ending を削除し、
 * projects テーブルに initial_cash_balance を追加する。
 * これにより、残高は常に 2025年1月からの累積計算で算出される。
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // cash_flow_monthly テーブルから cash_beginning と cash_ending を削除
  await queryInterface.removeColumn('cash_flow_monthly', 'cash_beginning');
  await queryInterface.removeColumn('cash_flow_monthly', 'cash_ending');

  // projects テーブルに initial_cash_balance を追加
  await queryInterface.addColumn('projects', 'initial_cash_balance', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '事業開始時（2025年1月）の初期現金残高',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // projects テーブルから initial_cash_balance を削除
  await queryInterface.removeColumn('projects', 'initial_cash_balance');

  // cash_flow_monthly テーブルに cash_beginning と cash_ending を再追加
  await queryInterface.addColumn('cash_flow_monthly', 'cash_beginning', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });

  await queryInterface.addColumn('cash_flow_monthly', 'cash_ending', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
}
