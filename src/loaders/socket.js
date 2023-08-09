module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("a user connected");
    // console.log("socket detail==>", socket);
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
};
