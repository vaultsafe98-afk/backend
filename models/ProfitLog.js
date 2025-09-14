const mongoose = require('mongoose');

const profitLogSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    deposit_amount: {
        type: Number,
        required: [true, 'Deposit amount is required'],
        min: [0, 'Deposit amount cannot be negative']
    },
    profit_rate: {
        type: Number,
        default: 0.01, // 1% daily
        min: [0, 'Profit rate cannot be negative']
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
profitLogSchema.index({ user_id: 1, date: -1 });

module.exports = mongoose.model('ProfitLog', profitLogSchema);
