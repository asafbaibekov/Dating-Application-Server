var express = require('express');
var router = express.Router();

const User = require('../schemas/user')
const Message = require("../schemas/message");

router.get('/messages/:receiver_id', (req, res) => {
    let { receiver_id } = req.params
    if (receiver_id == null) return res.send({ code: 2, description: 'receiver_id required' })
    if (typeof receiver_id != 'string') return res.send({ code: 2, description: 'receiver_id must be string' })
    User.findById(receiver_id)
        .then(receiver => {
            Message.find()
                .where('sender_id').equals(req.user_id)
                .where('receiver_id').equals(receiver._id)
                .then(messages => {
                    res.send({ code: 0, description: 'success', messages })
                }).catch(err => {
                    res.send({ code: 1, description: 'unknown error' })
                });
        })
        .catch(err => res.send({ code: 5, description: 'receiver_id not found' }))
});

router.post('/messages', (req, res) => {
    let { receiver_id, message_text } = req.body
    if (receiver_id == null) return res.send({ code: 2, description: 'receiver_id required' })
    if (typeof receiver_id != 'string') return res.send({ code: 2, description: 'receiver_id must be string' })
    if (message_text == null) return res.send({ code: 2, description: 'message_text required' })
    if (typeof message_text != 'string') return res.send({ code: 2, description: 'message_text must be string' })
    User.findById(receiver_id)
        .then(receiver => {
            Message
                .create({
                    sender_id: req.user_id,
                    receiver_id: receiver._id,
                    message_text
                })
                .then(message => {
                    res.io.emit('message', message);
                    res.send({ code: 0, description: 'success', message })
                })
                .catch(err => {
                    res.send({ code: 1, description: 'unknown error' })
                });
        })
        .catch(err => res.send({ code: 5, description: 'receiver_id not found' }))
});

module.exports = router;