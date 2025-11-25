##############################################
# Main Terraform Configuration
##############################################
# Ce fichier sert de point d'entrée principal.
# Toutes les ressources sont organisées dans des fichiers séparés :
# 
# - terraform.tf     : Configuration Terraform et providers requis
# - provider.tf      : Configuration du provider AWS (LocalStack)
# - variables.tf     : Variables globales
# - dynamodb.tf      : Tables DynamoDB
# - s3.tf           : Buckets S3 et politiques
# - iam.tf          : Rôles et politiques IAM
# - lambda.tf       : Fonctions Lambda
# - api_gateway.tf  : API Gateway et intégrations
# - sqs.tf          : Files SQS
# - outputs.tf      : Variables de sortie
# 
# Pour déployer l'infrastructure :
# terraform init
# terraform plan
# terraform apply

