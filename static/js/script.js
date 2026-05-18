// ===============================
// GLOBAL STATE
// ===============================
let lastTextResult = null;

let lastFaceResult = null;

let lastVoiceResult = null;

let emotionHistory = [];


// ===============================
// WINDOW LOAD
// ===============================
window.onload = function () {

    const textEmotion =
        document.getElementById("saved-text-emotion");

    const textConfidence =
        document.getElementById("saved-text-confidence");

    if (textEmotion && textEmotion.value.trim() !== "") {

        lastTextResult = {
            emotion: textEmotion.value.toLowerCase(),
            confidence: parseFloat(textConfidence.value) || 0
        };
    }

    updateHistoryPanel();
};


// ===============================
// TAB SWITCHING
// ===============================
function switchTab(tabId, el) {

    document.querySelectorAll(".tab")
    .forEach(tab => {
        tab.classList.remove("active");
    });

    document.getElementById(tabId)
    .classList.add("active");

    document.querySelectorAll(".nav-btn")
    .forEach(btn => {
        btn.classList.remove("active");
    });

    if (el) {
        el.classList.add("active");
    }

    stopCamera();
    stopRecording();

    // Load profile stats
    if (tabId === "profile") {
        loadProfileStats();
    }

    // Refresh graph
    if (tabId === "timeline") {
        drawTimelineGraph();
    }

    // Refresh history
    if (tabId === "history") {
        updateHistoryPanel();
    }
}

// ===============================
// CAMERA
// ===============================
let video = null;

let stream = null;

function startCamera() {

    if (stream) return;

    video =
        document.getElementById("video");

    navigator.mediaDevices
    .getUserMedia({
        video: true
    })

    .then(s => {

        stream = s;

        video.srcObject = stream;

        video.style.display = "block";
    })

    .catch(err => {

        console.error(err);

        alert("Allow camera access");
    });
}

function stopCamera() {

    if (stream) {

        stream.getTracks()
        .forEach(track => {

            track.stop();
        });

        stream = null;
    }

    if (video) {

        video.srcObject = null;

        video.style.display = "none";
    }
}


// ===============================
// FACE CAPTURE
// ===============================
function capture() {

    const canvas =
        document.getElementById("canvas");

    const ctx =
        canvas.getContext("2d");

    if (!video || !stream) {

        alert("Start camera first");

        return;
    }

    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;

    ctx.drawImage(
        video,
        0,
        0
    );

    canvas.toBlob(blob => {

        let formData =
            new FormData();

        formData.append(
            "image",
            blob,
            "capture.png"
        );

        fetch("/face", {

            method: "POST",

            body: formData
        })

        .then(res => res.json())

        .then(data => {

            console.log(
                "Face API Result:",
                data
            );

            lastFaceResult = {

                emotion:
                    data.emotion.toLowerCase(),

                confidence:
                    parseFloat(
                        data.confidence
                    ) || 0
            };

            showFaceResult(
                lastFaceResult
            );
        })

        .catch(err => {

            console.error(err);

            alert(
                "Face detection failed"
            );
        });

    }, "image/png");
}


// ===============================
// FACE RESULT
// ===============================
function showFaceResult(data) {

    const resultDiv =
        document.getElementById(
            "face-result"
        );

    if (!data || !data.emotion) {

        resultDiv.innerHTML = `
            <p style="color:red;">
                Error detecting emotion
            </p>
        `;

        return;
    }

    const emotion =
        data.emotion.toLowerCase();

    const insights = {

        happy: [
            "You seem positive and cheerful.",
            "Keep doing what makes you happy."
        ],

        sad: [
            "You may be emotionally low.",
            "Take some rest and relax."
        ],

        angry: [
            "Stress or frustration detected.",
            "Try calming yourself."
        ],

        fear: [
            "Anxiety or nervousness detected.",
            "Take deep breaths and stay calm."
        ],

        neutral: [
            "Balanced emotional state.",
            "Maintain your calm state."
        ]
    };

    const [insight, recommendation] =
        insights[emotion] ||
        insights["neutral"];

    resultDiv.innerHTML = `

        <div class="emotion-box ${emotion}">
            <span>Detected Emotion</span>

            <strong>
                ${emotion.toUpperCase()}
            </strong>
        </div>

        <p style="margin-top:10px;color:#94a3b8;">
            Confidence: ${data.confidence}%
        </p>

        <div class="progress-bar">

            <div class="progress"
                 style="width:${data.confidence}%">
            </div>

        </div>

        <hr style="margin:18px 0;">

        <p>
            <strong>🧠 Insight:</strong>
            ${insight}
        </p>

        <p style="margin-top:8px;">
            <strong>💡 Recommendation:</strong>
            ${recommendation}
        </p>
    `;
}


// ===============================
// AUDIO VISUALIZER
// ===============================
let audioContext = null;

let analyser = null;

let dataArray = null;

let animationId = null;

function setupVisualizer(stream) {

    audioContext =
        new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

    analyser =
        audioContext.createAnalyser();

    const source =
        audioContext
        .createMediaStreamSource(stream);

    source.connect(analyser);

    analyser.fftSize = 64;

    dataArray =
        new Uint8Array(
            analyser.frequencyBinCount
        );

    drawVisualizer();
}

function drawVisualizer() {

    const canvas =
        document.getElementById(
            "audioVisualizer"
        );

    if (!canvas || !analyser)
        return;

    const ctx =
        canvas.getContext("2d");

    function draw() {

        animationId =
            requestAnimationFrame(draw);

        analyser.getByteFrequencyData(
            dataArray
        );

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const barWidth = 10;

        let x = 0;

        for (
            let i = 0;
            i < dataArray.length;
            i++
        ) {

            const barHeight =
                dataArray[i] / 1.8;

            ctx.fillStyle =
                "#38bdf8";

            ctx.fillRect(
                x,
                canvas.height - barHeight,
                barWidth,
                barHeight
            );

            x += barWidth + 4;
        }
    }

    draw();
}


// ===============================
// SPEECH TO TEXT
// ===============================
let recognition = null;

let currentTranscript = "";

function startSpeechToText() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        document.getElementById(
            "subtitle"
        ).innerText =
        "Speech recognition not supported";

        return;
    }

    recognition =
        new SpeechRecognition();

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.lang = "en-US";

    recognition.onresult =
    (event) => {

        let transcript = "";

        for (
            let i = 0;
            i < event.results.length;
            i++
        ) {

            transcript +=
                event.results[i][0]
                .transcript;
        }

        currentTranscript =
            transcript;

        document.getElementById(
            "subtitle"
        ).innerText =
        transcript;
    };

    recognition.start();
}

function stopSpeechToText() {

    if (recognition) {

        recognition.stop();

        recognition = null;
    }
}


// ===============================
// RECORDING
// ===============================
let mediaRecorder = null;

let audioStream = null;

function startRecording() {

    currentTranscript = "";

    document.getElementById(
        "subtitle"
    ).innerText =
    "🎤 Listening...";

    document.getElementById(
        "recording-status"
    ).innerText =
    "🔴 Recording...";

    navigator.mediaDevices
    .getUserMedia({
        audio: true
    })

    .then(stream => {

        audioStream = stream;

        setupVisualizer(stream);

        startSpeechToText();

        mediaRecorder =
            new MediaRecorder(stream);

        mediaRecorder.start();
    })

    .catch(err => {

        console.error(err);

        alert("Allow microphone access");
    });
}

function stopRecording() {

    stopSpeechToText();

    if (
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    ) {

        mediaRecorder.stop();
    }

    if (audioStream) {

        audioStream.getTracks()
        .forEach(track => {

            track.stop();
        });
    }

    cancelAnimationFrame(animationId);

    if (audioContext) {

        audioContext.close();
    }

    document.getElementById(
        "recording-status"
    ).innerText =
    "⏹ Recording Stopped";
}


// ===============================
// DETECT VOICE EMOTION
// ===============================
function detectEmotion() {

    if (
        !currentTranscript ||
        currentTranscript.trim() === ""
    ) {

        alert("Speak something first");

        return;
    }

    document.getElementById(
        "recording-status"
    ).innerText =
    "⚡ Detecting Emotion...";

    let formData =
        new FormData();

    formData.append(
        "transcript",
        currentTranscript
    );

    fetch("/voice", {

        method: "POST",

        body: formData
    })

    .then(res => res.json())

    .then(data => {

        lastVoiceResult = {

            emotion:
                data.emotion.toLowerCase(),

            confidence:
                parseFloat(
                    data.confidence
                ) || 0
        };

        showVoiceResult(
            lastVoiceResult
        );

        document.getElementById(
            "recording-status"
        ).innerText =
        "✅ Emotion Detected";
    })

    .catch(err => {

        console.error(err);

        document.getElementById(
            "recording-status"
        ).innerText =
        "❌ Detection Failed";
    });
}


// ===============================
// VOICE RESULT
// ===============================
function showVoiceResult(data) {

    const resultDiv =
        document.getElementById(
            "voice-result"
        );

    const emotion =
        data.emotion.toLowerCase();

    const insights = {

        happy: [
            "Positive emotion detected.",
            "Keep this positive energy."
        ],

        sad: [
            "Low emotional tone detected.",
            "Take some rest and relax."
        ],

        angry: [
            "Frustration detected.",
            "Try calming yourself."
        ],

        fear: [
            "Nervous emotion detected.",
            "Stay relaxed and breathe slowly."
        ],

        neutral: [
            "Balanced tone detected.",
            "Maintain your calm state."
        ]
    };

    const [insight, recommendation] =
        insights[emotion] ||
        insights["neutral"];

    resultDiv.innerHTML = `

        <div class="emotion-box ${emotion}">
            <span>Detected Emotion</span>

            <strong>
                ${emotion.toUpperCase()}
            </strong>
        </div>

        <p style="margin-top:10px;color:#94a3b8;">
            Confidence: ${data.confidence}%
        </p>

        <div class="progress-bar">

            <div class="progress"
                 style="width:${data.confidence}%">
            </div>

        </div>

        <hr style="margin:18px 0;">

        <p>
            <strong>📝 Speech:</strong>
            ${currentTranscript}
        </p>

        <p style="margin-top:10px;">
            <strong>🧠 Insight:</strong>
            ${insight}
        </p>

        <p style="margin-top:8px;">
            <strong>💡 Recommendation:</strong>
            ${recommendation}
        </p>
    `;
}


// ===============================
// SAVE HISTORY
// ===============================
function saveEmotionHistory(finalEmotion) {

    fetch("/save_history", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text_emotion: lastTextResult ? lastTextResult.emotion : null,
            face_emotion: lastFaceResult ? lastFaceResult.emotion : null,
            voice_emotion: lastVoiceResult ? lastVoiceResult.emotion : null,
            final_emotion: finalEmotion
        })
    })
    .then(res => res.json())
    .then(data => {

    console.log(data.message);

    updateHistoryPanel();

    loadProfileStats(); // updates total analyses instantly
})

    .catch(err => {
        console.log("Save History Error:", err);
    });
}


// ===============================
// UPDATE HISTORY
// ===============================
function updateHistoryPanel() {

    const historyDiv =
        document.getElementById("emotion-history");

    if (!historyDiv) return;

    fetch("/history")
    .then(res => res.json())
    .then(data => {

        emotionHistory = [];

        if (!data || data.length === 0) {

            historyDiv.innerHTML =
                "<p>No previous history</p>";

            drawTimelineGraph();
            return;
        }

        let html = "";

        data.forEach(item => {

            emotionHistory.push({
                emotion: item.final_emotion,
                time: item.time
            });

            html += `
                <div class="history-item">
                    <strong>${item.final_emotion.toUpperCase()}</strong>
                    <p>${item.date} ${item.time}</p>
                </div>
            `;
        });

        historyDiv.innerHTML = html;

        drawTimelineGraph();
    })
    .catch(err => {
        console.log("History Error:", err);
    });
}
// ===============================
// TIMELINE GRAPH
// ===============================

function drawTimelineGraph() {

    const canvas = document.getElementById("timelineChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paddingLeft = 100;
    const paddingBottom = 60;
    const paddingTop = 40;
    const paddingRight = 40;

    const graphWidth = canvas.width - paddingLeft - paddingRight;
    const graphHeight = canvas.height - paddingTop - paddingBottom;

    const emotionValue = {
        angry: 20,
        sad: 40,
        fear: 60,
        neutral: 80,
        happy: 100
    };

    const levels = [
        {label:"Angry", value:20},
        {label:"Sad", value:40},
        {label:"Fear", value:60},
        {label:"Neutral", value:80},
        {label:"Happy", value:100}
    ];

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw horizontal lines
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;

    levels.forEach(level => {

        const y = paddingTop + graphHeight - (level.value / 100) * graphHeight;

        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(canvas.width - paddingRight, y);
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px Arial";
        ctx.fillText(level.label, 20, y + 5);
    });

    // Axis
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, canvas.height - paddingBottom);
    ctx.lineTo(canvas.width - paddingRight, canvas.height - paddingBottom);
    ctx.stroke();

    if (emotionHistory.length === 0) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "22px Arial";
        ctx.fillText("No Emotion Data Yet", 320, 200);
        return;
    }

    // Draw line
    ctx.beginPath();

    emotionHistory.forEach((item, index) => {

        const x = paddingLeft + (
            index * graphWidth /
            Math.max(emotionHistory.length - 1, 1)
        );

        const y = paddingTop + graphHeight -
            ((emotionValue[item.emotion] || 50) / 100) * graphHeight;

        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw points
    emotionHistory.forEach((item, index) => {

        const x = paddingLeft + (
            index * graphWidth /
            Math.max(emotionHistory.length - 1, 1)
        );

        const y = paddingTop + graphHeight -
            ((emotionValue[item.emotion] || 50) / 100) * graphHeight;

        // point
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();

        // emotion text
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px Arial";
        ctx.fillText(item.emotion.toUpperCase(), x - 25, y - 15);

        // time text
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px Arial";
        ctx.fillText(item.time, x - 28, canvas.height - 20);
    });

    // labels
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.fillText("Emotion Timeline", canvas.width / 2 - 70, 25);
}

function clearTimelineGraph() {

    emotionHistory = [];

    fetch("/clear_history", {
        method: "POST"
    })
    .then(() => {
        updateHistoryPanel();
        drawTimelineGraph();
    });
}

// ===============================
// FUSION ANALYSIS
// ===============================
function runFusionAnalysis() {

    const resultDiv =
        document.getElementById(
            "fusion-result"
        );

    const textEmotion =
        lastTextResult ?
        lastTextResult.emotion :
        "Not detected";

    const faceEmotion =
        lastFaceResult ?
        lastFaceResult.emotion :
        "Not detected";

    const voiceEmotion =
        lastVoiceResult ?
        lastVoiceResult.emotion :
        "Not detected";

    const textConfidence =
        lastTextResult ?
        parseFloat(lastTextResult.confidence) : 0;

    const faceConfidence =
        lastFaceResult ?
        parseFloat(lastFaceResult.confidence) : 0;

    const voiceConfidence =
        lastVoiceResult ?
        parseFloat(lastVoiceResult.confidence) : 0;

    if (
        !lastTextResult &&
        !lastFaceResult &&
        !lastVoiceResult
    ) {

        resultDiv.innerHTML = `
            <p style="color:red;">
                No emotions detected yet
            </p>
        `;

        return;
    }

    let emotionScores = {};

    function addEmotion(emotion, confidence) {

        if (
            !emotion ||
            emotion === "Not detected"
        ) return;

        if (!emotionScores[emotion]) {

            emotionScores[emotion] = 0;
        }

        emotionScores[emotion] += confidence;
    }

    addEmotion(textEmotion, textConfidence);

    addEmotion(faceEmotion, faceConfidence);

    addEmotion(voiceEmotion, voiceConfidence);

    let finalEmotion =
        Object.keys(emotionScores)
        .reduce((a, b) =>

            emotionScores[a] >
            emotionScores[b]
                ? a
                : b
        );

    const totalConfidence =

        textConfidence +

        faceConfidence +

        voiceConfidence;

    const finalConfidence =
        Math.round(

            (emotionScores[finalEmotion] /
            Math.max(totalConfidence, 1))

            * 100
        );

    // INSIGHT + RECOMMENDATION
    let insight = "";

    let recommendation = "";

    if (finalEmotion === "happy") {

        insight =
            "Overall positive emotional state detected.";

        recommendation =
            "Keep maintaining your joyful mindset and continue positive activities.";
    }

    else if (finalEmotion === "sadness") {

        insight =
            "Low emotional mood detected from multimodal analysis.";

        recommendation =
            "Take proper rest and stay connected with loved ones.";
    }

    else if (finalEmotion === "angry") {

        insight =
            "Stress or frustration indicators detected.";

        recommendation =
            "Try meditation and relaxation exercises.";
    }

    else if (finalEmotion === "fear") {

        insight =
            "Anxiety or nervous emotional patterns detected.";

        recommendation =
            "Stay calm and focus on positive thoughts.";
    }

    else {

        insight =
            "Balanced and emotionally stable condition detected.";

        recommendation =
            "Maintain your calm and stable mindset.";
    }

    saveEmotionHistory(finalEmotion);

    resultDiv.innerHTML = `

        <div class="emotion-box ${finalEmotion}">

            <span>
                Final Fusion Emotion
            </span>

            <strong>
                ${finalEmotion.toUpperCase()}
            </strong>

        </div>

        <p style="
            margin-top:10px;
            color:#94a3b8;
        ">

            Fusion Confidence:
            ${finalConfidence}%

        </p>

        <div class="progress-bar">

            <div class="progress"
                 style="
                    width:${finalConfidence}%
                 ">
            </div>

        </div>

        <hr style="
            margin:20px 0;
            border:1px solid #334155;
        ">

        <div style="margin-top:20px;">

            <p>
                📝 <strong>Text Emotion:</strong>
                ${textEmotion}
                (${textConfidence}%)
            </p>

            <p style="margin-top:10px;">
                📷 <strong>Face Emotion:</strong>
                ${faceEmotion}
                (${faceConfidence}%)
            </p>

            <p style="margin-top:10px;">
                🎤 <strong>Voice Emotion:</strong>
                ${voiceEmotion}
                (${voiceConfidence}%)
            </p>

        </div>

        <hr style="
            margin:20px 0;
            border:1px solid #334155;
        ">

        <p style="margin-top:15px;">

            🧠 <strong>Final Insight:</strong>

            ${insight}

        </p>

        <p style="margin-top:12px;">

            💡 <strong>Recommendation:</strong>

            ${recommendation}

        </p>
    `;
}


// ===============================
// FUN ZONE
// ===============================
function openFunZone() {

    fetch("/funzone")
    .then(res => res.json())
    .then(data => {

        let content = "🌿 WELLNESS ZONE\n\n";

        data.forEach(item => {

            content +=
                item.title + "\n" +
                item.description + "\n" +
                "Best for: " + item.best_for + "\n\n";
        });

        alert(content);
    })
    .catch(err => {
        console.log(err);
        alert("Unable to load wellness activities");
    });
}

// ===============================
// EXPORT REPORT
// ===============================
function exportReport() {

    fetch("/history")
    .then(res => res.json())
    .then(history => {

        if (!history || history.length === 0) {
            alert("No history available");
            return;
        }

        let report = `
MENTAL HEALTH EMOTION ANALYSIS REPORT
====================================

Generated By: MultimodalTransformer
Generated On: ${new Date().toLocaleString()}

====================================
EMOTION HISTORY REPORT
====================================

`;

        history.forEach((item, index) => {

            report += `
Record ${index + 1}
-------------------------
Date: ${item.date}
Time: ${item.time}

Text Emotion: ${item.text_emotion}
Face Emotion: ${item.face_emotion}
Voice Emotion: ${item.voice_emotion}

Final Emotion: ${item.final_emotion}

`;
        });

        report += `
====================================
TOTAL RECORDS: ${history.length}
====================================
`;

        const blob = new Blob(
            [report],
            { type: "text/plain" }
        );

        const a =
            document.createElement("a");

        a.href =
            URL.createObjectURL(blob);

        a.download =
            "emotion_report.txt";

        a.click();
    })
    .catch(err => {
        console.log("Export Error:", err);
    });
}

function loadProfileStats() {

    fetch("/history")
    .then(res => res.json())
    .then(data => {

        const totalRecords =
            document.getElementById("total-records");

        if (totalRecords) {
            totalRecords.innerText = data.length;
        }

    })
    .catch(err => {
        console.log("Profile Stats Error:", err);
    });
}