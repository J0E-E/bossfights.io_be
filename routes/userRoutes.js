const express = require('express');
const bcrypt = require('bcrypt')
const router = express.Router();
const User = require('../dbModels/userModel.js')
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // data validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Username, email, and password are required." });
        }
        // create password hash
        hashPassword = bcrypt.hashSync(req.body.password, 10);
        // create user model object
        const newUser = new User({
            userName: username,
            email: email,
            hashPassword: hashPassword
        })
        // save to DB.
        await newUser.save()
        const newUserJSON = newUser.toJSON()
        delete newUserJSON.hashPassword
        return res.status(200).json(newUserJSON)
    }
    catch (error) {
        switch (error.errorResponse.code) {
            case 11000:
                console.log(`express: User already exists.`)
                return res.status(400).json({message: "User already exists."})
            default:
                console.log(`express: something went wrong with /user/register route: ${error}`)
                return res.status(500).json({message: "Something went wrong."})
        }

    }

})

router.post('/login', async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({message: "Email and Password required." })
    }
    const user = await User.findOne({
        email: req.body.email
    })
    if (!user || !user.comparePassword(password)) {
       return res.status(400).json({message: 'Authentication failed. Invalid user or password.'})
    }
    return res.json({ token: jwt.sign({ email: user.email, fullName: user.fullName, _id: user._id }, 'RESTFULAPIs') });
})

module.exports = router;