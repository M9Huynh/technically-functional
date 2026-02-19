import cv2 as cv
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
from flask import Flask, jsonify
from flask_cors import CORS
import base64
from draw import PoseCamera
from analyze import Analyzer
from metrics import knee_angle_from_result
import threading
import time

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

app = Flask(__name__)
CORS(app) 

class IPCameraPoseApp:
    def __init__(self, phone_ip, phone_port=8080):
        self.side = "RIGHT"
        
        options = vision.PoseLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path='pose_landmarker_heavy.task'),
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.pose_detect = vision.PoseLandmarker.create_from_options(options)

        self.phone_ip = phone_ip
        self.phone_port = phone_port
        self.video_url = f"http://{phone_ip}:{phone_port}/video"
        
        self.cap = cv.VideoCapture(self.video_url)
        self.cap.set(cv.CAP_PROP_BUFFERSIZE, 1) 
        
        self.target_width = 640
        self.target_height = 480
        
        self.cam = PoseCamera(None, pose_detect=self.pose_detect)
        self.cam.display_size = (self.target_width, self.target_height)
        
        self.analyzer = Analyzer()
        self.analyzer.start_calibration(duration_s=10.0)
        
        self.latest_frame = None
        self.latest_result = None
        self.latest_metrics = None
        self.frame_lock = threading.Lock()
        self.running = True
        
        self.frame_skip = 2
        self.frame_count = 0
        
        # Start processing thread
        self.thread = threading.Thread(target=self._processing_loop)
        self.thread.daemon = True
        self.thread.start()
        
            
    def _processing_loop(self):
        while self.running:
            try:
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    time.sleep(0.1)
                    continue
                    
                frame = cv.resize(frame, (self.target_width, self.target_height))
                self.frame_count += 1
                
                with self.frame_lock:
                    self.latest_frame = frame
                    
                    if self.frame_count % self.frame_skip == 0:
                        result = self.cam.process_pose(frame)
                        
                        if result and result.pose_landmarks:
                            knee_angle = knee_angle_from_result(result, side=self.side)
                            if knee_angle:
                                self.analyzer.update(knee_angle)
                                metrics = self.analyzer.summary()
                                metrics['current_angle'] = round(knee_angle, 1)
                                self.latest_metrics = metrics
            except:
                time.sleep(0.1)   

    def get_frame_with_landmarks(self):
        with self.frame_lock:
            if self.latest_frame is not None:
                if self.latest_result is not None and self.latest_result.pose_landmarks:
                    frame_copy = self.latest_frame.copy()
                    frame_with_landmarks = self.cam.draw_landmarks(self.latest_result, frame_copy)
                    return frame_with_landmarks
                else:
                    return self.latest_frame.copy()
            return None
    
    def get_current_metrics(self):
        """Get the latest metrics"""
        with self.frame_lock:
            if self.latest_metrics:
                return self.latest_metrics.copy()
            return {
                "current_angle": 0,
                "min_degree": 0,
                "max_degree": 0,
                "rom_degree": 0,
                "rep_count": 0,
                "current_rep_duration": 0,
                "avg_rep_duration": 0,
                "rep_state": "None",
                "calibrating": True,
                "cal_time_left": 10.0,
                }        

PHONE_IP = "192.168.2.88"  #phone's ip
pose_app = IPCameraPoseApp(phone_ip=PHONE_IP)

@app.route('/', methods=['GET'])
def process():    
    frame_landmarks = pose_app.get_frame_with_landmarks()
    metrics = pose_app.get_current_metrics()

    if frame_landmarks is None:
        return jsonify({
            "error": "Waiting for phone feed",
            "image": None,
            "metrics": metrics,
        })
    
    _, buffer = cv.imencode('.jpg', frame_landmarks, [cv.IMWRITE_JPEG_QUALITY, 70])
    img_str = base64.b64encode(buffer).decode('utf-8')
    
    return jsonify({
        "image": img_str,
        "metrics": metrics,
    })

if __name__ == '__main__':
    print("Open in browser: http://localhost:5000")    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)