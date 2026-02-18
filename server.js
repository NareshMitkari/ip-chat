const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs").promises;
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const USERS_FILE = "userdetails.json";
const MSG_FILE = "messages.json";

/* Ensure files exist */
async function ensureFiles() {
  try { await fs.access(USERS_FILE); } catch { await fs.writeFile(USERS_FILE, "[]"); }
  try { await fs.access(MSG_FILE); } catch { await fs.writeFile(MSG_FILE, "[]"); }
}
ensureFiles();

/* Helpers */
function uuid() { return crypto.randomUUID(); }
async function read(file) { const data = await fs.readFile(file, "utf-8"); return JSON.parse(data); }
async function write(file, data) { await fs.writeFile(file, JSON.stringify(data, null, 2)); }

/* File Upload */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ file: req.file.filename });
});

/* Register */
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const users = await read(USERS_FILE);
  if (users.find(u => u.username === username)) return res.json({ success: false });

  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuid(), username, password: hashed };
  users.push(user);
  await write(USERS_FILE, users);

  res.json({ success: true, user: { id: user.id, username: user.username } });
});

/* Login */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await read(USERS_FILE);
  const user = users.find(u => u.username === username);
  if (!user) return res.json({ success: false });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false });

  res.json({ success: true, user: { id: user.id, username: user.username } });
});

/* Users */
app.get("/users", async (req, res) => {
  const users = await read(USERS_FILE);
  res.json(users.map(u => ({ id: u.id, username: u.username })));
});

/* Messages */
app.get("/messages/:u1/:u2", async (req, res) => {
  const messages = await read(MSG_FILE);
  const chat = messages.filter(m =>
    (m.from === req.params.u1 && m.to === req.params.u2) ||
    (m.from === req.params.u2 && m.to === req.params.u1)
  );
  res.json(chat);
});

/* Socket.IO */
io.on("connection", socket => {
  socket.on("join", user => socket.join(user.id));

  socket.on("sendMessage", async data => {
    const messages = await read(MSG_FILE);
    const msg = {
      id: uuid(),
      from: data.from,
      to: data.to,
      type: data.type,
      content: data.content,
      time: new Date().toLocaleTimeString()
    };
    messages.push(msg);
    await write(MSG_FILE, messages);

    io.to(data.to).emit("newMessage", msg);
    io.to(data.from).emit("newMessage", msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));