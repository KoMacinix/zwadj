// ⚠ Alignés MANUELLEMENT sur apps/api/prisma/schema.prisma (décision validée :
// pas de générateur au MVP). Toute modification du schéma doit être répercutée ici.
export const UserRole = { CLIENT: "CLIENT", PRO: "PRO", ADMIN: "ADMIN" } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Locale = { fr: "fr", ar: "ar" } as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const BookingMode = { SINGLE_SLOT: "SINGLE_SLOT", MULTI_SLOT: "MULTI_SLOT" } as const;
export type BookingMode = (typeof BookingMode)[keyof typeof BookingMode];

export const BookingStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED"
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentMethod = { ONLINE: "ONLINE", CASH: "CASH" } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ServicePricingType = {
  FIXED: "FIXED",
  PER_GUEST: "PER_GUEST",
  TIERED: "TIERED",
  PER_UNIT: "PER_UNIT"
} as const;
export type ServicePricingType = (typeof ServicePricingType)[keyof typeof ServicePricingType];

export const VenuePublicationStatus = { DRAFT: "DRAFT", PENDING: "PENDING", PUBLISHED: "PUBLISHED" } as const;
export type VenuePublicationStatus = (typeof VenuePublicationStatus)[keyof typeof VenuePublicationStatus];

// D33 (Flux A, Lot A2) : visibilité libre-service du PRO, réversible,
// orthogonale à VenuePublicationStatus (modération) et au soft delete.
export const VenueAvailabilityStatus = {
  ACTIVE: "ACTIVE",
  HIDDEN: "HIDDEN",
  TEMPORARILY_UNAVAILABLE: "TEMPORARILY_UNAVAILABLE"
} as const;
export type VenueAvailabilityStatus = (typeof VenueAvailabilityStatus)[keyof typeof VenueAvailabilityStatus];

export const VisitStatus = { CONFIRMED: "CONFIRMED", CANCELLED: "CANCELLED" } as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];
