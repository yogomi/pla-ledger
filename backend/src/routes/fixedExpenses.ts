import { Router } from 'express';
import updateFixedRouter from '../api/expenses/updateFixed';
import deleteFixedRouter from '../api/expenses/deleteFixed';

const router = Router({ mergeParams: true });
router.use('/', updateFixedRouter);
router.use('/', deleteFixedRouter);

export default router;
