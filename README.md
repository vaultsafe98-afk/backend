# Crypto Wallet Backend API

A Node.js Express.js backend API for the SafeVault crypto wallet mobile application.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Wallet Management**: Deposit and withdrawal tracking with balance management
- **Daily Profit Calculation**: Automated 1% daily profit calculation via cron jobs
- **Image Upload**: AWS S3 integration for deposit proof screenshots
- **Admin Panel**: Complete admin interface for managing deposits and withdrawals
- **Notifications**: Real-time notification system for users
- **Security**: Rate limiting, input validation, and secure password hashing

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **File Storage**: AWS S3
- **Security**: bcryptjs, helmet, express-rate-limit
- **Validation**: express-validator
- **Cron Jobs**: node-cron
- **Logging**: morgan

## Installation

1. **Clone the repository**

   ```bash
   cd Backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/crypto-wallet

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
   JWT_EXPIRES_IN=7d

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=crypto-wallet-uploads

   # Frontend URL
   FRONTEND_URL=http://localhost:3000

   # Admin Configuration
   ADMIN_EMAIL=admin@safevault.com
   ADMIN_PASSWORD=admin123
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system:

   ```bash
   # Using MongoDB service
   sudo systemctl start mongod

   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token

### User Management

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/profile-image` - Upload profile image
- `DELETE /api/user/profile-image` - Delete profile image

### Deposits

- `POST /api/deposit/request` - Submit deposit request with screenshot
- `GET /api/deposit/history` - Get user's deposit history
- `GET /api/deposit/:id` - Get specific deposit details

### Withdrawals

- `POST /api/withdraw/request` - Submit withdrawal request
- `GET /api/withdraw/history` - Get user's withdrawal history
- `GET /api/withdraw/:id` - Get specific withdrawal details

### Wallet

- `GET /api/wallet` - Get wallet balance
- `GET /api/wallet/transactions` - Get all transactions
- `GET /api/wallet/transactions/deposits` - Get deposit transactions
- `GET /api/wallet/transactions/withdrawals` - Get withdrawal transactions
- `GET /api/wallet/transactions/profits` - Get profit transactions

### Notifications

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `DELETE /api/notifications/clear-all` - Delete all notifications
- `GET /api/notifications/unread-count` - Get unread count

### Admin (Protected Routes)

- `GET /api/admin/deposits` - Get all deposit requests
- `PUT /api/admin/deposit/:id/approve` - Approve deposit request
- `PUT /api/admin/deposit/:id/reject` - Reject deposit request
- `GET /api/admin/withdrawals` - Get all withdrawal requests
- `PUT /api/admin/withdraw/:id/approve` - Approve withdrawal request
- `PUT /api/admin/withdraw/:id/reject` - Reject withdrawal request
- `GET /api/admin/reports/summary` - Get summary reports
- `GET /api/admin/reports/users` - Get user-wise breakdown

## Database Models

### User

- Personal information (name, email, password)
- Wallet balances (deposit, profit, total)
- Account status and role
- Profile image URL

### Deposit

- User reference and amount
- Screenshot URL for proof
- Status (pending, approved, rejected)
- Admin notes

### Withdrawal

- User reference and amount
- Platform and wallet address
- Status (pending, approved, rejected)
- Admin notes

### ProfitLog

- Daily profit calculations
- User reference and amounts
- Profit rate and date

### Notification

- User notifications
- Message content and type
- Read/unread status

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin requests
- **Helmet Security**: Security headers protection

## Cron Jobs

- **Daily Profit Calculation**: Runs at midnight UTC
  - Calculates 1% of deposit amount for active users
  - Updates user balances and creates profit logs
  - Sends notifications to users

## AWS S3 Integration

- **Image Upload**: Secure image upload for deposit proofs
- **Presigned URLs**: Secure access to private images
- **File Management**: Upload, delete, and list operations

## Error Handling

- Comprehensive error handling middleware
- Detailed error logging
- User-friendly error messages
- Graceful shutdown handling

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Check for linting errors
npm run lint
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong JWT secret
3. Configure proper MongoDB connection
4. Set up AWS S3 credentials
5. Use a process manager like PM2
6. Set up reverse proxy with Nginx
7. Enable HTTPS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
