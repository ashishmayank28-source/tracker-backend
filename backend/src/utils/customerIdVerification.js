import Customer from "../models/customerModel.js";
import {
  isQualifyingSiteVisit,
  isSyntheticCustomerId,
  normalizeCustomerId,
} from "./visitClassification.js";

export function parseCustomerIds(raw) {
  let values = raw;

  if (typeof values === "string") {
    const trimmed = values.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        values = JSON.parse(trimmed);
      } catch {
        values = trimmed.split(/[\s,;]+/);
      }
    } else {
      values = trimmed.split(/[\s,;]+/);
    }
  }

  if (!Array.isArray(values)) {
    values = values == null ? [] : [values];
  }

  const seen = new Set();
  const ids = [];
  values.forEach((value) => {
    const normalized = normalizeCustomerId(value);
    if (!normalized) return;
    const key = normalized.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    ids.push(normalized);
  });

  return ids;
}

function visitBelongsToEmployee(visit, empCode) {
  const code = String(empCode);
  const visitEmp = visit?.empCode;

  if (typeof visitEmp === "string" && visitEmp === code) return true;
  if (Array.isArray(visitEmp) && visitEmp.map(String).includes(code)) return true;
  if (visit?.createdBy === code) return true;
  if (visit?.createdBy?.empCode === code) return true;
  return false;
}

export async function verifyCustomerIdsForEmployee(empCode, customerIds) {
  const normalizedIds = parseCustomerIds(customerIds);

  if (!normalizedIds.length) {
    return {
      ok: false,
      normalizedIds: [],
      failedIds: [],
      message: "At least one Customer ID is required before submitting expenses.",
    };
  }

  const customers = await Customer.find(
    {
      $or: [
        { empCode },
        { "createdBy.empCode": empCode },
        { "visits.empCode": empCode },
        { "visits.empCode": { $in: [empCode] } },
        { "visits.createdBy": empCode },
        { "visits.createdBy.empCode": empCode },
      ],
    },
    { customerId: 1, visits: 1 }
  ).lean();

  const verified = new Set();
  customers.forEach((customer) => {
    const customerId = normalizeCustomerId(customer.customerId);
    if (isSyntheticCustomerId(customerId)) return;

    (customer.visits || []).forEach((visit) => {
      if (!visitBelongsToEmployee(visit, empCode)) return;
      if (!isQualifyingSiteVisit(visit.meetingType)) return;
      if (visit.submitted === false) return;
      verified.add(customerId.toUpperCase());
    });
  });

  const failedIds = normalizedIds.filter(
    (id) => !verified.has(normalizeCustomerId(id).toUpperCase())
  );

  return {
    ok: failedIds.length === 0,
    normalizedIds,
    failedIds,
    message: failedIds.length
      ? failedIds
          .map(
            (id) =>
              `Customer ID ${id} was not found in your submitted visit reports. Please verify the ID or submit the required visit report first.`
          )
          .join(" ")
      : "All Customer IDs were verified against your submitted visit reports.",
  };
}
