// Results Display Page - Exactly like Sri Shakthi Institute Results
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const ResultsPage = () => {
  const [results, setResults] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const studentData = JSON.parse(localStorage.getItem('student'));

      if (!token || !studentData) {
        toast.error('Please login first');
        navigate('/');
        return;
      }

      setStudent(studentData);

      // Fetch all results
      const response = await axios.get('http://localhost:3000/api/results/student/all', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setResults(response.data.results);
        // Auto-select latest semester
        if (response.data.results.length > 0) {
          const latestSem = response.data.results[response.data.results.length - 1];
          setSelectedSemester(latestSem.semester);
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.clear();
        navigate('/');
      } else {
        toast.error('Error fetching results');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (semester) => {
    try {
      const token = localStorage.getItem('token');
      
      toast.loading('Generating PDF...');
      
      const response = await axios.get(
        `http://localhost:3000/api/results/student/download/${semester}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `result_semester_${semester}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.dismiss();
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Error downloading PDF');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const currentSemesterResults = results?.find(r => r.semester === selectedSemester);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Same as login page */}
      <div className="bg-yellow-400 py-4 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src="/logo.png" 
              alt="Sri Shakthi Institute" 
              className="h-16"
              onError={(e) => e.target.style.display = 'none'}
            />
            <div>
              <h1 className="text-xl font-bold text-green-700">
                SRI SHAKTHI
              </h1>
              <p className="text-sm text-gray-700">
                INSTITUTE OF ENGINEERING AND TECHNOLOGY
              </p>
              <p className="text-xs text-gray-600">
                (An Autonomous Institution)
              </p>
              <p className="text-xs text-gray-600">
                Approved by AICTE, New Delhi • Affiliated to ANNA UNIVERSITY, Chennai
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-red-600 text-white px-4 py-2 rounded-full">
              <span className="font-bold">A</span>
              <p className="text-xs">NAAC</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-4">
            OFFICE OF CONTROLLER OF EXAMINATIONS
          </h2>
          
          {currentSemesterResults && (
            <p className="text-center text-gray-700 mb-6">
              {currentSemesterResults.examPeriod} END SEMESTER EXAMINATION RESULTS
            </p>
          )}

          {/* Student Information */}
          {student && (
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <span className="font-semibold">Register Number:</span>
                <span className="ml-2">{student.registerNumber}</span>
              </div>
              <div>
                <span className="font-semibold">Date of Birth:</span>
                <span className="ml-2">{student.dateOfBirth || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold">Name of the Student:</span>
                <span className="ml-2">{student.name}</span>
              </div>
              <div>
                <span className="font-semibold">Regulation:</span>
                <span className="ml-2">{student.regulation}</span>
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Degree and Branch:</span>
                <span className="ml-2">
                  {student.degree} {student.branch}
                </span>
              </div>
            </div>
          )}

          {/* Semester Selector */}
          {results && results.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Semester:
              </label>
              <div className="flex flex-wrap gap-2">
                {results.map((result) => (
                  <button
                    key={result.semester}
                    onClick={() => setSelectedSemester(result.semester)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedSemester === result.semester
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Semester {result.semester}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Table */}
          {currentSemesterResults && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left">SEM</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">SUBJECT CODE</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">SUBJECT NAME</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">GRADE</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSemesterResults.subjects.map((subject, index) => (
                    <tr 
                      key={index}
                      className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <td className="border border-gray-300 px-4 py-2">
                        {currentSemesterResults.semester}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {subject.subjectCode}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {subject.subjectName}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold">
                        {subject.grade || '-'}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 font-semibold ${
                        subject.result === 'PASS' ? 'text-green-600' : 
                        subject.result === 'FAIL' ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {subject.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* SGPA Display */}
              {currentSemesterResults.sgpa && (
                <div className="mt-4 text-right">
                  <span className="text-lg font-bold">
                    SGPA: {currentSemesterResults.sgpa}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 text-sm text-gray-600">
            <div className="flex flex-wrap gap-4">
              <span><strong>RA -</strong> ABSENT</span>
              <span><strong>WH -</strong> WITHHELD</span>
              <span><strong>WH -</strong> FAIL DUE TO MALPRACTICE</span>
              <span><strong>RA -</strong> FAIL</span>
              <span><strong>NC -</strong> NO CHANGE</span>
            </div>
          </div>

          {/* Download Button */}
          {currentSemesterResults && (
            <div className="mt-6 text-center">
              <button
                onClick={() => handleDownloadPDF(selectedSemester)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                📄 Download Result PDF
              </button>
            </div>
          )}

          {/* No Results */}
          {!results || results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No results published yet. Please check back later.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto text-center text-sm">
          <p>Designed and developed by CSE Team,</p>
          <p>Sri Shakthi Institute of Engineering and Technology, Coimbatore.</p>
        </div>
      </footer>
    </div>
  );
};

export default ResultsPage;