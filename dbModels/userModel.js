const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// define the user schema for mongoDB
const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        trim: true,
        required: [true, 'Username is required'],
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        required: [true, 'Email is required'],
    },
    hashPassword: {
        type: String,
        required: [true, 'Password is required']
    },
    created: {
        type: Date,
        default: Date.now
    }
})

userSchema.methods.comparePassword = function(password) {
    return bcrypt.compareSync(password, this.hashPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;