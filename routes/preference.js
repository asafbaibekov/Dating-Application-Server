var express = require('express');
var router = express.Router();

const User = require("../schemas/user")
const Preference = require("../schemas/preference")

router.get('/me', (req, res) => {
    User.findById(req.user_id, '-password -access_token -refresh_token -is_mobile_verified').populate('preference').orFail()
        .then(user => {
            res.send({ code: 0, description: 'success', user })
        })
        .catch(error => {
            if (error.name == 'DocumentNotFoundError')
                res.send({ code: 5, description: 'user_id not found' })
            else
                res.send({ code: 1, description: "unknown error" })
        })
})

router.put('/create', (req, res) => {
    let { min_age, max_age, distance, zodiac, min_height, max_height, interests, alcohol, children, physique, gender } = req.body
    let preference = { min_age, max_age, distance, zodiac, min_height, max_height, interests, alcohol, children, physique, gender }
    User.findById(req.user_id)
        .then(user => {
            if (user.preference) {
                let error = new Error()
                error.name = 'DocumentAlreadyCreated'
                error.message = 'preference is already created, please update your current preference'
                throw error
            }
            else return Preference.create({ user: user._id,  ...preference })
        })
        .then(preference => User.findByIdAndUpdate(req.user_id, { preference: preference._id }, { new: true, projection: '-password -access_token -refresh_token -is_mobile_verified' }).populate('preference'))
        .then(user => { res.send({ code: 0, description: 'success', user }) })
        .catch(error => {
            if (error.name == 'DocumentAlreadyCreated')
                res.send({ code: 4, description: error.message })
            else if (error.name == 'MongoError' && error.code === 11000)
                res.send({ code: 4, description: "unique field already exist", existed_field: Object.keys(error.keyValue)[0] })
            else if (error.name == "ValidationError")
                res.send({ code: 2, description: error.message })
            else
                res.send({ code: 1, description: "unknown error" })
        })
})

router.patch('/update', (req, res) => {
    let { min_age, max_age, distance, zodiac, min_height, max_height, interests, alcohol, children, physique, gender } = req.body
    let preference = { min_age, max_age, distance, zodiac, min_height, max_height, interests, alcohol, children, physique, gender }
    Object.keys(preference).forEach(key => (preference[key] == null) && delete preference[key]);
    User.findById(req.user_id)
        .then(user => Preference.findByIdAndUpdate(user.preference, { $set: preference }, { new: true, runValidators: true, setDefaultsOnInsert: true }))
        .then(preference => {
            res.send({ code: 0, description: 'success', preference })
        })
        .catch(error => {
            if (error.name == "ValidationError")
                res.send({ code: 2, description: error.message })
            else
                res.send({ code: 1, description: "unknown error" })
        })
})

module.exports = router;