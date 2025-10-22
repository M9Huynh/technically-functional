# import os
# # os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0" #this makes it load a bit faster

import cv2
import mediapipe as mp
import numpy as np
from datetime import datetime
import os
import csv
from collections import deque
import time
 
#Config ---------------
CAM_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 360
MODEL_COMPLEXITY = 0
MIN_DET_CONF = 0.5
MIN_TRK_CONF = 0.5
SMOOTH_WINDOW = 5            # moving avg frames for angle smoothing
CALIB_SECONDS = 1.0          # seconds to average when calibrating
HYSTERESIS = 5.0             # extra degrees between flex/extend thresholds
 
OUTPUT_DIR = "poc_outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)
CSV_PATH = os.path.join(OUTPUT_DIR, "pose_log.csv")
 
mp_pose = mp.solutions.pose
mp_draw = mp.solutions.drawing_utils
 
def angle_deg(a, b, c):
    """Angle ∠ABC in degrees given points a,b,c as (x,y)."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba, bc = a - b, c - b
    nba, nbc = np.linalg.norm(ba), np.linalg.norm(bc)
    if nba == 0 or nbc == 0:
        return 0.0
    cosang = np.dot(ba, bc) / (nba * nbc)
    cosang = np.clip(cosang, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosang)))
 
def collect_average_angle(pose, cap, duration_sec=1.0):
    """Collect knee angle over duration and return average (blocking)."""
    samples = []
    end_t = time.time() + duration_sec
    while time.time() < end_t:
        ok, frame = cap.read()
        if not ok:
            break
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)
        if res.pose_landmarks:
            lm = res.pose_landmarks.landmark
            hip  = lm[mp_pose.PoseLandmark.RIGHT_HIP]
            knee = lm[mp_pose.PoseLandmark.RIGHT_KNEE]
            ankle= lm[mp_pose.PoseLandmark.RIGHT_ANKLE]
            ang = angle_deg((hip.x, hip.y), (knee.x, knee.y), (ankle.x, ankle.y))
            samples.append(ang)
        cv2.putText(frame, "Calibrating...", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (50,200,255), 2)
        cv2.imshow("Right Knee (macOS)", frame)
        cv2.waitKey(1)
    return float(np.mean(samples)) if samples else 0.0
 
def main():
    # macOS-friendly backend
    cap = cv2.VideoCapture(CAM_INDEX, cv2.CAP_AVFOUNDATION) #change this to not error on windows
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
 
    if not cap.isOpened():
        print(f"[ERROR] Cannot open camera index={CAM_INDEX}. Try CAM_INDEX=1 and ensure camera permission is granted.")
        return
 
    # CSV logging
    csv_file = open(CSV_PATH, "w", newline="")
    csv_writer = csv.writer(csv_file)
    csv_writer.writerow(["timestamp", "angle_deg", "label", "state", "reps"])
 
    angle_buf = deque(maxlen=SMOOTH_WINDOW)
    reps = 0
    state = "flexed"  # start assuming flexed
 
    # default thresholds (workable without calibration)
    thresh_extend = 165.0
    thresh_flex = 150.0
 
    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=MODEL_COMPLEXITY,
        enable_segmentation=False,
        min_detection_confidence=MIN_DET_CONF,
        min_tracking_confidence=MIN_TRK_CONF
    ) as pose:
 
        print("Right-knee detector running. q=quit  s=screenshot  e=calibrate extended  f=calibrate flexed")
        while True:
            ok, frame = cap.read()
            if not ok:
                print("[ERROR] Frame capture failed.")
                break
 
            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = pose.process(rgb)
 
            label = "No pose"
            angle_display = "--"
 
            if res.pose_landmarks:
                lm = res.pose_landmarks.landmark
                hip  = lm[mp_pose.PoseLandmark.RIGHT_HIP]
                knee = lm[mp_pose.PoseLandmark.RIGHT_KNEE]
                ankle= lm[mp_pose.PoseLandmark.RIGHT_ANKLE]
 
                ang = angle_deg((hip.x, hip.y), (knee.x, knee.y), (ankle.x, ankle.y))
                angle_buf.append(ang)
                smooth_ang = float(np.mean(angle_buf))
                angle_display = f"{smooth_ang:.0f}°"
 
                # Update state with hysteresis thresholds
                if state == "flexed" and smooth_ang >= thresh_extend:
                    state = "extended"
                elif state == "extended" and smooth_ang <= thresh_flex:
                    state = "flexed"
                    reps += 1
 
                label = "Right knee EXTENDED" if state == "extended" else "Right knee FLEXED"
 
                mp_draw.draw_landmarks(
                    frame, res.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_draw.DrawingSpec(color=(0,255,0), thickness=2, circle_radius=2),
                    connection_drawing_spec=mp_draw.DrawingSpec(color=(0,128,255), thickness=2)
                )
 
                csv_writer.writerow([datetime.now().isoformat(), f"{smooth_ang:.2f}", label, state, reps])
 
            cv2.putText(frame, f"{label}", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20,200,20), 2)
            cv2.putText(frame, f"Angle: {angle_display}", (10, 56), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (230,230,230), 2)
            cv2.putText(frame, f"Reps: {reps}", (10, 84), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
            cv2.putText(frame, f"State: {state}", (10, 112), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,200,200), 2)
            cv2.putText(frame, f"Extend>= {thresh_extend:.0f}  |  Flex<= {thresh_flex:.0f}", (10, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200,220,255), 2)
            cv2.putText(frame, "q=quit  s=snap  e=calibrate-extend  f=calibrate-flex", (10, frame.shape[0]-12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180,180,180), 1)
 
            cv2.imshow("Right Knee (macOS)", frame)
            k = cv2.waitKey(1) & 0xFF
 
            if k == ord('q'):
                break
            elif k == ord('s'):
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                path = os.path.join(OUTPUT_DIR, f"knee_right_{ts}.png")
                cv2.imwrite(path, frame)
                print(f"[INFO] Saved screenshot: {path}")
            elif k == ord('e'):
                print("[CAL] Hold RIGHT knee fully extended. Capturing...")
                ext_angle = collect_average_angle(pose, cap, CALIB_SECONDS)
                if ext_angle > 0:
                    thresh_extend = max(ext_angle - HYSTERESIS, 150.0)
                    print(f"[CAL] Extended baseline: {ext_angle:.1f}° → thresh_extend={thresh_extend:.1f}°")
                else:
                    print("[CAL] Failed to calibrate extended (no landmarks).")
            elif k == ord('f'):
                print("[CAL] Bend RIGHT knee (flex). Capturing...")
                flex_angle = collect_average_angle(pose, cap, CALIB_SECONDS)
                if flex_angle > 0:
                    thresh_flex = min(flex_angle + HYSTERESIS, 179.0)
                    print(f"[CAL] Flexed baseline: {flex_angle:.1f}° → thresh_flex={thresh_flex:.1f}°")
                else:
                    print("[CAL] Failed to calibrate flex (no landmarks).")
 
    cap.release()
    cv2.destroyAllWindows()
    csv_file.close()
    print(f"[INFO] CSV log saved to: {CSV_PATH}")
 
if __name__ == "__main__":
    main()
 