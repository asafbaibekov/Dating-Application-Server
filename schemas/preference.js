const mongoose = require('mongoose')
const zodiac = require('zodiac-signs')('en-US')

var preferenceSchema = new mongoose.Schema({
    gender: {
        type: [String],
        enum: ['male', 'female'],
        required: true
    },
    min_age: {
        type: Number,
        min: 18,
        max: 80,
        required: true
    },
    max_age: {
        type: Number,
        min: 18,
        max: 80,
        required: true
    },
    min_height: {
        type: Number,
        min: 140,
        max: 250,
        default: 140,
        required: true
    },
    max_height: {
        type: Number,
        min: 140,
        max: 250,
        default: 250,
        required: true
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
        enum: zodiac.getNames('en'),
        required: true
    },
    interests: {
        type: [String],
        enum: ["Sport", "Computers", "Walk", "Horses", "Dances", "Food", "Books", "Theater", "Army", "Racing", "Series", "Sushi", "Flowers", "Fishing", "Football", "Basketball", "Baking", "Dating", "Sauna", "Sea", "Foreign countries", "Calm", "Roleplay", "Excitements", "Friends", "Computer games", "Pizza", "Shopping", "Nature", "Sense of humor", "Kissing", "Photography", "Massage", "Green tea", "Animals", "Ice cream", "Dogs", "Cats", "Horses"],
        required: true
    },
    alcohol: {
        type: [String],
        enum: ['all_times', 'part_times', 'no_times'],
        required: true
    },
    children: {
        type: [String],
        enum: ['have', "have_live_away", 'none'],
        required: true
    },
    physique: {
        type: [String],
        enum: ['over_weight', 'medium', 'shapely', 'skinny'],
        required: true
    },
    smokes: {
        type: [String],
        enum: ['all_times', 'part_times', 'no_times'],
        required: true
    }
});

preferenceSchema.pre('save', function(next) {
    if (this.min_age > this.max_age) {
        let age_error = new mongoose.Error.ValidationError()
        age_error.message = `min_age (${this.min_age}) has to be lower than or equal to max_age (${this.max_age})`
        next(age_error)
    } else if (this.min_height > this.max_height) {
        let height_error = new mongoose.Error.ValidationError()
        height_error.message = `min_height (${this.min_height}) has to be lower than or equal to max_height (${this.max_height})`
        next(height_error)
    } else next()
})

preferenceSchema.pre('findOneAndUpdate', function(next) {
    if (this._update.$set == undefined) next()
    let min_age = this._update.$set.min_age
    let max_age = this._update.$set.max_age
    if (!min_age && !max_age) { next(); return; }
    else if (min_age && max_age) {
        if (min_age <= max_age) { next(); return; }
        let age_error = new mongoose.Error.ValidationError()
        age_error.message = `min_age (${min_age}) has to be lower than or equal to max_age (${max_age})`
        next(age_error)
        return;
    }
    this.model.findOne(this._conditions)
        .then(preference => {
            let age_error = new mongoose.Error.ValidationError()
            if (min_age && min_age > preference.max_age) {
                age_error.message = `min_age (${min_age}) has to be lower than or equal to max_age (${preference.max_age})`
                next(age_error)
            } else if (max_age && preference.min_age > max_age) {
                age_error.message = `min_age (${preference.min_age}) has to be lower than or equal to max_age (${max_age})`
                next(age_error)
            } else {
                next()
            }
        })
        .catch(next)
})

preferenceSchema.pre('findOneAndUpdate', function(next) {
    if (this._update.$set == undefined) { next() }
    let min_height = this._update.$set.min_height
    let max_height = this._update.$set.max_height
    if (!min_height && !max_height) { next(); return; }
    else if (min_height && max_height) {
        if (min_height <= max_height) { next(); return; }
        let height_error = new mongoose.Error.ValidationError()
        height_error.message = `min_height (${min_height}) has to be lower than or equal to max_height (${max_height})`
        next(height_error)
        return;
    }
    this.model.findOne(this._conditions)
        .then(preference => {
            let height_error = new mongoose.Error.ValidationError()
            if (min_height && min_height > preference.max_height) {
                height_error.message = `min_height (${min_height}) has to be lower than or equal to max_height (${preference.max_height})`
                next(height_error)
            } else if (max_height && preference.min_height > max_height) {
                height_error.message = `min_height (${preference.min_height}) has to be lower than or equal to max_height (${max_height})`
                next(height_error)
            } else {
                next()
            }
        })
        .catch(next)
})

module.exports = mongoose.model('Preference', preferenceSchema);