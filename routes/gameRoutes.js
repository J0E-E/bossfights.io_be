const express = require("express");
const router = express.Router();
const authenticator = require('../utils/authenticator.js')
const Game = require('../dbModels/gameModel.js')

router.use(authenticator).get("/", async (req, res) => {
    const games = await Game.find({})
        .catch((error) => {
            console.log("FUCK!")
            res.status(500).json({message: "FUCK!"})
        })
    res.status(200).json(games)
})

router.use(authenticator).post("/", async (req, res) => {
    try {
        const game = new Game(req.body)
        await game.save();
        res.status(201).json(game);
    }
    catch (error) {
        if (error.errorResponse.code === 11000) {
            return res.status(400).json({ error: "This game already exists." });
        }
        res.status(400).json({ error: error.message });
    }
})

router.use(authenticator).post("/:id/difficulties/", async (req, res) => {
    try {
        const { difficulties } = req.body
        if (!difficulties || !Array.isArray(difficulties)) {
            res.status(400).json({message: "Difficulties required, and required in format ['difficulty_name', ...]."})
        }
        res.status(200).
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
})

module.exports = router;