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

// A cellgroup is reachable if it is in the user's ministry and, for a locked user, it is their own.
function canAccessCellgroup(user, cg) {
  if (!user || !cg) return false;
  const id = (v) => String(v && v._id ? v._id : v);
  if (user.department && id(cg.department) !== id(user.department)) return false;
  if (user.cellgroup && id(cg._id) !== id(user.cellgroup)) return false;
  return true;
}

// Mongo filter fragment that limits Member / Visitor queries to what this user may see.
// Merge it LAST so it overrides anything the browser put in the query string:
//   Object.assign(filter, memberScope(req.user));
//  - portal accounts (user.department)  -> their ministry only
//  - leaders / assistant leaders (user.cellgroup) -> their cellgroup only
//  - president / VP / secretary / treasurer have no cellgroup, so they see the whole ministry
function memberScope(user) {
  const f = {};
  if (user && user.department) f.department = user.department;
  if (user && user.cellgroup) f.cellgroup = user.cellgroup;
  return f;
}

module.exports = { canAccessDepartment, canAccessMember, canAccessCellgroup, memberScope };
