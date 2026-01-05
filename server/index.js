const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "X-Requested-With",
    ],
    credentials: false,
  })
);
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cache-Control, X-Requested-With"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${
      req.path
    } - Origin: ${req.get("Origin")}`
  );
  next();
});

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/telemetryDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Telemetry Schema
const telemetrySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  timestamp: { type: Date, required: true },
  temperature: { type: Number, required: true },
  position: { type: String, required: true },
  pressure: { type: Number, required: true },
  humidity: { type: Number, required: true },
  velocity: { type: Number, required: true },
  status: { type: String, required: true },
  batteryLevel: { type: Number, required: true },
});

const Telemetry = mongoose.model("Telemetry", telemetrySchema);

// SSE clients storage
let sseClients = [];

// File monitoring state
let isIngesting = false;
let fileWatcher = null;
let lastFilePosition = 0;

// SSE endpoint
app.get("/api/telemetry/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Cache-Control, X-Requested-With",
  });

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on("close", () => {
    sseClients = sseClients.filter((client) => client.id !== clientId);
  });
});

// Broadcast to all SSE clients
function broadcastToClients(data) {
  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error("Error broadcasting to client:", error);
    }
  });
}

// Parse telemetry line
function parseTelemetryLine(line) {
  try {
    const parts = line.trim().split(",");
    if (parts.length !== 9) return null;

    return {
      id: parts[0],
      timestamp: new Date(parts[1]),
      temperature: parseFloat(parts[2]),
      position: parts[3],
      pressure: parseFloat(parts[4]),
      humidity: parseFloat(parts[5]),
      velocity: parseFloat(parts[6]),
      status: parts[7],
      batteryLevel: parseFloat(parts[8]),
    };
  } catch (error) {
    console.error("Error parsing line:", line, error);
    return null;
  }
}

// Process new telemetry data
async function processNewData(forceFullReprocess = false) {
  try {
    const filePath = path.join(__dirname, "telemetry.txt");

    if (!fs.existsSync(filePath)) {
      console.error("Telemetry file not found");
      return;
    }

    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size}, Last position: ${lastFilePosition}`);
    if (stats.size < lastFilePosition || forceFullReprocess) {
      console.log(
        "File size decreased or full reprocess requested - reprocessing entire file"
      );
      lastFilePosition = 0;

      await Telemetry.deleteMany({});
      console.log("Cleared existing database records");
    }

    if (stats.size <= lastFilePosition && !forceFullReprocess) {
      console.log("No new data to process");
      return;
    }

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath, {
        start: lastFilePosition,
        encoding: "utf8",
      });

      let buffer = "";
      let processedLines = 0;

      stream.on("data", async (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop();

        // Process lines sequentially
        for (const line of lines) {
          if (line.trim()) {
            const telemetryData = parseTelemetryLine(line);
            if (telemetryData) {
              try {
                const result = await Telemetry.findOneAndUpdate(
                  { id: telemetryData.id },
                  telemetryData,
                  { upsert: true, new: true }
                );

                console.log(`Processed record: ${telemetryData.id}`);
                processedLines++;

                // Broadcast to SSE clients
                broadcastToClients({
                  type: "telemetry_update",
                  data: telemetryData,
                });
              } catch (dbError) {
                console.error("Database error:", dbError);
              }
            }
          }
        }
      });

      stream.on("end", () => {
        lastFilePosition = stats.size;
        console.log(
          `Processed ${processedLines} lines, new file position: ${lastFilePosition}`
        );
        resolve();
      });

      stream.on("error", (error) => {
        console.error("Stream error:", error);
        reject(error);
      });
    });
  } catch (error) {
    console.error("Error processing file:", error);
    throw error;
  }
}

// Handle preflight requests
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cache-Control, X-Requested-With"
  );
  res.sendStatus(200);
});

// Start ingestion
app.post("/api/start", (req, res) => {
  try {
    console.log("Received start request");

    if (isIngesting) {
      return res.json({
        message: "Ingestion already running",
        status: "running",
      });
    }

    isIngesting = true;

    lastFilePosition = 0;

    processNewData();

    const filePath = path.join(__dirname, "telemetry.txt");

    try {
      fileWatcher = fs.watch(filePath, (eventType, filename) => {
        if (isIngesting && (eventType === "change" || eventType === "rename")) {
          console.log(`File ${filename} was ${eventType}d`);

          setTimeout(() => {
            processNewData();
          }, 50);
        }
      });
    } catch (watchError) {
      console.warn("fs.watch failed, falling back to watchFile:", watchError);
      fileWatcher = fs.watchFile(filePath, { interval: 100 }, () => {
        if (isIngesting) {
          processNewData();
        }
      });
    }

    console.log("Ingestion started successfully");
    res.json({ message: "Ingestion started", status: "running" });
  } catch (error) {
    console.error("Error starting ingestion:", error);
    res
      .status(500)
      .json({ error: "Failed to start ingestion", details: error.message });
  }
});

// Stop ingestion
app.post("/api/stop", (req, res) => {
  try {
    console.log("Received stop request");

    if (!isIngesting) {
      return res.json({ message: "Ingestion not running", status: "stopped" });
    }

    isIngesting = false;

    if (fileWatcher) {
      try {
        if (typeof fileWatcher.close === "function") {
          fileWatcher.close(); // For fs.watch
        } else {
          const filePath = path.join(__dirname, "telemetry.txt");
          fs.unwatchFile(filePath); // For fs.watchFile
        }
      } catch (closeError) {
        console.warn("Error closing file watcher:", closeError);
      }
      fileWatcher = null;
    }

    console.log("Ingestion stopped successfully");
    res.json({ message: "Ingestion stopped", status: "stopped" });
  } catch (error) {
    console.error("Error stopping ingestion:", error);
    res
      .status(500)
      .json({ error: "Failed to stop ingestion", details: error.message });
  }
});

// Get all telemetry data
app.get("/api/telemetry", async (req, res) => {
  try {
    const data = await Telemetry.find().sort({ timestamp: -1 }).limit(1000);
    res.json(data);
  } catch (error) {
    console.error("Error fetching telemetry:", error);
    res.status(500).json({ error: "Failed to fetch telemetry data" });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Telemetry API Server",
    status: "running",
    endpoints: [
      "/api/health",
      "/api/telemetry",
      "/api/start",
      "/api/stop",
      "/api/telemetry/stream",
    ],
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    ingesting: isIngesting,
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint for debugging CORS
app.get("/api/test", (req, res) => {
  res.json({
    message: "CORS test successful",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/test", (req, res) => {
  res.json({
    message: "POST test successful",
    body: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Manual trigger for processing telemetry file
app.post("/api/process", async (req, res) => {
  try {
    console.log("Manual processing triggered");
    await processNewData();
    res.json({
      message: "Processing completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Manual processing error:", error);
    res
      .status(500)
      .json({ error: "Processing failed", details: error.message });
  }
});

// Full reprocess - clears DB and reprocesses entire file
app.post("/api/reprocess", async (req, res) => {
  try {
    console.log("Full reprocessing triggered - clearing database");

    await Telemetry.deleteMany({});

    lastFilePosition = 0;

    await processNewData();

    res.json({
      message: "Full reprocessing completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Full reprocessing error:", error);
    res
      .status(500)
      .json({ error: "Full reprocessing failed", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB connected to telemetry database`);
});
