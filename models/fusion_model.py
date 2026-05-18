class FusionModel:

    def predict(self, text_emotion,
                      face_emotion,
                      voice_emotion):

        emotions = [
            text_emotion,
            face_emotion,
            voice_emotion
        ]

        # remove empty values
        emotions = [
            e for e in emotions
            if e is not None
        ]

        if len(emotions) == 0:
            return "neutral", 0

        # count emotions
        emotion_count = {}

        for emotion in emotions:

            if emotion in emotion_count:
                emotion_count[emotion] += 1
            else:
                emotion_count[emotion] = 1

        # final emotion
        final_emotion = max(
            emotion_count,
            key=emotion_count.get
        )

        # confidence
        confidence = round(
            (
                emotion_count[final_emotion]
                / len(emotions)
            ) * 100,
            2
        )

        return final_emotion, confidence