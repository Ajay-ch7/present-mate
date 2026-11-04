# PresentMate – DevOps Implementation

PresentMate is a web-based application developed using **Next.js, FastAPI, and MongoDB**. This project demonstrates the implementation of DevOps practices across the software development lifecycle, including source code management, containerization, automated testing, deployment, operations, and monitoring.

The application is containerized using Docker and managed through Docker Compose. Selenium is used for automated UI smoke testing, and Jenkins is configured for GitHub source code checkout.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js 14, React 18 |
| Backend | Python, FastAPI |
| Database | MongoDB 7 |
| Containerization | Docker |
| Container Orchestration | Docker Compose |
| Automated Testing | Selenium WebDriver |
| Browser Automation | Selenium Standalone Chrome |
| CI/CD Tool | Jenkins |
| Version Control | Git and GitHub |

---

## DevOps Phases Implemented

This project follows the eight major phases of the DevOps lifecycle.

### 1. Plan

- Defined the project requirements and objectives.
- Identified the application architecture and technology stack.
- Organized the project into frontend, backend, database, and testing components.
- Planned the containerization and deployment workflow.

### 2. Code

- Developed the frontend using Next.js and React.
- Developed the backend using Python and FastAPI.
- Integrated MongoDB for database operations.
- Maintained the source code using Git and GitHub.
- Organized the application into separate frontend, backend, and testing directories.

### 3. Build

- Created a Dockerfile for the FastAPI backend.
- Created a Dockerfile for the Next.js frontend.
- Created a separate Dockerfile for Selenium UI testing.
- Built Docker images for the application components.
- Used Docker Compose to define and manage the application services.

### 4. Test

- Implemented automated UI smoke tests using Selenium WebDriver.
- Configured Selenium Standalone Chrome for browser automation.
- Verified backend API availability.
- Verified that the frontend homepage loads successfully.
- Checked the application page title and page content.

**Test execution command:**

```bash
docker compose --profile testing run --build --rm ui-tests
```

**Verified test results:**

- PASS – Backend API is responding.
- PASS – Homepage loaded successfully.
- PASS – Page title: PresentMate.
- ALL SELENIUM SMOKE TESTS PASSED.

### 5. Release

- Prepared Docker images for the frontend, backend, and UI testing components.
- Used Docker Compose configuration to define the application services and their dependencies.
- Maintained the application source code and Docker configuration in GitHub.

### 6. Deploy

- Deployed the application using Docker Compose.
- Started the frontend, backend, MongoDB, and Selenium services as separate containers.
- Configured communication between services through the Docker Compose network.
- Exposed the application services through their respective ports.

**Deployment command:**

```bash
docker compose up -d
```

### 7. Operate

- Managed application containers using Docker Compose.
- Checked running container status.
- Inspected backend and frontend logs.
- Used Docker Compose commands to start and manage application services.
- Configured a persistent MongoDB volume to retain database data.

**Useful commands:**

```bash
docker compose ps
docker ps
docker compose logs --tail=30 backend frontend
docker compose down
```

### 8. Monitor

- Monitored container status using Docker commands and Docker Desktop.
- Inspected application logs to identify errors and verify service activity.
- Used the Selenium Grid dashboard to observe the browser automation environment.
- Verified application availability through the frontend and backend endpoints.

---

## Project Architecture

```text
                    GitHub Repository
                           |
                           v
                    Source Code
                           |
                           v
                    Docker Build
                           |
                           v
                    Docker Compose
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
      Frontend          Backend          MongoDB
      Next.js           FastAPI          Database
          |                |
          +----------------+
                           |
                           v
                    Selenium Grid
                           |
                           v
                   Automated UI Tests
```

---

## Docker Services

The application is configured with the following services:

| Service | Description | Port |
|---|---|---|
| Frontend | Next.js application | 3000 |
| Backend | FastAPI application | 8000 |
| MongoDB | Database service | 27017 |
| Selenium | Browser automation environment | 4444 |
| UI Tests | Automated Selenium smoke tests | Runs on demand |

The UI testing service uses a Docker Compose testing profile and is executed separately when required.

---

## Running the Project Locally

### Prerequisites

- Docker Desktop
- Git
- Windows, Linux, or macOS

### Step 1: Clone the Repository

```bash
git clone https://github.com/Ajay-ch7/present-mate.git
cd present-mate
```

### Step 2: Configure Environment Variables

Configure the required environment variables, including `GEMINI_API_KEY`, if needed by the application.

Do not commit API keys or other secrets to GitHub.

### Step 3: Build and Start the Application

```bash
docker compose up -d --build
```

### Step 4: Verify Running Containers

```bash
docker compose ps
```

### Step 5: Run Automated UI Tests

```bash
docker compose --profile testing run --build --rm ui-tests
```

---

## Application URLs

| Component | URL |
|---|---|
| PresentMate Frontend | http://localhost:3000 |
| FastAPI Backend | http://localhost:8000 |
| FastAPI Swagger Documentation | http://localhost:8000/docs |
| Selenium Grid Dashboard | http://localhost:4444/ui |

---

## Jenkins Integration

Jenkins is configured to connect to the GitHub repository and retrieve the project source code.

**Implemented:**
- Jenkins Freestyle project configuration.
- GitHub repository integration.
- Retrieval of the `main` branch.
- Successful source code checkout verified through Jenkins Console Output.

**Future enhancement:**
- Configure a complete Jenkins CI/CD pipeline.
- Automate Docker image builds through Jenkins.
- Integrate automated Selenium testing into Jenkins.
- Automate deployment after successful testing.

*Note: The current Jenkins configuration demonstrates source code checkout; the complete automated CI/CD pipeline is not yet implemented.*

---

## Key Outcomes

- Containerized frontend and backend applications.
- Configured MongoDB as a separate containerized service.
- Established service communication through Docker Compose.
- Implemented Selenium-based automated UI smoke testing.
- Successfully verified backend availability and frontend loading.
- Configured Jenkins for GitHub source code integration.
- Demonstrated application deployment and container monitoring.

---

## Conclusion

The PresentMate project demonstrates how DevOps principles can be applied throughout the software development lifecycle. By integrating GitHub, Docker, Docker Compose, Selenium, and Jenkins, the project establishes a structured workflow for application development, containerization, testing, deployment, and operations.

Docker Compose simplifies the management of multiple application services, while Selenium provides automated verification of essential application functionality. Jenkins establishes the foundation for continuous integration through GitHub source code checkout.

Overall, this project provides practical experience with containerized application development and core DevOps practices. As a future enhancement, a fully automated Jenkins CI/CD pipeline can be introduced to integrate Docker builds, automated testing, and deployment into a single workflow.

---

## Future Enhancements

- Implement a complete Jenkins CI/CD pipeline.
- Automate Docker image building and deployment through Jenkins.
- Expand Selenium test coverage to include major application workflows.
- Integrate centralized logging and monitoring tools.
- Introduce automated deployment to a cloud platform.

---

## Repository

**GitHub:** https://github.com/Ajay-ch7/present-mate

**Project:** PresentMate – DevOps Implementation

