import { Router } from 'express';
import publicListRouter from '../api/projects/publicList';
import createRouter from '../api/projects/create';
import getRouter from '../api/projects/get';
import updateRouter from '../api/projects/update';
import deleteRouter from '../api/projects/delete';
import requestAccessRouter from '../api/projects/requestAccess';
import getAccessRequestsRouter from '../api/projects/getAccessRequests';
import processAccessRequestRouter from '../api/projects/processAccessRequest';
import grantRouter from '../api/projects/grant';
import getPermissionsRouter from '../api/projects/getPermissions';
import getVersionsRouter from '../api/projects/getVersions';
import uploadAttachmentRouter from '../api/projects/uploadAttachment';
import getCommentsRouter from '../api/projects/getComments';
import addCommentRouter from '../api/projects/addComment';
import listRouter from '../api/projects/list';

const router = Router();

router.use('/public', publicListRouter);
router.use('/', createRouter);
router.use('/', getRouter);
router.use('/', updateRouter);
router.use('/', deleteRouter);
router.use('/', requestAccessRouter);
router.use('/', getAccessRequestsRouter);
router.use('/', processAccessRequestRouter);
router.use('/', grantRouter);
router.use('/', getPermissionsRouter);
router.use('/', getVersionsRouter);
router.use('/', uploadAttachmentRouter);
router.use('/', getCommentsRouter);
router.use('/', addCommentRouter);
router.use('/', listRouter);

export default router;
