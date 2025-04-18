import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { downloadFile } from "./download-utils";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Downloads a file from a given URI and uploads it to S3
 * @param downloadURI - The URI to download the file from
 * @param s3Key - The key (path) where the file will be stored in S3
 * @returns Promise<string> - The S3 URL where the file was uploaded
 */
export async function processAndUploadFileToS3(
  downloadURI: string,
  s3Key: string
) {
  const { buffer, extension, contentType } = await downloadFile(downloadURI);

  const keyWithExtension = await uploadToS3(
    s3Key,
    buffer,
    extension ?? "",
    contentType
  );

  return {
    keyWithExtension,
    buffer,
  };
}

/**
 * Uploads a file to S3
 * @param key - The key (path) where the file will be stored in S3
 * @param body - The file to upload
 * @param extension - The extension of the file
 * @param contentType - The content type of the file
 * @returns Promise<string> - The S3 URL where the file was uploaded
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  extension: string,
  contentType: string
): Promise<string> {
  const keyWithExtension = `${key}.${extension}`;
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: keyWithExtension,
    Body: body,
    ContentType: contentType,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  return keyWithExtension;
}

export async function getS3ObjectStream(s3Key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
  });

  return await s3Client.send(command);
}

/**
 * Deletes a file from S3 using its URL
 * @param key - The key (path) of the file to delete in S3
 */
export async function deleteFileFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export const hasAWSCredentials =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_BUCKET_NAME &&
  !!process.env.AWS_REGION;
