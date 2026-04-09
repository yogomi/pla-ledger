import { Router } from 'express';
import getRouter from '../api/startup-costs/get';
import updateRouter from '../api/startup-costs/update';
import deleteRouter from '../api/startup-costs/delete';

const router = Router({ mergeParams: true });

router.use('/', getRouter);
router.use('/', updateRouter);
router.use('/', deleteRouter);

export default router;
