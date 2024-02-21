const { findQuery, updateQuery} = require('../helpers/mongooseHelpers');
const chatDetailsModel = require('../mongooseModels/chat-details.model');
const therapistModel = require('../mongooseModels/therapist.model');
let timeLeft = 5 * 60; // 5 minutes in seconds

module.exports = (io) => {
  io.on('connection', (socket) => {
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
      let therapistsData;
      therapistsData = await findQuery(therapistModel, { _id: data.therapistId });
      if(!therapistsData.isOnline) {
        therapistsData.isOnline = true;
      }
      console.log('therapist12', therapistsData);
      io.emit('show-therapist', [therapistsData]);

    });
    
    socket.on('start-timer', (data) => {
      console.log('data56563553==>', data);
      console.log('timeLeft===>', timeLeft);
      let countdownInterval = setInterval(() => {    
        // Emit a `countdown` event to the client every second
        io.emit('countdown', { timeLeft, data });
      
        if (timeLeft === 0) {
          clearInterval(countdownInterval);
          io.emit('countdown-complete', data);
        }else {
          timeLeft--;
          console.log('time', timeLeft);
        }
      }, 1000);
    });

    socket.on('therapist-inactive', async (therapistId) => {
      let therapistsData;
      therapistsData = await findQuery(therapistModel, { _id: therapistId });
      if(therapistsData.isOnline) {
        therapistsData.isOnline = false;
      }

      io.emit('clear-therapist', [therapistsData]);
    })

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
    