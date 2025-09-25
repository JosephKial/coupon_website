# Coupon Manager Frontend

A modern, responsive React frontend for the family coupon management system.

## Features

### Core Features
- **User Authentication**: Secure login/register with JWT tokens
- **Coupon Management**: Complete CRUD operations for family coupons
- **Advanced Search & Filtering**: Find coupons by store, category, discount type, expiry date
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates**: Toast notifications for user feedback

### Authentication
- Secure token-based authentication with automatic refresh
- Protected routes that require authentication
- Persistent login state using localStorage
- Automatic logout on token expiry

### Coupon Features
- Create coupons with detailed information (title, description, store, discount, code, dates)
- Edit existing coupons
- Mark coupons as used/unused
- Delete coupons with confirmation
- Category-based organization
- Expiry date tracking with visual indicators

### User Experience
- Clean, modern UI with intuitive navigation
- Loading states and error handling
- Mobile-first responsive design
- Advanced search with real-time filtering
- Pagination for large coupon lists
- Profile management

## Tech Stack

### Frontend Technologies
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **React Router 6** - Client-side routing
- **Axios** - HTTP client for API communication
- **React Hook Form** - Performant form handling with validation
- **Yup** - Schema validation
- **React Hot Toast** - Elegant toast notifications
- **Lucide React** - Beautiful icon library

### Development Tools
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking
- **Vite Dev Server** - Hot module replacement
- **Modern CSS** - Custom utility classes and responsive design

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── auth/          # Authentication components
│   │   ├── coupons/       # Coupon-related components  
│   │   ├── layout/        # Layout components (Navbar, Layout)
│   │   └── ui/            # Basic UI components (Button, Input, Card)
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── styles/            # Global styles
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main app component with routing
│   ├── main.tsx           # React app entry point
│   └── vite-env.d.ts      # Vite environment types
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Backend API running on http://localhost:8000

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` to match your backend API URL:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   VITE_APP_NAME=Coupon Manager
   ```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint code analysis

### Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## API Integration

The frontend integrates with a FastAPI backend through:

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

### Coupon Endpoints
- `GET /coupons/` - List coupons with filtering and pagination
- `POST /coupons` - Create new coupon
- `GET /coupons/{id}` - Get specific coupon
- `PUT /coupons/{id}` - Update coupon
- `DELETE /coupons/{id}` - Delete coupon
- `GET /coupons/stats` - Get coupon statistics

### Error Handling
- Automatic token refresh on 401 errors
- User-friendly error messages
- Network error handling
- Validation error display

## Security Features

### Authentication Security
- JWT tokens stored in localStorage
- Automatic token cleanup on logout
- Protected routes requiring authentication
- Request interceptors for token attachment

### Input Security
- Form validation with Yup schemas
- XSS prevention through React's built-in escaping
- CSRF protection via token-based auth
- Input sanitization

## Performance Optimizations

### Code Splitting
- Route-based code splitting
- Lazy loading of page components
- Optimized bundle sizes

### User Experience
- Debounced search to reduce API calls
- Loading states for all async operations
- Optimistic UI updates where appropriate
- Caching with React Query patterns

## Responsive Design

### Mobile-First Approach
- Responsive grid layouts
- Mobile-optimized navigation
- Touch-friendly interface
- Adaptive card layouts

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

## Contributing

### Code Style
- Use TypeScript for all new code
- Follow React functional component patterns
- Use custom hooks for shared logic
- Keep components focused and reusable

### Testing
- Write unit tests for utilities
- Test API integrations
- Verify responsive behavior
- Check accessibility compliance

## Deployment

### Environment Setup
1. Update `.env.production` with production API URL
2. Build the production bundle
3. Deploy `dist/` directory to your hosting provider

### Recommended Hosting
- Vercel (optimized for React/Vite)
- Netlify (with redirect rules)
- AWS S3 + CloudFront
- Any static hosting provider

## License

This project is part of a family coupon management system.