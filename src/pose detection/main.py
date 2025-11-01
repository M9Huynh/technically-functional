import cv2 as cv
import mediapipe as mp
import os
from draw import PoseCamera
from analyze import Analyzer

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

class PoseApp:
    def __init__(self):
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
                    knee_angle = cam.knee_angle if hasattr(cam, "knee_angle") else None
                    if knee_angle is not None:
                        self.analyzer.update(knee_angle)
                        stats = self.analyzer.summary()
                    
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
