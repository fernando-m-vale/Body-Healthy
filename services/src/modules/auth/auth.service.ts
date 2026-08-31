import type { PrismaClient } from "../../generated/prisma/client";
import { hashPassword, verifyPassword } from "../../lib/password";

export class EmailAlreadyRegisteredError extends Error {}
export class InvalidCredentialsError extends Error {}

export async function signup(prisma: PrismaClient, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      email,
      authProvider: "email_password",
      passwordHash,
      emailVerified: false,
    },
  });
}

export async function login(prisma: PrismaClient, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.authProvider !== "email_password" || !user.passwordHash) {
    throw new InvalidCredentialsError();
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw new InvalidCredentialsError();
  }

  return user;
}
