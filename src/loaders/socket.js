const { listOfMessages } = require('../controllers/commonController')

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected');
  
    socket.on('list-of-messages', async (userId) => {
        await listOfMessages(userId, socket);
    });
  
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
  });
};