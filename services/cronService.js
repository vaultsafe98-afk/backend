const cron = require('cron');
const User = require('../models/User');
const ProfitLog = require('../models/ProfitLog');
const Notification = require('../models/Notification');

class CronService {
    constructor() {
        this.jobs = [];
    }

    // Start all cron jobs
    start() {
        this.startDailyProfitCalculation();
        console.log('Cron jobs started');
    }

    // Stop all cron jobs
    stop() {
        this.jobs.forEach(job => job.stop());
        this.jobs = [];
        console.log('Cron jobs stopped');
    }

    // Daily profit calculation job (runs at midnight)
    startDailyProfitCalculation() {
        const dailyProfitJob = new cron.CronJob('0 0 * * *', async () => {
            console.log('Starting daily profit calculation...');
            await this.calculateDailyProfits();
        }, null, true, 'UTC');

        this.jobs.push(dailyProfitJob);
        console.log('Daily profit calculation job scheduled');
    }

    // Calculate daily profits for all active users
    async calculateDailyProfits() {
        try {
            const activeUsers = await User.find({
                status: 'active',
                deposit_amount: { $gt: 0 }
            });

            console.log(`Calculating profits for ${activeUsers.length} active users`);

            for (const user of activeUsers) {
                try {
                    // Calculate 1% of deposit amount
                    const dailyProfit = user.deposit_amount * 0.01;

                    // Create profit log entry
                    const profitLog = new ProfitLog({
                        user_id: user._id,
                        amount: dailyProfit,
                        deposit_amount: user.deposit_amount,
                        profit_rate: 0.01,
                        date: new Date()
                    });

                    await profitLog.save();

                    // Update user's profit amount
                    user.profit_amount += dailyProfit;
                    user.calculateTotalAmount();
                    await user.save();

                    // Create notification
                    const notification = new Notification({
                        user_id: user._id,
                        message: `Daily profit of $${dailyProfit.toFixed(2)} has been credited to your account`,
                        type: 'profit'
                    });

                    await notification.save();

                    console.log(`Profit calculated for user ${user.email}: $${dailyProfit.toFixed(2)}`);
                } catch (error) {
                    console.error(`Error calculating profit for user ${user.email}:`, error);
                }
            }

            console.log('Daily profit calculation completed');
        } catch (error) {
            console.error('Error in daily profit calculation:', error);
        }
    }

    // Manual profit calculation (for testing)
    async calculateProfitsForUser(userId) {
        try {
            const user = await User.findById(userId);
            if (!user || user.status !== 'active' || user.deposit_amount <= 0) {
                throw new Error('User not found or not eligible for profit calculation');
            }

            const dailyProfit = user.deposit_amount * 0.01;

            // Create profit log entry
            const profitLog = new ProfitLog({
                user_id: user._id,
                amount: dailyProfit,
                deposit_amount: user.deposit_amount,
                profit_rate: 0.01,
                date: new Date()
            });

            await profitLog.save();

            // Update user's profit amount
            user.profit_amount += dailyProfit;
            user.calculateTotalAmount();
            await user.save();

            // Create notification
            const notification = new Notification({
                user_id: user._id,
                message: `Daily profit of $${dailyProfit.toFixed(2)} has been credited to your account`,
                type: 'profit'
            });

            await notification.save();

            return {
                success: true,
                profitAmount: dailyProfit,
                newTotalAmount: user.total_amount
            };
        } catch (error) {
            console.error('Error in manual profit calculation:', error);
            throw error;
        }
    }

    // Get next profit calculation time
    getNextProfitTime() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }

    // Get profit calculation status
    getStatus() {
        return {
            jobsRunning: this.jobs.length > 0,
            nextProfitCalculation: this.getNextProfitTime(),
            activeJobs: this.jobs.map(job => ({
                running: job.running,
                nextDate: job.nextDate()
            }))
        };
    }
}

module.exports = new CronService();
