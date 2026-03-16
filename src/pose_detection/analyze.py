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

        # State / feedback
        self.rep_state = "Ready"
        self.cue_state = "GETTING_READY"

        # Smoothing
        self.smoothed_angle = None
        self.smoothing_alpha = 0.5

        # Easier zone-based thresholds
        self.bend_zone_ratio = 0.45
        self.extend_zone_ratio = 0.55

        # Minimum ROM and minimum rep size
        self.min_valid_rom = 12.0
        self.min_cycle_span_deg = 15.0

        # Track one rep cycle
        self.cycle_min_angle = None
        self.cycle_max_angle = None

        # Rep cooldown to prevent double counts from jitter
        self.last_rep_time = None
        self.rep_cooldown_s = 0.4

    def start_calibration(self, duration_s: float = 10.0):
        self.is_calibrating = True
        self.cal_duration_s = float(duration_s)
        self.cal_start_ts = time.time()
        self.cal_min = None
        self.cal_max = None

        self.rep_count = 0
        self.rep_durations = []
        self.rep_state = "Ready"
        self.cue_state = "CALIBRATING"

        self.smoothed_angle = None
        self.current_rep = None

        self.started = False
        self.min_angle = 0.0
        self.max_angle = 0.0

        self.cycle_min_angle = None
        self.cycle_max_angle = None
        self.last_rep_time = None

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
            self.is_calibrating = False

            if self.cal_min is not None and self.cal_max is not None:
                self.min_angle = self.cal_min
                self.max_angle = self.cal_max

            self.started = True
            self.rep_state = "Ready"
            self.cue_state = "GETTING_READY"

    def _rep_update(self, angle: float):
        rom = self.max_angle - self.min_angle
        if rom < self.min_valid_rom:
            self.cue_state = "GETTING_READY"
            return

        bend_zone_max = self.min_angle + rom * self.bend_zone_ratio
        extend_zone_min = self.min_angle + rom * self.extend_zone_ratio
        midpoint = (self.min_angle + self.max_angle) / 2.0
        now = time.time()

        # Uncomment if you want to debug
        # print(
        #     "angle:", round(angle, 1),
        #     "bend_zone:", round(bend_zone_max, 1),
        #     "extend_zone:", round(extend_zone_min, 1),
        #     "state:", self.rep_state,
        #     "reps:", self.rep_count
        # )

        if self.rep_state == "Ready":
            if angle >= extend_zone_min:
                self.rep_state = "Extension"
                self.cue_state = "GOOD_EXTENSION"
            elif angle <= bend_zone_max:
                self.rep_state = "Flexion"
                self.current_rep = now
                self.cycle_min_angle = angle
                self.cycle_max_angle = angle
                self.cue_state = "GOOD_FLEXION"
            else:
                if angle >= midpoint:
                    self.rep_state = "Extension"
                    self.cue_state = "GOOD_EXTENSION"
                else:
                    self.rep_state = "Flexion"
                    self.current_rep = now
                    self.cycle_min_angle = angle
                    self.cycle_max_angle = angle
                    self.cue_state = "GOOD_FLEXION"
            return

        if self.rep_state == "Extension":
            self.cue_state = "GOOD_EXTENSION"

            if angle <= bend_zone_max:
                self.rep_state = "Flexion"
                self.current_rep = now
                self.cycle_min_angle = angle
                self.cycle_max_angle = angle
                self.cue_state = "GOOD_FLEXION"

        elif self.rep_state == "Flexion":
            self.cue_state = "GOOD_FLEXION"

            if self.cycle_min_angle is None or angle < self.cycle_min_angle:
                self.cycle_min_angle = angle
            if self.cycle_max_angle is None or angle > self.cycle_max_angle:
                self.cycle_max_angle = angle

            if angle >= extend_zone_min:
                cycle_min = self.cycle_min_angle if self.cycle_min_angle is not None else angle
                cycle_max = self.cycle_max_angle if self.cycle_max_angle is not None else angle
                cycle_span = cycle_max - cycle_min

                if cycle_span >= self.min_cycle_span_deg:
                    cooldown_ok = (
                        self.last_rep_time is None or
                        (now - self.last_rep_time) >= self.rep_cooldown_s
                    )

                    if cooldown_ok:
                        if self.current_rep is not None:
                            rep_duration = now - self.current_rep
                            self.rep_durations.append(rep_duration)
                            self.rep_count += 1
                            self.last_rep_time = now

                self.rep_state = "Extension"
                self.current_rep = None
                self.cycle_min_angle = None
                self.cycle_max_angle = None
                self.cue_state = "GOOD_EXTENSION"

    def update(self, angle: float):
        if angle is None:
            self.current_rep = None
            self.rep_state = "Ready"
            self.cue_state = "OUT_OF_FRAME"
            self.smoothed_angle = None
            self.cycle_min_angle = None
            self.cycle_max_angle = None
            return

        angle = self._smooth_angle(angle)

        if self.is_calibrating:
            self.cue_state = "CALIBRATING"
            self._calibrate_with_angle(angle)
            return

        if not self.started:
            self.min_angle = angle
            self.max_angle = angle
            self.started = True
            self.rep_state = "Ready"
            self.cue_state = "GETTING_READY"
            return

        # allow ROM to adapt during session
        if angle < self.min_angle:
            self.min_angle = angle
        if angle > self.max_angle:
            self.max_angle = angle

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

        if self.rep_durations:
            avg_duration = sum(self.rep_durations) / len(self.rep_durations)
            current_duration = time.time() - self.current_rep if self.current_rep else 0
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
            "rep_state": self.rep_state,
            "cue_state": self.cue_state,
        }