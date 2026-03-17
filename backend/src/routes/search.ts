import { Router } from 'express';
import searchRouter from '../api/search/search';

const router = Router();

router.use('/', searchRouter);

export default router;
