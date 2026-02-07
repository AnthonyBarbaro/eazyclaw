import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    // Runtime (pooled / serverless-safe)
    url: process.env.POSTGRES_PRISMA_URL,

    // Used by Prisma Migrate (non-pooled)
    shadowDatabaseUrl: process.env.POSTGRES_URL_NON_POOLING,
  },
})
