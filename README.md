# ConceptForge

ConceptForge is a tutoring chatbot designed to foster critical thinking and intuition through deep reasoning. It uses an Electron frontend for the UI and a Python FastAPI backend that serves model responses to the frontend.

This README explains what the project uses, how to set up the project, how to run the app locally, and how to package it into an executable.

## Technologies used

- Electron (Node.js) - frontend using HTML, CSS, JavaScript
- Python 3.10+ — backend using FastAPI (Uvicorn)
- Ollama — local model hosting
- KaTeX — math rendering in the renderer
- Markdown rendering — `marked` JavaScript library (Markdown to HTML)

## Prerequisites

- Git (to clone the repo)
- Node.js and npm
- Python 3.10 or 3.11
- Ollama installed (see installation instructions below)

## Quick setup

1. Clone the repository

```bash
git clone <https://github.com/andrewchen0/ConceptForge>
# change directory to the cloned repo (replace with your path)
cd "path/to/ConceptForge"
```

2. Frontend: install Node dependencies

```bash
npm install
```

3. Python: create and activate a virtual environment, then install backend packages

```bash
# create and activate venv
python -m venv ai_backend/venv
source ai_backend/venv/Scripts/activate

# install required packages
python -m pip install fastapi uvicorn pydantic ollama
```

4. Ollama (local model runtime)

- Install Ollama by following the instructions in the official website: https://ollama.com 
- Once installed, pull the phi 4 mini reasoning model:

```bash
# pull the Ollama model
ollama pull phi4-mini-reasoning:3.8b
```

- Ensure Ollama is running and reachable by the Python backend.

5. Start the frontend (Electron)

```bash
# run the electron app
npm start
```

The Electron app should start and connect to the backend server, allowing you to interact with the AI model.

## Packaging the app

Run the npm commands to build platform-specific app bundles:

```bash
# package (uses electron-forge package)
npm run package

# platform-specific packaging (if present in scripts)
npm run package-win
npm run package-mac
npm run package-linux
```


## License

This project is licensed under the MIT License (see `package.json` "license" field). If you add or change licensing, create a `LICENSE` file.
