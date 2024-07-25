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

const app = express(); //initialize express app
const server = http.createServer(app); //create HTTP server
const io = socketIo(server);

// setup client instance
const redisCli = redis.createClient(); // creat Redis Client
const SESSION_SECRET = "foobarbaz"; // placeholder key


// configure session middleware
app.use(session({
  store: new RedisStore({ client: redisCli}),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {secure: false }
}))

app.use(express.json()); //middleware to parse JSON bodies

// define mongoose Schemas and models
mongoose.connect('mongodb://localhost/chatapp',{
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String;
});

const MessageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now()}
})

// create model instances
const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

// routes
// registration routes
app.post('/register', async (req, res)=>{
  const {username, password} = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); //hash password
  const user = new User({ username, password: hashedPassword});
  await user.save(); // save user to database
  res.status(201).send('User registered successfully'); //send success response
})

// start server
server.listen(3000,()=>{
  console.log('server is listening on port 3000');
})
