import os
os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"
import cv2 as cv
import mediapipe as mp # type: ignore

cap = cv.VideoCapture(0)
cap.set(cv.CAP_PROP_FRAME_HEIGHT,900)
cap.set(cv.CAP_PROP_FRAME_WIDTH,900)

mp_draw = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose
pose = mp_pose.Pose()


if not cap.isOpened():
    print("Camera cannot be accessed")
    exit()

while True:
    ret, frame = cap.read()

    imgRGB = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
    res = pose.process(imgRGB)
    # print(res.pose_landmarks)
    if res.pose_landmarks: 
        mp_draw.draw_landmarks(frame, res.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    if ret:
        cv.imshow("Capture", frame)    
        

        #few issues are that its hard to view it sideways, it might be okay for the straight leg raise but something to consider. I think we have to remove the other landmarks such as the one on the face but maybe even consider training our own model? that is more involved but worth to see what the previous dragon boat capstone did if we can find it, one link that might be useful is 

        #def wanna turn this more object oriented but did this more for POC? I think detecting other views may be difficult since it is unable to sense certain frames 

        if cv.waitKey(1) == ord('q'):
            break
cv.destroyAllWindows()