import { devicesCollection } from "../lib/db.js";
import { requireDevice, validDeviceId } from "../lib/auth.js";
import { readBody, sendJson, sendOptions, method, withCors } from "../lib/http.js";

export default async function handler(req, res) {
  withCors(req, res);
  if (sendOptions(req, res)) return;
  if (!method(req, res, ["POST"])) return;

  if (!requireDevice(req)) {
    sendJson(res, 401, { error: "Token dispositivo non valido" });
    return;
  }

  try {
    const body = await readBody(req);
    const id = String(body.id || "").trim();
    if (!validDeviceId(id)) {
      sendJson(res, 400, { error: "ID dispositivo non valido" });
      return;
    }

    const devices = await devicesCollection();
    await devices.updateOne(
      { id },
      {
        $set: {
          id,
          name: body.name || id,
          room: body.room || "Casa",
          type: body.type || "light",
          state: body.state || "unknown",
          reason: body.reason || null,
          rssi: Number.isFinite(body.rssi) ? body.rssi : null,
          uptimeMs: Number.isFinite(body.uptimeMs) ? body.uptimeMs : null,
          availability: "online",
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}
