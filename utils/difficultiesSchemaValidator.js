const joi = require('joi');

const difficultiesSchemaValidator = joi.object({
    difficulties: joi.object().pattern(
        joi.string(),
        joi.array().items(joi.string()).required()
    ).required()
});

module.exports = difficultiesSchemaValidator