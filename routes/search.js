var express = require('express');
var router = express.Router();

const User = require("../schemas/user")
const Profile = require("../schemas/profile");
const preference = require('../schemas/preference');

router.get('/profiles', (req, res) => {
    User.findById(req.user_id).orFail().populate('profile').populate('preference')
        .then(user => {
            if (!user.profile) {
                let error = new Error()
                error.name = 'ProfileNotFound'
                error.message = 'profile record of user not found'
                throw error
            }
            if (!user.preference) {
                let error = new Error()
                error.name = 'PreferenceNotFound'
                error.message = 'preference record of user not found'
                throw error
            }
            if (!user.profile.location) {
                let error = new Error()
                error.name = 'LocationNotFound'
                error.message = 'location record of user not found'
                throw error
            }
            let query = { }
            if (user.preference.zodiac && user.preference.zodiac instanceof Array && user.preference.zodiac.length > 0)
                query.zodiac = { $in: user.preference.zodiac }
            if (user.preference.interests && user.preference.interests instanceof Array && user.preference.interests.length > 0)
                query.interests = { $in: user.preference.interests }
            if (user.preference.alcohol && user.preference.alcohol instanceof Array && user.preference.alcohol.length > 0)
                query.alcohol = { $in: user.preference.alcohol }
            if (user.preference.children && user.preference.children instanceof Array && user.preference.children.length > 0)
                query.children = { $in: user.preference.children }
            if (user.preference.physique && user.preference.physique instanceof Array && user.preference.physique.length > 0)
                query.physique = { $in: user.preference.physique }
            if (user.preference.smokes && user.preference.smokes instanceof Array && user.preference.smokes.length > 0)
                query.smokes = { $in: user.preference.smokes }
            if (user.preference.gender && user.preference.gender instanceof Array && user.preference.gender.length > 0)
                query.gender = { $in: user.preference.gender }
            return Profile.find({
                user: { $ne: user._id },
                birth_date: {
                    $lte: (function() {
                        let date = new Date()
                        date.setYear(date.getUTCFullYear() - user.preference.min_age)
                        return date
                    }()),
                    $gte: (function() {
                        let date = new Date()
                        date.setYear(date.getUTCFullYear() - user.preference.max_age)
                        return date
                    }())
                },
                height: { 
                    $lte: user.preference.max_height,
                    $gte: user.preference.min_height
                },
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: user.profile.location.coordinates
                        },
                        $maxDistance: user.preference.distance * 1000
                    }
                },
                ...query
            })
        })
        .then(profiles => {
            res.send({ code: 0, description: 'success', profiles })
        })
        .catch(error => {
            switch (error.name) {
                case 'ProfileNotFound':
                case 'PreferenceNotFound':
                case 'LocationNotFound':
                    res.send({ code: 5, description: error.message })
                    break
                default:
                    res.send({ code: 1, description: 'unknown error' })
            }
        })
})

module.exports = router;