const required = [
  "MONGODB_URI",
  "MONGODB_DB",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "JWT_SECRET",
  "DEVICE_TOKEN",
  "FRONTEND_ORIGIN"
];

console.log("Variabili richieste su Vercel:");
for (const key of required) {
  console.log(`- ${key}`);
}
