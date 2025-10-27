export default function generateAllocationId(prefix = "ALLOC") {
  const ts = Date.now().toString(36); // timestamp base36
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}
