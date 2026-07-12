import type { Locale, UserRole } from "./enums";

/** DTO public d'un utilisateur — aligné sur le modèle Prisma `User` (jamais le hash). */
export interface UserDTO {
  id: string;
  email: string;
  role: UserRole;
  locale: Locale;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerifiedAt: string | null; // ISO 8601 UTC
  createdAt: string;
}
