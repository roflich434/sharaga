import os
import time
from flask import Flask, render_template, jsonify, request
from weather_api import get_weather, CITIES
from logger_setup import log
import traceback

app = Flask(__name__)

# ===== ЗАЩИТА ОТ DDOS / НАГРУЗКИ =====
request_counts = {}
MAX_REQUESTS_PER_MINUTE = 1000
BAN_TIME = 60

@app.before_request
def rate_limit():
    ip = request.remote_addr
    now = time.time()
    
    if ip not in request_counts:
        request_counts[ip] = {"count": 0, "start": now, "banned_until": 0}
    
    data = request_counts[ip]
    
    # Если забанен
    if now < data["banned_until"]:
        log.warning(f"BANNED request from {ip}")
        return jsonify({"error": "Слишком много запросов. Подожди минуту."}), 429
    
    # Сброс счётчика каждую минуту
    if now - data["start"] > 60:
        data["count"] = 0
        data["start"] = now
    
    data["count"] += 1
    
    if data["count"] > MAX_REQUESTS_PER_MINUTE:
        data["banned_until"] = now + BAN_TIME
        log.warning(f"Rate limit exceeded for {ip}, banned for {BAN_TIME}s")
        return jsonify({"error": "Слишком много запросов. Подожди минуту."}), 429

@app.before_request
def log_request():
    log.info(f"{request.method} {request.path} from {request.remote_addr}")

@app.route("/")
def index():
    try:
        return render_template("index.html", cities=list(CITIES.keys()))
    except Exception as e:
        log.error(f"Index render error: {e}\n{traceback.format_exc()}")
        return "Internal Server Error", 500

@app.route("/api/weather")
def api_weather():
    try:
        city = request.args.get("city", "Москва")
        if city not in CITIES:
            log.warning(f"Unknown city: {city}")
            return jsonify({"error": f"Город не найден"}), 400
        lat, lon = CITIES[city]
        data = get_weather(lat, lon, city)
        if not data:
            return jsonify({"error": "Не удалось получить данные"}), 500
        return jsonify(data)
    except Exception as e:
        log.error(f"Weather API error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Внутренняя ошибка"}), 500

@app.route("/api/log", methods=["POST"])
def api_log():
    try:
        payload = request.get_json(silent=True) or {}
        action = payload.get("action", "unknown")
        detail = payload.get("detail", "")
        log.info(f"USER_ACTION | {action} | {detail}")
        return jsonify({"ok": True})
    except Exception as e:
        log.error(f"Log error: {e}")
        return jsonify({"ok": False}), 400

@app.errorhandler(404)
def not_found(e):
    return "not found", 404

@app.errorhandler(429)
def rate_limit_error(e):
    return jsonify({"error": "Слишком много запросов"}), 429

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    log.info("=== Server started ===")
    app.run(host="0.0.0.0", port=port, debug=False)