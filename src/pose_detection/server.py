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

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

app = Flask(__name__)
CORS(app) 

class FlaskPoseApp:
    def __init__(self):
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
        
        self.cam = PoseCamera(0, pose_detect=self.pose_detect)
        self.analyzer = Analyzer()
        self.analyzer.start_calibration(duration_s=10.0)

pose_app = FlaskPoseApp()

@app.route('/', methods=['GET'])
def process():
    ret, frame = pose_app.cam.get_frame()
    
    if not ret:
        return jsonify({"error": "No frame"})
    
    res = pose_app.cam.process_pose(frame)
    frame_landmarks = pose_app.cam.draw_landmarks(res, frame)
    
    knee_angle = knee_angle_from_result(res, side=pose_app.side)
    
    metrics = None
    if knee_angle is not None:
        pose_app.analyzer.update(knee_angle)
        stats = pose_app.analyzer.summary()
        
        metrics = {
            "angle": round(knee_angle, 1),
            "rom_degree": stats['rom_degree'],
            "min_degree": stats['min_degree'],
            "max_degree": stats['max_degree'],
            "rep_count": stats['rep_count'],
            "current_rep_duration": round(stats['current_rep_duration'], 1),
            "avg_rep_duration": round(stats['avg_rep_duration'], 1),
            "rep_state": stats['rep_state']
        }
    
    _, buffer = cv.imencode('.jpg', frame_landmarks)
    img_str = base64.b64encode(buffer).decode('utf-8')
    
    return jsonify({
        "image": img_str,
        "metrics": metrics
    })

if __name__ == '__main__':
    print("Open in browser: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)