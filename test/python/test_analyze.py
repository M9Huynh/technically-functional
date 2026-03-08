import sys
import os
import time
import math
import pytest
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src')))
from pose_detection.analyze import Analyzer

class TestAnalyzerInit:    
    def test_analyzer_default_values(self):
        a = Analyzer()
        assert a.started is False
        assert a.min_angle == 0.0
        assert a.max_angle == 0.0
        assert a.is_calibrating is False
        assert a.cal_start_ts is None
        assert a.cal_duration_s == 10.0
        assert a.cal_min is None
        assert a.cal_max is None
        assert a.rep_count == 0
        assert a.current_rep is None
        assert a.rep_durations == []
        assert a.rep_state == ""

class TestAnalyzerCalibration:  
    def test_start_calibration(self):
        a = Analyzer()
        a.start_calibration(duration_s=5.0)
        
        assert a.is_calibrating is True
        assert a.cal_duration_s == 5.0
        assert a.cal_start_ts is not None
        assert a.cal_min is None
        assert a.cal_max is None

    def test_calibration_updates_min_max(self):
        a = Analyzer()
        a.start_calibration(duration_s=1.0)
        
        angles = [30, 45, 60, 50, 70, 20]
        for i in angles:
            a._calibrate_with_angle(i)
        
        assert a.cal_min == min(angles)
        assert a.cal_max == max(angles)

    def test_calibration_completes_after_duration(self):
        a = Analyzer()
        
        with patch('time.time') as mock_time:
            mock_time.side_effect = [100.0, 100.05, 100.16]
            
            a.start_calibration(duration_s=0.1)
            assert a.cal_start_ts == 100.0
            
            a._calibrate_with_angle(50)
            assert a.is_calibrating is True
            assert a.cal_min == 50
            assert a.cal_max == 50
        
            a._calibrate_with_angle(60)
            
            assert a.is_calibrating is False
            assert a.started is True
            assert a.min_angle == 50  
            assert a.max_angle == 60 

    def test_calibration_ignores_none(self):
        a = Analyzer()
        a.start_calibration()
        a._calibrate_with_angle(None)
        
        assert a.cal_min is None
        assert a.cal_max is None

class TestAnalyzerRepCounting:    
    def setup_method(self):
        self.a = Analyzer()
        self.a.min_angle = 30.0
        self.a.max_angle = 70.0
        self.a.started = True

    def test_rep_state_starts_in_extension(self):
        assert self.a.rep_state == "Extension" or self.a.rep_state == ""

    def test_transition_to_flexion(self):
        self.a.rep_state = "Extension"
        
        self.a._rep_update(35)
        assert self.a.rep_state == "Flexion"
        assert self.a.current_rep is not None

    def test_transition_to_extension_counts_rep(self):
        self.a.rep_state = "Flexion"
        self.a.current_rep = 100.0
        
        with patch('time.time') as mock_time:
            mock_time.return_value = 101.5
            self.a._rep_update(68)
            
            assert self.a.rep_state == "Extension"
            assert self.a.rep_count == 1
            assert len(self.a.rep_durations) == 1
            assert self.a.rep_durations[0] == 1.5

    def test_no_rep_counted_if_no_current_rep(self):
        self.a.rep_state = "Flexion"
        self.a.current_rep = None
        
        self.a._rep_update(68)
        
        assert self.a.rep_count == 0
        assert len(self.a.rep_durations) == 0

    def test_normalized_angle_calculation(self):
        with patch.object(self.a, '_rep_update') as mock_rep:
            self.a.update(30)
         
        self.a.update(25)
        assert self.a.min_angle == 25
        
        self.a.update(75)
        assert self.a.max_angle == 75

class TestAnalyzerUpdate:   
    def setup_method(self):
        self.a = Analyzer()

    def test_update_during_calibration(self):
        self.a.start_calibration()
        
        with patch.object(self.a, '_calibrate_with_angle') as mock_calibrate:
            self.a.update(45.0)
            mock_calibrate.assert_called_once_with(45.0)

    def test_update_before_started_sets_initial_range(self):
        self.a.is_calibrating = False
        self.a.started = False
        
        self.a.update(45.0)
        
        assert self.a.min_angle == 45.0
        assert self.a.max_angle == 45.0
        assert self.a.started is True

    def test_update_expands_range_downward(self):
        self.a.started = True
        self.a.min_angle = 30.0
        self.a.max_angle = 70.0
        
        self.a.update(20.0)
        
        assert self.a.min_angle == 20.0
        assert self.a.max_angle == 70.0 

    def test_update_expands_range_upward(self):
        self.a.started = True
        self.a.min_angle = 30.0
        self.a.max_angle = 70.0
        
        self.a.update(80.0)
        
        assert self.a.min_angle == 30.0 
        assert self.a.max_angle == 80.0

    def test_update_ignores_none(self):
        self.a.started = True
        self.a.min_angle = 30.0
        self.a.max_angle = 70.0
        
        self.a.update(None)
        
        assert self.a.min_angle == 30.0
        assert self.a.max_angle == 70.0

class TestAnalyzerSummary:    
    def setup_method(self):
        self.a = Analyzer()

    def test_summary_returns_expected_keys(self):
        self.a.min_angle = 30.0
        self.a.max_angle = 70.0
        self.a.rep_count = 5
        self.a.rep_state = "Extension"
        self.a.rep_durations = [1.2, 1.3, 1.1, 1.4, 1.2]
        
        summary = self.a.summary()
        
        expected_keys = [
            "min_degree", 
            "max_degree", 
            "rom_degree",
            "calibrating", 
            "cal_time_left",
            "rep_count", 
            "current_rep_duration",
            "avg_rep_duration", 
            "rep_state"
        ]
        
        for key in expected_keys:
            assert key in summary

    def test_summary_values_are_correct(self):
        self.a.min_angle = 30.123
        self.a.max_angle = 70.456
        self.a.rep_count = 5
        self.a.rep_state = "Extension"
        self.a.rep_durations = [1.2, 1.3, 1.1, 1.4, 1.2]
        
        summary = self.a.summary()
        
        assert summary["min_degree"] == 30.1
        assert summary["max_degree"] == 70.5
        assert summary["rom_degree"] == 40.3  

    def test_summary_during_calibration(self):
        self.a.start_calibration(duration_s=10.0)
        
        with patch('time.time') as mock_time:
            mock_time.return_value = 105.0  
            self.a.cal_start_ts = 100.0 
            
            summary = self.a.summary()
            
            assert summary["calibrating"] is True
            assert summary["cal_time_left"] == 5.0

    def test_summary_when_not_calibrating(self):
        self.a.is_calibrating = False
        
        summary = self.a.summary()
        
        assert summary["calibrating"] is False
        assert summary["cal_time_left"] == 0.0

    def test_summary_with_empty_rep_durations(self):
        self.a.min_angle = 30.0
        self.a.max_angle = 70.0
        self.a.rep_durations = []
        
        summary = self.a.summary()
        
        assert summary["avg_rep_duration"] == 0
        assert summary["current_rep_duration"] == 0

    def test_summary_with_current_rep(self):

        self.a.rep_durations = [1.2, 1.3]
        self.a.current_rep = 100.0
        
        with patch('time.time') as mock_time:
            mock_time.return_value = 101.5
            summary = self.a.summary()
            
            assert summary["current_rep_duration"] == 1.5
            assert summary["avg_rep_duration"] == 1.25

class TestAnalyzerEdgeCases:    
    def test_division_by_zero_protection(self):
        a = Analyzer()
        a.min_angle = 50.0
        a.max_angle = 50.0
        a.started = True
        
        a._rep_update(50.0)
        # should continue without error and not change state

    def test_negative_angles(self):
        a = Analyzer()
        a.started = True
        a.min_angle = -10.0
        a.max_angle = 30.0
        
        a.update(-20.0)        
        a.update(40.0)
        assert a.min_angle == -20.0
        assert a.max_angle == 40.0

    def test_very_large_angles(self):
        a = Analyzer()
        a.started = True
        a.min_angle = 0.0
        a.max_angle = 180.0
        
        a.update(200.0) 
        assert a.max_angle == 200.0

    def test_rep_counting_with_equal_min_max(self):
        a = Analyzer()
        a.min_angle = 50.0
        a.max_angle = 50.0
        a.started = True
        a.rep_state = "Extension"
        
        a._rep_update(50.0)
        assert a.rep_state == "Extension"
        assert a.rep_count == 0