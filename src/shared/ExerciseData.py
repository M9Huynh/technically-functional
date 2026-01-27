from dataclasses import dataclass
from datetime import date
from typing import Literal

@dataclass
class ExerciseData: 
    name: str
    acc_id: str
    email: str
    exercise: str
    sets: int
    reps: int
    rest_time: int
    birthday: date                  #check if needed or not

    def to_dict(self) -> dict:
        return {
            'email': self.email,
            'name': self.name,
            'birthday': self.birthday.isoformat(),
            'acc_id': self.acc_id,
            'exercise': self.exercise,
            'sets': self.sets,
            'reps': self.reps,
            'rest_time': self.rest_time,                #need to remember to define rest_time (mins or seconds)
        }
    
    @classmethod
    def from_dict(cls, acc_id: str, data: dict) -> 'ExerciseData':
        birthday_str = data['birthday']
        return cls(
            acc_id=acc_id,
            email=data['email'],
            name=data['name'],
            birthday=date.fromisoformat(birthday_str) if isinstance(birthday_str, str) else birthday_str,
            exercise = data['exercise'],
            sets = data['sets'],
            reps = data['reps'],
            rest_time = data['rest_time'] 
        )
'''
if __name__ == '__main__':
    ex = ExerciseData(
    acc_id="123",
    email="user@example.com",
    name="Maham S",
    birthday=date(2026, 1, 25),
    exercise="push-up",
    sets="4",
    reps="5",
    rest_time="20"


)
    firebase_data = ex.to_dict()  
    print(firebase_data)
    ex_from_fb = ExerciseData.from_dict("123", firebase_data)
    print(ex_from_fb)

'''