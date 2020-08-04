var express = require('express');
var router = express.Router();
var validator = require('validator')
var User = require('../schemes/user')

var bcrypt = require('bcrypt');
const saltRounds = 10;

router.post('/register', async function(req, res, next) {
    let { name, email, password, mobile, birth_date, gender } = req.body
    if (name == null) res.send({ code: 1, description: 'name required' })
    else if (typeof name != 'string') res.send({ code: 1, description: 'name must be string' })
    else if (email == null) res.send({ code: 1, description: 'email required' })
    else if (typeof email != 'string') res.send({ code: 1, description: 'email must be string' })
    else if (!validator.isEmail(email)) res.send({ code: 1, description: 'email must be valid' })
    else if (password == null) res.send({ code: 1, description: 'password required' })
    else if (typeof password != 'string') res.send({ code: 1, description: 'password must be string' })
    else if (mobile == null) res.send({ code: 1, description: 'mobile required' })
    else if (typeof mobile != 'string') res.send({ code: 1, description: 'mobile must be string' })
    else if (!validator.isMobilePhone(mobile)) res.send({ code: 1, description: 'mobile must be valid' })
    else if (birth_date == null) res.send({ code: 1, description: 'birth_date required' })
    else if (typeof birth_date != 'object') { console.log(typeof birth_date); res.send({ code: 1, description: 'birth_date must be object' }) }
    else if (birth_date.day == null) res.send({ code: 1, description: 'birth_date.day required' })
    else if (typeof birth_date.day != 'number') res.send({ code: 1, description: 'birth_date.day must be number' })
    else if (birth_date.month == null) res.send({ code: 1, description: 'birth_date.month required' })
    else if (typeof birth_date.month != 'number') res.send({ code: 1, description: 'birth_date.month must be number' })
    else if (birth_date.year == null) res.send({ code: 1, description: 'birth_date.year required' })
    else if (typeof birth_date.year != 'number') res.send({ code: 1, description: 'birth_date.year must be number' })
    else if (gender == null) res.send({ code: 1, description: 'gender required' })
    else if (typeof gender != 'string') res.send({ code: 1, description: 'gender must be string' })
    else if (gender != 'male' && gender != 'female') res.send({ code: 1, description: 'gender must be male of female' })
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
        }).save()
            .then(doc => { res.send({ code: 0, description: "success" }) })
            .catch(err => { res.send({ code: 2, description: "user already exist"}) })
        } catch (err) {
        console.error(err)
        }
    }
})

module.exports = router;
