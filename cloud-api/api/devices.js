import { requireAdmin } from "../lib/auth.js";
import { devicesCollection } from "../lib/db.js";
import { sendJson, sendOptions, method, withCors } from "../lib/http.js";

export default async function handler(req, res) {
  withCors(req, res);
  if (sendOptions(req, res)) return;
  if (!method(req, res, ["GET"])) return;

  if (!requireAdmin(req)) {
    sendJson(res, 401, { error: "Non autorizzato" });
    return;
  }

  const devices = await devicesCollection();
  const list = await devices.find({}, { projection: { _id: 0 } }).sort({ room: 1, name: 1 }).toArray();
  sendJson(res, 200, { devices: list });
}
