import { Router } from 'express';
import getYearlyRouter from '../api/profitLoss/getYearly';

const router = Router({ mergeParams: true });
router.use('/', getYearlyRouter);

export default router;
