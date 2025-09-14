# Database Setup Guide

## 🌐 MongoDB Atlas Setup (Recommended)

### **Step 1: Create Atlas Account**

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and sign up
3. Verify your email address

### **Step 2: Create Cluster**

1. Click "Build a Database"
2. Choose **FREE** tier (M0 Sandbox)
3. Select cloud provider (AWS recommended)
4. Choose region closest to your users
5. Cluster name: `crypto-wallet-cluster`
6. Click "Create Cluster" (takes 3-5 minutes)

### **Step 3: Database User Setup**

1. Go to "Database Access" → "Add New Database User"
2. Authentication Method: "Password"
3. Username: `crypto-wallet-user`
4. Password: Generate or create strong password
5. Database User Privileges: "Read and write to any database"
6. Click "Add User"

### **Step 4: Network Access**

1. Go to "Network Access" → "Add IP Address"
2. For Development: "Allow Access from Anywhere" (0.0.0.0/0)
3. For Production: Add specific IP addresses
4. Click "Confirm"

### **Step 5: Get Connection String**

1. Go to "Clusters" → Click "Connect"
2. Choose "Connect your application"
3. Driver: "Node.js"
4. Version: "4.1 or later"
5. Copy the connection string

### **Step 6: Update Environment**

Replace in your `.env` file:

```env
MONGODB_URI=mongodb+srv://crypto-wallet-user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/crypto-wallet?retryWrites=true&w=majority
```

## 🏠 Local MongoDB Setup (Alternative)

### **Option 1: Direct Installation**

```bash
# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community

# Ubuntu/Debian
sudo apt-get install -y mongodb
sudo systemctl start mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

### **Option 2: Docker**

```bash
# Run MongoDB in Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest

# Connect to MongoDB
docker exec -it mongodb mongosh
```

### **Option 3: MongoDB Compass**

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Install and connect to `mongodb://localhost:27017`
3. Create database: `crypto-wallet`

## 🔧 Environment Configuration

### **Development (.env)**

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/crypto-wallet

# Or MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crypto-wallet?retryWrites=true&w=majority
```

### **Production (.env)**

```env
# Always use MongoDB Atlas for production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crypto-wallet?retryWrites=true&w=majority
```

## 🚀 Testing Database Connection

### **Test Connection**

```bash
# Start your server
npm run dev

# Check console for:
# "MongoDB Connected: cluster0-shard-00-00.xxxxx.mongodb.net"
```

### **Verify Collections**

1. Go to MongoDB Atlas → Browse Collections
2. You should see these collections after first API calls:
   - `users`
   - `deposits`
   - `withdrawals`
   - `profitlogs`
   - `notifications`

## 🔒 Security Best Practices

### **Atlas Security**

- Use strong passwords (12+ characters)
- Enable IP whitelisting for production
- Use database users with minimal privileges
- Enable encryption in transit
- Set up backup policies

### **Connection String Security**

- Never commit connection strings to version control
- Use environment variables
- Rotate passwords regularly
- Use different users for different environments

## 📊 Database Monitoring

### **Atlas Monitoring**

- Monitor cluster performance
- Set up alerts for high CPU/memory usage
- Monitor connection counts
- Set up backup schedules

### **Application Monitoring**

- Log database connection status
- Monitor query performance
- Set up error alerts
- Track database response times

## 🆘 Troubleshooting

### **Common Issues**

#### **Connection Timeout**

```bash
# Check network access in Atlas
# Verify IP address is whitelisted
# Check firewall settings
```

#### **Authentication Failed**

```bash
# Verify username/password
# Check database user privileges
# Ensure user has read/write access
```

#### **SSL/TLS Issues**

```bash
# Add ?ssl=true to connection string
# Check Node.js version compatibility
# Update MongoDB driver
```

### **Debug Connection**

```javascript
// Add to server.js for debugging
mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
```

## 📈 Scaling Considerations

### **Atlas Tiers**

- **M0 (Free)**: 512MB storage, shared RAM
- **M2/M5**: 2GB/5GB storage, dedicated RAM
- **M10+**: Production-ready with more resources

### **When to Scale**

- High memory usage (>80%)
- Slow query performance
- Connection limit reached
- Storage approaching limit

## 🔄 Backup Strategy

### **Atlas Backups**

- Automatic daily backups (M2+)
- Point-in-time recovery
- Cross-region backup replication
- Backup retention policies

### **Application Backups**

- Export collections regularly
- Test restore procedures
- Document backup/restore process
- Monitor backup success

---

## 🎯 Quick Start Checklist

- [ ] Create MongoDB Atlas account
- [ ] Create cluster (M0 free tier)
- [ ] Set up database user
- [ ] Configure network access
- [ ] Get connection string
- [ ] Update .env file
- [ ] Test connection
- [ ] Verify collections are created
- [ ] Set up monitoring alerts
- [ ] Document backup procedures
