// Load Testing Script using k6
// Simulates 5000+ concurrent users accessing the result system

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 1000 },   // Ramp up to 1000 users
    { duration: '10m', target: 5000 },  // Ramp up to 5000 users
    { duration: '15m', target: 5000 },  // Stay at 5000 users for 15 minutes
    { duration: '5m', target: 0 },      // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    errors: ['rate<0.1'],             // Custom error rate
  },
};

// Sample student credentials
const students = [
  { registerNumber: '714024149040', dob: '08.05.2007' },
  { registerNumber: '714024149041', dob: '15.06.2007' },
  // Add more sample students
];

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Pick random student
  const student = students[Math.floor(Math.random() * students.length)];

  // Test 1: Student Login
  const loginResponse = http.post(
    `${BASE_URL}/api/auth/student/login`,
    JSON.stringify({
      registerNumber: student.registerNumber,
      dateOfBirth: student.dob,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'StudentLogin' },
    }
  );

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  });

  errorRate.add(!loginSuccess);

  if (!loginSuccess) {
    sleep(1);
    return;
  }

  const token = loginResponse.json('token');
  sleep(1);

  // Test 2: Fetch All Results
  const resultsResponse = http.get(
    `${BASE_URL}/api/results/student/all`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      tags: { name: 'FetchResults' },
    }
  );

  const resultsSuccess = check(resultsResponse, {
    'results status is 200': (r) => r.status === 200,
    'results has data': (r) => r.json('results') !== undefined,
  });

  errorRate.add(!resultsSuccess);
  sleep(2);

  // Test 3: Fetch Specific Semester
  const semesterResponse = http.get(
    `${BASE_URL}/api/results/student/semester/3`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      tags: { name: 'FetchSemester' },
    }
  );

  const semesterSuccess = check(semesterResponse, {
    'semester status is 200': (r) => r.status === 200,
  });

  errorRate.add(!semesterSuccess);
  sleep(2);

  // Test 4: Download PDF (25% of users)
  if (Math.random() < 0.25) {
    const pdfResponse = http.get(
      `${BASE_URL}/api/results/student/download/3`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        tags: { name: 'DownloadPDF' },
      }
    );

    const pdfSuccess = check(pdfResponse, {
      'pdf status is 200': (r) => r.status === 200,
      'pdf is not empty': (r) => r.body.length > 0,
    });

    errorRate.add(!pdfSuccess);
  }

  sleep(3);
}