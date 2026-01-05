<<<<<<< HEAD
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
=======
# Real-Time Telemetry Dashboard

A complete real-time telemetry data ingestion and visualization application built with React, Node.js, Express, MongoDB, and Server-Sent Events (SSE).

## Features

- **Real-time data ingestion** from text files with millisecond-level latency
- **MongoDB integration** with automatic upserts (no duplicates)
- **Server-Sent Events** for live frontend updates
- **React dashboard** with start/stop controls and live data table
- **Error handling** for file, database, and connection issues
- **Responsive design** with battery level indicators and status badges

## Architecture

```
Frontend (React) ←→ Backend (Express) ←→ MongoDB
                 ↑
            Server-Sent Events
                 ↑
            File Watcher (telemetry.txt)
```

## Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB running on localhost:27017
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm run install-all
```

2. **Start MongoDB:**
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or run directly
mongod
```

3. **Run the application:**
```bash
npm run dev
```

This starts both backend (port 5000) and frontend (port 3000) concurrently.

### Manual Setup

**Backend:**
```bash
npm install
npm run server
```

**Frontend:**
```bash
cd client
npm install
npm start
```

## API Endpoints

- `POST /api/start` - Start telemetry ingestion
- `POST /api/stop` - Stop telemetry ingestion  
- `GET /api/telemetry` - Fetch all telemetry data
- `GET /api/telemetry/stream` - SSE endpoint for real-time updates
- `GET /api/health` - Health check and status

## Data Format

The telemetry.txt file should contain CSV data with this format:
```
ID,Timestamp,Temperature,Position,Pressure,Humidity,Velocity,Status,BatteryLevel
T001,2024-01-04T10:00:00.000Z,23.5,LAT:40.7128 LON:-74.0060,1013.25,65.2,15.3,ACTIVE,85.7
```

## Usage

1. Open http://localhost:3000
2. Click "Start Ingestion" to begin monitoring the telemetry file
3. Add new records to `server/telemetry.txt` to see real-time updates
4. Use "Stop Ingestion" to pause monitoring

## Technical Details

- **File Monitoring:** Uses fs.watchFile with 100ms intervals
- **Database:** MongoDB with Mongoose ODM and unique ID constraints
- **Real-time:** Server-Sent Events with automatic reconnection
- **Error Handling:** Graceful handling of file, DB, and network errors
- **Performance:** Efficient upserts and limited result sets (1000 records)

## Project Structure

```
├── server/
│   ├── index.js          # Express server with SSE and file monitoring
│   └── telemetry.txt     # Sample telemetry data
├── client/
│   ├── src/
│   │   ├── App.js        # React dashboard component
│   │   └── App.css       # Responsive styling
│   └── public/
├── package.json          # Root dependencies and scripts
└── README.md
```

## Development

- Backend runs on port 5000 with auto-reload via nodemon
- Frontend runs on port 3000 with hot reload
- CORS enabled for cross-origin requests
- MongoDB connection with automatic reconnection

## Troubleshooting

**MongoDB Connection Issues:**
- Ensure MongoDB is running: `brew services start mongodb-community`
- Check connection string in server/index.js

**SSE Connection Problems:**
- Verify CORS settings
- Check browser developer tools for connection errors
- Ensure backend is running on port 5000

**File Monitoring Not Working:**
- Verify telemetry.txt exists in server/ directory
- Check file permissions
- Monitor server logs for parsing errors
>>>>>>> 65118045e7fa2ee2ace98ca6fc2cf968941d8969
