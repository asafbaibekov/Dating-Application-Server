const mongoose = require('mongoose')
const zodiac = require('zodiac-signs')('en-US')
const moment = require('moment')

var profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
        required: true
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
        enum: ['football', 'basketball', 'read'],
        required: true
    },
    city: {
        type: String,
        required: true
    },
    height: {
        type: Number,
        min: 140,
        max: 250,
        required: true
    },
    birth_date: {
        type: new mongoose.Schema({
            day: { type: Number, min: 1, max: 31, required: true },
            month: { type: Number, min: 1, max: 12, required: true },
            year: { type: Number, required: true },
        }, { _id : false }),
        validate: [{
            validator: (value) => !moment(value, 'YYYY-M-D', true).isValid(),
            msg: 'birth_date is not valid date'
        }, {
            validator: ({ day, month, year }) => Math.abs(new Date(Date.now() - new Date(year, month-1, day).getTime()).getUTCFullYear() - 1970) > 18,
            msg: 'birth_date is less then 18 years'
        }],
        required: true
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
        enum: ['have', "hwas_live_away", 'none']
    },
    physique: {
        type: String,
        enum: ['over_weight', 'medium', 'shapely', 'skinny']
    }
})

profileSchema.pre('findOneAndUpdate', function(next, docs) {
    if (this._update.$set && this._update.$set.birth_date)
        return this.model.findOneAndUpdate(this._conditions, { zodiac: zodiac.getSignByDate(this._update.$set.birth_date).name })
    else next()
})

profileSchema.pre('save', function(next, docs) {
    this.zodiac = zodiac.getSignByDate(this.birth_date).name
    next()
})

module.exports = mongoose.model('Profile', profileSchema);