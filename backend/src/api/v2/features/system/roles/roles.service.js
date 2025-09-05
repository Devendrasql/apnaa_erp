const db = require('../../../../models');

const Role = db.roles;
const Permission = db.permissions;
const RolePermission = db.role_permissions;

/**
 * RolesServiceV2 handles all database operations related to roles and their permissions.
 */
class RolesServiceV2 {
    static async getAllRoles() {
        return Role.findAll({
            include: [{
                model: Permission,
                as: 'permissions', // Ensure this alias matches your Sequelize association
                attributes: ['id', 'code', 'name'],
                through: { attributes: [] } // Don't include the join table data
            }]
        });
    }

    static async getRoleById(roleId) {
        return Role.findByPk(roleId, {
            include: [{
                model: Permission,
                as: 'permissions',
                attributes: ['id', 'code', 'name'],
                through: { attributes: [] }
            }]
        });
    }

    static async createRole(roleData) {
        const { name, description, permissions } = roleData;
        const newRole = await Role.create({ name, description });

        if (permissions && permissions.length > 0) {
            await newRole.setPermissions(permissions); // Sequelize association method
        }

        return this.getRoleById(newRole.id);
    }

    static async updateRole(roleId, updateData) {
        const { name, description, permissions } = updateData;
        const role = await Role.findByPk(roleId);
        if (!role) {
            return null;
        }

        await role.update({ name, description });

        if (permissions) { // Allows sending an empty array to remove all permissions
            await role.setPermissions(permissions);
        }

        return this.getRoleById(roleId);
    }
    
    static async deleteRole(roleId) {
        const role = await Role.findByPk(roleId);
        if (!role) {
            return false;
        }
        await role.destroy(); // Associated permissions in role_permissions are deleted automatically
        return true;
    }
}

module.exports = RolesServiceV2;
