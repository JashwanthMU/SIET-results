// Authentication Controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const db = require('../config/database');
const { auditLog } = require('../utils/audit');

// Validation schemas
const studentLoginSchema = Joi.object({
  registerNumber: Joi.string().required().trim(),
  dateOfBirth: Joi.string().pattern(/^\d{2}\.\d{2}\.\d{4}$/).required()
    .messages({
      'string.pattern.base': 'Date of birth must be in format DD.MM.YYYY'
    })
});

const staffLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

/**
 * Student Login
 * Register Number: 714024149040
 * DOB: 08.05.2007
 */
exports.studentLogin = async (req, res) => {
  try {
    // Validate input
    const { error, value } = studentLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { registerNumber, dateOfBirth } = value;

    // Convert DOB from DD.MM.YYYY to YYYY-MM-DD for database
    const [day, month, year] = dateOfBirth.split('.');
    const dobFormatted = `${year}-${month}-${day}`;

    // Query student
    const [students] = await db.query(
      `SELECT 
        id, 
        register_number, 
        name, 
        date_of_birth,
        regulation,
        department,
        degree,
        branch,
        semester,
        email,
        is_active
      FROM students 
      WHERE register_number = ? AND date_of_birth = ? AND is_active = TRUE`,
      [registerNumber, dobFormatted]
    );

    if (students.length === 0) {
      // Audit failed attempt
      await auditLog({
        user_id: null,
        user_type: 'student',
        action: 'login_failed',
        entity_type: 'auth',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        old_values: { registerNumber, reason: 'invalid_credentials' }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid register number or date of birth'
      });
    }

    const student = students[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: student.id,
        registerNumber: student.register_number,
        type: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit successful login
    await auditLog({
      user_id: student.id,
      user_type: 'student',
      action: 'login_success',
      entity_type: 'auth',
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    // Return response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      student: {
        id: student.id,
        registerNumber: student.register_number,
        name: student.name,
        regulation: student.regulation,
        department: student.department,
        degree: student.degree,
        branch: student.branch,
        semester: student.semester
      }
    });

  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * Staff Login
 */
exports.staffLogin = async (req, res) => {
  try {
    // Validate input
    const { error, value } = staffLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password } = value;

    // Query staff
    const [staff] = await db.query(
      `SELECT 
        id, 
        staff_id, 
        name, 
        email, 
        password_hash,
        department,
        role,
        is_active
      FROM staff 
      WHERE email = ? AND is_active = TRUE`,
      [email]
    );

    if (staff.length === 0) {
      await auditLog({
        user_id: null,
        user_type: 'staff',
        action: 'login_failed',
        entity_type: 'auth',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        old_values: { email, reason: 'invalid_email' }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const staffMember = staff[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, staffMember.password_hash);
    
    if (!isPasswordValid) {
      await auditLog({
        user_id: staffMember.id,
        user_type: 'staff',
        action: 'login_failed',
        entity_type: 'auth',
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        old_values: { email, reason: 'invalid_password' }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await db.query(
      'UPDATE staff SET last_login = NOW() WHERE id = ?',
      [staffMember.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: staffMember.id,
        staffId: staffMember.staff_id,
        role: staffMember.role,
        type: 'staff'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Audit successful login
    await auditLog({
      user_id: staffMember.id,
      user_type: 'staff',
      action: 'login_success',
      entity_type: 'auth',
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    // Return response (don't send password hash!)
    res.json({
      success: true,
      message: 'Login successful',
      token,
      staff: {
        id: staffMember.id,
        staffId: staffMember.staff_id,
        name: staffMember.name,
        email: staffMember.email,
        department: staffMember.department,
        role: staffMember.role
      }
    });

  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * Logout
 */
exports.logout = async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // But we can still audit it
  
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      await auditLog({
        user_id: decoded.id,
        user_type: decoded.type,
        action: 'logout',
        entity_type: 'auth',
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    // Even if audit fails, respond successfully
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
};

/**
 * Verify Token
 */
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      success: true,
      valid: true,
      decoded
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      valid: false,
      message: 'Invalid or expired token'
    });
  }
};