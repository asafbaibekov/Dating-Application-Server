const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt');
const saltRounds = 10;

var userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: {
          validator: (value) => {
            return validator.isEmail(value)
          },
          message: 'email must be valid'
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
        validate: {
          validator: (value) => {
            return validator.isMobilePhone(value)
          },
          message: 'mobile must be valid'
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

userSchema.pre('save', function(next) {
  bcrypt.genSalt(saltRounds)
    .then(salt => bcrypt.hash(this.password, salt))
    .then(hashed => {
      this.password = hashed
      next()
    })
    .catch(next)
})

userSchema.methods.comparePassword = function(input) {
  return new Promise((resolve, reject) => {
    if (!bcrypt.compareSync(input, this.password)) {
      let error = new Error()
      error.name = 'NotAuthenticated'
      error.message = 'incorrect password'
      reject(error)
    } else resolve(this)
  })
}

userSchema.methods.isMobileVerified = function() {
  return new Promise((resolve, reject) => {
    if (this.is_mobile_verified === false) {
      let error = new Error()
      error.name = 'NotVerifiedPhoneNumber'
      error.message = 'phone is not verified yet'
      reject(error)
    } else resolve(this)
  })
}

module.exports = mongoose.model('User', userSchema);