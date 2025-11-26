##############################################
# API Gateway
##############################################

resource "aws_api_gateway_rest_api" "images_api" {
  name        = var.api_gateway_name
  description = var.api_gateway_description

  tags = var.common_tags
}

resource "aws_api_gateway_resource" "resize" {
  rest_api_id = aws_api_gateway_rest_api.images_api.id
  parent_id   = aws_api_gateway_rest_api.images_api.root_resource_id
  path_part   = var.api_resource_path
}

resource "aws_api_gateway_method" "post_resize" {
  rest_api_id   = aws_api_gateway_rest_api.images_api.id
  resource_id   = aws_api_gateway_resource.resize.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "resize_integration" {
  rest_api_id = aws_api_gateway_rest_api.images_api.id
  resource_id = aws_api_gateway_resource.resize.id
  http_method = aws_api_gateway_method.post_resize.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.resize_image.invoke_arn
}

##############################################
# Autorisation API Gateway → Lambda
##############################################

resource "aws_lambda_permission" "resize_apigw" {
  statement_id  = "AllowExecutionFromAPIGatewayResize"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resize_image.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.images_api.execution_arn}/*/*"
}

##############################################
# API Deployment
##############################################

resource "aws_api_gateway_deployment" "images_deploy" {
  depends_on = [
    aws_api_gateway_integration.resize_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.images_api.id
  stage_name  = var.api_gateway_stage_name
}

##############################################
# Upload API Gateway Resources
##############################################

resource "aws_api_gateway_rest_api" "api" {
  name = "uploadApi"
}

resource "aws_api_gateway_resource" "upload" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "upload"
}

resource "aws_api_gateway_method" "upload_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.upload.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "upload_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.upload.id
  http_method             = aws_api_gateway_method.upload_post.http_method
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.upload_file.invoke_arn
  integration_http_method = "POST"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_file.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_api_gateway_deployment" "deployment" {
  depends_on = [
    aws_api_gateway_integration.upload_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = "prod"
}

##############################################
# NOUVELLES ROUTES - Material Management API
##############################################

locals {
  cors_response_params = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }

  cors_integration_params = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

##############################################
# API Gateway REST API - Material Management
##############################################

resource "aws_api_gateway_rest_api" "main" {
  name        = "material-management-api"
  description = "Material Management API"
}

# CORS Configuration pour les erreurs 4xx et 5xx
resource "aws_api_gateway_gateway_response" "cors_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "cors_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

##############################################
# Materials Resources
##############################################

resource "aws_api_gateway_resource" "materials" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "materials"
}

resource "aws_api_gateway_resource" "material_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.materials.id
  path_part   = "{id}"
}

# OPTIONS /materials (CORS Preflight)
resource "aws_api_gateway_method" "materials_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.materials.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "materials_options_integration" {
  rest_api_id          = aws_api_gateway_rest_api.main.id
  resource_id          = aws_api_gateway_resource.materials.id
  http_method          = aws_api_gateway_method.materials_options.http_method
  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_MATCH"
  request_templates    = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "materials_options_response" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.materials.id
  http_method         = aws_api_gateway_method.materials_options.http_method
  status_code         = "200"
  response_parameters = local.cors_response_params
}

resource "aws_api_gateway_integration_response" "materials_options_integration_response" {
  depends_on = [aws_api_gateway_integration.materials_options_integration]

  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.materials.id
  http_method         = aws_api_gateway_method.materials_options.http_method
  status_code         = "200"
  response_parameters = local.cors_integration_params
}

# GET /materials
resource "aws_api_gateway_method" "materials_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.materials.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "materials_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.materials.id
  http_method             = aws_api_gateway_method.materials_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.materials.invoke_arn
}

# POST /materials
resource "aws_api_gateway_method" "materials_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.materials.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "materials_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.materials.id
  http_method             = aws_api_gateway_method.materials_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.materials.invoke_arn
}

# OPTIONS /materials/{id} (CORS Preflight)
resource "aws_api_gateway_method" "material_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.material_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "material_id_options_integration" {
  rest_api_id          = aws_api_gateway_rest_api.main.id
  resource_id          = aws_api_gateway_resource.material_id.id
  http_method          = aws_api_gateway_method.material_id_options.http_method
  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_MATCH"
  request_templates    = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "material_id_options_response" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.material_id.id
  http_method         = aws_api_gateway_method.material_id_options.http_method
  status_code         = "200"
  response_parameters = local.cors_response_params
}

resource "aws_api_gateway_integration_response" "material_id_options_integration_response" {
  depends_on = [aws_api_gateway_integration.material_id_options_integration]

  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.material_id.id
  http_method         = aws_api_gateway_method.material_id_options.http_method
  status_code         = "200"
  response_parameters = local.cors_integration_params
}

# GET /materials/{id}
resource "aws_api_gateway_method" "material_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.material_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "material_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.material_id.id
  http_method             = aws_api_gateway_method.material_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.materials.invoke_arn
}

# PUT /materials/{id}
resource "aws_api_gateway_method" "material_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.material_id.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "material_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.material_id.id
  http_method             = aws_api_gateway_method.material_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.materials.invoke_arn
}

# DELETE /materials/{id}
resource "aws_api_gateway_method" "material_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.material_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "material_delete" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.material_id.id
  http_method             = aws_api_gateway_method.material_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.materials.invoke_arn
}

##############################################
# Loans Resources
##############################################

resource "aws_api_gateway_resource" "loans" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "loans"
}

resource "aws_api_gateway_resource" "loan_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.loans.id
  path_part   = "{id}"
}

# OPTIONS /loans (CORS Preflight)
resource "aws_api_gateway_method" "loans_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.loans.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "loans_options_integration" {
  rest_api_id          = aws_api_gateway_rest_api.main.id
  resource_id          = aws_api_gateway_resource.loans.id
  http_method          = aws_api_gateway_method.loans_options.http_method
  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_MATCH"
  request_templates    = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "loans_options_response" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.loans.id
  http_method         = aws_api_gateway_method.loans_options.http_method
  status_code         = "200"
  response_parameters = local.cors_response_params
}

resource "aws_api_gateway_integration_response" "loans_options_integration_response" {
  depends_on = [aws_api_gateway_integration.loans_options_integration]

  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.loans.id
  http_method         = aws_api_gateway_method.loans_options.http_method
  status_code         = "200"
  response_parameters = local.cors_integration_params
}

# GET /loans
resource "aws_api_gateway_method" "loans_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.loans.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "loans_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.loans.id
  http_method             = aws_api_gateway_method.loans_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.loans.invoke_arn
}

# POST /loans
resource "aws_api_gateway_method" "loans_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.loans.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "loans_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.loans.id
  http_method             = aws_api_gateway_method.loans_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.loans.invoke_arn
}

# OPTIONS /loans/{id} (CORS Preflight)
resource "aws_api_gateway_method" "loan_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.loan_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "loan_id_options_integration" {
  rest_api_id          = aws_api_gateway_rest_api.main.id
  resource_id          = aws_api_gateway_resource.loan_id.id
  http_method          = aws_api_gateway_method.loan_id_options.http_method
  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_MATCH"
  request_templates    = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "loan_id_options_response" {
  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.loan_id.id
  http_method         = aws_api_gateway_method.loan_id_options.http_method
  status_code         = "200"
  response_parameters = local.cors_response_params
}

resource "aws_api_gateway_integration_response" "loan_id_options_integration_response" {
  depends_on = [aws_api_gateway_integration.loan_id_options_integration]

  rest_api_id         = aws_api_gateway_rest_api.main.id
  resource_id         = aws_api_gateway_resource.loan_id.id
  http_method         = aws_api_gateway_method.loan_id_options.http_method
  status_code         = "200"
  response_parameters = local.cors_integration_params
}

# GET /loans/{id}
resource "aws_api_gateway_method" "loan_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.loan_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "loan_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.loan_id.id
  http_method             = aws_api_gateway_method.loan_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.loans.invoke_arn
}

# PUT /loans/{id}
resource "aws_api_gateway_method" "loan_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.loan_id.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "loan_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.loan_id.id
  http_method             = aws_api_gateway_method.loan_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.loans.invoke_arn
}

# DELETE /loans/{id}
resource "aws_api_gateway_method" "loan_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.loan_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "loan_delete" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.loan_id.id
  http_method             = aws_api_gateway_method.loan_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.loans.invoke_arn
}

##############################################
# Lambda Permissions
##############################################

resource "aws_lambda_permission" "materials_api_gateway" {
  statement_id  = "AllowAPIGatewayInvokeMaterials"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.materials.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "loans_api_gateway" {
  statement_id  = "AllowAPIGatewayInvokeLoans"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.loans.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

##############################################
# API Gateway Deployment - Material Management
##############################################

resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.materials_options_integration,
    aws_api_gateway_integration.materials_get,
    aws_api_gateway_integration.materials_post,
    aws_api_gateway_integration.material_id_options_integration,
    aws_api_gateway_integration.material_get,
    aws_api_gateway_integration.material_put,
    aws_api_gateway_integration.material_delete,
    aws_api_gateway_integration.loans_options_integration,
    aws_api_gateway_integration.loans_get,
    aws_api_gateway_integration.loans_post,
    aws_api_gateway_integration.loan_id_options_integration,
    aws_api_gateway_integration.loan_get,
    aws_api_gateway_integration.loan_put,
    aws_api_gateway_integration.loan_delete,
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = "dev"
}