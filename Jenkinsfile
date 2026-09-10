pipeline {
    agent any

    stages {

        stage('Clone') {
            steps {
                checkout scm
            }
        }

        stage('Check Tools') {
            steps {
                bat '''
                    echo Checking Python...
                    "C:\\Users\\D.Navaneeth\\anaconda3\\python.exe" --version

                    echo Checking Node...
                    "C:\\Program Files\\nodejs\\node.exe" --version

                    echo Checking NPM...
                    "C:\\Program Files\\nodejs\\npm.cmd" --version
                '''
            }
        }

        stage('Backend Setup') {
            steps {
                bat '''
                    cd backend
                    "C:\\Users\\D.Navaneeth\\anaconda3\\python.exe" -m pip install --upgrade pip
                    "C:\\Users\\D.Navaneeth\\anaconda3\\python.exe" -m pip install -r requirements.txt
                '''
            }
        }

        stage('Frontend Setup') {
            steps {
                bat '''
                    cd frontend
                    "C:\\Program Files\\nodejs\\npm.cmd" install
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                bat '''
                    cd frontend
                    "C:\\Program Files\\nodejs\\npm.cmd" run build
                '''
            }
        }

        stage('Backend Check') {
            steps {
                bat '''
                    cd backend
                    "C:\\Users\\D.Navaneeth\\anaconda3\\python.exe" -m compileall .
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
