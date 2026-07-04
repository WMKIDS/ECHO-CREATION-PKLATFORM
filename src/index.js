'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    try {
      // Find the public role
      const publicRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' } });

      if (publicRole) {
        const permissionsToEnable = [
          { action: 'api::article.article.find' },
          { action: 'api::article.article.findOne' },
          { action: 'api::global-settings.global-settings.find' },
          { action: 'api::global-settings.global-settings.findOne' }
        ];

        for (const perm of permissionsToEnable) {
          // Check if permission already exists
          const existingPermission = await strapi
            .query('plugin::users-permissions.permission')
            .findOne({
              where: {
                role: publicRole.id,
                action: perm.action,
              },
            });

          if (!existingPermission) {
             // Create permission if it does not exist
             await strapi.query('plugin::users-permissions.permission').create({
              data: {
                action: perm.action,
                role: publicRole.id,
              },
            });
          }
        }
        console.log('Public permissions for Article and GlobalSettings have been enabled.');
      }
    } catch (error) {
      console.error('Error enabling public permissions:', error);
    }
  },
};
