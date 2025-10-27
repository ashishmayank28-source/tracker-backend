// backend/utils/generateCustomerId.js
export default function generateCustomerId(name, mobile) {
  const safeName = (name || "CUST").replace(/\s+/g, "").toUpperCase();
  const safeMobile = String(mobile || "").slice(-4); // last 4 digits
  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `${safeName}-${safeMobile}-${rand}`;
}
