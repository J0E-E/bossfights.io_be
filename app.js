const express = require('express')
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./dbModels/userModel.js");
const userRoutes = require('./routes/userRoutes.js')
const normalizeKeysMiddleware = require('./utils/nomalizeRequestKeys.js')
const jwtMiddleware = require('./utils/jwtMiddleware.js')


async function main() {
    // connect to MongoDB Atlas.
    console.log('mongoDB: Connecting.')
    await mongoose.connect(process.env.MONGODB_URL)
    console.log('mongoDB: Connection successful')

    const app = express()
    const port = process.env.PORT || 3000

    // MIDDLEWARE
    app.use(express.json());
    app.use(jwtMiddleware);
    app.use(normalizeKeysMiddleware) // this uses parsed JSON in req.body to normalise. Must go after .json()

    // API ROUTES.
    app.use('/api/user', userRoutes)

    app.listen(port, () => {
        console.log(`express: BossFights.io backend express app is now listening on port ${port}`)
    })
}

main().catch((error) => {
    console.log(`Something went wrong: ${error}`)
})