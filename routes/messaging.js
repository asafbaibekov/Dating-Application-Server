var express = require('express');
var router = express.Router();

const User = require("../schemas/user")
const Message = require("../schemas/message");
const Chat = require("../schemas/chat");
const File = require('../schemas/file');

var formidable = require('formidable');

var { upload_message_file } = require('../helpers/google-cloud-storage')

router.post('/message', (req, res) => {
    var form = new formidable.IncomingForm({ keepExtensions: true, maxFileSize: 10 * 1024 * 1024 });
    form.parse(req, async (error, fields, files) => {
        if (error) return res.send({ code: 2, description: error.message })

        let { receiver_id, message_text } = fields
        if (receiver_id == null)
            return res.send({ code: 2, description: 'receiver_id required' })
        if (typeof receiver_id != 'string')
            return res.send({ code: 2, description: 'receiver_id must be string' })

        try {
            var image_file = null
            var audio_file = null
            let { message_image, message_audio } = files
            if (message_image != null) {
                if (message_image.type.split('/')[0] != 'image')
                    return res.send({ code: 2, description: 'message_image must be image file' })
                let object = await upload_message_file(message_image.path)
                image_file = await File.create(object)
            }
            if (message_audio != null) {
                if (message_audio.type.split('/')[0] != 'audio')
                    return res.send({ code: 2, description: 'message_audio must be audio file' })
                let object = await upload_message_file(message_audio.path)
                audio_file = await File.create(object)
            }
            User.findById(receiver_id).orFail()
                .then(receiver => Chat.findOne({ users: { $all: [req.user_id, receiver._id] }}))
                .then(chat => Message.create({ chat_id: chat._id, sender_id: req.user_id, receiver_id: receiver_id, message_text, message_image: image_file._id, message_audio: audio_file._id }))
                .then(message => message.populate('message_image').execPopulate())
                .then(message => message.populate('message_audio').execPopulate())
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