import { onRequest } from "firebase-functions/v2/https";

export const health = onRequest((req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
