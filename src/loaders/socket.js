const { findQuery, updateQuery} = require('../helpers/mongooseHelpers');
const chatDetailsModel = require('../mongooseModels/chat-details.model');
const therapistModel = require('../mongooseModels/therapist.model');

module.exports = (io) => {
  io.on('connection', async (socket) => {
    console.log('A user connected');
    socket.on('list-of-messages', async (userId) => {
      console.log('list12', userId);
      await listOfMessages(userId, socket);
    });
    socket.on('individual-end-chat', async (data) => {
      await updatedList(data, io);
    });
    socket.on('join-therapist-room', (therapistId) => {
      const roomName = therapistId;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
    });
    socket.on('therapist-active', async (data) => {
      console.log('therapist', data);
      await updateQuery(therapistModel, { _id: data.therapistId }, { isOnline: true });
    });
    

    socket.on('therapist-inactive', async (therapistId) => {
       await updateQuery(therapistModel, { _id: therapistId }, { isOnline: false });
    })

      io.emit('list-of-active-therapist', await findQuery(therapistModel, {isOnline: true}));
      socket.on('disconnect', () => {
        console.log('User disconnected');
      });
    })

  const listOfMessages = async (userId, socket) => { 
    console.log('userI1d', userId);
    const [isChatExisted] = await findQuery(chatDetailsModel, { receiverId: userId });
    console.log('isChatExitsed', isChatExisted);
    if (!isChatExisted) { 
        socket.emit('chat-not-found', { message: 'Chat does not exist with this userId' });
    } else {
        console.log('isChat', isChatExisted.individualDetails);
        socket.emit('chat-data', { data: [isChatExisted.individualDetails] });
    }
  };
  
  const updatedList = async(data, io) => {
    const { individualId, therapistsId } = data;
    console.log('data', data);
    const updateChatDetails = await updateQuery(
      chatDetailsModel,
      { receiverId: therapistsId },
      { $pull: { "individualDetails": { senderId: individualId } } },
    );
  
    io.to(therapistsId).emit('refresh-chat-data', { data: [updateChatDetails.individualDetails] });
  }
};
    