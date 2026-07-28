import { Role } from "../types";

export function isAdminRole(role: Role): boolean {
  return role === "ADMIN";
}
