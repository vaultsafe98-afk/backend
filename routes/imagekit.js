const express = require('express');
const imagekitService = require('../services/imagekitService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/imagekit/upload
// @desc    Upload image to ImageKit
// @access  Private
router.post('/upload', auth, async (req, res) => {
    try {
        const { image, fileName, folder = 'deposit-proofs' } = req.body;

        if (!image || !fileName) {
            return res.status(400).json({
                success: false,
                message: 'Image and fileName are required'
            });
        }

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(image, 'base64');

        // Create a mock file object for ImageKit service
        const mockFile = {
            buffer: imageBuffer,
            originalname: fileName,
            mimetype: 'image/jpeg' // Default to JPEG, could be detected from base64 header
        };

        // Upload to ImageKit
        const imageUrl = await imagekitService.uploadImage(mockFile, folder);

        res.json({
            success: true,
            data: {
                url: imageUrl
            },
            message: 'Image uploaded successfully'
        });

    } catch (error) {
        console.error('ImageKit upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
});

// @route   GET /api/imagekit/auth
// @desc    Get ImageKit authentication parameters
// @access  Private
router.get('/auth', auth, async (req, res) => {
    try {
        const authParams = imagekitService.getAuthenticationParameters();

        res.json({
            success: true,
            data: authParams,
            message: 'Authentication parameters retrieved successfully'
        });

    } catch (error) {
        console.error('ImageKit auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get authentication parameters',
            error: error.message
        });
    }
});

module.exports = router;
