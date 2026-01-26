from dataclasses import dataclass
from datetime import date
from typing import Literal

@dataclass
class UserData:
    acc_id: int 
    email: str
    password: str  
    name: str
    birthday: date 
    role: Literal['patient', 'physio'] = 'patient'
    
    def to_dict(self) -> dict:
        return {
            'email': self.email,
            'password': self.password,
            'name': self.name,
            'birthday': self.birthday.isoformat(), 
            'role': self.role,
            'acc_id': self.acc_id

        }
    
    @classmethod
    def from_dict(cls, acc_id: int, data: dict) -> 'UserData':
        birthday_str = data['birthday']
        return cls(
            acc_id=acc_id,
            email=data['email'],
            password=data['password'],
            name=data['name'],
            birthday=date.fromisoformat(birthday_str) if isinstance(birthday_str, str) else birthday_str, 
            role=data.get('role', 'patient')
        )
    
'''
if __name__ == '__main__':
    user = UserData(
    acc_id="123",
    email="user@example.com",
    password="hashed_pass",
    name="Maham S",
    birthday=date(2026, 1, 25),
    role="patient"
)
    firebase_data = user.to_dict()  
    print(firebase_data)
    user_from_fb = UserData.from_dict("123", firebase_data)
'''
