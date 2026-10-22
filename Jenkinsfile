pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
    }

    triggers {
        pollSCM('* * * * *')
    }

    environment {
        DOCKERHUB_USER = 'osamazakimohammed'
        BACKEND_IMAGE = "${DOCKERHUB_USER}/star-cinema-backend"
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/star-cinema-frontend"
        DOCKER_CREDS = 'dockerhub-credentials'
    }

    stages {
        stage('Validate source') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -eu
                            node --check src/server.js
                            node --check src/db.js
                            kubectl apply --dry-run=client -f k8s/ >/dev/null
                        '''
                    } else {
                        powershell '''
                            $ErrorActionPreference = 'Stop'
                            node --check src/server.js
                            if ($LASTEXITCODE -ne 0) { throw 'JavaScript syntax check failed.' }
                            node --check src/db.js
                            if ($LASTEXITCODE -ne 0) { throw 'JavaScript syntax check failed.' }
                            kubectl apply --dry-run=client -f k8s/ | Out-Null
                            if ($LASTEXITCODE -ne 0) { throw 'Kubernetes manifests validation failed.' }
                        '''
                    }
                }
            }
        }

        stage('Build Docker images') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -eu
                            docker build -t "$BACKEND_IMAGE:$BUILD_NUMBER" -t "$BACKEND_IMAGE:latest" -f Dockerfile.backend .
                            docker build -t "$FRONTEND_IMAGE:$BUILD_NUMBER" -t "$FRONTEND_IMAGE:latest" -f Dockerfile.frontend .
                        '''
                    } else {
                        powershell '''
                            $ErrorActionPreference = 'Stop'
                            docker build -t "$env:BACKEND_IMAGE`:$env:BUILD_NUMBER" -t "$env:BACKEND_IMAGE`:latest" -f Dockerfile.backend .
                            if ($LASTEXITCODE -ne 0) { throw 'Backend Docker build failed.' }
                            docker build -t "$env:FRONTEND_IMAGE`:$env:BUILD_NUMBER" -t "$env:FRONTEND_IMAGE`:latest" -f Dockerfile.frontend .
                            if ($LASTEXITCODE -ne 0) { throw 'Frontend Docker build failed.' }
                        '''
                    }
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDS, usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                        if (isUnix()) {
                            sh '''
                                set -eu
                                echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                                docker push "$BACKEND_IMAGE:$BUILD_NUMBER"
                                docker push "$BACKEND_IMAGE:latest"
                                docker push "$FRONTEND_IMAGE:$BUILD_NUMBER"
                                docker push "$FRONTEND_IMAGE:latest"
                            '''
                        } else {
                            powershell '''
                                echo $env:DH_PASS | docker login -u $env:DH_USER --password-stdin
                                if ($LASTEXITCODE -ne 0) { throw 'Docker Hub login failed.' }
                                docker push "$env:BACKEND_IMAGE`:$env:BUILD_NUMBER"
                                docker push "$env:BACKEND_IMAGE`:latest"
                                docker push "$env:FRONTEND_IMAGE`:$env:BUILD_NUMBER"
                                docker push "$env:FRONTEND_IMAGE`:latest"
                                if ($LASTEXITCODE -ne 0) { throw 'Docker Hub push failed.' }
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -eu
                            kubectl apply -f k8s/
                            kubectl set image deployment/star-cinema-backend backend="$BACKEND_IMAGE:$BUILD_NUMBER"
                            kubectl set image deployment/star-cinema-frontend frontend="$FRONTEND_IMAGE:$BUILD_NUMBER"
                        '''
                    } else {
                        powershell '''
                            kubectl apply -f k8s/
                            if ($LASTEXITCODE -ne 0) { throw 'Failed to apply Kubernetes manifests.' }
                            kubectl set image deployment/star-cinema-backend backend="$env:BACKEND_IMAGE`:$env:BUILD_NUMBER"
                            kubectl set image deployment/star-cinema-frontend frontend="$env:FRONTEND_IMAGE`:$env:BUILD_NUMBER"
                        '''
                    }
                }
            }
        }
    }
}
