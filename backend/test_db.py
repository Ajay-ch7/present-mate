from pymongo import MongoClient
import json

db = MongoClient('mongodb+srv://pm-user-1:pm-user-1@presentmate.q1py79t.mongodb.net/?appName=Presentmate').presentmate
pres = list(db.presentations.find().sort('_id', -1).limit(1))
if len(pres) > 0:
    for i, slide in enumerate(pres[0]['slides']):
        print(f"Slide {i}: number={slide.get('slide_number')} summary={slide.get('summary')}")
else:
    print("No presentations found")
