export const VISIT_TYPES = {
  NEW: "New Visit",
  REVISIT: "Revisit",
  UNKNOWN: "Unknown",
};

export function normalizeCustomerId(id) {
  if (id == null) return "";
  return String(id).trim();
}

export function isSyntheticCustomerId(id) {
  const normalized = normalizeCustomerId(id).toUpperCase();
  return (
    !normalized ||
    normalized === "-" ||
    normalized === "NA" ||
    normalized.startsWith("INTERNAL") ||
    normalized.startsWith("LEAVE") ||
    normalized.startsWith("MANUAL-")
  );
}

export function isQualifyingSiteVisit(meetingType) {
  return meetingType === "External" || meetingType === "Revisit";
}

function visitTime(date) {
  if (!date) return NaN;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? NaN : time;
}

export function classifyVisitType(visit, history = []) {
  const empCode = visit?.empCode ? String(visit.empCode).trim() : "";
  const customerId = normalizeCustomerId(visit?.customerId);
  const meetingType = visit?.meetingType || "";
  const visitId = visit?.visitId != null ? String(visit.visitId) : "";

  if (!empCode || empCode === "-") return VISIT_TYPES.UNKNOWN;
  if (isSyntheticCustomerId(customerId)) return VISIT_TYPES.UNKNOWN;
  if (!isQualifyingSiteVisit(meetingType)) return VISIT_TYPES.UNKNOWN;

  if (meetingType === "Revisit") return VISIT_TYPES.REVISIT;

  const currentTime = visitTime(visit?.date);
  if (Number.isNaN(currentTime)) return VISIT_TYPES.UNKNOWN;

  const hasEarlierQualifyingVisit = history.some((prior) => {
    if (!isQualifyingSiteVisit(prior.meetingType)) return false;
    const priorId = prior.visitId != null ? String(prior.visitId) : "";
    if (visitId && priorId && visitId === priorId) return false;

    const priorTime = visitTime(prior.date);
    if (Number.isNaN(priorTime)) return false;
    if (priorTime < currentTime) return true;
    if (priorTime > currentTime) return false;

    if (visitId && priorId) return priorId < visitId;
    return false;
  });

  return hasEarlierQualifyingVisit ? VISIT_TYPES.REVISIT : VISIT_TYPES.NEW;
}

export function historyKey(empCode, customerId) {
  return `${String(empCode || "").trim()}::${normalizeCustomerId(customerId)}`;
}
