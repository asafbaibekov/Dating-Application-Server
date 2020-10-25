const mongoose = require('mongoose')

var storySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
        required: true
    },
    files: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'File'
        }],
        required: true
    }
}, { timestamps: true })

module.exports = mongoose.model('Story', storySchema);