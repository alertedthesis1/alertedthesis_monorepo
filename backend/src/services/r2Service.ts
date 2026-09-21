import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const r2Service = {
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: body,
        ContentType: contentType,
      });
      await r2Client.send(command);
      return `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;
    } catch (error) {
      console.error('Error uploading file to R2:', error);
      throw error;
    }
  },

  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      });
      const response = await r2Client.send(command);
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error getting file from R2:', error);
      throw error;
    }
  },

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      });
      await r2Client.send(command);
    } catch (error) {
      console.error('Error deleting file from R2:', error);
      throw error;
    }
  },

  async getFileUrl(key: string): Promise<string> {
    return `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;
  }
};