'use strict';

const { validationResult } = require('express-validator');
const Service = require('./users.service');

class UsersController {
  async list(req, res, next) {
    try {
      const { rows, total, page, limit } = await Service.listUsers({ page: req.query.page, limit: req.query.limit, search: req.query.search });
      res.status(200).json({ success: true, pagination: { total, page, limit }, data: rows });
    } catch (e) { next(e); }
  }

  async getOne(req, res, next) {
    try {
      const id = Number(req.params.id);
      const user = await Service.getUserById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      res.json({ success: true, data: user });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const data = await Service.createUser(req.body);
      res.status(201).json({ success: true, message: 'User created successfully.', data });
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'User with this username or email already exists.' });
      next(e);
    }
  }

  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const id = Number(req.params.id);
      await Service.updateUser(id, req.body);
      res.json({ success: true, message: 'User updated successfully.' });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      const affected = await Service.softDeleteUser(id);
      if (!affected) return res.status(404).json({ success: false, message: 'User not found.' });
      res.json({ success: true, message: 'User deleted successfully.' });
    } catch (e) { next(e); }
  }
}

module.exports = new UsersController();

