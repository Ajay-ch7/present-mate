pipeline {
    agent any

    stages {

        stage('Clone') {
            steps {
                checkout scm
            }
        }

        stage('Backend Setup') {
            steps {
                bat '''
                    cd backend
                    python -m pip install --upgrade pip
                    pip install -r requirements.txt
                '''
            }
        }

        stage('Frontend Setup') {
            steps {
                bat '''
                    cd frontend
                    npm install
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                bat '''
                    cd frontend
                    npm run build
                '''
            }
        }

        stage('Backend Check') {
            steps {
                bat '''
                    cd backend
                    python -m compileall .
                '''
            }
        }
    }

    post {
        success {
            echo 'PresentMate build completed successfully!'
        }

        failure {
            echo 'PresentMate build failed!'
        }
    }
}
