CREATE TABLE "app_metadata" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "app_metadata_pkey" PRIMARY KEY ("key")
);

INSERT INTO "app_metadata" ("key", "value") VALUES ('schema_version', '1');
