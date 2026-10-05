import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { models } from "../models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

export const getMongoUri = () => {
  dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });
  let uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/propconnect_db";
  if (uri.includes("host.docker.internal") && process.platform === "win32") {
    uri = uri.replace("host.docker.internal", "127.0.0.1");
  }
  return uri;
};

export const MONGODB_URI = getMongoUri();
export const COMPASS_URI = process.env.COMPASS_CONNECTION_STRING || "mongodb://127.0.0.1:27017";

let isConnecting = false;

export async function connectMongoDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (isConnecting) return null;

  isConnecting = true;
  const targetUri = getMongoUri();

  try {
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 5000,
    });
    isConnecting = false;
    console.log("🍃 [MongoDB] Successfully connected to:", targetUri);
    console.log("🧭 [MongoDB Compass] Paste in Compass New Connection:", COMPASS_URI);
    console.log("🎯 [MongoDB] Database:", mongoose.connection.name || "propconnect_db");
    return mongoose.connection;
  } catch (err) {
    isConnecting = false;
    console.log("⚠️  [MongoDB] Connection notice: MongoDB is not responding at " + targetUri);
    console.log("💡 [MongoDB Compass Quick-Start Guide]:");
    console.log("   1. Open MongoDB Compass (or start MongoDB service: 'net start MongoDB')");
    console.log("   2. In Compass, connect to: " + COMPASS_URI);
    console.log("   3. As soon as MongoDB is running, this backend will auto-connect and seed 'propconnect_db'!");
    return null;
  }
}

// Connection event listeners
mongoose.connection.on("connected", () => {
  console.log("🍃 [MongoDB Event] Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  // Silence verbose logs when offline
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️  [MongoDB Event] Disconnected from MongoDB");
});

export async function getMongoStatus() {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const status = states[readyState] || "offline";
  const isConnected = readyState === 1;

  const counts = {};
  if (isConnected) {
    for (const [key, model] of Object.entries(models)) {
      try {
        counts[key] = await model.countDocuments();
      } catch {
        counts[key] = 0;
      }
    }
  } else {
    for (const key of Object.keys(models)) {
      counts[key] = 0;
    }
  }

  return {
    status: isConnected ? "connected" : "offline",
    readyState: status,
    engine: "MongoDB Compass",
    database: mongoose.connection.name || "propconnect_db",
    host: isConnected ? (mongoose.connection.host || "127.0.0.1:27017") : "127.0.0.1:27017 (Offline)",
    compassUri: COMPASS_URI,
    connectionUri: getMongoUri(),
    tables: counts,
    collections: counts,
    serverTime: new Date().toISOString(),
  };
}

export default mongoose;
