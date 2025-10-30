const { spawn } = require('child_process');
const path = require('path');

console.log('Starting ConceptForge...');
console.log('Starting Python backend server...');

// define backend paths
const aiBackendPath = path.join(__dirname, 'ai_backend');
const venvPython = path.join(aiBackendPath, 'venv', 'Scripts', 'python.exe');

// spawn backend server process
const backend = spawn(venvPython, ['-m', 'uvicorn', 'server:app', '--host', '127.0.0.1', '--port', '8000', '--reload'], {
  cwd: aiBackendPath,
  stdio: 'pipe'
});

let frontendStarted = false;
let frontend = null;

// listen for backend
backend.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`Backend: ${output.trim()}`);
  
  // check if server is ready and we haven't started frontend yet
  if (output.includes('Uvicorn running on') && !frontendStarted) {
    frontendStarted = true;
    console.log('Backend server is ready!');
    console.log('Starting Electron frontend...');

    // start frontend
    frontend = spawn('npm', ['run', 'electron-forge-start'], {
      shell: true,
      stdio: 'inherit'
    });

    // stops backend when frontend closes
    frontend.on('close', (code) => {
      console.log('Electron app closed, stopping backend server...');
      backend.kill();
      process.exit(0);
    });
  }
});

// listen to stderr
backend.stderr.on('data', (data) => {
  const output = data.toString();
  console.log(`Backend: ${output.trim()}`);
  
  // check if the server is ready and we haven't started frontend yet
  if (output.includes('Uvicorn running on') && !frontendStarted) {
    frontendStarted = true;
    console.log('Backend server is ready!');
    console.log('Starting Electron frontend...');

    // start frontend
    frontend = spawn('npm', ['run', 'electron-forge-start'], {
      shell: true,
      stdio: 'inherit'
    });

    // stops backend when frontend closes
    frontend.on('close', (code) => {
      console.log('Electron app closed, stopping backend server...');
      backend.kill();
      process.exit(0);
    });
  }
});
