# Belbin Fleet Management System

A comprehensive fleet management web application built with Next.js 14, Firebase, and Material-UI for Belbin Travel.

## Features

### 🔐 Authentication System
- Secure user login/logout with Firebase Authentication
- Protected routes for authenticated users only
- User profile management

### 🚗 Vehicle Management
- Complete vehicle registration system
- Vehicle information tracking (registration, make, model, color, station)
- Image upload for each vehicle
- Insurance and inspection expiry date tracking
- Comprehensive amenities management (18+ amenities with status tracking)
- Vehicle editing and deletion capabilities

### ⛽ Fuel Cost Tracking
- Add fuel records with date, vehicle, amount, cost, and station
- Real-time fuel consumption analytics
- Monthly fuel cost summaries
- Filter and search functionality
- Cost per liter calculations

### 🔧 Maintenance Cost Tracking
- Record maintenance activities with descriptions and costs
- Service provider tracking
- Monthly maintenance summaries
- Filter by vehicle, date range, and search terms

### 📊 Dashboard & Analytics
- Real-time fleet overview with key metrics
- Monthly cost breakdowns (fuel + maintenance)
- Expiry alerts for insurance and inspection
- Recent activity tracking
- Visual statistics cards

### 📈 Advanced Features
- Responsive design for mobile and desktop
- Real-time data synchronization
- Professional UI with Material-UI components
- Comprehensive search and filtering
- Data export capabilities (ready for implementation)
- Error handling and loading states

## Tech Stack

- **Frontend**: Next.js 14 with JavaScript, Tailwind CSS, Material-UI
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **UI Components**: Material-UI (MUI) with custom Tailwind styling
- **Date Management**: date-fns library
- **Data Grid**: MUI X DataGrid for advanced table functionality

## Database Structure

### Firestore Collections

#### `vehicles/`
```javascript
{
  id: "auto-generated",
  regNumber: "KCA 123A",
  color: "White",
  make: "Toyota",
  model: "Hiace",
  imageUrl: "https://firebasestorage.googleapis.com/...",
  station: "Nairobi",
  insuranceExpiry: timestamp,
  inspectionExpiry: timestamp,
  amenities: {
    wifiGadgets: { status: "present", phoneNumbers: "0712345678" },
    servietteBox: { status: "present" },
    carMats: { status: "missing" },
    // ... 15+ more amenities
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `fuelRecords/`
```javascript
{
  id: "auto-generated",
  vehicleId: "vehicle_document_id",
  date: timestamp,
  liters: 50.5,
  cost: 6500.00,
  station: "Shell",
  createdAt: timestamp
}
```

#### `maintenanceRecords/`
```javascript
{
  id: "auto-generated",
  vehicleId: "vehicle_document_id",
  date: timestamp,
  description: "Oil change and tire rotation",
  cost: 3500.00,
  serviceProvider: "AA Kenya",
  createdAt: timestamp
}
```

#### `users/`
```javascript
{
  id: "from_firebase_auth",
  email: "user@belbintravel.com",
  role: "user",
  createdAt: timestamp
}
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd fleet-manager
npm install
```

### 2. Firebase Configuration

1. Create a new Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)

2. Enable the following services:
   - **Authentication** (Email/Password provider)
   - **Firestore Database**
   - **Storage**

3. Get your Firebase configuration from Project Settings

4. Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

### 3. Firestore Security Rules

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Vehicles collection
    match /vehicles/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Fuel records collection
    match /fuelRecords/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Maintenance records collection
    match /maintenanceRecords/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Storage Security Rules

Update your Firebase Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /vehicles/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## User Management

### Creating the First User

Since this is a business application, you'll need to create users manually in Firebase Authentication:

1. Go to Firebase Console > Authentication > Users
2. Click "Add user"
3. Enter email and password
4. The user will be automatically added to the Firestore `users` collection on first login

### Default Test User (for development)

You can create a test user with these credentials:
- Email: `admin@belbintravel.com`
- Password: `password123`

## Application Structure

```
fleet-manager/
├── app/
│   ├── contexts/
│   │   └── AuthContext.js          # Authentication context
│   ├── dashboard/
│   │   └── page.js                 # Dashboard page
│   ├── vehicles/
│   │   ├── page.js                 # Vehicle list page
│   │   ├── add/
│   │   │   └── page.js             # Add vehicle page
│   │   └── [id]/
│   │       └── page.js             # Vehicle detail/edit page
│   ├── fuel/
│   │   └── page.js                 # Fuel records page
│   ├── maintenance/
│   │   └── page.js                 # Maintenance records page
│   ├── login/
│   │   └── page.js                 # Login page
│   ├── layout.js                   # Root layout with providers
│   ├── page.js                     # Home page (redirects)
│   └── globals.css                 # Global styles
├── components/
│   ├── DashboardLayout.js          # Main dashboard layout
│   └── ProtectedRoute.js           # Route protection component
├── lib/
│   └── firebase.js                 # Firebase configuration
├── next.config.js                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
└── package.json                    # Dependencies
```

## Key Components

### Dashboard Layout
- Responsive sidebar navigation
- Top bar with user menu
- Mobile-friendly drawer system
- Clean, professional design

### Vehicle Management
- Comprehensive vehicle registration
- Image upload with preview
- Amenities tracking with status indicators
- Expiry date monitoring

### Data Tables
- Advanced filtering and searching
- Sortable columns
- Pagination
- Export-ready data structure

### Authentication
- Firebase Auth integration
- Protected routes
- User context management
- Automatic redirects

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Google Cloud Run
- Self-hosted with Docker

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support and questions, please contact the development team or create an issue in the repository.

## License

This project is proprietary software developed for Belbin Travel. All rights reserved.

---

**Belbin Fleet Management System** - Comprehensive fleet management for modern transportation companies. 