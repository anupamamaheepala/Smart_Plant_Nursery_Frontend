"""
config.py — loads env variables and creates MongoDB connection
"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI          = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME            = os.getenv("DB_NAME", "plant_nursery")
JWT_SECRET         = os.getenv("JWT_SECRET", "changeme")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 480))
JWT_ALGORITHM      = "HS256"

# Single shared client
client = MongoClient(MONGO_URI)
db     = client[DB_NAME]

# Collections
sensor_col = db["orchid_data"]
users_col  = db["users"]