module.exports = {
   up: async (queryInterface, Sequelize) => {
      return queryInterface.sequelize.transaction(async (t) => {
         try {
            const tables = await queryInterface.showAllTables();
            if (!tables.includes('user')) {
               await queryInterface.createTable('user', {
                  ID: { type: Sequelize.DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
                  username: { type: Sequelize.DataTypes.STRING, allowNull: false, unique: true },
                  email: { type: Sequelize.DataTypes.STRING, allowNull: false, defaultValue: '' },
                  password_hash: { type: Sequelize.DataTypes.STRING, allowNull: false },
                  password_salt: { type: Sequelize.DataTypes.STRING, allowNull: false, defaultValue: '' },
                  role: { type: Sequelize.DataTypes.STRING, allowNull: false, defaultValue: 'viewer' },
                  created_at: { type: Sequelize.DataTypes.STRING, allowNull: true },
               }, { transaction: t });
            }
         } catch (error) {
            console.log('Migration error (add-users-table):', error);
         }
      });
   },
   down: async (queryInterface) => {
      return queryInterface.sequelize.transaction(async (t) => {
         try {
            const tables = await queryInterface.showAllTables();
            if (tables.includes('user')) {
               await queryInterface.dropTable('user', { transaction: t });
            }
         } catch (error) {
            console.log('Migration error (add-users-table down):', error);
         }
      });
   },
};
