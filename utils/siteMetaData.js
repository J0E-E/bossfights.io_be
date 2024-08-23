const SiteMetaData = require("../dbModels/siteMetaDataModel");

const getOrSetSiteMetaData = async function () {
    let siteMetaData = await SiteMetaData.findOne()
    if (!siteMetaData) {
        siteMetaData = new SiteMetaData()
        await siteMetaData.save()
    }
}

module.exports = {getOrSetSiteMetaData};