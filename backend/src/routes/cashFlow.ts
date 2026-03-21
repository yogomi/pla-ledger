import { Router } from 'express';
import getMonthlyRouter from '../api/cash-flow/getMonthly';
import updateMonthlyRouter from '../api/cash-flow/updateMonthly';
import getYearlyRouter from '../api/cash-flow/getYearly';

const router = Router({ mergeParams: true });

router.use('/', getMonthlyRouter);
router.use('/', updateMonthlyRouter);
router.use('/', getYearlyRouter);

export default router;
