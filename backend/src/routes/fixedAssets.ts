import { Router } from 'express';
import createRouter from '../api/fixedAssets/create';
import getListRouter from '../api/fixedAssets/getList';
import getDetailRouter from '../api/fixedAssets/getDetail';
import updateRouter from '../api/fixedAssets/update';
import deleteRouter from '../api/fixedAssets/delete';
import getDepreciationRouter from '../api/fixedAssets/getDepreciation';

const router = Router({ mergeParams: true });

router.use('/', createRouter);
router.use('/', getListRouter);
// depreciation エンドポイントは /:assetId より前に登録する（競合を防ぐため）
router.use('/', getDepreciationRouter);
router.use('/', getDetailRouter);
router.use('/', updateRouter);
router.use('/', deleteRouter);

export default router;
