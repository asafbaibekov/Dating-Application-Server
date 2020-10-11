var express = require('express');
var router = express.Router();
var validator = require('validator')
var User = require('../schemas/user')

var bcrypt = require('bcrypt');
const saltRounds = 10;

var jwt = require('jsonwebtoken')

require('dotenv').config()

const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

router.post('/register', function(req, res, next) {
    let { name, email, password, mobile } = req.body
    if (name == null) res.send({ code: 2, description: 'name required' })
    else if (typeof name != 'string') res.send({ code: 2, description: 'name must be string' })
    else if (email == null) res.send({ code: 2, description: 'email required' })
    else if (typeof email != 'string') res.send({ code: 2, description: 'email must be string' })
    else if (!validator.isEmail(email)) res.send({ code: 2, description: 'email must be valid' })
    else if (password == null) res.send({ code: 2, description: 'password required' })
    else if (typeof password != 'string') res.send({ code: 2, description: 'password must be string' })
    else if (mobile == null) res.send({ code: 2, description: 'mobile required' })
    else if (typeof mobile != 'string') res.send({ code: 2, description: 'mobile must be string' })
    else if (!validator.isMobilePhone(mobile)) res.send({ code: 2, description: 'mobile must be valid' })
    else {
        bcrypt.genSalt(saltRounds)
            .then(salt => bcrypt.hash(password, salt))
            .then(hashed_password => User.create({ name, email, password: hashed_password, mobile }))
            .then(user => client.verify.services(process.env.TWILIO_VERIFY_SERVICE_ID).verifications.create({ to: user.mobile, channel: 'sms' }))
            .then(verification => { res.send({ code: 0, description: "success" }) })
            .catch(err => {
                if (err.name == 'MongoError' && err.code === 11000)
                    res.send({ code: 4, description: "unique field already exist", existed_field: Object.keys(err.keyValue)[0] })
                else
                    res.send({ code: 1, description: 'unknown error' })
            })
    }
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

function generateAccessToken(id) {
    return jwt.sign({ user_id: id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
}

router.post('/login', function(req, res, next) {
    let { email, password } = req.body
    if (email == null) res.send({ code: 2, description: 'email required' })
    else if (typeof email != 'string') res.send({ code: 2, description: 'email must be string' })
    else if (!validator.isEmail(email)) res.send({ code: 2, description: 'email must be valid' })
    else if (password == null) res.send({ code: 2, description: 'password required' })
    else if (typeof password != 'string') res.send({ code: 2, description: 'password must be string' })
    else {
        User.findOne({ email })
            .then(user => {
                if (!bcrypt.compareSync(password, user.password)) {
                    let error = new Error()
                    error.name = 'NotAuthenticated'
                    error.message = 'incorrect password'
                    throw error
                } else if (user.is_mobile_verified === false) {
                    let error = new Error()
                    error.name = 'NotVerifiedPhoneNumber'
                    error.message = 'phone is not verified yet'
                    throw error
                } else {
                    let access_token = generateAccessToken(user.id)
                    let refresh_token = jwt.sign({ user_id: user._id }, process.env.REFRESH_TOKEN_SECRET)
                    return User.findByIdAndUpdate(user._id, { access_token, refresh_token })
                }
            })
            .then(user => {
                res.send({ accessToken: user.access_token, refreshToken: user.refresh_token, user_id: user._id })
            })
            .catch(error => {
                if (error.name == 'NotAuthenticated')
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
    if (refresh_token == null) return res.sendStatus(401)
    User.findOne({ refresh_token }, (err, user) => {
        if (err != null) return res.sendStatus(403)
        jwt.verify(user.refresh_token, process.env.REFRESH_TOKEN_SECRET, (err, payload) => {
            if (err) return res.sendStatus(403)
            let access_token = generateAccessToken(payload.user_id)
            User.findByIdAndUpdate(payload.id, { access_token }, (err) => {
                if (err != null) return res.sendStatus(500)
                res.send({ accessToken: access_token })
            })
        })
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

module.exports = router;
