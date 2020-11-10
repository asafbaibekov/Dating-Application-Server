const User = require("../schemas/user");
const Coin = require("../schemas/coin");

module.exports.check_and_update = function (req, res, next) {
    User.findById(req.user_id).orFail()
        .then(user => Coin.findOneAndUpdate({ user: user._id }, {}, { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }))
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
        .then(() => { next() })
        .catch(error => {
            if (error.name == "DocumentNotFoundError")
                res.send({ code: 5, description: error.message });
            else
                res.send({ code: 1, description: "unknown error" });
        });
};

module.exports.leaderPrice = function (req, res, next) {
    req.price = 10 
    next()
}

module.exports.check_and_purchase = function (req, res, next) {
    User.findById(req.user_id).orFail()
        .then(user => {
            Coin.findOneAndUpdate(
                {
                    user: user._id,
                    amount: {
                        $gte: req.price
                    },
                    },
                    { $inc: { amount: -req.price } },
                    { new: true, runValidators: true }
            )
                .orFail()
                .then(coin => {
                    req.coin_amount = coin.amount
                    next()
                })
                .catch((error) => {
                    if (error.name == "DocumentNotFoundError")
                        res.send({ code: 5, description: "user does not have enough coins" });
                    else throw error;
                });
        })
        .catch(error => {
            if (error.name == "DocumentNotFoundError")
                res.send({ code: 5, description: error.message });
            else
                res.send({ code: 1, description: "unknown error" });
        });
}
