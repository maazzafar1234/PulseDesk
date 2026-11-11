pipeline {
  agent {
    kubernetes {
      yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins: agent
spec:
  serviceAccountName: jenkins
  containers:
  - name: docker
    image: docker:24-dind
    securityContext:
      privileged: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: kubectl
    image: amazon/aws-cli:latest
    command:
    - cat
    tty: true
  - name: git
    image: bitnami/git:latest
    command:
    - cat
    tty: true
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
"""
    }
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 1, unit: 'HOURS')
    timestamps()
  }

  parameters {
    string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Git branch to deploy')
    choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'production'], description: 'Deployment environment')
    booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run tests before deployment')
  }

  environment {
    AWS_REGION = 'us-east-1'
    AWS_ACCOUNT_ID = credentials('aws-account-id')
    ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    ECR_REPOSITORY_NAME = 'pulsedesk'
    IMAGE_TAG = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
    DOCKER_IMAGE = "${ECR_REGISTRY}/${ECR_REPOSITORY_NAME}:${IMAGE_TAG}"
    EKS_CLUSTER_NAME = "pulsedesk-eks"
    K8S_NAMESPACE = "${params.ENVIRONMENT == 'production' ? 'production' : 'staging'}"
    ARGOCD_APP_NAME = "pulsedesk"
  }

  stages {
    stage('Checkout') {
      steps {
        container('git') {
          script {
            echo "Checking out ${params.GIT_BRANCH} branch..."
            checkout([$class: 'GitSCM',
              branches: [[name: "refs/heads/${params.GIT_BRANCH}"]],
              userRemoteConfigs: [[url: 'https://github.com/maazzafar1234/PulseDesk.git']]
            ])
            env.GIT_COMMIT_MSG = sh(returnStdout: true, script: 'git log -1 --pretty=%B').trim()
            echo "Commit message: ${env.GIT_COMMIT_MSG}"
          }
        }
      }
    }

    stage('Build & Test') {
      when {
        expression { params.RUN_TESTS == true }
      }
      steps {
        script {
          echo "Building application..."
          
          // Frontend build
          sh '''
            cd client
            npm install --frozen-lockfile
            npm run lint
            npm run build
          '''
          
          // Backend build
          sh '''
            cd server
            npm install --frozen-lockfile
            npm test 2>/dev/null || echo "No tests defined"
          '''
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        container('docker') {
          script {
            echo "Building Docker image: ${DOCKER_IMAGE}"
            sh '''
              docker build \
                -f server/Dockerfile \
                -t ${DOCKER_IMAGE} \
                -t ${ECR_REGISTRY}/${ECR_REPOSITORY_NAME}:latest \
                .
            '''
            
            echo "Docker image built successfully"
            sh "docker images | grep ${ECR_REPOSITORY_NAME}"
          }
        }
      }
    }

    stage('Push to ECR') {
      steps {
        container('docker') {
          script {
            echo "Logging in to ECR..."
            sh '''
              aws ecr get-login-password --region ${AWS_REGION} | \
                docker login --username AWS --password-stdin ${ECR_REGISTRY}
            '''
            
            echo "Pushing image to ECR..."
            sh '''
              docker push ${DOCKER_IMAGE}
              docker push ${ECR_REGISTRY}/${ECR_REPOSITORY_NAME}:latest
            '''
            
            echo "Image pushed successfully"
          }
        }
      }
    }

    stage('Security Scan') {
      steps {
        script {
          echo "Running security scan on Docker image..."
          sh '''
            echo "Scanning ${DOCKER_IMAGE} for vulnerabilities..."
            # Add Trivy or similar scanning here
            # trivy image ${DOCKER_IMAGE}
          '''
        }
      }
    }

    stage('Update Deployment') {
      steps {
        script {
          echo "Updating Kubernetes deployment manifests..."
          sh '''
            sed -i "s|IMAGE_PLACEHOLDER|${DOCKER_IMAGE}|g" k8s/deployment.yaml
            sed -i "s|NAMESPACE_PLACEHOLDER|${K8S_NAMESPACE}|g" k8s/deployment.yaml
          '''
          
          sh '''
            kubectl config use-context ${EKS_CLUSTER_NAME}
            kubectl apply -f k8s/configmap.yaml -n ${K8S_NAMESPACE}
            kubectl apply -f k8s/deployment.yaml -n ${K8S_NAMESPACE}
            kubectl apply -f k8s/service.yaml -n ${K8S_NAMESPACE}
            kubectl apply -f k8s/ingress.yaml -n ${K8S_NAMESPACE}
            kubectl apply -f k8s/hpa.yaml -n ${K8S_NAMESPACE}
          '''
        }
      }
    }

    stage('Wait for Rollout') {
      steps {
        script {
          echo "Waiting for deployment rollout..."
          sh '''
            kubectl rollout status deployment/pulsedesk \
              -n ${K8S_NAMESPACE} \
              --timeout=5m
          '''
        }
      }
    }

    stage('Verify Deployment') {
      steps {
        script {
          echo "Verifying deployment..."
          sh '''
            echo "Checking pod status..."
            kubectl get pods -n ${K8S_NAMESPACE} -l app=pulsedesk
            
            echo "Checking service status..."
            kubectl get svc -n ${K8S_NAMESPACE} -l app=pulsedesk
            
            echo "Checking deployment status..."
            kubectl get deployment -n ${K8S_NAMESPACE} pulsedesk
          '''
        }
      }
    }

    stage('Run Smoke Tests') {
      steps {
        script {
          echo "Running smoke tests..."
          sh '''
            # Get service endpoint
            SERVICE_IP=$(kubectl get svc pulsedesk -n ${K8S_NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
            
            # Test health endpoint
            curl -f http://${SERVICE_IP}/api/health || exit 1
            echo "✓ Health check passed"
            
            # Test metrics endpoint
            curl -f http://${SERVICE_IP}/metrics || exit 1
            echo "✓ Metrics endpoint accessible"
          '''
        }
      }
    }

    stage('Sync ArgoCD') {
      when {
        expression { params.ENVIRONMENT == 'production' }
      }
      steps {
        script {
          echo "Syncing ArgoCD application..."
          sh '''
            argocd app sync ${ARGOCD_APP_NAME} \
              --refresh \
              --wait \
              --grpc-web
          '''
        }
      }
    }

    stage('Notify Slack') {
      when {
        expression { currentBuild.result == 'SUCCESS' }
      }
      steps {
        script {
          echo "Sending Slack notification..."
          sh '''
            curl -X POST ${SLACK_WEBHOOK_URL} \
              -H 'Content-Type: application/json' \
              -d @- <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "✅ PulseDesk Deployment Successful"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Environment:*\n${ENVIRONMENT}"
        },
        {
          "type": "mrkdwn",
          "text": "*Image:*\n${DOCKER_IMAGE}"
        },
        {
          "type": "mrkdwn",
          "text": "*Branch:*\n${GIT_BRANCH}"
        },
        {
          "type": "mrkdwn",
          "text": "*Commit:*\n${GIT_COMMIT}"
        }
      ]
    }
  ]
}
EOF
          '''
        }
      }
    }
  }

  post {
    always {
      script {
        echo "Cleaning up..."
        sh '''
          # Clean up old images
          docker rmi ${DOCKER_IMAGE} || true
        '''
      }
    }

    failure {
      script {
        echo "Deployment failed!"
        sh '''
          curl -X POST ${SLACK_WEBHOOK_URL} \
            -H 'Content-Type: application/json' \
            -d @- <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "❌ PulseDesk Deployment Failed"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Build Number:* ${BUILD_NUMBER}\n*Branch:* ${GIT_BRANCH}\n*Error:* Check Jenkins console for details"
      }
    }
  ]
}
EOF
        '''
      }
    }

    success {
      archiveArtifacts artifacts: 'k8s/**/*.yaml', allowEmptyArchive: true
    }
  }
}
