// routes/userRoutes.js
// All routes here require an authenticated admin.
const express = require('express');
const router = express.Router();
const { listUsers, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/', listUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
