const express = require("express");
const Message = require("../models/message");
const User = require("../models/user");

const router = express.Router();

router.get("/messages", async (req, res) => {
  const messages = await Message.find().sort({ timestamp: -1 }).limit(10);
  res.json(messages);
});

module.exports = router;
