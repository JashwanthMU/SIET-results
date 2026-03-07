-- College Result Management System Database Schema
-- Handles 5000+ students with concurrent access

-- Students Table
CREATE TABLE students (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    register_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    regulation VARCHAR(10) NOT NULL,
    department VARCHAR(100) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    semester INT NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reg_dob (register_number, date_of_birth),
    INDEX idx_department (department),
    INDEX idx_semester (semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subjects Table
CREATE TABLE subjects (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    semester INT NOT NULL,
    regulation VARCHAR(10) NOT NULL,
    credits INT DEFAULT 3,
    subject_type ENUM('theory', 'lab', 'project') DEFAULT 'theory',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (subject_code),
    INDEX idx_semester (semester, regulation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Results Table (Main grades storage)
CREATE TABLE results (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    semester INT NOT NULL,
    exam_month VARCHAR(20) NOT NULL, -- 'Nov/Dec 2025'
    exam_year INT NOT NULL,
    grade VARCHAR(5), -- 'O', 'A+', 'A', 'B+', 'B', 'C', 'RA', 'WH'
    result VARCHAR(20), -- 'PASS', 'FAIL', 'ABSENT', 'WITHHELD'
    grade_points DECIMAL(3,2), -- 10.00, 9.00, etc.
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    created_by BIGINT, -- Staff who entered
    approved_by BIGINT, -- Exam cell who approved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    UNIQUE KEY unique_result (student_id, subject_id, exam_month, exam_year),
    INDEX idx_student_semester (student_id, semester),
    INDEX idx_published (is_published, exam_month, exam_year),
    INDEX idx_exam_period (exam_month, exam_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Staff/Faculty Table
CREATE TABLE staff (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    staff_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15),
    department VARCHAR(100),
    role ENUM('faculty', 'hod', 'exam_cell', 'admin') DEFAULT 'faculty',
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_department_role (department, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grade Upload Sessions (Track bulk uploads)
CREATE TABLE grade_upload_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uploaded_by BIGINT NOT NULL,
    file_name VARCHAR(255),
    total_records INT,
    successful_records INT,
    failed_records INT,
    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    error_log TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES staff(id),
    INDEX idx_status (status, uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Log (Security & compliance)
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    user_type ENUM('student', 'staff', 'admin'),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_type, user_id, created_at),
    INDEX idx_action (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Result PDF Cache (Performance optimization)
CREATE TABLE result_pdfs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    semester INT NOT NULL,
    exam_month VARCHAR(20),
    exam_year INT,
    pdf_url VARCHAR(500),
    s3_key VARCHAR(500),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    INDEX idx_student_semester (student_id, semester),
    INDEX idx_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Configuration
CREATE TABLE system_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default config
INSERT INTO system_config (config_key, config_value, description) VALUES
('results_published', 'true', 'Master switch to enable/disable result viewing'),
('current_semester', '3', 'Current active semester'),
('current_exam_period', 'Nov/Dec 2025', 'Current exam period'),
('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
('session_timeout_minutes', '30', 'User session timeout in minutes');