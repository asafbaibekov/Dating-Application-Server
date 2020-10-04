var express = require('express');
var router = express.Router();

const User = require("../schemas/user")

router.get('/me', (req, res) => {
    User.findById(req.user_id, '-password -access_token -refresh_token -is_mobile_verified').orFail()
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

module.exports = router;