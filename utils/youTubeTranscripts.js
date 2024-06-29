var AWS = require('aws-sdk');

AWS.config.update({
    accessKeyId: process.env.AWS_LAMBDA_ACCESS_KEY,
    secretAccessKey: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY
});
const lambda = new AWS.Lambda();


const get_youtube_transcript = (url) => {
    return new Promise((resolve, reject) => {
        const params = {
            FunctionName: 'youtube-transcriber',
            Payload: JSON.stringify({
                "url": url
            })
        };

        lambda.invoke(params, function (error, data) {
            if (error) {
                console.log("Something went wrong gathering the video transcript.")
                reject(error);
            } else {
                resolve(JSON.parse(data.Payload))
            }
        });
    })
}

module.exports = get_youtube_transcript;
