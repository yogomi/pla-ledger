import { Router } from 'express';
import getMonthlyExpandedRouter from '../api/salesSimulations/getMonthlyExpanded';
import getYearlyRouter from '../api/salesSimulations/getYearly';
import updateMonthlyRouter from '../api/salesSimulations/updateMonthly';
import deleteMonthlyRouter from '../api/salesSimulations/deleteMonthly';
import createCategoryRouter from '../api/salesSimulations/createCategory';
import updateCategoryRouter from '../api/salesSimulations/updateCategory';
import deleteCategoryRouter from '../api/salesSimulations/deleteCategory';
import createItemRouter from '../api/salesSimulations/createItem';
import deleteItemRouter from '../api/salesSimulations/deleteItem';

const router = Router({ mergeParams: true });
router.use('/', getMonthlyExpandedRouter);
router.use('/', getYearlyRouter);
router.use('/', updateMonthlyRouter);
router.use('/', deleteMonthlyRouter);
router.use('/categories', createCategoryRouter);
router.use('/categories', updateCategoryRouter);
router.use('/categories', deleteCategoryRouter);
router.use('/items', createItemRouter);
router.use('/items', deleteItemRouter);

export default router;
