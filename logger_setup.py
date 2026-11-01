import logging
from logging.handlers import RotatingFileHandler
import os

def setup_logger(name="weather_app"):
    os.makedirs("logs", exist_ok=True)
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    handler = RotatingFileHandler(
        "logs/app.log", maxBytes=1_000_000, backupCount=5, encoding="utf-8"
    )
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

log = setup_logger()