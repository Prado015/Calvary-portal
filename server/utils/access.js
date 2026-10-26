// Department scoping for ministry data. A user with a department (a portal
// account) may only touch records belonging to that department. Users without
// one (admin back office) are unscoped.
function canAccessDepartment(user, departmentId) {
  if (!user.department) return true;
  return String(user.department) === String(departmentId);
}

module.exports = { canAccessDepartment };
