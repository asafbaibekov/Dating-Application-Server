const mongoose = require('mongoose'); // Erase if already required

var chatSchema = new mongoose.Schema({
    users: {
        type: [mongoose.Schema.Types.ObjectId],
        required: true
    },
    connections: { 
        type: [{
            user_id: mongoose.Schema.Types.ObjectId,
            socket_id: String
        }]
    }
});

//Export the model
module.exports = mongoose.model('Chat', chatSchema);