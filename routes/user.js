const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');
const imagekitService = require('../services/imagekitService');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for profile images
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype || extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        const userData = {
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            profileImage: user.profile_image,
            depositAmount: user.deposit_amount,
            profitAmount: user.profit_amount,
            totalAmount: user.total_amount,
            status: user.status,
            role: user.role,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };

        res.json({ user: userData });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, validateProfileUpdate, async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const updateData = {};

        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;
        if (email) {
            // Check if email is already taken by another user
            const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email is already taken' });
            }
            updateData.email = email;
        }
        if (password) updateData.password = password;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        const userData = {
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            profileImage: user.profile_image,
            depositAmount: user.deposit_amount,
            profitAmount: user.profit_amount,
            totalAmount: user.total_amount,
            status: user.status,
            role: user.role,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };

        res.json({
            message: 'Profile updated successfully',
            user: userData
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/user/profile-image
// @desc    Upload profile image
// @access  Private
router.post('/profile-image', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Upload to ImageKit
        const imageUrl = await imagekitService.uploadImage(req.file, 'profile-images');

        // Update user profile image
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profile_image: imageUrl },
            { new: true }
        ).select('-password');

        res.json({
            message: 'Profile image uploaded successfully',
            profileImage: user.profile_image
        });
    } catch (error) {
        console.error('Profile image upload error:', error);
        res.status(500).json({ message: 'Failed to upload profile image' });
    }
});

// @route   DELETE /api/user/profile-image
// @desc    Delete profile image
// @access  Private
router.delete('/profile-image', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user.profile_image) {
            // For ImageKit, we would need the fileId to delete
            // For now, we'll just update the database
            // In production, you'd store the fileId and use it for deletion
            console.log('Profile image deletion requested for:', user.profile_image);
        }

        // Update user profile image to null
        await User.findByIdAndUpdate(req.user._id, { profile_image: null });

        res.json({ message: 'Profile image deleted successfully' });
    } catch (error) {
        console.error('Profile image delete error:', error);
        res.status(500).json({ message: 'Failed to delete profile image' });
    }
});

module.exports = router;
