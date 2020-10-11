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
    access_token: {
      type: String,
      default: ''
    },
    refresh_token: {
      type: String,
      default: ''
    },
    mobile: {
        type: String,
        required: true,
        unique: true,
        validate: (value) => {
          return validator.isMobilePhone(value)
        }
    },
    is_mobile_verified: {
      type: Boolean,
      required: true,
      default: false
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      unique: true
    },
    preference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Preference',
      unique: true
    }
});

module.exports = mongoose.model('User', userSchema);