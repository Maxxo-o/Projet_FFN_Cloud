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

const LOANS_TABLE = process.env.LOANS_TABLE || "Loans";

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
      LOANS_TABLE: process.env.LOANS_TABLE,
      LOCALSTACK_HOSTNAME: process.env.LOCALSTACK_HOSTNAME
    });

    const method = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters;

    console.log(`Requête: ${method} ${path}`);

    // GET /loans - Liste tous les prêts
    if (method === "GET" && !pathParameters?.id) {
      try {
        console.log("Tentative de scan de la table:", LOANS_TABLE);

        const result = await dynamoDb.send(
          new ScanCommand({ TableName: LOANS_TABLE })
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

    // GET /loans/{id} - Récupère un prêt
    if (method === "GET" && pathParameters?.id) {
      try {
        console.log("Récupération du prêt ID:", pathParameters.id);

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
    if (method === "POST" && !pathParameters?.id) {
      try {
        console.log("Création d'un nouveau prêt");
        console.log("Body reçu:", event.body);

        const body = JSON.parse(event.body);

        if (!body.materialId || !body.borrowerName || !body.borrowerContact ||
            !body.loanDate || !body.expectedReturnDate || !body.conditionAtLoan ||
            body.quantity === undefined) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Champs requis manquants: materialId, borrowerName, borrowerContact, loanDate, expectedReturnDate, conditionAtLoan, quantity" }),
          };
        }

        const loan = {
          id: uuidv4(),
          ...body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log("Prêt à créer:", JSON.stringify(loan, null, 2));

        await dynamoDb.send(
          new PutCommand({
            TableName: LOANS_TABLE,
            Item: loan,
          })
        );

        console.log("Prêt créé avec succès");

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
    if (method === "PUT" && pathParameters?.id) {
      try {
        console.log("Mise à jour du prêt ID:", pathParameters.id);

        const body = JSON.parse(event.body);

        // Vérifier si le prêt existe
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

    // DELETE /loans/{id} - Supprime un prêt
    if (method === "DELETE" && pathParameters?.id) {
      try {
        console.log("Suppression du prêt ID:", pathParameters.id);

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
