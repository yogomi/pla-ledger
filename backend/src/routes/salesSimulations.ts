import { Router } from 'express';
import getMonthlyExpandedRouter from '../api/salesSimulations/getMonthlyExpanded';
import getYearlyRouter from '../api/salesSimulations/getYearly';
import getYearlyItemsRouter from '../api/salesSimulations/getYearlyItems';
import interpolatePreviewRouter from '../api/salesSimulations/interpolatePreview';
import updateMonthlyRouter from '../api/salesSimulations/updateMonthly';
import deleteMonthlyRouter from '../api/salesSimulations/deleteMonthly';

const router = Router({ mergeParams: true });
router.use('/', getMonthlyExpandedRouter);
router.use('/', getYearlyRouter);
router.use('/', getYearlyItemsRouter);
router.use('/', interpolatePreviewRouter);
router.use('/', updateMonthlyRouter);
router.use('/', deleteMonthlyRouter);

export default router;
