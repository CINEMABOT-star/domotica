function applyCors(req, res) {
  const configuredOrigin = process.env.FRONTEND_ORIGIN || "*";
  const requestOrigin = req.headers.origin;
  const allowOrigin = configuredOrigin === "*" ? "*" : configuredOrigin;
  if (!requestOrigin || configuredOrigin === "*" || requestOrigin === configuredOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Device-Token");
  res.setHeader("Vary", "Origin");
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function sendOptions(req, res) {
  if (req.method !== "OPTIONS") {
    return false;
  }
  applyCors(req, res);
  res.statusCode = 204;
  res.end();
  return true;
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        reject(new Error("Body troppo grande"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON non valido"));
      }
    });
    req.on("error", reject);
  });
}

export function method(req, res, allowed) {
  if (allowed.includes(req.method)) {
    return true;
  }
  sendJson(res, 405, { error: "Metodo non consentito" });
  return false;
}

export function withCors(req, res) {
  applyCors(req, res);
}
