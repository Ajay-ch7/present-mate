from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db.database import get_db

router = APIRouter()



class UserCreate(BaseModel):
    email: str
    password: str
    name: str

#presents


class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/signup")
async def signup(user: UserCreate, db = Depends(get_db)):
    # Phase 1 simple MVP, no hashing for brevity yet
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.dict()
    result = await db.users.insert_one(user_dict)
    return {"message": "User created successfully", "user_id": str(result.inserted_id)}

@router.post("/login")
async def login(user: UserLogin, db = Depends(get_db)):
    db_user = await db.users.find_one({"email": user.email, "password": user.password})
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    return {"message": "Login successful", "user_id": str(db_user["_id"]), "name": db_user["name"]}

@router.get("/me")
async def get_me(user_id: str, db = Depends(get_db)):
    from bson.objectid import ObjectId
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": user["email"], "name": user["name"]}
