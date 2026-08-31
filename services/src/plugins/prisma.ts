import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app: FastifyInstance) => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  app.decorate("prisma", prisma);

  app.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
});
