# PharmaCare ERP - Detailed Setup Instructions

## System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.15, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 5GB free space
- **Network**: Reliable internet connection

### Software Requirements
- Node.js 16.x or later
- npm 8.x or later  
- MySQL 8.0 or later
- Git

## Step-by-Step Setup

### 1. Install Dependencies

#### Node.js & npm
Download and install from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version
npm --version
```

#### MySQL
Download and install MySQL 8.0+ from [mysql.com](https://dev.mysql.com/downloads/)

### 2. Database Setup

#### Create Database
```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE pharmacy_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional)
CREATE USER 'pharma_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON pharmacy_erp.* TO 'pharma_user'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

#### Import Schema
```bash
mysql -u root -p pharmacy_erp < database/schema.sql
```
Get-Content .\database\schema.sql | & "C:\Program Files\MySQL\MySQL Server 9.4\bin\mysql.exe" -u root -p pharmacy_erp
### 3. Backend Configuration

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Setup
```bash
cp .env.example .env
```

Edit `.env` file:
```env
NODE_ENV=development
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pharmacy_erp
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

#### Start Backend
```bash
npm run dev
```

Backend should start on http://localhost:3001

### 4. Frontend Configuration

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Start Frontend
```bash
npm run dev
```

Frontend should start on http://localhost:3000

### 5. Mobile Setup (Optional)

#### Prerequisites for Mobile
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- React Native CLI

#### Install React Native CLI
```bash
npm install -g @react-native-community/cli
```

#### Setup Mobile Project
```bash
cd mobile
npm install
```

#### Run on Android
```bash
npx react-native run-android
```

#### Run on iOS (macOS only)
```bash
npx react-native run-ios
```

## Verification

### Check Backend
Visit http://localhost:3001/api/health - should return API status

### Check Frontend  
Visit http://localhost:3000 - should show login page

### Test Login
Use default credentials:
- Username: admin
- Password: admin123

## Troubleshooting

### Common Issues

#### Database Connection Error
- Verify MySQL is running
- Check database credentials in .env
- Ensure database exists

#### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

#### Module Not Found Errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

#### Mobile Build Issues
```bash
# Clean React Native cache
npx react-native start --reset-cache

# For Android
cd android && ./gradlew clean && cd ..

# For iOS
cd ios && xcodebuild clean && cd ..
```

## Development Workflow

### Making Changes

1. **Backend Changes**: Edit files in `backend/src/`, server auto-restarts
2. **Frontend Changes**: Edit files in `frontend/src/`, browser auto-reloads
3. **Mobile Changes**: Edit files in `mobile/src/`, refresh mobile app

### Testing API Endpoints

Use tools like Postman or curl:
```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login   -H "Content-Type: application/json"   -d '{"username":"admin","password":"admin123"}'
```

### Database Management

#### View Database
```bash
mysql -u root -p pharmacy_erp
```

#### Reset Database
```bash
mysql -u root -p pharmacy_erp < database/schema.sql
```

## Production Deployment

### Backend Deployment
1. Set up production server (VPS, cloud instance)
2. Install Node.js, PM2
3. Configure environment variables
4. Use process manager like PM2

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy 'dist' folder to web server
```

### Database Deployment
1. Set up production MySQL server
2. Import schema and data
3. Configure firewall and security

## Next Steps

After successful setup:
1. Explore the dashboard
2. Add test products
3. Process test sales
4. Review reports
5. Customize for your needs

For additional help, check the main README or create an issue.
