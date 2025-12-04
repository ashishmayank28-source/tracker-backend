import 'dotenv/config';
import xlsx from 'xlsx';
import path from 'path';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/userModel.js';
const as = (x) => (x == null ? '' : String(x).trim());
const DEFAULT_PWD = process.env.DEFAULT_USER_PASSWORD || '123456';
const FORCE_RESET = String(process.env.FORCE_RESET_PASSWORDS || '0') === '1';
function readSheet(wb, name) { const ws = wb.Sheets[name]; if (!ws) return []; return xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' }); }
async function upsertUser({ empCode, name, role, branch, area, region, managerEmpCode }) {
  if (!empCode) return { added: 0, updated: 0 };
  const existing = await User.findOne({ empCode });
  const hash = await bcrypt.hash(DEFAULT_PWD, 10);
  if (existing) {
    if (name) existing.name = name;
    if (branch) existing.branch = branch;
    if (area) existing.area = area;
    if (region) existing.region = region;
    if (managerEmpCode) existing.managerEmpCode = managerEmpCode;
    if (role) existing.role = role;
    if (FORCE_RESET) existing.passwordHash = hash;
    await existing.save();
    return { added: 0, updated: 1 };
  } else {
    await User.create({ empCode, name, role, branch, area, region, managerEmpCode, passwordHash: hash, isActive: true });
    return { added: 1, updated: 0 };
  }
}
async function handleEmp(wb) {
  const rows = readSheet(wb, 'Emp_Password');
  let added = 0, updated = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const empCode = as(r[0]);
    const name = as(r[2]);
    const basedArea = as(r[3]);
    const managerEmpCode = as(r[7]);
    const region = as(r[8]);
    if (!empCode) continue;
    const res = await upsertUser({ empCode, name, role: 'Employee', branch: basedArea, area: basedArea, region, managerEmpCode });
    added += res.added; updated += res.updated;
  }
  return { added, updated };
}
async function handleManager(wb) {
  const rows = readSheet(wb, 'Manager_Password');
  let added = 0, updated = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const empCode = as(r[0]);
    const name = as(r[2]);
    const basedArea = as(r[3]);
    const region = as(r[8]);
    if (!empCode) continue;
    const res = await upsertUser({ empCode, name, role: 'Manager', branch: basedArea, area: basedArea, region });
    added += res.added; updated += res.updated;
  }
  return { added, updated };
}
(async () => {
  await connectDB();
  const file = process.argv[2] || path.join(process.cwd(), 'data', 'users.xlsx');
  console.log('Reading:', file);
  const wb = xlsx.readFile(file);
  const e = await handleEmp(wb);
  console.log('Emp_Password →', e);
  const m = await handleManager(wb);
  console.log('Manager_Password →', m);
  process.exit(0);
})();
