const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const authenticator = require('../utils/authenticator.js')
const Boss = require("../dbModels/bossModel.js");
const youTubeSearchAPI = require("youtube-search-api");
const get_youtube_transcript = require("../utils/youTubeTranscripts.js");
const get_gpt_summary = require("../utils/gptSummarizer.js");
const Game = require("../dbModels/gameModel.js");
const lodash = require('lodash');
const s3_image_uploader = require("../utils/s3ImageUploader");
const e = require("express");
const SiteMetaData = require("../dbModels/siteMetaDataModel");

// GET ALL BOSSES for game
router.get("/", async (req, res) => {
    const {game_id} = req.query;
    const bosses = await Boss.find({game_id: game_id})
    console.log(bosses)
    res.status(200).json(bosses)
})

// GET LATEST ADDED BOSSES
router.get('/latest/', async (req, res) => {
    // get a rough estimate of page views

    let siteMetaData = await SiteMetaData.findOne({})

    if (process.env.ENVIRONMENT !== "development") {
        siteMetaData.pageLoadCount++
        await siteMetaData.save()
    }

    let latestBosses = []
    const bosses = await Boss.find({}).populate('game_id').sort({updated_at: -1})
    const slicedBosses = bosses.slice(0, 5)
    slicedBosses.forEach((boss) => {
        const bossJSON = boss.toJSON()
        bossJSON.game_icon_url = boss.game_id.image_url
        latestBosses.push(bossJSON)
    })
    res.status(200).json({bosses: latestBosses, pageLoadCount: siteMetaData ? siteMetaData.pageLoadCount : null})
})

// Migrate DB with new field
// router.use(authenticator).post('/migrate/', async (req, res) => {
//     try {
//         await Boss.updateMany(
//             {updated_at: {$exists: true}},
//             {$set: {updated_at: null}}
//         )
//     }
//     catch (error) {
//         res.status(500).json({error: error})
//     }
//
//     console.log('All existing documents updated!');
//     res.status(200).json({message: "All existing documents updated!"})
// })

// GET BOSS DETAILS
router.get("/:id/", async (req, res) => {
    const boss_id = req.params.id
    if (!boss_id) {
        return res.status(404).json({message: `Boss ID required.`})
    }
    const boss = await Boss.findOne({_id: boss_id})
    if (!boss) {
        return res.status(404).json({message: `No boss with ID: ${boss_id} found.`})
    }
    res.status(200).json(boss)
})

// ADD BOSS
router.use(authenticator).post("/", upload.single("image"), async (req, res) => {
    try {
        const bossData = JSON.parse(req.body.data);
        const game = await Game.findOne({_id: bossData.game_id})
        if (!game || game.length < 1) {
            return res.status(400).json({error: `Game ID: ${bossData.game_id} does not exist.`})
        }
        if (!game.boss_types.includes(bossData.boss_type)) {
            return res.status(400).json({error: `Boss type: ${bossData.boss_type} not configured for game.`})
        }
        const difficultiesForBossType = game.difficulties.get(bossData.boss_type)

        if (!difficultiesForBossType) {
            return res.status(400).json({error: `No difficulties found for boss type: ${bossData.boss_type}`})
        }
        // get image and save to s3.
        const imageFile = req.file;
        bossData.image_url = await s3_image_uploader(imageFile)
        bossData.strategies = []
        bossData.boss_name_slug = lodash.kebabCase(bossData.display_name)
        for (const difficulty of difficultiesForBossType) {
            let strategySchema = {
                difficulty: difficulty,

            }
            bossData.strategies.push(strategySchema)
        }
        const boss = new Boss(bossData)
        await boss.save()

        res.status(200).json({boss: boss})
    } catch (error) {
        if (error.errorResponse?.code === 11000) {
            return res.status(400).json({error: "This boss already exists."});
        }
        res.status(400).json({message: error})
    }
})

// GET YOUTUBES
router.use(authenticator).post("/:id/update_video_references", async (req, res) => {
    try {
        const boss_id = req.params.id
        const boss = await Boss.findOne({_id: boss_id})
        if (!boss) {
            return res.status(404).json({message: `No boss with ID: ${boss_id} found.`})
        }
        let strategies = boss.get("strategies")

        for (let strategy of strategies) {
            const videos = await youTubeSearchAPI.GetListByKeyword(`${boss.display_name} ${strategy.difficulty}`)
            const max_video_count = 10
            let current_count = 0
            var BreakException = {};
            try {
                videos.items.forEach((item) => {
                    current_count += 1;
                    let videoDetails = {
                        video_id: item.id,
                        author_name: item.channelTitle,
                        video_title: item.title,
                        video_thumbnail_image_url: item.thumbnail?.thumbnails[0]?.url || "",
                        video_url: `https://www.youtube.com/watch?v=${item.id}`,
                    }
                    strategy.contributing_videos.push(videoDetails)
                    if (current_count === max_video_count) {
                        throw BreakException;
                    }
                })
            } catch (error) {
                if (error !== BreakException) throw error;
            }
        }


        await boss.save()
        res.status(200).json(boss)
    } catch (error) {
        res.status(400).json({message: error})
    }
})

// TOGGLE VIDEO.
router.use(authenticator).post("/:boss_id/:strategy_id/:video_id/toggle_video", async (req, res) => {
    // The idea here is that we'll pull all the videos and display them.
    // then allow the admin to disable certain ones before running the summary program.
    try {
        const boss_id = req.params.boss_id
        const strategy_id = req.params.strategy_id
        const video_id = req.params.video_id

        const boss = await Boss.findOne({_id: boss_id})
        if (!boss) {
            return res.status(404).json({message: `No boss with ID: ${boss_id} found.`})
        }
        const strategy = boss.strategies.find((strategy) => {
            return strategy.id === strategy_id
        })

        const video = strategy.contributing_videos.find((video) => {
            return video.video_id === video_id
        })

        if (!video) {
            return res.status(404).json({message: `No video with ID: ${video_id} found for boss ID: ${boss_id}.`})
        }
        video.do_not_use = !video.do_not_use
        await boss.save()
        res.status(200).json(boss)
    } catch (error) {
        res.status(400).json({message: error})
    }
})

// GET GPT-WHISPER TRANSCRIPTS
router.use(authenticator).post('/:boss_id/:strategy_id/trigger_set_transcripts/', async (req, res) => {

    const boss_id = req.params.boss_id
    const strategy_id = req.params.strategy_id
    const boss = await Boss.findOne({_id: boss_id})
    if (!boss) {
        return res.status(400).json({message: `Boss ID: ${boss_id} not found.`})
    }
    const strategy = boss.strategies.find((strategy) => {
        return strategy.id === strategy_id
    })
    if (!strategy) {
        return res.status(400).json({message: `Strategy ID: ${strategy_id} not found for Boss ID: ${boss_id}`})
    }

    const videos = strategy.contributing_videos
    if (!videos || videos.length === 0) {
        return res.status(400).json({message: `Boss ID: ${boss_id} | Strategy ID: ${strategy_id} has no videos. Try update_video_references first.`})
    }

    // TODO - REVISIT THIS SHIT LATER. MAY WANT TO BUILD AN API TO TRIGGER PER VIDEO.
    const delayTime = 60000
    for (const video of videos) {
        // ignore the video if set to DO_NOT_USE
        if (video.do_not_use) {
            continue
        }
        const startTime = new Date().getTime();
        console.log(new Date())
        console.log(`Triggering get transcript for: ${video.video_id}`)
        const youTubeURL = video.video_url
        try {
            const response = await get_youtube_transcript(youTubeURL)
            // handle an error on OPEN AI's end.
            if (response.errorMessage) {
                console.log(response.errorMessage)
                video.transcript_succeeded = false
            } else {
                // save transcript
                video.video_transcript = response.body.transcript
                video.transcript_succeeded = true
            }
        } catch (error) {
            video.transcript_succeeded = false
            console.log(`FUCK, WHAT HAPPENED: ${error}`)
        }
        await video.save({suppressWarning: true})
        const endTime = new Date().getTime();
        const runningTime = endTime - startTime
        if (runningTime <= delayTime) {
            await new Promise((resolve) => setTimeout(resolve, delayTime - runningTime))
        }
    }

    await boss.save()

    res.status(200).json(boss)
})

// GET SUMMARY
router.use(authenticator).post('/:boss_id/:strategy_id/trigger_set_summary/', async (req, res) => {
    const boss_id = req.params.boss_id;
    const strategy_id = req.params.strategy_id;
    const boss = await Boss.findOne({_id: boss_id})
    if (!boss) {
        return res.status(400).json({message: `Boss ID: ${boss_id} not found.`})
    }
    const strategy = boss.strategies.find((strategy) => {
        return strategy.id === strategy_id
    })
    if (!strategy) {
        return res.status(400).json({message: `Strategy ID: ${strategy_id} not found for Boss ID: ${boss_id}`})
    }

    const contributing_videos = strategy.get("contributing_videos")

    let payload = {
        "boss": boss.display_name,
        "difficulty": strategy.difficulty,
        "transcripts": []
    }
    for (const video_details of contributing_videos) {
        if (video_details.do_not_use) {
            continue
        }
        let transcript = {
            title: video_details.video_title,
            transcript: video_details.video_transcript
        }
        payload.transcripts.push(transcript)
    }

    try {
        const response = await get_gpt_summary(payload)

        strategy.strategy_summary = response.body.summary
        strategy.strategy_summary_date = new Date()
        boss.updated_at = new Date().toISOString()
        await boss.save()
        return res.status(200).json({boss: boss})

    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
})

module.exports = router;