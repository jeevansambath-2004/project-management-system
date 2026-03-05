const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, googleAuth, verifyCompanyCode } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/verify-company-code', verifyCompanyCode);
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
