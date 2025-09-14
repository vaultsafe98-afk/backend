#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 Crypto Wallet Backend Setup');
console.log('================================\n');

// Check if .env already exists
if (fs.existsSync('.env')) {
    console.log('⚠️  .env file already exists!');
    rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            createEnvFile();
        } else {
            console.log('Setup cancelled.');
            rl.close();
        }
    });
} else {
    createEnvFile();
}

function createEnvFile() {
    console.log('\n📝 Creating .env file...\n');

    const envContent = `# ===========================================
# CRYPTO WALLET BACKEND - ENVIRONMENT CONFIG
# ===========================================

# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/crypto-wallet

# JWT Authentication Configuration
JWT_SECRET=${generateRandomString(64)}
JWT_EXPIRES_IN=7d

# AWS S3 Configuration for Image Storage
AWS_ACCESS_KEY_ID=your-aws-access-key-here
AWS_SECRET_ACCESS_KEY=your-aws-secret-key-here
AWS_REGION=us-east-1
S3_BUCKET_NAME=crypto-wallet-uploads

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Admin Account Configuration
ADMIN_EMAIL=admin@safevault.com
ADMIN_PASSWORD=admin123456

# ===========================================
# IMPORTANT: Replace placeholder values with your actual credentials
# ===========================================`;

    fs.writeFileSync('.env', envContent);

    console.log('✅ .env file created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update AWS credentials in .env file');
    console.log('2. Make sure MongoDB is running');
    console.log('3. Run: npm install');
    console.log('4. Run: npm run dev');
    console.log('\n🔐 Generated a random JWT secret for you!');
    console.log('⚠️  Remember to change the admin password in production!');

    rl.close();
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
