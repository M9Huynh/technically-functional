import sys
import os
import math
import pytest
import numpy as np
from unittest.mock import Mock, patch
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src')))
from pose_detection.draw import PoseCamera, get_pose_connections, extract_landmarks, POSE_CONNECTIONS, LEG_CONNECTIONS

class TestPoseConnections:
    def test_all_connections(self):
        connections = get_pose_connections(legs_only=False)
        assert len(POSE_CONNECTIONS) > 0
        assert len(LEG_CONNECTIONS) > 0
        assert len(LEG_CONNECTIONS) < len(POSE_CONNECTIONS)
        assert set(connections) == set(POSE_CONNECTIONS)

    def test_leg_connections(self):
        connections = get_pose_connections(legs_only=True)
        assert set(connections) == set(LEG_CONNECTIONS)

class TestExtractLandmarks:
    def setup_method(self):
        class MockLandmark:
            def __init__(self, x, y, z):
                self.x = x
                self.y = y
                self.z = z
        class MockResult:
            def __init__(self):
                landmarks = [MockLandmark(i/33, i/33, i/33) for i in range(33)]
                self.pose_landmarks = [landmarks]
        
        self.mock_result = MockResult()
        self.empty_result = Mock()
        self.empty_result.pose_landmarks = None

    def test_extract_valid_landmarks(self):
        landmarks = extract_landmarks(self.mock_result)
        assert landmarks is not None
        assert len(landmarks) == 33
        for i, lm in enumerate(landmarks):
            expected = i/33
            assert math.isclose(lm["x"], expected, rel_tol=1e-5)
            assert math.isclose(lm["y"], expected, rel_tol=1e-5)
            assert math.isclose(lm["z"], expected, rel_tol=1e-5)
    
    def test_extract_invalid_landmarks(self):
        assert extract_landmarks(None) is None
        assert extract_landmarks(self.empty_result) is None

class TestPoseCamera:
    @patch('cv2.VideoCapture')
    @patch('pose_detection.draw.PoseLandmarker.create_from_options')
    def test_pose_camera_init(self, mock_create_from_options, mock_video_capture):
        mock_cap = Mock()
        mock_video_capture.return_value = mock_cap
        
        camera = PoseCamera(camera_index=0, width=640, height=480)
        
        assert camera.display_size == (640, 480)
        mock_cap.set.assert_called()
        mock_create_from_options.assert_called_once()

    @patch('cv2.VideoCapture')
    @patch('pose_detection.draw.PoseLandmarker.create_from_options')
    def test_get_frame(self, mock_create_from_options, mock_video_capture):
        """Test getting a frame from camera."""
        mock_cap = Mock()

        fake_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_cap.read.return_value = (True, fake_frame)
        mock_video_capture.return_value = mock_cap
        
        camera = PoseCamera()
        ret, frame = camera.get_frame()
        
        assert ret is True
        assert isinstance(frame, np.ndarray)
        assert frame.shape == (480, 640, 3) or frame.shape == (640, 480, 3)

    @patch('cv2.VideoCapture')
    @patch('pose_detection.draw.PoseLandmarker.create_from_options')
    def test_process_pose(self, mock_create_from_options, mock_video_capture):
        mock_cap = Mock()
        mock_video_capture.return_value = mock_cap

        camera = PoseCamera()
        
        mock_detector = Mock()
        camera.pose = mock_detector
        
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        mock_result = Mock()
        mock_detector.detect.return_value = mock_result
        
        result = camera.process_pose(mock_frame)
        
        assert result == mock_result
        mock_detector.detect.assert_called_once()

    @patch('cv2.VideoCapture')
    @patch('pose_detection.draw.PoseLandmarker.create_from_options')
    def test_draw_landmarks(self, mock_create_from_options, mock_video_capture):
        mock_cap = Mock()
        mock_video_capture.return_value = mock_cap
        
        camera = PoseCamera()
        
        class MockLandmark:
            def __init__(self, x, y):
                self.x = x
                self.y = y
        
        class MockResult:
            def __init__(self):
                landmarks = [MockLandmark(0.1 * i, 0.1 * i) for i in range(33)]
                self.pose_landmarks = [landmarks]
        
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        with patch('cv2.line') as mock_line, patch('cv2.circle') as mock_circle:
            result = camera.draw_landmarks(MockResult(), mock_frame)
            
            assert result is mock_frame