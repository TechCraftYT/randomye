const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const fs = require("fs");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

let users = {};
let messages = [];

try {
  users = JSON.parse(fs.readFileSync("./users.json"));
} catch {
  users = {};
}

try {
  messages = JSON.parse(fs.readFileSync("./messages.json"));
} catch {
  messages = [];
}

app.post("/signup", async (req, res) => {
  const username = req.body.username.toLowerCase();
  const password = req.body.password;

  if (users[username]) {
    return res.status(400).send("Username already taken");
  }

  const hash = await bcrypt.hash(password, 10);
  users[username] = hash;

  fs.writeFile("./users.json", JSON.stringify(users, null, 2), (err) => {
    if (err) {
      console.error("Error writing users.json:", err);
      return res.status(500).send("Server error");
    }
    res.send("Signup successful");
  });
});

app.post("/login", async (req, res) => {
  const username = req.body.username.toLowerCase();
  const password = req.body.password;

  const hash = users[username];
  if (!hash) return res.status(401).send("Invalid username or password");

  const valid = await bcrypt.compare(password, hash);
  if (!valid) return res.status(401).send("Invalid username or password");

  res.send("Logged in");
});

app.get("/messages", (req, res) => {
  res.json(messages);
});

io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    messages.push(msg);

    fs.writeFile("./messages.json", JSON.stringify(messages, null, 2), (err) => {
      if (err) {
        console.error("Error writing messages.json:", err);
      }
    });

    io.emit("chat message", msg);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on ${PORT}`));
