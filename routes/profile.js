var express = require('express');
var router = express.Router();

var fs = require('fs');

const User = require("../schemas/user")
const Profile = require("../schemas/profile")
const File = require("../schemas/file")

var formidable = require('formidable');

var { upload_profile_picture, delete_profile_picture } = require('../helpers/google-cloud-storage')

router.get('/me', (req, res) => {
    Profile.findOne({ user: req.user_id }).populate('pictures').orFail()
        .then(profile => {
            res.send({ code: 0, description: 'success', profile })
        })
        .catch(error => {      
            if (error.name == 'DocumentNotFoundError')
                res.send({ code: 5, description: error.message })
            else
                res.send({ code: 1, description: "unknown error" })
        })
})

router.put('/create', (req, res) => {
    let { name, birth_date, gender, job, short_self_description, interests, height, alcohol, smokes, children, physique } = req.body
    let profile = { name, birth_date, gender, job, short_self_description, interests, height, alcohol, smokes, children, physique }
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
        .then(user => { res.send({ code: 0, description: 'success', profile: user.profile }) })
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
    let { name, birth_date, gender, job, short_self_description, interests, living, height, alcohol, smokes, children, physique } = req.body
    let profile = { name, birth_date, gender, job, short_self_description, interests, living, height, alcohol, smokes, children, physique }
    Object.keys(profile).forEach(key => (profile[key] == null) && delete profile[key]);
    User.findById(req.user_id)
        .then(user => Profile.findByIdAndUpdate(user.profile, { $set: profile }, { new: true, runValidators: true, setDefaultsOnInsert: true }).orFail())
        .then(profile => profile.populate('pictures').execPopulate())
        .then(profile => {
            res.send({ code: 0, description: 'success', profile })
        })
        .catch(error => {
            switch (error.name) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: error.message });
                    break;
                case 'ValidationError':
                    res.send({ code: 2, description: error.message })
                    break;
                default:
                    res.send({ code: 1, description: "unknown error" })
            }
        })
})

router.patch('/pictures', (req, res) => {
    var form = new formidable.IncomingForm({ keepExtensions: true, maxFileSize: 10 * 1024 * 1024, multiples: true });
    User.findById(req.user_id).orFail()
        .then(user => Profile.findById(user.profile).orFail())
        .then(profile => {
            return new Promise((resolve, reject) => {
                form.parse(req, (error, fields, files) => {
                    if (error) { error.name = 'FormidableError'; reject(error) }
                    else resolve({ fields, files })
                })
            })
            .then(({ files }) => {
                let pictures = [files.picture1, files.picture2, files.picture3, files.picture4, files.picture5].filter(element => element !== undefined);
                if (pictures.length === 0) {
                    let error = new Error()
                    error.name = 'EmptyPictureList'
                    error.message = 'one picture at least is required'
                    throw error
                }
                if (profile.pictures.length + pictures.length > 5) {
                    let error = new Error()
                    error.name = 'OverloadedPictureList'
                    error.message = 'five pictures at most are allowed'
                    throw error
                }
                if (!pictures.every(picture => picture.type.split('/')[0] == 'image')) {
                    let error = new Error()
                    error.name = 'FileTypeError'
                    error.message = 'all elements of pictures array must be image type'
                    throw error
                }
                return Promise.all(pictures.map(picture => {
                    return upload_profile_picture(picture.path).then(object => {
                        return new Promise(resolve => { fs.unlink(picture.path, () => { resolve(object) }) })
                    })
                }))
                .then(objects => {
                    return objects.reduce((p, object) => {
                        return p.then(() => {
                            return File.create(object).then(file => Profile.findByIdAndUpdate(profile._id, { $push: { pictures: file._id } }, { new: true, runValidators: true }).orFail())
                        });
                    }, Promise.resolve());
                })
                .then(() => Profile.findById(profile._id).populate('pictures'))
            })
            .then(profile => {
                res.send({ code: 0, description: 'success', profile })
            })
        })
        .catch(error => {
            switch (error.name) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: 'profile not found for user, create profile before insert picture' })
                    break
                case 'EmptyPictureList':
                case 'OverloadedPictureList':
                case 'FileTypeError':
                case 'FormidableError':
                    res.send({ code: 2, description: error.message })
                    break
                default:
                    res.send({ code: 1, description: 'unknown error' })
            }
        })
})

router.delete('/picture', (req, res) => {
    let { picture_id } = req.body
    User.findById(req.user_id).orFail()
        .then(user => {
            return Profile.findByIdAndUpdate(user.profile, { $pull: { pictures: picture_id } }, { new: true }).orFail()
                            .then(profile => File.findByIdAndDelete(picture_id).then(() => profile).catch(() => profile))
        })
        .then(profile => profile.populate('pictures').execPopulate())
        .then(profile => {
            res.send({ code: 0, description: 'success', profile })
        })
        .catch(error => {
            switch(error) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: 'profile not found for user, create profile before insert picture' })
                    break
                default:
                    res.send({ code: 1, description: 'unknown error' })
            }
        })
})


router.delete('/pictures', (req, res) => {
    User.findById(req.user_id).orFail()
        .then(user => Profile.findById(user.profile, '_id pictures').orFail())
        .then(profile => Profile.findByIdAndUpdate(profile, { pictures: [] }, { new: true }).orFail())
        .then(profile => Promise.all(profile.pictures.map(picture_id => File.findByIdAndDelete(picture_id))).then(() => profile).catch(() => profile))
        .then(profile => {
            res.send({ code: 0, description: 'success', profile })
        })
        .catch(error => {
            switch(error) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: 'profile not found for user, create profile before insert picture' })
                    break
                default:
                    res.send({ code: 1, description: 'unknown error' })
            }
        })
})

router.patch('/location', (req, res) => {
    let { longitude, latitude } = req.body
    let coordinates = [longitude, latitude]
    User.findById(req.user_id).orFail()
        .then(user => Profile.findById(user.profile, '_id, location'))
        .then(profile => {
            if (profile.location)
                return Profile.findByIdAndUpdate(profile._id, { $set: { "location.coordinates": coordinates } }, { new: true, runValidators: true, setDefaultsOnInsert: true }).orFail()
            else
                return Profile.findByIdAndUpdate(profile._id, { location: { type: 'Point',  coordinates } }, { new: true, runValidators: true, setDefaultsOnInsert: true }).orFail()
        })
        .then(profile => { res.send({ code: 0, description: 'success', profile }) })
        .catch(error => {
            switch (error.name) {
                case 'DocumentNotFoundError':
                    res.send({ code: 5, description: error.message });
                    break
                case 'ValidationError':
                    res.send({ code: 2, description: error.message });
                    break
                default:
                    res.send({ code: 1, description: 'unkown error' });
            }
        })
})

module.exports = router;