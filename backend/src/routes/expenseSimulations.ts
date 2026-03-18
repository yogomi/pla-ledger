import { Router } from 'express';
import getMonthlyRouter from '../api/expenseSimulations/getMonthly';

const router = Router({ mergeParams: true });
router.use('/', getMonthlyRouter);

export default router;
