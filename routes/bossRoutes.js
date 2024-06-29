const express = require("express");
const router = express.Router();
const multer = require("multer");
const AWS = require('aws-sdk');
const upload = multer();
const authenticator = require('../utils/authenticator.js')
const {uuid} = require('uuidv4');
const Boss = require("../dbModels/bossModel.js");
const youTubeSearchAPI = require("youtube-search-api");
const get_youtube_transcript = require("../utils/youTubeTranscripts.js");
const get_gpt_summary = require("../utils/gptSummarizer.js");
const Game = require("../dbModels/gameModel.js");
const lodash = require('lodash');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
})

// GET ALL BOSSES for game
router.use(authenticator).get("/", async (req, res) => {
    const {game_id} = req.query;
    const bosses = await Boss.find({game_id: game_id})
    console.log(bosses)
    res.status(200).json(bosses)
})

// GET BOSS DETAILS
router.use(authenticator).get("/:id/", async (req, res) => {
    const boss_id = req.params.id
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

        if (!difficultiesForBossType.includes(bossData.difficulty)) {
            return res.status(400).json({error: `Boss difficulty: ${bossData.difficulty} not configured for game.`})
        }

        bossData.boss_name_slug = lodash.kebabCase(bossData.display_name + " " + bossData.difficulty)

        const imageFile = req.file;
        if (!imageFile) {
            return res.status(400).json({error: "Image required."})
        }
        const fileName = `${uuid()}-${imageFile.originalname}`
        const s3Params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: imageFile.buffer,
            ContentType: imageFile.mimetype,
        };

        const data = await s3.upload(s3Params).promise();
        bossData.image_url = data.Location.toString();
        const boss = new Boss(bossData)
        await boss.save()
        res.status(200).json(boss)
    } catch (error) {
        if (error.errorResponse?.code === 11000) {
            return res.status(400).json({error: "This boss already exists."});
        }
        res.status(400).json({message: error})
    }
})

// fetch video links from YouTube
router.use(authenticator).post("/:id/update_video_references", async (req, res) => {
    try {
        const boss_id = req.params.id
        const boss = await Boss.findOne({_id: boss_id})
        if (!boss) {
            return res.status(404).json({message: `No boss with ID: ${boss_id} found.`})
        }
        boss.contributing_videos = [];
        // TODO = update this to build boss name and difficulty.
        const videos = await youTubeSearchAPI.GetListByKeyword(`${boss.display_name} ${boss.difficulty}`)
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
                boss.contributing_videos.push(videoDetails)
                if (current_count === max_video_count) {
                    throw BreakException;
                }
            })
        }
        catch (error) {
            if (error !== BreakException) throw error;
        }

        await boss.save()
        res.status(200).json(boss)
    } catch (error) {
        res.status(400).json({message: error})
    }
})

// toggle a specific video for use. The idea here is that we'll pull all the videos and display them.
// then allow the admin to disable certain ones before running the summary program.
router.use(authenticator).post("/:boss_id/toggle_video/:video_id/", async (req, res) => {
    try {
        const boss_id = req.params.boss_id
        const video_id = req.params.video_id
        const boss = await Boss.findOne({_id: boss_id})
        if (!boss) {
            return res.status(404).json({message: `No boss with ID: ${boss_id} found.`})
        }
        const video = boss.contributing_videos.find((video) => {
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

router.use(authenticator).post('/:boss_id/trigger_set_transcripts/', async (req, res) => {

    const boss_id = req.params.boss_id
    const boss = await Boss.findOne({_id: boss_id})
    if (!boss) {
        return res.status(400).json({message: `Boss ID: ${boss_id} not found.`})
    }
    const videos = boss.contributing_videos
    if (!videos || videos.length === 0) {
        return res.status(400).json({message: `Boss ID: ${boss_id} has no videos. Try update_video_references first.`})
    }

    // TODO - REVISIT THIS SHIT LATER. MAY WANT TO BUILD AN API TO TRIGGER PER VIDEO.
    const delayTime = 25000
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
                console.log(response.errorMesage)
                video.transcript_succeeded = false
                const endTime = new Date().getTime();
                const runningTime = endTime - startTime
                if (runningTime <= delayTime) {
                    await new Promise((resolve) => setTimeout(resolve, delayTime - runningTime))
                }
                return res.status(500).json(JSON.parse(response.errorMessage))
            }
            // save transcript
            video.video_transcript = response.body.transcript
            video.transcript_succeeded = true
            await video.save({suppressWarning: true})
        } catch (error) {
            console.log(`FUCK, WHAT HAPPENED: ${error}`)
        }
        const endTime = new Date().getTime();
        const runningTime = endTime - startTime
        if (runningTime <= delayTime) {
            await new Promise((resolve) => setTimeout(resolve, delayTime - runningTime))
        }
    }

    await boss.save()

    res.status(200).json(boss)
})

router.use(authenticator).post('/:boss_id/trigger_set_summary/', async (req, res) => {
    const boss_id = req.params.boss_id;
    const boss = await Boss.findOne({_id: boss_id})
    const contributing_videos = boss.get("contributing_videos")
    let payload = {
        "boss": boss.display_name,
        "difficulty": boss.difficulty,
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
        console.log(payload)
        const response = await get_gpt_summary(payload)
        boss.strategy = {
            strategy_summary: response.body.summary,
            strategy_summary_date: new Date()
        }
        await boss.save()
        return res.status(200).json({boss: boss})
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
})


module.exports = router;