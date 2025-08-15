import requests
from config import Config

class LocationService:
    """Serviço para obter localização por IP"""
    
    def __init__(self):
        self.base_url = Config.IPAPI_BASE_URL
        self.openweather_api_key = Config.OPENWEATHER_API_KEY
    
    def get_location_by_ip(self, ip):
        """Obter localização por endereço IP"""
        try:
            # Para IPs locais, usar localização padrão
            if ip in ['127.0.0.1', 'localhost', '::1']:
                return {
                    'lat': -23.5505,
                    'lon': -46.6333,
                    'city': 'São Paulo',
                    'country': 'Brasil',
                    'timezone': 'America/Sao_Paulo'
                }
            
            url = f"{self.base_url}/{ip}"
            params = {
                'fields': 'status,country,regionName,city,lat,lon,timezone,query'
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status') == 'success':
                return {
                    'lat': data['lat'],
                    'lon': data['lon'],
                    'city': data['city'],
                    'region': data['regionName'],
                    'country': data['country'],
                    'timezone': data['timezone'],
                    'ip': data['query']
                }
            
            return None
            
        except Exception as e:
            print(f"Erro ao obter localização por IP: {e}")
            return None
    
    def search_location_by_name(self, query):
        """Buscar localização por nome usando a API do OpenWeatherMap"""
        try:
            if not self.openweather_api_key:
                print("API key do OpenWeatherMap não configurada")
                return None
            
            url = "http://api.openweathermap.org/geo/1.0/direct"
            params = {
                'q': query,
                'limit': 1,
                'appid': self.openweather_api_key
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                location = data[0]
                return {
                    'lat': location.get('lat'),
                    'lon': location.get('lon'),
                    'city': location.get('name', 'Desconhecido'),
                    'country': location.get('country', 'Desconhecido'),
                    'state': location.get('state', ''),
                }
            
            return None
            
        except Exception as e:
            print(f"Erro ao buscar localização por nome: {e}")
            return None