const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        chat_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        sender_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        receiver_id: {
            type: mongoose.Schema.Types.ObjectId,
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