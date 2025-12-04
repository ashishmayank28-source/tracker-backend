// src/helpers/buildTeam.js
export function buildTeam(allUsers, managerEmpCode) {
  if (!Array.isArray(allUsers) || !managerEmpCode) return [];

  // Direct subordinates
  const direct = allUsers.filter(u =>
    u.reportTo?.some(r => r.empCode === managerEmpCode)
  );

  let team = [...direct];

  // Managers के नीचे employees भी include करें
  direct.forEach(manager => {
    const subs = allUsers.filter(u =>
      u.reportTo?.some(r => r.empCode === manager.empCode)
    );
    team.push(...subs);

    // अगर किसी subordinate के नीचे और लोग हैं तो recursively जोड़ें
    subs.forEach(emp => {
      const nested = allUsers.filter(u =>
        u.reportTo?.some(r => r.empCode === emp.empCode)
      );
      team.push(...nested);
    });
  });

  // Duplicate हटाएँ (empCode के आधार पर)
  const unique = [];
  const seen = new Set();
  for (const u of team) {
    if (!seen.has(u.empCode)) {
      seen.add(u.empCode);
      unique.push(u);
    }
  }
  return unique;
}
