var express = require('express');
var router = express.Router();

const Coin = require('../schemas/coin')


router.get('/me', (req, res) => {
    let user = req.user_id
    Coin.findOneAndUpdate({ user }, {}, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true })
    .then(newCoin => {
        var incAmount = 1
        
        function checkCredit (last_login){
            const second = 1000; // = 1000 milliseconds 
            const hour = 3600 * second
            let creditTime = 24 * hour
            let currDate = new Date()       

            if (currDate - newCoin.last_login >= creditTime ) return true
            else return false
        }

    let isCredit = checkCredit (newCoin.last_login)
    console.log("isCredit - ", isCredit)


        if (isCredit) { // past 24 hours
            Coin.findByIdAndUpdate({ _id: newCoin._id },  { $inc: { "amount": incAmount }, $set: { "last_login": new Date() }  }, { new: true })
            .then(updtaeCoin => {
                res.send({ code: 0, description: 'success to uptade', updtaeCoin })
            })
            .catch(error => { 
                if (error.name == 'DocumentNotFoundError')
                    res.send({ code: 5, description: error.message })
                else
                    res.send({ code: 1, description: error.message })
            })
        }
        else {
            res.send({ code: 0, description: 'success', newCoin })
        }              
    })
    .catch(error => { 
        if (error.name == 'DocumentNotFoundError')
            res.send({ code: 5, description: error.message })
        else
            res.send({ code: 1, description: "unknown error on create" })
    })
})


module.exports = router;