const db = require('../../../../models');
const bcrypt = a('bcryptjs');

const User = db.users;

/**
 * UserServiceV2 handles all database operations related to users.
 */
class UserServiceV2 {
    /**
     * Retrieves a list of all users.
     * @returns {Promise<Array>} A list of user objects.
     */
    static async getAllUsers() {
        return User.findAll({
            attributes: { exclude: ['password_hash'] } // Never send password hashes
        });
    }

    /**
     * Finds a single user by their ID.
     * @param {number} userId - The ID of the user to find.
     * @returns {Promise<object|null>} The user object or null if not found.
     */
    static async getUserById(userId) {
        return User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });
    }

    /**
     * Creates a new user.
     * @param {object} userData - The data for the new user.
     * @returns {Promise<object>} The newly created user object.
     */
    static async createUser(userData) {
        const hashedPassword = bcrypt.hashSync(userData.password, 10);
        const newUser = await User.create({
            ...userData,
            password_hash: hashedPassword,
        });
        // Remove password hash from the returned object
        const userJson = newUser.toJSON();
        delete userJson.password_hash;
        return userJson;
    }

    /**
     * Updates an existing user's information.
     * @param {number} userId - The ID of the user to update.
     * @param {object} updateData - The data to update.
     * @returns {Promise<object|null>} The updated user object.
     */
    static async updateUser(userId, updateData) {
        const user = await User.findByPk(userId);
        if (!user) {
            return null;
        }
        
        // If password is being updated, it needs to be hashed.
        if (updateData.password) {
            updateData.password_hash = bcrypt.hashSync(updateData.password, 10);
            delete updateData.password; // Don't store plain password
        }

        await user.update(updateData);
        
        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });

        return updatedUser;
    }

    /**
     * Deletes a user by their ID.
     * @param {number} userId - The ID of the user to delete.
     * @returns {Promise<boolean>} True if deletion was successful.
     */
    static async deleteUser(userId) {
        const user = await User.findByPk(userId);
        if (!user) {
            return false;
        }
        await user.destroy();
        return true;
    }
}

module.exports = UserServiceV2;
