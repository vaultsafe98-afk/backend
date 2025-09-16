const express = require('express');
const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Notification = require('../models/Notification');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/dashboard-stats
// @desc    Get dashboard statistics
// @access  Admin
router.get('/dashboard-stats', adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalDeposits = await Deposit.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawals = await Withdrawal.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const pendingDeposits = await Deposit.countDocuments({ status: 'pending' });
        const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

        res.json({
            totalUsers,
            totalDeposits: totalDeposits[0]?.total || 0,
            totalWithdrawals: totalWithdrawals[0]?.total || 0,
            pendingDeposits,
            pendingWithdrawals,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
    }
});

// @route   GET /api/admin/deposits
// @desc    Get all deposit requests
// @access  Admin
router.get('/deposits', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status; // 'pending', 'approved', 'rejected'

        const query = {};
        if (status) {
            query.status = status;
        }

        const deposits = await Deposit.find(query)
            .populate('user_id', 'first_name last_name email')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Deposit.countDocuments(query);

        const depositList = deposits.map(deposit => ({
            id: deposit._id,
            user: {
                id: deposit.user_id._id,
                name: `${deposit.user_id.first_name} ${deposit.user_id.last_name}`,
                email: deposit.user_id.email
            },
            amount: deposit.amount,
            status: deposit.status,
            screenshotUrl: deposit.screenshot_url,
            adminNotes: deposit.admin_notes,
            createdAt: deposit.created_at,
            updatedAt: deposit.updated_at
        }));

        res.json({
            deposits: depositList,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get deposits error:', error);
        res.status(500).json({ message: 'Failed to fetch deposits' });
    }
});

// @route   PUT /api/admin/deposit/:id/approve
// @desc    Approve deposit request
// @access  Admin
router.put('/deposit/:id/approve', adminAuth, async (req, res) => {
    try {
        const { adminNotes } = req.body;

        const deposit = await Deposit.findById(req.params.id);
        if (!deposit) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        if (deposit.status !== 'pending') {
            return res.status(400).json({ message: 'Deposit is not pending' });
        }

        // Update deposit status
        deposit.status = 'approved';
        deposit.admin_notes = adminNotes || '';
        await deposit.save();

        // Update user balance
        const user = await User.findById(deposit.user_id);
        user.deposit_amount += deposit.amount;
        user.calculateTotalAmount();
        await user.save();

        // Create notification
        const notification = new Notification({
            user_id: deposit.user_id,
            message: `Your deposit of $${deposit.amount} has been approved and added to your account`,
            type: 'deposit'
        });
        await notification.save();

        res.json({ message: 'Deposit approved successfully' });
    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ message: 'Failed to approve deposit' });
    }
});

// @route   PUT /api/admin/deposit/:id/reject
// @desc    Reject deposit request
// @access  Admin
router.put('/deposit/:id/reject', adminAuth, async (req, res) => {
    try {
        const { adminNotes } = req.body;

        const deposit = await Deposit.findById(req.params.id);
        if (!deposit) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        if (deposit.status !== 'pending') {
            return res.status(400).json({ message: 'Deposit is not pending' });
        }

        // Update deposit status
        deposit.status = 'rejected';
        deposit.admin_notes = adminNotes || '';
        await deposit.save();

        // Create notification
        const notification = new Notification({
            user_id: deposit.user_id,
            message: `Your deposit of $${deposit.amount} has been rejected. ${adminNotes ? 'Reason: ' + adminNotes : ''}`,
            type: 'deposit'
        });
        await notification.save();

        res.json({ message: 'Deposit rejected successfully' });
    } catch (error) {
        console.error('Reject deposit error:', error);
        res.status(500).json({ message: 'Failed to reject deposit' });
    }
});

// @route   GET /api/admin/withdrawals
// @desc    Get all withdrawal requests
// @access  Admin
router.get('/withdrawals', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;

        const query = {};
        if (status) {
            query.status = status;
        }

        const withdrawals = await Withdrawal.find(query)
            .populate('user_id', 'first_name last_name email')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Withdrawal.countDocuments(query);

        const withdrawalList = withdrawals.map(withdrawal => ({
            id: withdrawal._id,
            user: {
                id: withdrawal.user_id._id,
                name: `${withdrawal.user_id.first_name} ${withdrawal.user_id.last_name}`,
                email: withdrawal.user_id.email
            },
            amount: withdrawal.amount,
            platform: withdrawal.platform,
            walletAddress: withdrawal.wallet_address,
            status: withdrawal.status,
            adminNotes: withdrawal.admin_notes,
            createdAt: withdrawal.created_at,
            updatedAt: withdrawal.updated_at
        }));

        res.json({
            withdrawals: withdrawalList,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ message: 'Failed to fetch withdrawals' });
    }
});

// @route   PUT /api/admin/withdraw/:id/approve
// @desc    Approve withdrawal request
// @access  Admin
router.put('/withdraw/:id/approve', adminAuth, async (req, res) => {
    try {
        const { adminNotes } = req.body;

        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal not found' });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({ message: 'Withdrawal is not pending' });
        }

        // Check if user has sufficient balance
        const user = await User.findById(withdrawal.user_id);
        if (user.total_amount < withdrawal.amount) {
            return res.status(400).json({ message: 'User has insufficient balance' });
        }

        // Update withdrawal status
        withdrawal.status = 'approved';
        withdrawal.admin_notes = adminNotes || '';
        await withdrawal.save();

        // Update user balance
        user.total_amount -= withdrawal.amount;
        // Deduct from deposit amount
        user.deposit_amount -= withdrawal.amount;
        await user.save();

        // Create notification
        const notification = new Notification({
            user_id: withdrawal.user_id,
            message: `Your withdrawal of $${withdrawal.amount} to ${withdrawal.platform} has been approved`,
            type: 'withdrawal'
        });
        await notification.save();

        res.json({ message: 'Withdrawal approved successfully' });
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ message: 'Failed to approve withdrawal' });
    }
});

// @route   PUT /api/admin/withdraw/:id/reject
// @desc    Reject withdrawal request
// @access  Admin
router.put('/withdraw/:id/reject', adminAuth, async (req, res) => {
    try {
        const { adminNotes } = req.body;

        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal not found' });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({ message: 'Withdrawal is not pending' });
        }

        // Update withdrawal status
        withdrawal.status = 'rejected';
        withdrawal.admin_notes = adminNotes || '';
        await withdrawal.save();

        // Create notification
        const notification = new Notification({
            user_id: withdrawal.user_id,
            message: `Your withdrawal of $${withdrawal.amount} to ${withdrawal.platform} has been rejected. ${adminNotes ? 'Reason: ' + adminNotes : ''}`,
            type: 'withdrawal'
        });
        await notification.save();

        res.json({ message: 'Withdrawal rejected successfully' });
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({ message: 'Failed to reject withdrawal' });
    }
});

// @route   GET /api/admin/reports/summary
// @desc    Get summary reports
// @access  Admin
router.get('/reports/summary', adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });
        const blockedUsers = await User.countDocuments({ status: 'blocked' });

        const totalDeposits = await Deposit.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalWithdrawals = await Withdrawal.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const pendingDeposits = await Deposit.countDocuments({ status: 'pending' });
        const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

        res.json({
            totalUsers: totalUsers,
            totalDeposits: totalDeposits[0]?.total || 0,
            totalWithdrawals: totalWithdrawals[0]?.total || 0,
            pendingDeposits,
            pendingWithdrawals
        });
    } catch (error) {
        console.error('Get summary reports error:', error);
        res.status(500).json({ message: 'Failed to fetch summary reports' });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users with search and pagination
// @access  Admin
router.get('/users', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

        // Build search query
        const query = {};
        if (search) {
            query.$or = [
                { first_name: { $regex: search, $options: 'i' } },
                { last_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('first_name last_name email deposit_amount total_amount status role created_at')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        const userList = users.map(user => ({
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            depositAmount: user.deposit_amount,
            totalAmount: user.total_amount,
            status: user.status,
            role: user.role,
            createdAt: user.created_at
        }));

        res.json({
            users: userList,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// @route   GET /api/admin/users/:id
// @desc    Get specific user details
// @access  Admin
router.get('/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            profileImage: user.profile_image,
            depositAmount: user.deposit_amount,
            totalAmount: user.total_amount,
            status: user.status,
            role: user.role,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});

// @route   PUT /api/admin/users/:id/block
// @desc    Block user
// @access  Admin
router.put('/users/:id/block', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = 'blocked';
        await user.save();

        // Create notification
        const notification = new Notification({
            user_id: user._id,
            message: 'Your account has been blocked by admin',
            type: 'general'
        });
        await notification.save();

        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ message: 'Failed to block user' });
    }
});

// @route   PUT /api/admin/users/:id/unblock
// @desc    Unblock user
// @access  Admin
router.put('/users/:id/unblock', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = 'active';
        await user.save();

        // Create notification
        const notification = new Notification({
            user_id: user._id,
            message: 'Your account has been unblocked by admin',
            type: 'general'
        });
        await notification.save();

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ message: 'Failed to unblock user' });
    }
});

// @route   PUT /api/admin/users/:id/reset-password
// @desc    Reset user password
// @access  Admin
router.put('/users/:id/reset-password', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate new password
        const newPassword = Math.random().toString(36).slice(-8);
        user.password = newPassword;
        await user.save();

        // Create notification
        const notification = new Notification({
            user_id: user._id,
            message: `Your password has been reset by admin. New password: ${newPassword}`,
            type: 'general'
        });
        await notification.save();

        res.json({
            message: 'Password reset successfully',
            newPassword: newPassword // Only for admin to see
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

// @route   GET /api/admin/notifications
// @desc    Get all notifications
// @access  Admin
router.get('/notifications', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find()
            .populate('user_id', 'first_name last_name email')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments();

        const notificationList = notifications.map(notification => ({
            id: notification._id,
            user: notification.user_id ? {
                id: notification.user_id._id,
                name: `${notification.user_id.first_name} ${notification.user_id.last_name}`,
                email: notification.user_id.email
            } : null,
            message: notification.message,
            type: notification.type,
            status: notification.admin_status,
            actionUrl: notification.action_url,
            createdAt: notification.created_at
        }));

        res.json({
            notifications: notificationList,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

// @route   POST /api/admin/notifications
// @desc    Send notification to user
// @access  Admin
router.post('/notifications', adminAuth, async (req, res) => {
    try {
        const { userId, message, type } = req.body;

        if (!userId || !message || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const notification = new Notification({
            user_id: userId,
            message: message,
            type: type
        });
        await notification.save();

        res.json({ message: 'Notification sent successfully' });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ message: 'Failed to send notification' });
    }
});

// @route   GET /api/admin/settings
// @desc    Get system settings
// @access  Admin
router.get('/settings', adminAuth, async (req, res) => {
    try {
        // For now, return mock settings. In production, this would come from a Settings model
        res.json({
            walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Mock Bitcoin address
            systemStatus: 'active',
            maintenanceMode: false,
            profitRate: 0.05, // 5% daily profit
            minimumDeposit: 100,
            maximumWithdrawal: 10000
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
});

// @route   PUT /api/admin/settings/wallet-address
// @desc    Update wallet address
// @access  Admin
router.put('/settings/wallet-address', adminAuth, async (req, res) => {
    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({ message: 'Wallet address is required' });
        }

        // In production, this would update a Settings model
        // For now, just return success
        res.json({ message: 'Wallet address updated successfully' });
    } catch (error) {
        console.error('Update wallet address error:', error);
        res.status(500).json({ message: 'Failed to update wallet address' });
    }
});

// @route   GET /api/admin/profile
// @desc    Get admin profile
// @access  Admin
router.get('/profile', adminAuth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('-password');

        res.json({
            id: admin._id,
            firstName: admin.first_name,
            lastName: admin.last_name,
            email: admin.email,
            profileImage: admin.profile_image,
            role: admin.role,
            createdAt: admin.created_at
        });
    } catch (error) {
        console.error('Get admin profile error:', error);
        res.status(500).json({ message: 'Failed to fetch admin profile' });
    }
});

// @route   PUT /api/admin/profile
// @desc    Update admin profile
// @access  Admin
router.put('/profile', adminAuth, async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const admin = await User.findById(req.user.id);

        if (firstName) admin.first_name = firstName;
        if (lastName) admin.last_name = lastName;
        if (email) admin.email = email;
        if (password) admin.password = password; // Will be hashed by pre-save hook

        await admin.save();

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update admin profile error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// @route   PUT /api/admin/notifications/:id/read
// @desc    Mark notification as read by admin
// @access  Admin
router.put('/notifications/:id/read', adminAuth, async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Basic validation - just check if ID exists
        if (!notificationId) {
            console.error('No notification ID provided');
            return res.status(400).json({ message: 'Notification ID is required' });
        }

        // Convert string ID back to ObjectId for database query
        const mongoose = require('mongoose');
        let objectId;
        try {
            objectId = new mongoose.Types.ObjectId(notificationId);
        } catch (error) {
            console.error('Invalid ObjectId format:', notificationId, error);
            return res.status(400).json({ message: 'Invalid notification ID format' });
        }

        const notification = await Notification.findById(objectId);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.admin_status === 'read') {
            return res.json({ message: 'Notification is already marked as read by admin' });
        }

        notification.admin_status = 'read';
        await notification.save();

        res.json({ message: 'Notification marked as read by admin' });
    } catch (error) {
        console.error('Mark notification as read by admin error:', error);
        res.status(500).json({ message: 'Failed to mark notification as read by admin' });
    }
});

// @route   PUT /api/admin/notifications/read-all
// @desc    Mark all notifications as read by admin
// @access  Admin
router.put('/notifications/read-all', adminAuth, async (req, res) => {
    try {
        await Notification.updateMany(
            { admin_status: 'unread' },
            { admin_status: 'read' }
        );

        res.json({ message: 'All notifications marked as read by admin' });
    } catch (error) {
        console.error('Mark all notifications as read by admin error:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read by admin' });
    }
});

// @route   PUT /api/admin/users/:id/balance
// @desc    Adjust user balance
// @access  Admin
router.put('/users/:id/balance', adminAuth, async (req, res) => {
    try {
        const { newBalance, reason } = req.body;

        // Validation
        if (newBalance === undefined || newBalance < 0) {
            return res.status(400).json({ message: 'New balance must be a non-negative number' });
        }

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ message: 'Reason for balance adjustment is required' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const oldBalance = user.deposit_amount;
        const balanceChange = newBalance - oldBalance;

        // Update user balance
        user.deposit_amount = newBalance;
        user.calculateTotalAmount();
        await user.save();

        // Create notification for the user
        let notificationMessage;
        let notificationType;

        if (balanceChange > 0) {
            notificationMessage = `Your balance has been increased by $${balanceChange.toFixed(2)}. Reason: ${reason}`;
            notificationType = 'balance_increase';
        } else if (balanceChange < 0) {
            notificationMessage = `Your balance has been decreased by $${Math.abs(balanceChange).toFixed(2)}. Reason: ${reason}`;
            notificationType = 'balance_decrease';
        } else {
            notificationMessage = `Balance adjustment processed. Reason: ${reason}`;
            notificationType = 'balance_adjustment';
        }

        const notification = new Notification({
            user_id: user._id,
            message: notificationMessage,
            type: notificationType
        });
        await notification.save();

        res.json({
            message: 'User balance updated successfully',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                oldBalance,
                newBalance,
                balanceChange,
                totalAmount: user.total_amount
            }
        });
    } catch (error) {
        console.error('Adjust user balance error:', error);
        res.status(500).json({ message: 'Failed to adjust user balance' });
    }
});

// @route   GET /api/admin/pending-users
// @desc    Get all pending users
// @access  Admin
router.get('/pending-users', adminAuth, async (req, res) => {
    try {
        const pendingUsers = await User.find({ account_status: 'pending' })
            .select('-password')
            .sort({ created_at: -1 });

        const users = pendingUsers.map(user => ({
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
        }));

        res.json(users);
    } catch (error) {
        console.error('Get pending users error:', error);
        res.status(500).json({ message: 'Failed to fetch pending users' });
    }
});

// @route   PUT /api/admin/users/:id/approve
// @desc    Approve user account
// @access  Admin
router.put('/users/:id/approve', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.account_status !== 'pending') {
            return res.status(400).json({ message: 'User account is not pending approval' });
        }

        // Update account status
        user.account_status = 'approved';
        await user.save();

        // Create notification for the user
        const notification = new Notification({
            user_id: user._id,
            message: 'Congratulations! Your account has been approved. You can now access all features of SafeVault.',
            type: 'general'
        });
        await notification.save();

        res.json({
            message: 'User account approved successfully',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                accountStatus: user.account_status
            }
        });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ message: 'Failed to approve user account' });
    }
});

// @route   PUT /api/admin/users/:id/reject
// @desc    Reject user account
// @access  Admin
router.put('/users/:id/reject', adminAuth, async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ message: 'Reason for rejection is required' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.account_status !== 'pending') {
            return res.status(400).json({ message: 'User account is not pending approval' });
        }

        // Update account status
        user.account_status = 'rejected';
        await user.save();

        // Create notification for the user
        const notification = new Notification({
            user_id: user._id,
            message: `Your account has been rejected. Reason: ${reason}. Please contact support if you have any questions.`,
            type: 'general'
        });
        await notification.save();

        res.json({
            message: 'User account rejected successfully',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                accountStatus: user.account_status
            }
        });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({ message: 'Failed to reject user account' });
    }
});

module.exports = router;
