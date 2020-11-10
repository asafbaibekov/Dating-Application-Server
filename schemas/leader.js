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
        minlength: [3, 'description must be at least 3 characters.'],
        maxlength: [50, 'description must be less than 50 characters'],
        trim: true
    },
    date_modified: {
        type: Date,
        default: new Date(),
        required: true
    },
})

module.exports = mongoose.model('Leader', leaderSchema);