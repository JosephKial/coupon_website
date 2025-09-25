# Family Coupon Manager

A secure, private web application for families to organize, search, and manage their household coupon codes. Built with modern technologies and containerized for easy deployment.

## 🚀 Features

### Core Functionality
- **Multi-user Authentication**: Secure family member accounts with JWT tokens and Argon2id password hashing
- **CRUD Operations**: Complete coupon management (create, read, update, delete)
- **Advanced Search & Filtering**: Filter by store, category, status, expiration dates, and discount amounts
- **Usage Tracking**: Track coupon usage with savings calculations
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### Security Features
- **Argon2id Password Hashing**: Industry-standard password security
- **JWT Authentication**: Secure session management with refresh tokens
- **Input Validation**: Comprehensive server-side and client-side validation
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Security Headers**: HSTS, CSP, XSS protection, and more
- **HTTPS by Default**: Automatic SSL certificates with Let's Encrypt

### Technical Highlights
- **FastAPI Backend**: High-performance Python API with automatic documentation
- **React Frontend**: Modern TypeScript-based UI with excellent UX
- **PostgreSQL Database**: Reliable data storage with optimized indexing
- **Redis Caching**: Session storage and performance optimization
- **Docker Containerization**: Easy deployment and scalability
- **Nginx Reverse Proxy**: Load balancing and SSL termination

## 📋 System Requirements

### Development
- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Production
- Ubuntu 20.04+ Linux server
- Docker & Docker Compose
- 2GB+ RAM recommended
- 10GB+ storage space
- Domain name (for HTTPS)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│  React Frontend │────│  FastAPI Backend│
│  (Port 80/443)  │    │   (Port 80)     │    │   (Port 8000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐             │
         └──────────────│   PostgreSQL    │─────────────┘
                        │   (Port 5432)   │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │      Redis      │
                        │   (Port 6379)   │
                        └─────────────────┘
```

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd coupons_website

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 2. Configure Environment
Edit `.env` file with your settings:

```env
# Database Configuration
DB_PASSWORD=your_secure_database_password

# Redis Configuration  
REDIS_PASSWORD=your_secure_redis_password

# JWT Configuration
SECRET_KEY=your-super-secret-jwt-key-at-least-32-characters-long

# Domain Configuration (for HTTPS)
DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# Security Configuration
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Deploy with Docker
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize with Sample Data
```bash
# Create sample users and coupons
docker-compose exec backend python utils/seed_data.py
```

### 5. Access Your Application
- **Website**: https://yourdomain.com (or http://localhost for local testing)
- **API Documentation**: https://yourdomain.com/api/docs (development only)
- **Health Check**: https://yourdomain.com/health

## 🔧 Development Setup

### Backend Development
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
export DATABASE_URL="postgresql://coupon_user:password@localhost:5432/coupon_db"
export SECRET_KEY="dev-secret-key"

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Database Setup (Development)
```bash
# Start PostgreSQL with Docker
docker run -d \\
  --name coupon_postgres \\
  -e POSTGRES_DB=coupon_db \\
  -e POSTGRES_USER=coupon_user \\
  -e POSTGRES_PASSWORD=password \\
  -p 5432:5432 \\
  postgres:15-alpine

# Create tables and seed data
cd backend
python models/database.py
python utils/seed_data.py
```

## 🔐 Default Login Credentials

After running the seed script, you can log in with:

- **Admin User**: admin@family.com / SecurePassword123!
- **Parent 1**: parent1@family.com / SecurePassword123!
- **Parent 2**: parent2@family.com / SecurePassword123!
- **Teen**: teen@family.com / SecurePassword123!

⚠️ **Important**: Change these passwords in production!

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user info

### Coupon Endpoints
- `GET /api/v1/coupons/` - List coupons with filtering
- `POST /api/v1/coupons/` - Create new coupon
- `GET /api/v1/coupons/{id}` - Get coupon details
- `PUT /api/v1/coupons/{id}` - Update coupon
- `DELETE /api/v1/coupons/{id}` - Delete coupon
- `POST /api/v1/coupons/{id}/use` - Mark coupon as used

### Health & Monitoring
- `GET /health` - Application health check
- `GET /api/docs` - Interactive API documentation (development)

## 🛠️ Management Commands

### Docker Management
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Restart services
docker-compose restart [service_name]

# Update and rebuild
docker-compose down
docker-compose pull
docker-compose up -d --build

# Backup database
docker-compose exec database pg_dump -U coupon_user coupon_db > backup.sql

# Restore database
docker-compose exec -T database psql -U coupon_user coupon_db < backup.sql
```

### Application Management
```bash
# Create new admin user
docker-compose exec backend python -c "
from models.database import SessionLocal, User
from core.security import SecurityManager
db = SessionLocal()
sm = SecurityManager()
user = User(
    email='new-admin@family.com',
    username='newadmin',
    full_name='New Admin',
    password_hash=sm.hash_password('NewSecurePassword123!'),
    is_admin=True
)
db.add(user)
db.commit()
print('Admin user created!')
"

# Clear all coupons
docker-compose exec backend python -c "
from models.database import SessionLocal, Coupon
db = SessionLocal()
db.query(Coupon).delete()
db.commit()
print('All coupons cleared!')
"
```

## 🔒 Security Considerations

### Production Checklist
- [ ] Change all default passwords
- [ ] Set strong SECRET_KEY (32+ random characters)
- [ ] Configure proper DOMAIN and SSL_EMAIL
- [ ] Enable firewall (UFW recommended)
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Regular database backups

### Security Features Implemented
- **Password Security**: Argon2id hashing with secure parameters
- **Session Management**: JWT with automatic refresh and revocation
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: Comprehensive HTTP security headers
- **SQL Injection Protection**: Parameterized queries via SQLAlchemy
- **XSS Protection**: React's built-in XSS prevention
- **HTTPS Enforcement**: Automatic SSL with HSTS headers

## 📊 Monitoring & Logs

### Log Locations (in containers)
- **Application Logs**: `docker-compose logs backend`
- **Web Server Logs**: `docker-compose logs proxy`
- **Database Logs**: `docker-compose logs database`
- **Frontend Logs**: `docker-compose logs frontend`

### Health Checks
All services include health checks:
- **Backend**: `http://localhost:8000/health`
- **Frontend**: `http://localhost/health`
- **Database**: PostgreSQL connection test
- **Redis**: Connection and ping test

### Metrics to Monitor
- Response times (X-Process-Time header)
- Error rates (4xx/5xx status codes)
- Authentication failures
- Rate limit violations
- Database connection pool usage

## 🚀 Scaling & Performance

### Horizontal Scaling
```yaml
# Add to docker-compose.yml for multiple backend instances
backend:
  # ... existing config
  deploy:
    replicas: 3
```

### Performance Optimizations
- **Database**: Indexed queries, connection pooling
- **Caching**: Redis for sessions and frequent queries
- **Frontend**: Gzipped assets, browser caching
- **API**: Response compression, efficient serialization

### Resource Requirements
- **Minimum**: 1 CPU, 2GB RAM, 10GB storage
- **Recommended**: 2 CPU, 4GB RAM, 50GB storage
- **High Load**: 4+ CPU, 8GB+ RAM, SSD storage

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Run linting: `npm run lint` (frontend), `flake8` (backend)
5. Submit pull request

### Code Style
- **Python**: PEP 8 with Black formatting
- **TypeScript**: ESLint with Prettier
- **Git**: Conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support & Troubleshooting

### Common Issues

#### "Connection refused" errors
```bash
# Check if services are running
docker-compose ps

# Restart services
docker-compose restart
```

#### SSL certificate issues
```bash
# Check Let's Encrypt logs
docker-compose logs letsencrypt

# Manually request certificate
docker-compose exec letsencrypt /app/force_renew
```

#### Database connection issues
```bash
# Check database logs
docker-compose logs database

# Reset database
docker-compose down
docker volume rm coupons_website_postgres_data
docker-compose up -d
```

### Getting Help
1. Check the logs: `docker-compose logs -f`
2. Verify environment configuration
3. Ensure all required ports are available
4. Check firewall settings
5. Verify domain DNS configuration

---

**Built with ❤️ for families who love saving money!** 💰

For additional support or questions, please open an issue on the repository.