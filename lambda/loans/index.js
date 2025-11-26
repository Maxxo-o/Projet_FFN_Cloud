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

const LOANS_TABLE = "Loans";
const MATERIALS_TABLE = "Materials";

// Fonction pour sanitiser un prêt et éviter les erreurs frontend
function sanitizeLoan(loan) {
  if (!loan) return null;

  return {
    ...loan,
    actualReturnDate: loan.actualReturnDate || null,
    conditionAtReturn: loan.conditionAtReturn || null,
    notes: loan.notes || null,
    subcategory: loan.subcategory || null,
    serialNumber: loan.serialNumber || null,
    purchaseDate: loan.purchaseDate || null,
    value: loan.value || null,
    description: loan.description || null,
    brand: loan.brand || null,
    model: loan.model || null,
    reference: loan.reference || null,
    associatedTo: loan.associatedTo || null,
    responsible: loan.responsible || null,
    usage: loan.usage || null,
    observations: loan.observations || null,
    images: loan.images || []
  };
}

// Fonction pour mettre à jour la quantité prêtée d'un matériel
async function updateMaterialLoanedQuantity(materialId, quantityChange) {
  try {
    // D'abord, récupérer le matériel actuel
    const getMaterial = await dynamoDb.send(
      new GetCommand({
        TableName: MATERIALS_TABLE,
        Key: { id: materialId },
      })
    );

    if (!getMaterial.Item) {
      console.error(`Matériel non trouvé: ${materialId}`);
      return false;
    }

    const currentLoanedQuantity = getMaterial.Item.loanedQuantity || 0;
    const newLoanedQuantity = Math.max(0, currentLoanedQuantity + quantityChange);

    // Mettre à jour la quantité prêtée
    await dynamoDb.send(
      new UpdateCommand({
        TableName: MATERIALS_TABLE,
        Key: { id: materialId },
        UpdateExpression: "SET loanedQuantity = :newQuantity, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":newQuantity": newLoanedQuantity,
          ":updatedAt": new Date().toISOString()
        },
      })
    );

    console.log(`Quantité prêtée mise à jour pour ${materialId}: ${currentLoanedQuantity} -> ${newLoanedQuantity}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la quantité prêtée:", error);
    return false;
  }
}

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
      console.log("Tentative de scan de la table:", LOANS_TABLE);

      try {
        // Première tentative
        const result = await dynamoDb.send(
          new ScanCommand({
            TableName: LOANS_TABLE,
            ConsistentRead: true
          })
        );

        console.log("Scan réussi, nombre d'items:", result.Items?.length || 0);

        // Sanitiser tous les prêts pour éviter les erreurs frontend
        const sanitizedLoans = (result.Items || []).map(sanitizeLoan).filter(Boolean);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: sanitizedLoans,
            count: sanitizedLoans.length
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

        // Sanitiser le prêt pour éviter les erreurs frontend
        const sanitizedLoan = sanitizeLoan(result.Item);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: sanitizedLoan }),
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

        if (!body.materialId || !body.quantity || !body.borrowerName || !body.borrowerContact || !body.loanDate || !body.expectedReturnDate || !body.conditionAtLoan) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: "Champs requis manquants: materialId, quantity, borrowerName, borrowerContact, loanDate, expectedReturnDate, conditionAtLoan"
            }),
          };
        }

        const loan = {
          id: uuidv4(),
          materialId: body.materialId,
          quantity: body.quantity,
          borrowerName: body.borrowerName,
          borrowerContact: body.borrowerContact,
          loanDate: body.loanDate,
          expectedReturnDate: body.expectedReturnDate,
          actualReturnDate: body.actualReturnDate || undefined,
          notes: body.notes || undefined,
          conditionAtLoan: body.conditionAtLoan,
          conditionAtReturn: body.conditionAtReturn || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dynamoDb.send(
          new PutCommand({
            TableName: LOANS_TABLE,
            Item: loan,
          })
        );

        // Mettre à jour la quantité prêtée du matériel
        await updateMaterialLoanedQuantity(body.materialId, body.quantity);

        // Sanitiser le prêt créé pour éviter les erreurs frontend
        const sanitizedLoan = sanitizeLoan(loan);

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ data: sanitizedLoan }),
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

        // D'abord récupérer le prêt actuel pour vérifier les changements de quantité
        const getCurrentLoan = await dynamoDb.send(
          new GetCommand({
            TableName: LOANS_TABLE,
            Key: { id: id },
          })
        );

        if (!getCurrentLoan.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Prêt non trouvé" }),
          };
        }

        const currentLoan = getCurrentLoan.Item;

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

        const updateResult = await dynamoDb.send(
          new UpdateCommand({
            TableName: LOANS_TABLE,
            Key: { id: id },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW",
          })
        );

        // Si la quantité a changé, mettre à jour la quantité prêtée du matériel
        if (body.quantity !== undefined && body.quantity !== currentLoan.quantity) {
          const quantityDifference = body.quantity - currentLoan.quantity;
          await updateMaterialLoanedQuantity(currentLoan.materialId, quantityDifference);
        }

        // Récupérer le prêt mis à jour pour le retourner
        const finalLoan = updateResult.Attributes || currentLoan;

        // S'assurer que tous les champs sont définis pour éviter les erreurs frontend
        const sanitizedLoan = {
          ...finalLoan,
          actualReturnDate: finalLoan.actualReturnDate || null,
          conditionAtReturn: finalLoan.conditionAtReturn || null,
          notes: finalLoan.notes || null
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "Prêt mis à jour avec succès",
            data: sanitizedLoan
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
        // D'abord récupérer le prêt pour obtenir les informations nécessaires
        const getLoanResult = await dynamoDb.send(
          new GetCommand({
            TableName: LOANS_TABLE,
            Key: { id: id },
          })
        );

        if (!getLoanResult.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Prêt non trouvé" }),
          };
        }

        const loan = getLoanResult.Item;

        // Supprimer le prêt
        await dynamoDb.send(
          new DeleteCommand({
            TableName: LOANS_TABLE,
            Key: { id: id },
          })
        );

        // Diminuer la quantité prêtée du matériel
        await updateMaterialLoanedQuantity(loan.materialId, -loan.quantity);

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