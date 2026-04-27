/**
 * Role enum — matches the MySQL ENUM column in `users.role`.
 * Used by @Roles() decorator, RolesGuard, and the User entity.
 */
export enum Role {
  CUSTOMER   = 'CUSTOMER',
  ADMIN      = 'ADMIN',
  PRESCRIBER = 'PRESCRIBER',
  DISPENSER  = 'DISPENSER',
}
