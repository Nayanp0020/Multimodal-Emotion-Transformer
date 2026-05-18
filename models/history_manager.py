import json
import os

from datetime import datetime


class HistoryManager:

    def __init__(self):

        self.file_path = "emotion_history.json"

        # Create file if not exists
        if not os.path.exists(self.file_path):

            with open(
                self.file_path,
                "w"
            ) as file:

                json.dump([], file)

    # ===============================
    # SAVE EMOTION HISTORY
    # ===============================
    def save_emotion(

        self,
        
        user_id,

        text_emotion,

        face_emotion,

        voice_emotion,

        final_emotion
    ):

        history = self.get_history()

        current_datetime = datetime.now()

        new_entry = {

            "id":
                len(history) + 1,
                
            "user_id": user_id,

            "date":
                current_datetime.strftime(
                    "%d-%m-%Y"
                ),

            "time":
                current_datetime.strftime(
                    "%I:%M:%S %p"
                ),

            "text_emotion":
                text_emotion,

            "face_emotion":
                face_emotion,

            "voice_emotion":
                voice_emotion,

            "final_emotion":
                final_emotion
        }

        history.append(new_entry)

        with open(
            self.file_path,
            "w"
        ) as file:

            json.dump(

                history,

                file,

                indent=4
            )

    # ===============================
    # GET HISTORY
    # ===============================
    def get_history(self, user_id=None):

        try:

            with open(
                self.file_path,
                "r"
            ) as file:

               
                history = json.load(file)

                if user_id is not None:
                    history = [
                    item for item in history
                    if item.get("user_id") == user_id
                ]

            return history

        except Exception as e:

            print(
                "HISTORY READ ERROR:",
                e
            )

            return []

    # ===============================
    # CLEAR HISTORY
    # ===============================
    def clear_history(self):

        with open(
            self.file_path,
            "w"
        ) as file:

            json.dump([], file)

    # ===============================
    # TOTAL RECORDS
    # ===============================
    def total_records(self):

        history = self.get_history()

        return len(history)

    # ===============================
    # EMOTION COUNTS
    # ===============================
    def emotion_statistics(self):

        history = self.get_history()

        stats = {

            "happy": 0,
            "sad": 0,
            "angry": 0,
            "fear": 0,
            "neutral": 0
        }

        for item in history:

            emotion = item.get(
                "final_emotion",
                "neutral"
            )

            if emotion in stats:

                stats[emotion] += 1

        return stats