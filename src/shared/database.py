   
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

@dataclass
class UserProfile:
    
    acc_id: str  
    email: str
    password: str  
    name: str
    birthday: datetime  
    role: Literal['patient', 'physio'] = 'patient'  
    
    def to_dict(self) -> dict:
        return {
            'email': self.email,
            'password': self.password,
            'name': self.name,
            'birthday': self.birthday.isoformat(),
            'role': self.role
        }
    
    @classmethod
    def from_dict(cls, acc_id: str, data: dict) -> 'UserProfile':
        return cls(
            acc_id=acc_id,
            email=data['email'],
            password=data['password'],
            name=data['name'],
            birthday=datetime.fromisoformat(data['birthday']),
            role=data.get('role', 'patient')  
        )