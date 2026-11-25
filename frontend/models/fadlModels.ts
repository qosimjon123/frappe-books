import type { FrappeModel } from 'src/frappe/doctypes';
import { FadlLoan } from './baseModels/FadlLoan/FadlLoan';
import { FadlLoanRepayment } from './baseModels/FadlLoan/FadlLoanRepayment';

/**
 * fadl: our Frappe-backed models, spread into the native registry.
 * Keys keep the palette's order, so they land where the native list shows them.
 */
export const fadlModels: Record<string, FrappeModel> = {
  FadlLoan,
  FadlLoanRepayment,
};
