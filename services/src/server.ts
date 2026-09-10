import "dotenv/config";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import prismaPlugin from "./plugins/prisma";
import jwtPlugin from "./plugins/jwt";
import s3Plugin from "./plugins/s3";
import authRoutes from "./modules/auth/auth.routes";
import consentRoutes from "./modules/consent/consent.routes";
import profileRoutes from "./modules/profile/profile.routes";
import examsRoutes from "./modules/exams/exams.routes";
import imagingReportsRoutes from "./modules/imaging-reports/imaging-reports.routes";
import bioimpedanceRoutes from "./modules/bioimpedance/bioimpedance.routes";
import prescriptionsRoutes from "./modules/prescriptions/prescriptions.routes";
import cyclesRoutes from "./modules/cycles/cycles.routes";
import checkInsRoutes from "./modules/check-ins/check-ins.routes";
import workoutSessionsRoutes from "./modules/workout-sessions/workout-sessions.routes";
import calorieLogsRoutes from "./modules/calorie-logs/calorie-logs.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import accountRoutes from "./modules/account/account.routes";

const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.get("/health", async () => {
  return { status: "ok" };
});

async function main() {
  await app.register(prismaPlugin);
  await app.register(jwtPlugin);
  await app.register(s3Plugin);

  await app.register(authRoutes);
  await app.register(consentRoutes);
  await app.register(profileRoutes);
  await app.register(examsRoutes);
  await app.register(imagingReportsRoutes);
  await app.register(bioimpedanceRoutes);
  await app.register(prescriptionsRoutes);
  await app.register(cyclesRoutes);
  await app.register(checkInsRoutes);
  await app.register(workoutSessionsRoutes);
  await app.register(calorieLogsRoutes);
  await app.register(dashboardRoutes);
  await app.register(accountRoutes);

  const port = Number(process.env.PORT ?? 3000);

  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
