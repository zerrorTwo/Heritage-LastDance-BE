/**
 * Enum các action được ghi vào audit log.
 * Thêm action mới tại đây để mở rộng.
 */
export enum AuditAction {
  // Auth flows
  SIGNUP            = 'SIGNUP',
  VERIFY_OTP        = 'VERIFY_OTP',
  SIGNIN            = 'SIGNIN',
  SIGNIN_GOOGLE     = 'SIGNIN_GOOGLE',
  REFRESH_TOKEN     = 'REFRESH_TOKEN',
  LOGOUT            = 'LOGOUT',

  // Password flows
  FORGOT_PASSWORD   = 'FORGOT_PASSWORD',
  VERIFY_FORGOT_OTP = 'VERIFY_FORGOT_OTP',
  CHANGE_PASSWORD   = 'CHANGE_PASSWORD',
}
