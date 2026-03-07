// Seed Database with Sample Data
// This creates sample students and results for testing

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_results',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await connection.query('DELETE FROM results');
    await connection.query('DELETE FROM students');
    await connection.query('DELETE FROM subjects');
    await connection.query('DELETE FROM staff');
    console.log('✅ Existing data cleared\n');

    // Insert sample subjects for Semester 3
    console.log('📚 Inserting subjects...');
    const subjects = [
      ['21CS301', 'Advanced Data Structures and Algorithms', 3, '2021', 4, 'theory'],
      ['21CS312', 'Advanced Data Structures and Algorithms Laboratory', 3, '2021', 2, 'lab'],
      ['21CS322', 'Object Oriented Programming', 3, '2021', 3, 'theory'],
      ['21CY301', 'Operating Systems and Security', 3, '2021', 4, 'theory'],
      ['21CY302', 'Database Management Systems and Security', 3, '2021', 4, 'theory'],
      ['21CY303', 'Cryptography and Cyber Security', 3, '2021', 4, 'theory'],
      ['21CY311', 'Engineering Exploration-III', 3, '2021', 1, 'theory'],
      ['21CY312', 'Operating Systems and Security Laboratory', 3, '2021', 2, 'lab'],
      ['21CY313', 'Database Management Systems and Security Laboratory', 3, '2021', 2, 'lab'],
      ['21EN301', 'Career Enhancement Program-I', 3, '2021', 1, 'theory'],
      ['21MA305', 'Discrete Mathematics', 3, '2021', 4, 'theory']
    ];

    for (const subject of subjects) {
      await connection.query(
        `INSERT INTO subjects (subject_code, subject_name, semester, regulation, credits, subject_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        subject
      );
    }
    console.log(`✅ Inserted ${subjects.length} subjects\n`);

    // Insert sample student (from your image)
    console.log('👨‍🎓 Inserting students...');
    const students = [
      {
        register_number: '714024149040',
        name: 'SAMPLE STUDENT',
        date_of_birth: '2007-05-08',
        regulation: '2021',
        department: 'Computer Science and Engineering',
        degree: 'B.E.',
        branch: 'Computer Science and Engineering(Cyber Security)',
        semester: 3,
        email: 'student@siet.ac.in'
      },
      // Add more sample students
      {
        register_number: '714024149041',
        name: 'TEST STUDENT TWO',
        date_of_birth: '2007-06-15',
        regulation: '2021',
        department: 'Computer Science and Engineering',
        degree: 'B.E.',
        branch: 'Computer Science and Engineering(Cyber Security)',
        semester: 3,
        email: 'test2@siet.ac.in'
      }
    ];

    const studentIds = [];
    for (const student of students) {
      const [result] = await connection.query(
        `INSERT INTO students (register_number, name, date_of_birth, regulation, department, degree, branch, semester, email) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student.register_number,
          student.name,
          student.date_of_birth,
          student.regulation,
          student.department,
          student.degree,
          student.branch,
          student.semester,
          student.email
        ]
      );
      studentIds.push(result.insertId);
    }
    console.log(`✅ Inserted ${students.length} students\n`);

    // Get subject IDs
    const [subjectRows] = await connection.query('SELECT id, subject_code FROM subjects WHERE semester = 3');
    const subjectMap = {};
    subjectRows.forEach(row => {
      subjectMap[row.subject_code] = row.id;
    });

    // Insert results for first student (all PASS - like your image)
    console.log('📊 Inserting results...');
    const gradeData = [
      ['21CS301', 'O', 'PASS', 10.0],
      ['21CS312', 'O', 'PASS', 10.0],
      ['21CS322', 'O', 'PASS', 10.0],
      ['21CY301', 'O', 'PASS', 10.0],
      ['21CY302', 'O', 'PASS', 10.0],
      ['21CY303', 'O', 'PASS', 10.0],
      ['21CY311', 'O', 'PASS', 10.0],
      ['21CY312', 'O', 'PASS', 10.0],
      ['21CY313', 'O', 'PASS', 10.0],
      ['21EN301', 'O', 'PASS', 10.0],
      ['21MA305', 'O', 'PASS', 10.0]
    ];

    let resultCount = 0;
    for (const studentId of studentIds) {
      for (const [subjectCode, grade, result, gradePoints] of gradeData) {
        await connection.query(
          `INSERT INTO results (student_id, subject_id, semester, exam_month, exam_year, grade, result, grade_points, is_published) 
           VALUES (?, ?, 3, 'Nov/Dec', 2025, ?, ?, ?, TRUE)`,
          [studentId, subjectMap[subjectCode], grade, result, gradePoints]
        );
        resultCount++;
      }
    }
    console.log(`✅ Inserted ${resultCount} results\n`);

    // Insert sample staff members
    console.log('👨‍🏫 Inserting staff members...');
    const staffMembers = [
      {
        staff_id: 'STAFF001',
        name: 'Dr. Faculty Member',
        email: 'faculty@siet.ac.in',
        department: 'Computer Science and Engineering',
        role: 'faculty',
        password: 'password123'
      },
      {
        staff_id: 'EXAM001',
        name: 'Exam Cell Coordinator',
        email: 'examcell@siet.ac.in',
        department: 'Exam Cell',
        role: 'exam_cell',
        password: 'password123'
      },
      {
        staff_id: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@siet.ac.in',
        department: 'Administration',
        role: 'admin',
        password: 'password123'
      }
    ];

    for (const staff of staffMembers) {
      const hashedPassword = await bcrypt.hash(staff.password, 10);
      await connection.query(
        `INSERT INTO staff (staff_id, name, email, department, role, password_hash) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [staff.staff_id, staff.name, staff.email, staff.department, staff.role, hashedPassword]
      );
    }
    console.log(`✅ Inserted ${staffMembers.length} staff members\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Database seeded successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📋 Sample Login Credentials:\n');
    console.log('STUDENT LOGIN:');
    console.log('  Register Number: 714024149040');
    console.log('  Date of Birth: 08.05.2007\n');

    console.log('STAFF LOGIN:');
    console.log('  Email: faculty@siet.ac.in');
    console.log('  Password: password123\n');

    console.log('EXAM CELL LOGIN:');
    console.log('  Email: examcell@siet.ac.in');
    console.log('  Password: password123\n');

    console.log('ADMIN LOGIN:');
    console.log('  Email: admin@siet.ac.in');
    console.log('  Password: password123\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run seeding
seedDatabase()
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });