const mongoose = require('mongoose')
const zodiac = require('zodiac-signs')('en-US')

var preferenceSchema = new mongoose.Schema({
    min_age: {
        type: Number,
        min: 18,
        max: 80,
        required: true,
        validate: {
            validator: function(value) { return this.max_age >= value },
            message: 'min_age has to be lower than or equal to max_age'
        }
    },
    max_age: {
        type: Number,
        min: 18,
        max: 80,
        required: true,
        validate: {
            validator: function(value) { return this.min_age <= value },
            message: 'max_age has to be greater than or equal to min_age'
        }
    },
    distance: {
        type: Number,
        min: 0,
        max: 200,
        default: 200,
        required: true
    },
    zodiac: {
        type: [String],
        enum: zodiac.getNames('en')
    },
    min_height: {
        type: Number,
        min: 140,
        max: 250,
        default: 140,
        required: true,
        validate: {
            validator: function(value) { return this.max_height >= value },
            message: 'min_height has to be lower than or equal to max_height'
        }
    },
    max_height: {
        type: Number,
        min: 140,
        max: 250,
        default: 250,
        required: true,
        validate: {
            validator: function(value) { return this.min_height <= value },
            message: 'max_height has to be greater than or equal to min_height'
        }
    },
    interests: {
        type: [String],
        enum: ['football', 'basketball', 'read']
    },
    alcohol: {
        type: [String],
        enum: ['all_times', 'part_times', 'no_times']
    },
    children: {
        type: [String],
        enum: ['have', "hwas_live_away", 'none']
    },
    physique: {
        type: [String],
        enum: ['over_weight', 'medium', 'shapely', 'skinny']
    }
});

module.exports = mongoose.model('Preference', preferenceSchema);