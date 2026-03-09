import sys
import os
import math
import pytest
from unittest.mock import patch
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src')))
from pose_detection.metrics import angle_deg, knee_angle_from_result

class TestAngleCalc:

    def test_angle_90(self):
        a = (0, 1)
        b = (1, 1)
        c = (1, 0)
        assert math.isclose(angle_deg(a, b, c), 90.0, rel_tol=0.01)

    def test_angle_45(self):
        a = (0, 1)
        b = (1, 1)
        c = (0, 0)
        assert math.isclose(angle_deg(a, b, c), 45.0, rel_tol=0.01)

    def test_angle_180(self):
        a = (0, 1)
        b = (1, 1)
        c = (2, 1)
        assert math.isclose(angle_deg(a, b, c), 180.0, rel_tol=0.01)    
    
    def test_missing_joints(self):
        assert angle_deg(None, (1,1), (1,0)) is None
        assert angle_deg((0,1), None, (1,0)) is None
        assert angle_deg((0,1), (1,1), None) is None

class TestKneeAngleFromResult:
    def setup_method(self):
            class MockLandmark:
                def __init__(self, x, y, z=0):
                    self.x = x
                    self.y = y
                    self.z = z
            
            class MockResult:
                def __init__(self):
                    self.pose_landmarks = [[MockLandmark(0, 0) for i in range(33)]]
                    
                    #RIGHT
                    self.pose_landmarks[0][24] = MockLandmark(0, 1)
                    self.pose_landmarks[0][26] = MockLandmark(1, 1)
                    self.pose_landmarks[0][28] = MockLandmark(1, 0)
                    
                    #LEFT
                    self.pose_landmarks[0][23] = MockLandmark(0, 1)
                    self.pose_landmarks[0][25] = MockLandmark(1, 1)
                    self.pose_landmarks[0][27] = MockLandmark(1, 0)
            
            self.mock_result = MockResult()

    def test_valid_right_knee(self):
        angle = knee_angle_from_result(self.mock_result, side="RIGHT")
        assert angle is not None
        assert 0 <= angle <= 180

    def test_valid_left_knee(self):
        angle = knee_angle_from_result(self.mock_result, side="LEFT")
        assert angle is not None
        assert 0 <= angle <= 180

    def test_no_result(self):
        assert knee_angle_from_result(None) is None

    def test_no_landmarks(self):
        class Sample: pass
        res = Sample()
        res.pose_landmarks = None
        assert knee_angle_from_result(res) is None

    def test_invalid_right_knee(self):
        self.mock_result.pose_landmarks[0][26] = None
        assert knee_angle_from_result(self.mock_result, side="RIGHT") is None

    def test_invalid_left_knee(self):
        self.mock_result.pose_landmarks[0][25] = None
        assert knee_angle_from_result(self.mock_result, side="LEFT") is None

    def test_empty_landmarks(self):
        self.mock_result.pose_landmarks = []
        assert knee_angle_from_result(self.mock_result) is None
