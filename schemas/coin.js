const mongoose = require('mongoose')

const coinSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
        required: true
    },
    last_login: {
        type: Date,
        default: new Date(),
        required: true
    },
    amount: {
        type: Number,
        default: 0,
        required: true
    }
})


module.exports = mongoose.model('Coin', coinSchema);