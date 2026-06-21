import jwt from "jsonwebtoken";
import { readBody, sendJson, sendOptions, method, withCors } from "../lib/http.js";
import { safeEqual } from "../lib/auth.js";

export default async function handler(req, res) {
  withCors(req, res);
  if (sendOptions(req, res)) return;
  if (!method(req, res, ["POST"])) return;

  try {
    const body = await readBody(req);
    const usernameOk = safeEqual(body.username || "", process.env.ADMIN_USERNAME || "admin");
    const passwordOk = safeEqual(body.password || "", process.env.ADMIN_PASSWORD || "");

    if (!usernameOk || !passwordOk || !process.env.JWT_SECRET) {
      sendJson(res, 401, { error: "Credenziali non valide" });
      return;
    }

    const token = jwt.sign(
      { sub: process.env.ADMIN_USERNAME || "admin", role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );
    sendJson(res, 200, { token, username: process.env.ADMIN_USERNAME || "admin" });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}
