const mongoose = require('mongoose');
const crypto = require('crypto');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a company name'],
        trim: true,
        maxlength: [100, 'Company name cannot be more than 100 characters']
    },
    secretCode: {
        type: String,
        unique: true,
        sparse: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-generate a unique 8-char secret code before saving
companySchema.pre('save', async function (next) {
    if (!this.secretCode) {
        let code;
        let isUnique = false;
        while (!isUnique) {
            // Format: XXXX-XXXX (readable code)
            const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
            const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
            code = `${part1}-${part2}`;
            const existing = await mongoose.model('Company').findOne({ secretCode: code });
            if (!existing) isUnique = true;
        }
        this.secretCode = code;
    }
    next();
});

module.exports = mongoose.model('Company', companySchema);
