const mongoose = require('mongoose')
const validator = require('validator')

var userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: false,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: (value) => {
          return validator.isEmail(value)
        }
    },
    password: {
      type: String,
      required: true,
    },
    mobile: {
        type: String,
        required: true,
        unique: true,
        validate: (value) => {
          return validator.isMobilePhone(value)
        }
    },
    birth_date: {
      day: { type: Number, min: 1, max: 31, required: true },
      month: { type: Number, min: 1, max: 12, required: true },
      year: { type: Number, required: true }
    },
    gender: {
      enum: ['male', 'female']
    }
});

module.exports = mongoose.model('User', userSchema);