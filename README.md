# PharmaCare ERP - Complete Pharmacy Management System

A full-featured pharmacy chain ERP system inspired by VitalRX, built with modern web and mobile technologies.

## 🏥 System Overview

PharmaCare ERP is a comprehensive pharmacy management system designed for multi-branch pharmacy chains. It provides:

- **Complete ERP Functionality**: Product management, inventory tracking, sales processing, customer management
- **Multi-branch Support**: Centralized database with branch-specific controls and reporting  
- **POS Integration**: Seamless point-of-sale system with prescription processing
- **Auto-ordering System**: Intelligent reorder points and supplier integration
- **Mobile Applications**: Native mobile apps for staff and customers
- **Real-time Analytics**: Dashboard with sales metrics, stock levels, and alerts
- **Compliance Features**: Drug scheduling, prescription tracking, regulatory compliance

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT with refresh tokens
- **Security**: bcryptjs, helmet, rate limiting

### Frontend (Web)
- **Framework**: React 18 with Vite
- **UI Library**: Material-UI v5
- **State Management**: React Query
- **Routing**: React Router v6
- **Forms**: React Hook Form

### Mobile App
- **Framework**: React Native 0.72
- **Navigation**: React Navigation v6
- **UI Components**: React Native Paper
- **Storage**: AsyncStorage

### Database
- **Engine**: MySQL 8.0
- **Features**: 25+ tables, triggers, views, indexes
- **Design**: Normalized schema with foreign key constraints
- **Sample Data**: Pre-populated test data

## 📁 Project Structure

```
pharmacy-erp/
├── backend/              # Node.js/Express API server
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── controllers/  # Business logic
│   │   ├── models/       # Database models
│   │   ├── middleware/   # Auth & validation
│   │   └── utils/        # Database & logging
│   └── package.json
├── frontend/             # React web application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   └── services/     # API services
│   └── package.json
├── mobile/               # React Native app
│   ├── src/
│   │   ├── screens/      # Mobile screens
│   │   ├── components/   # Mobile components
│   │   ├── contexts/     # Mobile contexts
│   │   └── services/     # API services
│   └── package.json
└── database/             # Database schema & migrations
    └── schema.sql
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- Node.js 16+ and npm
- MySQL 8.0+
- Git
- (For mobile) React Native development environment

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd pharmacy-erp
```

### 2. Database Setup

```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE pharmacy_erp;
EXIT;

# Import schema
mysql -u root -p pharmacy_erp < database/schema.sql
```

### 3. Backend Setup

```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Start development server
npm run dev
```

Backend will run on http://localhost:3001

### 4. Frontend Setup

```bash
cd ../frontend
npm install

# Start development server
npm run dev
```

Frontend will run on http://localhost:3000

### 5. Mobile Setup (Optional)

```bash
cd ../mobile
npm install

# For Android
npx react-native run-android

# For iOS
npx react-native run-ios
```

## 🔐 Default Credentials

- **Username**: admin  
- **Password**: admin123

## 📊 Key Features

### Dashboard
- Real-time sales analytics
- Stock level monitoring
- Expiry alerts
- Recent transaction history

### Product Management
- Comprehensive medicine catalog
- Batch tracking with expiry dates
- Pricing and margin management
- Category organization

### Inventory Management
- Multi-branch stock tracking
- Automatic reorder alerts
- Expiry monitoring
- Stock movement history

### Point of Sale (POS)
- Fast product search and barcode scanning
- Prescription processing
- Multiple payment methods
- Customer loyalty integration

### Sales & Reporting
- Daily/monthly sales reports
- Product-wise analysis
- Branch comparison
- Profit/loss statements

### Customer Management
- Customer database with medical history
- Loyalty programs
- Purchase history
- Prescription reminders

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pharmacy_erp
DB_USER=root
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development
```

### Database Configuration

The system uses MySQL with the following key features:
- Automatic stock updates via triggers
- Low stock and expiry alerts
- Audit trails for all transactions
- Branch-specific data isolation

## 📱 Mobile Features

The mobile app provides:
- Staff dashboard with key metrics
- Product lookup and inventory checks
- Sales processing capabilities
- Customer management
- Barcode scanning (planned)

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control
- SQL injection prevention
- Rate limiting
- Password hashing with bcrypt
- CORS protection

## 🚀 Deployment

### Production Deployment

1. **Database**: Set up MySQL on production server
2. **Backend**: Deploy to server with PM2 or Docker
3. **Frontend**: Build and deploy to web server or CDN
4. **Mobile**: Build APK/IPA and distribute

### Docker Support (Coming Soon)

Docker configurations for easy deployment will be added.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🔮 Roadmap

### Upcoming Features
- Advanced reporting and analytics
- Integration with external pharmacy networks
- Automated backup systems  
- Multi-language support
- Advanced prescription management
- Telemedicine integration

### Mobile Enhancements
- Barcode scanning
- Offline capabilities
- Push notifications
- Customer mobile app

---

**Built with ❤️ for pharmacy professionals worldwide**


i want to make a strong face recognition project my expectation is once a customers come to any store from multiple stores at a time of invoicing or sale in pos customer will stand in a frame system automatically capture customer image and this image data will store in my already created customer table and when this customer will come next time my system fetch or retrieve that customer data on click retrieve button for the same i am sharing you the current crud files of customer and customer table ddl



Monorepo structure (SDLC-grade)

Use PNPM workspaces + Turborepo (or Nx). This makes shared code, types, API models, and config reusable, and gives you proper CI stages.

pharmacy-erp/
├── apps/
│   ├── api/                     # Express + mysql2 backend
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── modules/         # domain modules (sales, inventory, face, roles)
│   │   │   ├── utils/
│   │   │   ├── config/
│   │   │   └── server.ts
│   │   ├── prisma/ or knex/     # migrations (choose one)
│   │   ├── .env.example
│   │   └── package.json
│   ├── web/                     # React (Vite) web app
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── services/
│   │   ├── .env.example
│   │   └── package.json
│   └── mobile/                  # React Native app (optional)
│       └── ...
├── packages/
│   ├── shared/                  # shared ts/js: DTOs, zod schemas, constants
│   ├── ui/                      # cross-app UI primitives (if you want)
│   └── eslint-config/           # one lint config for all
├── infra/
│   ├── docker/                  # compose files, Dockerfiles
│   ├── github/                  # actions workflow templates
│   └── k8s/                     # manifests (if/when needed)
├── database/
│   ├── migrations/              # SQL/knex/prisma migrations
│   ├── seed/                    # idempotent seeding scripts
│   └── schema.sql               # full schema snapshot
├── docs/
│   ├── ADRs/                    # Architecture decision records
│   ├── api/                     # OpenAPI spec (generated)
│   └── sdlc/                    # SDLC playbooks, runbooks
├── turbo.json
├── package.json                 # workspaces root
└── pnpm-workspace.yaml
