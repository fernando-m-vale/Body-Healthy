import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// JWT stateless, access token único (sem refresh token nesta etapa — Spec 00, decisão registrada
// na sessão de implementação: sem endpoint de refresh no contrato da spec, expiração longa em vez disso).
const TOKEN_EXPIRATION = "30d";

export default fp(async (app: FastifyInstance) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurado no ambiente");
  }

  app.register(fastifyJwt, {
    secret,
    sign: { expiresIn: TOKEN_EXPIRATION },
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Não autenticado" });
    }
  });
});
