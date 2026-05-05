# Heritage KLTN Backend API

A NestJS-based authentication and user management system with support for email OTP, JWT authentication, MetaMask wallet integration, and comprehensive audit logging.

## Features

- **Authentication**: Email/password signup and signin with OTP verification
- **Password Management**: Forgot password with OTP, password reset, and change password
- **MetaMask Integration**: Wallet-based authentication and wallet linking
- **Google OAuth**: Sign in with Google account
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
│   ├── common/           # Shared utilities and strategies
│   │   ├── guards/
│   │   ├── strategies/    # JWT & Google OAuth strategies
│   │   ├── decorators/
│   │   └── ...
│   ├── pkg/
│   │   └── mail/         # Email service
│   ├── utils/
│   │   ├── constants/
│   │   ├── hash/
│   │   ├── random/
│   │   └── wallet/       # MetaMask utilities
│   └── config/           # Configuration loader
├── config.yaml            # Local configuration
├── dev.yaml              # Development config
├── staging.yaml          # Staging config
├── production.yaml       # Production config
├── docker-compose.yml    # Docker services
└── Dockerfile            # Container build
```

## Configuration

The application uses YAML configuration files with environment variable override:

### Config Files

| File | Purpose |
|------|----------|
| `config.yaml` | Local development (default) |
| `dev.yaml` | Development environment |
| `staging.yaml` | Staging environment |
| `production.yaml` | Production environment |
| `config.example.yaml` | Template for configuration |

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
| `JWT_EXPIRES_IN` | JWT expiration time | 15m |
| `SESSION_TTL_HOURS` | Session TTL in hours | 24 |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token TTL in days | 7 |
| `OTP_EXPIRE_MINUTES` | OTP expiration in minutes | 5 |
| `OTP_MAX_ATTEMPTS_PER_HOUR` | Max OTP attempts per hour | 5 |
| `OTP_RESEND_LIMIT_TTL_MINUTES` | Resend OTP limit TTL | 60 |
| `OTP_MAX_RESEND_ATTEMPTS` | Max OTP resend attempts | 5 |
| `RESET_PASSWORD_TOKEN_TTL_MINUTES` | Reset token TTL | 15 |
| `METAMASK_CHALLENGE_TTL_MINUTES` | MetaMask challenge TTL | 2 |
| `RESEND_API_KEY` | Resend API key | - |
| `RESEND_FROM` | Email sender address | - |

### Quick Start

1. Copy example config:
   ```bash
   cp config.example.yaml config.yaml
   ```

2. Update `config.yaml` with your settings (database, JWT secret, etc.)

3. For Docker deployment, configure environment in `docker-compose.yml`

## Installation

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot-reload)
npm run dev
```

### Docker Deployment

```bash
# Start all services (PostgreSQL + App)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build --force-recreate app
```

## API Documentation (Swagger)

Swagger UI is available at:
```
http://localhost:3000/api
```

### Using Swagger UI

1. **Open Swagger**: Navigate to `http://localhost:3000/api` in your browser

2. **Authorize** (for protected endpoints):
   - Click the `Authorize` button in the top right
   - Enter: `bearer <your_access_token>`
   - Click `Authorize`

3. **Test Endpoints**:
   - Expand any endpoint (e.g., `POST /auth/signup`)
   - Click `Try it out`
   - Enter the request body (JSON)
   - Click `Execute`

### Example: Sign Up Flow

1. **Sign Up**:
   ```json
   POST /auth/signup
   {
     "email": "test@example.com",
     "password": "123456"
   }
   ```
   Response: `authToken` (save this)

2. **Check Email**: OTP sent to email (check console/logs if RESEND_API_KEY not set)

3. **Verify OTP**:
   ```json
   POST /auth/verify-otp
   {
     "token": "<authToken_from_signup>",
     "otpCode": "<otp_from_email>"
   }
   ```
   Response: `accessToken`, `refreshToken`, `sessionId`, `user`

4. **Use Access Token**: Copy `accessToken` and authorize in Swagger

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/signup` | Register new user (sends OTP) | No |
| POST | `/auth/signin` | Login with email/password | No |
| POST | `/auth/verify-otp` | Verify OTP and complete signup | No |
| POST | `/auth/resend-otp` | Resend OTP code | No |
| POST | `/auth/forgot-password` | Request password reset (sends OTP) | No |
| POST | `/auth/verify-forgot-password-otp` | Verify OTP for password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| POST | `/auth/change-password` | Change password (authenticated) | Yes |
| POST | `/auth/refresh-token` | Refresh access token | No |
| POST | `/auth/logout` | Logout and revoke session | Yes |
| GET | `/auth/google` | Redirect to Google OAuth | No |
| GET | `/auth/google/callback` | Google OAuth callback | No |
| POST | `/auth/metamask/challenge` | Get MetaMask challenge | No |
| POST | `/auth/metamask/signin` | Sign in with MetaMask | No |
| POST | `/auth/metamask/link` | Link MetaMask wallet | Yes |
| POST | `/auth/metamask/verify-link` | Verify wallet link | Yes |

### Users (`/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user profile | Yes |
| PUT | `/users/me` | Update user profile | Yes |

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
npm run dev        # Run with hot-reload (ts-node-dev)
```

## Production Considerations

### Security

1. **JWT Secret**: Use strong, random JWT secret
   ```bash
   openssl rand -base64 32
   ```

2. **HTTPS**: Always use HTTPS in production

3. **Rate Limiting**: Already configured via `THROTTLE_TTL` and `THROTTLE_LIMIT`

4. **Environment**: Set `NODE_ENV=production`

### Database

1. **Managed PostgreSQL**: Use AWS RDS, GCP Cloud SQL, etc.
2. **Connection Pooling**: Configure in TypeORM
3. **Migrations**: Set `synchronize: false` and use TypeORM migrations

### Email Service

1. **Resend**: Configure with verified domain
2. **From Address**: Update `RESEND_FROM` with valid sender

### Monitoring

1. **Audit Logs**: All user actions are logged
2. **Health Checks**: Use `/ping` endpoint
3. **Log Aggregation**: Configure centralized logging

## License

ISC
