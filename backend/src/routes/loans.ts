import { Router } from 'express';
import getLoansRouter from '../api/loans/getLoans';
import createLoanRouter from '../api/loans/createLoan';
import updateLoanRouter from '../api/loans/updateLoan';
import deleteLoanRouter from '../api/loans/deleteLoan';
import getLoanRepaymentScheduleRouter from '../api/loans/getLoanRepaymentSchedule';

const router = Router({ mergeParams: true });

router.use('/', getLoansRouter);
router.use('/', createLoanRouter);
router.use('/', updateLoanRouter);
router.use('/', deleteLoanRouter);
router.use('/', getLoanRepaymentScheduleRouter);

export default router;
