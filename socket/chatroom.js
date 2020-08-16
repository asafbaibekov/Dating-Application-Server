let User = require('../schemas/user')
let Chat = require('../schemas/chat')
let Message = require("../schemas/message");

module.exports = function(io) {
    io.of('/chatroom').on('connection', function(socket) {
        socket.on('join', function(receiver_id) {
            if (receiver_id == null) return socket.emit('exception', { code: 2, description: 'receiver_id required' })
            if (typeof receiver_id != 'string') return socket.emit('exception', { code: 2, description: 'receiver_id must be string' })
            User.findById(receiver_id).orFail()
                .then(receiver => {
                    return Chat.findOne({ users: { $all: [socket.user_id, receiver._id] }})
                })
                .then(chat => {
                    return Chat.findOneAndUpdate({ $pull: { connections: { user_id: { $in: [socket.user_id] } } } })
                })
                .then(chat =>
                    chat == null ? 
                    Chat.create({ users: [socket.user_id, receiver._id], connections: [{ user_id: socket.user_id, socket_id: socket.id }] })
                    :
                    Chat.findByIdAndUpdate(chat._id, { $push: { connections: { user_id: socket.user_id, socket_id: socket.id } } })
                )
                .then(chat => {
                    socket.join(chat._id)
                })
                .catch(err => {
                    if (err.name == 'DocumentNotFoundError')
                        socket.emit('exception', { code: 5, description: 'receiver_id not found' });
                    else
                        socket.emit('exception', { code: 1, description: 'unkown error' });
                })
        });
        socket.on('newMessage', function(receiver_id, message_text) {
            if (receiver_id == null) return socket.emit('exception', { code: 2, description: 'receiver_id required' });
            if (typeof receiver_id != 'string') return socket.emit('exception', { code: 2, description: 'receiver_id must be string' });
            User.findById(receiver_id).orFail()
                .then(receiver => {
                    return Chat.findOne({ users: { $all: [socket.user_id, receiver._id] }})
                })
                .then(chat => { 
                    return Message.create({ chat_id: chat._id, sender_id: socket.user_id, receiver_id: receiver_id, message_text })
                })
                .then(message => {
                    socket.emit('addMessage', { code: 0, description: 'success', message });
                    socket.in(message.chat_id).emit('addMessage', { code: 0, description: 'success', message });
                })
                .catch(err => { 
                    if (err.name == 'CastError')
                        socket.emit('exception', { code: 2, description: 'invalid id' }) 
                    else if (err.name == 'DocumentNotFoundError')
                        socket.emit('exception', { code: 5, description: 'receiver_id not found' })
                    else
                        socket.emit('exception', { code: 1, description: 'unknown error' }) 
                })
        });
        socket.on('disconnect', function() {
            Chat.findOneAndUpdate({ $pull: { connections: { user_id: { $in: [socket.user_id] } } } })
                .then(chat => {
                    socket.leave(chat._id);
                    socket.broadcast.to(chat._id).emit('removeUser', socket.user_id);
                })
        });
    });
}