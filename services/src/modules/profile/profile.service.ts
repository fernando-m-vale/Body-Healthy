import type { PrismaClient } from "../../generated/prisma/client";
import type { UpsertProfileBody } from "./profile.schemas";

export function getProfile(prisma: PrismaClient, userId: string) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

export function upsertProfile(prisma: PrismaClient, userId: string, data: UpsertProfileBody) {
  const birthDate = data.birthDate === undefined ? undefined : data.birthDate ? new Date(data.birthDate) : null;

  return prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      heightCm: data.heightCm ?? null,
      birthDate: birthDate ?? null,
      biologicalSexForCalc: data.biologicalSexForCalc ?? null,
      activityLevel: data.activityLevel ?? null,
    },
    update: {
      ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
      ...(birthDate !== undefined && { birthDate }),
      ...(data.biologicalSexForCalc !== undefined && { biologicalSexForCalc: data.biologicalSexForCalc }),
      ...(data.activityLevel !== undefined && { activityLevel: data.activityLevel }),
    },
  });
}
