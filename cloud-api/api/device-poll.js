import { commandsCollection } from "../lib/db.js";
import { requireDevice, validDeviceId } from "../lib/auth.js";
import { sendJson, sendOptions, method, withCors } from "../lib/http.js";

export default async function handler(req, res) {
  withCors(req, res);
  if (sendOptions(req, res)) return;
  if (!method(req, res, ["GET"])) return;

  if (!requireDevice(req)) {
    sendJson(res, 401, { error: "Token dispositivo non valido" });
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const id = String(url.searchParams.get("id") || "").trim();
  if (!validDeviceId(id)) {
    sendJson(res, 400, { error: "ID dispositivo non valido" });
    return;
  }

  const commands = await commandsCollection();
  const command = await commands.findOneAndUpdate(
    { id, consumed: false },
    { $set: { consumed: true, consumedAt: new Date() } },
    { sort: { createdAt: -1 }, returnDocument: "before" }
  );

  sendJson(res, 200, { state: command?.state || "none" });
}
