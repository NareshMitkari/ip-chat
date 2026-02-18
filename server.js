const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {

  socket.on("join", (username) => {
    socket.username = username;
    socket.broadcast.emit("system", `${username} joined`);
  });

  socket.on("message", (data) => {
    const msgData = {
      user: socket.username,
      text: data.text,
      image: data.image || null,
      time: new Date().toLocaleTimeString()
    };

    // Send to others
    socket.broadcast.emit("message", msgData);

    // Send back to sender (mark as own message)
    socket.emit("message", { ...msgData, self: true });
  });

  socket.on("disconnect", () => {
    if (socket.username)
      socket.broadcast.emit("system", `${socket.username} left`);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
