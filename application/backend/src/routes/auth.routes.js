// Authentication Routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * @route   POST /api/auth/student/login
 * @desc    Student login with register number and DOB
 * @access  Public
 */
router.post('/student/login', authController.studentLogin);

/**
 * @route   POST /api/auth/staff/login
 * @desc    Staff login with email and password
 * @access  Public
 */
router.post('/staff/login', authController.staffLogin);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify JWT token
 * @access  Public
 */
router.post('/verify-token', authController.verifyToken);

module.exports = router;