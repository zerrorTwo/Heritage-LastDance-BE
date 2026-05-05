# Heritage KLTN Backend API

A NestJS-based authentication and user management system with support for email OTP, JWT authentication, MetaMask wallet integration, and comprehensive audit logging.

## Features

- **Authentication**: Email/password signup and signin with OTP verification
- **Password Management**: Forgot password with OTP, password reset, and change password
- **MetaMask Integration**: Wallet-based authentication and wallet linking
- **Session Management**: JWT access tokens with refresh token rotation
- **Audit Logging**: Comprehensive audit trail for all user actions
- **Email Service**: OTP and notification emails via Resend
- **PostgreSQL Database**: TypeORM with entity modeling

## Prerequisites

- Node.js 18+ (20+ recommended for Resend)
- PostgreSQL 15+
- Docker & Docker Compose (for containerized deployment)
- Resend API key (for email functionality)

## Project Structure

```
├── src/
│   ├── modules/
│   │   ├── auth/           # Authentication module
│   │   ├── user/          # User management
│   │   ├── session/       # Session handling
│   │   ├── audit-log/     # Audit logging
│   │   └── health/        # Health checks
│   ├── common/            # Shared utilities and strategies
│   ├── pkg/
│   │   └── mail/         # Email service
│   └── config/           # Configuration loader
├── config.yaml            # Local configuration
├── docker-compose.yml    # Docker services
└── Dockerfile            # Container build
```

## Configuration

The application uses YAML configuration files with environment variable override:

### Config Files

- `config.yaml` - Local development (default)
- `dev.yaml` - Development environment
- `staging.yaml` - Staging environment  
- `production.yaml` - Production environment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (docker, dev, staging, production) | - |
| `PORT` | Application port | 3000 |
| `DATABASE_HOST` | Database host | localhost |
| `DATABASE_PORT` | Database port | 5432 |
| `DATABASE_USER` | Database user | - |
| `DATABASE_PASS` | Database password | - |
| `DATABASE_NAME` | Database name | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 1h |
| `RESEND_API_KEY` | Resend API key | - |
| `RESEND_FROM` | Email sender address | - |

### Quick Start

1. Copy `config.example.yaml` to `config.yaml`:
   ```bash
   cp config.example.yaml config.yaml
   ```

2. Update `config.yaml` with your settings

3. For Docker deployment, configure environment in `docker-compose.yml`

## Installation

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user (sends OTP) |
| POST | `/auth/signin` | Login with email/password |
| POST | `/auth/verify-otp` | Verify OTP and complete signup |
| POST | `/auth/resend-otp` | Resend OTP code |
| POST | `/auth/forgot-password` | Request password reset (sends OTP) |
| POST | `/auth/verify-forgot-password-otp` | Verify OTP for password reset |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/change-password` | Change password (authenticated) |
| POST | `/auth/refresh-token` | Refresh access token |
| POST | `/auth/logout` | Logout and revoke session |
| POST | `/auth/metamask/challenge` | Get MetaMask challenge |
| POST | `/auth/metamask/signin` | Signin with MetaMask |
| POST | `/auth/metamask/link` | Link MetaMask wallet |
| POST | `/auth/metamask/verify-link` | Verify wallet link |

### Users (`/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get current user profile |
| PUT | `/users/me` | Update user profile |

### Health (`/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ping` | Health check endpoint |

## Database Schema

- **Users**: User accounts with email/password or wallet address
- **Sessions**: Active user sessions with refresh tokens
- **Auth Challenges**: OTP and verification challenges
- **Password Resets**: Password reset tokens
- **Audit Logs**: Action audit trail

## Scripts

```bash
npm run build      # Compile TypeScript
npm run start      # Run compiled application
npm run dev        # Run with hot-reload
```

## Production Considerations

1. **Security**:
   - Set strong `JWT_SECRET`
   - Use HTTPS in production
   - Enable rate limiting (configured via `THROTTLE_TTL` and `THROTTLE_LIMIT`)
   - Set `NODE_ENV=production`

2. **Database**:
   - Use managed PostgreSQL (AWS RDS, GCP Cloud SQL, etc.)
   - Enable connection pooling
   - Set `synchronize: false` and use migrations

3. **Email**:
   - Configure Resend with verified domain
   - Update `RESEND_FROM` with valid sender

4. **Monitoring**:
   - Enable audit logging
   - Configure log aggregation
   - Set up health check monitoring

## License

ISC
