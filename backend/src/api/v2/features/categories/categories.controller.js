'use strict';

const { validationResult } = require('express-validator');
const logger = require('../../../../../utils/logger');
const Service = require('./categories.service');

class CategoriesController {
  async list(req, res, next) {
    try {
      const orgId = Number(req.user?.org_id || 1);
      const rows = await Service.listCategories(orgId);
      res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (err) {
      logger.error('V2: Error fetching categories:', err);
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      const org_id = Number(req.user?.org_id || 1);
      const { name, description, parent_id, is_active } = req.body;
      const { id } = await Service.createCategory({ org_id, name, parent_id, is_active });
      logger.info(`V2: Category created with ID ${id}`);
      res.status(201).json({ success: true, message: 'Category created successfully.', data: { id } });
    } catch (err) {
      logger.error('V2: Error creating category:', err);
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      const { id } = req.params;
      const org_id = Number(req.user?.org_id || 1);
      const { name, description, parent_id, is_active } = req.body;
      const affected = await Service.updateCategory(id, { org_id, name, parent_id, is_active });
      if (!affected) {
        return res.status(404).json({ success: false, message: 'Category not found or no changes made.' });
      }
      logger.info(`V2: Category ${id} updated.`);
      res.status(200).json({ success: true, message: 'Category updated successfully.' });
    } catch (err) {
      logger.error('V2: Error updating category:', err);
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const org_id = Number(req.user?.org_id || 1);
      const affected = await Service.softDeleteCategory(id, org_id);
      if (!affected) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }
      logger.info(`V2: Category ${id} soft-deleted.`);
      res.status(200).json({ success: true, message: 'Category deleted successfully.' });
    } catch (err) {
      logger.error('V2: Error deleting category:', err);
      next(err);
    }
  }
}

module.exports = new CategoriesController();
