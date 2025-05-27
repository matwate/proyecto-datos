from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles # New import

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="proyecto-datos-frontend"), name="static") # Changed path

@app.get("/")
async def read_root():
    return {"message": "Hello World"}
