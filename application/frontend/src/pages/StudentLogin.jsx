import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentLogin = () => {
  const [registerNumber, setRegisterNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/api/auth/student/login', {
        registerNumber,
        dateOfBirth
      });

      if (response.data.success) {
        // Store token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('student', JSON.stringify(response.data.student));
        
        toast.success('Login successful!');
        
        // Navigate to results page
        navigate('/results');
      }
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.message || 'Login failed');
      } else {
        toast.error('Server error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
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
          <div className="bg-red-600 text-white px-4 py-2 rounded-full">
            <span className="font-bold">A</span>
            <p className="text-xs">NAAC</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-2">
            OFFICE OF CONTROLLER OF EXAMINATIONS
          </h2>
          
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Register Number
              </label>
              <input
                type="text"
                required
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                placeholder="714024149040"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="text"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                placeholder="DD.MM.YYYY (e.g., 08.05.2007)"
                pattern="\d{2}\.\d{2}\.\d{4}"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: DD.MM.YYYY (e.g., 08.05.2007)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  GET RESULT →
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Having trouble? Contact exam cell at exam@siet.ac.in</p>
          </div>
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

export default StudentLogin;