import { db } from "utils/firestore";
import { PREVIEW_POLICY } from "config/previewPolicy";

interface PreviewFields {
  previewCount?: number;
  previewWindowStart?: { toDate: () => Date };
}

function getWindowStart(data: PreviewFields): Date | null {
  const raw = data.previewWindowStart;
  if (!raw) return null;
  return typeof raw.toDate === "function" ? raw.toDate() : new Date(raw as unknown as string);
}

function isWindowExpired(windowStart: Date | null): boolean {
  if (PREVIEW_POLICY.windowDays === null || !windowStart) return false;
  const windowMs = PREVIEW_POLICY.windowDays * 24 * 60 * 60 * 1000;
  return Date.now() - windowStart.getTime() > windowMs;
}

/**
 * Returns true if the user is allowed to receive a preview based on the active PREVIEW_POLICY.
 */
export async function checkPreviewAllowed(phone: string): Promise<boolean> {
  if (!isFinite(PREVIEW_POLICY.maxPreviewsPerUser)) return true;

  const snap = await db.collection("users").doc(phone).get();
  const data = (snap.data() ?? {}) as PreviewFields;

  const windowStart = getWindowStart(data);
  if (isWindowExpired(windowStart)) return true; // window reset, allow

  return (data.previewCount ?? 0) < PREVIEW_POLICY.maxPreviewsPerUser;
}

/**
 * Increments the user's preview count, resetting the window if it has expired.
 */
export async function incrementPreviewCount(phone: string): Promise<void> {
  const snap = await db.collection("users").doc(phone).get();
  const data = (snap.data() ?? {}) as PreviewFields;

  const windowStart = getWindowStart(data);
  const shouldResetWindow = !windowStart || isWindowExpired(windowStart);

  await db.collection("users").doc(phone).update(
    shouldResetWindow
      ? { previewCount: 1, previewWindowStart: new Date() }
      : { previewCount: (data.previewCount ?? 0) + 1 }
  );
}
