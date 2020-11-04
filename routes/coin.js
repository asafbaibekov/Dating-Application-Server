var express = require('express');
var router = express.Router();

const Coin = require('../schemas/coin')

const authenticate = require('./auth')


router.get('/me', authenticate.http_auth, (req, res) => {
    Coin.findOneAndUpdate({ user: req.user_id }, {}, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true })
        .then(coin => {
            res.send({ code: 0, description: 'success', coin })
        })
        .catch(error => { 
            if (error.name == 'DocumentNotFoundError')
                res.send({ code: 5, description: error.message })
            else
                res.send({ code: 1, description: "unknown error" })
        })
})

module.exports = router;