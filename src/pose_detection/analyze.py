import cv2 as cv
import mediapipe as mp 
import os
import time

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

class Analyzer:
    def __init__(self):
        self.started = False
        self.min_angle = 0.0
        self.max_angle = 0.0

        #Calibration State
        self.is_calibrating = False
        self.cal_start_ts = None
        self.cal_duration_s = 10.0
        self.cal_min = None
        self.cal_max = None

        #Rep/duration
        self.rep_count = 0
        self.current_rep = None
        self.rep_durations = []

        self.flexion_threshold= .7
        self.extension_threshold = .7

        self.rep_state = ""

    def start_calibration(self, duration_s: float = 3.0):
        self.is_calibrating = True
        self.cal_duration_s = float(duration_s)
        self.cal_start_ts = time.time()
        self.cal_min = None
        self.cal_max = None

        self.rep_count = 0
        self.rep_durations = []
        self.rep_state = "Extension"

    def _calibrate_with_angle(self, angle: float):
        if angle is None:
            return
        if self.cal_min is None or angle < self.cal_min:
            self.cal_min = angle
        if self.cal_max is None or angle > self.cal_max:
            self.cal_max = angle

        if (time.time() - self.cal_start_ts) >= self.cal_duration_s:
            if self.cal_min is not None and self.cal_max is not None:
                self.min_angle = self.cal_min
                self.max_angle = self.cal_max
                self.started = True
            self.is_calibrating = False

    def _rep_update(self, angle:float):
        if self.min_angle == self.max_angle:
            return
        
        normalized_angle = (angle - self.min_angle)/(self.max_angle-self.min_angle) #setting the angle to be between 0-1 to compare thresholds

        if self.rep_state == "Extension":
            if normalized_angle < 1 - self.flexion_threshold:
                self.rep_state = "Flexion"
                self.current_rep = time.time()

        elif self.rep_state == "Flexion":
            if normalized_angle > self.extension_threshold:
                self.rep_state = "Extension"
                if self.current_rep:
                    rep_duration = time.time() - self.current_rep
                    self.rep_durations.append(rep_duration)
                    self.rep_count += 1
                self.current_rep = None

    def update(self, angle:float):

        if self.is_calibrating:
            self._calibrate_with_angle(angle)
            return
        
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

        if self.started and not self.is_calibrating:
            self._rep_update(angle)

        #calculate the range of motion
    def calc_rom(self) -> float:
        return self.max_angle - self.min_angle

    def summary(self) -> dict:
        #calculation for calibration time left
        if self.is_calibrating and self.cal_start_ts is not None:
            cal_time_left = max(
                0.0,
                self.cal_duration_s - (time.time() - self.cal_start_ts)
            )
        else:
            cal_time_left = 0.0

        #calculation for durations
        current_duration = 0
         
        if self.rep_durations:
            avg_duration = sum(self.rep_durations)/len(self.rep_durations)
            if self.current_rep:
                current_duration = time.time() - self.current_rep 
            else:
                0
        else:
            avg_duration = 0
            current_duration = 0 
        return {
            #angle/calibration stats
            "min_degree": round(self.min_angle, 1),
            "max_degree": round(self.max_angle, 1),
            "rom_degree": round(self.calc_rom(), 1),
            "calibrating": self.is_calibrating,
            "cal_time_left": (round(cal_time_left, 1)),
            #reps/duration status
            "rep_count": self.rep_count,
            "current_rep_duration": current_duration,
            "avg_rep_duration": avg_duration,
            "rep_state": self.rep_state
        }
    