const ApiError = require('../utils/ApiError');

/**
 * Builds middleware that validates `req[property]` against a Joi schema.
 * Usage: validate(taskValidation.createTask) validates req.body by default.
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message.replace(/"/g, ''));
      throw ApiError.badRequest('Validation failed', details);
    }

    req[property] = value;
    next();
  };
}

module.exports = validate;
