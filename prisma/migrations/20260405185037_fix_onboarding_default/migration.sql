-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "business_type" TEXT,
    "place_id" TEXT,
    "maps_url" TEXT,
    "maps_rating" REAL,
    "maps_review_count" INTEGER,
    "owner_id" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Business_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserBusiness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    CONSTRAINT "UserBusiness_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBusiness_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    CONSTRAINT "Reservation_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "response" TEXT,
    "user_id" TEXT,
    "session_id" TEXT,
    "session_status" TEXT NOT NULL DEFAULT 'active',
    "has_reservation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatbotConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business_id" TEXT NOT NULL,
    "chatbot_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "table_count" INTEGER NOT NULL DEFAULT 0,
    "menu_pdf_url" TEXT,
    "menu" TEXT,
    "campaigns" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "working_hours" TEXT,
    "webhook_url" TEXT,
    CONSTRAINT "ChatbotConfig_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_identifier" TEXT NOT NULL,
    "access_token" TEXT,
    CONSTRAINT "IntegrationConfig_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business_id" TEXT NOT NULL,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "competitors" TEXT,
    "suggestions" TEXT,
    "full_report" TEXT,
    "time_1_week" TEXT,
    "time_1_month" TEXT,
    "time_1_year" TEXT,
    "competitor_weakness_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewAnalysis_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'own',
    "place_id" TEXT,
    "business_name" TEXT,
    "rating" REAL,
    "review_count" INTEGER,
    "reviews_json" TEXT,
    "snapshot_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewSnapshot_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitorBusiness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "rating" REAL,
    "review_count" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitorBusiness_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "UserBusiness_user_id_business_id_key" ON "UserBusiness"("user_id", "business_id");

-- CreateIndex
CREATE INDEX "Message_business_id_session_id_idx" ON "Message"("business_id", "session_id");

-- CreateIndex
CREATE INDEX "Message_business_id_user_id_created_at_idx" ON "Message"("business_id", "user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotConfig_business_id_key" ON "ChatbotConfig"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConfig_platform_platform_identifier_key" ON "IntegrationConfig"("platform", "platform_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAnalysis_business_id_key" ON "ReviewAnalysis"("business_id");

-- CreateIndex
CREATE INDEX "ReviewSnapshot_business_id_snapshot_date_idx" ON "ReviewSnapshot"("business_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "ReviewSnapshot_business_id_source_idx" ON "ReviewSnapshot"("business_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorBusiness_business_id_place_id_key" ON "CompetitorBusiness"("business_id", "place_id");
