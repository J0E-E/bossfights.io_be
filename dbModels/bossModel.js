const mongoose = require('mongoose')
const Game = require("./gameModel");

const contributingVideoSchema = new mongoose.Schema({
    video_id: {
        type: String,
        required: [true, "Video Id Required."],
        unique: true
    },
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
    },
    video_thumbnail_image_url: {
        type: String,
        required: [true, "Video thumbnail required."]
    },
    do_not_use: {
        type: Boolean,
        required: true,
        default: false,
    },
    transcript_succeeded: {
        type: Boolean,
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
        required: [true, "Short display name required."]
    },
    boss_type: {
        type: String,
        required: [true, "Boss type required."]
    },
    difficulty: {
        type: String,
        required: [true, "Difficulty required."]
    },
    contributing_videos: {
        type: [contributingVideoSchema],
        default: []
    },
    strategy: {
        type: strategySchema,
    },
    image_url: {
        type: String,
        required: [true, "Image required."]
    },
    game_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: [true, "GameID required."],
        validate: {
            validator: async (game_id) => {
                const gameExists = await Game.findById(game_id);
                return gameExists !== null;
            },
            message: "Invalid game ID."
        }
    }
})

const Boss = mongoose.model('Boss', bossSchema);

module.exports = Boss;