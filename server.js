const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "public");

app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({
    status: "ok",
    message: "Library frontend server is running. Library records stay in browser LocalStorage."
  });
});

app.use("/api", (request, response) => {
  response.status(404).json({ error: "API endpoint not found." });
});

app.use(express.static(publicDirectory));

app.use((error, request, response, next) => {
  console.error("Request error:", error.message);
  response.status(error.status || 500).json({
    error: error.status === 400 ? "Invalid JSON request body." : "An unexpected server error occurred."
  });
});

app.listen(port, () => {
  console.log(`Library Management System is running at http://localhost:${port}`);
  console.log("Library records are stored in each browser's LocalStorage, not on the server.");
});
