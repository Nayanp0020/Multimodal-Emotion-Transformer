import cv2
import numpy as np

from deepface import DeepFace


class FaceEmotionModel:

    def __init__(self):

        pass


    # ===============================
    # ANALYZE FACE EMOTION
    # ===============================
    def analyze(self, img):

        try:

            # Convert BGR to RGB
            rgb_img = cv2.cvtColor(
                img,
                cv2.COLOR_BGR2RGB
            )

            # DeepFace analysis
            result = DeepFace.analyze(

                rgb_img,

                actions=['emotion'],

                enforce_detection=False
            )

            # If result is list
            if isinstance(result, list):

                result = result[0]

            dominant_emotion = result.get(
                "dominant_emotion",
                "neutral"
            )

            emotion_scores = result.get(
                "emotion",
                {}
            )

            confidence = round(

                emotion_scores.get(
                    dominant_emotion,
                    0
                ),

                2
            )

            print(
                "FACE RESULT:",
                dominant_emotion,
                confidence
            )

            return (

                dominant_emotion,

                confidence
            )

        except Exception as e:

            print(
                "FACE MODEL ERROR:",
                e
            )

            return (

                "neutral",

                0
            )