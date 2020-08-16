var express = require('express');
var router = express.Router();

const Message = require("../schemas/message");
const Chat = require("../schemas/chat");

router.get('/chats', (req, res) => {
    Chat.find({ users: { $in: [req.user_id] }}, (err, chats) => {
        if (err != null) return res.send({ code: 1, description: 'unknown error' })
        return res.send({ code: 0, description: 'success', chats })
    })
})

router.get('/messages/:chat_id/', (req, res) => {
    let { chat_id } = req.params
    if (chat_id == null)
        return res.send({ code: 2, description: 'chat_id required' })
    if (typeof chat_id != 'string')
        return res.send({ code: 2, description: 'chat_id must be string' })
    Chat.findById(chat_id).orFail()
        .then(chat => Message.find().where('chat_id').equals(chat._id))
        .then(messages => {
            res.send({ code: 0, description: 'success', messages })
        })
        .catch(err => {
            if (err.name == 'CastError')
                res.send({ code: 5, description: 'invalid id' })
                else if (err.name == 'DocumentNotFoundError')
                    res.send({ code: 2, description: 'receiver_id not found' });
        })
})

router.get('/messages/:chat_id/:from_date/:to_date', (req, res) => {
    let { chat_id, from_date, to_date } = req.params
    from_date = new Date(from_date)
    to_date = new Date(to_date)
    if (chat_id == null)
        return res.send({ code: 2, description: 'chat_id required' })
    if (typeof chat_id != 'string')
        return res.send({ code: 2, description: 'chat_id must be string' })
    if (from_date == 'Invalid Date')
        return res.send({ code: 2, description: 'from_date must be date' })
    if (to_date == 'Invalid Date')
        return res.send({ code: 2, description: 'to_date must be date' })
    Chat.findById(chat_id).orFail()
        .then(chat => Message.find({ createdAt : { $gte: new Date(from_date).toUTCString(), $lte: new Date(to_date).toUTCString() } }).where('chat_id').equals(chat._id))
        .then(messages => {
            res.send({ code: 0, description: 'success', messages })
        })
        .catch(err => {
            if (err.name == 'CastError')
                res.send({ code: 5, description: 'invalid id' })
            else if (err.name == 'DocumentNotFoundError')
                res.send({ code: 2, description: 'receiver_id not found' });
        })
});

module.exports = router;