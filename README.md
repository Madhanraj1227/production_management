# Fabric Production Tracker

A web application for tracking fabric production in a manufacturing unit, with QR code generation for fabric cuts.

## Features

- Order management with design details
- Warp order tracking and loom assignment
- Fabric cut recording with QR code generation
- Printable QR code stickers
- Real-time production tracking

## Prerequisites

- Node.js (v14 or higher)
- Firebase project
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd client
   npm install
   ```

3. Set up Firebase:
   - Create a new Firebase project at https://console.firebase.google.com/
   - Enable Firestore Database
   - Go to Project Settings > Service Accounts
   - Generate a new private key and download the JSON file
   - Extract the required information for the environment variables

4. Create a `.env` file in the root directory with the following content:
   ```
   PORT=5000
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_CLIENT_CERT_URL=your-client-cert-url
   ```

## Running the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Create a new order with design details and quantity
2. Create warp orders and assign them to looms
3. Record fabric cuts and generate QR codes
4. Print QR code stickers for fabric cuts

## API Endpoints

- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/warps` - Get all warps
- `POST /api/warps` - Create new warp
- `GET /api/fabric-cuts` - Get all fabric cuts
- `POST /api/fabric-cuts` - Create new fabric cut with QR code

## Database Structure (Firestore Collections)

- **orders**: Contains order information with design details
- **warps**: Contains warp orders linked to main orders
- **fabricCuts**: Contains fabric cuts with QR codes linked to warps

## Technologies Used

- Frontend:
  - React
  - Material-UI
  - Axios
  - React Router

- Backend:
  - Node.js
  - Express
  - Firebase Firestore
  - Firebase Admin SDK
  - QRCode 