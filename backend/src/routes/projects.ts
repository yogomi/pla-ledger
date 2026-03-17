import { Router, Response } from 'express';
import { Op } from 'sequelize';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  Project, Permission, ProjectSection, ProjectVersion,
  Attachment, Comment, AccessRequest, ActivityLog, User
} from '../models';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import {
  ProjectCreateSchema, ProjectUpdateSchema, GrantPermissionSchema,
  RequestAccessSchema, ProcessAccessRequestSchema, PublicProjectsQuerySchema,
} from '../schemas';

const router = Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024;
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

async function getProjectRole(projectId: string, userId: string | undefined): Promise<string | null> {
  if (!userId) return null;
  const perm = await Permission.findOne({ where: { project_id: projectId, user_id: userId } });
  return perm ? perm.role : null;
}

/**
 * @api {GET} /api/projects/public 公開プロジェクト一覧
 */
router.get('/public', async (req, res: Response) => {
  const parsed = PublicProjectsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: 'invalid_query', message: parsed.error.errors.map(e => e.message).join(', '), data: null });
    return;
  }
  const { page, limit, keyword, stage, currency } = parsed.data;
  const where: Record<string, unknown> = { visibility: 'public' };
  if (stage) where['stage'] = stage;
  if (currency) where['currency'] = currency;
  if (keyword) {
    where['title'] = { [Op.like]: `%${keyword}%` };
  }
  const offset = (page - 1) * limit;
  const { count, rows } = await Project.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ success: true, code: '', message: '', data: { total: count, page, limit, projects: rows } });
});

/**
 * @api {POST} /api/projects プロジェクト作成
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ProjectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: 'invalid_query', message: parsed.error.errors.map(e => e.message).join(', '), data: null });
    return;
  }
  const { title, summary, visibility, currency, stage, tags, sections } = parsed.data;
  const project = await Project.create({
    owner_id: req.user!.id,
    title,
    summary: summary ?? null,
    visibility,
    currency,
    stage: stage ?? null,
    tags: tags ?? [],
    published_at: visibility === 'public' ? new Date() : null,
  });
  // Owner permission
  await Permission.create({ project_id: project.id, user_id: req.user!.id, role: 'owner', granted_by: null });
  // Sections
  if (sections && sections.length > 0) {
    await Promise.all(sections.map(s => ProjectSection.create({
      project_id: project.id,
      type: s.type,
      content: s.content,
      created_by: req.user!.id,
    })));
  }
  // Version snapshot
  await ProjectVersion.create({
    project_id: project.id,
    snapshot: { title, summary, visibility, currency, sections },
    summary: { en: 'Initial version', ja: '初期バージョン' },
    created_by: req.user!.id,
  });
  await ActivityLog.create({ project_id: project.id, user_id: req.user!.id, action: 'project_created', meta: { title } });
  res.status(201).json({ success: true, code: '', message: 'Project created', data: { projectId: project.id } });
});

/**
 * @api {GET} /api/projects/:id プロジェクト取得
 */
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id'], {
    include: [
      { model: ProjectSection, as: 'sections' },
      { model: Attachment, as: 'attachments' },
    ],
  });
  if (!project) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Project not found', data: null });
    return;
  }
  const role = await getProjectRole(project.id, req.user?.id);
  if (project.visibility !== 'public' && !role) {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Access denied', data: null });
    return;
  }
  const owner = await User.findByPk(project.owner_id, { attributes: ['id', 'name', 'email'] });
  res.json({ success: true, code: '', message: '', data: { project, owner, role } });
});

/**
 * @api {PUT} /api/projects/:id プロジェクト更新
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Project not found', data: null });
    return;
  }
  const role = await getProjectRole(project.id, req.user!.id);
  if (!role || role === 'viewer') {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Edit permission required', data: null });
    return;
  }
  const parsed = ProjectUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: 'invalid_query', message: parsed.error.errors.map(e => e.message).join(', '), data: null });
    return;
  }
  const updates = parsed.data;
  if (updates.visibility === 'public' && !project.published_at) {
    (updates as Record<string, unknown>)['published_at'] = new Date();
  }
  await project.update(updates);
  // Save version
  await ProjectVersion.create({
    project_id: project.id,
    snapshot: { ...project.toJSON() },
    summary: updates.summary ?? null,
    created_by: req.user!.id,
  });
  await ActivityLog.create({ project_id: project.id, user_id: req.user!.id, action: 'project_updated', meta: {} });
  res.json({ success: true, code: '', message: 'Project updated', data: { projectId: project.id } });
});

/**
 * @api {DELETE} /api/projects/:id プロジェクト削除
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Project not found', data: null });
    return;
  }
  if (project.owner_id !== req.user!.id) {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Owner only', data: null });
    return;
  }
  await project.destroy();
  await ActivityLog.create({ project_id: null, user_id: req.user!.id, action: 'project_deleted', meta: { id: req.params['id'] } });
  res.json({ success: true, code: '', message: 'Project deleted', data: null });
});

/**
 * @api {POST} /api/projects/:id/request-access アクセス申請
 */
router.post('/:id/request-access', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = RequestAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: 'invalid_query', message: parsed.error.errors.map(e => e.message).join(', '), data: null });
    return;
  }
  const project = await Project.findByPk(req.params['id']);
  if (!project) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Project not found', data: null });
    return;
  }
  const existing = await AccessRequest.findOne({
    where: { project_id: project.id, requester_id: req.user!.id, status: 'pending' },
  });
  if (existing) {
    res.status(409).json({ success: false, code: 'already_requested', message: 'Access already requested', data: null });
    return;
  }
  const ar = await AccessRequest.create({
    project_id: project.id,
    requester_id: req.user!.id,
    request_type: parsed.data.request_type,
    message: parsed.data.message ?? null,
    status: 'pending',
  });
  res.status(201).json({ success: true, code: '', message: 'Access requested', data: { requestId: ar.id } });
});

/**
 * @api {GET} /api/projects/:id/access-requests アクセス申請一覧（Owner用）
 */
router.get('/:id/access-requests', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project || project.owner_id !== req.user!.id) {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Owner only', data: null });
    return;
  }
  const requests = await AccessRequest.findAll({ where: { project_id: project.id } });
  res.json({ success: true, code: '', message: '', data: { requests } });
});

/**
 * @api {POST} /api/projects/:id/access-requests/:reqId アクセス申請処理（Owner用）
 */
router.post('/:id/access-requests/:reqId', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ProcessAccessRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: 'invalid_query', message: parsed.error.errors.map(e => e.message).join(', '), data: null });
    return;
  }
  const project = await Project.findByPk(req.params['id']);
  if (!project || project.owner_id !== req.user!.id) {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Owner only', data: null });
    return;
  }
  const ar = await AccessRequest.findByPk(req.params['reqId']);
  if (!ar || ar.project_id !== project.id) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Request not found', data: null });
    return;
  }
  const { action } = parsed.data;
  await ar.update({ status: action === 'approve' ? 'approved' : 'rejected', processed_by: req.user!.id, processed_at: new Date() });
  if (action === 'approve') {
    const role = ar.request_type === 'edit' ? 'editor' : 'viewer';
    await Permission.upsert({ project_id: project.id, user_id: ar.requester_id, role, granted_by: req.user!.id });
  }
  res.json({ success: true, code: '', message: `Request ${action}d`, data: null });
});

/**
 * @api {POST} /api/projects/:id/grant 権限付与（Owner用）
 */
router.post('/:id/grant', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = GrantPermissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: 'invalid_query', message: parsed.error.errors.map(e => e.message).join(', '), data: null });
    return;
  }
  const project = await Project.findByPk(req.params['id']);
  if (!project || project.owner_id !== req.user!.id) {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Owner only', data: null });
    return;
  }
  const { user_id, role } = parsed.data;
  await Permission.upsert({ project_id: project.id, user_id, role, granted_by: req.user!.id });
  await ActivityLog.create({ project_id: project.id, user_id: req.user!.id, action: 'permission_granted', meta: { user_id, role } });
  res.json({ success: true, code: '', message: 'Permission granted', data: null });
});

/**
 * @api {GET} /api/projects/:id/permissions 権限一覧（Owner用）
 */
router.get('/:id/permissions', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project || project.owner_id !== req.user!.id) {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Owner only', data: null });
    return;
  }
  const permissions = await Permission.findAll({
    where: { project_id: project.id },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
  });
  res.json({ success: true, code: '', message: '', data: { permissions } });
});

/**
 * @api {GET} /api/projects/:id/versions バージョン一覧
 */
router.get('/:id/versions', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Project not found', data: null });
    return;
  }
  const role = await getProjectRole(project.id, req.user?.id);
  if (project.visibility !== 'public' && !role) {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Access denied', data: null });
    return;
  }
  const versions = await ProjectVersion.findAll({ where: { project_id: project.id }, order: [['created_at', 'DESC']] });
  res.json({ success: true, code: '', message: '', data: { versions } });
});

/**
 * @api {POST} /api/projects/:id/attachments ファイルアップロード
 */
router.post('/:id/attachments', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Project not found', data: null });
    return;
  }
  const role = await getProjectRole(project.id, req.user!.id);
  if (!role || role === 'viewer') {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Edit permission required', data: null });
    return;
  }
  if (!req.file) {
    res.status(400).json({ success: false, code: 'no_file', message: 'No file uploaded', data: null });
    return;
  }
  const att = await Attachment.create({
    project_id: project.id,
    filename: req.file.originalname,
    mime_type: req.file.mimetype,
    url: `/uploads/${req.file.filename}`,
    uploaded_by: req.user!.id,
    size: req.file.size,
  });
  res.status(201).json({ success: true, code: '', message: 'File uploaded', data: { attachment: att } });
});

/**
 * @api {GET} /api/projects/:id/comments コメント一覧
 */
router.get('/:id/comments', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Project not found', data: null });
    return;
  }
  const role = await getProjectRole(project.id, req.user?.id);
  if (project.visibility !== 'public' && !role) {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Access denied', data: null });
    return;
  }
  const comments = await Comment.findAll({ where: { project_id: project.id }, order: [['created_at', 'ASC']] });
  res.json({ success: true, code: '', message: '', data: { comments } });
});

/**
 * @api {POST} /api/projects/:id/comments コメント投稿
 */
router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project) {
    res.status(404).json({ success: false, code: 'not_found', message: 'Project not found', data: null });
    return;
  }
  const role = await getProjectRole(project.id, req.user!.id);
  if (!role && project.visibility !== 'public') {
    res.status(403).json({ success: false, code: 'forbidden', message: 'Access denied', data: null });
    return;
  }
  const { body } = req.body;
  if (!body || typeof body !== 'string') {
    res.status(400).json({ success: false, code: 'invalid_query', message: 'body is required', data: null });
    return;
  }
  const comment = await Comment.create({ project_id: project.id, author_id: req.user!.id, body });
  res.status(201).json({ success: true, code: '', message: 'Comment added', data: { comment } });
});

/**
 * @api {GET} /api/projects 自分のプロジェクト一覧
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const permissions = await Permission.findAll({ where: { user_id: req.user!.id } });
  const projectIds = permissions.map(p => p.project_id);
  const projects = await Project.findAll({ where: { id: { [Op.in]: projectIds } }, order: [['created_at', 'DESC']] });
  res.json({ success: true, code: '', message: '', data: { projects } });
});

export default router;
