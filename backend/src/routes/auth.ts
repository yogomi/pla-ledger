import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, ActivityLog } from '../models';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth';
import { SignupSchema, LoginSchema } from '../schemas';

const router = Router();

/**
 * @api {POST} /api/auth/signup サインアップ
 */
router.post('/signup', async (req, res: Response) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: parsed.error.errors.map(e => e.message).join(', '),
      data: null,
    });
    return;
  }
  const { email, password, name, locale } = parsed.data;
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, code: 'email_taken', message: 'Email already registered', data: null });
    return;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password_hash, name, locale });
  await ActivityLog.create({ user_id: user.id, action: 'signup', meta: { email } });
  const token = generateToken({ id: user.id, email: user.email, locale: user.locale });
  res.status(201).json({
    success: true,
    code: '',
    message: 'Account created',
    data: { token, user: { id: user.id, email: user.email, name: user.name, locale: user.locale } },
  });
});

/**
 * @api {POST} /api/auth/login ログイン
 */
router.post('/login', async (req, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: parsed.error.errors.map(e => e.message).join(', '),
      data: null,
    });
    return;
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ success: false, code: 'invalid_credentials', message: 'Invalid email or password', data: null });
    return;
  }
  await ActivityLog.create({ user_id: user.id, action: 'login', meta: { email } });
  const token = generateToken({ id: user.id, email: user.email, locale: user.locale });
  res.json({
    success: true,
    code: '',
    message: 'Logged in',
    data: { token, user: { id: user.id, email: user.email, name: user.name, locale: user.locale } },
  });
});

/**
 * @api {GET} /api/auth/me ログインユーザー取得
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findByPk(req.user!.id, {
    attributes: ['id', 'email', 'name', 'locale', 'created_at'],
  });
  if (!user) {
    res.status(404).json({ success: false, code: 'not_found', message: 'User not found', data: null });
    return;
  }
  res.json({ success: true, code: '', message: '', data: { user } });
});

export default router;
