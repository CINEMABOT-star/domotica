import { MongoClient } from "mongodb";

let clientPromise;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Manca MONGODB_URI");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "domotica");
}

export async function devicesCollection() {
  return (await getDb()).collection("devices");
}

export async function commandsCollection() {
  return (await getDb()).collection("commands");
}
