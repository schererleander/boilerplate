import { Client } from 'minio'
import { Readable } from 'stream'

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT_HOST || 'localhost',
  port: parseInt(process.env.MINIO_ENDPOINT_PORT || '9000', 10),
  useSSL: false, //INFO: Set to true if using HTTPS
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
})

const BUCKET_NAME = 'storage'

export async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME)
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1')
      console.log(`Created bucket: ${BUCKET_NAME}`)
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error)
    throw error
  }
}

export async function uploadToMinio(
  key: string, 
  buffer: Buffer, 
  contentType: string
): Promise<string> {
  try {
    await ensureBucketExists()
    
    const stream = Readable.from(buffer)
    
    await minioClient.putObject(BUCKET_NAME, key, stream, buffer.length, {
      'Content-Type': contentType,
      'Cache-Control': 'max-age=31536000', // 1 year cache
    })
    
    const url = `${process.env.MINIO_ENDPOINT ? `http://${process.env.MINIO_ENDPOINT}:9000` : 'http://localhost:9000'}/${BUCKET_NAME}/${key}`
    
    return url
  } catch (error) {
    console.error('Error uploading to MinIO:', error)
    throw error
  }
}

export async function deleteFromMinio(key: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, key)
    console.log(`Deleted file: ${key}`)
  } catch (error) {
    console.error('Error deleting from MinIO:', error)
    throw error
  }
}

export async function getPresignedUploadUrl(
  key: string, 
  expiresIn: number = 3600
): Promise<string> {
  try {
    await ensureBucketExists()
    return await minioClient.presignedPutObject(BUCKET_NAME, key, expiresIn)
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    throw error
  }
}

export async function getFileInfo(key: string) {
  try {
    return await minioClient.statObject(BUCKET_NAME, key)
  } catch (error) {
    console.error('Error getting file info:', error)
    throw error
  }
}

export default minioClient
