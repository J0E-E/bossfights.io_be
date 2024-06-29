const {uuid} = require("uuidv4");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
})

/**
 *  S3 Image uploader.
 * @param image_file - image file extracted from multer
 * @returns {Promise<string|null>} - Returns URL string to s3 location
 */
const s3_image_uploader = async (image_file) => {
    if (!image_file) {
        return null
    }
    const fileName = `${uuid()}-${image_file.originalname}`

    const s3Params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: image_file.buffer,
        ContentType: image_file.mimetype,
    };

    const data = await s3.upload(s3Params).promise();
    return data.Location.toString();
}

module.exports = s3_image_uploader;