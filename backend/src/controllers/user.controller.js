import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

// All users now use the unified User model
const getUserModel = (role) => {
  return User;
};

// ─── Get my profile ───────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const Model = getUserModel(req.user.role);
    const user = await Model.findById(req.user._id)
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -mobileVerificationOTP')
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update my profile ────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    console.log('📥 Update profile request received');
    console.log('User ID:', req.user._id);
    console.log('User Role:', req.user.role);
    console.log('Request body:', req.body);
    
    const Model = getUserModel(req.user.role);
    console.log('Using model:', Model.modelName);
    
    // Define allowed fields based on role
    let allowed = [];
    
    if (req.user.role === 'administrator') {
      // Admin fields
      allowed = [
        'firstName', 'lastName', 'email', 'mobile', 'profilePicture',
        'organization', 'designation', 'location'
      ];
    } else if (req.user.role === 'trainer') {
      // Trainer fields
      allowed = [
        'firstName', 'lastName', 'email', 'mobile', 'profilePicture',
        'organization', 'designation', 'specialization', 'experience',
        'location'
      ];
    } else if (req.user.role === 'student') {
      // Student fields
      allowed = [
        'firstName', 'lastName', 'email', 'mobile', 'profilePicture',
        'organization', 'designation', 'department', 'batch',
        'location'
      ];
    }
    
    console.log('Allowed fields for role:', allowed);
    
    // Build updates object with only allowed fields
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    console.log('Updates to apply:', updates);

    // Auto-update fullName and name when firstName or lastName changes
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const firstName = updates.firstName !== undefined ? updates.firstName : req.user.firstName || '';
      const lastName = updates.lastName !== undefined ? updates.lastName : req.user.lastName || '';
      updates.fullName = `${firstName} ${lastName}`.trim();
      updates.name = updates.fullName;
      console.log('Auto-updating fullName to:', updates.fullName);
    }

    // Perform the update
    const user = await Model.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('✅ Profile updated successfully');
    console.log('Updated user:', user);

    // Clear Redis cache for this user
    try {
      const { cacheDel } = await import('../config/redis.js');
      await cacheDel(`user:${req.user._id}`);
      console.log('✅ Redis cache cleared for user');
    } catch (cacheError) {
      console.error('⚠️  Failed to clear cache:', cacheError);
      // Continue anyway - cache will expire eventually
    }

    // Update localStorage by returning fresh data
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        message: `This ${field} is already in use. Please use a different ${field}.` 
      });
    }
    
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Change password ──────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    console.log('📥 Change password request received');
    console.log('User ID:', req.user._id);
    console.log('User Role:', req.user.role);
    
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      console.log('❌ Missing password fields');
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const Model = getUserModel(req.user.role);
    console.log('Using model:', Model.modelName);
    
    const user = await Model.findById(req.user._id).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('Comparing passwords...');
    // Use the comparePassword method from the model
    const isMatch = await user.comparePassword(currentPassword);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Current password incorrect');
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    console.log('Updating password...');
    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log('✅ Password changed successfully');
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get all users (admin) ────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, isApproved } = req.query;
    
    // Use unified User model
    const filter = {};
    
    // Filter by role if specified
    if (role) {
      filter.role = role;
    }
    
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);
    
    // Add role field
    const usersWithRole = users.map(user => ({
      ...user,
      role: role || user.role
    }));

    res.json({
      success: true,
      data: usersWithRole,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Approve user ─────────────────────────────────────────────────────────────
export const approveUser = async (req, res) => {
  try {
    // Try to find user in all three models
    let user = await Trainer.findById(req.params.userId);
    let Model = Trainer;
    
    if (!user) {
      user = await Participant.findById(req.params.userId);
      Model = Participant;
    }
    
    if (!user) {
      user = await Admin.findById(req.params.userId);
      Model = Admin;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user = await Model.findByIdAndUpdate(
      req.params.userId,
      { isApproved: true, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    ).select('-password');

    res.json({ success: true, message: 'User approved', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Reject / deactivate user ─────────────────────────────────────────────────
export const rejectUser = async (req, res) => {
  try {
    // Try to find user in all three models
    let user = await Trainer.findById(req.params.userId);
    let Model = Trainer;
    
    if (!user) {
      user = await Participant.findById(req.params.userId);
      Model = Participant;
    }
    
    if (!user) {
      user = await Admin.findById(req.params.userId);
      Model = Admin;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user = await Model.findByIdAndUpdate(
      req.params.userId,
      { isApproved: false, isActive: false },
      { new: true }
    ).select('-password');

    res.json({ success: true, message: 'User rejected', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete user (admin) ──────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    // Try to find and delete user from all three models
    let user = await Trainer.findByIdAndDelete(req.params.userId);
    
    if (!user) {
      user = await Participant.findByIdAndDelete(req.params.userId);
    }
    
    if (!user) {
      user = await Admin.findByIdAndDelete(req.params.userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get pending approvals ────────────────────────────────────────────────────
export const getPendingApprovals = async (req, res) => {
  try {
    // Get pending approvals from unified User model
    const users = await User.find({ isApproved: false, isActive: true })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: users, total: users.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
