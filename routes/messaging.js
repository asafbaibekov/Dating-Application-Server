var express = require('express');
var router = express.Router();

const User = require("../schemas/user")
const Message = require("../schemas/message");
const Chat = require("../schemas/chat");

var formidable = require('formidable');

var { upload_file } = require('../helpers/google-cloud-storage')

router.post('/message', (req, res) => {
    var form = new formidable.IncomingForm({ keepExtensions: true });
    form.parse(req, async (err, fields, files) => {
        if (err) return res.send({ code: 1, description: "unknown error" })

        let { receiver_id, message_text } = fields
        if (receiver_id == null)
            return res.send({ code: 2, description: 'receiver_id required' })
        if (typeof receiver_id != 'string')
            return res.send({ code: 2, description: 'receiver_id must be string' })

        try {
            var image_url = null
            var audio_url = null
            let { message_image, message_audio } = files
            if (message_image != null) {
                if (message_image.type.split('/')[0] != 'image')
                    return res.send({ code: 2, description: 'message_image must be image file' })
                image_url = await upload_file(message_image.path)
            }
            if (message_audio != null) {
                if (message_audio.type.split('/')[0] != 'audio')
                    return res.send({ code: 2, description: 'message_audio must be audio file' })
                audio_url = await upload_file(message_audio.path)
            }            
            User.findById(receiver_id).orFail()
                    .then(receiver => Chat.findOne({ users: { $all: [req.user_id, receiver._id] }}))
                    .then(chat => Message.create({ chat_id: chat._id, sender_id: req.user_id, receiver_id: receiver_id, message_text, message_image: image_url, message_audio: audio_url }))
                    .then(message => {
                        res.send({ code: 0, description: 'success', message })
                    })
                    .catch(err => { 
                        if (err.name == 'CastError')
                            res.send({ code: 2, description: 'invalid id' })
                        else if (err.name == 'DocumentNotFoundError')
                            res.send({ code: 5, description: 'receiver_id not found' })
                        else
                            res.send({ code: 1, description: 'unknown error' })
                    })
        } catch (error) {
            res.send({ code: 1, description: "unknown error" })
        }
    })
});

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
                res.send({ code: 2, description: 'invalid id' })
                else if (err.name == 'DocumentNotFoundError')
                    res.send({ code: 5, description: 'receiver_id not found' });
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
                res.send({ code: 2, description: 'invalid id' })
            else if (err.name == 'DocumentNotFoundError')
                res.send({ code: 5, description: 'receiver_id not found' });
        })
});

module.exports = router;