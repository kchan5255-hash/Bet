type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

const CODE_MAP: Record<string, string> = {
  invalid_credentials: "帳號或密碼錯誤",
  email_not_confirmed: "Email 尚未驗證，請先到信箱完成驗證",
  user_already_exists: "此 Email 已註冊，請直接登入",
  email_exists: "此 Email 已被使用",
  user_not_found: "查無此帳號",
  over_email_send_rate_limit: "寄信過於頻繁，請稍後再試",
  over_request_rate_limit: "請求過於頻繁，請稍後再試",
  weak_password: "密碼強度不足，請至少 8 碼並包含字母與數字",
  same_password: "新密碼不能與舊密碼相同",
  otp_expired: "驗證碼已過期，請重新申請",
  expired_otp: "驗證碼已過期，請重新申請",
  invalid_otp: "驗證碼不正確",
  otp_disabled: "驗證碼登入功能未啟用",
  email_address_invalid: "Email 格式不正確",
  signup_disabled: "註冊功能已關閉",
  validation_failed: "輸入資料格式有誤",
  bad_jwt: "身份驗證已過期，請重新登入",
  flow_state_expired: "驗證流程已過期，請重新申請",
  flow_state_not_found: "驗證流程不存在或已失效",
  session_not_found: "找不到登入工作階段",
  reauthentication_needed: "需要重新驗證身份",
};

const MESSAGE_KEYWORDS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "帳號或密碼錯誤"],
  [/email not confirmed/i, "Email 尚未驗證，請先到信箱完成驗證"],
  [/user already registered|already.*registered/i, "此 Email 已註冊，請直接登入"],
  [/rate limit/i, "請求過於頻繁，請稍後再試"],
  [/password should be at least|password.*too short/i, "密碼長度不足，請至少 8 碼"],
  [/password.*weak/i, "密碼強度不足，請使用更強的密碼"],
  [/token has expired|expired/i, "驗證碼已過期，請重新申請"],
  [/invalid.*token|invalid.*otp/i, "驗證碼不正確"],
  [/network|fetch failed/i, "網路連線錯誤，請稍後再試"],
  [/email address.*invalid/i, "Email 格式不正確"],
  [/same.*password/i, "新密碼不能與舊密碼相同"],
];

export function translateAuthError(
  err: AuthErrorLike | null | undefined,
  fallback = "操作失敗，請稍後再試",
): string {
  if (!err) return fallback;
  if (err.code && CODE_MAP[err.code]) return CODE_MAP[err.code];
  const msg = err.message ?? "";
  for (const [re, zh] of MESSAGE_KEYWORDS) {
    if (re.test(msg)) return zh;
  }
  return msg || fallback;
}
