var express = require('express');
var router = express.Router();
var validator = require('validator')
var moment = require('moment')
var User = require('../schemas/user')

var bcrypt = require('bcrypt');
const saltRounds = 10;

var jwt = require('jsonwebtoken')

router.post('/register', async function(req, res, next) {
    let { name, email, password, mobile, birth_date, gender } = req.body
    let birth_date_formatted = `${birth_date.year}-${birth_date.month}-${birth_date.day}`
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
    else if (birth_date == null) res.send({ code: 2, description: 'birth_date required' })
    else if (typeof birth_date != 'object') { console.log(typeof birth_date); res.send({ code: 2, description: 'birth_date must be object' }) }
    else if (birth_date.day == null) res.send({ code: 2, description: 'birth_date.day required' })
    else if (typeof birth_date.day != 'number') res.send({ code: 2, description: 'birth_date.day must be number' })
    else if (birth_date.month == null) res.send({ code: 2, description: 'birth_date.month required' })
    else if (typeof birth_date.month != 'number') res.send({ code: 2, description: 'birth_date.month must be number' })
    else if (birth_date.year == null) res.send({ code: 2, description: 'birth_date.year required' })
    else if (typeof birth_date.year != 'number') res.send({ code: 2, description: 'birth_date.year must be number' })
    else if (moment(birth_date_formatted, 'YYYY-MM-DD', true).isValid()) res.send({ code: 2, description: 'birth_date is not valid date' })
    else if (gender == null) res.send({ code: 2, description: 'gender required' })
    else if (typeof gender != 'string') res.send({ code: 2, description: 'gender must be string' })
    else if (gender != 'male' && gender != 'female') res.send({ code: 2, description: 'gender must be male of female' })
    else {
        try {
            let salt = await bcrypt.genSalt(saltRounds);
            let hashed_password = await bcrypt.hash(password, salt)
            new User({
                name,
                email,
                password: hashed_password,
                mobile,
                birth_date: {
                    day: birth_date.day,
                    month: birth_date.month,
                    year: birth_date.year
                },
                gender: { enum: [ gender ] }
            })
            .save()
            .then(doc => { res.send({ code: 0, description: "success" }) })
            .catch(err => {
                if (err.name == 'MongoError' && err.code === 11000)
                    res.send({ code: 4, description: "unique field already exist", existed_field: Object.keys(err.keyValue)[0] })
                else
                    res.send({ code: 1, description: 'unknown error' })
            })
        } catch (err) {
            res.send({ code: 1, description: 'unknown error' })
        }
    }
})

function generateAccessToken(id) {
    return jwt.sign({ user_id: id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
}

router.post('/login', async function(req, res, next) {
    let { email, password } = req.body
    if (email == null) res.send({ code: 2, description: 'email required' })
    else if (typeof email != 'string') res.send({ code: 2, description: 'email must be string' })
    else if (!validator.isEmail(email)) res.send({ code: 2, description: 'email must be valid' })
    else if (password == null) res.send({ code: 2, description: 'password required' })
    else if (typeof password != 'string') res.send({ code: 2, description: 'password must be string' })
    else {
        User.findOne({ email }, async (err, user) => {
            if (err != null) return res.sendStatus(500)
            if (await bcrypt.compare(password, user.password)) {
                let access_token = generateAccessToken(user.id)
                let refresh_token = jwt.sign({ user_id: user.id }, process.env.REFRESH_TOKEN_SECRET)
                User.findByIdAndUpdate(user.id, { access_token, refresh_token }, (err) => {
                    if (err != null) return res.sendStatus(500)
                    res.send({ accessToken: access_token, refreshToken: refresh_token, user_id: user._id })
                })
            } else {
                res.send({ code: 3, description: 'not authenticated'})
            }
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
