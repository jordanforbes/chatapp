const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Basic connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("sendMessage", (message) => {
    console.log("Received message from client:", message);
    io.emit("message", { user: "User", message });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
