// lib/upload/index.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import config from '../config/index.js';
import { logger } from '../logger.js';
import { ValidationError } from '../errors.js';

const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const unlink = promisify(fs.unlink);

export class FileUploadService {
  constructor() {
    this.uploadDir = config.upload.uploadDir;
    this.tempDir = config.upload.tempDir;
    this.maxSize = config.upload.maxSize;
    this.allowedTypes = config.upload.allowedTypes;

    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await access(this.uploadDir);
    } catch {
      await mkdir(this.uploadDir, { recursive: true });
      logger.info(`Created upload directory: ${this.uploadDir}`);
    }

    try {
      await access(this.tempDir);
    } catch {
      await mkdir(this.tempDir, { recursive: true });
      logger.info(`Created temp directory: ${this.tempDir}`);
    }
  }

  generateFileName(originalName) {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    return `${Date.now()}-${hash}${ext}`;
  }

  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
    }

    if (file.size > this.maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.maxSize} bytes`);
    }

    if (!this.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${this.allowedTypes.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new ValidationError('File validation failed', { errors });
    }

    return true;
  }

  async processUpload(file, options = {}) {
    try {
      this.validateFile(file);

      const fileName = this.generateFileName(file.name);
      const uploadPath = path.join(this.uploadDir, fileName);

      // Convert file buffer to readable stream and save
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.promises.writeFile(uploadPath, buffer);

      const fileInfo = {
        originalName: file.name,
        fileName,
        size: file.size,
        type: file.type,
        path: uploadPath,
        url: `/uploads/${fileName}`,
        uploadedAt: new Date()
      };

      logger.info('File uploaded successfully', {
        fileName: fileInfo.fileName,
        size: fileInfo.size,
        type: fileInfo.type
      });

      return fileInfo;
    } catch (error) {
      logger.error('File upload failed', { error, fileName: file.name });
      throw error;
    }
  }

  async deleteFile(fileName) {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      await access(filePath);
      await unlink(filePath);

      logger.info('File deleted successfully', { fileName });
      return true;
    } catch (error) {
      logger.error('File deletion failed', { error, fileName });
      throw error;
    }
  }

  async cleanupTempFiles() {
    try {
      const files = await fs.promises.readdir(this.tempDir);

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.promises.stat(filePath);

        // Delete files older than 1 hour
        if (Date.now() - stats.mtime.getTime() > 60 * 60 * 1000) {
          await unlink(filePath);
          logger.debug('Cleaned up temp file', { fileName: file });
        }
      }
    } catch (error) {
      logger.error('Temp file cleanup failed', { error });
    }
  }

  // Image processing utilities
  async resizeImage(filePath, width, height, quality = 80) {
    // In a real implementation, you would use a library like sharp
    // For now, we'll just return the original file info
    logger.info('Image resize requested', { filePath, width, height });

    return {
      originalPath: filePath,
      resizedPath: filePath, // Would be different in real implementation
      width,
      height,
      quality
    };
  }

  async compressImage(filePath, quality = 80) {
    // In a real implementation, you would use a library like sharp
    logger.info('Image compression requested', { filePath, quality });

    return {
      originalPath: filePath,
      compressedPath: filePath, // Would be different in real implementation
      quality
    };
  }

  // File type detection
  getFileType(fileName) {
    const ext = path.extname(fileName).toLowerCase();

    const typeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    return typeMap[ext] || 'application/octet-stream';
  }

  // File size formatting
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const fileUploadService = new FileUploadService();

// lib/upload/middleware.js
export const uploadMiddleware = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Validate file
  try {
    fileUploadService.validateFile(req.file);
    next();
  } catch (error) {
    next(error);
  }
};

// lib/upload/cloudStorage.js (for future cloud storage integration)
export class CloudStorageService {
  constructor() {
    this.bucket = config.services.s3.bucket;
    this.region = config.services.s3.region;
  }

  async uploadToCloud(filePath, fileName) {
    // Mock implementation - would integrate with AWS S3, Google Cloud, etc.
    logger.info('Cloud storage upload requested', { filePath, fileName });

    return {
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`,
      key: fileName,
      bucket: this.bucket
    };
  }

  async deleteFromCloud(key) {
    // Mock implementation
    logger.info('Cloud storage deletion requested', { key });

    return true;
  }
}

export const cloudStorageService = new CloudStorageService();
