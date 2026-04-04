"""Metrics for pose detection."""
import math

# MediaPipe landmark IDs for joints
RIGHT = {"hip": 24, "knee": 26, "ankle": 28}
LEFT  = {"hip": 23, "knee": 25, "ankle": 27}

def angle_deg(a, b, c):
    """Calculate the angle in degrees at point b formed by points a and c."""
    if a is None or b is None or c is None:
        return None
    bax, bay = a[0]-b[0], a[1]-b[1]
    bcx, bcy = c[0]-b[0], c[1]-b[1]
    na = math.hypot(bax, bay)
    nc = math.hypot(bcx, bcy)
    if na == 0 or nc == 0:
        return None
    cosv = max(-1.0, min(1.0, (bax*bcx + bay*bcy)/(na*nc)))
    return math.degrees(math.acos(cosv))

def knee_angle_from_result(res, side="RIGHT"):
    """Calculate the knee angle from a MediaPipe pose detection result."""
    if not res or not hasattr(res, 'pose_landmarks') or not res.pose_landmarks:
        return None

    try:
        landmarks = res.pose_landmarks[0]
        ids = RIGHT if side.upper().startswith("R") else LEFT

        def pt(i):
            lm = landmarks[i]
            return (lm.x, lm.y)

        hip   = pt(ids["hip"])
        knee  = pt(ids["knee"])
        ankle = pt(ids["ankle"])
        return angle_deg(hip, knee, ankle)
    except (IndexError, AttributeError, TypeError):
        return None
    