// Result Routes
const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');
const { authenticateStudent } = require('../middleware/auth');

/**
 * @route   GET /api/results/student/:registerNumber
 * @desc    Get student results by register number (with DOB verification)
 * @access  Public (DOB verified in controller)
 */
router.post('/student/view', resultController.getStudentResults);

/**
 * @route   GET /api/results/student/semester/:semester
 * @desc    Get specific semester results for logged-in student
 * @access  Private (JWT required)
 */
router.get('/student/semester/:semester', authenticateStudent, resultController.getSemesterResults);

/**
 * @route   GET /api/results/student/download/:semester
 * @desc    Download result PDF for specific semester
 * @access  Private
 */
router.get('/student/download/:semester', authenticateStudent, resultController.downloadResultPDF);

/**
 * @route   GET /api/results/student/all
 * @desc    Get all semester results for logged-in student
 * @access  Private
 */
router.get('/student/all', authenticateStudent, resultController.getAllResults);

module.exports = router;