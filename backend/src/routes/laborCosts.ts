import { Router } from 'express';
import getMonthlyRouter from '../api/laborCosts/getMonthly';
import updateMonthlyRouter from '../api/laborCosts/updateMonthly';

const router = Router({ mergeParams: true });
router.use('/', getMonthlyRouter);
router.use('/', updateMonthlyRouter);

export default router;
