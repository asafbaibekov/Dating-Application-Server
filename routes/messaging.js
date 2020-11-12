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
    User.findById(req.user_id).orFail()
        .then(() => {
            return new Promise((resolve, reject) => {
                form.parse(req, (error, fields, files) => {
                    if (error) { error.name = 'FormidableError'; reject(error) }
                    else resolve({ fields, files })
                })
            })
            .then(({ fields, files }) => {
                return Promise.all([
                    new Promise((resolve) => {
                        let { receiver_id, message_text } = fields
                        resolve([receiver_id, message_text])
                    }),
                    new Promise((resolve, reject) => {
                        let { message_image, message_audio } = files
                        if (message_image != null && message_image.type.split('/')[0] != 'image') {
                            let error = new Error()
                            error.name = 'FileTypeError'
                            error.message = 'message_image must be image file'
                            reject(error)
                        }
                        if (message_audio != null && message_audio.type.split('/')[0] != 'audio') {
                            let error = new Error()
                            error.name = 'FileTypeError'
                            error.message = 'message_audio must be audio file'
                            reject(error)
                        }
                        let image_file = null
                        let audio_file = null
                        if (message_image != null)
                            image_file = upload_message_file(message_image.path).then(object => File.create(object))
                        if (message_audio != null)
                            audio_file = upload_message_file(message_audio.path).then(object => File.create(object))
                        resolve(Promise.all([image_file, audio_file]))
                    })
                ])
            })
            .then(([[receiver_id, message_text], [image_file, audio_file]]) => {
                let query = { }
                if (image_file != null) query.message_image = image_file._id
                if (audio_file != null) query.message_audio = audio_file._id
                Object.keys(query).forEach(key => (query[key] == null) && delete query[key]);
                return User.findById(receiver_id).orFail()
                    .then(receiver => Chat.findOne({ users: { $all: [req.user_id, receiver._id] }}))
                    .then(chat => Message.create({ chat_id: chat._id, sender_id: req.user_id, receiver_id: receiver_id, message_text, ...query }))
            })
            .then(message => message.populate('message_image').execPopulate())
            .then(message => message.populate('message_audio').execPopulate())
            .then(message => {
                res.send({ code: 0, description: 'success', message })
            })
        })
        .catch(error => { 
            if (error.name == 'DocumentNotFoundError')
                res.send({ code: 5, description: 'receiver_id not found' })
            else if (error.name == 'FileTypeError')
                res.send({ code: 2, description: error.message })
            else
                res.send({ code: 1, description: 'unknown error' })
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