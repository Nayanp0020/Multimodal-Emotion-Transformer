import json
import os
from datetime import datetime


class TimelineManager:

    def __init__(self):

        self.file_path = "timeline_data.json"

        # Create file if not exists
        if not os.path.exists(self.file_path):

            with open(
                self.file_path,
                "w"
            ) as file:

                json.dump([], file)

    # ===============================
    # SAVE TIMELINE DATA
    # ===============================
    def save_timeline(
        self,
        emotion
    ):

        with open(
            self.file_path,
            "r"
        ) as file:

            data = json.load(file)

        timeline_entry = {

            "emotion": emotion,

            "time":
            datetime.now().strftime(
                "%d-%m-%Y %H:%M:%S"
            )
        }

        data.append(
            timeline_entry
        )

        with open(
            self.file_path,
            "w"
        ) as file:

            json.dump(
                data,
                file,
                indent=4
            )

    # ===============================
    # GET TIMELINE DATA
    # ===============================
    def get_timeline(self):

        with open(
            self.file_path,
            "r"
        ) as file:

            data = json.load(file)

        return data