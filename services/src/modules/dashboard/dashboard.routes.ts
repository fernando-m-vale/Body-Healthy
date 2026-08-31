import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireActiveConsent } from "../consent/require-active-consent";
import { getKeyProvider } from "../../lib/key-provider";
import {
  timelineQuerySchema,
  timelineResponseSchema,
  markerNameParamsSchema,
  markerHistoryResponseSchema,
  currentCycleResponseSchema,
} from "./dashboard.schemas";
import { buildTimeline, getMarkerHistory, getCurrentCycleSummary } from "./dashboard.service";

// Spec 07 — Dashboard Consolidado. Puramente leitura e composição do que as
// Specs 00-06 já produzem — nenhum model novo, nenhum cálculo novo. Todas as
// rotas exigem consentimento de dado de saúde ativo (Spec 00), mesmo padrão
// das specs anteriores.
export default async function dashboardRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const preHandler = [app.authenticate, requireActiveConsent];

  server.get(
    "/dashboard/timeline",
    { schema: { querystring: timelineQuerySchema, response: { 200: timelineResponseSchema } }, preHandler },
    async (request, reply) => {
      const { items, total } = await buildTimeline(
        app.prisma,
        getKeyProvider(),
        request.user.sub,
        request.user.sub,
        request.query,
      );
      return reply.send({ items, total, limit: request.query.limit, offset: request.query.offset });
    },
  );

  server.get(
    "/dashboard/markers/:markerName",
    {
      schema: { params: markerNameParamsSchema, response: { 200: markerHistoryResponseSchema } },
      preHandler,
    },
    async (request, reply) => {
      const history = await getMarkerHistory(app.prisma, request.user.sub, request.params.markerName);
      return reply.send({
        markerName: request.params.markerName,
        history: history.map((m) => ({
          labExamId: m.labExamId,
          examDate: m.labExam.examDate,
          name: m.name,
          value: m.value,
          unit: m.unit,
          referenceMin: m.referenceMin,
          referenceMax: m.referenceMax,
          trend: m.trend,
        })),
      });
    },
  );

  server.get(
    "/dashboard/current-cycle",
    { schema: { response: { 200: currentCycleResponseSchema } }, preHandler },
    async (request, reply) => {
      const summary = await getCurrentCycleSummary(app.prisma, request.user.sub);
      return reply.send(summary);
    },
  );
}
