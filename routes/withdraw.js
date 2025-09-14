const express = require('express');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { validateWithdrawalRequest } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/withdraw/request
// @desc    Submit withdrawal request
// @access  Private
router.post('/request', auth, validateWithdrawalRequest, async (req, res) => {
    try {
        const { amount, platform, walletAddress } = req.body;

        // Check if user has sufficient balance
        const user = await User.findById(req.user._id);
        if (user.total_amount < parseFloat(amount)) {
            return res.status(400).json({
                message: 'Insufficient balance',
                availableBalance: user.total_amount
            });
        }

        // Create withdrawal request
        const withdrawal = new Withdrawal({
            user_id: req.user._id,
            amount: parseFloat(amount),
            platform,
            wallet_address: walletAddress,
            status: 'pending'
        });

        await withdrawal.save();

        // Create notification
        const notification = new Notification({
            user_id: req.user._id,
            message: `Your withdrawal request of $${amount} to ${platform} has been submitted and is pending review`,
            type: 'withdrawal',
            status: 'unread',
            action_url: `/admin/withdrawals/${withdrawal._id}`
        });

        await notification.save();
        console.log('Withdrawal notification created:', notification);

        res.status(201).json({
            message: 'Withdrawal request submitted successfully',
            withdrawal: {
                id: withdrawal._id,
                amount: withdrawal.amount,
                platform: withdrawal.platform,
                walletAddress: withdrawal.wallet_address,
                status: withdrawal.status,
                createdAt: withdrawal.created_at
            }
        });
    } catch (error) {
        console.error('Withdrawal request error:', error);
        res.status(500).json({ message: 'Failed to submit withdrawal request' });
    }
});

// @route   GET /api/withdraw/history
// @desc    Get user's withdrawal history
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const withdrawals = await Withdrawal.find({ user_id: req.user._id })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Withdrawal.countDocuments({ user_id: req.user._id });

        const withdrawalHistory = withdrawals.map(withdrawal => ({
            id: withdrawal._id,
            amount: withdrawal.amount,
            platform: withdrawal.platform,
            walletAddress: withdrawal.wallet_address,
            status: withdrawal.status,
            adminNotes: withdrawal.admin_notes,
            createdAt: withdrawal.created_at,
            updatedAt: withdrawal.updated_at
        }));

        res.json({
            withdrawals: withdrawalHistory,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get withdrawal history error:', error);
        res.status(500).json({ message: 'Failed to fetch withdrawal history' });
    }
});

// @route   GET /api/withdraw/:id
// @desc    Get specific withdrawal details
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findOne({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal not found' });
        }

        res.json({
            withdrawal: {
                id: withdrawal._id,
                amount: withdrawal.amount,
                platform: withdrawal.platform,
                walletAddress: withdrawal.wallet_address,
                status: withdrawal.status,
                adminNotes: withdrawal.admin_notes,
                createdAt: withdrawal.created_at,
                updatedAt: withdrawal.updated_at
            }
        });
    } catch (error) {
        console.error('Get withdrawal error:', error);
        res.status(500).json({ message: 'Failed to fetch withdrawal details' });
    }
});

module.exports = router;
