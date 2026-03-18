import { Router } from 'express';
import getMonthlyExpandedRouter from '../api/salesSimulations/getMonthlyExpanded';
import updateMonthlyRouter from '../api/salesSimulations/updateMonthly';
import createCategoryRouter from '../api/salesSimulations/createCategory';
import deleteCategoryRouter from '../api/salesSimulations/deleteCategory';
import createItemRouter from '../api/salesSimulations/createItem';
import deleteItemRouter from '../api/salesSimulations/deleteItem';

const router = Router({ mergeParams: true });
router.use('/', getMonthlyExpandedRouter);
router.use('/', updateMonthlyRouter);
router.use('/categories', createCategoryRouter);
router.use('/categories', deleteCategoryRouter);
router.use('/items', createItemRouter);
router.use('/items', deleteItemRouter);

export default router;
