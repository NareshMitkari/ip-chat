const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

function getClientIP(socket) {
  let ip = socket.handshake.address;

  if (ip.includes("::ffff:")) {
    ip = ip.split("::ffff:")[1];
  }

  return ip.replace(/\./g, "_");
}

io.on("connection", (socket) => {
  const ip = getClientIP(socket);
  const username = `User_${ip}`;

  socket.username = username;

  io.emit("system", `${username} joined`);

  socket.on("message", (msg) => {
    io.emit("message", {
      user: socket.username,
      text: msg,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on("disconnect", () => {
    io.emit("system", `${username} left`);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
