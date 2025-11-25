##############################################
# Infrastructure modulaire
##############################################

# Ce fichier main.tf a été divisé en plusieurs fichiers spécialisés :
#
# - terraform.tf   : Configuration Terraform et providers requis
# - provider.tf    : Configuration du provider AWS (LocalStack)
# - dynamodb.tf    : Table DynamoDB Users
# - sqs.tf         : Queue SQS UserQueue
# - iam.tf         : Rôles IAM pour Lambda
# - lambda.tf      : Fonctions Lambda et archivage
# - api_gateway.tf : API Gateway et intégrations
# - outputs.tf     : Variables de sortie
#
# Cette organisation permet :
# - Une meilleure lisibilité
# - Des modifications ciblées par service
# - Un déploiement plus granulaire avec terraform plan/apply -target
# - Une meilleure collaboration en équipe

/* -------------------------------------------------------------------------- */
/*                         Instructions de déploiement                        */
/* -------------------------------------------------------------------------- */

# 1. Lancer l'environnement Docker
# > docker-compose up -d

# 2. Déployer TOUTE l'infrastructure en une fois (recommandé)
# > cd IaC
# > terraform init
# > terraform plan
# > terraform apply

# OU déployer service par service (optionnel)
# > terraform apply -target=aws_dynamodb_table.users
# > terraform apply -target=aws_lambda_function.resize_image
# > terraform apply -target=aws_api_gateway_rest_api.images_api