var express = require("express");
var router = express.Router();

const User = require("../schemas/user");
const Coin = require("../schemas/coin");

router.get("/me", (req, res) => {
    User.findById(req.user_id).orFail()
        .then(user => Coin.findOneAndUpdate({ user: user._id }, {}, { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true } ))
        .then(coin => {
            return Coin.findOneAndUpdate(
                {
                    _id: coin._id,
                    last_auto_add: {
                        $lt: (function () {
                            let date = new Date();
                            date.setUTCHours(date.getUTCHours() - 24);
                            return date;
                        })(),
                    }
                },
                { $inc: { amount: 1 }, $set: { last_auto_add: new Date() } },
                { new: true, runValidators: true }
            ).orFail()
            .catch(error => {
                if (error.name == "DocumentNotFoundError") return coin;
                else throw error;
            });
        })
        .then(coin => {
            res.send({ code: 0, description: "success", coin });
        })
        .catch(error => {
            if (error.name == "DocumentNotFoundError")
                res.send({ code: 5, description: error.message });
            else
                res.send({ code: 1, description: "unknown error" });
        });    
});

router.post("/add", (req, res) => {
    let { amount } = req.body
    if (typeof amount != 'number')
        return res.send({ code: 2, description: "amount must be number" })
    if (amount <= 0)
        return res.send({ code: 2, description: "amount must be positive number" })
    User.findById(req.user_id).orFail()
        .then(user => Coin.findOneAndUpdate({ user: user._id }, { $inc: { amount: amount } }, { new: true, runValidators: true }))        
        .then(coin => {
            res.send({ code: 0, description: "success", coin });
        })
        .catch(error => {
            if (error.name == "DocumentNotFoundError")
                res.send({ code: 5, description: error.message });
            else
                res.send({ code: 1, description: "unknown error" });
        });
});


router.post("/reduce", (req, res) => {
    let { amount } = req.body
    if (typeof amount != 'number')
        return res.send({ code: 2, description: "amount must be number" })
    if (amount <= 0)
        return res.send({ code: 2, description: "amount must be positive number" })
    User.findById(req.user_id).orFail()
        .then(user => Coin.findOneAndUpdate({ user: user._id }, { $inc: { amount: -amount } }, { new: true, runValidators: true }))        
        .then(coin => {
            res.send({ code: 0, description: "success", coin });
        })
        .catch(error => {
            if (error.name == "DocumentNotFoundError")
                res.send({ code: 5, description: error.message });
            else
                res.send({ code: 1, description: "unknown error" });
        });
});

module.exports = router;