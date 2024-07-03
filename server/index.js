const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { userJoin, getCurrentUser, getRoomUsers, roomJoin, getCurrentRooms, userLeave, setEditorUser } = require("./utils/users");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
        methods: ["POST", "GET"]
    },
})

var gameStarted = false;

io.on("connection", async (socket) => {

    socket.on("joinRoom", data => {
      const { nick, idRoom, typeRoom, created } = data;

      let user = userJoin(socket.id, nick, idRoom);

      if(created){
        roomJoin(socket.id, idRoom, typeRoom);   
      }
      
      socket.join(idRoom);
      socket.emit("chat", {message: `Welcome to Chat ${nick}`, type: "welcome"});
      socket.broadcast.emit('chat', {message: `${nick} has joined in room`, type: "info"});
      io.to(user.id).emit('user', user);

      let usersActives = getRoomUsers(idRoom);
      if(usersActives.length > 1 && !gameStarted){
        gameStarted = true;
        io.to(idRoom).emit("gameStarts", `Your match will start`);
        // setEditorUser(idRoom, 0);
      }

      io.emit('roomTypes', getCurrentRooms());
      io.to(idRoom).emit('roomUsers', getRoomUsers(idRoom));
    });

    socket.on("canvasImage", (data) => {
      let user = getCurrentUser(socket.id);
      if(user){
        io.to(user.room).emit('renderImage', data);
      }
    });

    socket.on("message", message => {
      let user = getCurrentUser(socket.id);
      if(user){
        io.to(user.id).emit("chat", {message: `Me: ${message}`});
        socket.broadcast.emit("chat", {message: `${user.username}: ${message}`});
      }
    })

    socket.on("messageAnswers", message => {
      let user = getCurrentUser(socket.id);
      if(user){
        io.to(user.id).emit("answers", {message: `Me: ${message}`, type: "wrong"});
        socket.broadcast.emit("answers", {message: `${user.username}: ${message}`, type: "wrong"});
      }
    })

   socket.on("disconnect", () => {
        var countUsersRoom; 
        let user = userLeave(socket.id);
        if(user){
            io.to(user.room).emit('roomUsers', getRoomUsers(user.room));
            io.to(user.room).emit("chat", {message: `${user.username} has left the room`, type: "left"});
            countUsersRoom = getRoomUsers(user.room);
        }

        if(countUsersRoom && countUsersRoom.length <= 1){
          gameStarted = false;
        }

        io.emit('roomTypes', getCurrentRooms());
    })

    socket.on("getRoomTypes", () => {
      io.emit('roomTypes', getCurrentRooms());
    });
})

server.listen(3001, () => {
    console.log("Server RUNNING")
})