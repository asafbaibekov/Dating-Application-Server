const mongoose = require('mongoose')
const zodiac = require('zodiac-signs')('en-US')

var profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true,
        unique: false,
    },
    picture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        required: false
    },
    job: {
        type: String,
        minlength: [3, 'job must be at least 3 characters.'],
        trim: true
    },
    short_self_description: {
        type: String,
        maxlength: [300, 'short_self_description must be less than 300 characters'],
        trim: true
    },
    interests: {
        type: [String],
        enum: ["Sport", "Computers", "Walk", "Horses", "Dances", "Food", "Books", "Theater", "Army", "Racing", "Series", "Sushi", "Flowers", "Fishing", "Football", "Basketball", "Baking", "Dating", "Sauna", "Sea", "Foreign countries", "Calm", "Roleplay", "Excitements", "Friends", "Computer games", "Pizza", "Shopping", "Nature", "Sense of humor", "Kissing", "Photography", "Massage", "Green tea", "Animals", "Ice cream", "Dogs", "Cats", "Horses"],
        required: true
    },
    height: {
        type: Number,
        min: 140,
        max: 250,
        required: true
    },
    birth_date: {
        type: Date,
        required: true,
        validate: {
            validator: (value) => Math.abs(new Date(Date.now() - value.getTime()).getUTCFullYear() - 1970) > 18,
            msg: 'birth_date is less then 18 years'
        }
    },
    location: {
        type: new mongoose.Schema({
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true
            },
        }, { _id : false, timestamps: true }),
        required: false
    },
    gender: {
        type: String, 
        enum: ['male', 'female'],
        required: true
    },
    zodiac: {
        type: String,
        enum: zodiac.getNames('en')
    },
    alcohol: {
        type: String,
        enum: ['all_times', 'part_times', 'no_times']
    },
    smokes: {
        type: String,
        enum: ['all_times', 'part_times', 'no_times']
    },
    children: {
        type: String,
        enum: ['have', "have_live_away", 'none']
    },
    physique: {
        type: String,
        enum: ['over_weight', 'medium', 'shapely', 'skinny']
    }
})

profileSchema.index({ location: '2dsphere' });

profileSchema.pre('findOneAndUpdate', function(next, docs) {
    if (this._update.$set && this._update.$set.birth_date) {
        let birth_date = new Date(this._update.$set.birth_date)
        return this.model.findOneAndUpdate(this._conditions, { zodiac: zodiac.getSignByDate({ day: birth_date.getDate(), month: birth_date.getMonth() + 1 }).name })
    }
    else next()
})

profileSchema.pre('save', function(next, docs) {
    let birth_date = new Date(this.birth_date)
    this.zodiac = zodiac.getSignByDate({ day: birth_date.getDate(), month: birth_date.getMonth() + 1 }).name
    next()
})

module.exports = mongoose.model('Profile', profileSchema);