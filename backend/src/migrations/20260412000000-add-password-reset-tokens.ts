import { QueryInterface, DataTypes } from 'sequelize';

/**
 * password_reset_tokens テーブルの追加マイグレーション。
 *
 * up: password_reset_tokens テーブルを作成し、token および user_id にインデックスを追加する。
 * down: password_reset_tokens テーブルを削除する。
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // ========== password_reset_tokens ==========
  await queryInterface.createTable('password_reset_tokens', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  });

  await queryInterface.addIndex('password_reset_tokens', ['user_id']);
}

/** @type {import('sequelize-cli').Migration} */
export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('password_reset_tokens');
}
