const ImageKit = require('imagekit');
const path = require('path');

// ImageKit Configuration
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_placeholder',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'private_placeholder',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/placeholder'
});

class ImageKitService {
    constructor() {
        this.imagekit = imagekit;
    }

    // Upload image to ImageKit
    async uploadImage(file, folder = 'deposit-proofs') {
        try {
            console.log('ImageKit upload:', {
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.buffer?.length
            });

            // For development, return mock URL if credentials are not set or are placeholders
            if (!process.env.IMAGEKIT_PUBLIC_KEY ||
                process.env.IMAGEKIT_PUBLIC_KEY === 'public_placeholder' ||
                process.env.IMAGEKIT_PUBLIC_KEY === 'your_imagekit_public_key') {
                console.log('Using mock ImageKit upload for development');
                await new Promise(resolve => setTimeout(resolve, 1000));
                const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
                const mockUrl = `https://ik.imagekit.io/mock-id/${fileName}`;
                console.log('Mock ImageKit upload successful:', mockUrl);
                return mockUrl;
            }

            // Real ImageKit upload
            const result = await this.imagekit.upload({
                file: file.buffer,
                fileName: `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`,
                folder: folder,
                useUniqueFileName: true,
                responseFields: ['url', 'fileId', 'name']
            });

            console.log('ImageKit upload successful:', result.url);
            return result.url;
        } catch (error) {
            console.error('ImageKit upload error:', error);
            throw new Error('Failed to upload image');
        }
    }

    // Get optimized image URL with transformations
    getOptimizedUrl(originalUrl, options = {}) {
        try {
            const {
                width,
                height,
                quality = 80,
                format = 'auto',
                crop = 'maintain_ratio'
            } = options;

            let transformationString = '';

            if (width) transformationString += `w-${width}`;
            if (height) transformationString += `,h-${height}`;
            if (quality) transformationString += `,q-${quality}`;
            if (format) transformationString += `,f-${format}`;
            if (crop) transformationString += `,c-${crop}`;

            if (transformationString) {
                const separator = originalUrl.includes('?') ? '&' : '?';
                return `${originalUrl}${separator}tr=${transformationString}`;
            }

            return originalUrl;
        } catch (error) {
            console.error('Error generating optimized URL:', error);
            return originalUrl;
        }
    }

    // Delete image from ImageKit
    async deleteImage(fileId) {
        try {
            if (process.env.IMAGEKIT_PUBLIC_KEY === 'public_placeholder') {
                console.log('Mock ImageKit delete for development');
                return true;
            }

            await this.imagekit.deleteFile(fileId);
            console.log('ImageKit delete successful:', fileId);
            return true;
        } catch (error) {
            console.error('ImageKit delete error:', error);
            throw new Error('Failed to delete image');
        }
    }

    // Get authentication parameters for client-side uploads
    getAuthenticationParameters() {
        try {
            if (!process.env.IMAGEKIT_PUBLIC_KEY ||
                process.env.IMAGEKIT_PUBLIC_KEY === 'public_placeholder' ||
                process.env.IMAGEKIT_PUBLIC_KEY === 'your_imagekit_public_key') {
                return {
                    token: 'mock-token',
                    signature: 'mock-signature',
                    expire: Date.now() + 3600000, // 1 hour
                    publicKey: 'public_placeholder'
                };
            }

            return this.imagekit.getAuthenticationParameters();
        } catch (error) {
            console.error('Error getting authentication parameters:', error);
            throw new Error('Failed to get authentication parameters');
        }
    }

    // Generate thumbnail URL
    getThumbnailUrl(originalUrl, size = 200) {
        return this.getOptimizedUrl(originalUrl, {
            width: size,
            height: size,
            quality: 70,
            format: 'auto',
            crop: 'maintain_ratio'
        });
    }

    // Generate mobile-optimized URL
    getMobileUrl(originalUrl, maxWidth = 800) {
        return this.getOptimizedUrl(originalUrl, {
            width: maxWidth,
            quality: 75,
            format: 'auto',
            crop: 'maintain_ratio'
        });
    }
}

module.exports = new ImageKitService();
