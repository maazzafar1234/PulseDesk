output "region" {
  value       = var.aws_region
  description = "AWS region"
}

output "environment" {
  value       = var.environment
  description = "Environment name"
}

# ============================================================================
# VPC OUTPUTS
# ============================================================================

output "vpc_id" {
  value       = aws_vpc.pulsedesk.id
  description = "VPC ID"
}

output "vpc_cidr" {
  value       = aws_vpc.pulsedesk.cidr_block
  description = "VPC CIDR block"
}

output "public_subnets" {
  value       = aws_subnet.public[*].id
  description = "Public subnet IDs"
}

output "private_subnets" {
  value       = aws_subnet.private[*].id
  description = "Private subnet IDs"
}

# ============================================================================
# EKS OUTPUTS
# ============================================================================

output "eks_cluster_name" {
  value       = aws_eks_cluster.pulsedesk.name
  description = "EKS cluster name"
}

output "eks_cluster_arn" {
  value       = aws_eks_cluster.pulsedesk.arn
  description = "EKS cluster ARN"
}

output "eks_cluster_endpoint" {
  value       = aws_eks_cluster.pulsedesk.endpoint
  description = "EKS cluster endpoint"
}

output "eks_cluster_ca_certificate" {
  value       = base64decode(aws_eks_cluster.pulsedesk.certificate_authority[0].data)
  description = "EKS cluster CA certificate"
  sensitive   = true
}

output "eks_cluster_version" {
  value       = aws_eks_cluster.pulsedesk.version
  description = "EKS cluster Kubernetes version"
}

output "eks_node_group_id" {
  value       = aws_eks_node_group.pulsedesk.id
  description = "EKS node group ID"
}

output "eks_node_group_arn" {
  value       = aws_eks_node_group.pulsedesk.arn
  description = "EKS node group ARN"
}

# ============================================================================
# RDS OUTPUTS
# ============================================================================

output "rds_cluster_id" {
  value       = aws_rds_cluster.pulsedesk.cluster_identifier
  description = "RDS cluster ID"
}

output "rds_cluster_arn" {
  value       = aws_rds_cluster.pulsedesk.arn
  description = "RDS cluster ARN"
}

output "rds_cluster_endpoint" {
  value       = aws_rds_cluster.pulsedesk.endpoint
  description = "RDS cluster write endpoint"
}

output "rds_cluster_reader_endpoint" {
  value       = aws_rds_cluster.pulsedesk.reader_endpoint
  description = "RDS cluster read endpoint (for read replicas)"
}

output "rds_database_name" {
  value       = aws_rds_cluster.pulsedesk.database_name
  description = "RDS database name"
}

output "rds_master_username" {
  value       = aws_rds_cluster.pulsedesk.master_username
  description = "RDS master username"
  sensitive   = true
}

output "rds_database_connection_string" {
  value       = "postgresql://${aws_rds_cluster.pulsedesk.master_username}:PASSWORD@${aws_rds_cluster.pulsedesk.endpoint}:5432/${aws_rds_cluster.pulsedesk.database_name}"
  description = "RDS database connection string (replace PASSWORD with actual password)"
  sensitive   = true
}

output "rds_password_secret_arn" {
  value       = aws_secretsmanager_secret.rds_password.arn
  description = "AWS Secrets Manager secret ARN for RDS password"
}

output "rds_password_secret_name" {
  value       = aws_secretsmanager_secret.rds_password.name
  description = "AWS Secrets Manager secret name for RDS password"
}

# ============================================================================
# ECR OUTPUTS
# ============================================================================

output "ecr_repository_url" {
  value       = aws_ecr_repository.pulsedesk.repository_url
  description = "ECR repository URL"
}

output "ecr_repository_arn" {
  value       = aws_ecr_repository.pulsedesk.arn
  description = "ECR repository ARN"
}

# ============================================================================
# KUBECONFIG
# ============================================================================

output "kubeconfig_command" {
  value       = "aws eks update-kubeconfig --name ${aws_eks_cluster.pulsedesk.name} --region ${var.aws_region}"
  description = "Command to update kubeconfig"
}

output "kubeconfig_raw" {
  value = yamlencode({
    apiVersion      = "v1"
    kind            = "Config"
    current-context = "aws"
    clusters = [{
      name = aws_eks_cluster.pulsedesk.id
      cluster = {
        server                   = aws_eks_cluster.pulsedesk.endpoint
        certificate-authority-data = aws_eks_cluster.pulsedesk.certificate_authority[0].data
      }
    }]
    contexts = [{
      name = "aws"
      context = {
        cluster = aws_eks_cluster.pulsedesk.id
        user    = "aws"
      }
    }]
    users = [{
      name = "aws"
      user = {
        exec = {
          apiVersion = "client.authentication.k8s.io/v1beta1"
          command    = "aws"
          args       = ["eks", "get-token", "--cluster-name", aws_eks_cluster.pulsedesk.name, "--region", var.aws_region]
        }
      }
    }]
  })
  description = "kubeconfig for EKS cluster"
  sensitive   = true
}

# ============================================================================
# SUMMARY OUTPUT
# ============================================================================

output "deployment_summary" {
  value = {
    cluster_name               = aws_eks_cluster.pulsedesk.name
    cluster_endpoint           = aws_eks_cluster.pulsedesk.endpoint
    region                     = var.aws_region
    kubernetes_version         = aws_eks_cluster.pulsedesk.version
    worker_nodes               = aws_eks_node_group.pulsedesk.scaling_config[0].desired_size
    node_instance_type         = var.instance_type
    database_endpoint          = aws_rds_cluster.pulsedesk.endpoint
    database_name              = aws_rds_cluster.pulsedesk.database_name
    database_instances         = length(aws_rds_cluster_instance.pulsedesk)
    ecr_repository             = aws_ecr_repository.pulsedesk.repository_url
    postgres_version           = aws_rds_cluster.pulsedesk.engine_version
  }
  description = "Summary of deployed infrastructure"
}
