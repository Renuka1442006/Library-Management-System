
const path = require("path");
const express = require("express");
const client = require("prom-client");

const app = express();
const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "public");

// Prometheus default Node.js metrics
client.collectDefaultMetrics();

// Track HTTP request duration and count
const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

app.use(express.json());

// Monitor incoming HTTP requests
app.use((request, response, next) => {
  // Avoid counting Prometheus scrapes as application traffic
  if (request.path === "/metrics") {
    return next();
  }

  const end = httpDuration.startTimer();

  response.on("finish", () => {
    end({
      method: request.method,
      route: request.route?.path || request.path,
      status: String(response.statusCode),
    });
  });

  next();
});

// Prometheus metrics endpoint
app.get("/metrics", async (request, response, next) => {
  try {
    response.set(
      "Content-Type",
      client.register.contentType
    );

    response.end(await client.register.metrics());
  } catch (error) {
    next(error);
  }
});

// Health check
app.get("/api/health", (request, response) => {
  response.json({
    status: "ok",
    message:
      "Library frontend server is running. Library records stay in browser LocalStorage."
  });
});

// API 404 handler
app.use("/api", (request, response) => {
  response.status(404).json({
    error: "API endpoint not found."
  });
});

// Serve frontend
app.use(express.static(publicDirectory));

// Error handler
app.use((error, request, response, next) => {
  console.error("Request error:", error.message);

  response.status(error.status || 500).json({
    error:
      error.status === 400
        ? "Invalid JSON request body."
        : "An unexpected server error occurred."
  });
});

app.listen(port, () => {
  console.log(
    `Library Management System is running at http://localhost:${port}`
  );

  console.log(
    "Library records are stored in each browser's LocalStorage, not on the server."
  );
});
