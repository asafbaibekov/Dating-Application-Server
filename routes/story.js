const express = require('express');
const router = express.Router();

const User = require("../schemas/user")
const Story = require("../schemas/story")
const File = require("../schemas/file")

const formidable = require('formidable');

var { upload_story_file, delete_story_files } = require('../helpers/google-cloud-storage')

router.use((req, res, next) => {
    let date = new Date()
    date.setHours(date.getHours() - 12)
    File.find({ bucket: "alanica-dates-stories", createdAt: { $lt: date } })
        .then(files => {
            return delete_story_files(files.map(file => file.name))
                .finally(() => {
                    return Promise.all(files.map(file => File.findByIdAndRemove(file._id)))
                        .then((files_removed) => Promise.all(files_removed.map(file => Story.findOneAndUpdate({ files: file._id }, { $pull: { files: file._id } }))))
                })
        })
        .then(() => { next() })
        .catch(next)
})

router.get('/me', (req, res) => {
    Story.findOne({ user: req.user_id })
        .then(story => {
            res.send({ code: 0, description: 'success', story })
        })
        .catch(error => {
            res.send({ code: 1, description: 'unknown error' })
        })
})

router.post('/add', (req, res) => {
    var form = new formidable.IncomingForm({ keepExtensions: true, maxFileSize: 10 * 1024 * 1024 });
    User.findById(req.user_id, '_id').orFail()
        .then(user => {
            return new Promise((resolve, reject) => {
                form.parse(req, (error, fields, files) => {
                    if (error) { error.name = 'FormidableError'; reject(error) }
                    else resolve({ fields, files })
                })
            })
            .then(({ files }) => {
                if (files.file == null || files.file.type == null) {
                    let error = new Error()
                    error.name = 'EmptyFile'
                    error.message = 'file required'
                    throw error
                }
                if (files.file.type.split('/')[0] != 'image' && files.file.type.split('/')[0] != 'video') {
                    let error = new Error()
                    error.name = 'FileTypeError'
                    error.message = 'file must be image or video type'
                    throw error
                }
                return upload_story_file(files.file.path)
            })
            .then(object => File.create(object))
            .then(file => Story.findOneAndUpdate({ user: user._id }, { $push: { files: file._id } }, { upsert: true, new: true, runValidators: true }).populate('files'))
            .then(story => {
                res.send({ code: 0, description: 'success', story })
            })
        })
        .catch(error => {
            switch (error.name) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: 'story not found for user, create story before insert file' })
                    break
                case 'EmptyFile':
                case 'FileTypeError':
                case 'FormidableError':
                    res.send({ code: 2, description: error.message })
                    break
                default:
                    res.send({ code: 1, description: 'unknown error' })
            }
        })
})

module.exports = router;