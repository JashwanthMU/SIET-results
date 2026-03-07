// Result Controller - Handles result retrieval and display
const db = require('../config/database');
const { auditLog } = require('../utils/audit');
const PDFDocument = require('pdfkit');

/**
 * Get Student Results
 * This is the main endpoint students use to view results
 * Register Number: 714024149040
 * DOB: 08.05.2007
 */
exports.getStudentResults = async (req, res) => {
  try {
    const { registerNumber, dateOfBirth } = req.body;

    // Validate input
    if (!registerNumber || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Register number and date of birth are required'
      });
    }

    // Convert DOB from DD.MM.YYYY to YYYY-MM-DD
    const [day, month, year] = dateOfBirth.split('.');
    const dobFormatted = `${year}-${month}-${day}`;

    // Get student details
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
        semester
      FROM students 
      WHERE register_number = ? AND date_of_birth = ? AND is_active = TRUE`,
      [registerNumber, dobFormatted]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found. Please check your register number and date of birth.'
      });
    }

    const student = students[0];

    // Get all published results for this student
    const [results] = await db.query(
      `SELECT 
        r.id,
        r.semester,
        r.exam_month,
        r.exam_year,
        s.subject_code,
        s.subject_name,
        r.grade,
        r.result,
        r.grade_points,
        r.published_at
      FROM results r
      JOIN subjects s ON r.subject_id = s.id
      WHERE r.student_id = ? AND r.is_published = TRUE
      ORDER BY r.semester, s.subject_code`,
      [student.id]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No results published yet. Please check back later.'
      });
    }

    // Group results by semester
    const resultsBySemester = results.reduce((acc, result) => {
      const sem = result.semester;
      if (!acc[sem]) {
        acc[sem] = {
          semester: sem,
          examPeriod: `${result.exam_month} ${result.exam_year}`,
          subjects: []
        };
      }
      
      acc[sem].subjects.push({
        subjectCode: result.subject_code,
        subjectName: result.subject_name,
        grade: result.grade,
        result: result.result,
        gradePoints: result.grade_points
      });
      
      return acc;
    }, {});

    // Calculate SGPA for each semester
    Object.keys(resultsBySemester).forEach(sem => {
      const subjects = resultsBySemester[sem].subjects;
      const validGrades = subjects.filter(s => s.gradePoints !== null);
      
      if (validGrades.length > 0) {
        const totalPoints = validGrades.reduce((sum, s) => sum + parseFloat(s.gradePoints), 0);
        const sgpa = (totalPoints / validGrades.length).toFixed(2);
        resultsBySemester[sem].sgpa = sgpa;
      } else {
        resultsBySemester[sem].sgpa = 'N/A';
      }
    });

    // Audit log
    await auditLog({
      user_id: student.id,
      user_type: 'student',
      action: 'view_results',
      entity_type: 'results',
      entity_id: student.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    // Return structured response
    res.json({
      success: true,
      student: {
        registerNumber: student.register_number,
        name: student.name,
        dateOfBirth: dateOfBirth,
        regulation: student.regulation,
        department: student.department,
        degree: student.degree,
        branch: student.branch,
        currentSemester: student.semester
      },
      results: Object.values(resultsBySemester)
    });

  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching results'
    });
  }
};

/**
 * Get Semester-specific Results
 * For authenticated students viewing specific semester
 */
exports.getSemesterResults = async (req, res) => {
  try {
    const studentId = req.user.id;
    const semester = parseInt(req.params.semester);

    // Validate semester
    if (!semester || semester < 1 || semester > 8) {
      return res.status(400).json({
        success: false,
        message: 'Invalid semester number'
      });
    }

    // Get results
    const [results] = await db.query(
      `SELECT 
        r.semester,
        r.exam_month,
        r.exam_year,
        s.subject_code,
        s.subject_name,
        r.grade,
        r.result,
        r.grade_points
      FROM results r
      JOIN subjects s ON r.subject_id = s.id
      WHERE r.student_id = ? AND r.semester = ? AND r.is_published = TRUE
      ORDER BY s.subject_code`,
      [studentId, semester]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No published results found for semester ${semester}`
      });
    }

    // Calculate SGPA
    const validGrades = results.filter(r => r.gradePoints !== null);
    let sgpa = 'N/A';
    
    if (validGrades.length > 0) {
      const totalPoints = validGrades.reduce((sum, r) => sum + parseFloat(r.gradePoints), 0);
      sgpa = (totalPoints / validGrades.length).toFixed(2);
    }

    res.json({
      success: true,
      semester: semester,
      examPeriod: `${results[0].exam_month} ${results[0].exam_year}`,
      sgpa: sgpa,
      subjects: results.map(r => ({
        subjectCode: r.subject_code,
        subjectName: r.subject_name,
        grade: r.grade,
        result: r.result,
        gradePoints: r.grade_points
      }))
    });

  } catch (error) {
    console.error('Get semester results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching semester results'
    });
  }
};

/**
 * Get All Results for Student
 */
exports.getAllResults = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student info
    const [students] = await db.query(
      'SELECT register_number, name, regulation, department, degree, branch FROM students WHERE id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = students[0];

    // Get all results
    const [results] = await db.query(
      `SELECT 
        r.semester,
        r.exam_month,
        r.exam_year,
        s.subject_code,
        s.subject_name,
        r.grade,
        r.result,
        r.grade_points
      FROM results r
      JOIN subjects s ON r.subject_id = s.id
      WHERE r.student_id = ? AND r.is_published = TRUE
      ORDER BY r.semester, s.subject_code`,
      [studentId]
    );

    // Group by semester
    const resultsBySemester = {};
    results.forEach(r => {
      if (!resultsBySemester[r.semester]) {
        resultsBySemester[r.semester] = {
          semester: r.semester,
          examPeriod: `${r.exam_month} ${r.exam_year}`,
          subjects: []
        };
      }
      
      resultsBySemester[r.semester].subjects.push({
        subjectCode: r.subject_code,
        subjectName: r.subject_name,
        grade: r.grade,
        result: r.result,
        gradePoints: r.grade_points
      });
    });

    // Calculate SGPA for each semester and overall CGPA
    let totalGradePoints = 0;
    let totalSubjects = 0;

    Object.keys(resultsBySemester).forEach(sem => {
      const subjects = resultsBySemester[sem].subjects;
      const validGrades = subjects.filter(s => s.gradePoints !== null);
      
      if (validGrades.length > 0) {
        const semesterPoints = validGrades.reduce((sum, s) => sum + parseFloat(s.gradePoints), 0);
        resultsBySemester[sem].sgpa = (semesterPoints / validGrades.length).toFixed(2);
        
        totalGradePoints += semesterPoints;
        totalSubjects += validGrades.length;
      } else {
        resultsBySemester[sem].sgpa = 'N/A';
      }
    });

    const cgpa = totalSubjects > 0 ? (totalGradePoints / totalSubjects).toFixed(2) : 'N/A';

    res.json({
      success: true,
      student: {
        registerNumber: student.register_number,
        name: student.name,
        regulation: student.regulation,
        department: student.department,
        degree: student.degree,
        branch: student.branch
      },
      cgpa: cgpa,
      results: Object.values(resultsBySemester)
    });

  } catch (error) {
    console.error('Get all results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching all results'
    });
  }
};

/**
 * Download Result PDF
 */
exports.downloadResultPDF = async (req, res) => {
  try {
    const studentId = req.user.id;
    const semester = parseInt(req.params.semester);

    // Get student and results
    const [students] = await db.query(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    );

    const [results] = await db.query(
      `SELECT 
        r.semester,
        r.exam_month,
        r.exam_year,
        s.subject_code,
        s.subject_name,
        r.grade,
        r.result
      FROM results r
      JOIN subjects s ON r.subject_id = s.id
      WHERE r.student_id = ? AND r.semester = ? AND r.is_published = TRUE
      ORDER BY s.subject_code`,
      [studentId, semester]
    );

    if (students.length === 0 || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Results not found'
      });
    }

    const student = students[0];

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=result_${student.register_number}_sem${semester}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Add college header
    doc.fontSize(20).text('Sri Shakthi Institute of Engineering and Technology', { align: 'center' });
    doc.fontSize(12).text('(An Autonomous Institution)', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('OFFICE OF CONTROLLER OF EXAMINATIONS', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`${results[0].exam_month} ${results[0].exam_year} END SEMESTER EXAMINATION RESULTS`, { align: 'center' });
    doc.moveDown(2);

    // Student details
    doc.fontSize(12);
    doc.text(`Register Number: ${student.register_number}`);
    doc.text(`Name of the Student: ${student.name}`);
    doc.text(`Date of Birth: ${student.date_of_birth}`);
    doc.text(`Regulation: ${student.regulation}`);
    doc.moveDown();
    doc.text(`Semester: ${semester}`);
    doc.text(`Degree and Branch: ${student.degree} ${student.branch}`);
    doc.moveDown(2);

    // Results table header
    const tableTop = doc.y;
    const col1 = 80;
    const col2 = 150;
    const col3 = 400;
    const col4 = 500;
    const col5 = 550;

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('SEM', col1, tableTop);
    doc.text('SUBJECT CODE', col2, tableTop);
    doc.text('SUBJECT NAME', col3, tableTop);
    doc.text('GRADE', col4, tableTop);
    doc.text('RESULT', col5, tableTop);
    
    doc.moveTo(50, tableTop + 20).lineTo(580, tableTop + 20).stroke();

    // Results rows
    doc.font('Helvetica');
    let y = tableTop + 30;

    results.forEach((result, index) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text(result.semester, col1, y);
      doc.text(result.subject_code, col2, y);
      doc.text(result.subject_name, col3, y, { width: 180 });
      doc.text(result.grade || '', col4, y);
      doc.text(result.result, col5, y);
      
      y += 25;
    });

    // Footer
    doc.moveDown(3);
    doc.fontSize(10);
    doc.text('Legend:', 50);
    doc.text('RA - ABSENT', 100);
    doc.text('WH - WITHHELD', 200);
    doc.text('WH - FAIL DUE TO MALPRACTICE', 300);
    doc.text('RA - FAIL', 450);
    doc.text('NC - NO CHANGE', 520);
    
    doc.moveDown(2);
    doc.text('Designed and developed by CSE Team,', { align: 'center' });
    doc.text('Sri Shakthi Institute of Engineering and Technology, Coimbatore.', { align: 'center' });

    // Finalize PDF
    doc.end();

    // Audit log
    await auditLog({
      user_id: studentId,
      user_type: 'student',
      action: 'download_result_pdf',
      entity_type: 'results',
      entity_id: semester,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF'
    });
  }
};