import { Fyo, t } from 'fyo';
import {
  Action,
  ColumnConfig,
  LinkedRecords,
  ListViewSettings,
} from 'fyo/model/types';
import { getDocStatusListColumn, getMappedDocAction } from 'models/helpers';
import { Money } from 'pesa';
import { Router } from 'vue-router';
import { FrappeDoc } from 'src/frappe/document';

export class FadlLoan extends FrappeDoc {
  static override doctype = 'Books Loan';
  static override partyField = 'party';
  static override presentation = {
    label: 'Loan',
    fileFields: [
      'name',
      'direction',
      'party_type',
      'party',
      'amount',
      'outstanding_amount',
      'mode_of_payment',
      'remark',
      'journal_entry',
      'posting_date',
    ],
  };

  static getActions(fyo: Fyo): Action[] {
    return [
      getMappedDocAction(fyo, {
        label: fyo.t`Repay`,
        group: fyo.t`Create`,
        condition: (doc: FrappeDoc) =>
          doc.isSubmitted && !(doc.outstanding_amount as Money).isZero(),
        target: () => ['FadlLoanRepayment', 'make_repayment'],
        open: openRepayment,
      }),
      getLoanJournalAction(fyo),
    ];
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'party',
        getLoanStatusColumn(),
        'posting_date',
        'direction',
        'amount',
        'outstanding_amount',
      ],
    };
  }

  /** A saved loan lists its repayments; open one to cancel it before the loan. */
  static override getLinkedRecords(fyo: Fyo): LinkedRecords {
    return {
      schemaName: 'FadlLoanRepayment',
      linkField: 'loan',
      label: t`Loan Repayments`,
      columns: ['name', getDocStatusListColumn(), 'posting_date', 'amount'],
      addLabel: t`Add repayment`,
      emptyMessage: fyo.t`No repayments`,
    };
  }
}

/** Like the invoice's payment: after submitting, the loan shows what is left to repay. */
async function openRepayment(
  repayment: FrappeDoc,
  router: Router,
  loan: FrappeDoc
) {
  const currentRoute = router.currentRoute.value.fullPath;
  repayment.once('afterSubmit', async () => {
    await loan.load();
    await router.push(currentRoute);
  });
  await router.push(`/edit/${repayment.schemaName}/${repayment.name!}`);
}

/** The loan's entries post under its journal, so open the journal, not a voucher filter. */
export function getLoanJournalAction(fyo: Fyo): Action {
  return {
    label: fyo.t`Journal Entry`,
    group: fyo.t`View`,
    condition: (doc: FrappeDoc) => doc.isSubmitted && !!doc.journal_entry,
    action: async (doc: FrappeDoc, router: Router) => {
      await router.push(`/edit/JournalEntry/${doc.journal_entry}`);
    },
  };
}

/** Debt status: red while untouched, amber while partly repaid, green once repaid. */
function getLoanStatusColumn(): ColumnConfig {
  return {
    label: t`Status`,
    fieldname: 'status',
    fieldtype: 'Select',
    badge(doc) {
      if (doc.cancelled || doc.docstatus === 2) {
        return { label: t`Cancelled`, theme: 'gray' };
      }
      if (!(doc.submitted || doc.docstatus === 1)) {
        return { label: t`Draft`, theme: 'gray' };
      }
      const outstanding = doc.outstanding_amount as Money | undefined;
      if (!outstanding || outstanding.isZero()) {
        return { label: t`Repaid`, theme: 'green' };
      }
      const amount = doc.amount as Money | undefined;
      if (amount && outstanding.lt(amount)) {
        return { label: t`Partially repaid`, theme: 'amber' };
      }
      return { label: t`Outstanding`, theme: 'red' };
    },
  };
}
