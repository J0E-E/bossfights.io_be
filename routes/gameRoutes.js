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

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
})

// GET ALL GAMES
router.use(authenticator).get("/", async (req, res) => {
    const games = await Game.find({})
        .catch((error) => {
            console.log("FUCK!")
            res.status(500).json({message: "FUCK!"})
        })
    if (req.query.list.toLowerCase() === "true") {
        let gamesList = []
        games.forEach((game) => {
            // just list the game slug, display name, and id. This is for the FE to display.
            gamesList.push({
                game_name_slug: game.game_name_slug,
                display_name: game.display_name,
                image_url: game.image_url,
                id: game.id
            })
        })
        return res.status(200).json(gamesList)
    }
    res.status(200).json(games)
})

// GET GAME BY ID
router.use(authenticator).get("/:id/", async (req, res) => {
    const game = await Game.findOne({_id: req.params.id})
        .catch((error) => {
            console.log("FUCK!")
            res.status(500).json({message: "FUCK!"})
        })
    if (!game) {
        return res.status(404).json({message: "Game not found."})
    }
    res.status(200).json(game)
})

// CREATE A GAME
router.use(authenticator).post("/", upload.single("image"), async (req, res) => {
    try {
        const gameData = JSON.parse(req.body.data);
        const game = new Game(gameData);
        const imageFile = req.file;
        const fileName = `${uuid()}-${imageFile.originalname}`
        const s3Params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: imageFile.buffer,
            ContentType: imageFile.mimetype,
        };
        const data = await s3.upload(s3Params).promise();
        game.image_url = data.Location.toString();

        await game.save();
        res.status(201).json(game);
    } catch (error) {
        if (error.errorResponse?.code === 11000) {
            return res.status(400).json({error: "This game already exists."});
        }
        res.status(400).json({error: error.message});
    }
})

// UPDATE DIFFICULTIES
router.use(authenticator).put("/:id/difficulties/", async (req, res) => {
    try {
        const {error} = difficultiesSchemaValidator.validate(req.body);
        if (error) {
            return res.status(400).json({error: error.details[0].message});
        }
        const {difficulties} = req.body
        const game = await Game.findOne({_id: req.params.id})
        if (!game) {
            return res.status(404).json({message: `GameID:${req.params.id} not found.`})
        }
        // Update the difficulties
        game.difficulties = difficulties;
        await game.save();
        res.status(200).json({game: game})
    } catch (error) {
        res.status(400).json({error: error.message});
    }
})

// UPDATE BOSS TYPES
router.use(authenticator).put("/:id/boss_types/", async (req, res) => {
    try {
        const {error} = bossTypesSchemaValidator.validate(req.body);
        if (error) {
            return res.status(400).json({error: error.details[0].message});
        }
        const {boss_types} = req.body
        const game = await Game.findOne({_id: req.params.id})
        if (!game) {
            return res.status(404).json({message: `GameID:${req.params.id} not found.`})
        }
        // Update the difficulties
        game.boss_types = boss_types;
        await game.save();
        res.status(200).json({game: game})
    } catch (error) {
        res.status(400).json({error: error.message});
    }
})

module.exports = router;