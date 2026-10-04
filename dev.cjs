// dev.cjs - Starts both backend and frontend development servers concurrently
const { spawn } = require("child_process");
const path = require("path");

console.log("==================================================================");
console.log(" 🏢 Tenant & Landlord Management System - Starting Development Stack");
console.log("==================================================================");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

// 1. Backend Server (Express + MongoDB)
console.log("▶ Starting Backend API server on http://localhost:5000 ...");
const backend = spawn("node", ["--watch", "server.js"], {
  cwd: path.join(__dirname, "backend"),
  stdio: "inherit",
  shell: true,
});

// 2. Frontend Development Server (Vite React)
console.log("▶ Starting Frontend UI server on Vite ...");
const frontend = spawn(npmCmd, ["run", "dev"], {
  cwd: path.join(__dirname, "frontend"),
  stdio: "inherit",
  shell: true,
});

backend.on("error", (err) => console.error("❌ Backend process error:", err));
frontend.on("error", (err) => console.error("❌ Frontend process error:", err));

const cleanup = () => {
  console.log("\n🛑 Stopping all services...");
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
