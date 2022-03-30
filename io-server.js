const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { userJoin, getCurrentUser, userLeave, getRoomUsers, getUserRoom } = require("./public/js/socket_users");

const app = express();
app.use(cors());

const httpServer = createServer(app);
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
app.use(express.static("public"));
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use(bodyParser.json());
dotenv.config();

/* socket operation */

// io is an instance of server. Server is a socket.io class
const io = new Server(httpServer, {
  /* options */
  cors: {
    origins: ["*"],
    credentials: true,
    handlePreflightRequest: (req, res) => {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST",
        "Access-Control-Allow-Headers": "my-custom-header",
        "Access-Control-Allow-Credentials": true,
      });
      res.end();
    },
    // methods:["GET","POST"]
  },
});

io.on("connection", async function (socket) {
  // the io variable represents the group of sockets.
  console.log("A user with ID: " + socket.id + " connected");

  let socketById = io.sockets.sockets.get(socket.id);
  socketById.emit("socket-id", socket.id); // send socket-id to sender...

  socket.on("disconnect", async function () {
    // disconnect : reserved word
    console.log("A user with ID: " + socket.id + " disconnected");

    let userRoom = getUserRoom(socket.id);
    socket.leave(userRoom);
    const connectedUsers = userLeave(socket.id);
    const clientsRoom = io.sockets.adapter.rooms.get(userRoom);

    console.log(userRoom + " room clients list :", clientsRoom);
    console.log("socket Users clients list :", connectedUsers);
  });

  socket.on("client_disconnect", (data) => {
    console.log("client_disconnect: ", data.socket_id);

    let userRoom = getUserRoom(data.socket_id);
    socket.leave(userRoom);
    const connectedUsers = userLeave(socket.id);
    const clientsRoom = io.sockets.adapter.rooms.get(userRoom);

    console.log(userRoom + " room clients list :", clientsRoom);
    console.log("socket Users clients list :", connectedUsers);
  });

  socket.on("login-user", (data) => {
    console.log("socket login-user :", data);
    if (data.room !== "TOYS") data = JSON.parse(data);

    socket.join(data.room);

    const connectedUsers = userJoin(data.company_id, data.user_id, data.socket_id, data.room);
    const clientsSocketRoom = io.sockets.adapter.rooms.get(data.room);

    console.log(data.room + " clients list :", clientsSocketRoom);
    console.log("Connected socket clients list :", connectedUsers);
  });

  socket.on("unit-status", (data) => {
    console.log("unit-status: ", data);
    //data = JSON.parse(data);
   // if (data.operation != "OYUNCAK-ODEME") socket.emit("unit-status", data); //sends back to sender by the same events name.
    let userRoom = getUserRoom(socket.id);
    socket.to(userRoom).emit("unit-status", (data));
  });

  socket.on("tag-data", (data) => {
    //console.log("tag-data : ", data);
    //console.log(data);  //tag:65535,B6 A0 D8 1F D1,972.50,970.50,12.00
    let dataObj, dataTag, payType, timeBtn, objData;
    
    if (typeof data !== "object") 
    {  // incoming units tag raw data   
      dataObj = JSON.parse(data);
      //console.log("dataObj : ", data);

      if (data.hasOwnProperty("data")) {
        dataTag = dataObj.data.split(":")[1];
        objData = {
          company_id: data.company_id,
          device_id: dataTag.split(",")[0].trim(),
          socket_id: data.socket_id,
          tag_id: dataTag.split(",")[1].trim(),
          tag_read: dataTag.split(",")[2],
          tag_write: dataTag.split(",")[3],
          total_token_tl: dataTag.split(",")[4], //toys or units total coin TL
          msg_id: data.msg_id,
          time_button: data.time_button,
          pay_type: data.pay_type,
          operation: data.operation,
        };
        console.log("tag-data units remote data:", objData);
        let userRoom = getUserRoom(socket.id);
        socket.to(userRoom).emit("tag-data", JSON.stringify(objData)); 

      } else { // incoming tag data from unit in the local units network
        let userRoom = getUserRoom(socket.id);
        console.log("tag-data units local data:",userRoom, (data));
        socket.to(userRoom).emit("tag-data", (data)); 
        socket.to(userRoom).emit("remote-tag-data", (data)); 
      }

    } else if (typeof data === "object") {  // incoming toys tag data
      dataTag = data.data.split(":")[1];

      if (data.hasOwnProperty("pay_type")) payType = data.pay_type; //Differenet pay types for units.      
      else payType = "KART-ODEME"; //  No different pay type for toys. Toys have one pay type.
      if (data.hasOwnProperty("time_button")) timeBtn = data.time_button;//Differenet pay types for units.
      else timeBtn = ""; //  No different pay type for toys. Toys have one pay type.

      objData = {
        company_id: data.company_id,
        device_id: dataTag.split(",")[0].trim(),
        socket_id: data.socket_id,
        tag_id: dataTag.split(",")[1].trim(),
        tag_read: dataTag.split(",")[2],
        tag_write: dataTag.split(",")[3],
        total_token_tl: dataTag.split(",")[4], //toys or units total coin TL
        msg_id: data.msg_id,
        time_button: timeBtn,
        pay_type: payType,
        operation: data.operation,
      };
      console.log("tag-data toys data:", objData);
      let userRoom = getUserRoom(socket.id);
      socket.to(userRoom).emit("tag-data", JSON.stringify(objData)); //JSON.stringify(data)
    }

    if (data.operation != "OYUNCAK-ODEME") {
      socket.emit("tag-data", JSON.stringify(objData)); // sends back to sender by the same events name.
    }

  });

  socket.on("cash-credit-card", (data) => {
    console.log("cash-credit-card: ", data);

    if (data.operation != "OYUNCAK-ODEME") socket.emit("cash-credit-card", data); // sends back to sender by the same events name.

    let userRoom = getUserRoom(socket.id);
    socket.to(userRoom).emit("cash-credit-card", data);
  });

  socket.on("tag-cancel", (data) => {
    console.log("tag-cancel: ", data);
    //if (data.operation != "OYUNCAK-ODEME") socket.emit("tag-cancel", data); // sends back to sender by the same events name.

    let userRoom = getUserRoom(socket.id);
    socket.to(userRoom).emit("tag-cancel", data);
    // socket.to("UNITS").emit("tag-cancel", data);
  });

  socket.on("cancel", (data) => {
    console.log("cancel: ", data);
   // if (data.operation != "OYUNCAK-ODEME") socket.emit("cancel", data); // sends back to sender by the same events name.

    let userRoom = getUserRoom(socket.id);
    socket.to(userRoom).emit("cancel", data);
    //socket.to("UNITS").emit("cancel", data);
  });

  socket.on("subscriber-data", (data) => {
    data = JSON.parse(data);
    console.log("subscriber-data :", data);

    let userRoom = getUserRoom(data.socket_id);
    socket.to(userRoom).emit("subscriber-data", JSON.stringify(data));
  });

  socket.on("card-return", (data) => {
    console.log("card-return :", data);

    let userRoom = getUserRoom(socket.id);
    socket.to(userRoom).emit("card-return", data);
  });

  socket.on("time_stamp", (data) => {
    // data:{ device_id: 62164, user_name: 'NODE-MCU', now: 30003 }
    //console.log("node-mcu event_name data:", data.device_id);
    //socket.broadcast.to("room1").emit("time_stamp", data); // Sends to everyone except the sender.
    console.log("time_stamp :", data);

    let userRoom = getUserRoom(data.socket_id);
    socket.to(userRoom).emit("time_stamp", JSON.stringify(data));
    // socket.to("UNITS").emit("time_stamp", JSON.stringify(data));
  });

  socket.on("led1-on", (data) => {
    // console.log("led1-on:", data);
    socket.broadcast.to("room1").emit("led1-on", data); // Sends to everyone except the sender.
  });
  socket.on("led1-off", (data) => {
    // console.log("led1-off:", data);
    socket.broadcast.to("room1").emit("led1-off", data); // Sends to everyone except the sender.
  });
}); //io.on

let port = process.env.APP_PORT;

httpServer.listen(port, () => {
  console.log(new Date().toLocaleString() + " => Listening on port : " + port);
});
