const mongoose = require('mongoose')

const friendSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enums: [
            'Requested',
            'Pending',
            'Friend'
        ],
        default: 'Add Friend',
        required: true
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('Friend', friendSchema);