# FORGE Deployment Notes

## Required Environment Variables

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-production-domain.com"
AUTH_TRUST_HOST=true
ALIYUN_API_KEY="your-llm-api-key"
LLM_API_URL="https://coding.dashscope.aliyuncs.com/apps/anthropic/v1/messages"
```

## Database

FORGE now ships with a committed Prisma migration:

```bash
npm run db:generate
npm run db:deploy
```

For local development:

```bash
npm run db:migrate
```

The default schema uses SQLite for prototype simplicity. Before a public multi-user launch, consider moving `prisma/schema.prisma` to PostgreSQL and creating a follow-up migration.

## Verification

Run these before deployment:

```bash
npm run test:core
npm run lint
npm run build
npm run test:api
```

`npm run test:api` starts the production server from `.next`, so run `npm run build` first.

## Demo Mode

`/demo` creates a local sample athlete workspace and sets a short-lived `forge-demo=1` cookie. It does not create a real account, call the LLM API, or write to the database.
