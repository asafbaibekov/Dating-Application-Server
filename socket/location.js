let User = require('../schemas/user')
let Profile = require('../schemas/profile')

module.exports = function(io) {
    io.of('/location').on("connection", socket => {
        socket.on("save", data => {
            let { longitude, latitude } = data
            let location = { longitude, latitude }
            Object.keys(location).forEach(key => (location[key] == null) && delete location[key]);
            User.findById(socket.user_id).orFail()
                .then(user => Profile.findById(user.profile, '_id, location'))
                .then(profile => {
                    if (profile.location)
                        return Profile.findByIdAndUpdate(profile._id, { $set: { "location.coordinates": coordinates } }, { new: true, runValidators: true, setDefaultsOnInsert: true }).orFail()
                    else
                        return Profile.findByIdAndUpdate(profile._id, { location: { type: 'Point',  coordinates } }, { new: true, runValidators: true, setDefaultsOnInsert: true }).orFail()
                })
                .then(profile => socket.emit('saved', { code: 0, description: 'success', profile }))
                .catch(error => {
                    switch (error.name) {
                        case 'DocumentNotFoundError':
                            socket.emit('exception', { code: 5, description: error.message });
                            break
                        case 'ValidationError':
                            socket.emit('exception', { code: 2, description: error.message });
                            break
                        default:
                            socket.emit('exception', { code: 1, description: 'unkown error' });
                    }
                })
        });
    });
}