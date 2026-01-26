from dataclasses import dataclass
from datetime import date
import UserData

# This class defines a UserData object (see MIS for additional information)
# and allows conversion to and from a form that functions with firebase.



'''TODO
- Add acc_id size check? or add to user account class? IDK'''

@dataclass
class UserActivity: 
    name: str
    acc_id: int
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
        return {
            'name': self.name,
            'acc_id': self.acc_id,
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
        return self(
            acc_id = acc_id,
            name = data['name'],
            exercise = data['exercise'],
            duration = data['duration'],                        #decide units (sec/mins?)
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

if __name__ == '__main__':
    u1 = UserActivity(
    name="Maham S",
    acc_id=123,
    exercise="push-up",
    duration="30",
    completed_sets=3,
    completed_reps=5,
    real_rest_time=30,
    exercise_len=2.3,
    max_height=55,
    min_height=0,
    target_area="core",
    date_performed=2025-2-2026,
    analysis="amazing performance",
    patient_feedback="great"
)
    firebase_data = u1.to_dict()  
    print(firebase_data)
    ex_from_fb = UserActivity.from_dict("123", firebase_data)
    print(ex_from_fb)
   