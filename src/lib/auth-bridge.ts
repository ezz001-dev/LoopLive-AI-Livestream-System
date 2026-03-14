import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type AuthBridgeUser = {
  id: string;
  email: string;
  role: "admin";
  authSource: "users" | "admin_users";
};

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function getDefaultDisplayName(email: string) {
  return email.split("@")[0] || "User";
}

async function syncLegacyAdminToUsers(legacyAdmin: { email: string; password: string }) {
  const existingUser = await (prisma as any).users.findUnique({
    where: { email: legacyAdmin.email },
  });

  if (existingUser) {
    return existingUser;
  }

  return (prisma as any).users.create({
    data: {
      email: legacyAdmin.email,
      password_hash: legacyAdmin.password,
      display_name: getDefaultDisplayName(legacyAdmin.email),
      status: "active",
    },
  });
}

export async function authenticateWithBridge(email: string, password: string): Promise<AuthBridgeUser | null> {
  const hashedPassword = hashPassword(password);

  const tenantFacingUser = await (prisma as any).users.findUnique({
    where: { email },
  });

  if (tenantFacingUser && tenantFacingUser.password_hash === hashedPassword) {
    return {
      id: tenantFacingUser.id,
      email: tenantFacingUser.email,
      role: "admin",
      authSource: "users",
    };
  }

  let legacyAdmin = await prisma.admin_users.findUnique({ where: { email } });

  // Keep legacy MVP bootstrap while auth bridge is still in transition.
  if (!legacyAdmin && email === "admin@looplive.ai" && password === "admin123") {
    legacyAdmin = await prisma.admin_users.create({
      data: { email, password: hashedPassword },
    });
  }

  if (!legacyAdmin || legacyAdmin.password !== hashedPassword) {
    return null;
  }

  const bridgedUser = await syncLegacyAdminToUsers(legacyAdmin);

  return {
    id: bridgedUser.id,
    email: bridgedUser.email,
    role: "admin",
    authSource: "admin_users",
  };
}
