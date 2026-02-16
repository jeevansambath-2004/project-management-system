const File = require('../models/File');
const path = require('path');
const fs = require('fs');

// @desc    Upload file
// @route   POST /api/files/upload
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const file = await File.create({
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            project: req.body.projectId || null,
            uploadedBy: req.user.id
        });

        res.status(201).json({ success: true, data: file });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all files
// @route   GET /api/files
exports.getFiles = async (req, res) => {
    try {
        const query = {};
        if (req.query.projectId) {
            query.project = req.query.projectId;
        }

        const files = await File.find(query)
            .populate('uploadedBy', 'name email')
            .populate('project', 'name')
            .sort('-createdAt');

        res.json({ success: true, count: files.length, data: files });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single file
// @route   GET /api/files/:id
exports.getFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id)
            .populate('uploadedBy', 'name email');

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.json({ success: true, data: file });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Download file
// @route   GET /api/files/:id/download
exports.downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.download(file.path, file.originalName);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
exports.deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete file from filesystem
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        await file.deleteOne();
        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
