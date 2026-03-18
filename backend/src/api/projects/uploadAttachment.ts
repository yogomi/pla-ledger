import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Project, Attachment } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from './utils';

const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads');
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

/**
 * @api {POST} /api/projects/:id/attachments ファイルアップロード
 * @description
 *   - 指定プロジェクトにファイルを添付する
 *   - owner または editor 権限が必要
 *   - ファイルサイズ上限は MAX_FILE_SIZE_MB 環境変数で設定（デフォルト10MB）
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   - Content-Type: multipart/form-data (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *   Body (multipart/form-data):
 *   - file: File (required) - アップロードするファイル
 *
 * @response
 *   成功時: { success: true, code: '', message: 'File uploaded', data: { attachment } }
 *   失敗時:
 *     - 400: { success: false, code: 'no_file', message: 'No file uploaded', data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "File uploaded",
 *     "data": {
 *       "attachment": {
 *         "id": "uuid",
 *         "filename": "document.pdf",
 *         "mime_type": "application/pdf",
 *         "url": "/uploads/filename.pdf",
 *         "size": 10240
 *       }
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "no_file",
 *     "message": "No file uploaded",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.post(
  '/:id/attachments',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    const project = await Project.findByPk(req.params['id']);
    if (!project) {
      res.status(404).json({
        success: false,
        code: 'not_found',
        message: 'Project not found',
        data: null,
      });
      return;
    }
    const role = await getProjectRole(project.id, req.user!.id);
    if (!role || role === 'viewer') {
      res.status(403).json({
        success: false,
        code: 'forbidden',
        message: 'Edit permission required',
        data: null,
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({
        success: false,
        code: 'no_file',
        message: 'No file uploaded',
        data: null,
      });
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
    res.status(201).json({
      success: true,
      code: '',
      message: 'File uploaded',
      data: { attachment: att },
    });
  },
);

export default router;
