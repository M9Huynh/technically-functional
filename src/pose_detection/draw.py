import cv2 as cv
import mediapipe as mp 
import os
os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

class PoseCamera:
    def __init__(self, camera_index=0, width=640, height=480, pose_detect=None): 
        self.cap = cv.VideoCapture(camera_index)
        self.cap.set(cv.CAP_PROP_FRAME_WIDTH, width)
        self.cap.set(cv.CAP_PROP_FRAME_HEIGHT, height)
        self.display_size = (width, height)

        self.mp_pose = mp.solutions.pose
        self.mp_draw = mp.solutions.drawing_utils
        
        if pose_detect is not None:
            self.pose = pose_detect
        else:
            self.pose = self.mp_pose.Pose()

    def isOpened(self):
        return self.cap.isOpened()
    
    def get_frame(self):
        ret, frame = self.cap.read()
        if ret and frame is not None:
            frame = cv.resize(frame, self.display_size)
        return ret, frame
    
    def process_pose(self, frame):
        imgRGB = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
        res = self.pose.process(imgRGB)
        return res

    def draw_landmarks(self, res, frame):
        if res.pose_landmarks:
            self.mp_draw.draw_landmarks(frame, res.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)
        return frame
    
    def quit(self):
        if hasattr(self, 'cap'):
            self.cap.release()