const express = require("express");
const router = express.Router();
const multer = require("multer");
const AWS = require('aws-sdk');
const upload = multer();
const authenticator = require('../utils/authenticator.js')
const {uuid} = require('uuidv4');
const Boss = require("../dbModels/bossModel");
const youTubeSearchAPI = require("youtube-search-api");

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
        const imageFile = req.file;
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
        const videos = await youTubeSearchAPI.GetListByKeyword("fyrakk normal heroic")
        videos.items.forEach((item) => {
            let videoDetails = {
                video_id: item.id,
                author_name: item.channelTitle,
                video_title: item.title,
                video_thumbnail_image_url: item.thumbnail?.thumbnails[0]?.url || "",
                video_url: `https://www.youtube.com/watch?v=${item.id}`,
            }
            boss.contributing_videos.push(videoDetails)
        })
        await boss.save()
        res.status(200).json(boss)
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(400).json({message: error})
    }
})

module.exports = router;