import { Router } from 'express';
import updateFixedRouter from '../api/expenses/updateFixed';

const router = Router({ mergeParams: true });
router.use('/', updateFixedRouter);

export default router;
