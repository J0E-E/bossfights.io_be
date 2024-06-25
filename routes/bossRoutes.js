const express = require("express");
const router = express.Router();
const multer = require("multer");
const AWS = require('aws-sdk');
const upload = multer();
const authenticator = require('../utils/authenticator.js')
const difficultiesSchemaValidator = require('../utils/difficultiesSchemaValidator.js')
const bossTypesSchemaValidator = require('../utils/bossTypesSchemaValidator.js')
const Game = require('../dbModels/gameModel.js')
const { uuid } = require('uuidv4');
const Boss = require("../dbModels/bossModel");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
})

// GET ALL BOSSES for game
router.use(authenticator).get("/", async (req, res) => {
    const {gameID} = req.query;
    res.status(200).json({message: `Looks like we made it. Game ID: ${gameID}`})
})

// GET BOSS DETAILS
router.use(authenticator).get("/:id/", async (req, res) => {
    const bossID = req.params.id
    res.status(200).json({message: `Looks like we made it. Boss ID: ${bossID}`})
})

// ADD BOSS
router.use(authenticator).post("/", upload.single("image"), async (req, res) => {
    try{
        const bossData = JSON.parse(req.body.data);
        const boss = new Boss(bossData)
        await boss.save()
        res.status(200).json(boss)
    }
    catch (error) {
        res.status(400).json({message: error})
    }
})

module.exports = router;