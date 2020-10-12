const mongoose = require('mongoose')

const fileSchema = new mongoose.Schema({
    bucket: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true }
}, {
    timestamps: true
})

module.exports = mongoose.model('File', fileSchema);