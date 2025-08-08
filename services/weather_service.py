import requests
from datetime import datetime, timezone
import os
from config import Config

class WeatherService:
    """Serviço para obter dados meteorológicos da OpenWeatherMap API"""
    
    def __init__(self):
        self.api_key = Config.OPENWEATHER_API_KEY
        self.base_url = Config.OPENWEATHER_BASE_URL
        
        if not self.api_key:
            raise ValueError("OPENWEATHER_API_KEY não encontrada nas variáveis de ambiente")
    
    def get_weather_data(self, lat, lon):
        """Obter dados meteorológicos para as coordenadas especificadas"""
        try:
            # Obter clima atual
            current_weather = self._get_current_weather(lat, lon)
            
            # Obter previsão de 5 dias
            forecast = self._get_forecast(lat, lon)
            
            if current_weather and forecast:
                return {
                    'current': current_weather,
                    'forecast': forecast,
                    'location': {
                        'lat': lat,
                        'lon': lon
                    }
                }
            
            return None
            
        except Exception as e:
            print(f"Erro ao obter dados meteorológicos: {e}")
            return None
    
    def _get_current_weather(self, lat, lon):
        """Obter clima atual"""
        url = f"{self.base_url}/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': self.api_key,
            'units': 'metric',
            'lang': 'pt_br'
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        return {
            'temperature': round(data['main']['temp']),
            'feels_like': round(data['main']['feels_like']),
            'humidity': data['main']['humidity'],
            'pressure': data['main']['pressure'],
            'visibility': data.get('visibility', 0) / 1000,  # Converter para km
            'wind_speed': data['wind']['speed'],
            'wind_direction': data['wind'].get('deg', 0),
            'cloudiness': data['clouds']['all'],
            'weather': {
                'main': data['weather'][0]['main'],
                'description': data['weather'][0]['description'].title(),
                'icon': data['weather'][0]['icon']
            },
            'city': data['name'],
            'country': data['sys']['country'],
            'sunrise': datetime.fromtimestamp(data['sys']['sunrise'], timezone.utc),
            'sunset': datetime.fromtimestamp(data['sys']['sunset'], timezone.utc),
            'timezone': data['timezone']
        }
    
    def _get_forecast(self, lat, lon):
        """Obter previsão de 5 dias"""
        url = f"{self.base_url}/forecast"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': self.api_key,
            'units': 'metric',
            'lang': 'pt_br'
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Processar previsão por dia
        daily_forecast = {}
        
        for item in data['list']:
            date = datetime.fromtimestamp(item['dt'], timezone.utc).date()
            
            if date not in daily_forecast:
                daily_forecast[date] = {
                    'date': date,
                    'temperatures': [],
                    'weather': item['weather'][0],
                    'humidity': item['main']['humidity'],
                    'wind_speed': item['wind']['speed']
                }
            
            daily_forecast[date]['temperatures'].append(item['main']['temp'])
        
        # Calcular temperaturas min/max por dia
        forecast_list = []
        for date, data in list(daily_forecast.items())[:5]:  # Primeiros 5 dias
            forecast_list.append({
                'date': date.strftime('%Y-%m-%d'),
                'day_name': self._get_day_name(date),
                'temp_min': round(min(data['temperatures'])),
                'temp_max': round(max(data['temperatures'])),
                'weather': {
                    'main': data['weather']['main'],
                    'description': data['weather']['description'].title(),
                    'icon': data['weather']['icon']
                },
                'humidity': data['humidity'],
                'wind_speed': data['wind_speed']
            })
        
        return forecast_list
    
    def _get_day_name(self, date):
        """Obter nome do dia da semana em português"""
        days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
        return days[date.weekday()]