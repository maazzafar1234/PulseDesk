variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

# ============================================================================
# VPC VARIABLES
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

# ============================================================================
# EKS CLUSTER VARIABLES
# ============================================================================

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "pulsedesk-eks"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "instance_type" {
  description = "EC2 instance type for EKS nodes"
  type        = string
  default     = "t3.medium"
  
  validation {
    condition     = contains(["t3.small", "t3.medium", "t3.large", "m5.large", "m5.xlarge"], var.instance_type)
    error_message = "Instance type must be a valid type."
  }
}

variable "desired_capacity" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3
  
  validation {
    condition     = var.desired_capacity >= 1 && var.desired_capacity <= 20
    error_message = "Desired capacity must be between 1 and 20."
  }
}

variable "min_capacity" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 3
}

variable "max_capacity" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10
}

# ============================================================================
# RDS POSTGRESQL VARIABLES
# ============================================================================

variable "database_name" {
  description = "RDS database name"
  type        = string
  default     = "pulsedesk"
  
  validation {
    condition     = length(var.database_name) <= 63 && can(regex("^[a-z][a-z0-9_]*$", var.database_name))
    error_message = "Database name must start with a letter and contain only lowercase letters, numbers, and underscores."
  }
}

variable "database_user" {
  description = "RDS master username"
  type        = string
  default     = "pulsedesk"
  sensitive   = true
  
  validation {
    condition     = length(var.database_user) >= 1 && length(var.database_user) <= 16
    error_message = "Database user must be between 1 and 16 characters."
  }
}

variable "database_instance_type" {
  description = "RDS instance type"
  type        = string
  default     = "db.t4g.small"
  
  validation {
    condition     = can(regex("^db\\.", var.database_instance_type))
    error_message = "Instance type must start with 'db.'."
  }
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.3"
}

variable "rds_instance_count" {
  description = "Number of RDS instances in the cluster (Aurora replicas)"
  type        = number
  default     = 2
  
  validation {
    condition     = var.rds_instance_count >= 1 && var.rds_instance_count <= 3
    error_message = "RDS instance count must be between 1 and 3."
  }
}

# ============================================================================
# TAGGING
# ============================================================================

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default = {
    Project     = "PulseDesk"
    ManagedBy   = "Terraform"
  }
}
