import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { signupBodySchema, loginBodySchema, authResponseSchema, errorResponseSchema } from "./auth.schemas";
import { signup, login, EmailAlreadyRegisteredError, InvalidCredentialsError } from "./auth.service";

// RF23 — criação de conta via e-mail/senha e login.
// Login por e-mail/senha (POST /auth/login) foi adicionado na Spec 00 v3 —
// omissão da v2, sem endpoint de autenticação para usuário já cadastrado.
//
// POST /auth/google intencionalmente NÃO registrado nesta tarefa: requer
// Client ID/Secret OAuth do Google Cloud Console, ainda não disponíveis.
// O model User já tem authProvider/googleSub prontos para plugar esse fluxo depois.
export default async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/auth/signup",
    {
      schema: {
        body: signupBodySchema,
        response: { 201: authResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        const user = await signup(app.prisma, email, password);
        const token = app.jwt.sign({ sub: user.id });

        return reply.code(201).send({
          token,
          user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
        });
      } catch (err) {
        if (err instanceof EmailAlreadyRegisteredError) {
          return reply.code(409).send({ error: "E-mail já cadastrado. Faça login." });
        }
        throw err;
      }
    },
  );

  server.post(
    "/auth/login",
    {
      schema: {
        body: loginBodySchema,
        response: { 200: authResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        const user = await login(app.prisma, email, password);
        const token = app.jwt.sign({ sub: user.id });

        return reply.send({
          token,
          user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
        });
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          return reply.code(401).send({ error: "E-mail ou senha inválidos" });
        }
        throw err;
      }
    },
  );
}
