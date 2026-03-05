const User = require('../models/User');
const Company = require('../models/Company');

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password, company, companyCode, isAdmin } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        let companyRecord = null;
        let companyName = company;
        let userRole = 'user';

        if (companyCode) {
            // Joining an existing company via secret code
            companyRecord = await Company.findOne({ secretCode: companyCode.trim().toUpperCase() });
            if (!companyRecord) {
                return res.status(400).json({ message: 'Invalid company secret code. Please check and try again.' });
            }
            companyName = companyRecord.name;
        } else if (isAdmin || (!companyCode && company)) {
            // Creating a new company (admin registration)
            if (!company) {
                return res.status(400).json({ message: 'Please provide a company name' });
            }
            userRole = 'admin';
        } else {
            return res.status(400).json({ message: 'Please provide a company name or a company secret code.' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            company: companyName || 'My Company',
            companyId: companyRecord ? companyRecord._id : null,
            role: userRole,
            authProvider: 'local'
        });

        // If admin, create the company record with this user as admin
        if (userRole === 'admin') {
            const newCompany = await Company.create({
                name: company,
                admin: user._id
            });
            // Link company back to user
            user.companyId = newCompany._id;
            await user.save();
            companyRecord = newCompany;
        }

        // Generate token
        const token = user.getSignedJwtToken();

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company,
                companyId: user.companyId,
                companyCode: companyRecord?.secretCode || null
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password, company } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user signed up with Google
        if (user.authProvider === 'google') {
            return res.status(400).json({ message: 'This account was created with Google. Please sign in with Google.' });
        }

        // If company is provided, verify it matches
        if (company && user.company && user.company.toLowerCase() !== company.toLowerCase()) {
            return res.status(401).json({ message: 'Invalid credentials. Company does not match.' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Fetch company code if admin
        let companyCode = null;
        if (user.companyId) {
            const companyRecord = await Company.findById(user.companyId);
            companyCode = companyRecord?.secretCode || null;
        }

        // Generate token
        const token = user.getSignedJwtToken();

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company,
                companyId: user.companyId,
                companyCode
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Google OAuth login/register
// @route   POST /api/auth/google
exports.googleAuth = async (req, res) => {
    try {
        const { accessToken, userInfo, company, companyCode } = req.body;

        if (!accessToken || !userInfo) {
            return res.status(400).json({ message: 'Access token and user info are required' });
        }

        const { sub: googleId, email, name, picture } = userInfo;

        if (!email) {
            return res.status(400).json({ message: 'Email is required from Google account' });
        }

        // Check if user exists
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (user) {
            // If user exists with email but no googleId (local account), link it
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = 'google';
                if (picture) user.avatar = picture;
                await user.save();
            }
        } else {
            // Resolve company info
            let companyRecord = null;
            let companyName = company;
            let userRole = 'user';

            if (companyCode) {
                companyRecord = await Company.findOne({ secretCode: companyCode.trim().toUpperCase() });
                if (companyRecord) {
                    companyName = companyRecord.name;
                }
            }

            // Create new user via Google sign-up
            user = await User.create({
                name,
                email,
                googleId,
                avatar: picture || '',
                company: companyName || 'My Company',
                companyId: companyRecord ? companyRecord._id : null,
                role: userRole,
                authProvider: 'google'
            });
        }

        // Fetch company code if admin
        let companySecretCode = null;
        if (user.companyId) {
            const companyRecord = await Company.findById(user.companyId);
            companySecretCode = companyRecord?.secretCode || null;
        }

        // Generate token
        const token = user.getSignedJwtToken();

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company,
                companyId: user.companyId,
                companyCode: companySecretCode,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Google authentication failed', error: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        let companyCode = null;
        if (user.companyId) {
            const companyRecord = await Company.findById(user.companyId);
            companyCode = companyRecord?.secretCode || null;
        }
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company,
                companyId: user.companyId,
                companyCode,
                avatar: user.avatar,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, avatar } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, email, avatar },
            { new: true, runValidators: true }
        );

        let companyCode = null;
        if (user.companyId) {
            const companyRecord = await Company.findById(user.companyId);
            companyCode = companyRecord?.secretCode || null;
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company,
                companyId: user.companyId,
                companyCode,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Verify company secret code
// @route   POST /api/auth/verify-company-code
exports.verifyCompanyCode = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Please provide a company code' });
        }
        const company = await Company.findOne({ secretCode: code.trim().toUpperCase() });
        if (!company) {
            return res.status(404).json({ message: 'Invalid company code. No company found.' });
        }
        res.json({ success: true, companyName: company.name });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
