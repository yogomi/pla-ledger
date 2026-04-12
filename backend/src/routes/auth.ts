import { Router } from 'express';
import signupRouter from '../api/auth/signup';
import loginRouter from '../api/auth/login';
import meRouter from '../api/auth/me';
import passwordResetRequestRouter from '../api/auth/password-reset-request';
import passwordResetVerifyRouter from '../api/auth/password-reset-verify';
import passwordResetConfirmRouter from '../api/auth/password-reset-confirm';

const router = Router();

router.use('/signup', signupRouter);
router.use('/login', loginRouter);
router.use('/me', meRouter);
router.use('/password-reset/request', passwordResetRequestRouter);
router.use('/password-reset/verify', passwordResetVerifyRouter);
router.use('/password-reset/confirm', passwordResetConfirmRouter);

export default router;
