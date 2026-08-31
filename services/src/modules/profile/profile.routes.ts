import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { upsertProfileBodySchema } from "./profile.schemas";
import { getProfile, upsertProfile } from "./profile.service";

export default async function profileRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/profile",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const profile = await getProfile(app.prisma, request.user.sub);

      if (!profile) {
        return reply.send({
          heightCm: null,
          birthDate: null,
          biologicalSexForCalc: null,
          activityLevel: null,
        });
      }

      return reply.send({
        heightCm: profile.heightCm,
        birthDate: profile.birthDate,
        biologicalSexForCalc: profile.biologicalSexForCalc,
        activityLevel: profile.activityLevel,
      });
    },
  );

  server.put(
    "/profile",
    { schema: { body: upsertProfileBodySchema }, preHandler: app.authenticate },
    async (request, reply) => {
      const profile = await upsertProfile(app.prisma, request.user.sub, request.body);

      return reply.send({
        heightCm: profile.heightCm,
        birthDate: profile.birthDate,
        biologicalSexForCalc: profile.biologicalSexForCalc,
        activityLevel: profile.activityLevel,
      });
    },
  );
}
