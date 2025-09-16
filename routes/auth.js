const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create new user
        const user = new User({
            first_name: firstName,
            last_name: lastName,
            email,
            password
        });

        await user.save();

        // Return user data (without password)
        const userData = {
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            profileImage: user.profile_image,
            depositAmount: user.deposit_amount,
            totalAmount: user.total_amount,
            status: user.status,
            accountStatus: user.account_status,
            createdAt: user.created_at
        };

        // Only generate token if account is approved
        if (user.account_status === 'approved') {
            const token = generateToken(user._id);
            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: userData
            });
        } else {
            // For pending users, don't return token
            res.status(201).json({
                message: 'Registration successful. Your account is under review and will be activated after admin approval.',
                user: userData,
                requiresApproval: true
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if account is blocked
        if (user.status === 'blocked') {
            return res.status(403).json({ message: 'Account is blocked' });
        }

        // Check account status
        if (user.account_status === 'pending') {
            return res.status(403).json({
                message: 'Your account is under review. Please wait for admin approval before you can access your account.',
                accountStatus: 'pending'
            });
        }

        if (user.account_status === 'rejected') {
            return res.status(403).json({
                message: 'Your account has been rejected. Please contact support for more information.',
                accountStatus: 'rejected'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user._id);

        // Return user data (without password)
        const userData = {
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            profileImage: user.profile_image,
            depositAmount: user.deposit_amount,
            totalAmount: user.total_amount,
            status: user.status,
            accountStatus: user.account_status,
            role: user.role,
            createdAt: user.created_at
        };

        res.json({
            message: 'Login successful',
            token,
            user: userData
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   POST /api/auth/admin/login
// @desc    Admin login
// @access  Public
router.post('/admin/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin user by email
        const admin = await User.findOne({ email, role: 'admin' });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid admin credentials' });
        }

        // Check if account is blocked
        if (admin.status === 'blocked') {
            return res.status(403).json({ message: 'Admin account is blocked' });
        }

        // Check password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid admin credentials' });
        }

        // Generate token
        const token = generateToken(admin._id);

        // Return admin data (without password)
        const adminData = {
            id: admin._id,
            firstName: admin.first_name,
            lastName: admin.last_name,
            email: admin.email,
            profileImage: admin.profile_image,
            role: admin.role,
            createdAt: admin.created_at
        };

        res.json({
            message: 'Admin login successful',
            token,
            user: adminData
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error during admin login' });
    }
});

// @route   POST /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.post('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        if (user.status === 'blocked') {
            return res.status(403).json({ message: 'Account is blocked' });
        }

        const userData = {
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            profileImage: user.profile_image,
            depositAmount: user.deposit_amount,
            totalAmount: user.total_amount,
            status: user.status,
            accountStatus: user.account_status,
            role: user.role,
            createdAt: user.created_at
        };

        res.json({ user: userData });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate input
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        // Verify old password
        const isOldPasswordValid = await user.comparePassword(oldPassword);
        if (!isOldPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Check if new password is different from old password
        const isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({ message: 'New password must be different from current password' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
