import { Router } from 'express';
import getMonthlyExpandedRouter from '../api/salesSimulations/getMonthlyExpanded';
import updateMonthlyRouter from '../api/salesSimulations/updateMonthly';

const router = Router({ mergeParams: true });
router.use('/', getMonthlyExpandedRouter);
router.use('/', updateMonthlyRouter);

export default router;
