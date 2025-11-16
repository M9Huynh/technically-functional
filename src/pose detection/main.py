import cv2 as cv
import mediapipe as mp
import os
from draw import PoseCamera
from analyze import Analyzer
from metrics import knee_angle_from_result


os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0" #needs to be 1 to work on mac

class PoseApp:
    def __init__(self):
        self.side = None
        self.pose_detect = mp.solutions.pose.Pose()
        self.cams = {
            'Sample Video':PoseCamera('right leg knee extension sagittal plane.MP4',pose_detect=self.pose_detect)
            # 'Sample Video':PoseCamera('src/pose detection/knee.MP4',pose_detect=self.pose_detect)
            # 'Sagittal Plane':PoseCamera(0,pose_detect=self.pose_detect)
            # ,'Frontal Plane': PoseCamera(1, pose_detect=self.pose_detect)
        }
        self.analyzer = Analyzer()

    def run(self):
        while True:
            for view, cam in self.cams.items():
                ret, frame = cam.get_frame()
                if not ret:
                    # end of video or cannot read frame
                    self.quit()
                    return

                res = cam.process_pose(frame)
                frame_landmarks = cam.draw_landmarks(res, frame)
                # prompt user to choose a side
                if self.side is None:
                    cv.putText(
                        frame_landmarks,
                        "Select knee: press L (left) or R (right)",
                        (20, 40),
                        cv.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (255, 255, 255),
                        2,
                    )

                    cv.imshow(view, frame_landmarks)

                    # Handle key input (choose side or quit)
                    key = cv.waitKey(1) & 0xFF
                    if key == ord("q"):
                        return
                    elif key == ord("l"):
                        # user chose LEFT knee -> start 10s calibration
                        self.side = "LEFT"
                        self.analyzer.start_calibration(duration_s=10.0)
                    elif key == ord("r"):
                        # user chose RIGHT knee -> start 10s calibration
                        self.side = "RIGHT"
                        self.analyzer.start_calibration(duration_s=10.0)

                    # Go to next iteration until side is chosen
                    continue

                # once side is chosen, continue to compute the knee angle
                knee_angle = knee_angle_from_result(res, side=self.side)

                # always update analyzer when we have an angle
                if knee_angle is not None:
                    self.analyzer.update(knee_angle)

                # get current stats (includes calibrating flag)
                stats = self.analyzer.summary()

                # CALIBRATION PHASE (first ~10 seconds)
                if stats["calibrating"]:
                    cv.putText(
                        frame_landmarks,
                        "Calibration: deep bend then full extension",
                        (20, 40),
                        cv.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (255, 255, 255),   # white
                        2,
                    )

                # EXERCISE PHASE (after calibration phase has finished)
                else:
                    if knee_angle is not None:
                        cv.putText(
                            frame_landmarks,
                            f"Angle: {knee_angle:.1f} deg",
                            (20, 40),
                            cv.FONT_HERSHEY_SIMPLEX,
                            0.7,
                            (255, 255, 255),   # white
                            2,
                        )
                    cv.putText(
                        frame_landmarks,
                        f"ROM: {stats['rom_degree']:.1f}  Min: {stats['min_degree']:.1f}  Max: {stats['max_degree']:.1f}",
                        (20, 75),
                        cv.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (255, 255, 255),   # white 
                        2,
                    )
                    #includes reps/avg duration
                    cv.putText(
                        frame_landmarks,
                        f"Reps: {stats['rep_count']} Rep State: {stats['rep_state']} Avg Duration: {stats['avg_rep_duration']:.1f}",
                        (20, 110),
                        cv.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 0, 255),
                        2,
                        
                    )
                    
                cv.imshow(view, frame_landmarks)
            # global key to quit at any point
            key = cv.waitKey(1) & 0xFF
            if key == ord("q"):
                break


    def quit(self):
        for view, cam in self.cams.items():
            cam.quit()
        cv.destroyAllWindows()
    
if __name__ == "__main__":
    app = PoseApp()
    app.run()
    app.quit()
