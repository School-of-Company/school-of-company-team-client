import { userDestination, type User } from "@/entities/user";

export function guardDestination(user: User, require: "work" | "account") {
  if (require === "account" && user.status === "ACTIVE") return null;
  const destination = userDestination(user);
  return destination === "/me" ? null : destination;
}
