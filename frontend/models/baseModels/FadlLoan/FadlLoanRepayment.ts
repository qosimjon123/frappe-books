import { Fyo } from 'fyo';
import { Action, ListViewSettings } from 'fyo/model/types';
import { getDocStatusListColumn } from 'models/helpers';
import { FrappeDoc } from 'src/frappe/document';
import { getLoanJournalAction } from './FadlLoan';

export class FadlLoanRepayment extends FrappeDoc {
  static override doctype = 'Books Loan Repayment';
  static override presentation = {
    label: 'Loan Repayment',
    fileFields: [
      'name',
      'loan',
      'amount',
      'mode_of_payment',
      'journal_entry',
      'posting_date',
    ],
  };

  static getActions(fyo: Fyo): Action[] {
    return [getLoanJournalAction(fyo)];
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        getDocStatusListColumn(),
        'posting_date',
        'loan',
        'amount',
      ],
    };
  }
}
