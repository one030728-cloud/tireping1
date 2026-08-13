import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";

const nullableText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

export const buyerSignupSchema = z.object({
  loginId: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9._-]+$/),
  password: z.string().min(8).max(100),
  businessName: z.string().trim().min(1).max(120),
  businessRegNumber: z.string().trim().min(1).max(40),
  ownerName: z.string().trim().min(1).max(80),
  mobilePhone: z.string().trim().min(7).max(30),
  email: nullableText(160),
  businessType: nullableText(80),
  businessCategory: nullableText(120),
  postalCode: nullableText(20),
  address: nullableText(300),
  officePhone: nullableText(30),
  contact1: nullableText(80),
  contact2: nullableText(80),
});

export async function createBuyerApplication(
  data: z.infer<typeof buyerSignupSchema>,
) {
  const passwordHash = await hash(data.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        loginId: data.loginId,
        passwordHash,
        role: "BUYER",
        email: data.email ?? null,
        businessName: data.businessName,
        businessRegNumber: data.businessRegNumber,
        businessType: data.businessType ?? null,
        businessCategory: data.businessCategory ?? null,
        ownerName: data.ownerName,
        postalCode: data.postalCode ?? null,
        address: data.address ?? null,
        officePhone: data.officePhone ?? null,
        mobilePhone: data.mobilePhone,
        contact1: data.contact1 ?? null,
        contact2: data.contact2 ?? null,
      },
    });

    return tx.buyer.create({
      data: {
        userId: user.id,
        status: "PENDING",
      },
      select: { id: true, status: true },
    });
  });
}
