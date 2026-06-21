import { commandsCollection } from "../lib/db.js";
import { requireAdmin, validDeviceId } from "../lib/auth.js";
import { readBody, sendJson, sendOptions, method, withCors } from "../lib/http.js";

export default async function handler(req, res) {
  withCors(req, res);
  if (sendOptions(req, res)) return;
  if (!method(req, res, ["POST"])) return;

  if (!requireAdmin(req)) {
    sendJson(res, 401, { error: "Non autorizzato" });
    return;
  }

  try {
    const body = await readBody(req);
    const id = String(body.id || "").trim();
    const state = String(body.state || "").trim();

    if (!validDeviceId(id)) {
      sendJson(res, 400, { error: "ID dispositivo non valido" });
      return;
    }
    if (!["on", "off", "toggle"].includes(state)) {
      sendJson(res, 400, { error: "Comando non valido" });
      return;
    }

    const commands = await commandsCollection();
    await commands.updateOne(
      { id },
      { $set: { id, state, createdAt: new Date(), consumed: false } },
      { upsert: true }
    );
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}
