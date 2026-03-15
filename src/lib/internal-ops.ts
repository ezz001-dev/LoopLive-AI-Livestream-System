const DEFAULT_INTERNAL_OPS_EMAILS = ["admin@looplive.ai"];

function parseInternalOpsEmails(rawValue?: string) {
  if (!rawValue?.trim()) {
    return DEFAULT_INTERNAL_OPS_EMAILS;
  }

  return rawValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

export function canAccessInternalOps(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const allowedEmails = parseInternalOpsEmails(process.env.INTERNAL_OPS_EMAILS);
  return allowedEmails.includes(normalizedEmail);
}
