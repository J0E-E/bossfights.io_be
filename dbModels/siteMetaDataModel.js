const mongoose = require('mongoose')

// define the siteMetaData schema for mongoDB
const siteMetaDataSchema = new mongoose.Schema({
    pageLoadCount: {
        type: Number,
        default: 0
    }
})

const SiteMetaData = mongoose.model('SiteMetaData', siteMetaDataSchema);

module.exports = SiteMetaData;