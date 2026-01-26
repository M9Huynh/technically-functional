from dataclasses import dataclass
'''TODO:
- did mini tests to check class functionality 
- need to do integration test
- should I call UserData instead of defining it here? Idk I did it because easy for me'''


@dataclass
class ExerciseData: 
    name: str
    acc_id: int                 #check if str or int???
    exercise: str
    sets: int
    reps: int
    rest_time: int
    min_height: float
    max_height: float
    ex_instr: str



    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'acc_id': self.acc_id,
            'exercise': self.exercise,
            'sets': self.sets,
            'reps': self.reps,
            'rest_time': self.rest_time,                #need to remember to define rest_time (mins or seconds)
            'min_height': self.min_height,
            'max_height': self.max_height,
            'ex_instr': self.ex_instr
        }
    
    @classmethod
    def from_dict(cls, acc_id: str, data: dict) -> 'ExerciseData':

        return cls(
            acc_id = acc_id,
            name = data['name'],
            exercise = data['exercise'],
            sets = data['sets'],
            reps = data['reps'],
            rest_time = data['rest_time'],
            min_height = data['min_height'],
            max_height = data['max_height'],
            ex_instr = data['ex_instr']

        )

if __name__ == '__main__':
    ex = ExerciseData(
    acc_id=23,
    name="Maham S",
    exercise="push-up",
    sets="4",
    reps="5",
    rest_time="20",
    min_height=55,
    max_height=22,
    ex_instr="extend arms to push on ground\n"
)
    firebase_data = ex.to_dict()  
    print(firebase_data)
    ex_from_fb = ExerciseData.from_dict("123", firebase_data)
    print(ex_from_fb)
