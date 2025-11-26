const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:4566",
});

const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const LOANS_TABLE = "Loans";

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

    // GET /loans - Liste tous les prêts
    if (method === "GET" && !id) {
      try {
        const result = await dynamoDb.send(
          new ScanCommand({ TableName: LOANS_TABLE })
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: result.Items || [],
            count: result.Items ? result.Items.length : 0
          }),
        };
      } catch (dynamoError) {
        console.error("Erreur DynamoDB:", dynamoError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur DynamoDB",
            details: dynamoError.message
          }),
        };
      }
    }

    // GET /loans/{id} - Récupère un prêt
    if (method === "GET" && id) {
      try {
        const result = await dynamoDb.send(
          new GetCommand({
            TableName: LOANS_TABLE,
            Key: { id: id },
          })
        );

        if (!result.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Prêt non trouvé" }),
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

    // POST /loans - Crée un prêt
    if (method === "POST") {
      try {
        const body = JSON.parse(event.body || '{}');

        if (!body.materialId || !body.userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: "Champs requis manquants: materialId, userId" 
            }),
          };
        }

        const loan = {
          id: uuidv4(),
          materialId: body.materialId,
          materialName: body.materialName || '',
          userId: body.userId,
          userName: body.userName || '',
          userEmail: body.userEmail || '',
          quantity: body.quantity || 1,
          loanDate: body.loanDate || new Date().toISOString(),
          expectedReturnDate: body.expectedReturnDate || '',
          actualReturnDate: body.actualReturnDate || null,
          status: body.status || 'active',
          notes: body.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDb.send(
          new PutCommand({
            TableName: LOANS_TABLE,
            Item: loan,
          })
        );

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ data: loan }),
        };
      } catch (error) {
        console.error("Erreur lors de la création:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la création du prêt",
            details: error.message
          }),
        };
      }
    }

    // PUT /loans/{id} - Met à jour un prêt
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
            TableName: LOANS_TABLE,
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
            message: "Prêt mis à jour avec succès"
          }),
        };
      } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la mise à jour du prêt",
            details: error.message
          }),
        };
      }
    }

    // DELETE /loans/{id} - Supprime un prêt
    if (method === "DELETE" && id) {
      try {
        await dynamoDb.send(
          new DeleteCommand({
            TableName: LOANS_TABLE,
            Key: { id: id },
          })
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "Prêt supprimé avec succès"
          }),
        };
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la suppression du prêt",
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
          "GET /loans",
          "GET /loans/{id}",
          "POST /loans",
          "PUT /loans/{id}",
          "DELETE /loans/{id}"
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