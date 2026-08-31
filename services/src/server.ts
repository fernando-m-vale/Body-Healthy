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

  const port = Number(process.env.PORT ?? 3000);

  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
