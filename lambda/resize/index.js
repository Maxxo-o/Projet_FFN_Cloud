const AWS = require('aws-sdk');

// Configuration pour LocalStack
const s3 = new AWS.S3({
  endpoint: 'http://localstack:4566',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  region: 'us-east-1',
  s3ForcePathStyle: true
});

exports.handler = async (event) => {
  console.log('Event reçu:', JSON.stringify(event, null, 2));
  
  try {
    // Parse du body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { imageData, width = 800, height = 600, format = 'jpeg', quality = 80 } = body;

    if (!imageData) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'imageData requis'
        })
      };
    }

    // Extraire les données base64
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log(`Taille originale: ${buffer.length} bytes`);

    // Pour LocalStack, on va juste simuler le redimensionnement
    // et sauvegarder l'image originale
    const timestamp = Date.now();
    const s3Key = `resized/${timestamp}_${width}x${height}.${format}`;
    
    // Upload vers S3 (LocalStack)
    const uploadParams = {
      Bucket: 'nextjs-assets',
      Key: s3Key,
      Body: buffer,
      ContentType: `image/${format}`,
      ACL: 'public-read'
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('Upload S3 réussi:', uploadResult.Location);

    const s3Url = `http://localhost:4566/nextjs-assets/${s3Key}`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Image traitée avec succès',
          originalSize: buffer.length,
          resizedSize: buffer.length, // Simulé pour LocalStack
          dimensions: { width, height },
          format,
          quality,
          s3Key,
          s3Url
        }
      })
    };

  } catch (error) {
    console.error('Erreur Lambda:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};