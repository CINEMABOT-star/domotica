import { requireAdmin } from "../lib/auth.js";
import { getDb } from "../lib/db.js";
import { sendJson, sendOptions, method, withCors } from "../lib/http.js";

function mongoShape(uri) {
  return {
    present: Boolean(uri),
    startsCorrect: String(uri || "").startsWith("mongodb+srv://") || String(uri || "").startsWith("mongodb://"),
    containsAngleBrackets: String(uri || "").includes("<") || String(uri || "").includes(">"),
    containsLineBreak: /[\r\n]/.test(String(uri || "")),
    containsDbPasswordPlaceholder: String(uri || "").includes("db_password"),
    containsMongoDbVariableText: String(uri || "").includes("MONGODB_DB=")
  };
}

export default async function handler(req, res) {
  withCors(req, res);
  if (sendOptions(req, res)) return;
  if (!method(req, res, ["GET"])) return;

  if (!requireAdmin(req)) {
    sendJson(res, 401, { error: "Non autorizzato" });
    return;
  }

  const shape = mongoShape(process.env.MONGODB_URI);
  try {
    const db = await getDb();
    await db.admin().ping();
    sendJson(res, 200, {
      ok: true,
      mongodb: shape,
      database: process.env.MONGODB_DB || "domotica"
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      mongodb: shape,
      database: process.env.MONGODB_DB || "domotica",
      errorName: error.name,
      errorMessage: error.message
    });
  }
}
