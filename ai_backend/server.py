from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from model import generate_model_stream

app = FastAPI()

# simple CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# class for request body
class Prompt(BaseModel):
    prompt: str


# streaming endpoint
@app.post("/generate_stream")
def generate_stream(item: Prompt):
    def streamer():
        for chunk in generate_model_stream(item.prompt):
            if not chunk:
                continue
            # ensure streaming yields bytes
            if isinstance(chunk, (bytes, bytearray)):
                yield chunk
            else:
                yield str(chunk).encode("utf-8")
    return StreamingResponse(streamer(), media_type="text/plain; charset=utf-8")