# models/voice_emotion.py

class VoiceEmotionModel:

    def predict(self, transcript=""):

        text = transcript.lower().strip()

        # ===============================
        # HAPPY
        # ===============================
        happy_words = [
            "happy", "great", "awesome", "good",
            "amazing", "excited", "fun", "love",
            "excellent", "fantastic", "yes",
            "wow", "nice", "enjoy"
        ]

        # ===============================
        # SAD
        # ===============================
        sad_words = [
            "sad", "depressed", "cry",
            "upset", "lonely", "hurt",
            "tired", "bad", "pain",
            "miss", "broken", "stress"
        ]

        # ===============================
        # ANGRY
        # ===============================
        angry_words = [
            "angry", "hate", "frustrated",
            "annoyed", "irritated",
            "mad", "shut up", "stupid",
            "worst", "leave me"
        ]

        # ===============================
        # FEAR
        # ===============================
        fear_words = [
            "fear", "scared", "afraid",
            "nervous", "anxious",
            "panic", "worry"
        ]

        # ===============================
        # DETECTION
        # ===============================
        if any(word in text for word in happy_words):
            return "happy", 94

        elif any(word in text for word in sad_words):
            return "sad", 91

        elif any(word in text for word in angry_words):
            return "angry", 95

        elif any(word in text for word in fear_words):
            return "fear", 89

        # ===============================
        # EXTRA LOGIC
        # ===============================
        elif "!" in text:
            return "happy", 82

        elif "?" in text:
            return "fear", 75

        elif len(text) <= 3:
            return "neutral", 70

        # ===============================
        # DEFAULT
        # ===============================
        return "neutral", 80