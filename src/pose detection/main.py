import cv2 as cv
import mediapipe as mp
import math
import os
from draw import PoseCamera
from analyze import Analyzer

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0" #needs to be 1 to work on mac

def _angle_deg(a, b, c):
    if a is None or b is None or c is None:
        return None
    bax, bay = a[0]-b[0], a[1]-b[1]
    bcx, bcy = c[0]-b[0], c[1]-b[1]
    na = math.hypot(bax, bay); nc = math.hypot(bcx, bcy)
    if na == 0 or nc == 0:
        return None
    cosv = max(-1.0, min(1.0, (bax*bcx + bay*bcy)/(na*nc)))
    return math.degrees(math.acos(cosv))

def knee_angle_from_result(res, side="RIGHT"):
    if not res or not res.pose_landmarks:
        return None
    lm = res.pose_landmarks.landmark
    if side.upper() == "RIGHT":
        hip_i, knee_i, ankle_i = 24, 26, 28
    else:
        hip_i, knee_i, ankle_i = 23, 25, 27
    hip   = (lm[hip_i].x,   lm[hip_i].y)
    knee  = (lm[knee_i].x,  lm[knee_i].y)
    ankle = (lm[ankle_i].x, lm[ankle_i].y)
    return _angle_deg(hip, knee, ankle)

class PoseApp:
    def __init__(self):
        self.side = "RIGHT"
        self.pose_detect = mp.solutions.pose.Pose()
        self.cams = {
            'Sagittal Plane':PoseCamera(0,pose_detect=self.pose_detect)
            # ,'Frontal Plane': PoseCamera(1, pose_detect=self.pose_detect)
        }
        self.analyzer = Analyzer()

    def run(self):
        while True: 
            for view, cam in self.cams.items():
                ret, frame = cam.get_frame()
                if ret:
                    res = cam.process_pose(frame)
                    frame_landmarks = cam.draw_landmarks(res, frame)
                    knee_angle = knee_angle_from_result(res, side= self.side)
                    if knee_angle is not None:
                        self.analyzer.update(knee_angle)
                        
                        stats = self.analyzer.summary()
                        cv.putText(frame_landmarks,
                            f"Angle: {knee_angle:.1f} deg",
                            (20,40), cv.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
                        cv.putText(frame_landmarks,
                            f"ROM: {stats['rom_degree']:.1f}  Min: {stats['min_degree']:.1f}  Max: {stats['max_degree']:.1f}",
                            (20,75), cv.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
                    
                    cv.imshow(view, frame_landmarks)
            if cv.waitKey(1) == ord('q'):
                break

    def quit(self):
        for view, cam in self.cams.items():
            cam.quit()
        cv.destroyAllWindows()
    
if __name__ == "__main__":
    app = PoseApp()
    app.run()
    app.quit()
