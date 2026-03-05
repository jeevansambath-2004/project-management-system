const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const adminUsers = [
    {
        name: 'Nava Jeevan',
        email: 'navajeevanks@gmail.com',
        password: 'nava@123',
        role: 'admin',
        company: 'ProjectFlow',
        authProvider: 'local'
    },
    {
        name: 'Sam Jeevan',
        email: 'samjeevan58@gmail.com',
        password: 'jeev@123',
        role: 'admin',
        company: 'ProjectFlow',
        authProvider: 'local'
    }
];

const seedAdmins = async () => {
    try {
        await connectDB();
        console.log('\n🔧 Seeding admin users...\n');

        for (const adminData of adminUsers) {
            const existing = await User.findOne({ email: adminData.email });

            if (existing) {
                // Update role to admin if user already exists
                existing.role = 'admin';
                await existing.save();
                console.log(`✅ ${adminData.email} — already exists, role updated to admin`);
            } else {
                // Create new admin user
                await User.create(adminData);
                console.log(`✅ ${adminData.email} — created as admin`);
            }
        }

        console.log('\n🎉 Admin seeding complete!\n');
        console.log('You can now login with:');
        console.log('  📧 navajeevanks@gmail.com  |  🔑 nava@123');
        console.log('  📧 samjeevan58@gmail.com   |  🔑 jeev@123');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
};

seedAdmins();
