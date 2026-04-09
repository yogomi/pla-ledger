import { QueryInterface, DataTypes } from 'sequelize';

/**
 * 自動計算カラムをDBから削除するマイグレーション。
 * 元データが変更された際の乖離を防ぐため、GETの都度再計算する方式に変更する。
 *
 * 削除対象:
 *   - cash_flow_monthly: profit_before_tax, depreciation, interest_expense,
 *                        operating_cf_subtotal, investing_cf_subtotal, financing_cf_subtotal,
 *                        net_cash_change, borrowing_proceeds, loan_repayment
 *   - labor_costs: monthly_total
 *   - sales_simulation_snapshots: monthly_total, monthly_cost
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // cash_flow_monthly の自動計算カラムを削除する
  await queryInterface.removeColumn('cash_flow_monthly', 'profit_before_tax');
  await queryInterface.removeColumn('cash_flow_monthly', 'depreciation');
  await queryInterface.removeColumn('cash_flow_monthly', 'interest_expense');
  await queryInterface.removeColumn('cash_flow_monthly', 'operating_cf_subtotal');
  await queryInterface.removeColumn('cash_flow_monthly', 'investing_cf_subtotal');
  await queryInterface.removeColumn('cash_flow_monthly', 'financing_cf_subtotal');
  await queryInterface.removeColumn('cash_flow_monthly', 'net_cash_change');
  await queryInterface.removeColumn('cash_flow_monthly', 'borrowing_proceeds');
  await queryInterface.removeColumn('cash_flow_monthly', 'loan_repayment');

  // labor_costs の自動計算カラムを削除する
  await queryInterface.removeColumn('labor_costs', 'monthly_total');

  // sales_simulation_snapshots の自動計算カラムを削除する
  await queryInterface.removeColumn('sales_simulation_snapshots', 'monthly_total');
  await queryInterface.removeColumn('sales_simulation_snapshots', 'monthly_cost');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // cash_flow_monthly を復元する
  await queryInterface.addColumn('cash_flow_monthly', 'profit_before_tax', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addColumn('cash_flow_monthly', 'depreciation', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addColumn('cash_flow_monthly', 'interest_expense', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addColumn('cash_flow_monthly', 'operating_cf_subtotal', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addColumn('cash_flow_monthly', 'investing_cf_subtotal', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addColumn('cash_flow_monthly', 'financing_cf_subtotal', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addColumn('cash_flow_monthly', 'net_cash_change', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addColumn('cash_flow_monthly', 'borrowing_proceeds', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.addColumn('cash_flow_monthly', 'loan_repayment', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });

  // labor_costs を復元する
  await queryInterface.addColumn('labor_costs', 'monthly_total', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });

  // sales_simulation_snapshots を復元する
  await queryInterface.addColumn('sales_simulation_snapshots', 'monthly_total', {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  });
  await queryInterface.addColumn('sales_simulation_snapshots', 'monthly_cost', {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  });
}
