import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";

/** Admins always see Payments. Employees see it only when an admin turns it on. */
export function canViewPayments(user: Pick<User, "role" | "canViewPayments"> | null | undefined) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.canViewPayments === true;
}

/** Reads the live employee record so an admin's toggle applies without a stale login copy. */
export function useCanViewPayments() {
  const user = useAppStore((s) => s.currentUser);
  const employees = useAppStore((s) => s.employees);
  if (!user) return false;
  if (user.role === "admin") return true;
  const live = employees.find((employee) => employee.id === user.id);
  return canViewPayments(live ?? user);
}
