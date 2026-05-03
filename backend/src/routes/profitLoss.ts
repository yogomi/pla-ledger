import { Router } from 'express';
import getYearlyRouter from '../api/profitLoss/getYearly';
import getFiscalYearSummaryRouter from '../api/profitLoss/getFiscalYearSummary';

const router = Router({ mergeParams: true });
router.use('/', getYearlyRouter);
router.use('/', getFiscalYearSummaryRouter);

export default router;
