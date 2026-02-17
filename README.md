# OpenClaw Protection Service

AI-driven protection against prompt injection, API abuse, and anomalous user behaviors.

## Quickstart

```bash
cp .env.example .env
docker-compose up
visit http://localhost:3000
```

## Development

```bash
npm run dev  # concurrent web/api
```

## Features

- User signup/login with email verification
- Stripe subscription flow (Basic: $19/mo, Pro: $49/mo)
- API key generation with rate limiting
- Risk scoring engine
- User dashboard

## Stack

- **Frontend:** Next.js 14 (App Router)
- **Backend:** Express.js
- **Database:** PostgreSQL + Prisma
- **Cache:** Redis
- **Payments:** Stripe

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/stripe/checkout` - Create checkout session
- `GET /api/user/me` - Get user profile
- `POST /api/protected/echo` - Protected test endpoint

## License

MIT
