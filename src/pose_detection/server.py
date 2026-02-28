import os
import base64
import threading
import cv2 as cv
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from draw import PoseCamera, extract_landmarks, extract_lower_body_landmarks, get_pose_connections
from analyze import Analyzer
from metrics import knee_angle_from_result

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

app = Flask(__name__)
CORS(app)

def b64_to_bgr_image(b64_str: str):
    img_bytes = base64.b64decode(b64_str)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv.imdecode(np_arr, cv.IMREAD_COLOR)
    return frame

class PoseBackend:
    def __init__(self):
        self.lock = threading.Lock()

        HERE = os.path.dirname(os.path.abspath(__file__))
        MODEL_PATH = os.path.join(HERE, "pose_landmarker_lite.task")
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"Model file missing at: {MODEL_PATH}")

        options = vision.PoseLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        pose_detect = vision.PoseLandmarker.create_from_options(options)

        self.cam = PoseCamera(None, pose_detect=pose_detect)
        self.reset()

    def reset(self):
        self.analyzer = Analyzer()
        self.analyzer.start_calibration(duration_s=10.0)

    def default_metrics(self):
        return {
            "angle": 0,
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

pose_app = PoseBackend()

@app.route("/reset", methods=["POST"])
def reset_backend():
    with pose_app.lock:
        pose_app.reset()
    return jsonify({"ok": True})

@app.route("/process_frame", methods=["POST"])
def process_frame():
    data = request.get_json(silent=True) or {}
    b64 = data.get("imageBase64")
    side = data.get("side", "RIGHT")
    mirrored = bool(data.get("mirrored", True))
    legs_only = bool(data.get("legsOnly", True))

    if not b64:
        return jsonify({
            "error": "Missing imageBase64",
            "landmarks": None,
            "connections": get_pose_connections(legs_only),
            "metrics": pose_app.default_metrics(),
        }), 400

    frame = b64_to_bgr_image(b64)
    if frame is None:
        return jsonify({
            "error": "Could not decode image",
            "landmarks": None,
            "connections": get_pose_connections(legs_only),
            "metrics": pose_app.default_metrics(),
        }), 400

    frame = cv.resize(frame, (640, 480))

    # flip for front camera BEFORE mediapipe
    if mirrored:
        frame = cv.flip(frame, 1)

    with pose_app.lock:
        res = pose_app.cam.process_pose(frame)

        if legs_only:
            landmarks = extract_lower_body_landmarks(res)  # Use new function
        else:
            landmarks = extract_landmarks(res)
        metrics = pose_app.default_metrics()

        if landmarks is not None:
            knee_angle = knee_angle_from_result(res, side=side)
            if knee_angle is not None:
                pose_app.analyzer.update(knee_angle)
                metrics = pose_app.analyzer.summary()
                metrics["angle"] = round(float(knee_angle), 1)

        return jsonify({
            "landmarks": landmarks,
            "connections": get_pose_connections(legs_only),
            "metrics": metrics
        })

if __name__ == "__main__":
    print("Flask running on http://0.0.0.0:5001")
    app.run(host="0.0.0.0", port=5001, debug=False, threaded=True)