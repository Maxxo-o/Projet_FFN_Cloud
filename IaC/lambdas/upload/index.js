const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configuration S3 pour LocalStack
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:4566',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  region: 'us-east-1'
});

exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const bucketName = process.env.BUCKET_IMAGES;
    const body = event.body;
    const isBase64 = event.isBase64Encoded;
    
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ error: 'No file data provided' })
      };
    }
    
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileName = `image-${timestamp}.jpg`;
    
    // Décoder le body si nécessaire
    const fileBuffer = isBase64 ? Buffer.from(body, 'base64') : Buffer.from(body);
    
    // Upload vers S3
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: 'image/jpeg'
    };
    
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);
    
    // Construire l'URL publique
    const publicUrl = `${process.env.S3_PUBLIC_URL}/${fileName}`;
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: 'File uploaded successfully',
        fileName: fileName,
        publicUrl: publicUrl
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};