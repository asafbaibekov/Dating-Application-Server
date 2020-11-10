var express = require("express");
var router = express.Router();

const User = require("../schemas/user");
const Profile = require("../schemas/profile")
const Leader = require("../schemas/leader")

const coin = require('../middlewares/coin')


router.put( '/add', coin.leaderPrice, is_first_leader, coin.check_and_purchase, (req, res) => {
    let { description } = req.body
    Leader.findOneAndUpdate(
        { profile: req.profile_id },
        { 
            profile: req.profile_id,
            description,
            date_modified: new Date()
        },
        {
            new: true,
            runValidators: true,
            upsert: true,
            setDefaultsOnInsert: true,
        })
            .then(leader => {
                res.send({ code: 0, description: "success",coin_amount: req.coin_amount, leader });
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

router.get('/list', (req, res) => {
    Leader.find({}).sort({ date_modified: -1 }).limit(25).populate("profile")
        .then(leaders =>{
            res.send({ code: 0, description: "success", leaders })
        })
        .catch(error => {
            if (error.name == "DocumentNotFoundError")
                res.send({ code: 5, description: error.message });
            else
                res.send({ code: 1, description: "unknown error" });
        });
})


function is_first_leader (req, res, next) {
    User.findById(req.user_id).orFail()
    .then(user => {
        Profile.findOne({ user: user._id })
            .then(profile => {
                req.profile_id = profile._id
                Leader.findOne().sort({ date_modified: -1 }).limit(1).orFail()
                .then(leader =>{
                    if (leader.profile.equals(profile._id)) {
                        res.send({ code: 2, description: "user is already first leader" })
                        next("user is already first leader")
                    }
                        
                    else {
                        next()
                    }
                })
                .catch(error => {  
                    if (error.name === 'DocumentNotFoundError') // not exist leaders in the list
                        next()
                    else throw error
                })
            })
            .catch((error) => {
                if (error.message == `Cannot read property '_id' of null`)
                    res.send({ code: 2, description: "profile is not exist" });
                else throw error;
            });
    })
    .catch((error) => {
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
    });
}

module.exports = router;