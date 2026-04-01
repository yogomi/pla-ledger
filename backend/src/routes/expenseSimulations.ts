import { Router } from 'express';
import getMonthlyRouter from '../api/expenseSimulations/getMonthly';
import getYearlyRouter from '../api/expenseSimulations/getYearly';

const router = Router({ mergeParams: true });
router.use('/', getMonthlyRouter);
router.use('/', getYearlyRouter);

export default router;
