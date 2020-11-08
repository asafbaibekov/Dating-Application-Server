var express = require("express");
var router = express.Router();

const User = require("../schemas/user");
const Profile = require("../schemas/profile")
const Leader = require("../schemas/leader")


router.put('/add', (req, res) => {
    let { description } = req.body
    User.findById(req.user_id).orFail()
        .then(user => {
            console.log(user._id)
            Profile.findOne( {user: user._id })
                .then(profile => {
                    console.log(profile)
                    Leader.findOneAndUpdate(
                        { profile: profile._id },
                        { profile: profile._id, description },
                        {
                            new: true,
                            runValidators: true,
                            upsert: true,
                            setDefaultsOnInsert: true,
                        })
                            .then((leader) => {
                                res.send({ code: 0, description: "success", leader });
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
        })
        .catch((error) => {
            if (error.name == "DocumentNotFoundError")
                res.send({ code: 5, description: error.message });
            else res.send({ code: 1, description: "unknown error" });
        });
})

router.get('/list', (req, res) => {

})

module.exports = router;