const express = require('express');
const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const ProfitLog = require('../models/ProfitLog');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/wallet
// @desc    Get user wallet balance
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Calculate total amount
        user.calculateTotalAmount();
        await user.save();

        res.json({
            balance: {
                deposit: user.deposit_amount,
                profit: user.profit_amount,
                total: user.total_amount
            },
            lastUpdated: user.updated_at
        });
    } catch (error) {
        console.error('Get wallet balance error:', error);
        res.status(500).json({ message: 'Failed to fetch wallet balance' });
    }
});

// @route   GET /api/wallet/transactions
// @desc    Get all user transactions (deposits, withdrawals, profits)
// @access  Private
router.get('/transactions', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get deposits
        const deposits = await Deposit.find({ user_id: req.user._id })
            .sort({ created_at: -1 })
            .select('amount status created_at');

        // Get withdrawals
        const withdrawals = await Withdrawal.find({ user_id: req.user._id })
            .sort({ created_at: -1 })
            .select('amount status platform created_at');

        // Get profit logs
        const profits = await ProfitLog.find({ user_id: req.user._id })
            .sort({ date: -1 })
            .select('amount date created_at');

        // Combine and sort all transactions
        const allTransactions = [
            ...deposits.map(deposit => ({
                id: deposit._id,
                type: 'deposit',
                amount: deposit.amount,
                status: deposit.status,
                date: deposit.created_at,
                description: 'Deposit'
            })),
            ...withdrawals.map(withdrawal => ({
                id: withdrawal._id,
                type: 'withdrawal',
                amount: withdrawal.amount,
                status: withdrawal.status,
                date: withdrawal.created_at,
                description: `Withdrawal to ${withdrawal.platform}`
            })),
            ...profits.map(profit => ({
                id: profit._id,
                type: 'profit',
                amount: profit.amount,
                status: 'approved',
                date: profit.date,
                description: 'Daily Profit'
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Apply pagination
        const paginatedTransactions = allTransactions.slice(skip, skip + limit);

        res.json({
            transactions: paginatedTransactions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(allTransactions.length / limit),
                totalItems: allTransactions.length,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ message: 'Failed to fetch transactions' });
    }
});

// @route   GET /api/wallet/transactions/deposits
// @desc    Get user's deposit transactions only
// @access  Private
router.get('/transactions/deposits', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const deposits = await Deposit.find({ user_id: req.user._id })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Deposit.countDocuments({ user_id: req.user._id });

        const depositTransactions = deposits.map(deposit => ({
            id: deposit._id,
            type: 'deposit',
            amount: deposit.amount,
            status: deposit.status,
            date: deposit.created_at,
            description: 'Deposit',
            screenshotUrl: deposit.screenshot_url,
            adminNotes: deposit.admin_notes
        }));

        res.json({
            deposits: depositTransactions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get deposit transactions error:', error);
        res.status(500).json({ message: 'Failed to fetch deposit transactions' });
    }
});

// @route   GET /api/wallet/transactions/withdrawals
// @desc    Get user's withdrawal transactions only
// @access  Private
router.get('/transactions/withdrawals', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const withdrawals = await Withdrawal.find({ user_id: req.user._id })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Withdrawal.countDocuments({ user_id: req.user._id });

        const withdrawalTransactions = withdrawals.map(withdrawal => ({
            id: withdrawal._id,
            type: 'withdrawal',
            amount: withdrawal.amount,
            status: withdrawal.status,
            date: withdrawal.created_at,
            description: `Withdrawal to ${withdrawal.platform}`,
            platform: withdrawal.platform,
            walletAddress: withdrawal.wallet_address,
            adminNotes: withdrawal.admin_notes
        }));

        res.json({
            withdrawals: withdrawalTransactions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get withdrawal transactions error:', error);
        res.status(500).json({ message: 'Failed to fetch withdrawal transactions' });
    }
});

// @route   GET /api/wallet/transactions/profits
// @desc    Get user's profit transactions only
// @access  Private
router.get('/transactions/profits', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const profits = await ProfitLog.find({ user_id: req.user._id })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ProfitLog.countDocuments({ user_id: req.user._id });

        const profitTransactions = profits.map(profit => ({
            id: profit._id,
            type: 'profit',
            amount: profit.amount,
            status: 'approved',
            date: profit.date,
            description: 'Daily Profit',
            depositAmount: profit.deposit_amount,
            profitRate: profit.profit_rate
        }));

        res.json({
            profits: profitTransactions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get profit transactions error:', error);
        res.status(500).json({ message: 'Failed to fetch profit transactions' });
    }
});

module.exports = router;
