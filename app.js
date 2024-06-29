const express = require('express')
const mongoose = require("mongoose");
const cors = require('cors');

const userRoutes = require('./routes/userRoutes.js')
const gameRoutes = require('./routes/gameRoutes.js')
const bossRoutes = require('./routes/bossRoutes.js')

const normalizeKeysMiddleware = require('./utils/nomalizeRequestKeys.js')
const jwtMiddleware = require('./utils/jwtMiddleware.js')
const bodyParser = require("body-parser");


async function main() {
    // connect to MongoDB Atlas.
    console.log('mongoDB: Connecting.')
    await mongoose.connect(process.env.MONGODB_URL)
    console.log('mongoDB: Connection successful')

    const app = express()
    const port = process.env.PORT || 3000

    // MIDDLEWARE
    app.use(cors())
    app.use(bodyParser.json());
    app.use(jwtMiddleware);
    app.use(normalizeKeysMiddleware) // this uses parsed JSON in req.body to normalise. Must go after .json()

    // API ROUTES.
    app.use('/api/user', userRoutes)
    app.use('/api/game', gameRoutes)
    app.use('/api/boss', bossRoutes)

    app.listen(port, () => {
        console.log(`express: BossFights.io backend express app is now listening on port ${port}`)
    })
}

main().catch((error) => {
    console.log(`Something went wrong: ${error}`)
})