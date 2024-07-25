// serve application

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const redis = require("redis");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express(); //initialize express app
const server = http.createServer(app); //create HTTP server
const io = socketIo(server);

// setup client instance
const redisCli = redis.createClient(); // creat Redis Client
const SESSION_SECRET = "foobarbaz"; // placeholder key

// configure session middleware
app.use(
  session({
    store: new RedisStore({ client: redisCli }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(express.json()); //middleware to parse JSON bodies

// define mongoose Schemas and models
mongoose.connect("mongodb://localhost/chatapp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
  const token = socket.handshake.auth.token; // Get token from handshake
  if (!token) {
    return next(new Error("Authentication Error"));
  }
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("authentication Error"));
  }
});

// socket.io connection error

// start server
server.listen(3000, () => {
  console.log("server is listening on port 3000");
});
