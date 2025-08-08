from flask import Flask, render_template, request, jsonify
from services.weather_service import WeatherService
from services.location_service import LocationService
from config import Config
from minify_html import minify
import os

app = Flask(__name__)
app.config.from_object(Config)

# Inicializar serviços
weather_service = WeatherService()
location_service = LocationService()

@app.after_request
def minify_html(response):
    if response.content_type.startswith('text/html'):
        html = response.get_data(as_text=True)
        
        # Remove comentários
        minified = minify(
            html,
            minify_css=True,
            minify_js=False,
            remove_bangs=False,
            remove_processing_instructions=True,
            keep_html_and_head_opening_tags=True
        )
        
        response.set_data(minified)
    return response

@app.route('/')
def index():
    """Página principal da aplicação"""
    is_local = request.host.startswith('127.0.0.1') or request.host.startswith('localhost')
    return render_template('index.html', is_local=is_local)

@app.route('/api/weather')
def get_weather():
    """API endpoint para obter dados do clima"""
    try:
        # Tentar obter coordenadas do frontend
        lat = request.args.get('lat')
        lon = request.args.get('lon')
        
        if not lat or not lon:
            # Fallback: usar IP para localização
            ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
            location_data = location_service.get_location_by_ip(ip)
            if location_data:
                lat, lon = location_data['lat'], location_data['lon']
            else:
                # Fallback final: São Paulo, BR
                lat, lon = -23.5505, -46.6333
        
        # Obter dados do clima
        weather_data = weather_service.get_weather_data(lat, lon)
        
        if weather_data:
            return jsonify({
                'success': True,
                'data': weather_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Não foi possível obter dados do clima'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/location')
def get_location():
    """API endpoint para obter localização por IP"""
    try:
        ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        location_data = location_service.get_location_by_ip(ip)
        
        if location_data:
            return jsonify({
                'success': True,
                'data': location_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Não foi possível obter localização'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/location/search')
def search_location():
    """API endpoint para buscar localização por nome"""
    try:
        query = request.args.get('q')
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Parâmetro de busca não fornecido'
            }), 400
        
        location_data = location_service.search_location_by_name(query)
        
        if location_data:
            return jsonify({
                'success': True,
                'data': location_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Local não encontrado'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)