const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testEndpoints() {
    try {
        // Test registration
        console.log('Testing registration...');
        const registerResponse = await axios.post(`${API_URL}/auth/register`, {
            email: 'test@example.com',
            password: 'password123',
            userType: 'employer',
            companyName: 'Test Company',
            companyDescription: 'A test company',
            phone: '1234567890',
            location: 'Test City'
        });
        console.log('Registration successful:', registerResponse.data);

        // Test login
        console.log('\nTesting login...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('Login successful:', loginResponse.data);

        const token = loginResponse.data.token;

        // Test job posting
        console.log('\nTesting job posting...');
        const jobResponse = await axios.post(`${API_URL}/jobs`, {
            title: 'Test Job',
            description: 'A test job posting',
            requirements: 'Test requirements',
            salary: {
                min: 50000,
                max: 100000,
                currency: 'USD'
            },
            location: 'Test City',
            type: 'full-time'
        }, {
            headers: {
                'x-auth-token': token
            }
        });
        console.log('Job posting successful:', jobResponse.data);

        // Test getting all jobs
        console.log('\nTesting get all jobs...');
        const jobsResponse = await axios.get(`${API_URL}/jobs`);
        console.log('Get jobs successful:', jobsResponse.data);

        // Test updating job
        console.log('\nTesting job update...');
        const updateResponse = await axios.put(`${API_URL}/jobs/${jobResponse.data._id}`, {
            title: 'Updated Test Job',
            description: 'An updated test job posting'
        }, {
            headers: {
                'x-auth-token': token
            }
        });
        console.log('Job update successful:', updateResponse.data);

        // Test deleting job
        console.log('\nTesting job deletion...');
        const deleteResponse = await axios.delete(`${API_URL}/jobs/${jobResponse.data._id}`, {
            headers: {
                'x-auth-token': token
            }
        });
        console.log('Job deletion successful:', deleteResponse.data);

        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    }
}

testEndpoints(); 