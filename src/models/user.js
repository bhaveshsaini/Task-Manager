const mongoose = require ('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./task')

const userSchema = new mongoose.Schema({
	firstname: {
		type: String,
		required: true,
		trim: true,
	},

	lastname: {
		type: String,
		required: true,
		trim: true,
	},

	password: {
		type: String,
		// required: true,
		trim: true,
		validate(value)
		{
			if(value.includes('password'))
				throw new Error('Password cannot contain the word \'password\'')
		},

		validate(value)
		{
			if(value.length < 6)
				throw new Error('Password must be longer than 6 characters')
		}

	},

	email: {
		type: String,
		unique: true,
		required: true,
		trim: true,
		lowercase: true,
		validate(value)
		{
			if(!validator.isEmail(value))
				throw new Error('Email is invalid')
		}
	},

	age: {
		type: Number,
		default: null,
		validate(value)
		{
			if(value < 0)
			{
				throw new Error('Age must be a positive number')
			}
		}
	},

	token:{
			type: String
	},

	avatar: {
		type: String
	},

	avatarURL: {
		type: String,
		default: 'https://i.stack.imgur.com/34AD2.jpg'
	}

}, {
	timestamps: true
})

userSchema.virtual('tasks', {
	ref: 'Task',
	localField: '_id',
	foreignField: 'owner'
})

userSchema.methods.toJSON = function()
{
	const user = this
	const userObject = user.toObject()

	delete userObject.password
	delete userObject.tokens

	return userObject
}


userSchema.methods.generateAuthToken = async function()
{
	const user = this
	const token = jwt.sign({_id: user._id.toString()}, 'thisismynewcourse')
	user.token = token
	await user.save()
	
	// user.tokens = user.tokens.concat({token})
	// await user.save()

	// return token // dont need to send back token, since already sending back user info
}


userSchema.statics.findByCredentials = async ( email, password ) => {
	const user = await User.findOne({ email })

	if(!user)
		throw new Error('Not found')

	const isMatch = await bcrypt.compare(password, user.password)

	if(!isMatch)
		throw new Error('Unable to log in')

	return user
}

// Capitalize first letter of name before saving
userSchema.pre('save', async function(next){
	const user = this

	user.firstname = user.firstname.charAt(0).toUpperCase() + user.firstname.slice(1)
	user.lastname = user.lastname.charAt(0).toUpperCase() + user.lastname.slice(1)

    next()
})

// hash plain text password before saving
userSchema.pre('save', async function(next) {
	const user = this

	if(user.isModified('password'))
		user.password = await bcrypt.hash(user.password, 8)

	next()
})

userSchema.pre('remove', async function(next) {
	const user = this
	await Task.deleteMany({ owner: user._id })

	next()
})

const User = mongoose.model('User', userSchema)

module.exports = User