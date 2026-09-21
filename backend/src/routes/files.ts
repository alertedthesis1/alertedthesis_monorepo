import { Router, Request, Response } from 'express';
import { r2Service } from '../services/r2Service';
import multer, { FileFilterCallback } from 'multer';

const router = Router();

// Configure multer for memory storage (R2 requires Buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Upload file to R2
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const reqWithFile = req as any; // Type assertion for multer
    if (!reqWithFile.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = reqWithFile.file;
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${originalname}`;
    
    // Upload to R2
    const fileUrl = await r2Service.uploadFile(filename, buffer, mimetype);
    
    res.json({
      message: 'File uploaded successfully',
      filename,
      url: fileUrl,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get file from R2
router.get('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    const fileBuffer = await r2Service.getFile(filename);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// Delete file from R2
router.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    await r2Service.deleteFile(filename);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get file URL (public access)
router.get('/url/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    const fileUrl = await r2Service.getFileUrl(filename);
    
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error getting file URL:', error);
    res.status(500).json({ error: 'Failed to get file URL' });
  }
});

export default router;