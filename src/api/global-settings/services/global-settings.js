'use strict';

/**
 * global-settings service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::global-settings.global-settings');
