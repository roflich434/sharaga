import time
import requests
from logger_setup import log

_cache = {}
CACHE_TTL = 1800

WTTR_CODES = {
    "113": ("clear", "Ясно"),
    "116": ("partly_cloudy", "Малооблачно"),
    "119": ("cloudy", "Облачно"),
    "122": ("cloudy", "Пасмурно"),
    "143": ("fog", "Туман"),
    "176": ("drizzle", "Местами дождь"),
    "179": ("snow", "Местами снег"),
    "182": ("snow", "Мокрый снег"),
    "185": ("snow", "Изморозь"),
    "200": ("thunder", "Гроза"),
    "227": ("snow", "Метель"),
    "230": ("snow", "Метель"),
    "248": ("fog", "Туман"),
    "260": ("fog", "Туман"),
    "263": ("drizzle", "Морось"),
    "266": ("drizzle", "Морось"),
    "281": ("drizzle", "Изморозь"),
    "284": ("drizzle", "Изморозь"),
    "293": ("drizzle", "Небольшой дождь"),
    "296": ("rain", "Небольшой дождь"),
    "299": ("rain", "Дождь"),
    "302": ("rain", "Дождь"),
    "305": ("rain", "Сильный дождь"),
    "308": ("rain", "Сильный дождь"),
    "311": ("drizzle", "Изморозь"),
    "314": ("drizzle", "Изморозь"),
    "317": ("snow", "Снег с дождём"),
    "320": ("snow", "Снег с дождём"),
    "323": ("snow", "Небольшой снег"),
    "326": ("snow", "Небольшой снег"),
    "329": ("snow", "Снег"),
    "332": ("snow", "Сильный снег"),
    "335": ("snow", "Сильный снег"),
    "338": ("snow", "Сильный снег"),
    "350": ("drizzle", "Ледяной дождь"),
    "353": ("drizzle", "Небольшой ливень"),
    "356": ("rain", "Ливень"),
    "359": ("rain", "Сильный ливень"),
    "362": ("snow", "Мокрый снег"),
    "365": ("snow", "Мокрый снег"),
    "368": ("snow", "Небольшой снегопад"),
    "371": ("snow", "Снегопад"),
    "374": ("drizzle", "Ледяной ливень"),
    "377": ("drizzle", "Ледяной ливень"),
    "386": ("thunder", "Гроза"),
    "389": ("thunder", "Сильная гроза"),
    "392": ("thunder", "Гроза со снегом"),
    "395": ("thunder", "Сильная гроза со снегом"),
}

def get_weather(lat=55.75, lon=37.62, city="Москва"):
    key = f"{lat}_{lon}"
    now = time.time()
    if key in _cache and now - _cache[key][0] < CACHE_TTL:
        log.info(f"Cache hit: {city}")
        return _cache[key][1]

    url = f"http://wttr.in/{lat},{lon}?format=j1&lang=ru"
    
    try:
        log.info(f"Requesting weather from wttr.in for {city}")
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        log.error(f"wttr.in API error: {e}")
        return None

    try:
        weather_data = data.get("weather", [])
        if not weather_data:
            log.error(f"No weather data in response for {city}")
            return None

        days = []
        for day_data in weather_data:
            date = day_data["date"]
            max_temp = int(day_data["maxtempC"])
            min_temp = int(day_data["mintempC"])
            
            hourly = day_data.get("hourly", [])
            midday = hourly[4] if len(hourly) > 4 else hourly[0]
            
            code = midday.get("weatherCode", "113")
            kind, label = WTTR_CODES.get(str(code), ("unknown", "Неизвестно"))
            
            precip = float(midday.get("precipMM", 0))
            wind = float(midday.get("windspeedKmph", 0))
            
            days.append({
                "date": date,
                "code": int(code),
                "kind": kind,
                "label": label,
                "t_max": max_temp,
                "t_min": min_temp,
                "precip": round(precip, 1),
                "wind": round(wind),
            })

        result = {"city": city, "days": days}
        _cache[key] = (now, result)
        log.info(f"Fetched {len(days)} days for {city} from wttr.in")
        return result
        
    except Exception as e:
        log.error(f"Parse error: {e}")
        return None

CITIES = {
    "Москва": (55.75, 37.62),
    "Санкт-Петербург": (59.93, 30.32),
    "Казань": (55.79, 49.11),
    "Сочи": (43.60, 39.73),
    "Екатеринбург": (56.84, 60.60),
    "Новосибирск": (55.03, 82.92),
    "Саратов": (51.54, 46.01),
    "Энгельс": (51.42, 46.11),
}