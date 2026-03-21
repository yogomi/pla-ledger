import { Router } from 'express';
import getMonthlyRouter from '../api/laborCosts/getMonthly';
import updateMonthlyRouter from '../api/laborCosts/updateMonthly';
import deleteMonthlyRouter from '../api/laborCosts/deleteMonthly';

const router = Router({ mergeParams: true });
router.use('/', getMonthlyRouter);
router.use('/', updateMonthlyRouter);
router.use('/', deleteMonthlyRouter);

export default router;
