const mongoose = require('mongoose')

const leaderSchema = new mongoose.Schema({
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        unique: true,
        required: true
    },
    description: {
        type: String,
        maxlength: [50, 'description must be less than 50 characters'],
        trim: true
    }
})

module.exports = mongoose.model('Leader', leaderSchema);