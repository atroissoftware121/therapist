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

// therapistId -> Set of socket ids (supports multi-device)
const onlineTherapistSockets = new Map();

const toId = (value) => {
  if (value == null) return null;
  if (typeof value === 'object' && value.therapistId) return String(value.therapistId);
  if (typeof value === 'object' && value._id) return String(value._id);
  const id = String(value).trim();
  return !id || id === 'undefined' || id === 'null' ? null : id;
};

const markTherapistSocketOnline = (therapistId, socketId) => {
  if (!onlineTherapistSockets.has(therapistId)) {
    onlineTherapistSockets.set(therapistId, new Set());
  }
  onlineTherapistSockets.get(therapistId).add(socketId);
};

const markTherapistSocketOffline = (therapistId, socketId) => {
  const sockets = onlineTherapistSockets.get(therapistId);
  if (!sockets) return true; // fully offline
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineTherapistSockets.delete(therapistId);
    return true; // fully offline
  }
  return false; // still online on another device
};

const getActiveTherapistList = async () => {
  const ids = [...onlineTherapistSockets.keys()];
  if (!ids.length) return [];
  // Use Model.find directly — findQuery treats any query._id as findById (breaks $in)
  return therapistModel.find({ _id: { $in: ids }, isOnline: true });
};

const emitActiveTherapists = async () => {
  const list = await getActiveTherapistList();
  io.emit('list-of-active-therapist', list);
  return list;
};

const setTherapistOnlineInDb = async (therapistId) => {
  // findByIdAndUpdate — no upsert (avoids creating junk therapist docs)
  return therapistModel.findByIdAndUpdate(
    therapistId,
    { isOnline: true },
    { new: true }
  );
};

const setTherapistOfflineInDb = async (therapistId) => {
  return therapistModel.findByIdAndUpdate(
    therapistId,
    { isOnline: false, isMessageQueue: false, isCallQueue: false },
    { new: true }
  );
};

// Clear stale DB flags left from previous crashes / missing disconnect handlers
const resetStaleOnlineFlags = async () => {
  const result = await therapistModel.updateMany(
    { isOnline: true },
    { isOnline: false, isMessageQueue: false, isCallQueue: false }
  );
  console.log(`[socket] reset stale isOnline flags: ${result.modifiedCount || 0}`);
};

async function handleSocket()  {
  await resetStaleOnlineFlags();

  io.on('connection', async(socket) => {
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

    socket.on('join-therapist-room', async (therapistId) => {
      const roomName = toId(therapistId);
      if (!roomName) return;
      socket.join(roomName);
      socket.data.userId = roomName;
      socket.data.userType = 'therapist';
      console.log(`Socket ${socket.id} therapist joined room: ${roomName}`);
    });

    socket.on('join-individual-room', (individualId) => {
      const roomName = toId(individualId);
      if (!roomName) return;
      socket.join(roomName);
      socket.data.userId = roomName;
      socket.data.userType = 'individual';
      console.log(`Socket ${socket.id} individual joined room: ${roomName}`);
    });

    // Accepts { therapistId } OR plain therapistId string
    // Optional ack: socket.emit('therapist-active', payload, (res) => console.log(res))
    socket.on('therapist-active', async (data, ack) => {
      const reply = (payload) => {
        if (typeof ack === 'function') ack(payload);
        socket.emit('therapist-active-result', payload);
      };
      try {
        console.log('[socket] therapist-active raw payload:', JSON.stringify(data));
        const therapistId = toId(data?.therapistId ?? data);
        if (!therapistId) {
          console.log('[socket] therapist-active ignored — missing therapistId', data);
          return reply({ success: false, error: 'missing_therapistId', received: data });
        }
        if (!/^[a-fA-F0-9]{24}$/.test(therapistId)) {
          console.log('[socket] therapist-active — invalid id format:', therapistId);
          return reply({ success: false, error: 'invalid_therapistId_format', therapistId });
        }
        const updated = await setTherapistOnlineInDb(therapistId);
        if (!updated) {
          console.log('[socket] therapist-active — therapist not found:', therapistId);
          return reply({ success: false, error: 'therapist_not_found', therapistId });
        }
        socket.join(therapistId);
        socket.data.userId = therapistId;
        socket.data.userType = 'therapist';
        markTherapistSocketOnline(therapistId, socket.id);
        const list = await emitActiveTherapists();
        console.log(`[socket] therapist online: ${therapistId} | activeCount=${list.length}`);
        return reply({
          success: true,
          therapistId,
          name: updated.name,
          activeCount: list.length,
        });
      } catch (err) {
        console.error('[socket] therapist-active error:', err.message);
        return reply({ success: false, error: err.message });
      }
    });
    
    socket.on('send-notification-individual', async (data) => {
      await sendNotificationToIndividual(data.therapistId);
    });

    socket.on('event-emit-call-connected', (individualId) => {
      const room = toId(individualId);
      if (room) io.to(room).emit('accept-call-emit', 'we will connect after some time');
    });

    socket.on('therapist-inactive', async (therapistId) => {
      try {
        const id = toId(therapistId?.therapistId ?? therapistId);
        if (!id) return;
        const fullyOffline = markTherapistSocketOffline(id, socket.id);
        if (fullyOffline) {
          await setTherapistOfflineInDb(id);
        }
        await emitActiveTherapists();
      } catch (err) {
        console.error('[socket] therapist-inactive error:', err.message);
      }
    });

    socket.on('individual-show-to-therapist', async(therapistId) => {
      const id = toId(therapistId);
      io.emit('list-of-individual-for-call', await findQuery(chatDetailsModel, {receiverId: id, chatType: 'call'}));
    }); 

    socket.on('therapist-show-to-individual', async () => {
       await emitActiveTherapists();
    });

    socket.on('message-queue-on', async(therapistsId) => {
      const id = toId(therapistsId);
      if (id) await therapistModel.findByIdAndUpdate(id, { isMessageQueue: true });
    });

    socket.on('message-queue-off', async(therapistsId) => {
      const id = toId(therapistsId);
      if (id) await therapistModel.findByIdAndUpdate(id, { isMessageQueue: false });
    });

    socket.on('call-queue-on', async(therapistsId) => {
      const id = toId(therapistsId);
      if (id) await therapistModel.findByIdAndUpdate(id, { isCallQueue: true });
    });

    socket.on('call-queue-off', async(therapistsId) => {
      const id = toId(therapistsId);
      if (id) await therapistModel.findByIdAndUpdate(id, { isCallQueue: false });
    });

    socket.on('user-inactive', async(userId) => {
      try {
        const id = toId(userId);
        console.log('userId12000', id);
        if (!id) return;
        const fullyOffline = markTherapistSocketOffline(id, socket.id);
        if (fullyOffline) {
          await setTherapistOfflineInDb(id);
        }
        await emitActiveTherapists();
      } catch (err) {
        console.error('[socket] user-inactive error:', err.message);
      }
    }); 
    
    // Send currently-connected therapists only (not stale DB flags)
    await emitActiveTherapists();

    socket.on('disconnect', async () => {
      console.log('User disconnected', socket.id, socket.data?.userId);
      try {
        if (socket.data?.userType === 'therapist' && socket.data?.userId) {
          const id = socket.data.userId;
          const fullyOffline = markTherapistSocketOffline(id, socket.id);
          if (fullyOffline) {
            await setTherapistOfflineInDb(id);
            await emitActiveTherapists();
            console.log(`[socket] therapist offline on disconnect: ${id}`);
          }
        }
      } catch (err) {
        console.error('[socket] disconnect cleanup error:', err.message);
      }
    });
  });
};

const listOfMessages = async (userId, socket) => { 
  const [isChatExisted] = await findQuery(chatDetailsModel, { receiverId: toId(userId), chatType: 'message' });
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
    { receiverId: toId(therapistsId), chatType: 'message' },
    { $pull: { "individualDetails": { senderId: toId(individualId) } } },
  );

  io.to(toId(therapistsId)).emit('refresh-chat-data', { data: [updateChatDetails.individualDetails] });
};

const updatedCallList = async(data, io) => {
  const { individualId, therapistsId } = data;
  const updateChatDetails = await updateQuery(
    chatDetailsModel,
    { receiverId: toId(therapistsId), chatType: 'call' },
    { $pull: { "individualDetails": { senderId: toId(individualId) } } },
  );

  io.to(toId(therapistsId)).emit('refresh-call-data', { data: [updateChatDetails.individualDetails] });
};

// Refresh-Call-list after call terminated
const refreshCallListsEvent = async(data, therapistsId) => {
  io.to(toId(therapistsId)).emit('refresh-call-lists', {data: data.individualDetails});
};

// chat- detail event shows list of chat;
const chatDetailsEvent = async(data, messageData, individualData) => {
  const receiverRoom = toId(data.receiverId);
  if (!receiverRoom) {
    console.log('[socket] chatDetailsEvent — missing receiverId', data);
    return;
  }
  const roomSize = io.sockets.adapter.rooms.get(receiverRoom)?.size || 0;
  console.log(`[socket] emit chat-details → room ${receiverRoom} (listeners: ${roomSize})`);
  if (data.chatType === 'message') {
    console.log('data122222', messageData);
    io.to(receiverRoom).emit('chat-details', { data: [messageData?.individualDetails], image: individualData.image});
  } else {
    io.to(receiverRoom).emit('chat-details-for-call', { data: [messageData?.individualDetails], image: individualData.image});
  }
};

const startTimerEvent = async(data) => {
  io.to(toId(data.individualId)).emit('startTimer', data);
};

const endTimerEvent = async(data) => {
  console.log("this is socket end timer data",data);
  io.to(toId(data.therapistsId)).emit('endTimer', data);
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
