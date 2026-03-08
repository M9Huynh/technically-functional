import sys
import os
import json
import base64
import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock

sys.modules['draw'] = Mock()
sys.modules['analyze'] = Mock()
sys.modules['metrics'] = Mock()

sys.modules['draw'].PoseCamera = Mock
sys.modules['draw'].extract_landmarks = Mock(return_value=None)
sys.modules['draw'].get_pose_connections = Mock(return_value=[])
sys.modules['analyze'].Analyzer = Mock
sys.modules['metrics'].knee_angle_from_result = Mock(return_value=45.0)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src')))
from pose_detection.server import app, PoseBackend

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

class TestPoseBackend:
    def test_pose_backend_init(self):
        with patch('pose_detection.server.PoseCamera') as mock_camera:
            with patch('pose_detection.server.vision.PoseLandmarker.create_from_options'):
                with patch('pose_detection.server.Analyzer') as mock_analyzer_class:
                    mock_analyzer = Mock()
                    mock_analyzer.is_calibrating = True
                    mock_analyzer_class.return_value = mock_analyzer
                    
                    backend = PoseBackend()
                    assert backend.analyzer is not None
                    assert backend.analyzer.is_calibrating is True
    
    def test_reset(self):
        with patch('pose_detection.server.PoseCamera'):
            with patch('pose_detection.server.vision.PoseLandmarker.create_from_options'):
                with patch('pose_detection.server.Analyzer') as mock_analyzer_class:
                    mock_analyzer1 = Mock()
                    mock_analyzer1.is_calibrating = True
                    
                    mock_analyzer2 = Mock()
                    mock_analyzer2.is_calibrating = True
                    
                    mock_analyzer_class.side_effect = [mock_analyzer1, mock_analyzer2]
                    
                    backend = PoseBackend()
                    old_analyzer = backend.analyzer
                    
                    backend.reset()
                    
                    assert backend.analyzer is not old_analyzer
                    assert backend.analyzer.is_calibrating is True

class TestServerEndpoints:    
    def test_reset_endpoint(self, client):
        with patch('pose_detection.server.pose_app') as mock_pose_app:
            mock_pose_app.reset = Mock()
            
            response = client.post('/reset')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data["ok"] is True
            mock_pose_app.reset.assert_called_once()
    
    def test_process_frame_missing_image(self, client):
        response = client.post('/process_frame', json={})
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data
        assert data["landmarks"] is None
    
    def test_process_frame_invalid_base64(self, client):
        with patch('pose_detection.server.b64_to_bgr_image') as mock_b64:
            mock_b64.return_value = None
            
            response = client.post('/process_frame', json={
                'imageBase64': 'not-valid-base64'
            })
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert "error" in data
    
    @patch('pose_detection.server.b64_to_bgr_image')
    def test_process_frame_success(self, mock_b64_to_bgr, client):
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_b64_to_bgr.return_value = mock_frame

        with patch('pose_detection.server.pose_app') as mock_pose_app:
            mock_pose_app.cam.process_pose.return_value = Mock()
            
            mock_analyzer = Mock()
            mock_analyzer.summary.return_value = {
                "min_degree": 30.1,
                "max_degree": 70.5,
                "rom_degree": 40.4,
                "calibrating": False,
                "cal_time_left": 0,
                "rep_count": 5,
                "current_rep_duration": 1.2,
                "avg_rep_duration": 1.1,
                "rep_state": "Extension"
            }
            mock_pose_app.analyzer = mock_analyzer
            mock_pose_app.default_metrics.return_value = {
                "angle": 0, 
                "min_degree": 0, 
                "max_degree": 0, 
                "rom_degree": 0,
                "rep_count": 0, 
                "current_rep_duration": 0, 
                "avg_rep_duration": 0,
                "rep_state": "None", 
                "calibrating": True, 
                "cal_time_left": 10.0
            }
            
            with patch('pose_detection.server.knee_angle_from_result') as mock_knee:
                mock_knee.return_value = 45.6
                with patch('pose_detection.server.extract_landmarks') as mock_extract:
                    mock_extract.return_value = [{"x": 0.1, "y": 0.2, "z": 0.3} for _ in range(33)]
                    with patch('pose_detection.server.get_pose_connections') as mock_conn:
                        mock_conn.return_value = [(23, 25), (24, 26)]
                        
                        fake_image = base64.b64encode(b'fake_image_data').decode('utf-8')
                        
                        response = client.post('/process_frame', json={
                            'imageBase64': fake_image,
                            'side': 'RIGHT',
                            'mirrored': True,
                            'legsOnly': True
                        })
                        
                        assert response.status_code == 200
                        data = json.loads(response.data)
                        
                        assert "landmarks" in data
                        assert "connections" in data
                        assert "metrics" in data
                        assert len(data["landmarks"]) == 33
                        assert len(data["connections"]) == 2

                        metrics = data["metrics"]
                        assert metrics["angle"] == 45.6
                        assert metrics["rep_count"] == 5
                        assert metrics["rep_state"] == "Extension"
                        
                        mock_analyzer.update.assert_called_once_with(45.6)
    
    @patch('pose_detection.server.b64_to_bgr_image')
    def test_process_frame_no_landmarks(self, mock_b64_to_bgr, client):
        mock_b64_to_bgr.return_value = np.zeros((480, 640, 3), dtype=np.uint8)
        with patch('pose_detection.server.pose_app') as mock_pose_app:
            mock_pose_app.cam.process_pose.return_value = Mock()
            mock_pose_app.default_metrics.return_value = {
                "angle": 0, 
                "min_degree": 0, 
                "max_degree": 0, 
                "rom_degree": 0,
                "rep_count": 0, 
                "current_rep_duration": 0, 
                "avg_rep_duration": 0,
                "rep_state": "None", 
                "calibrating": True,
                "cal_time_left": 10.0
            }
            with patch('pose_detection.server.extract_landmarks') as mock_extract:
                mock_extract.return_value = None
                
                fake_image = base64.b64encode(b'fake_image_data').decode('utf-8')
                
                response = client.post('/process_frame', json={
                    'imageBase64': fake_image,
                    'side': 'RIGHT'
                })
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data["landmarks"] is None
                assert data["metrics"]["calibrating"] is True
    
    @patch('pose_detection.server.b64_to_bgr_image')
    def test_process_frame_mirroring(self, mock_b64_to_bgr, client):
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_b64_to_bgr.return_value = mock_frame
        with patch('cv2.flip') as mock_flip:
            with patch('pose_detection.server.pose_app') as mock_pose_app:
                mock_pose_app.cam.process_pose.return_value = Mock()
                mock_pose_app.default_metrics.return_value = {}
                with patch('pose_detection.server.extract_landmarks') as mock_extract:
                    mock_extract.return_value = None
                    
                    fake_image = base64.b64encode(b'fake_image_data').decode('utf-8')
                    
                    client.post('/process_frame', json={
                        'imageBase64': fake_image,
                        'mirrored': True
                    })
                    mock_flip.assert_called_once()
                    args, kwargs = mock_flip.call_args
                    assert len(args) >= 2
                    assert isinstance(args[0], np.ndarray)
                    assert args[0].shape == (480, 640, 3) 
                    assert args[1] == 1  

    @patch('pose_detection.server.b64_to_bgr_image')
    def test_process_frame_no_mirroring(self, mock_b64_to_bgr, client):
        """Test that mirrored=False does not flip the frame."""
        mock_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_b64_to_bgr.return_value = mock_frame
        with patch('cv2.flip') as mock_flip:
            with patch('pose_detection.server.pose_app') as mock_pose_app:
                mock_pose_app.cam.process_pose.return_value = Mock()
                mock_pose_app.default_metrics.return_value = {}
                with patch('pose_detection.server.extract_landmarks') as mock_extract:
                    mock_extract.return_value = None
                    
                    fake_image = base64.b64encode(b'fake_image_data').decode('utf-8')
                    
                    client.post('/process_frame', json={
                        'imageBase64': fake_image,
                        'mirrored': False
                    })
                    
                    mock_flip.assert_not_called()
    
    def test_b64_to_bgr_image_function(self):
        from pose_detection.server import b64_to_bgr_image

        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        test_image[30:70, 30:70] = [255, 0, 0] 
        
        import cv2
        _, buffer = cv2.imencode('.jpg', test_image)
        b64_str = base64.b64encode(buffer).decode('utf-8')
        
        result = b64_to_bgr_image(b64_str)
        
        assert result is not None
        assert isinstance(result, np.ndarray)
        assert result.shape == (100, 100, 3)

class TestServerEdgeCases:    
    def test_process_frame_with_different_sides(self, client):
        with patch('pose_detection.server.b64_to_bgr_image') as mock_b64:
            mock_b64.return_value = np.zeros((480, 640, 3), dtype=np.uint8)
            
            with patch('pose_detection.server.pose_app') as mock_pose_app:
                mock_result = Mock()
                mock_result.pose_landmarks = [[]]
                mock_pose_app.cam.process_pose.return_value = mock_result
                mock_analyzer = Mock()
                mock_analyzer.summary.return_value = {
                    "min_degree": 0, 
                    "max_degree": 0, 
                    "rom_degree": 0,
                    "calibrating": False, 
                    "cal_time_left": 0,
                    "rep_count": 0, 
                    "current_rep_duration": 0,
                    "avg_rep_duration": 0, 
                    "rep_state": "None"
                }
                mock_pose_app.analyzer = mock_analyzer

                mock_pose_app.default_metrics.return_value = {
                    "angle": 0, 
                    "min_degree": 0, 
                    "max_degree": 0,
                    "rom_degree": 0,
                    "rep_count": 0, 
                    "current_rep_duration": 0, 
                    "avg_rep_duration": 0,
                    "rep_state": "None", 
                    "calibrating": True, 
                    "cal_time_left": 10.0
                }
                
                with patch('pose_detection.server.knee_angle_from_result') as mock_knee:
                    mock_knee.return_value = 45.0
                    with patch('pose_detection.server.extract_landmarks') as mock_extract:
                        mock_extract.return_value = []
                        
                        fake_image = base64.b64encode(b'fake').decode('utf-8')

                        client.post('/process_frame', json={
                            'imageBase64': fake_image,
                            'side': 'RIGHT'
                        })
                        
                        client.post('/process_frame', json={
                            'imageBase64': fake_image,
                            'side': 'LEFT'
                        })
                        
                        calls = mock_knee.call_args_list
                        assert len(calls) == 2
                        assert calls[0][1]['side'] == 'RIGHT'
                        assert calls[1][1]['side'] == 'LEFT'
    
    @patch('pose_detection.server.b64_to_bgr_image')
    def test_process_frame_decoding_error(self, mock_b64_to_bgr, client):
        mock_b64_to_bgr.return_value = None 
        
        fake_image = base64.b64encode(b'fake').decode('utf-8')
        response = client.post('/process_frame', json={
            'imageBase64': fake_image
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data