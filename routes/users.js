const express = require('express');
const router = express.Router();
const validator = require('validator')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const User = require('../schemas/user')

const authenticate = require('./auth')

function generateAccessToken(id) {
    return jwt.sign({ user_id: id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
}

router.post('/register', function(req, res, next) {
    let { email, password, mobile } = req.body
    User.create({ email, password, mobile })
        .then(user => client.verify.services(process.env.TWILIO_VERIFY_SERVICE_ID).verifications.create({ to: user.mobile, channel: 'sms' }))
        .then(verification => { res.send({ code: 0, description: "success" }) })
        .catch(error => {
            if (error.name == 'MongoError' && error.code === 11000)
                res.send({ code: 4, description: "unique field already exist", existed_field: Object.keys(error.keyValue)[0] })
            else if (error.name == 'ValidationError')
                res.send({ code: 2, description: error.message })
            else
                res.send({ code: 1, description: 'unknown error' })
        })
})

router.post('/resend_sms', (req, res) => {
    let { mobile } = req.body;
    User.findOne({ mobile }).orFail()
        .then(user => {
            if (user.is_mobile_verified) {
                let error = new Error()
                error.name = 'AlreadyVerifiedPhoneNumber'
                error.message = 'phone number already verified'
                throw error
            }
            else return client.verify.services(process.env.TWILIO_VERIFY_SERVICE_ID).verifications.create({ to: user.mobile, channel: 'sms' })
        })
        .then(verification => { res.send({ code: 0, description: "success" }) })
        .catch(error => {
            if (error.name == 'DocumentNotFoundError')
                res.send({ code: 5, description: 'user not found' })
            else if (error.name == 'AlreadyVerifiedPhoneNumber')
                res.send({ code: 4, description: error.message })
            else
                res.send({ code: 1, description: 'unknown error' })
        })
})

router.post('/verify_sms', (req, res) => {
    let { mobile, code } = req.body;
    User.findOne({ mobile }).orFail()
        .then(user => {
            if (user.is_mobile_verified) {
                let error = new Error()
                error.name = 'AlreadyVerifiedPhoneNumber'
                error.message = 'phone number already verified'
                throw error
            }
            else return client.verify.services(process.env.TWILIO_VERIFY_SERVICE_ID).verificationChecks.create({ to: mobile, code })
        })
        .then(verification => verification.status == "approved")
        .then(is_verified => {
            if (!is_verified) {
                let error = new Error()
                error.name = 'IncorrectVerificationCode'
                error.message = 'incorrect verification code'
                throw error
            }
            else return User.findOneAndUpdate({ mobile }, { is_mobile_verified: true }).orFail()
        })
        .then(user => { res.send({ code: 0, description: "success" }) })
        .catch(error => {
            if (error.name == 'DocumentNotFoundError')
                res.send({ code: 5, description: 'user not found' })
            else if (error.name == 'AlreadyVerifiedPhoneNumber')
                res.send({ code: 4, description: error.message })
            else if (error.name == 'IncorrectVerificationCode')
                res.send({ code: 2, description: error.message })
            else
                res.send({ code: 1, description: 'unknown error' })
        });
})

router.post('/login', function(req, res, next) {
    let { email, password } = req.body
    if (email == null) res.send({ code: 2, description: 'email required' })
    else if (typeof email != 'string') res.send({ code: 2, description: 'email must be string' })
    else if (!validator.isEmail(email)) res.send({ code: 2, description: 'email must be valid' })
    else if (password == null) res.send({ code: 2, description: 'password required' })
    else if (typeof password != 'string') res.send({ code: 2, description: 'password must be string' })
    else {
        User.findOne({ email }).orFail()
            .then(user => user.comparePassword(password))
            .then(user => user.isMobileVerified())
            .then(user => {
                let access_token = generateAccessToken(user._id)
                let refresh_token = jwt.sign({ user_id: user._id }, process.env.REFRESH_TOKEN_SECRET)
                return User.findByIdAndUpdate(user._id, { access_token, refresh_token }, { new: true })
            })
            .then(user => {
                res.send({ accessToken: user.access_token, refreshToken: user.refresh_token, user_id: user._id })
                next()
            })
            .catch(error => {
                if (error.name == 'DocumentNotFoundError')
                    res.send({ code: 5, description: error.message })
                else if (error.name == 'NotAuthenticated')
                    res.send({ code: 3, description: error.message })
                else if (error.name == 'NotVerifiedPhoneNumber')
                    res.send({ code: 3, description: error.message })
                else
                    res.send({ code: 1, description: 'unknown error' })
            })
        
    }
})

router.post('/token', (req, res) => {
    let refresh_token = req.body.token
    if (refresh_token == null) return res.send({ code: 2, description: 'token required' })
    User.findOne({ refresh_token }).orFail()
        .then(user => {
            return new Promise((resolve, reject) => {
                jwt.verify(user.refresh_token, process.env.REFRESH_TOKEN_SECRET, (error, payload) => {
                    if (error) reject(error)
                    else resolve(payload)
                })
            })
        })
        .then(payload => User.findByIdAndUpdate(payload.user_id, { access_token: generateAccessToken(payload.user_id) }, { new: true }).orFail())
        .then(user => {
            res.send({ code: 0, description: 'success', access_token: user.access_token })
        })
        .catch(error => {
            if (error.name == "JsonWebTokenError")
                return res.send({ code: 3, description: error.message })
            else if (error.name == 'DocumentNotFoundError')
                return res.send({ code: 5, description: 'user not found for refresh_token' })
            else
                return res.send({ code: 1, description: "unknown error" })
        })
})

router.delete('/logout', (req, res) => {
    let refresh_token = req.body.token
    User.findOne({ refresh_token }, (err, user) => {
        if (err != null) return res.sendStatus(403)
        if (user == null) return res.send({ code: 5, description: 'user not found'})
        User.findByIdAndUpdate(user.id, { access_token: '', refresh_token: '' }, (err) => {
            if (err != null) return res.sendStatus(500)
            res.send({ code: 0, description: 'success' })
        })
    })
})

router.get('/me', authenticate.http_auth, (req, res) => {
    User.findById(req.user_id, '-password -access_token -refresh_token -is_mobile_verified').orFail()
        .then(user => {
            res.send({ code: 0, description: 'success', user })
        })
        .catch(error => {
            if (error.name == 'DocumentNotFoundError')
                res.send({ code: 5, description: error.message })
            else
                res.send({ code: 1, description: "unknown error" })
        })
});

module.exports = router;
