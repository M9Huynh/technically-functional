import cv2 as cv
import mediapipe as mp 
import os
os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

class Analyzer:
    def __init__(self):
        self.started = False
        self.min_angle = 0.0
        self.max_angle = 0.0

        #Calibration State
        self.is_calibrating = False
        self.cal_start_ts = None
        self.cal_duration_s = 3.0
        self.cal_min = None
        self.cal_max = None

    def update(self, angle:float):
        #Track the first detected angle to initialize the angle variable
        if not self.started:
            self.min_angle = angle
            self.max_angle = angle
            self.started = True
        #update min angle when knee bends more
        if angle < self.min_angle:
            self.min_angle = angle        
        #update max angle when knee extends more
        if angle > self.max_angle:
            self.max_angle = angle

        #calculate the range of motion
    def calc_rom(self) -> float:
        return self.max_angle - self.min_angle
    
    def summary(self) -> dict:
        return {
            "min_degree": round(self.min_angle, 1),
            "max_degree": round(self.max_angle, 1),
            "rom_degree": round(self.calc_rom(), 1),
        }
    








