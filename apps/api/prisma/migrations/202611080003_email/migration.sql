ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
CREATE TABLE "email_tokens" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "purpose" TEXT NOT NULL CHECK ("purpose" IN ('verify', 'reset')),
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "email_tokens_userId_purpose_createdAt_idx" ON "email_tokens"("userId", "purpose", "createdAt");
