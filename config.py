import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configurações da aplicação"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')
    
    # URLs das APIs
    OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'
    IPAPI_BASE_URL = 'http://ip-api.com/json'
    
    # Configurações de cache (em segundos)
    WEATHER_CACHE_TIMEOUT = 600  # 10 minutos
    LOCATION_CACHE_TIMEOUT = 3600  # 1 hora