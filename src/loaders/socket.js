const { findQuery, updateQuery} = require('../helpers/mongooseHelpers');
const chatDetailsModel = require('../mongooseModels/chat-details.model');
const therapistModel = require('../mongooseModels/therapist.model');
const { sendNotificationToIndividual } = require('../notification');
const express = require("express");
const http = require("http");
const app = express();
const socketIo = require('socket.io');
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
      origin: '*',
      methods: ['GET', 'POST']
  }
});

async function handleSocket() {
  io.on('connection', async(socket) => {
    // const userId = socket.handshake.auth.userId;
    console.log(`A user connected with :, ${socket.id}`);
    socket.on('list-of-messages', async (userId) => {
      await listOfMessages(userId, socket);
    });
    socket.on('individual-end-chat', async (data) => {
      await updatedList(data, io);
    });

    socket.on('individual-end-call-chat', async (data) => {
      await updatedCallList(data, io);
    })

    socket.on('join-therapist-room', (therapistId) => {
      const roomName = therapistId;
      socket.join(roomName);
      console.log(`Socket ${socket.id} therapist joined room: ${roomName}`);
    });
    socket.on('join-individual-room', (individualId) => {
      const roomName = individualId;
      socket.join(roomName);
      console.log(`Socket ${socket.id} individual joined room: ${roomName}`);
    });
    socket.on('therapist-active', async (data) => {
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
      // const userId = socket.handshake.auth.userId;
      // const userUpdateOffline = await updateQuery(therapistModel, { _id: userId }, { isOnline: false });
      // io.emit('list-of-active-therapist', await findQuery(therapistModel, {isOnline: true}));
      // console.log('userUpdateOffline', userUpdateOffline);
      console.log('User disconnected');
    });
  });

};

const listOfMessages = async (userId, socket) => { 
  const [isChatExisted] = await findQuery(chatDetailsModel, { receiverId: userId, chatType: 'message' });
  if (!isChatExisted) { 
      socket.emit('chat-not-found', { message: 'Chat does not exist with this userId' });
  } else {
      socket.emit('chat-data', { data: [isChatExisted.individualDetails] });
  }
};

const updatedList = async(data, io) => {
  const { individualId, therapistsId } = data;
  const updateChatDetails = await updateQuery(
    chatDetailsModel,
    { receiverId: therapistsId, chatType: 'message' },
    { $pull: { "individualDetails": { senderId: individualId } } },
  );

  io.to(therapistsId).emit('refresh-chat-data', { data: [updateChatDetails.individualDetails] });
};

const updatedCallList = async(data, io) => {
  const { individualId, therapistsId } = data;
  const updateChatDetails = await updateQuery(
    chatDetailsModel,
    { receiverId: therapistsId, chatType: 'call' },
    { $pull: { "individualDetails": { senderId: individualId } } },
  );

  io.to(therapistsId).emit('refresh-call-data', { data: [updateChatDetails.individualDetails] });
};

// Refresh-Call-list after call terminated
const refreshCallListsEvent = async(data, therapistsId) => {
  io.to(therapistsId).emit('refresh-call-lists', {data: data.individualDetails});
};

// chat- detail event shows list of chat;
const chatDetailsEvent = async(data, messageData, individualData) => {
  if(data.chatType === 'message') {
    io.to(data.receiverId).emit('chat-details', { data: [messageData?.individualDetails], image: individualData.image });
  } else {
    io.to(data.receiverId).emit('chat-details-for-call', { data: [messageData?.individualDetails], image: individualData.image, timing: data.timing });
  }
};

const startTimerEvent = async(data) => {
  console.log('datat12', data.individualId);
  console.log('dat5655', data);
  io.to(data.individualId).emit('startTimer', data);
};

const endTimerEvent = async(data) => {
  io.to(data.therapistsId).emit('endTimer', data);
};

module.exports = {
  app,
  io,
  server,
  handleSocket,
  refreshCallListsEvent,
  chatDetailsEvent,
  startTimerEvent,
  endTimerEvent,
};
