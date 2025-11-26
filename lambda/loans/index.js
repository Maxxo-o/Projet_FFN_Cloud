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

const LOANS_TABLE = process.env.LOANS_TABLE || "Loans";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event));

  const method = event.httpMethod;
  const pathParameters = event.pathParameters;

  try {
    // GET /loans - Liste tous les prêts
    if (method === "GET" && !pathParameters?.id) {
      const result = await dynamoDb.send(
        new ScanCommand({ TableName: LOANS_TABLE })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: result.Items || [] }),
      };
    }

    // GET /loans/{id} - Récupère un prêt
    if (method === "GET" && pathParameters?.id) {
      const result = await dynamoDb.send(
        new GetCommand({
          TableName: LOANS_TABLE,
          Key: { id: pathParameters.id },
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
    }

    // POST /loans - Crée un prêt
    if (method === "POST" && !pathParameters?.id) {
      const body = JSON.parse(event.body);

      if (!body.materialId || !body.borrowerName || !body.borrowerContact ||
          !body.loanDate || !body.expectedReturnDate || !body.conditionAtLoan ||
          body.quantity === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Champs requis manquants" }),
        };
      }

      const loan = {
        id: uuidv4(),
        ...body,
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
    }

    // PUT /loans/{id} - Met à jour un prêt
    if (method === "PUT" && pathParameters?.id) {
      const body = JSON.parse(event.body);

      const existing = await dynamoDb.send(
        new GetCommand({
          TableName: LOANS_TABLE,
          Key: { id: pathParameters.id },
        })
      );

      if (!existing.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Prêt non trouvé" }),
        };
      }

      const updateExpressions = [];
      const expressionAttrNames = {};
      const expressionAttrValues = {};

      const fields = [
        "materialId", "quantity", "borrowerName", "borrowerContact",
        "loanDate", "expectedReturnDate", "actualReturnDate",
        "notes", "conditionAtLoan", "conditionAtReturn"
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
          TableName: LOANS_TABLE,
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

    // DELETE /loans/{id} - Supprime un prêt
    if (method === "DELETE" && pathParameters?.id) {
      await dynamoDb.send(
        new DeleteCommand({
          TableName: LOANS_TABLE,
          Key: { id: pathParameters.id },
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Prêt supprimé avec succès" }),
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