const { findQuery, updateQuery} = require('../helpers/mongooseHelpers');
const chatDetailsModel = require('../mongooseModels/chat-details.model');
const therapistModel = require('../mongooseModels/therapist.model');
const { sendNotificationToIndividual } = require('../controllers/commonController');

module.exports = (io) => {
  io.on('connection', async(socket) => {
    console.log(`A user connected--${socket.id}`);
    socket.on('list-of-messages', async (userId) => {
      console.log('list12', userId);
      await listOfMessages(userId, socket);
    });
    socket.on('individual-end-chat', async (data) => {
      await updatedList(data, io);
    });

    socket.on('individual-end-call-chat', async (data) => {
      console.log('data12', data);
      await updatedCallList(data, io);
    })

    socket.on('join-therapist-room', (therapistId) => {
      console.log('therapistId12', therapistId);
      const roomName = therapistId;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
    });
    socket.on('therapist-active', async (data) => {
      console.log('therapist', data);
      await updateQuery(therapistModel, { _id: data.therapistId }, { isOnline: true });
      io.emit('list-of-active-therapist', await findQuery(therapistModel, {isOnline: true}));
    });
    
    socket.on('send-notification-individual', async (data) => {
      await sendNotificationToIndividual(data.therapistId);
    });

    socket.on('event-emit-call-connected', (individualId) => {
      io.to(individualId).emit('accept-call-emit', 'we will connect after some time');
    });

    socket.on('therapist-inactive', async (therapistId) => {
      console.log('therapistId', therapistId);
       await updateQuery(therapistModel, { _id: therapistId }, { isOnline: false });
       io.emit('list-of-active-therapist', await findQuery(therapistModel, {isOnline: true}));
    })

    socket.on('individual-show-to-therapist', async(therapistId) => {
      io.emit('list-of-individual-for-call', await findQuery(chatDetailsModel, {receiverId: therapistId, chatType: 'call'}));
    })

    socket.on('therapist-show-to-individual', async () => {
       io.emit('list-of-active-therapist', await findQuery(therapistModel, {isOnline: true}));
    })
    
    io.emit('list-of-active-therapist', await findQuery(therapistModel, {isOnline: true}));

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  const listOfMessages = async (userId, socket) => { 
    console.log('userI1d', userId);
    const [isChatExisted] = await findQuery(chatDetailsModel, { receiverId: userId, chatType: 'message' });
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
      { receiverId: therapistsId, chatType: 'message' },
      { $pull: { "individualDetails": { senderId: individualId } } },
    );
  
    io.to(therapistsId).emit('refresh-chat-data', { data: [updateChatDetails.individualDetails] });
  }

  const updatedCallList = async(data, io) => {
    const { individualId, therapistsId } = data;
    console.log('data000909909999999eee', data);
    const updateChatDetails = await updateQuery(
      chatDetailsModel,
      { receiverId: therapistsId, chatType: 'call' },
      { $pull: { "individualDetails": { senderId: individualId } } },
    );
  
    io.to(therapistsId).emit('refresh-call-data', { data: [updateChatDetails.individualDetails] });
  }
};
