// serve application

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const redis = require("redis");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express(); //initialize express app
const server = http.createServer(app); //create HTTP server
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
    credentials: true,
  },
});

// setup client instance
const redisCli = redis.createClient(); // creat Redis Client
const SESSION_SECRET = "foobarbaz"; // placeholder key

// configure session middleware
app.use(
  session({
    secret: SESSION_SECRET,
    store: new RedisStore({
      client: redisCli,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(express.json()); //middleware to parse JSON bodies

app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect("mongodb://localhost/chatapp")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(`MongoDB Connection Error: ${err}`));

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
});

const MessageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now() },
});

// create model instances
const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

// routes
// registration routes
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); //hash password
  const user = new User({ username, password: hashedPassword });
  await user.save(); // save user to database
  res.status(201).send("User registered successfully"); //send success response
});

// login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }); // find the user by username
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send("invalid credentials"); // if user not found or password incorrect return error message
  }
  const token = jwt.sign({ userId: user._id }, SESSION_SECRET); //generate JWT token
  res.json({ token }); // send token in response
});

// middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]; //get token from headers
  if (!token) {
    return res.status(401).send("Access Denied"); //if no token, return error response
  }
  try {
    const decoded = jwt.verify(token, SESSION_SECRET); // verify token against session secret
    req.userId = decoded.userId; // Attach userid to request object
    next(); //proceed to next middleware
  } catch (err) {
    res.status(400).send("invalid token");
  }
};

// Middleware to authenticate socket.io connections
io.use((socket, next) => {
  console.log("use works");
  const token = socket.handshake.auth.token; // Get token from handshake
  if (!token) {
    console.log("bad token");

    return next(new Error("Authentication Error"));
  }
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    socket.userId = decoded.userId;
    console.log("good token");
    next();
  } catch (err) {
    next(new Error("authentication Error"));
  }
});

// socket.io connection handler
io.on("connection", (socket) => {
  console.log("a user connected", socket.userId);

  // handle sendMessage request
  socket.on("sendMessage", async (message) => {
    console.log("send message recieved", message);
    const user = await User.findById(socket.userId); //find user by id
    const newMessage = new Message({ user: user.username, message }); //create new message instance
    await newMessage.save(); // save new message to db
    io.emit("message", { user: user.username, message }); //broadcast message to all clients
  });

  // handle disconnection
  socket.on("disconnect", () => {
    console.log("user disconnected"); //log user disconnection
  });
});

// start server
server.listen(8080, () => {
  console.log("server is listening on port 8080");
});
