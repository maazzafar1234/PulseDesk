# Terraform Configuration for PulseDesk Infrastructure on AWS

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Get latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Create VPC
resource "aws_vpc" "pulsedesk" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "pulsedesk-vpc"
  }
}

# Create Internet Gateway
resource "aws_internet_gateway" "pulsedesk" {
  vpc_id = aws_vpc.pulsedesk.id

  tags = {
    Name = "pulsedesk-igw"
  }
}

# Create Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.pulsedesk.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "pulsedesk-public-subnet"
  }
}

# Get Available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Create Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.pulsedesk.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.pulsedesk.id
  }

  tags = {
    Name = "pulsedesk-rt"
  }
}

# Associate Route Table
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Create Security Group
resource "aws_security_group" "pulsedesk" {
  name        = "pulsedesk-sg"
  description = "Security group for PulseDesk infrastructure"
  vpc_id      = aws_vpc.pulsedesk.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # Jenkins
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SonarQube
  ingress {
    from_port   = 9000
    to_port     = 9000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Docker Registry
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # K8s API
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # NodePort Range
  ingress {
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SMTP
  ingress {
    from_port   = 465
    to_port     = 465
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Internal traffic (allow from same security group)
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    self            = true
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "pulsedesk-sg"
  }
}

# IAM Role for Jenkins Worker
resource "aws_iam_role" "jenkins_worker" {
  name = "pulsedesk-jenkins-worker-role"

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

# Attach EKS Worker Node policy
resource "aws_iam_role_policy_attachment" "jenkins_worker_eks" {
  role       = aws_iam_role.jenkins_worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

# Attach EKS CNI policy for networking
resource "aws_iam_role_policy_attachment" "jenkins_worker_eks_cni" {
  role       = aws_iam_role.jenkins_worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

# Attach EC2 policy
resource "aws_iam_role_policy_attachment" "jenkins_worker_ec2" {
  role       = aws_iam_role.jenkins_worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
}

# Attach CloudFormation policy
resource "aws_iam_role_policy_attachment" "jenkins_worker_cf" {
  role       = aws_iam_role.jenkins_worker.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess"
}

# Attach ECR policy
resource "aws_iam_role_policy_attachment" "jenkins_worker_ecr" {
  role       = aws_iam_role.jenkins_worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

# Attach IAM policy
resource "aws_iam_role_policy_attachment" "jenkins_worker_iam" {
  role       = aws_iam_role.jenkins_worker.name
  policy_arn = "arn:aws:iam::aws:policy/IAMFullAccess"
}

# Create instance profile
resource "aws_iam_instance_profile" "jenkins_worker" {
  name = "pulsedesk-jenkins-worker-profile"
  role = aws_iam_role.jenkins_worker.name
}

# Master EC2 Instance
resource "aws_instance" "master" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.pulsedesk.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 29
    delete_on_termination = true
  }

  user_data = base64encode(file("${path.module}/../Automations/setup-master.sh"))

  tags = {
    Name = "pulsedesk-master"
  }

  depends_on = [aws_internet_gateway.pulsedesk]
}

# Jenkins Worker EC2 Instance
resource "aws_instance" "jenkins_worker" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.pulsedesk.id]
  iam_instance_profile   = aws_iam_instance_profile.jenkins_worker.name
  key_name               = var.key_pair_name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 29
    delete_on_termination = true
  }

  user_data = base64encode(file("${path.module}/../Automations/setup-worker.sh"))

  tags = {
    Name = "pulsedesk-jenkins-worker"
  }

  depends_on = [aws_internet_gateway.pulsedesk]
}

# Outputs
output "master_public_ip" {
  description = "Public IP of Master instance"
  value       = aws_instance.master.public_ip
}

output "jenkins_worker_public_ip" {
  description = "Public IP of Jenkins Worker instance"
  value       = aws_instance.jenkins_worker.public_ip
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.pulsedesk.id
}

output "security_group_id" {
  description = "Security Group ID"
  value       = aws_security_group.pulsedesk.id
}
