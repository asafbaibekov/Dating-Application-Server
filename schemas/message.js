const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sender_id: {
            type: String,
            required: true
        },
        receiver_id: {
            type: String,
            required: true
        },
        message_text: {
            type: String,
            required: true
        }
    }, { 
        timestamps: true
    }
);

module.exports = mongoose.model('Message', messageSchema);