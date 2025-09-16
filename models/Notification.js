const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    type: {
        type: String,
        required: [true, 'Type is required'],
        enum: ['deposit', 'withdrawal', 'profit', 'general', 'balance_increase', 'balance_decrease', 'balance_adjustment']
    },
    user_status: {
        type: String,
        enum: ['read', 'unread'],
        default: 'unread'
    },
    admin_status: {
        type: String,
        enum: ['read', 'unread'],
        default: 'unread'
    },
    action_url: {
        type: String,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
notificationSchema.index({ user_id: 1, user_status: 1, created_at: -1 });
notificationSchema.index({ admin_status: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
