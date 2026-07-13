export function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizedCandidatePhone(value) {
  const digits = phoneDigits(value);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function isValidCandidatePhone(value) {
  const digits = phoneDigits(value);
  return (
    digits.length === 10 ||
    (digits.length === 12 && digits.startsWith("91")) ||
    (digits.length === 11 && digits.startsWith("0"))
  );
}

export function candidateMatchesSearch(candidate, search) {
  const query = String(search || "").trim().toLowerCase();
  if (!query) return true;
  const digits = phoneDigits(query);
  const primary = phoneDigits(candidate?.student_phone || candidate?.phone);
  const alternate = phoneDigits(candidate?.alternate_number);
  const name = String(candidate?.student_name || candidate?.label || "").toLowerCase();
  const email = String(candidate?.student_email || "").toLowerCase();
  return (
    name.includes(query) ||
    email.includes(query) ||
    Boolean(digits && (primary.includes(digits) || alternate.includes(digits)))
  );
}

export function candidateHasExactPhone(candidate, phone) {
  const normalized = normalizedCandidatePhone(phone);
  if (normalized.length !== 10) return false;
  return [candidate?.student_phone, candidate?.phone, candidate?.alternate_number]
    .some((value) => normalizedCandidatePhone(value) === normalized);
}

export function findUniqueCandidateByPhone(candidates, phone) {
  const matches = (candidates || []).filter((candidate) =>
    candidateHasExactPhone(candidate, phone),
  );
  const unique = new Map(
    matches.map((candidate) => [candidate.enrollment_id || candidate.value, candidate]),
  );
  return unique.size === 1 ? [...unique.values()][0] : null;
}

export function candidatePhoneLabel(candidate) {
  const primary = candidate?.student_phone || candidate?.phone || "No primary phone";
  const alternate = candidate?.alternate_number;
  return alternate ? `Primary: ${primary} | Alternate: ${alternate}` : `Primary: ${primary}`;
}
