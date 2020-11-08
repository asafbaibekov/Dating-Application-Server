const mongoose = require('mongoose')

const coinSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
        required: true
    },
    last_auto_add: {
        type: Date,
        default: new Date(),
        required: true
    },
    amount: {
        type: Number,
        default: 10,
        required: true
    }
})

module.exports = mongoose.model('Coin', coinSchema);