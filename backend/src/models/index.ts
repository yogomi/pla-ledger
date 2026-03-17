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
  title: Record<string, string>;
  summary: Record<string, string> | null;
  visibility: 'public' | 'private' | 'unlisted';
  currency: string;
  stage: string | null;
  tags: string[];
  published_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}
type ProjectCreation = Optional<ProjectAttributes, 'id' | 'summary' | 'stage' | 'tags' | 'published_at'>;

export class Project extends Model<ProjectAttributes, ProjectCreation> implements ProjectAttributes {
  declare id: string;
  declare owner_id: string;
  declare title: Record<string, string>;
  declare summary: Record<string, string> | null;
  declare visibility: 'public' | 'private' | 'unlisted';
  declare currency: string;
  declare stage: string | null;
  declare tags: string[];
  declare published_at: Date | null;
}

Project.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  owner_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.JSON, allowNull: false },
  summary: { type: DataTypes.JSON, defaultValue: null },
  visibility: { type: DataTypes.ENUM('public', 'private', 'unlisted'), allowNull: false, defaultValue: 'private' },
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

export class Permission extends Model<PermissionAttributes, PermissionCreation> implements PermissionAttributes {
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
type AccessRequestCreation = Optional<AccessRequestAttributes, 'id' | 'message' | 'processed_by' | 'processed_at'>;

export class AccessRequest extends Model<AccessRequestAttributes, AccessRequestCreation> implements AccessRequestAttributes {
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

export class ProjectSection extends Model<ProjectSectionAttributes, ProjectSectionCreation> implements ProjectSectionAttributes {
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
  summary: Record<string, string> | null;
  created_by: string;
  created_at?: Date;
}
type ProjectVersionCreation = Optional<ProjectVersionAttributes, 'id' | 'summary'>;

export class ProjectVersion extends Model<ProjectVersionAttributes, ProjectVersionCreation> implements ProjectVersionAttributes {
  declare id: string;
  declare project_id: string;
  declare snapshot: Record<string, unknown>;
  declare summary: Record<string, string> | null;
  declare created_by: string;
}

ProjectVersion.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id: { type: DataTypes.UUID, allowNull: false },
  snapshot: { type: DataTypes.JSON, allowNull: false },
  summary: { type: DataTypes.JSON, defaultValue: null },
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

export class Attachment extends Model<AttachmentAttributes, AttachmentCreation> implements AttachmentAttributes {
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

export class Comment extends Model<CommentAttributes, CommentCreation> implements CommentAttributes {
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

export class ActivityLog extends Model<ActivityLogAttributes, ActivityLogCreation> implements ActivityLogAttributes {
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

export default sequelize;
