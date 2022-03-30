const users = [];

// Join user to chat
function userJoin(companyId, userId, socketId, room) {
  const user = {
    company_id: companyId,
    user_id:userId,
    socket_id: socketId,
    room: room
  };

  //console.log("into data :",companyId, userId, socketId, room);

  users.push(user);

  //console.log("userJoin list : ", users);

  return users;
}

// Get current user
function getCurrentUser(id) {
  return users.find(user => user.socket_id === id);
}

function getUserRoom(socket_id) {
  let user=getCurrentUser(socket_id);
  return user.room;
}

// User leaves chat
function userLeave(id) {
  const index = users.findIndex(user => user.socket_id=== id);

  if (index !== -1) {
    users.splice(index, 1);
    return users;
  }
}


// Get room users
function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}



module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  getUserRoom
};