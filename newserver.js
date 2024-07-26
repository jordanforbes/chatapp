const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const redis = require("redis");
const cors = require("cors");
const { SESSION_SECRET } = require("./config");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const authMiddleware = require("./middlewares/auth");
const User = require("./models/user");
const Message = require("./models/message");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const redisClient = redis.createClient();

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

mongoose.connect("mongodb://localhost/chat-app");

app.use("/api/auth", authRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("a user connected", socket.userId);

  socket.on("sendMessage", async (message) => {
    const user = await User.findById(socket.userId);
    const newMessage = new Message({ user: user.username, message });
    await newMessage.save();
    io.emit("message", { user: user.username, message });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
