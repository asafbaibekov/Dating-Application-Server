const express = require('express');
const router = express.Router();

const User = require("../schemas/user")
const Friend = require("../schemas/friend")

router.get('/me', (req, res) => {
    User.findById(req.user_id).orFail()
        .then(user => Friend.find({ user: user._id }))
        .then(friends => {
            res.send({ code: 0, description: 'success', friends })
        })
        .catch(error => {
            res.send({ error })
        })
})

router.use((req, res, next) => {
    let { recipient } = req.body
    if (recipient != null && req.user_id == recipient) {
        res.send({ code: 2, description: "recipient must be another user id" })
        return;
    }
    req.recipient = recipient
    next()
})

router.post('/request', (req, res) => {
    Promise.all([User.findById(req.user_id).orFail(), User.findById(req.recipient).orFail()])
        .then(([user, recipient]) => {
            return Friend.exists({
                $or: [
                    { user: user._id, recipient: recipient._id },
                    { user: recipient._id, recipient: user._id }
                ]
            })
            .then((is_exists) => {
                if (!is_exists) return [user, recipient]
                let error = new Error()
                error.name = "ValidationError"
                error.message = `failed to request ${ recipient._id }`
                throw error
            })
        })
        .then(([user, recipient]) => {
            return Promise.all([
                Friend.findOneAndUpdate(
                    { user: user._id, recipient: recipient._id },
                    { $set: { status: 'Pending' }},
                    { upsert: true, new: true }
                ).then(friend => User.findByIdAndUpdate(friend.user, { $push: { friends: friend._id } })),
                Friend.findOneAndUpdate(
                    { user: recipient._id, recipient: user._id },
                    { $set: { status: 'Requested' }},
                    { upsert: true, new: true }
                ).then(friend => User.findByIdAndUpdate(friend.user, { $push: { friends: friend._id }} ))
            ])
        })
        .then(() => {
            res.send({ code: 0, description: 'success' })
        })
        .catch(error => {
            switch (error.name) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: error.message })
                    break
                case 'ValidationError':
                    res.send({ code: 2, description: error.message })
                    break
                default:
                    res.send({ code: 1, description: "unknown error" })
            }
        })
})

router.post('/accept', (req, res) => {
    Promise.all([User.findById(req.user_id).orFail(), User.findById(req.recipient).orFail()])
        .then(([user, recipient]) => {
            return Promise.all([
                Friend.findOne({ user: user._id, recipient: recipient._id, status: 'Requested' }).orFail(),
                Friend.findOne({ user: recipient._id, recipient: user._id, status: 'Pending' }).orFail()
            ]).catch(() => {
                let error = new Error()
                error.name = 'ValidationError'
                error.message = `failed to accept ${ recipient._id }`
                throw error
            })
        })
        .then(([me, friend]) => {
            return Promise.all([
                Friend.findByIdAndUpdate(me._id, { $set: { status: 'Friend' } }),
                Friend.findByIdAndUpdate(friend._id, { $set: { status: 'Friend' } })
            ])
        })
        .then(() => {
            res.send({ code: 0, description: 'success' })
        })
        .catch(error => {
            switch (error.name) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: error.message })
                    break
                case 'ValidationError':
                    res.send({ code: 2, description: error.message })
                    break
                default:
                    res.send({ code: 1, description: "unknown error" })
            }
        })
})

router.post('/reject', (req, res) => {
    Promise.all([User.findById(req.user_id).orFail(), User.findById(req.recipient).orFail()])
        .then(([user, recipient]) => {
            return Promise.all([
                Friend.findOne({ user: user._id, recipient: recipient._id, status: 'Requested' }).orFail(),
                Friend.findOne({ user: recipient._id, recipient: user._id, status: 'Pending' }).orFail()
            ]).catch(() => {
                let error = new Error()
                error.name = 'ValidationError'
                error.message = `failed to reject ${ recipient._id }`
                throw error
            })
        })
        .then(([me, friend]) => {
            return Promise.all([
                Friend.findByIdAndRemove(me._id)
                    .then(() => User.findByIdAndUpdate(me.user._id, { $pull: { friends: me._id }})),
                Friend.findByIdAndRemove(friend._id)
                    .then(() => User.findByIdAndUpdate(friend.user._id, { $pull: { friends: friend._id }}))
            ])
        })
        .then(() => {
            res.send({ code: 0, description: 'success' })
        })
        .catch(error => {
            switch (error.name) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: error.message })
                    break
                case 'ValidationError':
                    res.send({ code: 2, description: error.message })
                    break
                default:
                    res.send({ code: 1, description: "unknown error" })
            }
        })
})

module.exports = router