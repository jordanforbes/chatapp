const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { SESSION_SECRET } = require("../config");

const router = express.Router();

// routes
// registration routes
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); //hash password
  const user = new User({ username, password: hashedPassword });
  await user.save(); // save user to database
  res.status(201).send("User registered successfully"); //send success response
});

// login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }); // find the user by username
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send("invalid credentials"); // if user not found or password incorrect return error message
  }
  const token = jwt.sign({ userId: user._id }, SESSION_SECRET); //generate JWT token
  res.json({ token }); // send token in response
});

module.exports = router;
