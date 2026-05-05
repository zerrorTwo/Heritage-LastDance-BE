export enum MailType {
  LOGIN = 'login',
  SIGNUP = 'signup',
  LOW_BALANCE = 'low_balance',
  OUT_OF_BALANCE = 'out_of_balance',
  MONTHLY_RECEIPT = 'monthly_receipt',
  REQUEST_JOIN_EXCLUSIVE_PROGRAM = 'request_join_exclusive_program',
}

export interface MailData {
  [key: string]: any;
}

export interface LoginMailData extends MailData {
  loginCode: string;
}

export interface SignUpMailData extends MailData {
  verificationCode: string;
}

export interface LowBalanceMailData extends MailData {
  currentBalance: string;
  currency: string;
  minimumBalance: string;
}

export interface OutOfBalanceMailData extends MailData {
  currency: string;
  minimumTopUp: string;
}

export interface MonthlyReceiptMailData extends MailData {
  receiptNumber: string;
  receiptDate: string;
  customerName: string;
  customerEmail: string;
  month: string;
  year: string;
  currency: string;
  subtotal: string;
  discount?: string;
  discountPercentage?: string;
  tax?: string;
  taxPercentage?: string;
  total: string;
  paymentMethod: string;
  paymentId?: string;
  streamingHours: string;
  apiCalls: string;
  storageUsed: string;
  bandwidth: string;
  items: Array<{
    description: string;
    amount: string;
  }>;
}

export interface ExclusiveProgramMailData extends MailData {
  adminName: string;
  applicantName: string;
  applicantEmail: string;
  userId: string;
  accountType: string;
  currentPlan: string;
  requestDate: string;
  reason: string;
  additionalInfo?: string;
  approvalLink: string;
}
