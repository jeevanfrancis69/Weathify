const axios = require('axios');
require('dotenv').config();

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  // Get weather by coordinates
  async getWeatherByCoordinates(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat: lat,
          lon: lon,
          appid: this.apiKey,
          units: 'metric',
        },
      });

      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching weather by coordinates:', error.response?.data || error.message);
      throw new Error('Failed to fetch weather data');
    }
  }

  // Get weather by city name
  async getWeatherByCity(city) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
        },
      });

      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching weather by city:', error.response?.data || error.message);
      throw new Error('Failed to fetch weather data');
    }
  }

  // Format weather data and categorize
  formatWeatherData(data) {
    const weatherCondition = this.categorizeWeather(data.weather[0].main, data.weather[0].id);
    
    return {
      condition: weatherCondition,
      temperature: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      city: data.name,
      country: data.sys.country,
      coordinates: {
        lat: data.coord.lat,
        lon: data.coord.lon,
      },
      timestamp: new Date(data.dt * 1000),
    };
  }

  // Categorize weather into tags
  categorizeWeather(main, id) {
    // Weather condition codes: https://openweathermap.org/weather-conditions
    
    // Thunderstorm (200-232)
    if (id >= 200 && id < 300) {
      return 'stormy';
    }
    
    // Drizzle (300-321) or Rain (500-531)
    if ((id >= 300 && id < 400) || (id >= 500 && id < 600)) {
      return 'rainy';
    }
    
    // Snow (600-622)
    if (id >= 600 && id < 700) {
      return 'snowy';
    }
    
    // Atmosphere (701-781) - fog, mist, haze, etc.
    if (id >= 700 && id < 800) {
      return 'foggy';
    }
    
    // Clear (800)
    if (id === 800) {
      return 'sunny';
    }
    
    // Clouds (801-804)
    if (id > 800 && id < 900) {
      return 'cloudy';
    }
    
    // Default
    return 'cloudy';
  }

  // Get current season based on date and hemisphere
  getSeason(date = new Date(), hemisphere = 'northern') {
    const month = date.getMonth(); // 0-11
    
    if (hemisphere === 'northern') {
      if (month >= 2 && month <= 4) return 'spring';      // Mar-May
      if (month >= 5 && month <= 7) return 'summer';      // Jun-Aug
      if (month >= 8 && month <= 10) return 'autumn';     // Sep-Nov
      return 'winter';                                     // Dec-Feb
    } else {
      // Southern hemisphere (opposite)
      if (month >= 2 && month <= 4) return 'autumn';
      if (month >= 5 && month <= 7) return 'winter';
      if (month >= 8 && month <= 10) return 'spring';
      return 'summer';
    }
  }

  // Get time of day
  getTimeOfDay(date = new Date()) {
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 12) return 'morning';      // 5am-11am
    if (hour >= 12 && hour < 17) return 'afternoon';   // 12pm-4pm
    if (hour >= 17 && hour < 21) return 'evening';     // 5pm-8pm
    return 'night';                                     // 9pm-4am
  }

  // Determine hemisphere based on coordinates
  getHemisphere(lat) {
    return lat >= 0 ? 'northern' : 'southern';
  }
}

module.exports = new WeatherService();