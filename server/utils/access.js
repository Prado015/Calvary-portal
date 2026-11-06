// Department scoping for ministry data. A user with a department (a portal
// account) may only touch records belonging to that department. Users without
// one (admin back office) are unscoped.
function canAccessDepartment(user, departmentId) {
  if (!user.department) return true;
  return String(user.department) === String(departmentId);
}

// A member is reachable if it sits in the user's ministry. (member.department may be
// an ObjectId or a populated document.) If the user is locked to a cellgroup
// (user.cellgroup, once that field exists), the member must also be in it.
function canAccessMember(user, member) {
  if (!user || !member) return false;
  const id = (v) => String(v && v._id ? v._id : v);
  if (user.department && (!member.department || id(member.department) !== id(user.department))) return false;
  if (user.cellgroup && (!member.cellgroup || id(member.cellgroup) !== id(user.cellgroup))) return false;
  return true;
}

module.exports = { canAccessDepartment, canAccessMember };