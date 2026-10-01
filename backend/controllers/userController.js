const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc  List users with search/role filter and real pagination (never a silent hardcoded cap)
// @route GET /api/users
const listUsers = asyncHandler(async (req, res) => {
  const { q, role, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    users: users.map((u) => ({ ...u.toSafeObject(), isActive: u.isActive })),
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
});

// @desc  Deactivate or reactivate a user account. An admin can't deactivate themselves —
//        that would risk locking every admin out of the platform with no way back in.
// @route PATCH /api/users/:id/status
const setUserActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    res.status(400);
    throw new Error('isActive must be true or false.');
  }
  if (String(req.params.id) === String(req.user._id)) {
    res.status(400);
    throw new Error("You can't deactivate your own account.");
  }

  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }
  res.json({ success: true, user: { ...user.toSafeObject(), isActive: user.isActive } });
});

module.exports = { listUsers, setUserActive };
