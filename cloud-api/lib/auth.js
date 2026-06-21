import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function requireAdmin(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireDevice(req) {
  const provided = req.headers["x-device-token"] || "";
  const expected = process.env.DEVICE_TOKEN || "";
  return Boolean(expected) && safeEqual(provided, expected);
}

export function validDeviceId(id) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(String(id || ""));
}
