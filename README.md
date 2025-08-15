# SkyCast 🌤️

Uma aplicação web moderna de previsão do tempo com interface dinâmica que se adapta às condições climáticas.

## ✨ Funcionalidades

- 🌡️ **Previsão atual** com temperatura, umidade e sensação térmica
- 📅 **Previsão de 5 dias** com detalhes hora a hora
- 🎨 **Interface dinâmica** - fundo muda conforme o clima (chuva, neve, tempestade, dia/noite)
- 🕐 **Horário local** baseado na localização
- 📱 **Design responsivo** para desktop e mobile
- 🔍 **Busca por cidade** ou geolocalização automática
- ⚡ **Arquitetura modular** com services separados

## 🚀 Demo

[🔗 Ver aplicação ao vivo](https://skycast-kappa.vercel.app/)

## 🛠️ Tecnologias Utilizadas

- **Backend:** Python 3.8+ com Flask
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **API:** OpenWeatherMap API
- **Styling:** CSS Grid/Flexbox, Animações CSS
- **Icons:** Font Awesome + OpenWeatherMap Icons

## 📋 Pré-requisitos

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)
- Chave da API do OpenWeatherMap

## 🔧 Instalação e Configuração

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/AlexsanderMe/skycast-weather-app.git
   cd skycast-weather-app
   ```

2. **Crie um ambiente virtual:**
   ```bash
   python -m venv venv
   
   # No Windows:
   venv\Scripts\activate
   
   # No Linux/Mac:
   source venv/bin/activate
   ```

3. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure as variáveis de ambiente:**
   ```bash
   SECRET_KEY=SECRET_KEY
   OPENWEATHER_API_KEY=sua_api_key_aqui
   ```

5. **Execute a aplicação:**
   ```bash
   python run.py
   ```

6. **Acesse:** `http://localhost:5000`

## 🎯 Como Usar

1. **Permitir localização** ou buscar por uma cidade
2. **Visualizar** a previsão atual e dos próximos 5 dias
3. **Observar** como o fundo muda conforme o clima
4. **Navegar** entre diferentes locais

## Temas Visuais

A aplicação possui fundos dinâmicos baseados nas condições climáticas:

- ☀️ **Ensolarado**
- ⛅ **Nublado**
- 🌧️ **Chuva**
- ⛈️ **Tempestade**
- 🌨️ **Neve**
- 🌙 **Noite**

## 📁 Estrutura do Projeto

```
skycast-weather-app/
├── app/                 # Pacote principal da aplicação
│   ├── __init__.py      # Inicializador da aplicação (Application Factory)
│   ├── routes/          # Módulo de rotas
│   │   ├── __init__.py
│   │   ├── location.py  # Rotas de localização
│   │   └── weather.py   # Rotas de clima
│   ├── services/        # Serviços de negócio
│   │   ├── __init__.py
│   │   ├── location_service.py  # Serviço para obter localização por IP
│   │   └── weather_service.py   # Serviço para obter dados meteorológicos
│   ├── static/          # Arquivos estáticos (CSS, JS, imagens)
│   └── templates/       # Templates HTML
│       └── index.html
├── .env.example         # Variáveis de ambiente
├── .gitignore           # Arquivos e diretórios a serem ignorados pelo Git
├── config.py            # Configurações da aplicação
├── LICENSE              # Licença do projeto
├── README.md
├── requirements.txt     # Dependências Python
└── run.py               # Ponto de entrada da aplicação
```

## 🌐 API Reference

### Endpoints utilizados:
- **Current Weather:** `https://api.openweathermap.org/data/2.5/weather`
- **5 Day Forecast:** `https://api.openweathermap.org/data/2.5/forecast`
- **Geocoding:** `http://api.openweathermap.org/geo/1.0/direct`
- **Weather Icons:** `https://openweathermap.org/img/wn/{icon}@2x.png`

### Parâmetros principais:
- `q` - Nome da cidade
- `lat,lon` - Coordenadas
- `appid` - Sua API key
- `units=metric` - Unidades em Celsius
- `lang=pt_br` - Idioma português

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Alexsander Meiniche**
- GitHub: [@AlexsanderMe](https://github.com/AlexsanderMe)
- LinkedIn: [Alexsander Meiniche](https://linkedin.com/in/alexsander-meiniche)