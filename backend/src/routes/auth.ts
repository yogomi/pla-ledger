import { Router } from 'express';
import signupRouter from '../api/auth/signup';
import loginRouter from '../api/auth/login';
import meRouter from '../api/auth/me';

const router = Router();

router.use('/signup', signupRouter);
router.use('/login', loginRouter);
router.use('/me', meRouter);

export default router;
