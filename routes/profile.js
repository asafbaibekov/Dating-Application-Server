var express = require('express');
var router = express.Router();

const User = require("../schemas/user")
const Profile = require("../schemas/profile")

router.get('/me', (req, res) => {
    User.findById(req.user_id, '-password -access_token -refresh_token -is_mobile_verified').populate('profile').orFail()
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
    let { birth_date, gender, job, short_self_description, interests, height, alcohol, smokes, children, physique } = req.body
    let profile = { birth_date, gender, job, short_self_description, interests, height, alcohol, smokes, children, physique }
    User.findById(req.user_id)
        .then(user => {
            if (user.profile) {
                let error = new Error()
                error.name = 'DocumentAlreadyCreated'
                error.message = 'profile is already created, please update your current profile'
                throw error
            }
            else return Profile.create({ user: user._id,  ...profile })
        })
        .then(profile => User.findByIdAndUpdate(req.user_id, { profile: profile._id }, { new: true, projection: '-password -access_token -refresh_token -is_mobile_verified' }).populate('profile'))
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
    let { birth_date, gender, job, short_self_description, interests, living, height, alcohol, smokes, children, physique } = req.body
    let profile = { birth_date, gender, job, short_self_description, interests, living, height, alcohol, smokes, children, physique }
    Object.keys(profile).forEach(key => (profile[key] == null) && delete profile[key]);
    User.findById(req.user_id)
        .then(user => Profile.findByIdAndUpdate(user.profile, { $set: profile }, { new: true, runValidators: true, setDefaultsOnInsert: true }))
        .then(profile => { 
            res.send({ code: 0, description: 'success', profile })
        })
        .catch(error => {
            if (error.name == "ValidationError")
                res.send({ code: 2, description: error.message })
            else
                res.send({ code: 1, description: "unknown error" })
        })
})

module.exports = router;