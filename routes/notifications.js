const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications/debug
// @desc    Debug notification IDs
// @access  Private
router.get('/debug', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user_id: req.user._id }).limit(5);
        const debugInfo = notifications.map(notification => ({
            id: notification._id,
            idLength: notification._id?.length,
            idString: String(notification._id),
            idType: typeof notification._id,
            message: notification.message
        }));

        res.json({
            debugInfo,
            totalNotifications: notifications.length
        });
    } catch (error) {
        console.error('Debug notifications error:', error);
        res.status(500).json({ message: 'Failed to debug notifications' });
    }
});

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status; // 'read', 'unread', or undefined for all

        // Build query
        const query = { user_id: req.user._id };
        if (status) {
            query.user_status = status;
        }

        const notifications = await Notification.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({
            user_id: req.user._id,
            user_status: 'unread'
        });

        const notificationList = notifications.map(notification => {
            // Ensure we're getting the proper ObjectId string
            const notificationId = notification._id.toString();
            const mappedNotification = {
                id: notificationId,
                message: notification.message,
                type: notification.type,
                status: notification.user_status,
                actionUrl: notification.action_url,
                date: notification.created_at
            };
            console.log('Mapping notification:', {
                originalId: notification._id,
                originalIdType: typeof notification._id,
                mappedId: mappedNotification.id,
                idLength: mappedNotification.id?.length,
                idString: String(mappedNotification.id),
                isObjectId: notification._id instanceof require('mongoose').Types.ObjectId
            });
            return mappedNotification;
        });

        res.json({
            notifications: notificationList,
            unreadCount,
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

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notificationId = req.params.id;
        console.log('Mark as read - Notification ID:', notificationId, 'Length:', notificationId?.length);

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

        const notification = await Notification.findOne({
            _id: objectId,
            user_id: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.user_status === 'read') {
            return res.json({ message: 'Notification is already marked as read' });
        }

        notification.user_status = 'read';
        await notification.save();

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.user._id, user_status: 'unread' },
            { user_status: 'read' }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const notificationId = req.params.id;
        console.log('Delete notification - ID:', notificationId, 'Length:', notificationId?.length);

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

        const notification = await Notification.findOneAndDelete({
            _id: objectId,
            user_id: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Delete all notifications
// @access  Private
router.delete('/clear-all', auth, async (req, res) => {
    try {
        await Notification.deleteMany({ user_id: req.user._id });

        res.json({ message: 'All notifications deleted successfully' });
    } catch (error) {
        console.error('Clear all notifications error:', error);
        res.status(500).json({ message: 'Failed to clear all notifications' });
    }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
    try {
        const unreadCount = await Notification.countDocuments({
            user_id: req.user._id,
            user_status: 'unread'
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ message: 'Failed to get unread count' });
    }
});

module.exports = router;
