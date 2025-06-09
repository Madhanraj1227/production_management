# Fabric Production Tracker 🧵

A comprehensive web application for managing fabric production with role-based authentication, QR code tracking, and real-time monitoring.

## 🌟 Features

### Authentication & Roles
- **Admin**: Full access to all features
- **Fabric Manager**: Access to fabric production management
- **Yarn Manager**: Dedicated yarn inventory dashboard

### Production Management
- Order tracking and management
- Warp production monitoring
- Fabric cut recording with QR codes
- Loom operation tracking
- Real-time inspection workflow

### Specialized Dashboards
- **Fabric Dashboard**: Production statistics, recent inspections, loom operations
- **Yarn Dashboard**: Inventory management, stock alerts, delivery tracking

### Print & Reporting
- Professional A4 landscape print summaries
- Real-time data visualization
- Export capabilities

## 🚀 Deployment

### Render (Recommended)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

1. **Fork this repository**
2. **Connect to Render**:
   - Create account at [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Settings**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. **Set Environment Variables**:
   ```
   NODE_ENV=production
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_CLIENT_CERT_URL=your_client_cert_url
   ```

5. **Deploy**: Render will automatically build and deploy

📖 **Detailed deployment guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🔧 Local Development

### Prerequisites
- Node.js 16+ 
- Firebase Project with Firestore
- Environment variables configured

### Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd fabric-production-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Configure environment**:
   Create `.env` file:
   ```
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_CLIENT_CERT_URL=your_client_cert_url
   ```

4. **Start development servers**:
   ```bash
   npm run dev:full
   ```
   - Backend: http://localhost:3001
   - Frontend: http://localhost:5001

### Production Testing

Test production build locally:
```bash
npm run test:prod
```

## 🔐 Login Credentials

### Default Users
- **Admin**: `admin` / `admin123`
- **Fabric Manager**: `fabric` / `fabric123` 
- **Yarn Manager**: `yarn` / `yarn123`

## 🏗️ Architecture

### Backend (Node.js/Express)
- RESTful API design
- Firebase Firestore integration
- Role-based authentication
- QR code generation
- Production static file serving

### Frontend (React)
- Material-UI components
- Role-based routing
- Real-time data updates
- Responsive design
- QR code scanning

### Database (Firebase Firestore)
- NoSQL document structure
- Real-time synchronization
- Scalable cloud infrastructure

## 📁 Project Structure

```
fabric-production-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── routes/                # Express API routes
│   ├── orders.js          # Order management
│   ├── warps.js          # Warp tracking
│   ├── looms.js          # Loom operations
│   ├── fabricCuts.js     # Fabric cut tracking
│   └── database.js       # Database operations
├── server.js             # Express server
├── package.json          # Backend dependencies
├── render.yaml          # Render deployment config
└── DEPLOYMENT.md        # Deployment guide
```

## 🔄 Development Scripts

```bash
# Development
npm run dev              # Start backend only
npm run client          # Start frontend only  
npm run dev:full        # Start both frontend and backend

# Production
npm run build           # Build React app
npm start              # Start production server
npm run start:prod     # Start with NODE_ENV=production
npm run test:prod      # Build and test production locally
```

## 🌐 API Endpoints

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create new order
- `GET /api/orders/count/active` - Get active order count

### Warps
- `GET /api/warps` - List all warps
- `POST /api/warps` - Create new warp
- `PUT /api/warps/:id` - Update warp

### Fabric Cuts
- `GET /api/fabric-cuts` - List fabric cuts
- `POST /api/fabric-cuts` - Create fabric cut
- `GET /api/fabric-cuts/recent-inspections` - Recent inspections

### Looms
- `GET /api/looms` - List all looms
- `POST /api/looms` - Create new loom

## 🎨 UI Components

### Dashboards
- **Admin Dashboard**: Complete system overview
- **Fabric Dashboard**: Production-focused interface  
- **Yarn Dashboard**: Inventory management interface

### Forms
- Order creation and management
- Warp tracking forms
- Fabric cut recording
- Loom operation forms

### Features
- QR code generation and scanning
- Print-optimized summaries
- Real-time data updates
- Responsive navigation

## 🔒 Security

- Environment variable protection
- Firebase security rules
- Role-based access control
- HTTPS enforcement in production

## 📊 Database Schema

### Collections
- `orders` - Production orders
- `warps` - Warp tracking data
- `fabricCuts` - Fabric cut records
- `looms` - Loom information
- `inspections` - Quality inspections

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection**:
   - Verify environment variables
   - Check private key formatting
   - Ensure Firestore is enabled

2. **Build Failures**:
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are listed

3. **Deployment Issues**:
   - Check Render logs
   - Verify environment variables
   - Test production build locally

## 📈 Performance

- Optimized Firebase queries
- React build optimization
- Static file caching
- Efficient bundle splitting

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For deployment support, see [DEPLOYMENT.md](./DEPLOYMENT.md) or create an issue.

---

**Made with ❤️ for efficient fabric production management** 