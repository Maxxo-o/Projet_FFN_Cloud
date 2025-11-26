const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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
    
    const bucketName = "ffn-images-bucket"; // Bucket pour les images
    let fileName;
    
    // Récupérer le nom du fichier depuis le body ou les paramètres de la requête
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        fileName = body.fileName;
      } catch (e) {
        // Si le body n'est pas du JSON, on essaie de l'utiliser directement
        fileName = event.body;
      }
    }
    
    // Ou depuis les path parameters (/delete/{fileName})
    if (!fileName && event.pathParameters && event.pathParameters.fileName) {
      fileName = event.pathParameters.fileName;
    }
    
    // Ou depuis les query parameters (?fileName=...)
    if (!fileName && event.queryStringParameters && event.queryStringParameters.fileName) {
      fileName = event.queryStringParameters.fileName;
    }
    
    if (!fileName) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'fileName is required',
          usage: 'Send fileName in body, path parameter, or query parameter'
        })
      };
    }
    
    // Nettoyer le nom de fichier (enlever l'URL complète si fournie)
    if (fileName.includes('/')) {
      fileName = fileName.split('/').pop();
    }
    
    console.log(`Attempting to delete file: ${fileName} from bucket: ${bucketName}`);
    
    // Supprimer le fichier de S3
    const deleteParams = {
      Bucket: bucketName,
      Key: fileName
    };
    
    const command = new DeleteObjectCommand(deleteParams);
    await s3.send(command);
    
    console.log(`File ${fileName} deleted successfully`);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
      },
      body: JSON.stringify({
        message: 'File deleted successfully',
        fileName: fileName,
        bucket: bucketName
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};