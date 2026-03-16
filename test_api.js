const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'john@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login success, token acquired.');

        console.log('Testing /api/productivity/leaderboard');
        try {
            const lRes = await axios.get('http://localhost:5000/api/productivity/leaderboard', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Leaderboard success:', lRes.data.data.length, 'records');
        } catch (e) {
            console.error('Leaderboard error:', e.response?.data || e.message);
        }

        console.log('Testing /api/productivity/activity');
        try {
            const aRes = await axios.get('http://localhost:5000/api/productivity/activity', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Activity success:', aRes.data.data.length, 'records');
        } catch (e) {
            console.error('Activity error:', e.response?.data || e.message);
        }
    } catch (e) {
        console.error('Login error:', e.response?.data || e.message);
    }
}
test();
