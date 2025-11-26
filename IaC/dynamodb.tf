##############################################
# DynamoDB Table
##############################################

resource "aws_dynamodb_table" "materials" {
  name         = "Materials"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "location"
    type = "S"
  }

  global_secondary_index {
    name            = "CategoryIndex"
    hash_key        = "category"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "LocationIndex"
    hash_key        = "location"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "loans" {
  name         = "Loans"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "materialId"
    type = "S"
  }

  attribute {
    name = "borrowerName"
    type = "S"
  }

  global_secondary_index {
    name            = "MaterialIdIndex"
    hash_key        = "materialId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "BorrowerIndex"
    hash_key        = "borrowerName"
    projection_type = "ALL"
  }
}