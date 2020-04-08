const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Task = require('../models/task')

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        trim: true,
        required: true
    },
    age:{
        type: Number,
        default: 0, 
        validate(value){
            if(value < 0){
                throw new Error("Age must be a positive number")
            }
        }
    },
    email:{
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        required: true,
        validate(value){
            if (!validator.isEmail(value)){
                throw new Error("Email is invalid")
            }
        }
    },
    password:{
        type: String,
        required: true,
        minlength: 6,
        trim: true,
        validate(value){
            if (value.toLowerCase().includes("password")) {
                throw new Error("Password cannot contain 'password'")
            } 
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, { timestamps: true })


userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.toJSON = function () {    // toJSON is called whenever a JSON.stringify is called 
    const user = this 
    const userObject = user.toObject()       

    delete userObject.tokens
    delete userObject.password
    delete userObject.avatar

    return userObject
}

//Instance method on user instance
userSchema.methods.generateAuthToken = async function(){
    const user = this
    const token = jwt.sign({ _id:user._id.toString() }, process.env.JWT_SECRET)
    
    user.tokens = user.tokens.concat({ token })
    await user.save()   
    
    return token
}

//Static method on User collection to find
userSchema.statics.findByCredentials = async (email, password) => {
    
    const user = await User.findOne({ email })

    if (!user) {
        throw new Error('Unable to login')
    }
    
    const isMatch = await bcrypt.compare(password, user.password)
         
    if(!isMatch) {
        throw new Error("Unable to login")
    }

    return user
}

//Hash the plain text password
userSchema.pre('save',async function (next) {
    const user = this 
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }
    next()
})

userSchema.pre('remove', async function (next) {
    const user = this
    await Task.deleteMany({ owner: user._id })
    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User