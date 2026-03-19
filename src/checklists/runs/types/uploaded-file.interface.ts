/**
 * Minimal interface for multipart file upload.
 * Matches Express.Multer.File when using memory storage.
 */
export interface EvidenceUploadFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
