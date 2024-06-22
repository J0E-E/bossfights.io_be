const mongoose = require('mongoose')

// define the user schema for mongoDB
const gameSchema = new mongoose.Schema({
    game_name_slug: {
        type: String,
        unique: true,
        required: [true, "Game name slug required."]
    },
    version_typing: {
        type: String,
        required: [true, "Version typing required."]
    },
    current_version: {
        type: String,
        required: [true, "Current version required."]
    },
    display_name: {
        type: String,
        required: [true, "Display name required."]
    },
    image_url: {
        type: String,
        required: [true, "Image required."]
    },
    abbreviation: {
        type: String,
        required: [true, "Abbreviation required."]
    },
    boss_types: {
        type: [String],
        required: [true, "Boss types list required."]
    },
    difficulties: {
        type: Map,
        of: [String],
        required: false
    }
})

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;