import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import { notifier } from '../services/notification.service.js';
import { AppError } from '../utils/AppError.js';
import { encrypt, compare } from '../utils/password.js';
import { sendVerificationEmail, sendInvitationEmail } from '../services/mail.service.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
import {
  registerSchema,
  loginSchema,
  validationSchema,
  onboardingSchema,
  companyOnboardingSchema,
  inviteSchema,
  changePasswordSchema,
} from '../schemas/user.schema.js';

// Helper to generate 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. Register
export const register = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400));
    }
    const { email, password } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) {
      return next(new AppError('Email already registered', 409));
    }

    const hashed = await encrypt(password);
    const code = generateCode();

    const user = await User.create({
      email,
      password: hashed,
      verificationCode: code,
      verificationAttempts: 0,
    });

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await User.findByIdAndUpdate(user._id, { refreshToken });
    
    await sendVerificationEmail(user.email, code).catch(console.error); 
    notifier.emit('user:registered', { email: user.email, verificationCode: code });

    return res.status(201).json({
      token: accessToken,
      refreshToken,
      user: { _id: user._id, email: user.email, status: user.status, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// 2. Email Validation
export const validateEmail = async (req, res, next) => {
  try {
    const parsed = validationSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400));
    }
    const { code } = parsed.data;

    const user = await User.findById(req.user._id)
      .select('+verificationCode +verificationAttempts');

    if (user.status === 'verified') {
      return next(new AppError('Email already verified', 400));
    }

    if (user.verificationAttempts >= 3) {
      return res.status(429).json({
        error: true,
        message: 'Too many attempts. Account locked for verification.',
      });
    }

    if (user.verificationCode !== code) {
      await User.findByIdAndUpdate(user._id, { $inc: { verificationAttempts: 1 } });
      const remaining = 2 - user.verificationAttempts;
      return next(new AppError(`Invalid code. ${remaining} attempt(s) remaining.`, 400));
    }

    await User.findByIdAndUpdate(user._id, {
      status: 'verified',
      verificationCode: null,
      verificationAttempts: 0,
    });

    notifier.emit('user:verified', { email: user.email });

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

// 3. Login
export const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400));
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({ email, deleted: false }).select('+password');
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      return next(new AppError('Invalid credentials', 401));
    }

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    return res.status(200).json({
      token: accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        company: user.company,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 4. Personal Onboarding
export const onboarding = async (req, res, next) => {
  try {
    const parsed = onboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400));
    }
    const { name, lastName, NIF } = parsed.data;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, lastName, NIF },
      { new: true }
    ).populate('company');

    return res.status(200).json({ user: updated });
  } catch (err) {
    next(err);
  }
};

// 5. Company Onboarding
export const companyOnboarding = async (req, res, next) => {
  try {
    const parsed = companyOnboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400));
    }
    const data = parsed.data;

    const user = await User.findById(req.user._id);

    let company;
    let isFreelance = data.isFreelance;

    // Determine CIF: freelancers use their NIF as CIF
    const cif = isFreelance ? user.NIF : data.CIF;

    if (!cif) {
      return next(new AppError('NIF is required for freelance company creation. Run personal onboarding first.', 400));
    }

    // Try to find existing company with this CIF
    const existing = await Company.findOne({ CIF: cif.toUpperCase(), deleted: false });

    if (existing) {
      // Join existing company as guest
      await User.findByIdAndUpdate(user._id, {
        company: existing._id,
        role: 'guest',
      });
      company = existing;
    } else {
      // Create new company — user becomes owner/admin
      company = await Company.create({
        owner: user._id,
        name: data.name,
        CIF: cif.toUpperCase(),
        address: data.address || {},
        isFreelance,
      });
      await User.findByIdAndUpdate(user._id, {
        company: company._id,
        role: 'admin',
      });
    }

    const updatedUser = await User.findById(user._id).populate('company');
    return res.status(200).json({ user: updatedUser, company });
  } catch (err) {
    next(err);
  }
};

// 6. Upload Company Logo
export const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const user = await User.findById(req.user._id);
    if (!user.company) {
      return next(new AppError('User has no associated company', 400));
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    const company = await Company.findByIdAndUpdate(
      user.company,
      { logoUrl },
      { new: true }
    );

    return res.status(200).json({ company, logoUrl });
  } catch (err) {
    next(err);
  }
};

// 7. Get User
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('company');
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// 8a. Refresh Token
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return next(new AppError('Refresh token required', 400));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== token || user.deleted) {
      return next(new AppError('Invalid refresh token', 401));
    }

    const accessToken     = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    return res.status(200).json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// 8b. Logout
export const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// 9. Delete User
export const deleteUser = async (req, res, next) => {
  try {
    const soft = req.query.soft === 'true';
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (soft) {
      await User.findByIdAndUpdate(user._id, { deleted: true, refreshToken: null });
      notifier.emit('user:deleted', { email: user.email, deleted: true });
      return res.status(200).json({ message: 'User soft-deleted successfully' });
    } else {
      await User.findByIdAndDelete(user._id);
      notifier.emit('user:deleted', { email: user.email, deleted: false });
      return res.status(200).json({ message: 'User permanently deleted' });
    }
  } catch (err) {
    next(err);
  }
};

// 10. Invite Colleague
export const inviteUser = async (req, res, next) => {
  try {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400));
    }
    const { email, name, lastName } = parsed.data;

    const admin = await User.findById(req.user._id);
    if (!admin.company) {
      return next(new AppError('Admin has no company assigned', 400));
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return next(new AppError('Email already registered', 409));
    }

    // Generate a temporary password
    const tempPassword = generateCode() + 'Aa!';
    const hashed = await encrypt(tempPassword);
    const code = generateCode();

    const invitedUser = await User.create({
      email,
      password: hashed,
      name: name || '',
      lastName: lastName || '',
      role: 'guest',
      company: admin.company,
      verificationCode: code,
      verificationAttempts: 0,
    });

    await sendInvitationEmail(invitedUser.email, tempPassword, admin.company.name).catch(console.error);
    notifier.emit('user:invited', {
      email: invitedUser.email,
      company: admin.company,
      tempPassword,
    });

    return res.status(201).json({
      message: 'User invited successfully',
      user: {
        _id: invitedUser._id,
        email: invitedUser.email,
        role: invitedUser.role,
        company: invitedUser.company,
        tempPassword, // In production this would be emailed
      },
    });
  } catch (err) {
    next(err);
  }
};

// BONUS: Change Password
export const changePassword = async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400));
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const valid = await compare(currentPassword, user.password);
    if (!valid) {
      return next(new AppError('Current password is incorrect', 401));
    }

    const hashed = await encrypt(newPassword);
    await User.findByIdAndUpdate(user._id, { password: hashed, refreshToken: null });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};
