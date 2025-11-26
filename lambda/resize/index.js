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
  console.log('=== DEBUT DEBUG ===');
  console.log('Event reçu:', JSON.stringify(event, null, 2));
  console.log('=== FIN EVENT ===');
  
  try {
    // Parse du body avec gestion d'erreurs robuste
    let body;
    
    console.log('Type de body:', typeof event.body);
    console.log('Contenu du body brut:', event.body);
    console.log('Longueur du body:', event.body ? event.body.length : 'null/undefined');
    
    // Vérification si le body est null ou undefined
    if (event.body === null || event.body === undefined) {
      console.log('ERREUR: Body est null ou undefined');
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Body null ou undefined'
        })
      };
    }
    
    if (typeof event.body === 'string') {
      console.log('Body est une string, longueur:', event.body.length);
      
      if (!event.body || event.body.trim() === '') {
        console.log('ERREUR: Body vide');
        return {
          statusCode: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Body vide ou invalide'
          })
        };
      }
      
      console.log('Tentative de parsing JSON...');
      try {
        body = JSON.parse(event.body);
        console.log('Parsing JSON réussi:', body);
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError);
        console.error('Body qui a causé l\'erreur:', event.body);
        return {
          statusCode: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: `Erreur de parsing JSON: ${parseError.message}`,
            receivedBody: event.body ? event.body.substring(0, 100) : 'null'
          })
        };
      }
    } else {
      console.log('Body n\'est pas une string, type:', typeof event.body);
      body = event.body || {};
    }
    
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
      Bucket: 'ffn-nextjs-assets-bucket',
      Key: s3Key,
      Body: buffer,
      ContentType: `image/${format}`,
      ACL: 'public-read'
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('Upload S3 réussi:', uploadResult.Location);

    const s3Url = `http://localhost:4566/ffn-nextjs-assets-bucket/${s3Key}`;

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