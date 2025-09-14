const express = require('express');
const multer = require('multer');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { validateDepositRequest } = require('../middleware/validation');
const imagekitService = require('../services/imagekitService');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log('File filter - Original name:', file.originalname);
        console.log('File filter - MIME type:', file.mimetype);
        console.log('File filter - Field name:', file.fieldname);

        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        console.log('File filter - Extension check:', extname);
        console.log('File filter - MIME type check:', mimetype);

        if (mimetype || extname) {
            console.log('File filter - File accepted');
            return cb(null, true);
        } else {
            console.log('File filter - File rejected');
            cb(new Error('Only image files are allowed'));
        }
    }
});

// @route   POST /api/deposit/request
// @desc    Submit deposit request with screenshot
// @access  Private
router.post('/request', auth, upload.single('screenshot'), async (req, res) => {
    try {
        const { amount } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Screenshot is required' });
        }

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Valid amount is required' });
        }

        // Upload screenshot to ImageKit
        const screenshotUrl = await imagekitService.uploadImage(req.file, 'deposit-proofs');

        // Create deposit request
        const deposit = new Deposit({
            user_id: req.user._id,
            screenshot_url: screenshotUrl,
            amount: parseFloat(amount),
            status: 'pending'
        });

        await deposit.save();

        // Create notification
        const notification = new Notification({
            user_id: req.user._id,
            message: `Your deposit request of $${amount} has been submitted and is pending review`,
            type: 'deposit',
            status: 'unread',
            action_url: `/admin/deposits/${deposit._id}`
        });

        await notification.save();
        console.log('Notification created:', {
            id: notification._id,
            idLength: notification._id?.length,
            idString: String(notification._id),
            user_id: notification.user_id,
            message: notification.message
        });

        res.status(201).json({
            message: 'Deposit request submitted successfully',
            deposit: {
                id: deposit._id,
                amount: deposit.amount,
                status: deposit.status,
                screenshotUrl: deposit.screenshot_url,
                createdAt: deposit.created_at
            }
        });
    } catch (error) {
        console.error('Deposit request error:', error);
        res.status(500).json({ message: 'Failed to submit deposit request' });
    }
});

// @route   GET /api/deposit/history
// @desc    Get user's deposit history
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const deposits = await Deposit.find({ user_id: req.user._id })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Deposit.countDocuments({ user_id: req.user._id });

        const depositHistory = deposits.map(deposit => ({
            id: deposit._id,
            amount: deposit.amount,
            status: deposit.status,
            screenshotUrl: deposit.screenshot_url,
            adminNotes: deposit.admin_notes,
            createdAt: deposit.created_at,
            updatedAt: deposit.updated_at
        }));

        res.json({
            deposits: depositHistory,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get deposit history error:', error);
        res.status(500).json({ message: 'Failed to fetch deposit history' });
    }
});

// @route   GET /api/deposit/:id
// @desc    Get specific deposit details
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const deposit = await Deposit.findOne({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!deposit) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        res.json({
            deposit: {
                id: deposit._id,
                amount: deposit.amount,
                status: deposit.status,
                screenshotUrl: deposit.screenshot_url,
                adminNotes: deposit.admin_notes,
                createdAt: deposit.created_at,
                updatedAt: deposit.updated_at
            }
        });
    } catch (error) {
        console.error('Get deposit error:', error);
        res.status(500).json({ message: 'Failed to fetch deposit details' });
    }
});

// @route   GET /api/deposit/auth-params
// @desc    Get ImageKit authentication parameters for client-side uploads
// @access  Private
router.get('/auth-params', auth, async (req, res) => {
    try {
        const authParams = imagekitService.getAuthenticationParameters();
        res.json(authParams);
    } catch (error) {
        console.error('Get auth params error:', error);
        res.status(500).json({ message: 'Failed to get authentication parameters' });
    }
});

module.exports = router;
