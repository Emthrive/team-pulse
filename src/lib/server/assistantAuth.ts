import { timingSafeEqual } from "crypto";

/** Token-ul asistentului din header (`Authorization: Bearer <ASSISTANT_API_TOKEN>`), comparat în
 *  timp constant. Fără token configurat → refuz tot. */
export function assistantAuthorized(req: Request): boolean {
  const expected = process.env.ASSISTANT_API_TOKEN || "";
  if (!expected) return false;
  const header = req.headers.get("authorization") || "";
  const got = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
