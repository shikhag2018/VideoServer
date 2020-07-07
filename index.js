var express = require('express');
var app = express();
var open = require('open');
var serverPort = 4443;
var http = require('http');
var server;
server = http.createServer(app);
var io = require('socket.io')(server);
const path = require('path');

var sockets = {};
var users = {};

function sendTo(connection, message) {
    connection.send(message);
}
 
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});

server.listen(serverPort, function(){
  console.log('server up and running at %s port', serverPort);
  open('http://localhost:' + serverPort)
  
});
 
io.on("connection", socket => {
  console.log("connected socket id " + socket.id);
  
  socket.on('disconnect', function () {
    console.log("disconnected " + socket.id);
    if(socket.name){
      socket.broadcast.to("chatroom").emit('roommessage',{ type: "disconnect", username: socket.name})
      delete sockets[socket.name];
      delete users[socket.name];
    }
 
  })


 
socket.on('message', function(message){
 
    var data = message;
    console.log(data)
    switch (data.type) {
 
    case "login":
    console.log("User logged", data.name);
 
      //if anyone is logged in with this username then refuse
      if(sockets[data.name]) {
         sendTo(socket, {
            type: "login",
            success: false
         });
      } else {
         //save user connection on the server
          
         var templist = users;
         sockets[data.name] = socket;
         socket.name = data.name;
         sendTo(socket, {
            type: "login",
            success: true,
            username: data.name,
            userlist: templist
         });
         socket.broadcast.to("chatroom").emit('roommessage',{ type: "login", username: data.name})
         socket.join("chatroom");
         users[data.name] = socket.id
         console.log(users)
      }
 
      break;
      
    case "call_user":
      // chek if user exist
     console.log( sockets[data.name])
       if(sockets[data.name]){
          console.log("user called");
          console.log(data.name);
          console.log(data.callername);
           sendTo(sockets[data.name], {
           type: "offer",
           callername: data.callername,
           offer:data.src
        });

      }else{
        sendTo(socket, {
           type: "call_response",
           response: "offline"
        });
      }
        break;


    case "answer":
       sendTo(sockets[data.callername], {
         type: "call_response",
         response: "accepted",
         answer: data.answer,
         responsefrom : data.from
       });

    break;

    case "call_rejected":
      sendTo(sockets[data.callername], {
         type: "call_response",
         response: "rejected",
         responsefrom : data.from
      });
     break;

    case "call_busy":
      sendTo(sockets[data.callername], {
         type: "call_response",
         response: "busy",
         responsefrom : data.from
      });
      break;

    case "candidate":
      sendTo(sockets[data.target], {
         type: "candidate",
         candidate: data.candidate
      });
       break;

    case "leave":
     sendTo(sockets[data.target], {
         type: "leave",
         from : data.from
      });
    break;

    default:
      sendTo(socket, {
         type: "error",
         message: "Command not found: " + data.type
      });
      break;
}
 
  })
})
 
