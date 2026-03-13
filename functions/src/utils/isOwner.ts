import { OWNER_PHONES } from "config/env";

export function isOwner(phone: string): boolean {
  const raw = OWNER_PHONES.value();
  if (!raw) return false;
  return raw.split(",").map((p) => p.trim()).includes(phone);
}
