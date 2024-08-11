const express = require("express");
const app = express();
const path = require("path");
const indexRouter = require("./routers/indexRouter");

const sIO = require("socket.io");
const http = require("http");
const server = http.createServer(app);
const io = sIO(server);

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

let waitingUsers = [];
let rooms = {};

io.on("connection", (socket) => {
  if (waitingUsers.length > 0) {
    let partner = waitingUsers.shift();
    const roomName = `${socket.id}-${partner.id}`;

    socket.join(roomName);
    partner.join(roomName);

    io.to(roomName).emit("joined", roomName);
  } else {
    waitingUsers.push(socket);
  }

  socket.on('message', (data) => {
    socket.to(data.room).emit('message', data.message);
  });

  socket.on("signalingMessage", (data) => {
    socket.broadcast.to(data.room).emit("signalingMessage", data.message);
  })

  socket.on('startVideoCall',({room})=>{
    socket.broadcast.to(room).emit('incomingCall');
  })

  socket.on('acceptCall',({room})=>{
    socket.broadcast.to(room).emit('callAccepted');
  })

  socket.on('rejectCall',({room})=>{
    socket.broadcast.to(room).emit('callRejected');
  })


  socket.on("disconnect", () => {
    let index = waitingUsers.findIndex(
      (waitingUser) => waitingUser.id === socket.id
    );

    waitingUsers.splice(index, 1);

  })
});

app.use("/", indexRouter);

server.listen(3000 || process.env.PORT);
