from flask import Flask, render_template, request, jsonify
from flask import make_response

from flask_mysqldb import MySQL

from werkzeug.security import generate_password_hash, check_password_hash

from flask import session, redirect, url_for, flash

from models.text_emotion import TextEmotionModel
from models.voice_emotion import VoiceEmotionModel
from models.fusion_model import FusionModel
from models.history_manager import HistoryManager
from models.timeline_manager import TimelineManager
from models.face_emotion import FaceEmotionModel

import cv2
import numpy as np
import re

from datetime import datetime


app = Flask(__name__)

# ===============================
# SECRET KEY
# ===============================
app.secret_key = "secret123"

# ===============================
# MYSQL CONFIG
# ===============================
app.config["MYSQL_HOST"] = "localhost"

app.config["MYSQL_USER"] = "root"

app.config["MYSQL_PASSWORD"] = "@Nayan_pawar,0090"

app.config["MYSQL_DB"] = "emotion_ai"

mysql = MySQL(app)

# ===============================
# LOAD MODELS
# ===============================
text_model = TextEmotionModel()

voice_model = VoiceEmotionModel()

fusion_model = FusionModel()

history_manager = HistoryManager()

timeline_manager = TimelineManager()

# LOAD FACE MODEL ONLY ONCE
face_model = FaceEmotionModel()


# ===============================
# REGISTER
# ===============================
@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        name = request.form.get("name")
        email = request.form.get("email")
        password = request.form.get("password")

        print(name, email, password)

        hashed_password = generate_password_hash(password)

        try:
            cur = mysql.connection.cursor()

            cur.execute(
                """
                INSERT INTO users(name, email, password)
                VALUES(%s, %s, %s)
                """,
                (name, email, hashed_password)
            )

            mysql.connection.commit()
            cur.close()

            flash("Registration Successful", "success")
            return redirect(url_for("login"))

        except Exception as e:
            print("REGISTER ERROR:", e)
            flash("Registration Failed", "danger")

    return render_template("register.html")
# ===============================
# LOGIN
# ===============================
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        cur = mysql.connection.cursor()

        cur.execute(
            """
            SELECT * FROM users
            WHERE email=%s
            """,
            [email]
        )

        user = cur.fetchone()
        cur.close()

        if user:

            stored_password = user[3]

            if check_password_hash(
                stored_password,
                password
            ):

                session["loggedin"] = True
                session["user_id"] = user[0]
                session["name"] = user[1]

                flash(
                    "Login Successful",
                    "success"
                )

                response = redirect(url_for("index"))
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"

                return response

            else:
                flash("Wrong Password", "danger")

        else:
            flash("User not found", "danger")

    response = make_response(
    render_template("login.html")
)

    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response


# ===============================
# LOGOUT
# ===============================
@app.route("/logout")
def logout():

    session.clear()

    flash(
        "Logged out successfully",
        "success"
    )

    return redirect(url_for("login"))


# ===============================
# TEST DATABASE
# ===============================
@app.route("/test_db")
def test_db():

    try:

        cur = mysql.connection.cursor()

        cur.execute("SELECT 1")

        return "Database Connected Successfully!"

    except Exception as e:

        return f"Database Error: {e}"


# ===============================
# HOME PAGE
# ===============================
@app.route("/", methods=["GET", "POST"])
def index():

    if "loggedin" not in session:
        return redirect(url_for("login"))

    emotion = None
    confidence = None

    if request.method == "POST":

        text = request.form.get("text", "")

        if text.strip() != "":

            emotion, confidence = text_model.predict(text)

            text_lower = text.lower()

            if "not" in text_lower:

                if emotion == "happy":
                    emotion = "sad"

                elif emotion == "sad":
                    emotion = "neutral"

                elif emotion == "angry":
                    emotion = "neutral"

                elif emotion == "neutral":
                    emotion = "sad"

                confidence = 85

            print(
                "TEXT RESULT:",
                emotion,
                confidence
            )

    return render_template(
        "index.html",
        emotion=emotion,
        confidence=confidence
    )

# ===============================
# FACE EMOTION
# ===============================
@app.route("/face", methods=["POST"])
def face_emotion():

    try:

        if "image" not in request.files:

            return jsonify({

                "emotion": "neutral",

                "confidence": 0,

                "error": "No image uploaded"
            })

        file = request.files["image"]

        image_bytes = file.read()

        if len(image_bytes) == 0:

            return jsonify({

                "emotion": "neutral",

                "confidence": 0,

                "error": "Empty image"
            })

        npimg = np.frombuffer(
            image_bytes,
            np.uint8
        )

        img = cv2.imdecode(
            npimg,
            cv2.IMREAD_COLOR
        )

        if img is None:

            return jsonify({

                "emotion": "neutral",

                "confidence": 0,

                "error": "Image decode failed"
            })

        print(
            "FACE IMAGE SHAPE:",
            img.shape
        )

        emotion, confidence = (
            face_model.analyze(img)
        )

        print(
            "FACE RESULT:",
            emotion,
            confidence
        )

        if emotion is None:

            emotion = "neutral"

        if confidence is None:

            confidence = 0

        return jsonify({

            "emotion":
                str(emotion).lower(),

            "confidence":
                float(confidence)
        })

    except Exception as e:

        print("FACE ERROR:", e)

        return jsonify({

            "emotion": "neutral",

            "confidence": 0,

            "error": str(e)
        })


# ===============================
# VOICE EMOTION
# ===============================
@app.route("/voice", methods=["POST"])
def voice_emotion():

    try:

        transcript = request.form.get(
            "transcript",
            ""
        )

        print(
            "VOICE TRANSCRIPT:",
            transcript
        )

        if transcript.strip() == "":

            return jsonify({

                "emotion": "neutral",

                "confidence": 0
            })

        emotion, confidence = (
            voice_model.predict(
                transcript
            )
        )

        print(
            "VOICE RESULT:",
            emotion,
            confidence
        )

        return jsonify({

            "emotion":
                str(emotion).lower(),

            "confidence":
                float(confidence)
        })

    except Exception as e:

        print("VOICE ERROR:", e)

        return jsonify({

            "emotion": "neutral",

            "confidence": 0,

            "error": str(e)
        })


# ===============================
# FUSION EMOTION
# ===============================
@app.route("/fusion", methods=["POST"])
def fusion():

    try:

        data = request.json

        text_emotion = (
            data.get("text_emotion")
            if data else None
        )

        face_emotion_value = (
            data.get("face_emotion")
            if data else None
        )

        voice_emotion_value = (
            data.get("voice_emotion")
            if data else None
        )

        print(
            "FUSION INPUT:",
            text_emotion,
            face_emotion_value,
            voice_emotion_value
        )

        emotions = []

        if text_emotion and text_emotion != "Not detected":

            emotions.append(text_emotion)

        if face_emotion_value and face_emotion_value != "Not detected":

            emotions.append(face_emotion_value)

        if voice_emotion_value and voice_emotion_value != "Not detected":

            emotions.append(voice_emotion_value)

        if len(emotions) == 0:

            return jsonify({

                "emotion": "neutral",

                "confidence": 0,

                "insight":
                    "No emotions detected.",

                "recommendation":
                    "Try analyzing text, face or voice first."
            })

        final_emotion, confidence = (
            fusion_model.predict(

                text_emotion,

                face_emotion_value,

                voice_emotion_value
            )
        )

        if final_emotion is None:

            emotion_count = {}

            for emo in emotions:

                emotion_count[emo] = (
                    emotion_count.get(emo, 0) + 1
                )

            final_emotion = max(
                emotion_count,
                key=emotion_count.get
            )

            confidence = 85

        final_emotion = str(
            final_emotion
        ).lower()

        insights = {

            "happy": {

                "insight":
                    "Positive emotional state detected.",

                "recommendation":
                    "Keep maintaining your positive mindset."
            },

            "sad": {

                "insight":
                    "Low emotional state detected.",

                "recommendation":
                    "Take rest and talk with loved ones."
            },

            "angry": {

                "insight":
                    "Stress or frustration detected.",

                "recommendation":
                    "Relax and avoid overthinking."
            },

            "fear": {

                "insight":
                    "Anxiety detected.",

                "recommendation":
                    "Stay calm and take deep breaths."
            },

            "neutral": {

                "insight":
                    "Balanced emotional condition detected.",

                "recommendation":
                    "Maintain your calm state."
            }
        }

        insight = insights.get(
            final_emotion,
            insights["neutral"]
        )["insight"]

        recommendation = insights.get(
            final_emotion,
            insights["neutral"]
        )["recommendation"]

        history_manager.save_emotion(

            session["user_id"],
            
            text_emotion,

            face_emotion_value,

            voice_emotion_value,

            final_emotion
        )

        timeline_manager.save_timeline(
            final_emotion
        )

        print(
            "FUSION RESULT:",
            final_emotion,
            confidence
        )

        return jsonify({

            "emotion":
                final_emotion,

            "confidence":
                float(confidence),

            "insight":
                insight,

            "recommendation":
                recommendation,

            "timestamp":
                datetime.now().strftime(
                    "%d-%m-%Y %H:%M:%S"
                )
        })

    except Exception as e:

        print("FUSION ERROR:", e)

        return jsonify({

            "emotion": "neutral",

            "confidence": 0,

            "insight":
                "Fusion failed.",

            "recommendation":
                "Try again.",

            "error": str(e)
        })


# ===============================
# SAVE HISTORY
# ===============================
@app.route("/save_history", methods=["POST"])
def save_history():

    try:
        if "user_id" not in session:
            return jsonify({"message": "User not logged in"})

        data = request.json

        print("SAVE DATA:", data)

        history_manager.save_emotion(
            session["user_id"],
            data.get("text_emotion"),
            data.get("face_emotion"),
            data.get("voice_emotion"),
            data.get("final_emotion")
        )

        return jsonify({
            "message": "History saved successfully"
        })

    except Exception as e:
        print("SAVE HISTORY ERROR:", e)

        return jsonify({
            "message": str(e)
        })


# ===============================
# GET HISTORY
# ===============================
@app.route("/history", methods=["GET"])
def history():

    try:
        if "user_id" not in session:
            return jsonify([])

        data = history_manager.get_history(session["user_id"])

        print("HISTORY DATA:", data)

        return jsonify(data)

    except Exception as e:
        print("HISTORY ERROR:", e)
        return jsonify([])


# ===============================
# CLEAR HISTORY
# ===============================
@app.route("/clear_history", methods=["POST"])
def clear_history():

    try:

        history_manager.clear_history()

        return jsonify({

            "message":
                "History cleared"
        })

    except Exception as e:

        print("CLEAR HISTORY ERROR:", e)

        return jsonify({

            "message":
                "Failed to clear history"
        })


# ===============================
# TIMELINE DATA
# ===============================
@app.route("/timeline_data", methods=["GET"])
def timeline_data():

    try:

        data = timeline_manager.get_timeline()

        return jsonify(data)

    except Exception as e:

        print("TIMELINE ERROR:", e)

        return jsonify([])


# ===============================
# EXPORT REPORT
# ===============================
@app.route("/export_report", methods=["GET"])
def export_report():

    try:

        history = history_manager.get_history(
            session["user_id"])

        statistics = (
            history_manager
            .emotion_statistics()
        )

        report_data = {

            "project":
                "MultimodalTransformer",

            "subtitle":
                "Mental Health Emotion Analysis Using Text, Face & Voice AI",

            "generated_on":
                datetime.now().strftime(
                    "%d-%m-%Y %H:%M:%S"
                ),

            "total_records":
                len(history),

            "emotion_statistics":
                statistics,

            "emotion_history":
                history
        }

        return jsonify(report_data)

    except Exception as e:

        print("REPORT ERROR:", e)

        return jsonify({

            "report": []
        })


# ===============================
# FUN ZONE API
# ===============================
@app.route("/funzone", methods=["GET"])
def funzone():

    activities = [

        {
            "title": "🧘 Meditation",
            "description": "Deep breathing and relaxation exercises.",
            "best_for": "Angry, Fear, Stress"
        },

        {
            "title": "🎵 Music Therapy",
            "description": "Listen to calming and healing music.",
            "best_for": "Sad, Fear, Neutral"
        },

        {
            "title": "🎮 Mini Games",
            "description": "Fun interactive games to refresh mood.",
            "best_for": "Sad, Neutral"
        },

        {
            "title": "💬 Positive Quotes",
            "description": "Motivational affirmations.",
            "best_for": "Sad, Fear"
        },

        {
            "title": "😂 Funny Videos",
            "description": "Instant mood booster.",
            "best_for": "Sad, Angry"
        }
    ]

    return jsonify(activities)

# ===============================
# SYSTEM STATUS
# ===============================
@app.route("/system_status", methods=["GET"])
def system_status():

    return jsonify({

        "project":
            "MultimodalTransformer",

        "status":
            "Running",

        "modules": [

            "Text Emotion AI",

            "Face Emotion AI",

            "Voice Emotion AI",

            "Fusion AI",

            "Emotion History",

            "Timeline Graph",

            "Fun Zone",

            "Export Report",

            "Login System",

            "MySQL Database"
        ]
    })


# ===============================
# RUN APP
# ===============================
if __name__ == "__main__":

    app.run(
        debug=True
    )