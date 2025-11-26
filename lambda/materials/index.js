const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:4566",
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
  console.log("Event:", JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path;
  const pathParameters = event.pathParameters;

  try {
    // GET /materials - Liste tous les matériels
    if (method === "GET" && !pathParameters?.id) {
      const result = await dynamoDb.send(
        new ScanCommand({ TableName: MATERIALS_TABLE })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: result.Items || [] }),
      };
    }

    // GET /materials/{id} - Récupère un matériel
    if (method === "GET" && pathParameters?.id) {
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
    }

    // POST /materials - Crée un matériel
    if (method === "POST" && !pathParameters?.id) {
      const body = JSON.parse(event.body);

      if (!body.name || !body.category || !body.location || !body.status || !body.condition || body.quantity === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Champs requis manquants" }),
        };
      }

      const material = {
        id: uuidv4(),
        ...body,
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
    }

    // PUT /materials/{id} - Met à jour un matériel
    if (method === "PUT" && pathParameters?.id) {
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

      if (updateExpressions.length === 0) {
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
    }

    // DELETE /materials/{id} - Supprime un matériel
    if (method === "DELETE" && pathParameters?.id) {
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
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Route non trouvée" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};