import cv2 as cv
import mediapipe as mp
import os
import time

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"


class Analyzer:
    def __init__(self):
        self.started = False
        self.min_angle = 0.0
        self.max_angle = 0.0

        # Calibration state
        self.is_calibrating = False
        self.cal_start_ts = None
        self.cal_duration_s = 10.0
        self.cal_min = None
        self.cal_max = None

        # Reps / duration
        self.rep_count = 0
        self.current_rep = None
        self.rep_durations = []

        self.flexion_threshold = 0.60
        self.extension_threshold = 0.60

        self.rep_state = "Ready"

        # Smoothing + validation
        self.smoothed_angle = None
        self.smoothing_alpha = 0.4
        self.min_rep_gap_s = 0.4
        self.min_valid_rom = 10.0
        self.last_rep_end = None

    def start_calibration(self, duration_s: float = 3.0):
        self.is_calibrating = True
        self.cal_duration_s = float(duration_s)
        self.cal_start_ts = time.time()
        self.cal_min = None
        self.cal_max = None

        self.rep_count = 0
        self.rep_durations = []
        self.rep_state = "Ready"

        self.smoothed_angle = None
        self.current_rep = None
        self.last_rep_end = None

        self.started = False
        self.min_angle = 0.0
        self.max_angle = 0.0

    def _smooth_angle(self, angle: float) -> float:
        if self.smoothed_angle is None:
            self.smoothed_angle = angle
        else:
            self.smoothed_angle = (
                (1 - self.smoothing_alpha) * self.smoothed_angle
                + self.smoothing_alpha * angle
            )
        return self.smoothed_angle

    def _calibrate_with_angle(self, angle: float):
        if angle is None:
            return

        if self.cal_min is None or angle < self.cal_min:
            self.cal_min = angle
        if self.cal_max is None or angle > self.cal_max:
            self.cal_max = angle

        if (time.time() - self.cal_start_ts) >= self.cal_duration_s:
            # If user moved during calibration, use that
            if self.cal_min is not None and self.cal_max is not None:
                self.min_angle = self.cal_min
                self.max_angle = self.cal_max
                self.started = True
                self.rep_state = "Ready"

            self.is_calibrating = False

    def _rep_update(self, angle: float):
        if self.min_angle == self.max_angle:
            return

        rom = self.max_angle - self.min_angle
        if rom < self.min_valid_rom:
            return

        normalized_angle = (angle - self.min_angle) / rom
        now = time.time()

        if normalized_angle < 0:
            normalized_angle = 0
        if normalized_angle > 1:
            normalized_angle = 1

        flexion_trigger = 1 - self.flexion_threshold
        extension_trigger = self.extension_threshold

        # Uncomment for debugging if needed
        # print("angle:", round(angle, 1), "norm:", round(normalized_angle, 3),
        #       "state:", self.rep_state, "reps:", self.rep_count,
        #       "min:", round(self.min_angle, 1), "max:", round(self.max_angle, 1))

        if self.rep_state == "Ready":
            if normalized_angle >= extension_trigger:
                self.rep_state = "Extension"
            elif normalized_angle <= flexion_trigger:
                self.rep_state = "Flexion"
                self.current_rep = now
            return

        if self.rep_state == "Extension":
            if normalized_angle <= flexion_trigger:
                self.rep_state = "Flexion"
                if self.current_rep is None:
                    self.current_rep = now

        elif self.rep_state == "Flexion":
            if normalized_angle >= extension_trigger:
                if (
                    self.last_rep_end is not None
                    and (now - self.last_rep_end) < self.min_rep_gap_s
                ):
                    return

                if self.current_rep is not None:
                    rep_duration = now - self.current_rep
                    self.rep_durations.append(rep_duration)
                    self.rep_count += 1
                    self.last_rep_end = now

                self.rep_state = "Extension"
                self.current_rep = None

    def update(self, angle: float):
        # If tracking is lost, stop current rep and reset state safely
        if angle is None:
            self.current_rep = None
            self.rep_state = "Ready"
            return

        angle = self._smooth_angle(angle)

        if self.is_calibrating:
            self._calibrate_with_angle(angle)
            return

        # Initialize once after calibration / startup
        if not self.started:
            self.min_angle = angle
            self.max_angle = angle
            self.started = True
            self.rep_state = "Ready"
            return

        # IMPORTANT:
        # Keep updating min/max during live exercise so it still works
        # even if calibration was done while holding still.
        if angle < self.min_angle:
            self.min_angle = angle

        if angle > self.max_angle:
            self.max_angle = angle

        if self.started and not self.is_calibrating:
            self._rep_update(angle)

    def calc_rom(self) -> float:
        return self.max_angle - self.min_angle

    def summary(self) -> dict:
        if self.is_calibrating and self.cal_start_ts is not None:
            cal_time_left = max(
                0.0,
                self.cal_duration_s - (time.time() - self.cal_start_ts)
            )
        else:
            cal_time_left = 0.0

        current_duration = 0

        if self.rep_durations:
            avg_duration = sum(self.rep_durations) / len(self.rep_durations)
            if self.current_rep:
                current_duration = time.time() - self.current_rep
        else:
            avg_duration = 0
            current_duration = 0

        return {
            "min_degree": round(self.min_angle, 1),
            "max_degree": round(self.max_angle, 1),
            "rom_degree": round(self.calc_rom(), 1),
            "calibrating": self.is_calibrating,
            "cal_time_left": round(cal_time_left, 1),
            "rep_count": self.rep_count,
            "current_rep_duration": current_duration,
            "avg_rep_duration": avg_duration,
            "rep_state": self.rep_state
        }