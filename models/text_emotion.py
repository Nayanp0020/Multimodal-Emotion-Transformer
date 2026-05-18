from transformers import pipeline

class TextEmotionModel:
    def __init__(self):
        self.classifier = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base"
        )

    def predict(self, text):
        result = self.classifier(text)[0]
        emotion = result['label']
        confidence = round(result['score'] * 100, 2)
        return emotion, confidence