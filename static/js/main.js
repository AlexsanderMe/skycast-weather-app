/**
 * SkyCast - JavaScript Principal
 * Sistema de previsão do tempo
 * 
 * Este arquivo é responsável por inicializar a aplicação,
 * configurar o canvas para efeitos visuais, e gerenciar as interações do usuário.
 * 
 * Funcionalidades:
 * - Obtenção da localização do usuário
 * - Carregamento de dados de clima
 * - Renderização de efeitos visuais (chuva, neve, trovoadas, estrelas)
 * - Atualização automática a cada 10 minutos
 * 
 * GitHub: https://github.com/AlexsanderMe
 * 
 */

class SkyCast {
    constructor() {
        this.currentWeatherData = null;
        this.userLocation = null;
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;
        this.particles = [];
        this.stars = [];
        
        // Configurações dos efeitos visuais
        this.effects = {
            rain: { active: false, particles: [] },
            snow: { active: false, particles: [] },
            storm: { active: false, intensity: 0 },
            stars: { active: false, particles: [] },
            clouds: { active: false, particles: [] }
        };
        
        this.init();
    }

    /**
     * Inicialização da aplicação
     */
    async init() {
        this.setupCanvas();
        this.bindEvents();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        
        // Tentar obter localização do usuário
        await this.getCurrentLocation();
        
        // Carregar dados do clima
        await this.loadWeatherData();
        
        // Iniciar animações
        this.startAnimation();
        
        // Esconder loading screen
        this.hideLoadingScreen();

        // Configurar atualização automática a cada 10 minutos
        setInterval(async () => {
            console.log('Atualizando dados automaticamente...');
            await this.loadWeatherData();
        }, 10 * 60 * 1000); // 10 minutos em milissegundos
        
        // Inicializar propriedades para controle de efeitos
        this.lightningInterval = null;
    }

    /**
     * Configurar canvas para efeitos visuais
     */
    setupCanvas() {
        this.canvas = document.getElementById('weather-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Redimensionar canvas
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Vincular eventos
     */
    bindEvents() {
        // Botão de atualizar
        document.getElementById('refresh-btn').addEventListener('click', async () => {
            this.showLoadingStatus('Atualizando dados...');
            await this.loadWeatherData();
            this.hideLoadingScreen();
        });

        // Botão de localização
        // document.getElementById('location-btn').addEventListener('click', () => {
        //     this.getCurrentLocation(true);
        // });

        // Fechar modal de erro
        document.getElementById('close-error').addEventListener('click', () => {
            this.hideErrorModal();
        });

        // Fechar modal clicando fora
        document.getElementById('error-modal').addEventListener('click', (e) => {
            if (e.target.id === 'error-modal') {
                this.hideErrorModal();
            }
        });

        // Campo de busca
        document.getElementById('search-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            const location = searchInput.value.trim();
            
            if (location) {
                this.showLoadingStatus(`Buscando dados para ${location}...`);
                await this.searchLocation(location);
                this.hideLoadingScreen();
            }
        });

        // Botões de cenário de teste (apenas local)
        const scenarioBtns = document.querySelectorAll('.scenario-btn');
        if (scenarioBtns.length) {
            scenarioBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const scenario = btn.getAttribute('data-scenario');
                    this.forceScenario(scenario);
                });
            });
        }
    }

    /**
     * Forçar cenário de clima para testes locais
     */
    forceScenario(scenario) {
        if (!this.currentWeatherData) return;
        const now = new Date();
        const base = this.currentWeatherData.current;
        let forcedWeather = {
            ...base,
            weather: { ...base.weather },
        };
        switch (scenario) {
            case 'clear':
                forcedWeather.weather.main = 'Clear';
                forcedWeather.weather.description = 'Céu limpo';
                forcedWeather.weather.icon = '01d';
                break;
            case 'rain':
                forcedWeather.weather.main = 'Rain';
                forcedWeather.weather.description = 'Chuva';
                forcedWeather.weather.icon = '10d';
                break;
            case 'snow':
                forcedWeather.weather.main = 'Snow';
                forcedWeather.weather.description = 'Neve';
                forcedWeather.weather.icon = '13d';
                break;
            case 'thunderstorm':
                forcedWeather.weather.main = 'Thunderstorm';
                forcedWeather.weather.description = 'Tempestade';
                forcedWeather.weather.icon = '11d';
                break;
            case 'clouds':
                forcedWeather.weather.main = 'Clouds';
                forcedWeather.weather.description = 'Nublado';
                forcedWeather.weather.icon = '03d';
                break;
            case 'night':
                forcedWeather.weather.main = 'Clear';
                forcedWeather.weather.description = 'Noite limpa';
                forcedWeather.weather.icon = '01n';
                // Ajustar nascer/pôr do sol para garantir modo noturno
                forcedWeather.sunrise = new Date(now.getTime() - 12 * 3600 * 1000);
                forcedWeather.sunset = new Date(now.getTime() - 6 * 3600 * 1000);
                break;
        }
        // Atualizar dados atuais e efeitos
        this.currentWeatherData.current = forcedWeather;
        this.updateWeatherDisplay();
        this.updateWeatherEffects();
        this.updateBackgroundTheme();
    }

    /**
     * Obter localização atual do usuário
     */
    async getCurrentLocation(forceRequest = false) {
        return new Promise((resolve) => {
            if (forceRequest || !this.userLocation) {
                this.updateLoadingStatus('Obtendo sua localização...');
                
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            this.userLocation = {
                                lat: position.coords.latitude,
                                lon: position.coords.longitude
                            };
                            console.log('Localização obtida:', this.userLocation);
                            resolve(this.userLocation);
                        },
                        async (error) => {
                            console.warn('Erro ao obter localização:', error.message);
                            this.updateLoadingStatus('Usando localização por IP...');
                            
                            // Fallback: usar IP para localização
                            try {
                                const response = await fetch('/api/location');
                                const data = await response.json();
                                
                                if (data.success) {
                                    this.userLocation = {
                                        lat: data.data.lat,
                                        lon: data.data.lon
                                    };
                                    console.log('Localização por IP:', this.userLocation);
                                }
                            } catch (e) {
                                console.error('Erro ao obter localização por IP:', e);
                            }
                            
                            resolve(this.userLocation);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 300000 // 5 minutos
                        }
                    );
                } else {
                    console.warn('Geolocalização não suportada');
                    resolve(null);
                }
            } else {
                resolve(this.userLocation);
            }
        });
    }

    /**
     * Carregar dados meteorológicos
     */
    async loadWeatherData() {
        try {
            this.updateLoadingStatus('Por favor, aguarde alguns instantes...');
            
            let url = '/api/weather';
            
            // Adicionar coordenadas se disponíveis
            if (this.userLocation) {
                url += `?lat=${this.userLocation.lat}&lon=${this.userLocation.lon}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.currentWeatherData = data.data;
                this.updateWeatherDisplay();
                this.updateWeatherEffects();
                this.updateBackgroundTheme();
                this.updateLastUpdate();
            } else {
                throw new Error(data.error || 'Erro ao carregar dados do clima');
            }
            
        } catch (error) {
            console.error('Erro ao carregar dados do clima:', error);
            this.showError('Não foi possível carregar os dados do clima. Tente novamente.');
        }
    }

    /**
     * Atualizar exibição do clima
     */
    updateWeatherDisplay() {
        if (!this.currentWeatherData) return;
        
        const { current, forecast } = this.currentWeatherData;
        
        // Informações atuais
        document.getElementById('current-city').textContent = `${current.city}, ${current.country}`;
        document.getElementById('current-temp').textContent = current.temperature;
        document.getElementById('feels-like').textContent = `${current.feels_like}°C`;
        document.getElementById('weather-description').textContent = current.weather.description;
        
        // Ícone do clima
        const iconUrl = `https://openweathermap.org/img/wn/${current.weather.icon}@4x.png`;
        document.getElementById('current-weather-icon').src = iconUrl;
        
        // Métricas
        document.getElementById('humidity').textContent = `${current.humidity}%`;
        document.getElementById('wind-speed').textContent = `${Math.round(current.wind_speed * 3.6)} km/h`;
        document.getElementById('pressure').textContent = `${current.pressure} hPa`;
        document.getElementById('visibility').textContent = `${current.visibility} km`;
        
        // Nascer e pôr do sol
        document.getElementById('sunrise-time').textContent = this.formatTime(current.sunrise);
        document.getElementById('sunset-time').textContent = this.formatTime(current.sunset);
        
        // Nebulosidade
        document.getElementById('cloudiness').textContent = `${current.cloudiness}%`;
        document.getElementById('cloudiness-progress').style.width = `${current.cloudiness}%`;
        
        // Previsão de 5 dias
        this.updateForecastDisplay(forecast);
    }

    /**
     * Atualizar previsão de 5 dias
     */
    updateForecastDisplay(forecast) {
        const container = document.getElementById('forecast-container');
        container.innerHTML = '';
        
        forecast.forEach((day, index) => {
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.style.animationDelay = `${index * 0.1}s`;
            
            const iconUrl = `https://openweathermap.org/img/wn/${day.weather.icon}@2x.png`;
            
            forecastItem.innerHTML = `
                <div class="forecast-day">${day.day_name}</div>
                <div class="forecast-icon">
                    <img src="${iconUrl}" alt="${day.weather.description}">
                </div>
                <div class="forecast-temps">
                    <span class="temp-max">${day.temp_max}°</span>
                    <span class="temp-min">${day.temp_min}°</span>
                </div>
                <div class="forecast-details">
                    <small><i class="fas fa-tint"></i> ${day.humidity}%</small>
                    <small><i class="fas fa-wind"></i> ${Math.round(day.wind_speed * 3.6)}km/h</small>
                </div>
            `;
            
            container.appendChild(forecastItem);
        });
    }

    /**
     * Atualizar efeitos visuais baseados no clima
     */
    updateWeatherEffects() {
        if (!this.currentWeatherData) return;
        
        const weatherMain = this.currentWeatherData.current.weather.main.toLowerCase();
        const weatherDescription = this.currentWeatherData.current.weather.description.toLowerCase();
        const isNight = this.isNightTime();
        
        // Resetar todos os efeitos
        Object.keys(this.effects).forEach(key => {
            this.effects[key].active = false;
        });
        
        // Ativar efeitos baseados no clima
        if (weatherMain === 'rain') {
            // Verificar se é chuva leve (drizzle) ou chuva normal
            if (weatherDescription.includes('light') || weatherDescription.includes('drizzle')) {
                this.effects.rain.active = true;
                this.createRainParticles();
            } else {
                this.effects.rain.active = true;
                this.createRainParticles();
            }
            
            // Adicionar nuvens com chuva
            this.effects.clouds.active = true;
            this.createCloudParticles();
        } 
        else if (weatherMain === 'drizzle') {
            this.effects.rain.active = true;
            this.createRainParticles();
            
            // Adicionar nuvens com garoa
            this.effects.clouds.active = true;
            this.createCloudParticles();
        } 
        else if (weatherMain === 'thunderstorm') {
            this.effects.rain.active = true;
            this.effects.storm.active = true;
            this.effects.clouds.active = true;
            
            this.createRainParticles();
            this.createCloudParticles();
            this.activateStormEffect();
        } 
        else if (weatherMain === 'snow') {
            this.effects.snow.active = true;
            this.effects.clouds.active = true;
            
            this.createSnowParticles();
            this.createCloudParticles();
        } 
        else if (weatherMain === 'clouds') {
            this.effects.clouds.active = true;
            this.createCloudParticles();
        }
        else if (weatherMain === 'clear') {
            if (isNight) {
                this.effects.stars.active = true;
                this.createStarParticles();
            }
        }
        
        // Efeito noturno - sempre ativo quando é noite
        if (isNight) {
            this.effects.stars.active = true;
            if (!this.stars.length) {
                this.createStarParticles();
            }
        } else {
            // Limpar estrelas durante o dia
            this.effects.stars.active = false;
            this.stars = [];
        }
        
        // Limpar efeitos de tempestade se não for mais tempestade
        if (weatherMain !== 'thunderstorm' && this.lightningInterval) {
            clearInterval(this.lightningInterval);
            this.lightningInterval = null;
            const glitchContainer = document.querySelector('.glitch-container');
            glitchContainer.style.opacity = '0';
        }
        
        // console.log('Efeitos visuais atualizados:', {
        //     weatherMain,
        //     weatherDescription,
        //     isNight,
        //     effects: this.effects
        // });
    }

    /**
     * Verificar se é noite
     */
    isNightTime() {
        if (!this.currentWeatherData) return false;
        
        const { timezone, sunrise, sunset } = this.currentWeatherData.current;
        
        // Calcular hora local usando timezone
        const nowUTC = new Date();
        const nowLocal = new Date(nowUTC.getTime() + (timezone * 1000));
        
        // Converter sunrise e sunset para timestamps
        // Verificar se sunrise e sunset já são timestamps ou objetos Date
        let sunriseTimestamp, sunsetTimestamp;
        
        if (typeof sunrise === 'string') {
            // Se for string ISO, converter para timestamp
            sunriseTimestamp = new Date(sunrise).getTime() / 1000;
        } else if (sunrise instanceof Date) {
            // Se for objeto Date, converter para timestamp
            sunriseTimestamp = sunrise.getTime() / 1000;
        } else {
            // Assumir que já é timestamp
            sunriseTimestamp = sunrise;
        }
        
        if (typeof sunset === 'string') {
            sunsetTimestamp = new Date(sunset).getTime() / 1000;
        } else if (sunset instanceof Date) {
            sunsetTimestamp = sunset.getTime() / 1000;
        } else {
            sunsetTimestamp = sunset;
        }
        
        // Obter timestamp atual em segundos
        const nowTimestamp = Math.floor(nowLocal.getTime() / 1000);
        
        // Criar objetos de data locais para nascer e pôr do sol
        const sunriseLocal = new Date(sunriseTimestamp * 1000 + timezone * 1000);
        const sunsetLocal = new Date(sunsetTimestamp * 1000 + timezone * 1000);
        
        // Extrair horas, minutos e segundos do dia atual
        const nowHours = nowLocal.getHours();
        const nowMinutes = nowLocal.getMinutes();
        const nowSeconds = nowLocal.getSeconds();
        const nowSecondsOfDay = nowHours * 3600 + nowMinutes * 60 + nowSeconds;
        
        // Extrair horas, minutos e segundos do nascer do sol
        const sunriseHours = sunriseLocal.getHours();
        const sunriseMinutes = sunriseLocal.getMinutes();
        const sunriseSeconds = sunriseLocal.getSeconds();
        const sunriseSecondsOfDay = sunriseHours * 3600 + sunriseMinutes * 60 + sunriseSeconds;
        
        // Extrair horas, minutos e segundos do pôr do sol
        const sunsetHours = sunsetLocal.getHours();
        const sunsetMinutes = sunsetLocal.getMinutes();
        const sunsetSeconds = sunsetLocal.getSeconds();
        const sunsetSecondsOfDay = sunsetHours * 3600 + sunsetMinutes * 60 + sunsetSeconds;
        
        // Verificar se o horário atual está antes do nascer do sol ou depois do pôr do sol
        const isNight = nowSecondsOfDay < sunriseSecondsOfDay || nowSecondsOfDay > sunsetSecondsOfDay;
        
        // console.log('Verificação noite:', {
        //     nowLocal: nowLocal.toLocaleTimeString(),
        //     nowSecondsOfDay,
        //     sunrise: sunriseLocal.toLocaleTimeString(),
        //     sunriseSecondsOfDay,
        //     sunset: sunsetLocal.toLocaleTimeString(),
        //     sunsetSecondsOfDay,
        //     isNight
        // });
        
        return isNight;
    }

    /**
     * Atualizar tema do background
     */
    updateBackgroundTheme() {
        if (!this.currentWeatherData) return;
        
        const weatherMain = this.currentWeatherData.current.weather.main.toLowerCase();
        const weatherDescription = this.currentWeatherData.current.weather.description.toLowerCase();
        const isNight = this.isNightTime();
        const timeOfDay = isNight ? 'night' : 'day';
        
        // Remover todas as classes anteriores do corpo
        document.body.className = '';
        
        // Determinar a condição climática principal
        let weatherCondition = '';
        
        if (weatherMain === 'clear') {
            weatherCondition = 'clear';
        } else if (weatherMain === 'clouds') {
            weatherCondition = 'cloudy';
        } else if (weatherMain === 'rain') {
            // Verificar se é chuva leve (drizzle) ou chuva normal
            if (weatherDescription.includes('light') || weatherDescription.includes('drizzle')) {
                weatherCondition = 'drizzle';
            } else {
                weatherCondition = 'rainy';
            }
        } else if (weatherMain === 'drizzle') {
            weatherCondition = 'drizzle';
        } else if (weatherMain === 'thunderstorm') {
            weatherCondition = 'stormy';
        } else if (weatherMain === 'snow') {
            weatherCondition = 'snow';
        } else {
            // Condição padrão para outros casos
            weatherCondition = 'clear';
        }
        
        // Aplicar a classe combinada de condição climática e horário
        const themeClass = `${weatherCondition}-${timeOfDay}`;
        document.body.classList.add(themeClass);
        
        console.log('Tema aplicado:', {
            weatherMain,
            weatherDescription,
            isNight,
            themeClass
        });
        
        // Atualizar efeitos visuais baseados na condição climática e horário
        this.updateWeatherEffects();
    }

    /**
     * Criar partículas de chuva
     */
    createRainParticles() {
        this.particles = [];
        const weatherMain = this.currentWeatherData.current.weather.main.toLowerCase();
        const isNight = this.isNightTime();
        
        // Ajustar intensidade baseado no tipo de chuva
        let particleCount = 150;
        let speedMultiplier = 1;
        
        if (weatherMain === 'thunderstorm') {
            particleCount = 200;
            speedMultiplier = 1.5;
        }
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height - this.canvas.height,
                speed: (Math.random() * 15 + 15) * speedMultiplier,
                length: Math.random() * 15 + 15,
                opacity: isNight ? Math.random() * 0.7 + 0.4 : Math.random() * 0.9 + 0.3,
                angle: Math.random() * 10 - 5,
                type: 'rain'
            });
        }
    }
    
    /**
     * Criar partículas de garoa
     */
    createDrizzleParticles() {
        this.particles = [];
        const isNight = this.isNightTime();
        
        const particleCount = 200;
        const speedMultiplier = 0.7;
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height - this.canvas.height,
                speed: (Math.random() * 10 + 8) * speedMultiplier,
                length: Math.random() * 8 + 5,
                opacity: isNight ? Math.random() * 0.5 + 0.3 : Math.random() * 0.7 + 0.2,
                angle: Math.random() * 8 - 4,
                type: 'drizzle'
            });
        }
    }

    /**
     * Criar partículas de neve
     */
    createSnowParticles() {
        this.particles = [];
        
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height - this.canvas.height,
                speed: Math.random() * 3 + 1,
                size: Math.random() * 4 + 2,
                opacity: Math.random() * 0.8 + 0.2,
                drift: Math.random() * 2 - 1
            });
        }
    }

    /**
     * Criar partículas de estrelas
     */
    createStarParticles() {
        this.stars = [];
        
        for (let i = 0; i < 300; i++) {
            // Criar algumas estrelas maiores para destaque
            const isLargeStar = Math.random() < 0.1; // 10% de chance de ser uma estrela grande
            const size = isLargeStar ? Math.random() * 3 + 1.5 : Math.random() * 1.5 + 0.5;
            const opacity = isLargeStar ? Math.random() * 0.9 + 0.5 : Math.random() * 0.8 + 0.3;
            const twinkleSpeed = isLargeStar ? Math.random() * 0.03 + 0.02 : Math.random() * 0.02 + 0.01;
            
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: size,
                opacity: opacity,
                twinkle: twinkleSpeed,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    /**
     * Criar partículas de nuvens
     */
    createCloudParticles() {
        this.clouds = [];
        const weatherMain = this.currentWeatherData.current.weather.main.toLowerCase();
        const isNight = this.isNightTime();
        
        // Ajustar quantidade e opacidade das nuvens baseado no clima
        let cloudCount = 15;
        let opacityBase = 0.3;
        let opacityVariation = 0.2;
        
        if (weatherMain === 'clouds') {
            cloudCount = 25;
            opacityBase = 0.4;
            opacityVariation = 0.3;
        } else if (weatherMain === 'rain' || weatherMain === 'drizzle') {
            cloudCount = 20;
            opacityBase = 0.5;
            opacityVariation = 0.2;
        } else if (weatherMain === 'thunderstorm') {
            cloudCount = 30;
            opacityBase = 0.6;
            opacityVariation = 0.2;
        }
        
        // Reduzir opacidade à noite
        if (isNight) {
            opacityBase *= 0.7;
        }
        
        for (let i = 0; i < cloudCount; i++) {
            // Criar nuvens de diferentes tamanhos e velocidades
            const size = Math.random() * 120 + 60;
            const speed = Math.random() * 0.3 + 0.1;
            const opacity = Math.random() * opacityVariation + opacityBase;
            
            this.clouds.push({
                x: Math.random() * (this.canvas.width + 200) - 100,
                y: Math.random() * this.canvas.height * 0.7,
                speed: speed,
                size: size,
                opacity: opacity,
                shape: Math.floor(Math.random() * 3) // Diferentes formas de nuvens
            });
        }
    }

    /**
     * Ativar efeito de tempestade
     */
    activateStormEffect() {
        const glitchContainer = document.querySelector('.glitch-container');
        glitchContainer.style.opacity = '1';
        
        // Limpar intervalo anterior se existir
        if (this.lightningInterval) {
            clearInterval(this.lightningInterval);
        }
        
        // Criar flashes de raio
        this.lightningInterval = setInterval(() => {
            if (this.effects.storm.active && Math.random() < 0.15) {
                this.createOrganicLightning();
            }
        }, 2000 + Math.random() * 3000); // Intervalo variável entre 2-5 segundos
    }

    /**
     * Criar flash de raio
     */
    createOrganicLightning() {
        const overlay = document.getElementById('background-overlay');
        const originalBg = overlay.style.background;
        
        // Sequência de flashes
        const flashSequence = [
            { intensity: 0.4, duration: 50 },
            { intensity: 0, duration: 30 },
            { intensity: 0.7, duration: 80 },
            { intensity: 0, duration: 20 },
            { intensity: 0.9, duration: 40 },
            { intensity: 0, duration: 100 }
        ];
        
        let currentFlash = 0;
        
        const executeFlash = () => {
            if (currentFlash >= flashSequence.length) {
                overlay.style.background = originalBg;
                return;
            }
            
            const flash = flashSequence[currentFlash];
            
            if (flash.intensity > 0) {
                overlay.style.background = `rgba(255, 255, 255, ${flash.intensity})`;
                // Adicionar efeito sonoro visual
                document.body.style.filter = `brightness(${1 + flash.intensity})`;
            } else {
                overlay.style.background = originalBg;
                document.body.style.filter = 'brightness(1)';
            }
            
            currentFlash++;
            setTimeout(executeFlash, flash.duration);
        };
        
        executeFlash();
        
        // Desenhar raio no canvas
        this.drawLightningBolt();
    }
    
    /**
     * Desenhar raio no canvas
     */
    drawLightningBolt() {
        const startX = Math.random() * this.canvas.width;
        const startY = 0;
        const endX = startX + (Math.random() - 0.5) * 200;
        const endY = this.canvas.height;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        this.ctx.shadowBlur = 10;
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        
        // Criar path zigzag orgânico
        let currentX = startX;
        let currentY = startY;
        const segments = 8;
        
        for (let i = 1; i <= segments; i++) {
            const targetY = (endY / segments) * i;
            const targetX = startX + ((endX - startX) / segments) * i + (Math.random() - 0.5) * 50;
            
            this.ctx.lineTo(targetX, targetY);
            currentX = targetX;
            currentY = targetY;
        }
        
        this.ctx.stroke();
        
        // Limpar após um tempo
        setTimeout(() => {
            this.ctx.shadowBlur = 0;
        }, 200);
    }

    /**
     * Iniciar loop de animação
     */
    startAnimation() {
        const animate = () => {
            this.clearCanvas();
            
            if (this.effects.stars.active) {
                this.animateStars();
            }
            
            if (this.effects.clouds.active) {
                this.animateClouds();
            }
            
            if (this.effects.snow.active) {
                this.animateSnow();
            }
            
            if (this.effects.drizzle && this.effects.drizzle.active) {
                this.animateDrizzle();
            }
            
            if (this.effects.rain.active) {
                this.animateRain();
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }

    /**
     * Limpar canvas
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Animar chuva
     */
    animateRain() {
        const isNight = this.isNightTime();
        const weatherMain = this.currentWeatherData.current.weather.main.toLowerCase();
        
        // Ajustar cor baseado no horário e intensidade
        if (isNight) {
            this.ctx.strokeStyle = weatherMain === 'thunderstorm' ? 
                'rgba(200, 200, 255, 0.8)' : 'rgba(174, 194, 224, 0.7)';
        } else {
            this.ctx.strokeStyle = 'rgba(174, 194, 224, 0.8)';
        }
        
        this.ctx.lineWidth = weatherMain === 'thunderstorm' ? 2 : 1.5;
        
        this.particles.forEach(particle => {
            if (particle.type !== 'rain') return;
            
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            
            // Aplicar ângulo para movimento mais realista
            const angleRad = (particle.angle || 0) * Math.PI / 180;
            const endX = particle.x - 3 + Math.sin(angleRad) * particle.length;
            const endY = particle.y + particle.length + Math.cos(angleRad) * particle.length;
            
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            
            particle.y += particle.speed;
            particle.x -= 1 + (particle.angle || 0) * 0.1; // Movimento lateral baseado no ângulo
            
            // Adicionar efeito de respingo ao tocar o chão
            if (particle.y > this.canvas.height - 20) {
                this.createRainSplash(particle.x, this.canvas.height);
            }
            
            if (particle.y > this.canvas.height) {
                particle.y = -particle.length;
                particle.x = Math.random() * this.canvas.width;
                particle.angle = Math.random() * 10 - 5;
            }
        });
    }
    
    /**
     * Animar garoa
     */
    animateDrizzle() {
        const isNight = this.isNightTime();
        
        // Cor mais suave para garoa
        if (isNight) {
            this.ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
        } else {
            this.ctx.strokeStyle = 'rgba(174, 194, 224, 0.6)';
        }
        
        this.ctx.lineWidth = 1;
        
        this.particles.forEach(particle => {
            if (particle.type !== 'drizzle') return;
            
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            
            // Aplicar ângulo para movimento mais realista
            const angleRad = (particle.angle || 0) * Math.PI / 180;
            const endX = particle.x - 2 + Math.sin(angleRad) * particle.length;
            const endY = particle.y + particle.length + Math.cos(angleRad) * particle.length;
            
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            
            particle.y += particle.speed;
            particle.x -= 0.5 + (particle.angle || 0) * 0.05;
            
            if (particle.y > this.canvas.height) {
                particle.y = -particle.length;
                particle.x = Math.random() * this.canvas.width;
                particle.angle = Math.random() * 8 - 4;
            }
        });
    }
    
    /**
     * Criar efeito de respingo da chuva
     */
    createRainSplash(x, y) {
        if (Math.random() > 0.5) return;
        
        const isNight = this.isNightTime();
        const splashSize = Math.random() * 3 + 1.5;
        
        // Desenhar círculo principal do respingo
        this.ctx.beginPath();
        this.ctx.arc(x, y, splashSize, 0, Math.PI * 2);
        this.ctx.fillStyle = isNight ? 'rgba(200, 200, 255, 0.4)' : 'rgba(255, 255, 255, 0.5)';
        this.ctx.fill();
        
        // Adicionar pequenos respingos secundários
        if (Math.random() > 0.7) {
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 5 + 2;
                const splashX = x + Math.cos(angle) * distance;
                const splashY = y + Math.sin(angle) * distance;
                
                this.ctx.beginPath();
                this.ctx.arc(splashX, splashY, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = isNight ? 'rgba(200, 200, 255, 0.3)' : 'rgba(255, 255, 255, 0.4)';
                this.ctx.fill();
            }
        }
    }

    /**
     * Animar neve
     */
    animateSnow() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            particle.y += particle.speed;
            particle.x += particle.drift;
            
            if (particle.y > this.canvas.height) {
                particle.y = -particle.size;
                particle.x = Math.random() * this.canvas.width;
            }
            
            if (particle.x > this.canvas.width || particle.x < 0) {
                particle.x = Math.random() * this.canvas.width;
            }
        });
    }

    /**
     * Animar estrelas
     */
    animateStars() {
        const time = Date.now();
        
        this.stars.forEach(star => {
            // Calcular brilho baseado no tempo e fase individual da estrela
            const twinkleEffect = Math.sin(time * star.twinkle + star.phase);
            const currentOpacity = star.opacity * (0.7 + twinkleEffect * 0.3);
            
            // Adicionar brilho ao redor das estrelas maiores
            if (star.size > 1.5) {
                // Desenhar o brilho (glow)
                const gradient = this.ctx.createRadialGradient(
                    star.x, star.y, 0,
                    star.x, star.y, star.size * 4
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity * 0.7})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Desenhar a estrela
            this.ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    /**
     * Animar nuvens
     */
    animateClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        this.clouds.forEach(cloud => {
            this.ctx.globalAlpha = cloud.opacity;
            
            // Desenhar nuvens
            switch (cloud.shape) {
                case 0: // Nuvem simples
                    this.drawSimpleCloud(cloud.x, cloud.y, cloud.size);
                    break;
                case 1: // Nuvem mais complexa
                    this.drawComplexCloud(cloud.x, cloud.y, cloud.size);
                    break;
                case 2: // Nuvem alongada
                    this.drawElongatedCloud(cloud.x, cloud.y, cloud.size);
                    break;
            }
            
            // Mover nuvem
            cloud.x += cloud.speed;
            
            // Reposicionar quando sair da tela
            if (cloud.x > this.canvas.width + cloud.size) {
                cloud.x = -cloud.size * 2;
                cloud.y = Math.random() * this.canvas.height * 0.7;
                cloud.opacity = Math.random() * 0.3 + 0.2; // Variar opacidade ao reaparecer
            }
        });
    }
    
    /**
     * Desenhar nuvem simples
     */
drawSimpleCloud(x, y, size) {
    this.ctx.beginPath();
    
    this.ctx.moveTo(x - size * 0.5, y);

    // Pequena ondulação esquerda
    this.ctx.bezierCurveTo(
        x - size * 0.6, y - size * 0.2,
        x - size * 0.4, y - size * 0.35,
        x - size * 0.25, y - size * 0.25
    );

    // Segunda ondulação central
    this.ctx.bezierCurveTo(
        x - size * 0.1, y - size * 0.4,
        x + size * 0.1, y - size * 0.4,
        x + size * 0.25, y - size * 0.3
    );

    // Terceira ondulação mais suave à direita
    this.ctx.bezierCurveTo(
        x + size * 0.4, y - size * 0.2,
        x + size * 0.6, y - size * 0.05,
        x + size * 0.5, y
    );

    // Parte inferior direita
    this.ctx.bezierCurveTo(
        x + size * 0.5, y + size * 0.2,
        x + size * 0.2, y + size * 0.25,
        x - size * 0.1, y + size * 0.2
    );

    // Parte inferior esquerda
    this.ctx.bezierCurveTo(
        x - size * 0.3, y + size * 0.2,
        x - size * 0.55, y + size * 0.05,
        x - size * 0.5, y
    );

    this.ctx.closePath();
    this.ctx.fill();
}

    
    /**
     * Desenhar nuvem complexa
     */
drawComplexCloud(x, y, size) {
    this.ctx.beginPath();

    this.ctx.moveTo(x - size * 0.6, y);

    // Primeira ondulação esquerda
    this.ctx.bezierCurveTo(
        x - size * 0.75, y - size * 0.25,
        x - size * 0.45, y - size * 0.5,
        x - size * 0.2, y - size * 0.4
    );

    // Segunda ondulação no topo
    this.ctx.bezierCurveTo(
        x, y - size * 0.55,
        x + size * 0.25, y - size * 0.4,
        x + size * 0.45, y - size * 0.25
    );

    // Terceira ondulação lateral direita
    this.ctx.bezierCurveTo(
        x + size * 0.6, y - size * 0.2,
        x + size * 0.6, y + size * 0.1,
        x + size * 0.5, y + size * 0.2
    );

    // Ondulação inferior direita
    this.ctx.bezierCurveTo(
        x + size * 0.35, y + size * 0.4,
        x + size * 0.1, y + size * 0.4,
        x, y + size * 0.3
    );

    // Ondulação inferior esquerda
    this.ctx.bezierCurveTo(
        x - size * 0.1, y + size * 0.45,
        x - size * 0.3, y + size * 0.35,
        x - size * 0.45, y + size * 0.2
    );

    // Fechando na lateral esquerda
    this.ctx.bezierCurveTo(
        x - size * 0.6, y + size * 0.1,
        x - size * 0.65, y - size * 0.05,
        x - size * 0.6, y
    );

    this.ctx.closePath();
    this.ctx.fill();
}

    
    /**
     * Desenhar nuvem alongada
     */
    drawElongatedCloud(x, y, size) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.5, y, size * 0.4, 0, Math.PI * 2);
        this.ctx.arc(x - size * 0.5, y, size * 0.4, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.8, y, size * 0.3, 0, Math.PI * 2);
        this.ctx.arc(x - size * 0.8, y, size * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Atualizar data e hora
     */
    updateDateTime() {
        if (!this.currentWeatherData || !this.currentWeatherData.current) {
            document.getElementById('current-date').textContent = '';
            return;
        }
        const { timezone } = this.currentWeatherData.current;
        const nowUTC = new Date(Date.now() + (new Date().getTimezoneOffset() * 60000));
        const nowLocal = new Date(nowUTC.getTime() + (timezone * 1000));
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('current-date').textContent = 
            nowLocal.toLocaleDateString('pt-BR', options);
    }

    /**
     * Formatar hora
     */
    formatTime(date) {
        if (!this.currentWeatherData || !this.currentWeatherData.current) {
            return new Date(date).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Usar o timezone da localização atual
        const { timezone } = this.currentWeatherData.current;
        
        // Converter para o fuso horário da localização
        let dateObj;
        if (date instanceof Date) {
            dateObj = date;
        } else {
            dateObj = new Date(date);
        }
        
        // Ajustar para o fuso horário da localização
        const utcTime = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
        const localTime = new Date(utcTime + (timezone * 1000));
        
        return localTime.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Atualizar última atualização
     */
    updateLastUpdate() {
        const now = new Date();
        document.getElementById('last-update').textContent = this.formatTime(now);
    }

    /**
     * Atualizar status de carregamento
     */
    updateLoadingStatus(message) {
        document.getElementById('loading-status').textContent = message;
    }

    /**
     * Mostrar status de carregamento
     */
    showLoadingStatus(message) {
        this.updateLoadingStatus(message);
        document.getElementById('loading-screen').classList.remove('hidden');
        document.getElementById('main-container').classList.add('hidden');
    }

    /**
     * Esconder tela de carregamento
     */
    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('main-container').classList.remove('hidden');
        }, 1000);
    }

    /**
     * Mostrar erro
     */
    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').classList.remove('hidden');
        this.hideLoadingScreen();
    }

    /**
     * Esconder modal de erro
     */
    hideErrorModal() {
        document.getElementById('error-modal').classList.add('hidden');
    }
    /**
     * Atualizar informações do clima
     */
    async searchLocation(query) {
        try {
            this.updateLoadingStatus(`Buscando localização: ${query}...`);
            
            const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                this.userLocation = {
                    lat: data.data.lat,
                    lon: data.data.lon
                };
                console.log('Localização encontrada:', this.userLocation);
                await this.loadWeatherData();
            } else {
                throw new Error(data.error || 'Local não encontrado');
            }
            
        } catch (error) {
            console.error('Erro ao buscar localização:', error);
            this.showError('Não foi possível encontrar o local especificado. Verifique o nome e tente novamente.');
        }
    }
}

// Inicializar aplicação quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.SkyCast = new SkyCast();
});

// Service Worker para cache
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}