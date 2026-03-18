import { Router } from 'express';
import updateVariableRouter from '../api/expenses/updateVariable';

const router = Router({ mergeParams: true });
router.use('/', updateVariableRouter);

export default router;
