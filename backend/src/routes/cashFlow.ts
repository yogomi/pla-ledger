import { Router } from 'express';
import getMonthlyRouter from '../api/cash-flow/getMonthly';
import updateMonthlyRouter from '../api/cash-flow/updateMonthly';
import getYearlyRouter from '../api/cash-flow/getYearly';
import getTimelineRouter from '../api/cash-flow/getTimeline';

const router = Router({ mergeParams: true });

router.use('/', getMonthlyRouter);
router.use('/', updateMonthlyRouter);
router.use('/', getYearlyRouter);
router.use('/', getTimelineRouter);

export default router;
