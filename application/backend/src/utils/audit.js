// Audit Logging Utility
const db = require('../config/database');

/**
 * Create audit log entry
 */
exports.auditLog = async (logData) => {
  try {
    const {
      user_id,
      user_type,
      action,
      entity_type,
      entity_id = null,
      old_values = null,
      new_values = null,
      ip_address,
      user_agent
    } = logData;

    await db.query(
      `INSERT INTO audit_logs 
      (user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        user_type,
        action,
        entity_type,
        entity_id,
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        ip_address,
        user_agent
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging failure shouldn't break the app
  }
};