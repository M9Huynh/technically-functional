import os
import base64
import threading
import cv2 as cv
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from draw import PoseCamera, extract_landmarks, get_pose_connections
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


def mean_brightness(frame):
    gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
    return float(np.mean(gray))


def darkness_score(frame):
    gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
    dark_pixels = np.sum(gray < 35)
    total_pixels = gray.size
    return dark_pixels / total_pixels


def is_too_dark(frame):
    brightness = mean_brightness(frame)
    dark_ratio = darkness_score(frame)
    too_dark = brightness < 55.0 or dark_ratio > 0.75
    return too_dark, brightness, dark_ratio


def point_in_frame(pt):
    if pt is None:
        return False

    x = pt.get("x", -1)
    y = pt.get("y", -1)

    return 0 <= x <= 1 and 0 <= y <= 1


def check_side_visibility(landmarks, side: str):
    if not landmarks or len(landmarks) < 29:
        return False, False

    if side == "RIGHT":
        hip_idx, knee_idx, ankle_idx = 24, 26, 28
    else:
        hip_idx, knee_idx, ankle_idx = 23, 25, 27

    hip = landmarks[hip_idx] if hip_idx < len(landmarks) else None
    knee = landmarks[knee_idx] if knee_idx < len(landmarks) else None
    ankle = landmarks[ankle_idx] if ankle_idx < len(landmarks) else None

    knee_visible = point_in_frame(knee)
    nearby_visible = point_in_frame(hip) or point_in_frame(ankle)

    side_in_frame = knee_visible and nearby_visible
    return side_in_frame, knee_visible


class PoseBackend:
    def __init__(self):
        self.lock = threading.Lock()

        HERE = os.path.dirname(os.path.abspath(__file__))
        MODEL_PATH = os.path.join(HERE, "pose_landmarker_heavy.task")
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
            "cue_state": "CALIBRATING" if self.analyzer.is_calibrating else "GETTING_READY",
            "calibrating": self.analyzer.is_calibrating,
            "cal_time_left": 10.0 if self.analyzer.is_calibrating else 0.0,
        }


pose_app = PoseBackend()


@app.route("/reset", methods=["POST"])
def reset_backend():
    with pose_app.lock:
        pose_app.reset()
    return jsonify({"ok": True})


@app.route("/precheck_frame", methods=["POST"])
def precheck_frame():
    try:
        data = request.get_json(silent=True) or {}
        b64 = data.get("imageBase64")
        side = data.get("side", "RIGHT")
        mirrored = bool(data.get("mirrored", True))

        if not b64:
            return jsonify({
                "ok": False,
                "tooDark": False,
                "inFrame": False,
                "kneeVisible": False,
                "message": "Missing image frame."
            }), 400

        frame = b64_to_bgr_image(b64)
        if frame is None:
            return jsonify({
                "ok": False,
                "tooDark": False,
                "inFrame": False,
                "kneeVisible": False,
                "message": "Could not decode image."
            }), 400

        frame = cv.resize(frame, (640, 480))

        if mirrored:
            frame = cv.flip(frame, 1)

        too_dark, brightness, dark_ratio = is_too_dark(frame)

        if too_dark:
            return jsonify({
                "ok": False,
                "tooDark": True,
                "inFrame": False,
                "kneeVisible": False,
                "message": "Environment is too dark. Please move to a brighter area."
            })

        with pose_app.lock:
            res = pose_app.cam.process_pose(frame)
            landmarks = extract_landmarks(res)

        if not landmarks or len(landmarks) < 29:
            return jsonify({
                "ok": False,
                "tooDark": False,
                "inFrame": False,
                "kneeVisible": False,
                "message": "Please move fully into frame before starting."
            })

        in_frame, knee_visible = check_side_visibility(landmarks, side)

        if not knee_visible:
            return jsonify({
                "ok": False,
                "tooDark": False,
                "inFrame": in_frame,
                "kneeVisible": False,
                "message": f"Please make sure your {side.lower()} knee is clearly visible."
            })

        return jsonify({
            "ok": True,
            "tooDark": False,
            "inFrame": True,
            "kneeVisible": True,
            "message": "Setup looks good. Ready to start."
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "tooDark": False,
            "inFrame": False,
            "kneeVisible": False,
            "message": f"Precheck failed: {str(e)}"
        }), 500


@app.route("/process_frame", methods=["POST"])
def process_frame():
    data = request.get_json(silent=True) or {}
    b64 = data.get("imageBase64")
    side = data.get("side", "RIGHT")
    mirrored = bool(data.get("mirrored", True))
    legs_only = bool(data.get("legsOnly", True))

    print("PROCESS_FRAME side:", side, "mirrored:", mirrored)

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

    if mirrored:
        frame = cv.flip(frame, 1)

    with pose_app.lock:
        res = pose_app.cam.process_pose(frame)
        landmarks = extract_landmarks(res)
        metrics = pose_app.default_metrics()

        # No landmarks at all -> tracking lost
        if not landmarks or len(landmarks) < 29:
            pose_app.analyzer.update(None)
            metrics = pose_app.analyzer.summary()
            return jsonify({
                "landmarks": None,
                "connections": get_pose_connections(legs_only),
                "metrics": metrics
            })

        # Selected side must be clearly visible
        side_in_frame, knee_visible = check_side_visibility(landmarks, side)
        if not side_in_frame or not knee_visible:
            pose_app.analyzer.update(None)
            metrics = pose_app.analyzer.summary()
            return jsonify({
                "landmarks": landmarks,
                "connections": get_pose_connections(legs_only),
                "metrics": metrics
            })

        knee_angle = knee_angle_from_result(res, side=side)

        if knee_angle is None or not np.isfinite(knee_angle):
            pose_app.analyzer.update(None)
            metrics = pose_app.analyzer.summary()
            return jsonify({
                "landmarks": landmarks,
                "connections": get_pose_connections(legs_only),
                "metrics": metrics
            })

        if knee_angle < 0 or knee_angle > 180:
            pose_app.analyzer.update(None)
            metrics = pose_app.analyzer.summary()
            return jsonify({
                "landmarks": landmarks,
                "connections": get_pose_connections(legs_only),
                "metrics": metrics
            })

        pose_app.analyzer.update(float(knee_angle))
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