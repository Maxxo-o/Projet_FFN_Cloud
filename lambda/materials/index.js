const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: process.env.AWS_ENDPOINT_URL || "http://host.docker.internal:4566",
});

const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const MATERIALS_TABLE = "Materials";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

exports.handler = async (event) => {
  try {
    console.log("Event reçu:", JSON.stringify(event, null, 2));

    const method = event.httpMethod;
    const path = event.path;
    
    // Extraire l'ID depuis le path
    const pathParts = path.split('/');
    const id = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;

    console.log(`Requête: ${method} ${path}, ID extrait: ${id}`);

    // OPTIONS pour CORS
    if (method === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({}),
      };
    }

    // GET /materials - Liste tous les matériels  
    if (method === "GET" && !id) {
      console.log("Tentative de scan de la table:", MATERIALS_TABLE);

      try {
        // Première tentative
        const result = await dynamoDb.send(
          new ScanCommand({
            TableName: MATERIALS_TABLE,
            ConsistentRead: true
          })
        );

        console.log("Scan réussi, nombre d'items:", result.Items?.length || 0);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: result.Items || [],
            count: result.Items ? result.Items.length : 0
          }),
        };
      } catch (dynamoError) {
        console.error("Erreur DynamoDB (première tentative):", {
          message: dynamoError.message,
          code: dynamoError.name,
          endpoint: config.endpoint,
          table: MATERIALS_TABLE
        });

        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur DynamoDB",
            details: dynamoError.message,
            endpoint: config.endpoint,
            table: MATERIALS_TABLE
          }),
        };
      }
    }

    // GET /materials/{id} - Récupère un matériel
    if (method === "GET" && id) {
      try {
        const result = await dynamoDb.send(
          new GetCommand({
            TableName: MATERIALS_TABLE,
            Key: { id: id },
          })
        );

        if (!result.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Matériel non trouvé" }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: result.Item }),
        };
      } catch (dynamoError) {
        console.error("Erreur DynamoDB GET:", dynamoError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la récupération",
            details: dynamoError.message
          }),
        };
      }
    }

    // POST /materials - Crée un matériel
    if (method === "POST") {
      try {
        const body = JSON.parse(event.body || '{}');

        if (!body.name || !body.category || !body.location || body.quantity === undefined) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: "Champs requis manquants: name, category, location, quantity"
            }),
          };
        }

        const material = {
          id: uuidv4(),
          name: body.name,
          category: body.category,
          subcategory: body.subcategory || undefined,
          serialNumber: body.serialNumber || undefined,
          location: body.location,
          status: body.status || 'disponible',
          condition: body.condition || 'bon',
          purchaseDate: body.purchaseDate || undefined,
          value: body.value || undefined,
          description: body.description || undefined,
          brand: body.brand || undefined,
          model: body.model || undefined,
          reference: body.reference || undefined,
          associatedTo: body.associatedTo || undefined,
          responsible: body.responsible || undefined,
          usage: body.usage || undefined,
          observations: body.observations || undefined,
          quantity: body.quantity || 1,
          loanedQuantity: body.loanedQuantity || 0,
          images: body.images || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDb.send(
          new PutCommand({
            TableName: MATERIALS_TABLE,
            Item: material,
          })
        );

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ data: material }),
        };
      } catch (error) {
        console.error("Erreur lors de la création:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la création du matériel",
            details: error.message
          }),
        };
      }
    }

    // PUT /materials/{id} - Met à jour un matériel
    if (method === "PUT" && id) {
      try {
        const body = JSON.parse(event.body || '{}');

        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        // Construire la requête de mise à jour dynamiquement
        Object.keys(body).forEach(key => {
          if (key !== 'id') {
            updateExpression.push(`#${key} = :${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = body[key];
          }
        });

        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';

        await dynamoDb.send(
          new UpdateCommand({
            TableName: MATERIALS_TABLE,
            Key: { id: id },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW",
          })
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "Matériel mis à jour avec succès"
          }),
        };
      } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la mise à jour du matériel",
            details: error.message
          }),
        };
      }
    }

    // DELETE /materials/{id} - Supprime un matériel
    if (method === "DELETE" && id) {
      try {
        await dynamoDb.send(
          new DeleteCommand({
            TableName: MATERIALS_TABLE,
            Key: { id: id },
          })
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "Matériel supprimé avec succès"
          }),
        };
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la suppression du matériel",
            details: error.message
          }),
        };
      }
    }

    // Route non trouvée
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: "Route non trouvée",
        method: method,
        path: path,
        availableRoutes: [
          "GET /materials",
          "GET /materials/{id}",
          "POST /materials",
          "PUT /materials/{id}",
          "DELETE /materials/{id}"
        ]
      }),
    };

  } catch (error) {
    console.error("Erreur générale:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Erreur interne du serveur",
        details: error.message
      }),
    };
  }
};