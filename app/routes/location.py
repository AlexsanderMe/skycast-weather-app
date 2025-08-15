from flask import request, jsonify, render_template
from . import main
from ..services.location_service import LocationService

location_service = LocationService()

@main.route('/')
def index():
    """Main page of the application"""
    is_local = request.host.startswith('127.0.0.1') or request.host.startswith('localhost')
    return render_template('index.html', is_local=is_local)

@main.route('/api/location')
def get_location():
    """API endpoint to get location by IP"""
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
                'error': 'Could not get location'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@main.route('/api/location/search')
def search_location():
    """API endpoint to search location by name"""
    try:
        query = request.args.get('q')
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Search parameter not provided'
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
                'error': 'Location not found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500