from flask import request, jsonify
from . import main
from ..services.weather_service import WeatherService

weather_service = WeatherService()

@main.route('/api/weather')
def get_weather():
    """API endpoint for getting weather data"""
    try:
        lat = request.args.get('lat')
        lon = request.args.get('lon')
        
        if not lat or not lon:
            ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
            from ..services.location_service import LocationService
            location_service = LocationService()
            location_data = location_service.get_location_by_ip(ip)
            if location_data:
                lat, lon = location_data['lat'], location_data['lon']
            else:
                lat, lon = -23.5505, -46.6333
        
        weather_data = weather_service.get_weather_data(lat, lon)
        
        if weather_data:
            return jsonify({
                'success': True,
                'data': weather_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Could not get weather data'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500