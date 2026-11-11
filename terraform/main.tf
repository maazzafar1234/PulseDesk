terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  # Uncomment for remote state management
  # backend "s3" {
  #   bucket         = "pulsedesk-terraform-state"
  #   key            = "eks/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "PulseDesk"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

provider "kubernetes" {
  host                   = aws_eks_cluster.pulsedesk.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.pulsedesk.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.pulsedesk.token
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.pulsedesk.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.pulsedesk.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.pulsedesk.token
  }
}

# ============================================================================
# VPC CONFIGURATION
# ============================================================================

resource "aws_vpc" "pulsedesk" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "pulsedesk-vpc"
  }
}

resource "aws_internet_gateway" "pulsedesk" {
  vpc_id = aws_vpc.pulsedesk.id

  tags = {
    Name = "pulsedesk-igw"
  }
}

# Public Subnets for EKS (ALB will be here)
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.pulsedesk.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name                              = "pulsedesk-public-${count.index + 1}"
    "kubernetes.io/role/elb"          = "1"  # For ALB Ingress Controller
  }
}

# Private Subnets for EKS Nodes and RDS
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.pulsedesk.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                               = "pulsedesk-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb" = "1"  # For internal load balancers
  }
}

# NAT Gateway for outbound traffic from private subnets
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"

  tags = {
    Name = "pulsedesk-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "pulsedesk" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  depends_on = [aws_internet_gateway.pulsedesk]

  tags = {
    Name = "pulsedesk-nat-${count.index + 1}"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.pulsedesk.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.pulsedesk.id
  }

  tags = {
    Name = "pulsedesk-rt-public"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.pulsedesk.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.pulsedesk[count.index].id
  }

  tags = {
    Name = "pulsedesk-rt-private-${count.index + 1}"
  }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ============================================================================
# SECURITY GROUPS
# ============================================================================

# EKS Cluster Security Group
resource "aws_security_group" "eks_cluster" {
  name        = "pulsedesk-eks-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.pulsedesk.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "pulsedesk-eks-cluster-sg"
  }
}

# EKS Node Security Group
resource "aws_security_group" "eks_nodes" {
  name        = "pulsedesk-eks-nodes-sg"
  description = "Security group for EKS nodes"
  vpc_id      = aws_vpc.pulsedesk.id

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "pulsedesk-eks-nodes-sg"
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "pulsedesk-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.pulsedesk.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "pulsedesk-rds-sg"
  }
}

# ============================================================================
# EKS CLUSTER
# ============================================================================

resource "aws_iam_role" "eks_cluster_role" {
  name = "pulsedesk-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_eks_cluster" "pulsedesk" {
  name            = var.cluster_name
  version         = var.kubernetes_version
  role_arn        = aws_iam_role.eks_cluster_role.arn
  
  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]

  tags = {
    Name = "pulsedesk-eks-cluster"
  }
}

# EKS Node Group
resource "aws_iam_role" "eks_node_role" {
  name = "pulsedesk-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

# IAM policy for EBS CSI Driver (if needed)
resource "aws_iam_role_policy" "eks_ebs_policy" {
  name = "pulsedesk-eks-ebs-policy"
  role = aws_iam_role.eks_node_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateSnapshot",
          "ec2:AttachVolume",
          "ec2:DetachVolume",
          "ec2:ModifyVolume",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeCreateVolumePermissions",
          "ec2:DescribeInstances",
          "ec2:DescribeSnapshots",
          "ec2:DescribeTags",
          "ec2:DescribeVolumes",
          "ec2:DescribeVolumesModifications"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_eks_node_group" "pulsedesk" {
  cluster_name    = aws_eks_cluster.pulsedesk.name
  node_group_name = "pulsedesk-node-group"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = var.desired_capacity
    max_size     = var.max_capacity
    min_size     = var.min_capacity
  }

  instance_types = [var.instance_type]

  vpc_config {
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = {
    Name = "pulsedesk-node-group"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy,
  ]
}

# ============================================================================
# RDS POSTGRESQL DATABASE
# ============================================================================

resource "aws_db_subnet_group" "pulsedesk" {
  name       = "pulsedesk-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "pulsedesk-db-subnet-group"
  }
}

resource "random_password" "rds_password" {
  length  = 16
  special = true
}

resource "aws_rds_cluster" "pulsedesk" {
  cluster_identifier      = "pulsedesk-db-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = var.postgres_version
  database_name           = var.database_name
  master_username         = var.database_user
  master_password         = random_password.rds_password.result
  
  db_subnet_group_name            = aws_db_subnet_group.pulsedesk.name
  db_cluster_parameter_group_name = "default.aurora-postgresql15"
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  backup_retention_period      = 7
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  skip_final_snapshot       = false
  final_snapshot_identifier = "pulsedesk-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  tags = {
    Name = "pulsedesk-db-cluster"
  }
}

resource "aws_rds_cluster_instance" "pulsedesk" {
  count              = var.rds_instance_count
  identifier         = "pulsedesk-db-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.pulsedesk.id
  instance_class     = var.database_instance_type
  engine             = aws_rds_cluster.pulsedesk.engine
  engine_version     = aws_rds_cluster.pulsedesk.engine_version

  publicly_accessible = false
  
  monitoring_interval    = 60
  monitoring_role_arn    = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true

  tags = {
    Name = "pulsedesk-db-instance-${count.index + 1}"
  }
}

resource "aws_iam_role" "rds_monitoring" {
  name = "pulsedesk-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring.name
}

# Store RDS password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name = "pulsedesk/rds/password"
  description = "RDS password for PulseDesk"
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.rds_password.result
}

# ============================================================================
# DATA SOURCES
# ============================================================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_eks_cluster_auth" "pulsedesk" {
  name = aws_eks_cluster.pulsedesk.name
}

# ============================================================================
# ECR REPOSITORY
# ============================================================================

resource "aws_ecr_repository" "pulsedesk" {
  name                 = "pulsedesk"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "pulsedesk-ecr"
  }
}

resource "aws_ecr_lifecycle_policy" "pulsedesk" {
  repository = aws_ecr_repository.pulsedesk.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ============================================================================
# OUTPUT VALUES
# ============================================================================

output "eks_cluster_name" {
  value       = aws_eks_cluster.pulsedesk.name
  description = "EKS cluster name"
}

output "eks_cluster_endpoint" {
  value       = aws_eks_cluster.pulsedesk.endpoint
  description = "EKS cluster endpoint"
}

output "rds_cluster_endpoint" {
  value       = aws_rds_cluster.pulsedesk.endpoint
  description = "RDS cluster endpoint"
}

output "rds_database_password_secret" {
  value       = aws_secretsmanager_secret.rds_password.name
  description = "AWS Secrets Manager secret name for RDS password"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.pulsedesk.repository_url
  description = "ECR repository URL"
}
