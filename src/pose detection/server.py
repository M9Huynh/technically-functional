import cv2 as cv
import mediapipe as mp
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
        self.pose_detect = mp.solutions.pose.Pose()
        self.cam = PoseCamera(0, pose_detect=self.pose_detect) #change number based on what camera you are using (0 for webcam, 1 for external)
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
        
        # cv.putText(frame_landmarks,
        #     f"Angle: {knee_angle:.1f} deg",
        #     (20,40), cv.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
        # cv.putText(frame_landmarks,
        #     f"ROM: {stats['rom_degree']:.1f}  Min: {stats['min_degree']:.1f}  Max: {stats['max_degree']:.1f}",
        #     (20,75), cv.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
        # cv.putText(frame_landmarks,
        #     f"Reps: {stats['rep_count']} Rep State: {stats['rep_state']} Avg Duration: {stats['avg_rep_duration']:.1f}",
        #     (20, 110), cv.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2,)
        
        metrics = {
            "angle": knee_angle,
            "rom_degree": stats['rom_degree'],
            "min_degree": stats['min_degree'],
            "max_degree": stats['max_degree'],
            "rep_count" : stats['rep_count'],
            "current_rep_duration" : stats['current_rep_duration'],
            "avg_rep_duration" : stats['avg_rep_duration'],
            "rep_state" : stats['rep_state']
        }
    
    _, buffer = cv.imencode('.jpg', frame_landmarks)
    img_str = base64.b64encode(buffer).decode('utf-8')
    
    return jsonify({
        "image": img_str,
        "metrics": metrics
    })

if __name__ == '__main__':
    print("Open in browser: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)
