const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || process.env.AWS_ENDPOINT_URL || "http://172.20.0.2:4566",
});

const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const MATERIALS_TABLE = process.env.MATERIALS_TABLE || "Materials";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

exports.handler = async (event) => {
  try {
    console.log("Event reçu:", JSON.stringify(event, null, 2));
    console.log("Variables d'environnement:", {
      AWS_REGION: process.env.AWS_REGION,
      DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
      AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,
      MATERIALS_TABLE: process.env.MATERIALS_TABLE,
      LOCALSTACK_HOSTNAME: process.env.LOCALSTACK_HOSTNAME
    });

    const method = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters;

    console.log(`Requête: ${method} ${path}`);

    // GET /materials - Liste tous les matériels
    if (method === "GET" && !pathParameters?.id) {
      try {
        console.log("Tentative de scan de la table:", MATERIALS_TABLE);

        const result = await dynamoDb.send(
          new ScanCommand({ TableName: MATERIALS_TABLE })
        );

        console.log("Résultat DynamoDB:", JSON.stringify(result, null, 2));

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

    // GET /materials/{id} - Récupère un matériel
    if (method === "GET" && pathParameters?.id) {
      try {
        console.log("Récupération du matériel ID:", pathParameters.id);

        const result = await dynamoDb.send(
          new GetCommand({
            TableName: MATERIALS_TABLE,
            Key: { id: pathParameters.id },
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
    if (method === "POST" && !pathParameters?.id) {
      try {
        console.log("Création d'un nouveau matériel");
        console.log("Body reçu:", event.body);

        const body = JSON.parse(event.body);

        if (!body.name || !body.category || !body.location || !body.status || !body.condition || body.quantity === undefined) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Champs requis manquants: name, category, location, status, condition, quantity" }),
          };
        }

        const material = {
          id: uuidv4(),
          ...body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log("Matériel à créer:", JSON.stringify(material, null, 2));

        await dynamoDb.send(
          new PutCommand({
            TableName: MATERIALS_TABLE,
            Item: material,
          })
        );

        console.log("Matériel créé avec succès");

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
    if (method === "PUT" && pathParameters?.id) {
      try {
        console.log("Mise à jour du matériel ID:", pathParameters.id);

        const body = JSON.parse(event.body);

        // Vérifier si le matériel existe
        const existing = await dynamoDb.send(
          new GetCommand({
            TableName: MATERIALS_TABLE,
            Key: { id: pathParameters.id },
          })
        );

        if (!existing.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Matériel non trouvé" }),
          };
        }

        const updateExpressions = [];
        const expressionAttrNames = {};
        const expressionAttrValues = {};

        const fields = [
          "name", "category", "subcategory", "serialNumber", "location",
          "status", "condition", "purchaseDate", "value", "description",
          "brand", "model", "reference", "associatedTo", "responsible",
          "usage", "observations", "quantity", "loanedQuantity", "images"
        ];

        fields.forEach((key) => {
          if (body[key] !== undefined) {
            updateExpressions.push(`#${key} = :${key}`);
            expressionAttrNames[`#${key}`] = key;
            expressionAttrValues[`:${key}`] = body[key];
          }
        });

        // Toujours mettre à jour updatedAt
        updateExpressions.push(`#updatedAt = :updatedAt`);
        expressionAttrNames[`#updatedAt`] = "updatedAt";
        expressionAttrValues[`:updatedAt`] = new Date().toISOString();

        if (updateExpressions.length === 1) { // Seulement updatedAt
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ data: existing.Item }),
          };
        }

        const result = await dynamoDb.send(
          new UpdateCommand({
            TableName: MATERIALS_TABLE,
            Key: { id: pathParameters.id },
            UpdateExpression: `SET ${updateExpressions.join(", ")}`,
            ExpressionAttributeNames: expressionAttrNames,
            ExpressionAttributeValues: expressionAttrValues,
            ReturnValues: "ALL_NEW",
          })
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: result.Attributes }),
        };
      } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la mise à jour",
            details: error.message
          }),
        };
      }
    }

    // DELETE /materials/{id} - Supprime un matériel
    if (method === "DELETE" && pathParameters?.id) {
      try {
        console.log("Suppression du matériel ID:", pathParameters.id);

        await dynamoDb.send(
          new DeleteCommand({
            TableName: MATERIALS_TABLE,
            Key: { id: pathParameters.id },
          })
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Matériel supprimé avec succès" }),
        };
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Erreur lors de la suppression",
            details: error.message
          }),
        };
      }
    }

    // Route non trouvée
    console.log("Route non trouvée:", { method, path, pathParameters });
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: "Route non trouvée",
        method: method,
        path: path,
        pathParameters: pathParameters
      }),
    };

  } catch (error) {
    console.error("Erreur générale:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Erreur interne du serveur",
        details: error.message,
        stack: error.stack
      }),
    };
  }
};