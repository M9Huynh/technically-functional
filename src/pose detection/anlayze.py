import cv2 as cv
import mediapipe as mp 
import os
os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

class Analyzer:
    def __init__(self):
        self.started = False
        self.min_angle = 0.0
        self.max_angle = 0.0

    def update(self, angle:float):
        #Track the first detected angle to initialize the angle variable
        if not self.started:
            self.min_angle = angle
            self.max_angle = angle
            self.started = True






