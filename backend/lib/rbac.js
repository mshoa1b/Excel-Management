// lib/rbac.js
const { ROLE } = require("./roles");

const isSuperAdmin = (req) => req.user?.role_id === ROLE.SUPER_ADMIN;

const requireRoles = (...roleIds) => (req, res, next) => {
  if (!req.user?.role_id || !roleIds.includes(req.user.role_id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const scopeByBusiness = (queryAll, queryScoped) => async (req, res, next) => {
  if (isSuperAdmin(req)) {
    req._scopedQuery = { text: queryAll, values: [] };
  } else {
    const bizId = req.user?.business_id;
    if (!bizId) return res.status(400).json({ message: "No business scope" });
    req._scopedQuery = { text: queryScoped, values: [bizId] };
  }
  next();
};

module.exports = { isSuperAdmin, requireRoles, scopeByBusiness };
