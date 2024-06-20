const joi = require('joi');

const bossTypesSchemaValidator = joi.object({
    boss_types: joi.array().items(joi.string()).required()
});

module.exports = bossTypesSchemaValidator