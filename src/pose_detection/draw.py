import cv2 as cv
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions
import os

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

class PoseCamera:
    def __init__(self, camera_index=0, width=640, height=480, pose_detect=None): 
        self.cap = cv.VideoCapture(camera_index)
        self.cap.set(cv.CAP_PROP_FRAME_WIDTH, width)
        self.cap.set(cv.CAP_PROP_FRAME_HEIGHT, height)
        self.display_size = (width, height)
        
        self.POSE_CONNECTIONS = frozenset([
            (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8),
            (9, 10), (11, 12), (11, 13), (13, 15), (15, 17), (15, 19), (15, 21),
            (17, 19), (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
            (11, 23), (12, 24), (23, 24), (23, 25), (24, 26), (25, 27), (26, 28),
            (27, 29), (28, 30), (29, 31), (30, 32), (27, 31), (28, 32)
        ])
        
        if pose_detect is not None:
            self.pose = pose_detect
        else:
            options = PoseLandmarkerOptions(
                base_options=python.BaseOptions(model_asset_path='pose_landmarker_heavy.task'),
                running_mode=vision.RunningMode.IMAGE,
                num_poses=1,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5
            )
            self.pose = PoseLandmarker.create_from_options(options)
    
    def isOpened(self):
        return self.cap.isOpened()
    
    def get_frame(self):
        ret, frame = self.cap.read()
        if ret and frame is not None:
            frame = cv.resize(frame, self.display_size)
        return ret, frame
    
    def process_pose(self, frame):
        rgb_frame = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        res = self.pose.detect(mp_image)
        return res
    
    def draw_landmarks(self, res, frame):
        if res and res.pose_landmarks: #to change since i am manually drawing it on (only need the leg portion for this exercise?)
            for landmarks in res.pose_landmarks:
                h, w, _ = frame.shape

                for connection in self.POSE_CONNECTIONS:
                    start_idx, end_idx = connection
                    if start_idx < len(landmarks) and end_idx < len(landmarks):
                        start_point = (int(landmarks[start_idx].x * w), int(landmarks[start_idx].y * h))
                        end_point = (int(landmarks[end_idx].x * w), int(landmarks[end_idx].y * h))
                        cv.line(frame, start_point, end_point, (0, 255, 0), 2)
                
                for landmark in landmarks:
                    x = int(landmark.x * w)
                    y = int(landmark.y * h)
                    cv.circle(frame, (x, y), 3, (0, 0, 255), -1)
        return frame
    
    def quit(self):
        if hasattr(self, 'cap'):
            self.cap.release()