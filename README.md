Project Description

MyMediaJournal is a web application designed to help users track and analyze their media consumption habits. In an era where people consume large amounts of media across many platforms from streaming services like Netflix to gaming platforms and music apps, it can be difficult to keep track of how much time is spent on different types of content. MyMediaJournal addresses this problem by providing a structured system where users can log their media activity, set consumption goals, and review their habits over time.

MyMediaJournal was built for anyone who wants to be more mindful of how they spend their time across different media types and genres. The system allows users to log media entries, track time spent, set personal goals, and receive summarized reports of their activity. These features help users identify patterns in their media consumption and make more intentional choices about what they watch, play, or read.

Features
- User authentication support
- Track media consumption (movies, games, books, etc.)
- Add, edit, and delete media entries through a user-friendly interface
- Store and manage user activity data in a structured database
- Backend API for handling CRUD operations
- Database schema designed with normalization principles
- Optional sample data seeding for testing and demonstration

Required Tools/Software:
- Python 3.10 or later
- Node.js and npm
- PostgreSQL or a PostgreSQL container
- Docker / Docker Desktop

Installation Steps and Commands:
1. Clone the Github repository
    git clone  <repository-url>
    cd MyMediaJournal
2. Create the environment file
    Copy the example file by running cp .env.example .env in project root
3. Start Docker Desktop
    Make sure Docker Desktop is open and running before continuing.
4. Set up the database and backend dependencies
    In one terminal in project root, run make setup
    This command starts the database container, installs backend dependencies into a virtual environment, and runs the database migrations
5. Start the backend server
    In the same terminal in root, run make dev-backend
6. Install frontend dependencies
    In a new terminal, change into the frontend directory and run npm install
7. Start the frontend server
    In the same terminal in frontend, run npm run dev
8. Access the application
    Once both servers are running, open http://localhost:3000 in a browser
9. (Optional) Populate the database with sample data
    Run make seed-py 
