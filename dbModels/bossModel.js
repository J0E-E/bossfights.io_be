const mongoose = require('mongoose')
const Game = require("./gameModel");

const contributingVideoSchema = new mongoose.Schema({
    author_name: {
        type: String,
        required: [true, "Author name required."]
    },
    video_title: {
        type: String,
        required: [true, "Video title required"]
    },
    video_url: {
        type: String,
        required: [true, "Video URL required."]
    },
    video_transcript: {
        type: String,
        required: [true, "Video transcript required."]
    }
})

const strategySchema = new mongoose.Schema({
    strategy_summary: {
        type: String,
        required: [true, "Strategy required"]
    },
    strategy_summary_date: {
        type: Date,
        required: [true, "Strategy date required."]
    },
})

// define the user schema for mongoDB
const bossSchema = new mongoose.Schema({
    boss_name_slug: {
        type: String,
        unique: true,
        required: [true, "Game name slug required."]
    },
    display_name: {
        type: String,
        required: [true, "Display name required."]
    },
    display_name_short: {
        type: String,
        required: [true, "Image required."]
    },
    contributing_videos: {
        type: [contributingVideoSchema],
        default: []
    },
    strategy: {
        type: strategySchema,
    },
    game_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: [true, "GameID required."],
        validate: {
            validator: async (game_id) =>{
                const gameExists = await Game.findById(game_id);
                return gameExists !== null;
            },
            message: "Invalid game ID."
        }
    }
})

// bossSchema.pre('save', async (next) => {
//     const boss = this;
//     try {
//         const gameExists = await Game.findById(boss.game_id);
//         if (!gameExists) {
//             throw new Error("Invalid game ID.")
//         }
//         next();
//     }
//     catch (error) {
//         next(error)
//     }
// })

const Boss = mongoose.model('Boss', bossSchema);

module.exports = Boss;