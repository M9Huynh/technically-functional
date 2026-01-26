from dataclasses import dataclass
from datetime import date
import UserData

@dataclass
class UserActivity: 
    user: UserData
    #acc_id: str
    exercise: str
    duration: float
    completed_sets: int
    completed_reps: int
    real_rest_time: int
    #birthday: date                  #check if needed or not
    exercise_len: float
    max_height: float
    min_height: float
    target_area: str
    date_performed: date
    analysis: str
    patient_feedback: str



    def to_dict(self) -> dict:
        user = self.user
        return {
            'email': user.email,
            'name': user.name,
            'birthday': user.birthday.isoformat(),
            'acc_id': user.acc_id,
            'exercise': self.exercise,
            'duration': self.duration,
            'completed_sets': self.completed_sets,
            'completed_reps': self.completed_reps,
            'real_rest_time': self.real_rest_time,                #need to remember to define rest_time (mins or seconds)
            'exercise_len': self.exercise_len,
            'max_height': self.max_height,
            'min_height': self.min_height,
            'target_area': self.target_area,                         #do we need target area?
            'date_performed': self.date_performed,
            'analysis': self.analysis,
            'patient_feedback': self.patient_feedback
        }
    
    @classmethod
    def from_dict(self, acc_id: str, data: dict) -> 'UserActivity':
        user = self.user
        birthday_str = data['birthday']
        return self(
            acc_id=user.acc_id,
            email=data['email'],
            name=data['name'],
            birthday=date.fromisoformat(birthday_str) if isinstance(birthday_str, str) else birthday_str,+
            
            exercise = data['exercise'],
            duration = data['duration'],
            completed_sets = data['completed_sets'],
            completed_reps = data['completed_reps'],
            real_rest_time = data['real_rest_time'],
            exercise_len = data['exercise_len'],
            max_height = data['max_height'],
            min_height = data['min_height'],
            target_area = data['target_area'],
            date_performed = data['date_performed'],
            analysis = data['analysis'],
            patient_feedback = data['patient_feedback']

        )
'''
if __name__ == '__main__':
    u1 = UserActivity(
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
    #ex_from_fb = ExerciseData.from_dict("123", firebase_data)
   # print(ex_from_fb)
   '''